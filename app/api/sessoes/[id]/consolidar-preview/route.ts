import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { decryptJsonField } from '@/lib/supabase/encrypt'
import { consolidateFichaAI } from '@/lib/ai/consolidate-ficha'
import { consolidateFicha, emptyFicha } from '@/lib/ficha/merge'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'
import type { SessaoResumo, PacienteFicha } from '@/lib/types'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError
    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    const rl = checkRateLimit(`consolidar:${user!.id}`, RATE_LIMITS.extract)
    if (!rl.success) return NextResponse.json({ error: 'Muitas requisições. Tente novamente em breve.' }, { status: 429 })

    const { data: sessao, error } = await db
      .from('sessoes')
      .select('resumo, data_hora, pacientes(ficha)')
      .eq('id', id).single()
    if (error || !sessao?.resumo) return NextResponse.json({ error: 'Sessão ou resumo não encontrado' }, { status: 404 })

    const resumo = decryptJsonField<SessaoResumo>(sessao.resumo)
    const fichaAtual = decryptJsonField<PacienteFicha>((sessao as any).pacientes?.ficha)
    const ficha = fichaAtual?.atual ? fichaAtual : emptyFicha()
    if (!resumo) return NextResponse.json({ error: 'Falha ao ler resumo' }, { status: 500 })

    const patches = await consolidateFichaAI(ficha.atual, resumo)
    const ficha_proposta = consolidateFicha(ficha, patches, id, (sessao as any).data_hora)

    return NextResponse.json({ changelog: patches, ficha_proposta })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    logger.error('Consolidar preview failed', { sessaoId: id, error: message })
    if (error instanceof Error) captureException(error, { sessaoId: id, operation: 'consolidar-preview' })
    return NextResponse.json({ error: 'Erro ao gerar prévia da ficha' }, { status: 500 })
  }
}
