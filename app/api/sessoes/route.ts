import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/sessoes?from=ISO&to=ISO — Lista sessões num intervalo */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Parâmetros "from" e "to" são obrigatórios' },
        { status: 400 }
      )
    }

    const db = (await createClient()) as any

    const { data, error } = await db
      .from('sessoes')
      .select('id, data_hora, duracao_prevista, status, pacientes(nome)')
      .gte('data_hora', from)
      .lt('data_hora', to)
      .not('status', 'eq', 'cancelada')
      .order('data_hora')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Erro ao buscar sessões:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar sessões' },
      { status: 500 }
    )
  }
}

/** POST /api/sessoes — Cria uma nova sessão */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paciente_id, data_hora, duracao_prevista = 50 } = body

    if (!paciente_id || !data_hora) {
      return NextResponse.json(
        { error: 'paciente_id e data_hora são obrigatórios' },
        { status: 400 }
      )
    }

    const db = (await createClient()) as any

    // numero_sessao is auto-calculated by the DB trigger (with advisory lock for concurrency safety)
    const { data, error } = await db
      .from('sessoes')
      .insert({
        paciente_id,
        data_hora,
        duracao_prevista,
        status: 'agendada',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar sessão' },
      { status: 500 }
    )
  }
}
