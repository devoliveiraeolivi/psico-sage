import { formatTime, formatDate } from '@/lib/utils'
import { mockSessoesHoje, mockPacientes, mockSessoes } from '@/lib/mocks'
import Link from 'next/link'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

export default async function DashboardPage() {
  let sessoesHoje = mockSessoesHoje
  let totalPacientes = mockPacientes.filter(p => p.status === 'ativo').length
  let proximaSessao = sessoesHoje[0]
  let sessoesPendentes = mockSessoes.filter(s => s.status === 'aguardando_aprovacao')
  let pacientes = mockPacientes

  if (!useMocks) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data } = await supabase
      .from('sessoes_hoje')
      .select('*')
      .order('data_hora', { ascending: true })

    const { count } = await supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')

    const { data: pending } = await supabase
      .from('sessoes')
      .select('*')
      .eq('status', 'aguardando_aprovacao')
      .order('data_hora', { ascending: false })
      .limit(5)

    const { data: p } = await supabase
      .from('pacientes')
      .select('id, nome')

    sessoesHoje = data || []
    totalPacientes = count || 0
    proximaSessao = sessoesHoje[0]
    sessoesPendentes = pending || []
    pacientes = p || []
  }

  const pacienteMap = new Map(pacientes.map(p => [p.id, p]))

  const hoje = new Date()
  const saudacao = hoje.getHours() < 12 ? 'Bom dia' : hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite'

  // Sessões com alertas
  const sessoesComAlertas = sessoesHoje?.filter(s => s.preparacao?.alertas && s.preparacao.alertas.length > 0) || []

  return (
    <div className="space-y-8">
      {/* Header com saudação */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{saudacao}</h1>
        <p className="text-muted-foreground mt-1">
          {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Métricas rápidas */}
      <div className="grid gap-4 sm:grid-cols-3">
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alertas do Dia */}
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

          {/* Sessões de Hoje */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Sessões de Hoje</h2>
              {sessoesHoje && sessoesHoje.length > 3 && (
                <Link href="/agenda" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Ver todas →
                </Link>
              )}
            </div>

            {sessoesHoje && sessoesHoje.length > 0 ? (
              <div className="space-y-3">
                {sessoesHoje.slice(0, 3).map((sessao, index) => {
                  const isProxima = index === 0
                  const resumo = sessao.paciente_resumo || {}
                  const preparacao = sessao.preparacao

                  return (
                    <Link
                      key={sessao.id}
                      href={`/sessoes/${sessao.id}`}
                      className={`block bg-white rounded-xl border ${isProxima ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-200'} p-5 hover:shadow-md transition-all`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-700">
                            {sessao.paciente_nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium text-gray-900">{sessao.paciente_nome}</span>
                            <span className="text-sm text-gray-500">{formatTime(sessao.data_hora)}</span>
                            {isProxima && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                Próxima
                              </span>
                            )}
                          </div>

                          {resumo.momento && (
                            <p className="text-sm text-gray-500 mb-2">{resumo.momento}</p>
                          )}

                          {preparacao?.pontos_retomar && preparacao.pontos_retomar.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {preparacao.pontos_retomar.slice(0, 2).map((ponto, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                  {ponto.length > 40 ? ponto.slice(0, 40) + '...' : ponto}
                                </span>
                              ))}
                              {preparacao.pontos_retomar.length > 2 && (
                                <span className="text-xs text-gray-400">
                                  +{preparacao.pontos_retomar.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <p className="text-gray-500">Nenhuma sessão agendada para hoje</p>
                <Link
                  href="/agenda/nova"
                  className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
                >
                  Agendar sessão
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-5">
          {/* Validações Pendentes */}
          {sessoesPendentes.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <h2 className="text-sm font-semibold text-amber-800">Validar Resumos</h2>
                </div>
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                  {sessoesPendentes.length}
                </span>
              </div>
              <div className="space-y-2">
                {sessoesPendentes.slice(0, 3).map((sessao) => {
                  const paciente = pacienteMap.get(sessao.paciente_id)
                  return (
                    <Link
                      key={sessao.id}
                      href={`/sessoes/${sessao.id}`}
                      className="block p-3 rounded-lg bg-white border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{paciente?.nome || 'Paciente'}</span>
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-500">
                        {'numero_sessao' in sessao && sessao.numero_sessao && `Sessão ${sessao.numero_sessao} · `}
                        {formatDate(sessao.data_hora)}
                      </p>
                    </Link>
                  )
                })}
              </div>
              {sessoesPendentes.length > 3 && (
                <Link
                  href="/sessoes"
                  className="block mt-3 text-center text-xs font-medium text-amber-700 hover:text-amber-800"
                >
                  Ver todas ({sessoesPendentes.length}) →
                </Link>
              )}
            </div>
          )}

          {/* Ações rápidas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
            <div className="space-y-2">
              <Link
                href="/pacientes/novo"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Novo Paciente</span>
              </Link>

              <Link
                href="/agenda/nova"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Agendar Sessão</span>
              </Link>

              <Link
                href="/pacientes"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Ver Pacientes</span>
              </Link>
            </div>
          </div>

          {/* Resumo da semana */}
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
        </div>
      </div>
    </div>
  )
}
