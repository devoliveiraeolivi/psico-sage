import { mockSessoes, mockSessoesHoje, mockPacientes } from '@/lib/mocks'
import { formatDateTime, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

const statusConfig: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  realizada: { label: 'Realizada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  falta: { label: 'Falta', color: 'bg-red-50 text-red-700 border-red-200' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  remarcada: { label: 'Remarcada', color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export default async function SessaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Busca em todos os mocks
  let sessao = mockSessoes.find(s => s.id === id) ||
               mockSessoesHoje.find(s => s.id === id) as typeof mockSessoes[0] | undefined

  let paciente = sessao ? mockPacientes.find(p => p.id === sessao!.paciente_id) : null

  if (!useMocks) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: s } = await supabase
      .from('sessoes')
      .select('*, pacientes(*)')
      .eq('id', id)
      .single()

    if (s) {
      sessao = s
      paciente = s.pacientes
    }
  }

  if (!sessao) {
    notFound()
  }

  const preparacao = sessao.preparacao
  const resumo = sessao.resumo
  const pacienteResumo = paciente?.resumo || {}
  const jaRealizada = sessao.status === 'realizada' || sessao.status === 'aguardando_aprovacao'
  const statusInfo = statusConfig[sessao.status] || statusConfig.agendada

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
            <span className="text-base font-semibold text-blue-700">
              {paciente?.nome.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">
                {'numero_sessao' in sessao && sessao.numero_sessao
                  ? `Sessão ${sessao.numero_sessao}`
                  : 'Sessão'
                } — {paciente?.nome || 'Paciente'}
              </h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-3">
              <span>{formatDateTime(sessao.data_hora)}</span>
              {'duracao_real' in sessao && sessao.duracao_real && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{sessao.duracao_real} minutos</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {paciente && (
            <Link
              href={`/pacientes/${paciente.id}`}
              className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Ver Ficha
            </Link>
          )}
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal - Preparação e Resumo */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card de Preparação */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h2 className="text-sm font-semibold text-gray-900">Preparação Pré-sessão</h2>
              <span className="text-xs text-gray-400 ml-auto">Gerado pela IA</span>
            </div>

            {preparacao ? (
              <div className="space-y-5">
                {/* Contexto */}
                {preparacao.contexto && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Contexto</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{preparacao.contexto}</p>
                  </div>
                )}

                {/* Pontos a Retomar - Checklist */}
                {preparacao.pontos_retomar && preparacao.pontos_retomar.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pontos para Hoje</span>
                      <span className="text-xs text-gray-400">{preparacao.pontos_retomar.length} itens</span>
                    </div>
                    <div className="space-y-2">
                      {preparacao.pontos_retomar.map((ponto, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5"></div>
                          <span className="text-sm text-gray-700">{ponto}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tarefas Pendentes */}
                {preparacao.tarefas_pendentes && preparacao.tarefas_pendentes.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Tarefas Pendentes</div>
                    <div className="space-y-2">
                      {preparacao.tarefas_pendentes.map((tarefa, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-700">{tarefa}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sugestão IA - Card especial */}
                {preparacao.perguntas_sugeridas && preparacao.perguntas_sugeridas.length > 0 && (
                  <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border border-sky-200 p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 uppercase tracking-wider mb-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                      </svg>
                      Sugestões de Abertura
                    </div>
                    <div className="space-y-3">
                      {preparacao.perguntas_sugeridas.map((pergunta, i) => (
                        <p key={i} className="text-sm text-sky-800 italic leading-relaxed">
                          &ldquo;{pergunta}&rdquo;
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outras sugestões */}
                {preparacao.sugestoes && preparacao.sugestoes.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Sugestões</div>
                    <ul className="space-y-2">
                      {preparacao.sugestoes.map((sugestao, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                          {sugestao}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alertas */}
                {preparacao.alertas && preparacao.alertas.length > 0 && (
                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      Atenção
                    </div>
                    {preparacao.alertas.map((alerta, i) => (
                      <p key={i} className="text-sm text-amber-800">{alerta}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm">Preparação ainda não gerada</p>
              </div>
            )}
          </div>

          {/* Card de Resumo Pós-sessão */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className={`w-2 h-2 rounded-full ${jaRealizada ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
              <h2 className="text-sm font-semibold text-gray-900">Resumo Pós-sessão</h2>
              {jaRealizada && <span className="text-xs text-gray-400 ml-auto">Gerado pela IA</span>}
            </div>

            {resumo ? (
              <div className="space-y-5">
                {/* Síntese */}
                {resumo.sintese && (
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                    <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-2">Síntese</div>
                    <p className="text-sm text-emerald-900 leading-relaxed">{resumo.sintese}</p>
                  </div>
                )}

                {/* Humor e Temas em grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {resumo.humor && (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="text-xs font-medium text-gray-500 mb-1">Humor</div>
                      <p className="text-sm text-gray-700">{resumo.humor}</p>
                    </div>
                  )}

                  {resumo.temas && resumo.temas.length > 0 && (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="text-xs font-medium text-gray-500 mb-2">Temas Abordados</div>
                      <div className="flex flex-wrap gap-1.5">
                        {resumo.temas.map((tema, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded text-gray-600">
                            {tema}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Insights */}
                {resumo.insights && resumo.insights.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Insights</div>
                    <div className="space-y-2">
                      {resumo.insights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                          </svg>
                          <span className="text-gray-700">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pontos Importantes */}
                {resumo.pontos_importantes && resumo.pontos_importantes.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Pontos Importantes</div>
                    <ul className="space-y-2">
                      {resumo.pontos_importantes.map((ponto, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {ponto}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tarefas para próxima sessão */}
                {resumo.tarefas && resumo.tarefas.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="text-xs font-medium text-blue-700 uppercase tracking-wider mb-2">Tarefas para Próxima Sessão</div>
                    <ul className="space-y-1">
                      {resumo.tarefas.map((tarefa, i) => (
                        <li key={i} className="text-sm text-blue-800">• {tarefa}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alertas */}
                {resumo.alertas && resumo.alertas.length > 0 && (
                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      Alertas
                    </div>
                    {resumo.alertas.map((alerta, i) => (
                      <p key={i} className="text-sm text-amber-800">{alerta}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">
                  {jaRealizada ? 'Resumo sendo processado...' : 'Sessão ainda não realizada'}
                </p>
              </div>
            )}
          </div>

          {/* Transcrição */}
          {'integra' in sessao && sessao.integra && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Transcrição Completa</h2>
                <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Expandir
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                  {sessao.integra}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Coluna lateral - Contexto do Paciente */}
        <div className="space-y-5">
          {/* Momento Atual */}
          {pacienteResumo.momento && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Momento Atual</div>
              <p className="text-sm text-gray-700 leading-relaxed">{pacienteResumo.momento}</p>
            </div>
          )}

          {/* Estado Resumido */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Contexto do Paciente</div>
            <div className="space-y-4">
              {pacienteResumo.diagnosticos && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Diagnósticos</div>
                  <p className="text-sm text-gray-700">{pacienteResumo.diagnosticos}</p>
                </div>
              )}
              {pacienteResumo.conflitos && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Conflitos</div>
                  <p className="text-sm text-gray-700">{pacienteResumo.conflitos}</p>
                </div>
              )}
              {pacienteResumo.gatilhos && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Gatilhos</div>
                  <p className="text-sm text-gray-700">{pacienteResumo.gatilhos}</p>
                </div>
              )}
              {pacienteResumo.recursos && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Recursos</div>
                  <p className="text-sm text-gray-700">{pacienteResumo.recursos}</p>
                </div>
              )}
            </div>
          </div>

          {/* Temas em foco */}
          {(pacienteResumo.conflitos || pacienteResumo.traumas || pacienteResumo.padroes) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Temas em Foco</div>
              <div className="flex flex-wrap gap-2">
                {pacienteResumo.conflitos && <span className="text-xs px-2.5 py-1 bg-gray-100 rounded text-gray-600">Conflitos</span>}
                {pacienteResumo.traumas && <span className="text-xs px-2.5 py-1 bg-gray-100 rounded text-gray-600">Traumas</span>}
                {pacienteResumo.padroes && <span className="text-xs px-2.5 py-1 bg-gray-100 rounded text-gray-600">Padrões</span>}
              </div>
            </div>
          )}

          {/* Histórico recente */}
          {paciente?.historico && Object.keys(paciente.historico).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Últimas Sessões</div>
              <div className="space-y-3">
                {paciente.historico.marcos?.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xs text-gray-400 w-12 flex-shrink-0 pt-0.5">{formatDate(item.data)}</span>
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">{item.valor}</span>
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">marco</span>
                    </div>
                  </div>
                ))}
                {paciente.historico.insights?.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xs text-gray-400 w-12 flex-shrink-0 pt-0.5">{formatDate(item.data)}</span>
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">{item.valor}</span>
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">insight</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerta do paciente */}
          {pacienteResumo.alertas && pacienteResumo.alertas !== 'nenhum no momento' && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Alerta
              </div>
              <p className="text-sm text-amber-800">{pacienteResumo.alertas}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
