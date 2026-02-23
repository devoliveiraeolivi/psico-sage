import { UnifiedCalendar } from '@/components/unified-calendar'
import type { CalendarSession } from '@/components/unified-calendar'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AgendaPage() {
  const db = (await createClient()) as any

  const now = new Date()
  const rangeStart = new Date(now)
  rangeStart.setDate(now.getDate() - 14)
  const rangeEnd = new Date(now)
  rangeEnd.setDate(now.getDate() + 14)

  const { data: s } = await db
    .from('sessoes')
    .select('id, data_hora, duracao_prevista, status, pacientes(nome)')
    .gte('data_hora', rangeStart.toISOString())
    .lt('data_hora', rangeEnd.toISOString())
    .order('data_hora')

  let sessions: CalendarSession[] = []
  if (s) {
    sessions = s.map((sess: any) => ({
      id: sess.id,
      data_hora: sess.data_hora,
      duracao_prevista: sess.duracao_prevista || 50,
      paciente_nome: sess.pacientes?.nome || 'Paciente',
      status: sess.status,
    }))
  }

  // Fetch working hours
  let hourStart = 7
  let hourEnd = 19
  try {
    const { data: { user } } = await db.auth.getUser()
    if (user) {
      const { data: config } = await db
        .from('usuarios')
        .select('hora_inicio_atendimento, hora_fim_atendimento')
        .eq('id', user.id)
        .single()
      if (config) {
        hourStart = config.hora_inicio_atendimento ?? 7
        hourEnd = config.hora_fim_atendimento ?? 19
      }
    }
  } catch {
    // Use defaults
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 overflow-hidden">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-muted-foreground mt-1">Visualize suas sessões no calendário</p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <UnifiedCalendar
          sessions={sessions}
          views={['semana', 'mes']}
          sessionHref="/sessoes"
          hourStart={hourStart}
          hourEnd={hourEnd}
          fillHeight
          headerAction={
            <Link
              href="/agenda/nova"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nova Sessão
            </Link>
          }
        />
      </div>
    </div>
  )
}
