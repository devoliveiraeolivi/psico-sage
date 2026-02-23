/**
 * Engine de transcrição Groq Cloud (Whisper em LPU).
 *
 * Limite: 25 MB no free tier.
 * Sem diarização (Whisper não identifica speakers).
 */

import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MAX_FILE_SIZE_MB = 25

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

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
): Promise<TranscriptionResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY não configurada')
  }

  const sizeMB = audioBuffer.length / (1024 * 1024)
  if (sizeMB > MAX_FILE_SIZE_MB) {
    throw new Error(
      `Arquivo muito grande (${sizeMB.toFixed(1)} MB). Groq aceita até ${MAX_FILE_SIZE_MB} MB.`
    )
  }

  logger.info('Groq transcription starting', { filename, sizeMB: +sizeMB.toFixed(1) })

  const data = await withRetry(
    async (signal) => {
      const formData = new FormData()
      // Uint8Array is a valid BlobPart; Buffer.buffer may be a SharedArrayBuffer which isn't
      formData.append('file', new Blob([new Uint8Array(audioBuffer)]), filename)
      formData.append('model', 'whisper-large-v3-turbo')
      formData.append('language', 'pt')
      formData.append('response_format', 'verbose_json')
      formData.append('timestamp_granularities[]', 'segment')

      const response = await fetch(GROQ_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        const err = new Error(`Groq erro ${response.status}: ${errorText.slice(0, 500)}`)
        // Don't retry on client errors (except 429 rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          (err as any).nonRetryable = true
        }
        throw err
      }

      return response.json()
    },
    {
      maxRetries: 3,
      timeoutMs: 300_000, // 5 min per attempt (audio transcription can be slow)
      baseDelayMs: 2000,
      onRetry: (error, attempt) => {
        logger.warn('Groq transcription retry', { attempt, error: error.message, filename })
      },
      isRetryable: (error) => !(error as any).nonRetryable,
    }
  )

  const segments: TranscriptionSegment[] = (data.segments || []).map(
    (seg: { start: number; end: number; text: string }) => ({
      start: Math.round(seg.start * 100) / 100,
      end: Math.round(seg.end * 100) / 100,
      text: seg.text.trim(),
    })
  )

  const fullText = segments.map((s) => s.text).join(' ')

  logger.info('Groq transcription complete', {
    filename,
    segments: segments.length,
    textLength: fullText.length,
    duration: data.duration || 0,
  })

  return {
    segments,
    fullText,
    language: data.language || 'pt',
    duration: data.duration || 0,
  }
}
