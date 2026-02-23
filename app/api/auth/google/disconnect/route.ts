import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** POST /api/auth/google/disconnect — Remove tokens Google do perfil */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const db = supabase as any
    await db
      .from('usuarios')
      .update({
        google_refresh_token: null,
        google_email: null,
        google_connected_at: null,
      })
      .eq('id', user.id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao desconectar Google:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
