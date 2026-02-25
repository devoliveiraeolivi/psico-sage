'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { SessaoPreparacao, SessaoResumo, PacienteResumo } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { ProntuarioView } from './prontuario-view'
import { useToast } from './toast'

interface SessaoTabsProps {
  preparacao: SessaoPreparacao | null
  resumo: SessaoResumo | null
  integra: string | null
  jaRealizada: boolean
  sessaoId: string
  hasAudio: boolean
  dataHora: string
  recordingStatus?: string | null
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
  dataHora,
  recordingStatus,
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
          <ResumoTab resumo={resumo} jaRealizada={jaRealizada} sessaoId={sessaoId} hasAudio={hasAudio} dataHora={dataHora} recordingStatus={recordingStatus} />
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

export function ResumoTab({ resumo, jaRealizada, sessaoId, hasAudio, dataHora, recordingStatus }: { resumo: SessaoResumo | null; jaRealizada: boolean; sessaoId?: string; hasAudio?: boolean; dataHora?: string; recordingStatus?: string | null }) {
  const router = useRouter()
  const { toast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const prontuarioRef = useRef<HTMLDivElement>(null)

  const isProcessing = recordingStatus && ['transcribing', 'processing', 'uploading'].includes(recordingStatus)

  function handleExportPDF() {
    const content = prontuarioRef.current
    if (!content) return

    const dataFormatadaExport = dataHora
      ? new Date(dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : ''

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Resumo da Sessão — ${dataFormatadaExport}</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    @page { margin: 18mm 14mm; size: A4; }
    body { margin: 0; padding: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div style="padding: 0 8px;">
    <div style="font-family: 'DM Sans', sans-serif; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px;">Resumo da Sessão</div>
    <div style="font-family: 'DM Sans', sans-serif; font-size: 13px; color: #64748b; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">${dataFormatadaExport}</div>
    ${content.innerHTML}
  </div>
</body>
</html>`)
    printWindow.document.close()

    // Wait for fonts to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 400)
    }
  }

  async function handleReprocess() {
    setReprocessing(true)
    setShowConfirm(false)
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/extract`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast(data.error || 'Erro ao reprocessar. Tente novamente.')
        setReprocessing(false)
      } else {
        // Extração disparada em background — recarregar para mostrar progresso no SessionRecorder
        router.refresh()
      }
    } catch {
      toast('Erro de conexão. Tente novamente.')
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

  const dataFormatada = dataHora
    ? new Date(dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  return (
    <div>
      {/* Header: Sessão/data + Reprocessar na mesma linha */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sessão</div>
          <div className="text-sm text-gray-500">{dataFormatada}</div>
        </div>
        <div className="flex items-center gap-3">
          {resumo && (
            <button
              onClick={handleExportPDF}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Exportar PDF
            </button>
          )}
          {sessaoId && hasAudio && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={reprocessing || !!isProcessing}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {reprocessing || isProcessing ? (
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
        )}
        </div>
      </div>

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

      {reprocessing ? (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-8 h-8 mx-auto mb-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm">Reprocessando prontuário pela IA...</p>
          <p className="text-xs text-gray-300 mt-1">Isso pode levar alguns segundos</p>
        </div>
      ) : (
        <div ref={prontuarioRef}>
          <ProntuarioView dados={resumo} />
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
