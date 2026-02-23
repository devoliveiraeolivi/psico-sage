import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/configuracoes — Retorna configurações do usuário */
export async function GET() {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data } = await supabase
      .from('usuarios')
      .select('hora_inicio_atendimento, hora_fim_atendimento')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      hora_inicio_atendimento: data?.hora_inicio_atendimento ?? 7,
      hora_fim_atendimento: data?.hora_fim_atendimento ?? 19,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** PATCH /api/configuracoes — Atualiza configurações do usuário */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const update: Record<string, number> = {}
    if (typeof body.hora_inicio_atendimento === 'number') {
      update.hora_inicio_atendimento = Math.max(0, Math.min(23, body.hora_inicio_atendimento))
    }
    if (typeof body.hora_fim_atendimento === 'number') {
      update.hora_fim_atendimento = Math.max(1, Math.min(24, body.hora_fim_atendimento))
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { error } = await supabase
      .from('usuarios')
      .update(update)
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
