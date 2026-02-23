import { NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google/calendar'

/** GET /api/auth/google — Redireciona para tela de consentimento Google */
export async function GET() {
  try {
    const url = getGoogleAuthUrl()
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('Erro ao gerar URL Google Auth:', error)
    return NextResponse.json(
      { error: 'Erro ao iniciar autenticação Google' },
      { status: 500 }
    )
  }
}
