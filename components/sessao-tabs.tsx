'use client'

import { useState } from 'react'
import type { SessaoPreparacao, SessaoResumo, PacienteResumo } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface SessaoTabsProps {
  preparacao: SessaoPreparacao | null
  resumo: SessaoResumo | null
  integra: string | null
  jaRealizada: boolean
}

// Note: pacienteResumo and pacienteHistorico are now passed to ContextoPacienteSidebar separately

type TabId = 'preparacao' | 'resumo' | 'transcricao'

export function SessaoTabs({
  preparacao,
  resumo,
  integra,
  jaRealizada,
}: SessaoTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('preparacao')

  const tabs: { id: TabId; label: string; icon: React.ReactNode; available: boolean }[] = [
    {
      id: 'preparacao',
      label: 'Preparação',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
      available: true,
    },
    {
      id: 'resumo',
      label: 'Resumo',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      ),
      available: jaRealizada,
    },
    {
      id: 'transcricao',
      label: 'Transcrição',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      available: !!integra,
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Tab Navigation */}
      <div className="border-b border-gray-100">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => tab.available && setActiveTab(tab.id)}
              disabled={!tab.available}
              className={`
                flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : tab.available
                    ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    : 'border-transparent text-gray-300 cursor-not-allowed'
                }
              `}
            >
              {tab.icon}
              {tab.label}
              {!tab.available && tab.id === 'resumo' && (
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">
                  Após sessão
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeTab === 'preparacao' && (
          <PreparacaoTab preparacao={preparacao} />
        )}
        {activeTab === 'resumo' && (
          <ResumoTab resumo={resumo} jaRealizada={jaRealizada} />
        )}
        {activeTab === 'transcricao' && (
          <TranscricaoTab integra={integra} />
        )}
      </div>
    </div>
  )
}

// Sidebar de contexto do paciente - componente separado
export function ContextoPacienteSidebar({
  pacienteResumo,
  pacienteHistorico
}: {
  pacienteResumo: PacienteResumo
  pacienteHistorico?: {
    marcos?: Array<{ data: string; valor: string }>
    insights?: Array<{ data: string; valor: string }>
  }
}) {
  return (
    <div className="space-y-4">
      {/* Momento Atual */}
      {pacienteResumo.momento && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-2">
            <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Momento
          </div>
          <p className="text-sm text-gray-700">{pacienteResumo.momento}</p>
        </div>
      )}

      {/* Diagnósticos */}
      {pacienteResumo.diagnosticos && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 mb-2">
            <div className="w-5 h-5 rounded bg-violet-50 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            Diagnósticos
          </div>
          <p className="text-sm text-gray-700">{pacienteResumo.diagnosticos}</p>
        </div>
      )}

      {/* Conflitos */}
      {pacienteResumo.conflitos && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 mb-2">
            <div className="w-5 h-5 rounded bg-orange-50 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            Conflitos
          </div>
          <p className="text-sm text-gray-700">{pacienteResumo.conflitos}</p>
        </div>
      )}

      {/* Gatilhos */}
      {pacienteResumo.gatilhos && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-600 mb-2">
            <div className="w-5 h-5 rounded bg-red-50 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            Gatilhos
          </div>
          <p className="text-sm text-gray-700">{pacienteResumo.gatilhos}</p>
        </div>
      )}

      {/* Recursos */}
      {pacienteResumo.recursos && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-2">
            <div className="w-5 h-5 rounded bg-emerald-50 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            Recursos
          </div>
          <p className="text-sm text-gray-700">{pacienteResumo.recursos}</p>
        </div>
      )}

      {/* Histórico recente */}
      {pacienteHistorico && (pacienteHistorico.marcos?.length || pacienteHistorico.insights?.length) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Destaques</div>
          <div className="space-y-2">
            {pacienteHistorico.marcos?.slice(0, 2).map((item, i) => (
              <div key={`marco-${i}`} className="text-sm">
                <span className="text-xs text-gray-400 block">{formatDate(item.data)}</span>
                <span className="text-gray-700">{item.valor}</span>
                <span className="ml-1 text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">marco</span>
              </div>
            ))}
            {pacienteHistorico.insights?.slice(0, 2).map((item, i) => (
              <div key={`insight-${i}`} className="text-sm">
                <span className="text-xs text-gray-400 block">{formatDate(item.data)}</span>
                <span className="text-gray-700">{item.valor}</span>
                <span className="ml-1 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">insight</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta do paciente */}
      {pacienteResumo.alertas && pacienteResumo.alertas !== 'nenhum no momento' && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            Alerta
          </div>
          <p className="text-sm text-amber-800">{pacienteResumo.alertas}</p>
        </div>
      )}
    </div>
  )
}

function PreparacaoTab({ preparacao }: { preparacao: SessaoPreparacao | null }) {
  if (!preparacao) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">Preparação será gerada automaticamente antes da sessão</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Contexto */}
      {preparacao.contexto && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contexto</div>
          <p className="text-sm text-gray-700 leading-relaxed">{preparacao.contexto}</p>
        </div>
      )}

      {/* Pontos a Retomar - Checklist */}
      {preparacao.pontos_retomar && preparacao.pontos_retomar.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pontos para Hoje</span>
            <span className="text-xs text-gray-400">{preparacao.pontos_retomar.length} itens</span>
          </div>
          <div className="space-y-2">
            {preparacao.pontos_retomar.map((ponto, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
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
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tarefas Pendentes</div>
          <div className="space-y-2">
            {preparacao.tarefas_pendentes.map((tarefa, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
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
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sugestões</div>
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
  )
}

function ResumoTab({ resumo, jaRealizada }: { resumo: SessaoResumo | null; jaRealizada: boolean }) {
  if (!resumo) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">
          {jaRealizada ? 'Resumo sendo processado...' : 'Sessão ainda não realizada'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Síntese */}
      {resumo.sintese && (
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Síntese</div>
          <p className="text-sm text-emerald-900 leading-relaxed">{resumo.sintese}</p>
        </div>
      )}

      {/* Humor e Temas em grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {resumo.humor && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 mb-1">Humor</div>
            <p className="text-sm text-gray-700">{resumo.humor}</p>
          </div>
        )}

        {resumo.temas && resumo.temas.length > 0 && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 mb-2">Temas Abordados</div>
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
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Insights</div>
          <div className="space-y-2">
            {resumo.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </div>
                <span className="text-gray-700">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pontos Importantes */}
      {resumo.pontos_importantes && resumo.pontos_importantes.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pontos Importantes</div>
          <ul className="space-y-2">
            {resumo.pontos_importantes.map((ponto, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <div className="w-5 h-5 rounded bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {ponto}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tarefas para próxima sessão */}
      {resumo.tarefas && resumo.tarefas.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Tarefas para Próxima Sessão</div>
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
  )
}

function TranscricaoTab({ integra }: { integra: string | null }) {
  if (!integra) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm">Transcrição não disponível</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transcrição Completa</span>
        <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
          </svg>
          Copiar
        </button>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
          {integra}
        </pre>
      </div>
    </div>
  )
}
