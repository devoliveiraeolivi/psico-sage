import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'

const ALLOWED_EXT = ['webm', 'mp3', 'wav', 'm4a', 'ogg', 'mp4', 'mpeg']

/**
 * POST /api/sessoes/[id]/upload-url
 *
 * Gera uma signed upload URL para o browser enviar o áudio DIRETO pro
 * Supabase Storage, sem passar pela função do Vercel (que tem limite de
 * 4.5MB no body). O token é criado com o service_role, então a request
 * já valida ownership aqui.
 *
 * Body: { ext?: string }
 * Retorna: { path, token } — o client usa storage.uploadToSignedUrl(path, token, file)
 */
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

    const rl = checkRateLimit(`upload-url:${user!.id}`, RATE_LIMITS.uploadAudio)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const rawExt = (body.ext || 'webm').toString().toLowerCase().replace(/[^a-z0-9]/g, '')
    const ext = ALLOWED_EXT.includes(rawExt) ? rawExt : 'webm'

    const path = `${id}_${Date.now()}.${ext}`

    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from('audio-sessoes')
      .createSignedUploadUrl(path)

    if (error || !data) {
      logger.error('Failed to create signed upload URL', { sessaoId: id, error: error?.message })
      return NextResponse.json({ error: 'Não foi possível preparar o upload' }, { status: 500 })
    }

    return NextResponse.json({ path: data.path, token: data.token })
  } catch (error) {
    logger.error('upload-url failed', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Erro interno ao preparar upload' }, { status: 500 })
  }
}
