import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/sessoes/[id]/reprocess
 * Re-triggers the background processing pipeline for a session that failed.
 * Requires the session to have an audio_url already uploaded.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const db = await createClient() as any

    // Verify session exists and has audio
    const { data: sessao, error } = await db
      .from('sessoes')
      .select('audio_url, recording_status')
      .eq('id', id)
      .single()

    if (error || !sessao) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    if (!sessao.audio_url) {
      return NextResponse.json({ error: 'Sessão não possui áudio. Faça o upload primeiro.' }, { status: 400 })
    }

    // Reset error state
    await db
      .from('sessoes')
      .update({
        recording_status: 'transcribing',
        processing_error: null,
      })
      .eq('id', id)

    // Re-trigger pipeline
    await inngest.send({
      name: 'session/recording.stopped',
      data: { sessaoId: id },
    })

    logger.info('Reprocess triggered', { sessaoId: id, previousStatus: sessao.recording_status })

    return NextResponse.json({ ok: true, message: 'Reprocessamento iniciado' })
  } catch (error) {
    logger.error('Reprocess failed', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Erro ao reprocessar' }, { status: 500 })
  }
}
