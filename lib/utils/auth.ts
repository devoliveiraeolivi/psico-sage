import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Note: `as any` is needed because @supabase/ssr v0.5.x + supabase-js v2.47
// can't properly infer .select() return types from the Database schema.
// Upgrading to supabase-js v3+ should fix this.

/**
 * Verifica autenticação e retorna user + db client.
 * Retorna 401 se não autenticado.
 */
export async function requireAuth() {
  const db = (await createClient()) as any
  const {
    data: { user },
  } = await db.auth.getUser()

  if (!user) {
    return {
      user: null,
      db: null,
      error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    }
  }

  return { user, db, error: null }
}

/**
 * Verifica que o usuário autenticado é dono da sessão (via pacientes.user_id).
 * Retorna 403 se não for dono, 404 se sessão não existir.
 */
export async function requireSessionOwner(db: any, userId: string, sessaoId: string) {
  const { data: sessao, error } = await db
    .from('sessoes')
    .select('id, pacientes!inner(user_id)')
    .eq('id', sessaoId)
    .single()

  if (error || !sessao) {
    return { owned: false, error: NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 }) }
  }

  if (sessao.pacientes?.user_id !== userId) {
    return { owned: false, error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }

  return { owned: true, error: null }
}

/**
 * Verifica que o usuário autenticado é dono do paciente (via pacientes.user_id).
 * Retorna 403 se não for dono, 404 se paciente não existir.
 */
export async function requirePatientOwner(db: any, userId: string, pacienteId: string) {
  const { data: paciente, error } = await db
    .from('pacientes')
    .select('id, user_id')
    .eq('id', pacienteId)
    .single()

  if (error || !paciente) {
    return { owned: false, error: NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 }) }
  }

  if (paciente.user_id !== userId) {
    return { owned: false, error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }

  return { owned: true, error: null }
}
