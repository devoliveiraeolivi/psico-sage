import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requirePatientOwner } from '@/lib/utils/auth'
import { logger } from '@/lib/utils/logger'

const FREQUENCIAS_VALIDAS = ['semanal', 'quinzenal', 'mensal']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requirePatientOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    const body = await request.json()

    // Campos permitidos para atualização de recorrência
    const update: Record<string, any> = {}

    if ('frequencia_sessoes' in body) {
      if (body.frequencia_sessoes !== null && !FREQUENCIAS_VALIDAS.includes(body.frequencia_sessoes)) {
        return NextResponse.json({ error: 'Frequência inválida' }, { status: 400 })
      }
      update.frequencia_sessoes = body.frequencia_sessoes
    }

    if ('dia_semana_preferido' in body) {
      if (body.dia_semana_preferido !== null && (body.dia_semana_preferido < 0 || body.dia_semana_preferido > 6)) {
        return NextResponse.json({ error: 'Dia da semana inválido (0-6)' }, { status: 400 })
      }
      update.dia_semana_preferido = body.dia_semana_preferido
    }

    if ('hora_preferida' in body) {
      if (body.hora_preferida !== null && !/^\d{2}:\d{2}$/.test(body.hora_preferida)) {
        return NextResponse.json({ error: 'Hora inválida (formato HH:mm)' }, { status: 400 })
      }
      update.hora_preferida = body.hora_preferida
    }

    if ('duracao_padrao' in body) {
      if (body.duracao_padrao !== null && (body.duracao_padrao < 1 || body.duracao_padrao > 300)) {
        return NextResponse.json({ error: 'Duração inválida' }, { status: 400 })
      }
      update.duracao_padrao = body.duracao_padrao
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data, error } = await db
      .from('pacientes')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar paciente' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error('Erro ao atualizar paciente', { pacienteId: id, error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json(
      { error: 'Erro interno ao atualizar paciente' },
      { status: 500 }
    )
  }
}
