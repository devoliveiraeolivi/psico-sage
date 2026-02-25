import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { logger } from '@/lib/utils/logger'

/** DELETE /api/sessoes/[id]/destroy — Exclui sessão permanentemente */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    // Busca sessão com dados necessários para limpeza
    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('id, audio_url, calendar_event_id')
      .eq('id', id)
      .single()

    if (fetchError || !sessao) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    // Exclui sessão do banco primeiro (se falhar, não fica com dados órfãos)
    const { error } = await db
      .from('sessoes')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Erro ao excluir sessão' }, { status: 500 })
    }

    // Remove áudio do storage depois do DB (best-effort)
    if (sessao.audio_url) {
      try {
        await db.storage.from('audio-sessoes').remove([sessao.audio_url])
      } catch {
        logger.warn('Failed to delete audio from storage', { sessaoId: id, audioUrl: sessao.audio_url })
      }
    }

    return NextResponse.json({ id, deleted: true })
  } catch (error) {
    logger.error('Erro ao excluir sessão', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
