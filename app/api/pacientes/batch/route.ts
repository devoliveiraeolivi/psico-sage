import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'

const MAX_BATCH_SIZE = 100

interface BatchPaciente {
  nome: string
  email?: string
  telefone?: string
  dia_semana_preferido?: number | null
  hora_preferida?: string
}

/** POST /api/pacientes/batch — Cria múltiplos pacientes de uma vez */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pacientes } = body as { pacientes: BatchPaciente[] }

    if (!Array.isArray(pacientes) || pacientes.length === 0) {
      return NextResponse.json(
        { error: 'Lista de pacientes é obrigatória' },
        { status: 400 }
      )
    }

    if (pacientes.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Limite de ${MAX_BATCH_SIZE} pacientes por lote` },
        { status: 400 }
      )
    }

    const erros: string[] = []
    pacientes.forEach((p, i) => {
      if (!p.nome || p.nome.trim().length < 2) {
        erros.push(`Linha ${i + 1}: nome é obrigatório (mínimo 2 caracteres)`)
      }
      if (p.dia_semana_preferido == null) {
        erros.push(`Linha ${i + 1}: dia da semana é obrigatório`)
      }
      if (!p.hora_preferida) {
        erros.push(`Linha ${i + 1}: horário é obrigatório`)
      }
    })

    if (erros.length > 0) {
      return NextResponse.json({ error: erros.join('; ') }, { status: 400 })
    }

    const supabase = await createClient() as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Rate limiting
    const rl = checkRateLimit(`batch:${user.id}`, RATE_LIMITS.batchPacientes)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    const hoje = new Date().toISOString().split('T')[0]

    const rows = pacientes.map(p => ({
      user_id: user.id,
      nome: p.nome.trim(),
      email: p.email?.trim() || null,
      telefone: p.telefone?.trim() || null,
      data_inicio_terapia: hoje,
      frequencia_sessoes: p.dia_semana_preferido != null ? 'semanal' : null,
      dia_semana_preferido: p.dia_semana_preferido ?? null,
      hora_preferida: p.hora_preferida?.trim() || null,
      duracao_padrao: 50,
    }))

    const { data, error } = await supabase
      .from('pacientes')
      .insert(rows)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { criados: data?.length || 0, pacientes: data },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar pacientes em batch:', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar pacientes' },
      { status: 500 }
    )
  }
}
