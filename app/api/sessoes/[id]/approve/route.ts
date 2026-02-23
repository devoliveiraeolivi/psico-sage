import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SessaoResumo, PacienteResumo, PacienteHistorico, HistoricoItem } from '@/lib/types'
import { calcularProximaSessao } from '@/lib/next-session'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'

// Helper: Supabase client sem tipos rígidos para operações de update
// (o client tipado não suporta JSONB complexos no update)
async function getDb() {
  return await createClient() as any
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const db = await getDb()

    // Buscar sessão com dados do paciente
    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('*, pacientes(id, status, resumo, historico, frequencia_sessoes, dia_semana_preferido, hora_preferida, duracao_padrao)')
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

    const resumo = sessao.resumo as SessaoResumo | null
    const paciente = sessao.pacientes
    if (!resumo || !paciente) {
      return NextResponse.json({ error: 'Resumo ou paciente não encontrado' }, { status: 400 })
    }

    // Build updated patient data (complex JSONB manipulation stays in TypeScript)
    const allAlertas = [
      ...(resumo.alertas?.urgentes || []),
      ...(resumo.alertas?.atencao || []),
    ]
    const novoResumo: PacienteResumo = {
      ...((paciente.resumo as PacienteResumo) || {}),
      sintese: resumo.resumo_sessao?.sintese || undefined,
      humor: resumo.estado_mental_sessao?.humor || undefined,
      tarefas: resumo.plano_metas?.tarefas_novas?.join('; ') || undefined,
      alertas: allAlertas.length > 0 ? allAlertas.join('; ') : undefined,
    }

    const historicoAtual = (paciente.historico as PacienteHistorico) || {}
    const now = new Date().toISOString()
    const baseItem: Omit<HistoricoItem, 'valor'> = {
      data: now,
      sessao_id: id,
      acao: 'adicionado',
    }

    const novoHistorico: PacienteHistorico = { ...historicoAtual }

    if (resumo.estado_mental_sessao?.humor) {
      novoHistorico.humor = [
        ...(historicoAtual.humor || []),
        { ...baseItem, valor: resumo.estado_mental_sessao.humor },
      ]
    }

    // mudancas_observadas feed insights until aggregator AI replaces this
    if (resumo.resumo_sessao?.mudancas_observadas?.length) {
      novoHistorico.insights = [
        ...(historicoAtual.insights || []),
        ...resumo.resumo_sessao.mudancas_observadas.map((i) => ({ ...baseItem, valor: i })),
      ]
    }

    if (resumo.plano_metas?.tarefas_novas?.length) {
      novoHistorico.tarefas = [
        ...(historicoAtual.tarefas || []),
        ...resumo.plano_metas.tarefas_novas.map((t) => ({ ...baseItem, valor: t })),
      ]
    }

    if (allAlertas.length > 0) {
      novoHistorico.alertas = [
        ...(historicoAtual.alertas || []),
        ...allAlertas.map((a) => ({ ...baseItem, valor: a })),
      ]
    }

    // Atomic approve: update session + patient in a single DB transaction
    const { error: rpcError } = await db.rpc('approve_session_atomic', {
      p_sessao_id: id,
      p_paciente_id: paciente.id,
      p_paciente_resumo: novoResumo,
      p_paciente_historico: novoHistorico,
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
    const db = await getDb()
    const body = await request.json()
    const resumo = body.resumo as SessaoResumo

    if (!resumo) {
      return NextResponse.json({ error: 'Resumo não enviado' }, { status: 400 })
    }

    const { error } = await db
      .from('sessoes')
      .update({ resumo })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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
