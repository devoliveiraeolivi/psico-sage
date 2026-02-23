'use client'

import { useState } from 'react'
import type { PacienteResumo, PacienteHistorico, Sessao } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface PacienteTabsProps {
  resumo: PacienteResumo
  historico: PacienteHistorico
  sessoes: Sessao[]
}

type TabId = 'estado' | 'historico' | 'resumos'

export function PacienteTabs({ resumo, historico, sessoes }: PacienteTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('estado')

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'estado',
      label: 'Estado Atual',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      id: 'historico',
      label: 'Histórico Evolutivo',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'resumos',
      label: 'Resumos das Sessões',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
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
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeTab === 'estado' && (
          <EstadoAtualTab resumo={resumo} />
        )}
        {activeTab === 'historico' && (
          <HistoricoTab historico={historico} />
        )}
        {activeTab === 'resumos' && (
          <ResumosTab sessoes={sessoes} />
        )}
      </div>
    </div>
  )
}

function EstadoAtualTab({ resumo }: { resumo: PacienteResumo }) {
  if (!resumo) resumo = {}

  const emptyPlaceholder = '—'

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          label="Humor"
          value={resumo.humor || emptyPlaceholder}
          empty={!resumo.humor}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          icon={<MoodIcon />}
        />
        <InfoCard
          label="Momento"
          value={resumo.momento || emptyPlaceholder}
          empty={!resumo.momento}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          icon={<MomentoIcon />}
        />
        <InfoCard
          label="Diagnósticos"
          value={resumo.diagnosticos || emptyPlaceholder}
          empty={!resumo.diagnosticos}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          icon={<DiagIcon />}
        />
        <InfoCard
          label="Conflitos Atuais"
          value={resumo.conflitos || emptyPlaceholder}
          empty={!resumo.conflitos}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          icon={<ConflictIcon />}
        />
        <InfoCard
          label="Traumas"
          value={resumo.traumas || emptyPlaceholder}
          empty={!resumo.traumas}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          icon={<TraumaIcon />}
        />
        <InfoCard
          label="Padrões"
          value={resumo.padroes || emptyPlaceholder}
          empty={!resumo.padroes}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          icon={<PatternIcon />}
        />
        <InfoCard
          label="Gatilhos"
          value={resumo.gatilhos || emptyPlaceholder}
          empty={!resumo.gatilhos}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          icon={<TriggerIcon />}
        />
        <InfoCard
          label="Recursos"
          value={resumo.recursos || emptyPlaceholder}
          empty={!resumo.recursos}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          icon={<ResourceIcon />}
        />
      </div>

      {/* Tarefas */}
      <div className="mt-5 pt-5 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-sky-50 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-700">Tarefas em Andamento</span>
        </div>
        <p className={`text-sm pl-8 ${resumo.tarefas ? 'text-gray-600' : 'text-gray-300 italic'}`}>
          {resumo.tarefas || 'Nenhuma tarefa registrada'}
        </p>
      </div>

      {/* Alerta */}
      {resumo.alertas && resumo.alertas !== 'nenhum no momento' ? (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Atenção
          </div>
          <p className="text-sm text-amber-800">{resumo.alertas}</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Alertas
          </div>
          <p className="text-sm text-gray-300 italic mt-1">Nenhum alerta</p>
        </div>
      )}
    </div>
  )
}

function HistoricoTab({ historico }: { historico: PacienteHistorico }) {
  if (!historico) historico = {}

  const sections = [
    { key: 'marcos', title: 'Marcos', tagClass: 'bg-emerald-50 text-emerald-700', dotColor: 'bg-emerald-500' },
    { key: 'insights', title: 'Insights', tagClass: 'bg-blue-50 text-blue-700', dotColor: 'bg-blue-500' },
    { key: 'humor', title: 'Humor', tagClass: 'bg-purple-50 text-purple-700', dotColor: 'bg-purple-500' },
    { key: 'conflitos', title: 'Conflitos', tagClass: 'bg-orange-50 text-orange-700', dotColor: 'bg-orange-500' },
    { key: 'traumas', title: 'Traumas', tagClass: 'bg-red-50 text-red-700', dotColor: 'bg-red-500' },
    { key: 'tarefas', title: 'Tarefas', tagClass: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-500' },
    { key: 'alertas', title: 'Alertas', tagClass: 'bg-amber-50 text-amber-700', dotColor: 'bg-amber-500' },
  ]

  return (
    <div className="space-y-6">
      {sections.map(({ key, title, tagClass, dotColor }) => {
        const items = historico[key]
        const hasItems = items && items.length > 0

        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${hasItems ? dotColor : 'bg-gray-200'}`}></div>
              <span className={`text-sm font-semibold ${hasItems ? 'text-gray-700' : 'text-gray-400'}`}>{title}</span>
              {hasItems && <span className="text-xs text-gray-400">({items.length})</span>}
            </div>
            <div className={`pl-4 border-l-2 ${hasItems ? 'border-gray-100' : 'border-gray-50'}`}>
              {hasItems ? (
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-gray-400 text-xs w-20 flex-shrink-0 pt-0.5">
                        {formatDate(item.data)}
                      </span>
                      <div className="flex-1">
                        <span className="text-gray-700">{item.valor}</span>
                        {item.acao && (
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${tagClass}`}>
                            {item.acao}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-300 italic">Sem registros ainda</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ResumosTab({ sessoes }: { sessoes: Sessao[] }) {
  const sessoesComResumo = sessoes.filter(s => s.resumo?.resumo_sessao?.sintese)

  if (sessoesComResumo.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm">Nenhum prontuário de sessão ainda</p>
        <p className="text-xs text-gray-300 mt-1">Os prontuários serão gerados após cada sessão</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-400 mb-4">
        {sessoesComResumo.length} sessões com prontuário
      </div>

      {sessoesComResumo.map((sessao) => {
        const r = sessao.resumo
        return (
          <div
            key={sessao.id}
            className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
          >
            {/* Header da sessão */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  Sessão {sessao.numero_sessao}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDate(sessao.data_hora)}
                </span>
              </div>
              {r?.estado_mental_sessao?.humor && (
                <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">
                  {r.estado_mental_sessao.humor}
                </span>
              )}
            </div>

            {/* Síntese */}
            {r?.resumo_sessao?.sintese && (
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                {r.resumo_sessao.sintese}
              </p>
            )}

            {/* Temas Trabalhados */}
            {r?.intervencoes?.temas_trabalhados && r.intervencoes.temas_trabalhados.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {r.intervencoes.temas_trabalhados.map((tema, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {tema}
                  </span>
                ))}
              </div>
            )}

            {/* Pontos Principais e Mudanças */}
            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              {r?.resumo_sessao?.pontos_principais && r.resumo_sessao.pontos_principais.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                  <div className="text-xs font-medium text-blue-600 mb-1.5">Pontos Principais</div>
                  <ul className="space-y-1">
                    {r.resumo_sessao.pontos_principais.map((p, i) => (
                      <li key={i} className="text-xs text-gray-700">• {p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {r?.resumo_sessao?.mudancas_observadas && r.resumo_sessao.mudancas_observadas.length > 0 && (
                <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="text-xs font-medium text-emerald-600 mb-1.5">Mudanças Observadas</div>
                  <ul className="space-y-1">
                    {r.resumo_sessao.mudancas_observadas.map((m, i) => (
                      <li key={i} className="text-xs text-gray-700">• {m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Tarefas novas */}
            {r?.plano_metas?.tarefas_novas && r.plano_metas.tarefas_novas.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-sky-50/50 border border-sky-100">
                <div className="text-xs font-medium text-sky-600 mb-1.5">Tarefas Atribuídas</div>
                <ul className="space-y-1">
                  {r.plano_metas.tarefas_novas.map((tarefa, i) => (
                    <li key={i} className="text-xs text-gray-700">• {tarefa}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Evolução CRP (preview) */}
            {r?.evolucao_crp && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-xs font-medium text-slate-500 mb-1">Evolução CFP</div>
                <p className="text-xs text-slate-600 line-clamp-3">{r.evolucao_crp}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function InfoCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  empty
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  empty?: boolean
}) {
  return (
    <div className={`p-4 rounded-lg border ${empty ? 'bg-gray-50/30 border-gray-100/60' : 'bg-gray-50/50 border-gray-100'}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-7 h-7 rounded-md ${empty ? 'bg-gray-100' : iconBg} flex items-center justify-center`}>
          <span className={empty ? 'text-gray-300' : iconColor}>{icon}</span>
        </div>
        <span className={`text-sm font-semibold ${empty ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
      </div>
      <p className={`text-sm pl-9 ${empty ? 'text-gray-300 italic' : 'text-gray-600'}`}>{value}</p>
    </div>
  )
}

// Icons
function MoodIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
    </svg>
  )
}

function MomentoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function DiagIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  )
}

function ConflictIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )
}

function TraumaIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function PatternIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
    </svg>
  )
}

function TriggerIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

function ResourceIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}
