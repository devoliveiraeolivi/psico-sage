import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requirePatientOwner } from '@/lib/utils/auth'
import { createPermanentMeetLink, GoogleAuthExpiredError } from '@/lib/google/calendar'
import { decryptTextField } from '@/lib/supabase/encrypt'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requirePatientOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    const { data: paciente, error } = await (db as any)
      .from('pacientes')
      .select('video_link, video_calendar_event_id')
      .eq('id', id)
      .single() as { data: { video_link: string | null; video_calendar_event_id: string | null } | null; error: any }

    if (error || !paciente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      videoLink: paciente.video_link,
      calendarEventId: paciente.video_calendar_event_id,
    })
  } catch (error) {
    logger.error('Erro ao buscar video link', { pacienteId: id, error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requirePatientOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    // Buscar paciente
    const { data: paciente, error: fetchError } = await (db as any)
      .from('pacientes')
      .select('id, nome, user_id, video_link')
      .eq('id', id)
      .single() as { data: { id: string; nome: string; user_id: string; video_link: string | null } | null; error: any }

    if (fetchError || !paciente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Buscar configurações de vídeo do terapeuta
    const { data: usuario } = await db
      .from('usuarios')
      .select('google_refresh_token, video_plataforma, video_modo_link')
      .eq('id', paciente.user_id)
      .single()

    const plataforma = usuario?.video_plataforma || 'nenhum'
    const modoLink = usuario?.video_modo_link || 'por_paciente'

    // Não gera link por paciente no modo link_fixo
    if (modoLink === 'link_fixo') {
      return NextResponse.json(
        { error: 'link_fixo_mode', message: 'No modo link fixo, o link é configurado em Configurações.' },
        { status: 400 }
      )
    }

    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // Sem body é ok
    }

    const force = body.force === true

    // Plataforma externa: aceitar link manual no body
    if (plataforma === 'externo') {
      const link = body.link as string | undefined
      if (link) {
        try {
          const parsed = new URL(link.trim())
          if (!['https:', 'http:'].includes(parsed.protocol)) {
            return NextResponse.json({ error: 'URL inválida. Use https://...' }, { status: 400 })
          }
        } catch {
          return NextResponse.json({ error: 'URL inválida. Use https://...' }, { status: 400 })
        }

        const { error: updateError } = await db
          .from('pacientes')
          .update({ video_link: link.trim() })
          .eq('id', id)

        if (updateError) {
          logger.error('Erro ao salvar video link', { pacienteId: id, error: updateError.message })
          return NextResponse.json({ error: 'Erro ao salvar link de videochamada' }, { status: 500 })
        }

        return NextResponse.json({ videoLink: link.trim() })
      }

      // Se não mandou link e já existe, retornar o existente
      if (paciente.video_link && !force) {
        return NextResponse.json({ videoLink: paciente.video_link, alreadyExisted: true })
      }

      return NextResponse.json(
        { error: 'link_required', message: 'Envie o campo "link" no body para salvar o link de videochamada.' },
        { status: 400 }
      )
    }

    // Google Meet: gerar via Calendar API
    if (plataforma === 'google_meet') {
      if (paciente.video_link && !force) {
        return NextResponse.json({
          videoLink: paciente.video_link,
          alreadyExisted: true,
        })
      }

      const rawToken = decryptTextField(usuario?.google_refresh_token)
      if (!rawToken) {
        return NextResponse.json(
          { error: 'google_not_connected', message: 'Conta Google não vinculada. Conecte nas Configurações.' },
          { status: 400 }
        )
      }

      const result = await createPermanentMeetLink(rawToken, {
        patientName: paciente.nome,
      })

      if (!result.meetLink) {
        return NextResponse.json(
          { error: 'meet_failed', message: 'Google não retornou um link do Meet.' },
          { status: 500 }
        )
      }

      const { error: updateError } = await db
        .from('pacientes')
        .update({
          video_link: result.meetLink,
          video_calendar_event_id: result.calendarEventId,
        })
        .eq('id', id)

      if (updateError) {
        logger.error('Erro ao salvar Meet link', { pacienteId: id, error: updateError.message })
        return NextResponse.json({ error: 'Erro ao salvar link de videochamada' }, { status: 500 })
      }

      return NextResponse.json({
        videoLink: result.meetLink,
        calendarEventId: result.calendarEventId,
      })
    }

    // Plataforma 'nenhum'
    return NextResponse.json(
      { error: 'video_not_configured', message: 'Videochamada não configurada. Acesse Configurações.' },
      { status: 400 }
    )
  } catch (error: any) {
    if (error instanceof GoogleAuthExpiredError) {
      // Limpar token expirado
      try {
        const { db: cleanupDb } = await requireAuth()
        const { data: pac } = await cleanupDb
          .from('pacientes')
          .select('user_id')
          .eq('id', id)
          .single()
        if (pac?.user_id) {
          await cleanupDb
            .from('usuarios')
            .update({ google_refresh_token: null, google_email: null, google_connected_at: null })
            .eq('id', pac.user_id)
        }
      } catch {
        // Best-effort cleanup
      }
      return NextResponse.json(
        { error: 'google_not_connected', message: 'Acesso Google expirou. Reconecte sua conta nas Configurações.' },
        { status: 400 }
      )
    }

    const detail = error?.response?.data?.error?.message || error?.message || 'Erro desconhecido'
    logger.error('Erro ao gerar video link', { pacienteId: id, error: detail })
    return NextResponse.json(
      { error: 'Erro ao gerar link de videochamada' },
      { status: 500 }
    )
  }
}
