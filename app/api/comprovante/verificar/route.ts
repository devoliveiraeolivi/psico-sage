import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verificarCodigo } from '@/lib/comprovante'
import { checkRateLimit } from '@/lib/utils/rate-limit'

/** GET /api/comprovante/verificar?s={sessaoId}&c={codigo} */
export async function GET(request: NextRequest) {
  // Rate limit by IP to prevent brute-force code guessing
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = checkRateLimit(`comprovante:${ip}`, { windowMs: 60_000, maxRequests: 10 })
  if (!rl.success) {
    return NextResponse.json({ valid: false, error: 'Muitas tentativas. Aguarde.' }, { status: 429 })
  }

  const sessaoId = request.nextUrl.searchParams.get('s')
  const codigo = request.nextUrl.searchParams.get('c')

  if (!sessaoId || !codigo) {
    return NextResponse.json({ valid: false, error: 'Parâmetros ausentes' }, { status: 400 })
  }

  if (!verificarCodigo(sessaoId, codigo)) {
    return NextResponse.json({ valid: false, error: 'Código inválido' }, { status: 400 })
  }

  try {
    const db = await createClient() as any

    const { data: sessao } = await db
      .from('sessoes')
      .select('id, numero_sessao, data_hora, duracao_real, status, paciente_id, pacientes(nome)')
      .eq('id', sessaoId)
      .single()

    if (!sessao || sessao.status !== 'realizada') {
      return NextResponse.json({ valid: false, error: 'Sessão não encontrada ou não realizada' }, { status: 404 })
    }

    // Buscar profissional (dono da sessão via paciente.user_id)
    const { data: paciente } = await db
      .from('pacientes')
      .select('user_id')
      .eq('id', sessao.paciente_id)
      .single()

    let profissional = { nome: null as string | null, crp: null as string | null }
    if (paciente?.user_id) {
      const { data: usuario } = await db
        .from('usuarios')
        .select('nome, crp')
        .eq('id', paciente.user_id)
        .single()
      if (usuario) profissional = usuario
    }

    return NextResponse.json({
      valid: true,
      sessao: {
        numero: sessao.numero_sessao,
        data_hora: sessao.data_hora,
        duracao: sessao.duracao_real,
        paciente: sessao.pacientes?.nome || 'Paciente',
      },
      profissional,
    })
  } catch {
    return NextResponse.json({ valid: false, error: 'Erro interno' }, { status: 500 })
  }
}
