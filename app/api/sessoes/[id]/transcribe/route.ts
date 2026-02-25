import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/transcription/groq'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    // Rate limiting
    const rl = checkRateLimit(`transcribe:${user!.id}`, RATE_LIMITS.transcribe)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    // Atualizar status
    await db
      .from('sessoes')
      .update({ recording_status: 'transcribing' })
      .eq('id', id)

    // Buscar sessão para pegar audio_url
    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('audio_url')
      .eq('id', id)
      .single()

    if (fetchError || !sessao?.audio_url) {
      return NextResponse.json({ error: 'Áudio não encontrado' }, { status: 404 })
    }

    // Baixar áudio do Supabase Storage
    const { data: audioData, error: downloadError } = await db.storage
      .from('audio-sessoes')
      .download(sessao.audio_url)

    if (downloadError || !audioData) {
      await db
        .from('sessoes')
        .update({
          recording_status: 'error',
          processing_error: 'Download do áudio falhou',
        })
        .eq('id', id)
      return NextResponse.json({ error: 'Erro ao baixar áudio' }, { status: 500 })
    }

    // Convert Blob directly to Buffer
    const audioBuffer = Buffer.from(await audioData.arrayBuffer())
    logger.info('Transcription starting', { sessaoId: id, audioSizeMB: +(audioBuffer.length / 1024 / 1024).toFixed(1) })
    const result = await transcribeAudio(audioBuffer, sessao.audio_url)

    // Salvar transcrição no campo integra
    await db
      .from('sessoes')
      .update({
        integra: result.fullText,
        recording_status: 'processing',
      })
      .eq('id', id)

    return NextResponse.json({
      segmentCount: result.segments.length,
      duration: result.duration,
      textLength: result.fullText.length,
    })
  } catch (error) {
    // Best-effort: update error state in DB
    try {
      const db = await createClient() as any
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      await db
        .from('sessoes')
        .update({
          recording_status: 'error',
          processing_error: `Transcrição falhou: ${message}`,
        })
        .eq('id', id)
    } catch {
      // DB update failed — already logging below
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    logger.error('Transcription failed', { sessaoId: id, error: message })
    if (error instanceof Error) captureException(error, { sessaoId: id, operation: 'transcribe' })
    return NextResponse.json({ error: 'Erro ao transcrever áudio' }, { status: 500 })
  }
}
