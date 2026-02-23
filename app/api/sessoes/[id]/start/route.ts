import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPermanentMeetLink } from '@/lib/google/calendar'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const db = await createClient() as any
    const body = await request.json()
    const mode: 'meet' | 'presencial' = body.mode || 'meet'

    // Buscar sessão atual
    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('*, pacientes(nome, user_id, meet_link)')
      .eq('id', id)
      .single()

    if (fetchError || !sessao) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    if (sessao.status !== 'agendada') {
      return NextResponse.json(
        { error: `Sessão não pode ser iniciada (status: ${sessao.status})` },
        { status: 400 }
      )
    }

    let meetLink: string | null = null

    // Usar link fixo do paciente (ou gerar se não existe)
    if (mode === 'meet') {
      // Tentar usar o link fixo do paciente
      if (sessao.pacientes?.meet_link) {
        meetLink = sessao.pacientes.meet_link
      } else {
        // Fallback: gerar link permanente e salvar no paciente
        const userId = sessao.pacientes?.user_id
        const { data: usuario } = await db
          .from('usuarios')
          .select('google_refresh_token')
          .eq('id', userId)
          .single()

        if (!usuario?.google_refresh_token) {
          return NextResponse.json(
            { error: 'google_not_connected', message: 'Conta Google não vinculada. Conecte sua conta nas configurações.' },
            { status: 400 }
          )
        }

        try {
          const pacienteNome = sessao.pacientes?.nome || 'Paciente'

          const result = await createPermanentMeetLink(usuario.google_refresh_token, {
            patientName: pacienteNome,
          })

          meetLink = result.meetLink

          // Salvar no paciente para reutilizar
          if (result.meetLink) {
            await db
              .from('pacientes')
              .update({
                meet_link: result.meetLink,
                meet_calendar_event_id: result.calendarEventId,
              })
              .eq('id', sessao.paciente_id)
          }
        } catch (meetError: any) {
          const detail = meetError?.response?.data?.error?.message || meetError?.message || 'Erro desconhecido'
          console.error('Erro ao criar Meet link:', detail, meetError)
          return NextResponse.json(
            { error: 'meet_failed', message: `Erro ao criar link do Google Meet: ${detail}` },
            { status: 500 }
          )
        }
      }
    }

    // Atualizar sessão
    const { error: updateError } = await db
      .from('sessoes')
      .update({
        status: 'em_andamento',
        meet_link: meetLink,
        recording_status: 'recording',
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      sessaoId: id,
      meetLink,
      mode,
    })
  } catch (error) {
    console.error('Erro ao iniciar sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno ao iniciar sessão' },
      { status: 500 }
    )
  }
}
