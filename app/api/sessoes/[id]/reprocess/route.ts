import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { inngest } from '@/lib/inngest/client'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
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
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    const rl = checkRateLimit(`reprocess:${user!.id}`, RATE_LIMITS.reprocess)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.' },
        { status: 429 }
      )
    }

    // Verify session has audio
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
