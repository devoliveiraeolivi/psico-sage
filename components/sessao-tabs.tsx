'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SessaoPreparacao, SessaoResumo, PacienteResumo } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface SessaoTabsProps {
  preparacao: SessaoPreparacao | null
  resumo: SessaoResumo | null
  integra: string | null
  jaRealizada: boolean
  sessaoId: string
  hasAudio: boolean
}

// Note: pacienteResumo and pacienteHistorico are now passed to ContextoPacienteSidebar separately

type TabId = 'preparacao' | 'resumo' | 'transcricao'

export function SessaoTabs({
  preparacao,
  resumo,
  integra,
  jaRealizada,
  sessaoId,
  hasAudio,
}: SessaoTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(jaRealizada ? 'resumo' : 'preparacao')

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
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full">
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
      <div className="p-5 flex-1">
        {activeTab === 'preparacao' && (
          <PreparacaoTab preparacao={preparacao} />
        )}
        {activeTab === 'resumo' && (
          <ResumoTab resumo={resumo} jaRealizada={jaRealizada} sessaoId={sessaoId} hasAudio={hasAudio} />
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
  const hasAlerta = pacienteResumo.alertas && pacienteResumo.alertas !== 'nenhum no momento'
  const hasHistorico = pacienteHistorico && (pacienteHistorico.marcos?.length || pacienteHistorico.insights?.length)

  const fields: { label: string; value?: string; color: string; bgColor: string; icon: React.ReactNode }[] = [
    {
      label: 'Momento',
      value: pacienteResumo.momento,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
    {
      label: 'Diagnósticos',
      value: pacienteResumo.diagnosticos,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />,
    },
    {
      label: 'Conflitos',
      value: pacienteResumo.conflitos,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />,
    },
    {
      label: 'Gatilhos',
      value: pacienteResumo.gatilhos,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />,
    },
    {
      label: 'Recursos',
      value: pacienteResumo.recursos,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />,
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Contexto do Paciente
        </h3>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {fields.map((field) => (
          <div key={field.label}>
            <div className={`flex items-center gap-2 text-xs font-semibold ${field.color} mb-1`}>
              <div className={`w-5 h-5 rounded ${field.bgColor} flex items-center justify-center`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  {field.icon}
                </svg>
              </div>
              {field.label}
            </div>
            <p className={`text-sm ${field.value ? 'text-gray-700' : 'text-gray-300 italic'}`}>
              {field.value || 'Sem dados ainda'}
            </p>
          </div>
        ))}

        {/* Histórico recente */}
        {hasHistorico ? (
          <div className="pt-3 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Destaques</div>
            <div className="space-y-2">
              {pacienteHistorico!.marcos?.slice(0, 2).map((item, i) => (
                <div key={`marco-${i}`} className="text-sm">
                  <span className="text-xs text-gray-400 block">{formatDate(item.data)}</span>
                  <span className="text-gray-700">{item.valor}</span>
                  <span className="ml-1 text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">marco</span>
                </div>
              ))}
              {pacienteHistorico!.insights?.slice(0, 2).map((item, i) => (
                <div key={`insight-${i}`} className="text-sm">
                  <span className="text-xs text-gray-400 block">{formatDate(item.data)}</span>
                  <span className="text-gray-700">{item.valor}</span>
                  <span className="ml-1 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">insight</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Alerta do paciente */}
      {hasAlerta && (
        <div className="border-t border-amber-200 bg-amber-50 rounded-b-xl px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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
      <div className="text-center py-8 text-gray-400">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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

export function SectionHeader({ title, color = 'gray' }: { title: string; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'text-gray-500',
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
    purple: 'text-purple-700',
    sky: 'text-sky-700',
  }
  return (
    <div className={`text-xs font-semibold ${colors[color] || colors.gray} uppercase tracking-wider mb-2`}>
      {title}
    </div>
  )
}

export function BulletList({ items, className = 'text-gray-700' }: { items: string[]; className?: string }) {
  if (!items.length) return null
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className={`text-sm ${className}`}>• {item}</li>
      ))}
    </ul>
  )
}

export function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
      <div className="text-xs font-medium text-gray-400 mb-0.5">{label}</div>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  )
}

export function ResumoTab({ resumo, jaRealizada, sessaoId, hasAudio }: { resumo: SessaoResumo | null; jaRealizada: boolean; sessaoId?: string; hasAudio?: boolean }) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)

  async function handleReprocess() {
    setReprocessing(true)
    setShowConfirm(false)
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/extract`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Erro ao reprocessar. Tente novamente.')
      } else {
        router.refresh()
      }
    } catch {
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setReprocessing(false)
    }
  }

  if (!resumo) {
    return (
      <div className="text-center py-8 text-gray-400">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">
          {jaRealizada ? 'Prontuário sendo processado...' : 'Sessão ainda não realizada'}
        </p>
      </div>
    )
  }

  const r = resumo
  const hasAlertas = (r.alertas?.urgentes?.length || 0) + (r.alertas?.atencao?.length || 0) + (r.alertas?.acompanhar?.length || 0) > 0
  const hasMedicacao = r.medicacao_sessao && Object.values(r.medicacao_sessao).some(v => v !== null)
  const hasPessoas = r.pessoas_mencionadas && r.pessoas_mencionadas.length > 0
  const hasQueixa = r.queixa_sintomatologia?.queixa_sessao || (r.queixa_sintomatologia?.sintomas_relatados?.length || 0) > 0
  const hasFatos = r.fatos_novos_biograficos && r.fatos_novos_biograficos.length > 0
  const pensamento = r.estado_mental_sessao?.pensamento_conteudo

  return (
    <div className="space-y-5">
      {/* Reprocessar pela IA */}
      {sessaoId && hasAudio && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={reprocessing}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {reprocessing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Reprocessando...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Reprocessar pela IA
              </>
            )}
          </button>
        </div>
      )}

      {/* Modal de confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Reprocessar pela IA?</h3>
                <p className="text-xs text-gray-500 mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              O resumo atual gerado pela IA será <strong>apagado</strong> e a transcrição será processada novamente. Se você fez edições manuais, elas serão perdidas.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReprocess}
                className="px-3.5 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Sim, reprocessar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alertas Urgentes (topo) */}
      {r.alertas?.urgentes && r.alertas.urgentes.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <SectionHeader title="Alertas Urgentes" color="red" />
          <BulletList items={r.alertas.urgentes} className="text-red-800 font-medium" />
        </div>
      )}

      {/* Resumo da Sessão */}
      {r.resumo_sessao?.sintese && (
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
          <SectionHeader title="Síntese" color="emerald" />
          <p className="text-sm text-emerald-900 leading-relaxed">{r.resumo_sessao.sintese}</p>
        </div>
      )}

      {r.resumo_sessao?.pontos_principais && r.resumo_sessao.pontos_principais.length > 0 && (
        <div>
          <SectionHeader title="Pontos Principais" />
          <BulletList items={r.resumo_sessao.pontos_principais} />
        </div>
      )}

      {/* Estado Mental */}
      {r.estado_mental_sessao && (
        <div>
          <SectionHeader title="Estado Mental" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Humor" value={r.estado_mental_sessao.humor} />
            <InfoField label="Afeto" value={r.estado_mental_sessao.afeto} />
            <InfoField label="Pensamento (curso)" value={r.estado_mental_sessao.pensamento_curso} />
            <InfoField label="Insight" value={r.estado_mental_sessao.insight} />
            <InfoField label="Juízo e Crítica" value={r.estado_mental_sessao.juizo_critica} />
            <InfoField label="Sensopercepção" value={r.estado_mental_sessao.sensopercepcao} />
          </div>
          {pensamento?.resumo && (
            <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="text-xs font-medium text-blue-600 mb-1">Conteúdo do Pensamento</div>
              <p className="text-sm text-blue-900">{pensamento.resumo}</p>
              {pensamento.evidencias && pensamento.evidencias.length > 0 && (
                <div className="mt-2 space-y-1">
                  {pensamento.evidencias.map((ev, i) => (
                    <p key={i} className="text-xs text-blue-700 italic">&ldquo;{ev.trecho}&rdquo; <span className="text-blue-500">— {ev.quem}</span></p>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2 mt-2">
            <div className={`p-2.5 rounded-lg border ${r.estado_mental_sessao.risco_suicida === 'ausente' ? 'bg-green-50 border-green-100' : r.estado_mental_sessao.risco_suicida === 'não avaliado' ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-200'}`}>
              <div className="text-xs font-medium text-gray-500 mb-0.5">Risco Suicida</div>
              <p className={`text-sm font-medium ${r.estado_mental_sessao.risco_suicida === 'ausente' ? 'text-green-700' : r.estado_mental_sessao.risco_suicida === 'não avaliado' ? 'text-gray-500' : 'text-red-700'}`}>
                {r.estado_mental_sessao.risco_suicida}
              </p>
            </div>
            <div className={`p-2.5 rounded-lg border ${r.estado_mental_sessao.risco_heteroagressivo === 'ausente' ? 'bg-green-50 border-green-100' : r.estado_mental_sessao.risco_heteroagressivo === 'não avaliado' ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-200'}`}>
              <div className="text-xs font-medium text-gray-500 mb-0.5">Risco Heteroagressivo</div>
              <p className={`text-sm font-medium ${r.estado_mental_sessao.risco_heteroagressivo === 'ausente' ? 'text-green-700' : r.estado_mental_sessao.risco_heteroagressivo === 'não avaliado' ? 'text-gray-500' : 'text-red-700'}`}>
                {r.estado_mental_sessao.risco_heteroagressivo}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Queixa e Sintomatologia */}
      {hasQueixa && (
        <div>
          <SectionHeader title="Queixa e Sintomatologia" />
          {r.queixa_sintomatologia?.queixa_sessao && (
            <p className="text-sm text-gray-700 mb-2">{r.queixa_sintomatologia.queixa_sessao}</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {r.queixa_sintomatologia?.intensidade !== null && r.queixa_sintomatologia?.intensidade !== undefined && (
              <InfoField label="Intensidade" value={`${r.queixa_sintomatologia.intensidade}/10`} />
            )}
            <InfoField label="Frequência" value={r.queixa_sintomatologia?.frequencia} />
          </div>
          {r.queixa_sintomatologia?.sintomas_relatados && r.queixa_sintomatologia.sintomas_relatados.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {r.queixa_sintomatologia.sintomas_relatados.map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-orange-50 border border-orange-200 rounded text-orange-700">{s}</span>
              ))}
            </div>
          )}
          {r.queixa_sintomatologia?.gatilhos && r.queixa_sintomatologia.gatilhos.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-400 mb-1">Gatilhos</div>
              <BulletList items={r.queixa_sintomatologia.gatilhos} />
            </div>
          )}
          {r.queixa_sintomatologia?.estrategias_que_ajudaram && r.queixa_sintomatologia.estrategias_que_ajudaram.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-400 mb-1">Estratégias que Ajudaram</div>
              <BulletList items={r.queixa_sintomatologia.estrategias_que_ajudaram} />
            </div>
          )}
          {r.queixa_sintomatologia?.evidencias && r.queixa_sintomatologia.evidencias.length > 0 && (
            <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-xs font-medium text-gray-400 mb-1">Evidências</div>
              {r.queixa_sintomatologia.evidencias.map((ev, i) => (
                <p key={i} className="text-xs text-gray-600 italic">&ldquo;{ev.trecho}&rdquo; <span className="text-gray-400">— {ev.quem} ({ev.campo})</span></p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Intervenções */}
      {r.intervencoes && (r.intervencoes.tecnicas_utilizadas?.length || r.intervencoes.temas_trabalhados?.length) && (
        <div>
          <SectionHeader title="Intervenções" color="purple" />
          {r.intervencoes.objetivos_sessao && (
            <p className="text-sm text-gray-600 italic mb-2">Objetivo: {r.intervencoes.objetivos_sessao}</p>
          )}
          {r.intervencoes.temas_trabalhados && r.intervencoes.temas_trabalhados.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {r.intervencoes.temas_trabalhados.map((t, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-purple-50 border border-purple-200 rounded text-purple-700">{t}</span>
              ))}
            </div>
          )}
          {r.intervencoes.tecnicas_utilizadas && r.intervencoes.tecnicas_utilizadas.length > 0 && (
            <BulletList items={r.intervencoes.tecnicas_utilizadas} />
          )}
          {r.intervencoes.resposta_do_paciente && (
            <p className="text-sm text-gray-500 mt-2 italic">{r.intervencoes.resposta_do_paciente}</p>
          )}
        </div>
      )}

      {/* Pessoas Mencionadas */}
      {hasPessoas && (
        <div>
          <SectionHeader title="Pessoas Mencionadas" />
          <div className="space-y-2">
            {r.pessoas_mencionadas!.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex-shrink-0 flex flex-col gap-1">
                  <span className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-500">{p.tipo}</span>
                  {p.contexto && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-blue-500">{p.contexto}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{p.nome_usado}</span>
                    {p.relevancia === 'central' && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-amber-600">central</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.nota}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plano e Metas */}
      {r.plano_metas && (
        <div>
          <SectionHeader title="Plano e Metas" color="sky" />
          {r.plano_metas.progresso_relatado && r.plano_metas.progresso_relatado.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-400 mb-1.5">Progresso de Tarefas Anteriores</div>
              <div className="space-y-1.5">
                {r.plano_metas.progresso_relatado.map((p, i) => {
                  const statusColors: Record<string, string> = {
                    concluida: 'bg-green-100 text-green-700',
                    em_andamento: 'bg-blue-100 text-blue-700',
                    parcial: 'bg-amber-100 text-amber-700',
                    nao_realizada: 'bg-red-100 text-red-700',
                  }
                  const statusLabels: Record<string, string> = {
                    concluida: 'Concluída',
                    em_andamento: 'Em andamento',
                    parcial: 'Parcial',
                    nao_realizada: 'Não realizada',
                  }
                  return (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[p.status] || p.status}
                      </span>
                      <div>
                        <span className="text-gray-800">{p.meta}</span>
                        {p.observacao && <p className="text-xs text-gray-500">{p.observacao}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {r.plano_metas.tarefas_novas && r.plano_metas.tarefas_novas.length > 0 && (
            <div className="bg-sky-50 rounded-lg p-4 border border-sky-100">
              <div className="text-xs font-semibold text-sky-700 uppercase tracking-wider mb-2">Tarefas para Próxima Sessão</div>
              <BulletList items={r.plano_metas.tarefas_novas} className="text-sky-800" />
            </div>
          )}
          {r.plano_metas.metas_acordadas && (
            <div className="mt-2">
              <InfoField label="Metas Acordadas" value={r.plano_metas.metas_acordadas} />
            </div>
          )}
          {r.plano_metas.foco_proxima_sessao && (
            <div className="mt-2">
              <InfoField label="Foco Próxima Sessão" value={r.plano_metas.foco_proxima_sessao} />
            </div>
          )}
        </div>
      )}

      {/* Medicação */}
      {hasMedicacao && (
        <div>
          <SectionHeader title="Medicação" />
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoField label="Medicações" value={r.medicacao_sessao?.medicacoes_mencionadas} />
            <InfoField label="Adesão" value={r.medicacao_sessao?.adesao} />
            <InfoField label="Efeitos Relatados" value={r.medicacao_sessao?.efeitos_relatados} />
            <InfoField label="Mudanças" value={r.medicacao_sessao?.mudancas} />
            <InfoField label="Encaminhamentos" value={r.medicacao_sessao?.encaminhamentos} />
          </div>
        </div>
      )}

      {/* Fatos Novos Biográficos */}
      {hasFatos && (
        <div>
          <SectionHeader title="Fatos Biográficos (desta sessão)" />
          <BulletList items={r.fatos_novos_biograficos} />
        </div>
      )}

      {/* Mudanças Observadas */}
      {r.resumo_sessao?.mudancas_observadas && r.resumo_sessao.mudancas_observadas.length > 0 && (
        <div>
          <SectionHeader title="Mudanças Observadas" color="emerald" />
          <BulletList items={r.resumo_sessao.mudancas_observadas} className="text-emerald-800" />
        </div>
      )}

      {/* Evolução CRP */}
      {r.evolucao_crp && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <SectionHeader title="Evolução (Prontuário CFP)" />
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{r.evolucao_crp}</p>
        </div>
      )}

      {/* Alertas (atenção + acompanhar) */}
      {hasAlertas && (
        <div className="space-y-3">
          {r.alertas?.atencao && r.alertas.atencao.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <SectionHeader title="Atenção" color="amber" />
              <BulletList items={r.alertas.atencao} className="text-amber-800" />
            </div>
          )}
          {r.alertas?.acompanhar && r.alertas.acompanhar.length > 0 && (
            <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
              <SectionHeader title="Acompanhar" color="blue" />
              <BulletList items={r.alertas.acompanhar} className="text-blue-800" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TranscricaoTab({ integra }: { integra: string | null }) {
  if (!integra) {
    return (
      <div className="text-center py-8 text-gray-400">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
