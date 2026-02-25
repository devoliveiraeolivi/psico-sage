import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/onboarding — Retorna status completo do onboarding */
export async function GET() {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data } = await supabase
      .from('usuarios')
      .select('onboarding_completed, setup_completed, page_tours_completed')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      onboarding_completed: data?.onboarding_completed ?? false,
      setup_completed: data?.setup_completed ?? false,
      page_tours_completed: data?.page_tours_completed ?? [],
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** PATCH /api/onboarding — Atualiza flags de onboarding */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Mark setup as completed
    if (body.setup_completed === true) {
      const { error } = await supabase
        .from('usuarios')
        .update({ setup_completed: true })
        .eq('id', user.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // Mark onboarding (tour+showcase) as completed
    if (body.onboarding_completed === true) {
      const { error } = await supabase
        .from('usuarios')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // Complete a page tour (append to array)
    if (typeof body.complete_page_tour === 'string') {
      const pageId = body.complete_page_tour
      // Use raw SQL to array_append atomically
      const { error } = await supabase.rpc('complete_page_tour', {
        p_user_id: user.id,
        p_page_id: pageId,
      })
      // Fallback: if RPC doesn't exist, do a read-update
      if (error) {
        const { data: current } = await supabase
          .from('usuarios')
          .select('page_tours_completed')
          .eq('id', user.id)
          .single()
        const existing: string[] = current?.page_tours_completed ?? []
        if (!existing.includes(pageId)) {
          const { error: updateError } = await supabase
            .from('usuarios')
            .update({ page_tours_completed: [...existing, pageId] })
            .eq('id', user.id)
          if (updateError) throw updateError
        }
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Nenhum campo válido' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
