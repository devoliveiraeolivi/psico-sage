import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** POST /api/pacientes — Cria um novo paciente */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, email, telefone, data_nascimento, data_inicio_terapia, notas } = body

    if (!nome || nome.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nome é obrigatório (mínimo 2 caracteres)' },
        { status: 400 }
      )
    }

    const supabase = await createClient() as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('pacientes')
      .insert({
        user_id: user.id,
        nome: nome.trim(),
        email: email || null,
        telefone: telefone || null,
        data_nascimento: data_nascimento || null,
        data_inicio_terapia: data_inicio_terapia || new Date().toISOString().split('T')[0],
        notas: notas || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar paciente:', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar paciente' },
      { status: 500 }
    )
  }
}
