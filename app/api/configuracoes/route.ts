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
      .select('hora_inicio_atendimento, hora_fim_atendimento, video_plataforma, video_modo_link, video_link_fixo, video_plataforma_nome, atendimento_hibrido')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      hora_inicio_atendimento: data?.hora_inicio_atendimento ?? 7,
      hora_fim_atendimento: data?.hora_fim_atendimento ?? 19,
      video_plataforma: data?.video_plataforma ?? 'nenhum',
      video_modo_link: data?.video_modo_link ?? 'por_paciente',
      video_link_fixo: data?.video_link_fixo ?? null,
      video_plataforma_nome: data?.video_plataforma_nome ?? null,
      atendimento_hibrido: data?.atendimento_hibrido ?? false,
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

    const update: Record<string, number | string | boolean | null> = {}
    if (typeof body.hora_inicio_atendimento === 'number') {
      update.hora_inicio_atendimento = Math.max(0, Math.min(23, body.hora_inicio_atendimento))
    }
    if (typeof body.hora_fim_atendimento === 'number') {
      update.hora_fim_atendimento = Math.max(1, Math.min(24, body.hora_fim_atendimento))
    }

    // Video call settings
    const validPlataformas = ['nenhum', 'google_meet', 'externo']
    const validModoLink = ['por_paciente', 'link_fixo']

    if (typeof body.video_plataforma === 'string' && validPlataformas.includes(body.video_plataforma)) {
      update.video_plataforma = body.video_plataforma
    }
    if (typeof body.video_modo_link === 'string' && validModoLink.includes(body.video_modo_link)) {
      update.video_modo_link = body.video_modo_link
    }
    if (body.video_link_fixo !== undefined) {
      update.video_link_fixo = typeof body.video_link_fixo === 'string' ? body.video_link_fixo.trim() || null : null
    }
    if (body.video_plataforma_nome !== undefined) {
      update.video_plataforma_nome = typeof body.video_plataforma_nome === 'string'
        ? body.video_plataforma_nome.trim().slice(0, 50) || null
        : null
    }
    if (typeof body.atendimento_hibrido === 'boolean') {
      update.atendimento_hibrido = body.atendimento_hibrido
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
