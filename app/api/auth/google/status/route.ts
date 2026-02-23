import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/auth/google/status — Verifica se a psicóloga vinculou sua conta Google */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const db = supabase as any
    const { data: usuario, error } = await db
      .from('usuarios')
      .select('google_email, google_connected_at')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Erro ao buscar status Google:', error)
    }

    return NextResponse.json({
      connected: !!usuario?.google_email,
      email: usuario?.google_email || null,
      connectedAt: usuario?.google_connected_at || null,
    })
  } catch (error) {
    console.error('Erro ao verificar status Google:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
