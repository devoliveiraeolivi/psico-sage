import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'
import { MAX_UPLOAD_SIZE_MB } from '@/lib/transcription/groq'

/**
 * POST /api/sessoes/[id]/upload-audio
 *
 * Finaliza o upload de áudio. O arquivo já foi enviado DIRETO pro Supabase
 * Storage pelo browser (via signed upload URL — ver /upload-url), então esta
 * rota recebe apenas metadata leve (JSON): o path do objeto e a duração.
 * Isso evita o limite de 4.5MB de body das funções serverless do Vercel.
 *
 * Body: { path: string, duration?: number }
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

    const rl = checkRateLimit(`upload:${user!.id}`, RATE_LIMITS.uploadAudio)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const path: string | undefined = body.path
    const duration: number | null = body.duration != null ? parseInt(String(body.duration), 10) : null

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'path do áudio não informado' }, { status: 400 })
    }

    // Segurança: o objeto precisa pertencer a esta sessão (prefixo `${id}_`)
    if (!path.startsWith(`${id}_`) || path.includes('/')) {
      return NextResponse.json({ error: 'path de áudio inválido' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Confirmar que o objeto existe no Storage e validar tamanho
    const { data: list, error: listError } = await admin.storage
      .from('audio-sessoes')
      .list('', { search: path })

    const obj = list?.find((o) => o.name === path)
    if (listError || !obj) {
      return NextResponse.json({ error: 'Áudio não encontrado no Storage. Refaça o upload.' }, { status: 404 })
    }

    const sizeMB = (obj.metadata?.size ?? 0) / (1024 * 1024)
    if (sizeMB > MAX_UPLOAD_SIZE_MB) {
      // Remover objeto grande demais pra não acumular lixo
      await admin.storage.from('audio-sessoes').remove([path]).catch(() => {})
      return NextResponse.json(
        { error: `Arquivo muito grande (${sizeMB.toFixed(0)}MB). Limite: ${MAX_UPLOAD_SIZE_MB}MB.` },
        { status: 413 }
      )
    }

    // Salvar referência e duração. O processamento (transcrição → extração) é
    // orquestrado pelo cliente em seguida (ver session-recorder), chamando
    // /transcribe e depois /extract — sem fila externa.
    await db
      .from('sessoes')
      .update({
        audio_url: path,
        audio_duracao_segundos: duration,
        duracao_real: duration ? Math.round(duration / 60) : null,
        recording_status: 'uploading',
      })
      .eq('id', id)

    logger.info('Upload finalized', { sessaoId: id, path, duration })

    return NextResponse.json({ filename: path, durationSeconds: duration })
  } catch (error) {
    logger.error('Upload finalize failed', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    if (error instanceof Error) captureException(error, { sessaoId: id, operation: 'upload' })
    return NextResponse.json({ error: 'Erro interno no upload' }, { status: 500 })
  }
}
