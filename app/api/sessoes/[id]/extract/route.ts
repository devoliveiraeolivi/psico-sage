import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractResumo } from '@/lib/ai/extract-resumo'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const db = await createClient() as any

    // Rate limiting
    const { data: { user } } = await db.auth.getUser()
    const userId = user?.id || 'anonymous'
    const rl = checkRateLimit(`extract:${userId}`, RATE_LIMITS.extract)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    // Buscar transcrição
    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('integra')
      .eq('id', id)
      .single()

    if (fetchError || !sessao?.integra) {
      return NextResponse.json({ error: 'Transcrição não encontrada' }, { status: 404 })
    }

    // Extrair dados estruturados via Gemini 2.5 Flash
    logger.info('Extraction starting', { sessaoId: id, textLength: sessao.integra.length })
    const resumo = await extractResumo(sessao.integra)

    // Salvar resumo e mudar status para aguardando_aprovacao
    await db
      .from('sessoes')
      .update({
        resumo,
        status: 'aguardando_aprovacao',
        recording_status: 'done',
        processing_error: null,
      })
      .eq('id', id)

    return NextResponse.json({ resumo })
  } catch (error) {
    const db = await createClient() as any
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    await db
      .from('sessoes')
      .update({
        recording_status: 'error',
        processing_error: `Extração IA falhou: ${message}`,
      })
      .eq('id', id)

    logger.error('Extraction failed', { sessaoId: id, error: message })
    if (error instanceof Error) captureException(error, { sessaoId: id, operation: 'extract' })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
