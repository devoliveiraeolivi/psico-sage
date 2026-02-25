import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google/calendar'

/** GET /api/auth/google — Redireciona para tela de consentimento Google */
export async function GET(request: NextRequest) {
  try {
    // Accept optional `from` param to redirect back after OAuth
    const from = request.nextUrl.searchParams.get('from') || ''
    const url = getGoogleAuthUrl(from)
    return NextResponse.redirect(url)
  } catch (error) {
    // Error generating Google Auth URL
    return NextResponse.json(
      { error: 'Erro ao iniciar autenticação Google' },
      { status: 500 }
    )
  }
}
