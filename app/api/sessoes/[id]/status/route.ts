import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'

/**
 * GET /api/sessoes/[id]/status
 * Lightweight endpoint for polling session processing status.
 * Returns only the fields needed by the client to track progress.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    const { data: sessao, error } = await db
      .from('sessoes')
      .select('status, recording_status, processing_error')
      .eq('id', id)
      .single()

    if (error || !sessao) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      status: sessao.status,
      recording_status: sessao.recording_status,
      processing_error: sessao.processing_error,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
