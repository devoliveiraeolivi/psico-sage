import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { inngest } from '@/lib/inngest/client'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const db = await createClient() as any

    // Rate limiting
    const { data: { user } } = await db.auth.getUser()
    const userId = user?.id || 'anonymous'
    const rl = checkRateLimit(`upload:${userId}`, RATE_LIMITS.uploadAudio)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    // Receber áudio via FormData
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const duration = formData.get('duration') as string | null

    if (!audioFile) {
      return NextResponse.json({ error: 'Arquivo de áudio não enviado' }, { status: 400 })
    }

    // Atualizar status para uploading
    await db
      .from('sessoes')
      .update({ recording_status: 'uploading' })
      .eq('id', id)

    // Detectar formato do áudio pelo nome do arquivo
    const originalName = audioFile.name || 'audio.webm'
    const ext = originalName.split('.').pop()?.toLowerCase() || 'webm'
    const mimeMap: Record<string, string> = {
      webm: 'audio/webm', mp3: 'audio/mpeg', wav: 'audio/wav',
      m4a: 'audio/mp4', ogg: 'audio/ogg', mp4: 'audio/mp4', mpeg: 'audio/mpeg',
    }
    const contentType = mimeMap[ext] || audioFile.type || 'audio/webm'

    // Upload para Supabase Storage
    const filename = `${id}_${Date.now()}.${ext}`
    const arrayBuffer = await audioFile.arrayBuffer()

    const { error: uploadError } = await db.storage
      .from('audio-sessoes')
      .upload(filename, arrayBuffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      await db
        .from('sessoes')
        .update({
          recording_status: 'error',
          processing_error: `Upload falhou: ${uploadError.message}`,
        })
        .eq('id', id)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Salvar URL e duração
    const durationSeconds = duration ? parseInt(duration, 10) : null

    await db
      .from('sessoes')
      .update({
        audio_url: filename,
        audio_duracao_segundos: durationSeconds,
        duracao_real: durationSeconds ? Math.round(durationSeconds / 60) : null,
      })
      .eq('id', id)

    // Trigger background processing pipeline via Inngest
    let pipelineTriggered = false
    try {
      await inngest.send({
        name: 'session/recording.stopped',
        data: { sessaoId: id },
      })
      pipelineTriggered = true
    } catch (inngestError) {
      // Inngest não disponível (dev server não rodando ou não configurado)
      // O upload já foi salvo — o processamento pode ser disparado depois via /reprocess
      logger.warn('Inngest not available, pipeline not triggered', {
        sessaoId: id,
        error: inngestError instanceof Error ? inngestError.message : 'unknown',
      })
    }

    logger.info('Upload complete', { sessaoId: id, filename, durationSeconds, pipelineTriggered })

    return NextResponse.json({ filename, durationSeconds, processing: pipelineTriggered })
  } catch (error) {
    logger.error('Upload failed', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    if (error instanceof Error) captureException(error, { sessaoId: id, operation: 'upload' })
    return NextResponse.json(
      { error: 'Erro interno no upload' },
      { status: 500 }
    )
  }
}
