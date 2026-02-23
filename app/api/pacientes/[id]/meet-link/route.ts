import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPermanentMeetLink } from '@/lib/google/calendar'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const db = await createClient() as any

    const { data: paciente, error } = await db
      .from('pacientes')
      .select('meet_link, meet_calendar_event_id')
      .eq('id', id)
      .single()

    if (error || !paciente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      meetLink: paciente.meet_link,
      calendarEventId: paciente.meet_calendar_event_id,
    })
  } catch (error) {
    console.error('Erro ao buscar Meet link:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const db = await createClient() as any

    // Buscar paciente
    const { data: paciente, error: fetchError } = await db
      .from('pacientes')
      .select('id, nome, user_id, meet_link')
      .eq('id', id)
      .single()

    if (fetchError || !paciente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Verificar se já existe (a menos que force=true)
    let force = false
    try {
      const body = await request.json()
      force = body.force === true
    } catch {
      // Sem body é ok
    }

    if (paciente.meet_link && !force) {
      return NextResponse.json({
        meetLink: paciente.meet_link,
        alreadyExisted: true,
      })
    }

    // Buscar refresh token do terapeuta
    const { data: usuario } = await db
      .from('usuarios')
      .select('google_refresh_token')
      .eq('id', paciente.user_id)
      .single()

    if (!usuario?.google_refresh_token) {
      return NextResponse.json(
        { error: 'google_not_connected', message: 'Conta Google não vinculada. Conecte nas Configurações.' },
        { status: 400 }
      )
    }

    // Gerar link permanente
    const result = await createPermanentMeetLink(usuario.google_refresh_token, {
      patientName: paciente.nome,
    })

    if (!result.meetLink) {
      return NextResponse.json(
        { error: 'meet_failed', message: 'Google não retornou um link do Meet.' },
        { status: 500 }
      )
    }

    // Salvar no paciente
    const { error: updateError } = await db
      .from('pacientes')
      .update({
        meet_link: result.meetLink,
        meet_calendar_event_id: result.calendarEventId,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      meetLink: result.meetLink,
      calendarEventId: result.calendarEventId,
    })
  } catch (error: any) {
    const detail = error?.response?.data?.error?.message || error?.message || 'Erro desconhecido'
    console.error('Erro ao gerar Meet link permanente:', detail, error)
    return NextResponse.json(
      { error: 'Erro ao gerar link do Meet', message: detail },
      { status: 500 }
    )
  }
}
