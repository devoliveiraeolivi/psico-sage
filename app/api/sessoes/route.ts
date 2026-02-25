import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/utils/auth'
import { logger } from '@/lib/utils/logger'

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

    const fromDate = new Date(from)
    const toDate = new Date(to)
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Formato de data inválido' },
        { status: 400 }
      )
    }

    const { db, error: authError } = await requireAuth()
    if (authError) return authError

    const { data, error } = await db
      .from('sessoes')
      .select('id, data_hora, duracao_prevista, status, pacientes(nome)')
      .gte('data_hora', from)
      .lt('data_hora', to)
      .not('status', 'eq', 'cancelada')
      .order('data_hora')

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar sessões' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    logger.error('Erro ao buscar sessões', { error: error instanceof Error ? error.message : 'unknown' })
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

    // Validate duracao_prevista range
    if (typeof duracao_prevista !== 'number' || duracao_prevista < 1 || duracao_prevista > 300) {
      return NextResponse.json(
        { error: 'duracao_prevista deve ser entre 1 e 300 minutos' },
        { status: 400 }
      )
    }

    // Validate data_hora is a valid ISO date
    const sessionDate = new Date(data_hora)
    if (isNaN(sessionDate.getTime())) {
      return NextResponse.json(
        { error: 'data_hora deve ser uma data ISO válida' },
        { status: 400 }
      )
    }

    // Validate date is not in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (sessionDate < today) {
      return NextResponse.json(
        { error: 'Não é possível agendar sessões em datas passadas' },
        { status: 400 }
      )
    }

    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    // Verify patient belongs to this therapist
    const { data: paciente } = await db
      .from('pacientes')
      .select('id')
      .eq('id', paciente_id)
      .eq('user_id', user!.id)
      .single()

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Check for overlapping sessions on the same day
    const duracaoMin = duracao_prevista || 50
    const newStart = sessionDate.getTime()
    const newEnd = newStart + duracaoMin * 60000
    const dayStart = new Date(sessionDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const { data: daySessions } = await db
      .from('sessoes')
      .select('id, data_hora, duracao_prevista')
      .gte('data_hora', dayStart.toISOString())
      .lt('data_hora', dayEnd.toISOString())
      .not('status', 'in', '(cancelada,falta)')

    const hasOverlap = (daySessions || []).some((s: any) => {
      const sStart = new Date(s.data_hora).getTime()
      const sEnd = sStart + (s.duracao_prevista || 50) * 60000
      return newStart < sEnd && newEnd > sStart
    })

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Já existe uma sessão neste horário' },
        { status: 409 }
      )
    }

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
      return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    logger.error('Erro ao criar sessão', { error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json(
      { error: 'Erro interno ao criar sessão' },
      { status: 500 }
    )
  }
}
