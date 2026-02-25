import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { createPermanentMeetLink, GoogleAuthExpiredError } from '@/lib/google/calendar'
import { decryptTextField } from '@/lib/supabase/encrypt'
import { logger } from '@/lib/utils/logger'

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

    const body = await request.json()
    const mode: 'meet' | 'videochamada' | 'presencial' = body.mode || 'presencial'
    const isVideoMode = mode === 'meet' || mode === 'videochamada'

    // Buscar sessão atual
    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('*, pacientes(nome, user_id, video_link)')
      .eq('id', id)
      .single()

    if (fetchError || !sessao) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    if (sessao.status !== 'agendada') {
      return NextResponse.json(
        { error: `Sessão não pode ser iniciada (status: ${sessao.status})` },
        { status: 409 }
      )
    }

    // Buscar configurações de vídeo do terapeuta
    const userId = sessao.pacientes?.user_id
    const { data: usuario } = await db
      .from('usuarios')
      .select('google_refresh_token, video_plataforma, video_modo_link, video_link_fixo')
      .eq('id', userId)
      .single()

    let videoLink: string | null = null

    if (isVideoMode) {
      const plataforma = usuario?.video_plataforma || 'nenhum'
      const modoLink = usuario?.video_modo_link || 'por_paciente'

      if (plataforma === 'nenhum') {
        return NextResponse.json(
          { error: 'video_not_configured', message: 'Videochamada não configurada. Acesse Configurações.' },
          { status: 400 }
        )
      }

      if (modoLink === 'link_fixo') {
        // Usar link fixo global do terapeuta
        videoLink = usuario?.video_link_fixo || null
        if (!videoLink) {
          return NextResponse.json(
            { error: 'video_link_missing', message: 'Link fixo de videochamada não configurado. Acesse Configurações.' },
            { status: 400 }
          )
        }
      } else {
        // Modo por_paciente
        if (sessao.pacientes?.video_link) {
          videoLink = sessao.pacientes.video_link
        } else if (plataforma === 'google_meet') {
          // Auto-gerar link permanente via Google Calendar API
          const rawToken = decryptTextField(usuario?.google_refresh_token)
          if (!rawToken) {
            return NextResponse.json(
              { error: 'google_not_connected', message: 'Conta Google não vinculada. Conecte sua conta nas configurações.' },
              { status: 400 }
            )
          }

          try {
            const pacienteNome = sessao.pacientes?.nome || 'Paciente'
            const result = await createPermanentMeetLink(rawToken, {
              patientName: pacienteNome,
            })

            videoLink = result.meetLink

            if (result.meetLink) {
              await db
                .from('pacientes')
                .update({
                  video_link: result.meetLink,
                  video_calendar_event_id: result.calendarEventId,
                })
                .eq('id', sessao.paciente_id)
            }
          } catch (meetError: any) {
            if (meetError instanceof GoogleAuthExpiredError) {
              await db
                .from('usuarios')
                .update({ google_refresh_token: null, google_email: null, google_connected_at: null })
                .eq('id', userId)
              return NextResponse.json(
                { error: 'google_not_connected', message: 'Acesso Google expirou. Reconecte sua conta nas configurações.' },
                { status: 400 }
              )
            }
            const detail = meetError?.response?.data?.error?.message || meetError?.message || 'Erro desconhecido'
            logger.error('Erro ao criar Meet link', { sessaoId: id, error: detail })
            return NextResponse.json(
              { error: 'meet_failed', message: `Erro ao criar link do Google Meet: ${detail}` },
              { status: 500 }
            )
          }
        } else {
          // Plataforma externa sem link configurado para o paciente
          return NextResponse.json(
            { error: 'video_link_missing', message: 'Link de videochamada não configurado para este paciente.' },
            { status: 400 }
          )
        }
      }
    }

    // Atualizar sessão
    const { error: updateError } = await db
      .from('sessoes')
      .update({
        status: 'em_andamento',
        video_link: videoLink,
        recording_status: 'recording',
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao iniciar sessão' }, { status: 500 })
    }

    return NextResponse.json({
      sessaoId: id,
      videoLink,
      mode,
    })
  } catch (error) {
    logger.error('Erro ao iniciar sessão', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json(
      { error: 'Erro interno ao iniciar sessão' },
      { status: 500 }
    )
  }
}
