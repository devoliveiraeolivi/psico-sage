import { NextRequest, NextResponse } from 'next/server'
import { adjustResumo } from '@/lib/ai/adjust-resumo'
import { decryptJsonField, decryptTextField, encryptJsonField } from '@/lib/supabase/encrypt'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import type { SessaoResumo } from '@/lib/types'

/**
 * POST /api/sessoes/[id]/ai-adjust
 * Ajusta o prontuário da sessão via IA com base nas instruções do terapeuta.
 * Síncrono — retorna o resumo ajustado diretamente.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error
    const rl = checkRateLimit(`ai-adjust:${user!.id}`, RATE_LIMITS.aiAdjust)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 },
      )
    }

    // Parse body
    const body = await request.json()
    const instrucoes = body?.instrucoes
    if (!instrucoes || typeof instrucoes !== 'string' || instrucoes.trim().length < 5) {
      return NextResponse.json({ error: 'Instrução muito curta (mínimo 5 caracteres)' }, { status: 400 })
    }
    if (instrucoes.length > 2000) {
      return NextResponse.json({ error: 'Instrução muito longa (máximo 2000 caracteres)' }, { status: 400 })
    }

    // Load session
    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('resumo, integra')
      .eq('id', id)
      .single()

    if (fetchError || !sessao) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    const currentResumo = decryptJsonField<SessaoResumo>(sessao.resumo)
    const transcricao = decryptTextField(sessao.integra)

    if (!currentResumo) {
      return NextResponse.json({ error: 'Resumo não encontrado. Execute a extração primeiro.' }, { status: 400 })
    }
    if (!transcricao) {
      return NextResponse.json({ error: 'Transcrição não encontrada. O ajuste por IA precisa da transcrição original.' }, { status: 400 })
    }

    // Call AI
    logger.info('AI adjust requested', { sessaoId: id, instructionLength: instrucoes.trim().length })
    const result = await adjustResumo(currentResumo, transcricao, instrucoes.trim())

    // Save back
    const { error: updateError } = await db
      .from('sessoes')
      .update({ resumo: encryptJsonField(result.resumo) })
      .eq('id', id)

    if (updateError) {
      logger.error('Failed to save adjusted resumo', { sessaoId: id, error: updateError.message })
      return NextResponse.json({ error: 'Erro ao salvar ajuste' }, { status: 500 })
    }

    logger.info('AI adjust completed', { sessaoId: id })
    return NextResponse.json({ resumo: result.resumo, descricao_ajustes: result.descricao_ajustes })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    logger.error('AI adjust failed', { sessaoId: id, error: message })
    captureException(error as Error)
    return NextResponse.json({ error: 'Erro ao ajustar prontuário com IA' }, { status: 500 })
  }
}
