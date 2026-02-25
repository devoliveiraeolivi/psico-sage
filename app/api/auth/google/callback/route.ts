import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getOAuth2Client } from '@/lib/google/calendar'
import { encryptTextField } from '@/lib/supabase/encrypt'

/** GET /api/auth/google/callback — Recebe o code do Google, troca por tokens e salva */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const state = url.searchParams.get('state') || ''

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Validate redirect path against whitelist to prevent open redirect
  const ALLOWED_REDIRECTS = ['/configuracoes', '/dashboard', '/sessoes', '/pacientes', '/agenda']
  const redirectPath = ALLOWED_REDIRECTS.includes(state) ? state : '/configuracoes'

  if (error) {
    return NextResponse.redirect(
      `${appUrl}${redirectPath}?google=error&message=${encodeURIComponent(error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}${redirectPath}?google=error&message=Código de autorização não recebido`
    )
  }

  try {
    // Trocar code por tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${appUrl}${redirectPath}?google=error&message=Google não retornou refresh_token. Tente revogar o acesso e reconectar.`
      )
    }

    // Buscar usuário autenticado
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${appUrl}/login`)
    }

    // Buscar email do Google via userinfo
    const { google } = await import('googleapis')
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()

    // Salvar tokens no perfil da psicóloga
    // Usa admin client para bypassar RLS — o user já foi autenticado via getUser() acima
    const updateData = {
      google_refresh_token: encryptTextField(tokens.refresh_token),
      google_email: userInfo.email || null,
      google_connected_at: new Date().toISOString(),
    }

    let updateError: { message: string } | null = null

    // Tentar primeiro com o client normal (cookies + RLS)
    const db = supabase as any
    const { error: rlsError } = await db
      .from('usuarios')
      .update(updateData)
      .eq('id', user.id)

    if (rlsError) {
      // Update com anon key falhou (provavelmente RLS) — fallback para admin
      // Fallback: usar service_role key
      try {
        const admin = createAdminClient() as any
        const { error: adminError } = await admin
          .from('usuarios')
          .update(updateData)
          .eq('id', user.id)
        updateError = adminError
      } catch (adminErr) {
        // Admin client não disponível
        updateError = rlsError
      }
    }

    if (updateError) {
      return NextResponse.redirect(
        `${appUrl}${redirectPath}?google=error&message=${encodeURIComponent('Erro ao salvar dados do Google')}`
      )
    }

    return NextResponse.redirect(`${appUrl}${redirectPath}?google=success`)
  } catch (err) {
    return NextResponse.redirect(
      `${appUrl}${redirectPath}?google=error&message=${encodeURIComponent('Erro na autenticação Google')}`
    )
  }
}
