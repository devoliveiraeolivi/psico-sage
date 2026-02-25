import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPermanentMeetLink, GoogleAuthExpiredError } from '@/lib/google/calendar'
import { decryptTextField } from '@/lib/supabase/encrypt'

/** POST /api/auth/google/generate-fixed-link — Gera link fixo do Meet para o terapeuta */
export async function POST() {
  try {
    const db = await createClient() as any
    const { data: { user } } = await db.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: usuario } = await db
      .from('usuarios')
      .select('google_refresh_token, nome')
      .eq('id', user.id)
      .single()

    const rawToken = decryptTextField(usuario?.google_refresh_token)
    if (!rawToken) {
      return NextResponse.json(
        { error: 'google_not_connected', message: 'Conta Google não vinculada.' },
        { status: 400 }
      )
    }

    const result = await createPermanentMeetLink(rawToken, {
      patientName: 'Geral',
      description: 'Link fixo de videochamada para todas as sessões via PsicoApp',
    })

    if (!result.meetLink) {
      return NextResponse.json(
        { error: 'meet_failed', message: 'Google não retornou um link do Meet.' },
        { status: 500 }
      )
    }

    // Salvar o link fixo nas configurações do terapeuta
    await db
      .from('usuarios')
      .update({ video_link_fixo: result.meetLink })
      .eq('id', user.id)

    return NextResponse.json({ videoLink: result.meetLink })
  } catch (error: any) {
    if (error instanceof GoogleAuthExpiredError) {
      return NextResponse.json(
        { error: 'google_not_connected', message: 'Acesso Google expirou. Reconecte sua conta.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao gerar link fixo do Meet' },
      { status: 500 }
    )
  }
}
