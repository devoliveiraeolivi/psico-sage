import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** PATCH /api/sessoes/[id] — Atualiza metadata da sessão */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const db = (await createClient()) as any

    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !sessao) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    if (sessao.status !== 'agendada' && body.status !== 'remarcada') {
      return NextResponse.json(
        { error: 'Só é possível editar sessões com status "agendada"' },
        { status: 400 }
      )
    }

    const update: Record<string, unknown> = {}
    if (body.data_hora) update.data_hora = body.data_hora
    if (body.duracao_prevista) update.duracao_prevista = body.duracao_prevista
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao atualizar sessão:', error)
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
    const db = (await createClient()) as any

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
        { status: 400 }
      )
    }

    const { error } = await db
      .from('sessoes')
      .update({ status: 'cancelada' })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id, status: 'cancelada' })
  } catch (error) {
    console.error('Erro ao cancelar sessão:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
