import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { logger } from '@/lib/utils/logger'

/** PATCH /api/sessoes/[id] — Atualiza metadata da sessão */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !sessao) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    if (sessao.status !== 'agendada' && sessao.status !== 'remarcada' && body.status !== 'remarcada') {
      return NextResponse.json(
        { error: 'Só é possível editar sessões agendadas ou remarcadas' },
        { status: 409 }
      )
    }

    const update: Record<string, unknown> = {}
    if (body.data_hora) {
      if (isNaN(Date.parse(body.data_hora))) {
        return NextResponse.json({ error: 'data_hora deve ser uma data ISO válida' }, { status: 400 })
      }
      update.data_hora = body.data_hora
    }
    if (body.duracao_prevista) {
      if (typeof body.duracao_prevista !== 'number' || body.duracao_prevista < 1 || body.duracao_prevista > 300) {
        return NextResponse.json({ error: 'duracao_prevista deve ser entre 1 e 300 minutos' }, { status: 400 })
      }
      update.duracao_prevista = body.duracao_prevista
    }
    if (body.status === 'remarcada') update.status = 'remarcada'

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data, error } = await db
      .from('sessoes')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar sessão' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error('Erro ao atualizar sessão', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** DELETE /api/sessoes/[id] — Cancela sessão (soft delete) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !sessao) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    if (sessao.status !== 'agendada' && sessao.status !== 'remarcada') {
      return NextResponse.json(
        { error: 'Só é possível cancelar sessões agendadas ou remarcadas' },
        { status: 409 }
      )
    }

    const { error } = await db
      .from('sessoes')
      .update({ status: 'cancelada' })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Erro ao cancelar sessão' }, { status: 500 })
    }

    return NextResponse.json({ id, status: 'cancelada' })
  } catch (error) {
    logger.error('Erro ao cancelar sessão', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
