import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { inngest } from '@/lib/inngest/client'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/sessoes/[id]/extract
 * Triggers background extraction (re-extract from existing transcription).
 * Fire-and-forget — returns immediately so navigating away doesn't stop it.
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

    // Rate limiting
    const userId = user!.id
    const rl = checkRateLimit(`extract:${userId}`, RATE_LIMITS.extract)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    // Verificar que sessão tem transcrição
    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('integra, recording_status')
      .eq('id', id)
      .single()

    if (fetchError || !sessao?.integra) {
      return NextResponse.json({ error: 'Transcrição não encontrada' }, { status: 404 })
    }

    // Bloquear se já está processando
    if (sessao.recording_status && ['transcribing', 'processing', 'uploading'].includes(sessao.recording_status)) {
      return NextResponse.json({ error: 'Sessão já está sendo processada' }, { status: 409 })
    }

    // Marcar como processando e disparar extração em background
    await db
      .from('sessoes')
      .update({
        recording_status: 'processing',
        processing_error: null,
      })
      .eq('id', id)

    await inngest.send({
      name: 'session/extract.requested',
      data: { sessaoId: id },
    })

    logger.info('Extract-only triggered', { sessaoId: id })

    return NextResponse.json({ ok: true, message: 'Extração iniciada em background' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    logger.error('Extract trigger failed', { sessaoId: id, error: message })
    return NextResponse.json({ error: 'Erro interno ao iniciar extração' }, { status: 500 })
  }
}
