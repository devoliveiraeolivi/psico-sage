import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { createClient } from '@/lib/supabase/server'
import { extractResumo } from '@/lib/ai/extract-resumo'
import { encryptJsonField, decryptTextField } from '@/lib/supabase/encrypt'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'

// Extração síncrona via OpenAI. 60s é o teto do plano Hobby do Vercel.
export const maxDuration = 60
export const runtime = 'nodejs'

/**
 * POST /api/sessoes/[id]/extract
 *
 * Gera o prontuário (resumo) a partir da transcrição já salva (integra).
 * Roda de forma SÍNCRONA — o cliente aguarda. Ao terminar, a sessão fica em
 * `aguardando_aprovacao`.
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

    const rl = checkRateLimit(`extract:${user!.id}`, RATE_LIMITS.extract)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    // Buscar transcrição (pode estar criptografada)
    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('integra')
      .eq('id', id)
      .single()

    if (fetchError || !sessao?.integra) {
      return NextResponse.json({ error: 'Transcrição não encontrada' }, { status: 404 })
    }

    const integraPlain = decryptTextField(sessao.integra)
    if (!integraPlain) {
      return NextResponse.json({ error: 'Falha ao ler a transcrição' }, { status: 500 })
    }

    // Marcar como processando
    await db
      .from('sessoes')
      .update({ recording_status: 'processing', processing_error: null })
      .eq('id', id)

    // Extrair prontuário via OpenAI
    logger.info('Extract starting', { sessaoId: id, textLength: integraPlain.length })
    const resumo = await extractResumo(integraPlain)

    // Salvar resumo (criptografado at rest) e finalizar
    await db
      .from('sessoes')
      .update({
        resumo: encryptJsonField(resumo),
        status: 'aguardando_aprovacao',
        recording_status: 'done',
        processing_error: null,
      })
      .eq('id', id)

    logger.info('Extract complete', { sessaoId: id })

    return NextResponse.json({ ok: true, status: 'aguardando_aprovacao' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    try {
      const errDb = (await createClient()) as any
      await errDb
        .from('sessoes')
        .update({ recording_status: 'error', processing_error: `Extração falhou: ${message}` })
        .eq('id', id)
    } catch {
      // já logado abaixo
    }
    logger.error('Extract failed', { sessaoId: id, error: message })
    if (error instanceof Error) captureException(error, { sessaoId: id, operation: 'extract' })
    return NextResponse.json({ error: 'Erro ao gerar prontuário' }, { status: 500 })
  }
}
