import { formatTime, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { UnifiedCalendar, CalendarLegend } from '@/components/unified-calendar'
import type { CalendarSession } from '@/components/unified-calendar'
import { ValidarResumosSidebar } from '@/components/validar-resumos-sidebar'
import { createClient } from '@/lib/supabase/server'
import type { SessaoHoje, Sessao } from '@/lib/types'
import { decryptJsonField } from '@/lib/supabase/encrypt'
import { DashboardTourWrapper } from '@/components/dashboard-tour-wrapper'

export default async function DashboardPage() {
  const supabase = await createClient()
  const db = supabase as any

  const { data: sessoesHojeData } = await db
    .from('sessoes_hoje')
    .select('*')
    .order('data_hora', { ascending: true }) as { data: SessaoHoje[] | null }

  const { count: totalPacientes } = await db
    .from('pacientes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ativo')

  const { data: sessoesPendentesData } = await db
    .from('sessoes')
    .select('id, numero_sessao, data_hora, paciente_id, resumo')
    .eq('status', 'aguardando_aprovacao')
    .order('data_hora', { ascending: false })
    .limit(5) as { data: Sessao[] | null }

  const { data: pacientesData } = await db
    .from('pacientes')
    .select('id, nome') as { data: { id: string; nome: string }[] | null }

  const sessoesHoje = (sessoesHojeData || []).map(s => {
    if ((s as any).paciente_resumo) (s as any).paciente_resumo = decryptJsonField((s as any).paciente_resumo)
    return s
  })
  const sessoesPendentes = (sessoesPendentesData || []).map(s => {
    if (s.resumo) (s as any).resumo = decryptJsonField(s.resumo)
    return s
  })
  const pacientes = pacientesData || []
  const agora = new Date().toISOString()
  const proximaSessao = sessoesHoje.find(s => s.status === 'agendada' && s.data_hora >= agora) || null
  const pacienteMap = new Map(pacientes.map(p => [p.id, p]))

  const pendentesData = sessoesPendentes.map(s => ({
    id: s.id,
    resumo: s.resumo,
    pacienteNome: pacienteMap.get(s.paciente_id)?.nome || 'Paciente',
    numeroSessao: s.numero_sessao,
    dataHora: s.data_hora,
  }))

  // Build calendar sessions
  const now = new Date()
  const rangeStart = new Date(now)
  rangeStart.setDate(now.getDate() - 7)
  const rangeEnd = new Date(now)
  rangeEnd.setDate(now.getDate() + 7)

  const { data: cs } = await db
    .from('sessoes')
    .select('id, data_hora, duracao_prevista, status, pacientes(nome)')
    .gte('data_hora', rangeStart.toISOString())
    .lt('data_hora', rangeEnd.toISOString())
    .order('data_hora')

  let calendarSessions: CalendarSession[] = []
  if (cs) {
    calendarSessions = cs.map((sess: any) => ({
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
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: config } = await (supabase as any)
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
    // Use defaults if fetch fails
  }

  const hoje = new Date()
  const saudacao = hoje.getHours() < 12 ? 'Bom dia' : hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite'

  const sessoesComAlertas = sessoesHoje?.filter(s => s.preparacao?.alertas && s.preparacao.alertas.length > 0) || []

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-8 overflow-hidden">
      <DashboardTourWrapper />

      {/* Header com saudação */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{saudacao}</h1>
        <p className="text-muted-foreground mt-1">
          {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Métricas rápidas */}
      <div id="dashboard-metrics" className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sessões hoje</p>
              <p className="text-3xl font-semibold mt-1">{sessoesHoje?.length || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pacientes ativos</p>
              <p className="text-3xl font-semibold mt-1">{totalPacientes || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Próxima sessão</p>
              <p className="text-lg font-semibold mt-1">
                {proximaSessao ? formatTime(proximaSessao.data_hora) : '—'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 flex-1 min-h-0 grid-rows-[1fr]">
        {/* Coluna principal */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0 overflow-hidden">
          {sessoesComAlertas.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <h2 className="text-sm font-semibold text-gray-900">Alertas do Dia</h2>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                    {sessoesComAlertas.length}
                  </span>
                </div>
                {sessoesComAlertas.length > 3 && (
                  <Link href="/agenda" className="text-sm text-amber-600 hover:text-amber-700 transition-colors">
                    Ver todos →
                  </Link>
                )}
              </div>

              <div className="space-y-3">
                {sessoesComAlertas.slice(0, 3).map((sessao) => (
                  <Link
                    key={sessao.id}
                    href={`/sessoes/${sessao.id}`}
                    className="block bg-amber-50 rounded-xl border border-amber-200 p-4 hover:shadow-md hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium text-gray-900">{sessao.paciente_nome}</span>
                          <span className="text-sm text-gray-500">{formatTime(sessao.data_hora)}</span>
                        </div>
                        {sessao.preparacao?.alertas?.map((alerta, i) => (
                          <p key={i} className="text-sm text-amber-800">{alerta}</p>
                        ))}
                      </div>
                      <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div id="dashboard-calendar" className="flex-1 min-h-0 flex flex-col">
            <UnifiedCalendar
              sessions={calendarSessions}
              views={['dia', 'semana']}
              defaultView="dia"
              compact
              sessionHref="/sessoes"
              hourStart={hourStart}
              hourEnd={hourEnd}
              fillHeight
            />
            <CalendarLegend />
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-3 overflow-y-auto min-h-0">
          <div id="dashboard-validacoes">
            <ValidarResumosSidebar sessoes={pendentesData} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Esta Semana</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Sessões agendadas</span>
                <span className="font-medium">{sessoesHoje?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Sessões realizadas</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Faltas</span>
                <span className="font-medium">0</span>
              </div>
            </div>
          </div>

          <div id="dashboard-quick-actions" className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
            <div className="space-y-1">
              <Link href="/pacientes/novo" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Novo Paciente</span>
              </Link>
              <Link href="/agenda/nova" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Agendar Sessão</span>
              </Link>
              <Link href="/pacientes" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Ver Pacientes</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
