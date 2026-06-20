import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { generateRecomendacoes } from '@/lib/ai/gerar-recomendacoes'
import { decryptJsonField, encryptJsonField } from '@/lib/supabase/encrypt'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'
import type { SessaoResumo, PacienteResumo } from '@/lib/types'

export const maxDuration = 60
export const runtime = 'nodejs'

/**
 * POST /api/sessoes/[id]/recomendacoes
 *
 * Gera recomendações clínicas a partir do prontuário (resumo) já aprovado.
 * Idempotente: se já existir `recomendacoes`, só regera quando `?force=1`.
 * Complementar — NUNCA bloqueia/desfaz a aprovação.
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

    const rl = checkRateLimit(`recomendacoes:${user!.id}`, RATE_LIMITS.extract)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    const force = new URL(request.url).searchParams.get('force') === '1'

    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('resumo, recomendacoes, pacientes(resumo)')
      .eq('id', id)
      .single()

    if (fetchError || !sessao?.resumo) {
      return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 })
    }

    // Idempotência: não regerar se já existe (a menos que force)
    if (sessao.recomendacoes && !force) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const resumo = decryptJsonField<SessaoResumo>(sessao.resumo)
    if (!resumo) {
      return NextResponse.json({ error: 'Falha ao ler o prontuário' }, { status: 500 })
    }

    const pacienteResumo = decryptJsonField<PacienteResumo>(sessao.pacientes?.resumo)

    logger.info('Recomendacoes starting', { sessaoId: id })
    const recomendacoes = await generateRecomendacoes(resumo, pacienteResumo)

    const { error: updateError } = await db
      .from('sessoes')
      .update({ recomendacoes: encryptJsonField(recomendacoes) })
      .eq('id', id)

    if (updateError) {
      logger.error('Recomendacoes save failed', { sessaoId: id, error: updateError.message })
      return NextResponse.json({ error: 'Erro ao salvar recomendações' }, { status: 500 })
    }

    logger.info('Recomendacoes complete', { sessaoId: id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    logger.error('Recomendacoes failed', { sessaoId: id, error: message })
    if (error instanceof Error) captureException(error, { sessaoId: id, operation: 'recomendacoes' })
    return NextResponse.json({ error: 'Erro ao gerar recomendações' }, { status: 500 })
  }
}
