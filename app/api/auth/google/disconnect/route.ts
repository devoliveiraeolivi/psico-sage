import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptTextField } from '@/lib/supabase/encrypt'

/** POST /api/auth/google/disconnect — Revoga acesso e remove tokens Google do perfil */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const db = supabase as any

    // Buscar token atual para revogar no Google
    const { data: usuario } = await db
      .from('usuarios')
      .select('google_refresh_token')
      .eq('id', user.id)
      .single()

    // Revogar acesso no Google (best effort — não falhar se Google rejeitar)
    const rawToken = decryptTextField(usuario?.google_refresh_token)
    if (rawToken) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(rawToken)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
      } catch {
        // Revogação falhou (token já inválido, rede, etc) — prosseguir com limpeza
      }
    }

    // Limpar do banco
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
    // Disconnect failed
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
