import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import type { SessaoResumo, FichaPatch, PacienteFicha } from '@/lib/types'
import { calcularProximaSessao } from '@/lib/next-session'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'
import { decryptJsonField, encryptJsonField } from '@/lib/supabase/encrypt'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { consolidateFicha, deterministicPatches, projectToLegacy, emptyFicha } from '@/lib/ficha/merge'

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

    // Buscar sessão com dados do paciente
    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('*, pacientes(id, status, resumo, historico, ficha, frequencia_sessoes, dia_semana_preferido, hora_preferida, duracao_padrao)')
      .eq('id', id)
      .single()

    if (fetchError || !sessao) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    if (sessao.status !== 'aguardando_aprovacao') {
      return NextResponse.json(
        { error: `Sessão não pode ser aprovada (status: ${sessao.status})` },
        { status: 400 }
      )
    }

    const resumo = decryptJsonField<SessaoResumo>(sessao.resumo)
    const paciente = sessao.pacientes
    if (!resumo || !paciente) {
      return NextResponse.json({ error: 'Resumo ou paciente não encontrado' }, { status: 400 })
    }

    // Read accepted patches from request body (may be absent for fallback path)
    const body = await request.json().catch(() => ({}))
    let acceptedPatches: FichaPatch[] = Array.isArray(body?.acceptedPatches) ? body.acceptedPatches : []

    // Decrypt patient ficha; fall back to empty structure if absent
    const fichaDecrypted = decryptJsonField<PacienteFicha>(paciente.ficha)
    const fichaBase = fichaDecrypted?.atual ? fichaDecrypted : emptyFicha()

    // Fallback: no patches supplied (IA #2 unavailable or first-time) → deterministic rules
    let pendente = false
    if (acceptedPatches.length === 0) {
      acceptedPatches = deterministicPatches(fichaBase.atual, resumo)
      pendente = true
    }

    const fichaNova = consolidateFicha(fichaBase, acceptedPatches, id, sessao.data_hora)
    fichaNova.consolidacao_pendente = pendente
    const { resumo: novoResumo, historico: novoHistorico } = projectToLegacy(fichaNova)

    // Atomic approve: update session + patient in a single DB transaction
    // Encrypt sensitive fields before persisting
    const { error: rpcError } = await db.rpc('approve_session_atomic', {
      p_sessao_id: id,
      p_paciente_id: paciente.id,
      p_paciente_resumo: encryptJsonField(novoResumo),
      p_paciente_historico: encryptJsonField(novoHistorico),
      p_paciente_ficha: encryptJsonField(fichaNova),
    })

    if (rpcError) {
      return NextResponse.json({ error: `Falha na aprovação: ${rpcError.message}` }, { status: 500 })
    }

    // 4. Auto-criar próxima sessão se recorrência configurada
    let proximaSessao = null

    if (
      paciente.frequencia_sessoes &&
      paciente.dia_semana_preferido !== null &&
      paciente.hora_preferida &&
      paciente.status === 'ativo'
    ) {
      try {
        // Verificar se já existe sessão agendada para este paciente
        const { count: agendadas } = await db
          .from('sessoes')
          .select('*', { count: 'exact', head: true })
          .eq('paciente_id', paciente.id)
          .eq('status', 'agendada')

        if (!agendadas || agendadas === 0) {
          const proximaDataHora = calcularProximaSessao(
            sessao.data_hora,
            paciente.frequencia_sessoes,
            paciente.dia_semana_preferido,
            paciente.hora_preferida
          )

          // numero_sessao is auto-calculated by the DB trigger (with advisory lock)
          const { data: novaSessao } = await db
            .from('sessoes')
            .insert({
              paciente_id: paciente.id,
              data_hora: proximaDataHora,
              duracao_prevista: paciente.duracao_padrao || sessao.duracao_prevista || 50,
              status: 'agendada',
            })
            .select('id, data_hora, duracao_prevista, numero_sessao')
            .single()

          proximaSessao = novaSessao
        }
      } catch (recErr) {
        // Não falhar a aprovação se a auto-criação der erro
        logger.warn('Failed to auto-create next session', { sessaoId: id, error: recErr instanceof Error ? recErr.message : 'unknown' })
      }
    }

    // Bust Next.js cache so the UI reflects the new status immediately
    revalidatePath('/sessoes')
    revalidatePath(`/sessoes/${id}`)
    revalidatePath('/dashboard')

    return NextResponse.json({ status: 'realizada', proximaSessao })
  } catch (error) {
    logger.error('Approve failed', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    if (error instanceof Error) captureException(error, { sessaoId: id, operation: 'approve' })
    return NextResponse.json(
      { error: 'Erro interno ao aprovar sessão' },
      { status: 500 }
    )
  }
}

// PATCH: Salvar edição do resumo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { user: patchUser, db, error: patchAuthError } = await requireAuth()
    if (patchAuthError) return patchAuthError

    const patchOwnership = await requireSessionOwner(db, patchUser!.id, id)
    if (patchOwnership.error) return patchOwnership.error

    const body = await request.json()
    const resumo = body.resumo as SessaoResumo

    if (!resumo) {
      return NextResponse.json({ error: 'Resumo não enviado' }, { status: 400 })
    }

    const { error } = await db
      .from('sessoes')
      .update({ resumo: encryptJsonField(resumo) })
      .eq('id', id)

    if (error) {
      logger.error('Edit resumo DB failed', { sessaoId: id, error: error.message })
      return NextResponse.json({ error: 'Erro ao salvar edição' }, { status: 500 })
    }

    return NextResponse.json({ resumo })
  } catch (error) {
    logger.error('Edit resumo failed', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json(
      { error: 'Erro interno ao salvar edição' },
      { status: 500 }
    )
  }
}
