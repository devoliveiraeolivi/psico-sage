/**
 * Engine de transcrição Groq Cloud (Whisper em LPU).
 *
 * - Arquivos ≤24.9MB: transcrição direta (cobre sessões de ~50min em webm/opus)
 * - Arquivos >24.9MB: split via ffmpeg → transcrição paralela → merge com timestamps
 *
 * Sem diarização (Whisper não identifica speakers).
 */

import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, rm, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'

const execFileAsync = promisify(execFile)

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
/** Limite do Groq é 25MB — 24.9 evita split desnecessário em sessões de ~50min */
const MAX_CHUNK_SIZE_MB = 24.9
/** Máximo de chamadas paralelas ao Groq (evitar rate limit) */
const MAX_PARALLEL_CHUNKS = 3
/** Limite absoluto de tamanho (proteção contra abuso) */
export const MAX_UPLOAD_SIZE_MB = 500

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[]
  fullText: string
  language: string
  duration: number
}

// ---------------------------------------------------------------------------
// ffmpeg helpers
// ---------------------------------------------------------------------------

async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffprobe', ['-version'], { timeout: 5_000 })
    return true
  } catch {
    return false
  }
}

async function probeDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { timeout: 30_000 })
  const dur = parseFloat(stdout.trim())
  if (isNaN(dur) || dur <= 0) throw new Error('ffprobe retornou duração inválida')
  return dur
}

/**
 * Split audio em chunks de ~24MB via ffmpeg (stream copy, sem re-encoding).
 * Retorna buffers + offset em segundos de cada chunk.
 */
async function splitAudio(
  audioBuffer: Buffer,
  filename: string,
): Promise<{ chunks: Buffer[]; offsets: number[] }> {
  const ext = path.extname(filename).replace('.', '') || 'webm'
  const tmpDir = await mkdtemp(path.join(tmpdir(), 'psicosage-'))

  try {
    const inputPath = path.join(tmpDir, `input.${ext}`)
    await writeFile(inputPath, audioBuffer)

    const totalDuration = await probeDuration(inputPath)
    const sizeMB = audioBuffer.length / (1024 * 1024)
    const numChunks = Math.ceil(sizeMB / MAX_CHUNK_SIZE_MB)
    const segmentSeconds = Math.ceil(totalDuration / numChunks)

    logger.info('Splitting audio', {
      sizeMB: +sizeMB.toFixed(1),
      totalDuration: +totalDuration.toFixed(1),
      numChunks,
      segmentSeconds,
    })

    const outputPattern = path.join(tmpDir, `chunk_%03d.${ext}`)
    await execFileAsync('ffmpeg', [
      '-i', inputPath,
      '-f', 'segment',
      '-segment_time', String(segmentSeconds),
      '-c', 'copy',
      '-reset_timestamps', '1',
      '-loglevel', 'error',
      outputPattern,
    ], { timeout: 120_000 })

    const chunks: Buffer[] = []
    const offsets: number[] = []
    let offset = 0

    for (let i = 0; i < numChunks + 5; i++) {
      const chunkPath = path.join(tmpDir, `chunk_${String(i).padStart(3, '0')}.${ext}`)
      try {
        const buf = await readFile(chunkPath)
        const dur = await probeDuration(chunkPath)
        chunks.push(buf)
        offsets.push(offset)
        offset += dur
      } catch {
        break
      }
    }

    if (chunks.length === 0) throw new Error('ffmpeg split não produziu nenhum chunk')

    logger.info('Audio split complete', { chunks: chunks.length })
    return { chunks, offsets }
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Transcrição de um único chunk via Groq
// ---------------------------------------------------------------------------

async function transcribeChunk(
  buffer: Buffer,
  filename: string,
  apiKey: string,
): Promise<{ segments: TranscriptionSegment[]; text: string; duration: number }> {
  const data = await withRetry(
    async (signal) => {
      const form = new FormData()
      form.append('file', new Blob([new Uint8Array(buffer)]), filename)
      form.append('model', 'whisper-large-v3-turbo')
      form.append('language', 'pt')
      form.append('response_format', 'verbose_json')
      form.append('timestamp_granularities[]', 'segment')

      const res = await fetch(GROQ_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal,
      })

      if (!res.ok) {
        const errorText = await res.text()
        const err = new Error(`Groq erro ${res.status}: ${errorText.slice(0, 500)}`)
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          (err as any).nonRetryable = true
        }
        throw err
      }

      return res.json()
    },
    {
      maxRetries: 3,
      timeoutMs: 300_000,
      baseDelayMs: 2000,
      onRetry: (err, attempt) => {
        logger.warn('Groq chunk retry', { attempt, error: err.message, filename })
      },
      isRetryable: (err) => !(err as any).nonRetryable,
    }
  )

  const segments: TranscriptionSegment[] = (data.segments || []).map(
    (seg: { start: number; end: number; text: string }) => ({
      start: Math.round(seg.start * 100) / 100,
      end: Math.round(seg.end * 100) / 100,
      text: (seg.text || '').trim(),
    })
  )

  return {
    segments,
    text: segments.map((s) => s.text).join(' '),
    duration: data.duration || 0,
  }
}

// ---------------------------------------------------------------------------
// Concurrency limiter
// ---------------------------------------------------------------------------

async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let next = 0

  async function worker() {
    while (next < tasks.length) {
      const i = next++
      results[i] = await tasks[i]()
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  )
  return results
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
): Promise<TranscriptionResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada')

  const sizeMB = audioBuffer.length / (1024 * 1024)

  if (sizeMB > MAX_UPLOAD_SIZE_MB) {
    throw new Error(
      `Arquivo muito grande (${sizeMB.toFixed(0)}MB). Limite: ${MAX_UPLOAD_SIZE_MB}MB.`
    )
  }

  // ---- Arquivo pequeno: transcrição direta ----
  if (sizeMB <= MAX_CHUNK_SIZE_MB) {
    logger.info('Groq transcription starting', { filename, sizeMB: +sizeMB.toFixed(1) })

    const result = await transcribeChunk(audioBuffer, filename, apiKey)

    logger.info('Groq transcription complete', {
      filename,
      segments: result.segments.length,
      textLength: result.text.length,
      duration: result.duration,
    })

    return {
      segments: result.segments,
      fullText: result.text,
      language: 'pt',
      duration: result.duration,
    }
  }

  // ---- Arquivo grande: split → parallel transcribe → merge ----
  logger.info('Large audio detected, will chunk', { filename, sizeMB: +sizeMB.toFixed(1) })

  if (!(await isFfmpegAvailable())) {
    throw new Error(
      `Áudio de ${sizeMB.toFixed(0)}MB excede ${MAX_CHUNK_SIZE_MB}MB do Groq. ` +
      `Instale ffmpeg no servidor para split automático, ou envie arquivo menor.`
    )
  }

  const { chunks, offsets } = await splitAudio(audioBuffer, filename)
  const ext = path.extname(filename).replace('.', '') || 'webm'

  const tasks = chunks.map((buf, i) => () => {
    logger.info('Transcribing chunk', {
      chunk: i + 1,
      total: chunks.length,
      sizeMB: +(buf.length / 1024 / 1024).toFixed(1),
    })
    return transcribeChunk(buf, `chunk_${i}.${ext}`, apiKey)
  })

  const chunkResults = await pLimit(tasks, MAX_PARALLEL_CHUNKS)

  // Merge: ajustar timestamps pelo offset de cada chunk
  const allSegments: TranscriptionSegment[] = []
  let totalDuration = 0

  for (let i = 0; i < chunkResults.length; i++) {
    const off = offsets[i]
    for (const seg of chunkResults[i].segments) {
      allSegments.push({
        start: Math.round((seg.start + off) * 100) / 100,
        end: Math.round((seg.end + off) * 100) / 100,
        text: seg.text,
      })
    }
    totalDuration = Math.max(totalDuration, off + chunkResults[i].duration)
  }

  const fullText = allSegments.map((s) => s.text).join(' ')

  logger.info('Groq chunked transcription complete', {
    filename,
    chunks: chunks.length,
    segments: allSegments.length,
    textLength: fullText.length,
    duration: totalDuration,
  })

  return { segments: allSegments, fullText, language: 'pt', duration: totalDuration }
}
