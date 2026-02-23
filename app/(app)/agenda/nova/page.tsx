import { NovaSessionForm } from '@/components/nova-session-form'
import type { CalendarSession } from '@/components/unified-calendar'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function NovaAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string }>
}) {
  const params = await searchParams
  const defaultPacienteId = params.paciente || null

  const supabase = await createClient()
  const db = supabase as any

  const { data: p } = await db
    .from('pacientes')
    .select('id, nome, frequencia_sessoes, dia_semana_preferido, hora_preferida, duracao_padrao')
    .eq('status', 'ativo')
    .order('nome')

  const pacientes = p || []

  // Buscar sessões da semana para o calendário
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const { data: s } = await db
    .from('sessoes')
    .select('id, data_hora, duracao_prevista, status, pacientes(nome)')
    .gte('data_hora', weekStart.toISOString())
    .lt('data_hora', weekEnd.toISOString())
    .not('status', 'eq', 'cancelada')
    .order('data_hora')

  let weekSessions: CalendarSession[] = []
  if (s) {
    weekSessions = s.map((sess: any) => ({
      id: sess.id,
      data_hora: sess.data_hora,
      duracao_prevista: sess.duracao_prevista || 50,
      paciente_nome: sess.pacientes?.nome || 'Paciente',
      status: sess.status,
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova Sessão</h1>
          <p className="text-muted-foreground mt-1">Agende uma nova sessão de terapia</p>
        </div>
        <Link
          href="/sessoes"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar
        </Link>
      </div>

      <NovaSessionForm
        pacientes={pacientes}
        defaultPacienteId={defaultPacienteId}
        weekSessions={weekSessions}
      />
    </div>
  )
}
