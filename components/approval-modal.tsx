'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { useToast } from './toast'
import { ProntuarioView } from './prontuario-view'
import type { SessaoResumo, PessoaCentral, PessoaSecundaria, ProgressoMeta } from '@/lib/types'

interface ApprovalModalProps {
  open: boolean
  onClose: () => void
  sessaoId: string
  resumo: SessaoResumo | null
  pacienteNome: string
  numeroSessao: number | null
  dataHora: string
}

function cloneResumo(r: SessaoResumo): SessaoResumo {
  return JSON.parse(JSON.stringify(r))
}

function emptyResumo(): SessaoResumo {
  return {
    resumo: { sintese: '', pontos_principais: [] },
    pontos_atencao: { urgentes: [], monitorar: [], acompanhar_proximas: [] },
    estrategia_plano: { tarefas_novas: [], metas_acordadas: null, foco_proxima_sessao: null },
    evolucao_cfp: '',
    queixas_sintomas: { queixa_sessao: null, sintomas_relatados: [], intensidade: null, frequencia: null, fatores_agravantes: [], fatores_alivio: [] },
    estado_mental: { humor: null, afeto: null, pensamento_curso: null, pensamento_conteudo: null, insight: null, juizo_critica: null, risco_suicida: 'não avaliado', risco_heteroagressivo: 'não avaliado', outras_observacoes: null },
    mudancas_padroes: { mudancas_positivas: [], padroes_identificados: [], crencas_centrais: [], defesas_predominantes: [], recursos_paciente: [], persistencias: [] },
    progresso_tarefas: [],
    pessoas_centrais: [],
    pessoas_secundarias: [],
    farmacologia: { medicacoes: null, adesao: null, efeitos_relatados: null, mudancas: null, encaminhamento_psiquiatrico: null },
    intervencoes: { tecnicas_utilizadas: [], temas_trabalhados: [], observacoes_processo: null },
    anamnese: { infancia: null, adolescencia: null, vida_adulta: null, familia_origem: null, relacionamentos: null, marcos_vida: null, historico_tratamentos: null },
  }
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
const textareaCls = `${inputCls} resize-none`
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5'
const sectionCls = 'border border-gray-100 rounded-lg'

function EditSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={sectionCls}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
      >
        {title}
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

export function ApprovalModal({
  open,
  onClose,
  sessaoId,
  resumo,
  pacienteNome,
  numeroSessao,
  dataHora,
}: ApprovalModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [mode, setMode] = useState<'review' | 'edit'>('review')
  const [isApproving, setIsApproving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedResumo, setEditedResumo] = useState<SessaoResumo>(resumo ? cloneResumo(resumo) : emptyResumo())
  const [displayedResumo, setDisplayedResumo] = useState<SessaoResumo | null>(resumo)
  const [showAiAdjust, setShowAiAdjust] = useState(false)
  const [aiInstrucoes, setAiInstrucoes] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState<string | null>(null)
  const [adjustResult, setAdjustResult] = useState<string | null>(null)
  const [approveError, setApproveError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setMode('review')
      setEditedResumo(resumo ? cloneResumo(resumo) : emptyResumo())
      setDisplayedResumo(resumo)
      setShowAiAdjust(false)
      setAiInstrucoes('')
      setAdjustError(null)
      setAdjustResult(null)
      setApproveError(null)
    }
  }, [open, resumo])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isAdjusting) onClose()
  }, [onClose, isAdjusting])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const upd = (section: keyof SessaoResumo, field: string, value: unknown) => {
    setEditedResumo(prev => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, unknown>), [field]: value },
    }))
  }

  const arrFromLines = (text: string) => text.split('\n').filter(Boolean)
  const arrFromCommas = (text: string) => text.split(',').map(t => t.trim()).filter(Boolean)

  const handleApprove = async () => {
    setIsApproving(true)
    setApproveError(null)
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/approve`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        setApproveError(data.error || 'Falha ao aprovar sessão')
        return
      }
      onClose()
      router.refresh()
    } catch (err) {
      setApproveError('Erro de conexão. Tente novamente.')
    } finally {
      setIsApproving(false)
    }
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumo: editedResumo }),
      })
      if (!res.ok) {
        toast('Erro ao salvar edição. Tente novamente.', 'error')
        return
      }
      setDisplayedResumo(editedResumo)
      setMode('review')
      router.refresh()
    } catch {
      toast('Erro ao salvar edição. Tente novamente.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAiAdjust = async () => {
    if (!aiInstrucoes.trim() || isAdjusting) return
    setIsAdjusting(true)
    setAdjustError(null)
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/ai-adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrucoes: aiInstrucoes.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setAdjustError(res.status === 429
          ? 'Muitas requisições. Aguarde um momento.'
          : data.error || 'Erro ao ajustar prontuário')
        return
      }
      const data = await res.json()
      setDisplayedResumo(data.resumo)
      setAiInstrucoes('')
      setShowAiAdjust(false)
      setAdjustResult(data.descricao_ajustes || 'Ajuste realizado.')
    } catch {
      setAdjustError('Erro de conexão. Tente novamente.')
    } finally {
      setIsAdjusting(false)
    }
  }

  // Pessoas centrais handlers
  const addPessoaCentral = () => {
    setEditedResumo(prev => ({
      ...prev,
      pessoas_centrais: [...prev.pessoas_centrais, { nome_usado: '', categoria: 'outros', tipo: 'outro', mencao: '' }],
    }))
  }
  const updPessoaCentral = (idx: number, field: keyof PessoaCentral, value: string) => {
    setEditedResumo(prev => ({
      ...prev,
      pessoas_centrais: prev.pessoas_centrais.map((p, i) => i === idx ? { ...p, [field]: value } : p),
    }))
  }
  const rmPessoaCentral = (idx: number) => {
    setEditedResumo(prev => ({
      ...prev,
      pessoas_centrais: prev.pessoas_centrais.filter((_, i) => i !== idx),
    }))
  }

  // Pessoas secundarias handlers
  const addPessoaSecundaria = () => {
    setEditedResumo(prev => ({
      ...prev,
      pessoas_secundarias: [...prev.pessoas_secundarias, { nome_usado: '', tipo: 'outro', mencao: '' }],
    }))
  }
  const updPessoaSecundaria = (idx: number, field: keyof PessoaSecundaria, value: string) => {
    setEditedResumo(prev => ({
      ...prev,
      pessoas_secundarias: prev.pessoas_secundarias.map((p, i) => i === idx ? { ...p, [field]: value } : p),
    }))
  }
  const rmPessoaSecundaria = (idx: number) => {
    setEditedResumo(prev => ({
      ...prev,
      pessoas_secundarias: prev.pessoas_secundarias.filter((_, i) => i !== idx),
    }))
  }

  // Progresso handlers
  const addProgresso = () => {
    setEditedResumo(prev => ({
      ...prev,
      progresso_tarefas: [...prev.progresso_tarefas, { meta: '', status: 'em_andamento', observacao: '' }],
    }))
  }
  const updProgresso = (idx: number, field: keyof ProgressoMeta, value: string) => {
    setEditedResumo(prev => ({
      ...prev,
      progresso_tarefas: prev.progresso_tarefas.map((p, i) =>
        i === idx ? { ...p, [field]: value } : p
      ),
    }))
  }
  const rmProgresso = (idx: number) => {
    setEditedResumo(prev => ({
      ...prev,
      progresso_tarefas: prev.progresso_tarefas.filter((_, i) => i !== idx),
    }))
  }

  const r = editedResumo

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-xl flex flex-col relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">
                {mode === 'edit' ? 'Editar Prontuário' : 'Revisar Prontuário'}
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {pacienteNome}
                {numeroSessao && ` · Sessão ${numeroSessao}`}
                {' · '}{formatDateTime(dataHora)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'review' ? (
            displayedResumo ? <ProntuarioView dados={displayedResumo} /> : <p className="text-sm text-gray-400 text-center py-8">Sem dados para exibir</p>
          ) : (
            <div className="space-y-3">
              {/* Resumo */}
              <EditSection title="Resumo da Sessão" defaultOpen>
                <div>
                  <label className={labelCls}>Síntese</label>
                  <textarea value={r.resumo.sintese} onChange={e => upd('resumo', 'sintese', e.target.value)} rows={2} className={textareaCls} placeholder="Frase resumindo a sessão..." />
                </div>
                <div>
                  <label className={labelCls}>Pontos Principais (um por linha)</label>
                  <textarea value={r.resumo.pontos_principais.join('\n')} onChange={e => upd('resumo', 'pontos_principais', arrFromLines(e.target.value))} rows={3} className={textareaCls} />
                </div>
              </EditSection>

              {/* Estado Mental */}
              <EditSection title="Estado Mental" defaultOpen>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Humor</label>
                    <input value={r.estado_mental.humor || ''} onChange={e => upd('estado_mental', 'humor', e.target.value || null)} className={inputCls} placeholder="ansioso, eutímico..." />
                  </div>
                  <div>
                    <label className={labelCls}>Afeto</label>
                    <select value={r.estado_mental.afeto || ''} onChange={e => upd('estado_mental', 'afeto', e.target.value || null)} className={inputCls}>
                      <option value="">—</option>
                      <option value="congruente">congruente</option>
                      <option value="incongruente">incongruente</option>
                      <option value="embotado">embotado</option>
                      <option value="expansivo">expansivo</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Pensamento (curso)</label>
                    <select value={r.estado_mental.pensamento_curso || ''} onChange={e => upd('estado_mental', 'pensamento_curso', e.target.value || null)} className={inputCls}>
                      <option value="">—</option>
                      <option value="normal">normal</option>
                      <option value="acelerado">acelerado</option>
                      <option value="lentificado">lentificado</option>
                      <option value="desorganizado">desorganizado</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Insight</label>
                    <select value={r.estado_mental.insight || ''} onChange={e => upd('estado_mental', 'insight', e.target.value || null)} className={inputCls}>
                      <option value="">—</option>
                      <option value="presente">presente</option>
                      <option value="parcial">parcial</option>
                      <option value="ausente">ausente</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Risco Suicida</label>
                    <select value={r.estado_mental.risco_suicida} onChange={e => upd('estado_mental', 'risco_suicida', e.target.value)} className={inputCls}>
                      <option value="ausente">ausente</option>
                      <option value="ideação passiva">ideação passiva</option>
                      <option value="ideação ativa">ideação ativa</option>
                      <option value="plano estruturado">plano estruturado</option>
                      <option value="não avaliado">não avaliado</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Risco Heteroagressivo</label>
                    <select value={r.estado_mental.risco_heteroagressivo} onChange={e => upd('estado_mental', 'risco_heteroagressivo', e.target.value)} className={inputCls}>
                      <option value="ausente">ausente</option>
                      <option value="presente">presente</option>
                      <option value="não avaliado">não avaliado</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Conteúdo do Pensamento</label>
                  <textarea value={r.estado_mental.pensamento_conteudo || ''} onChange={e => upd('estado_mental', 'pensamento_conteudo', e.target.value || null)} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Outras Observações</label>
                  <textarea value={r.estado_mental.outras_observacoes || ''} onChange={e => upd('estado_mental', 'outras_observacoes', e.target.value || null)} rows={2} className={textareaCls} placeholder="Aparência, orientação, atenção..." />
                </div>
              </EditSection>

              {/* Queixas e Sintomas */}
              <EditSection title="Queixas e Sintomas">
                <div>
                  <label className={labelCls}>Queixa da Sessão</label>
                  <textarea value={r.queixas_sintomas.queixa_sessao || ''} onChange={e => upd('queixas_sintomas', 'queixa_sessao', e.target.value || null)} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Sintomas Relatados (um por linha)</label>
                  <textarea value={r.queixas_sintomas.sintomas_relatados.join('\n')} onChange={e => upd('queixas_sintomas', 'sintomas_relatados', arrFromLines(e.target.value))} rows={3} className={textareaCls} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Intensidade (0-10)</label>
                    <input type="number" min={0} max={10} value={r.queixas_sintomas.intensidade ?? ''} onChange={e => upd('queixas_sintomas', 'intensidade', e.target.value ? Number(e.target.value) : null)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Frequência</label>
                    <input value={r.queixas_sintomas.frequencia || ''} onChange={e => upd('queixas_sintomas', 'frequencia', e.target.value || null)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Fatores Agravantes (um por linha)</label>
                  <textarea value={r.queixas_sintomas.fatores_agravantes.join('\n')} onChange={e => upd('queixas_sintomas', 'fatores_agravantes', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Fatores de Alívio (um por linha)</label>
                  <textarea value={r.queixas_sintomas.fatores_alivio.join('\n')} onChange={e => upd('queixas_sintomas', 'fatores_alivio', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
              </EditSection>

              {/* Intervenções */}
              <EditSection title="Intervenções">
                <div>
                  <label className={labelCls}>Temas Trabalhados (separados por vírgula)</label>
                  <input value={r.intervencoes.temas_trabalhados.map((t: any) => typeof t === 'string' ? t : t.tema).join(', ')} onChange={e => upd('intervencoes', 'temas_trabalhados', arrFromCommas(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Técnicas Utilizadas (uma por linha)</label>
                  <textarea value={r.intervencoes.tecnicas_utilizadas.join('\n')} onChange={e => upd('intervencoes', 'tecnicas_utilizadas', arrFromLines(e.target.value))} rows={3} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Observações do Processo</label>
                  <textarea value={r.intervencoes.observacoes_processo || ''} onChange={e => upd('intervencoes', 'observacoes_processo', e.target.value || null)} rows={2} className={textareaCls} />
                </div>
              </EditSection>

              {/* Pessoas Centrais */}
              <EditSection title="Pessoas Centrais">
                {r.pessoas_centrais.map((p, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-400">Central {i + 1}</span>
                      <button type="button" onClick={() => rmPessoaCentral(i)} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input value={p.nome_usado} onChange={e => updPessoaCentral(i, 'nome_usado', e.target.value)} className={inputCls} placeholder="Nome usado" />
                      <select value={p.categoria} onChange={e => updPessoaCentral(i, 'categoria', e.target.value)} className={inputCls}>
                        <option value="familia_origem">Família Origem</option>
                        <option value="familia_constituida">Família Constituída</option>
                        <option value="trabalho">Trabalho</option>
                        <option value="social">Social</option>
                        <option value="profissional_saude">Profissional Saúde</option>
                        <option value="outros">Outros</option>
                      </select>
                      <input value={p.tipo} onChange={e => updPessoaCentral(i, 'tipo', e.target.value)} className={inputCls} placeholder="Tipo (mae, irmao...)" />
                    </div>
                    <textarea value={p.mencao} onChange={e => updPessoaCentral(i, 'mencao', e.target.value)} className={textareaCls} rows={2} placeholder="Intervenção terapêutica realizada sobre essa dinâmica..." />
                  </div>
                ))}
                <button type="button" onClick={addPessoaCentral} className="text-sm text-primary hover:text-primary/80 font-medium">+ Adicionar pessoa central</button>
              </EditSection>

              {/* Pessoas Secundárias */}
              <EditSection title="Pessoas Secundárias">
                {r.pessoas_secundarias.map((p, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-400">Secundária {i + 1}</span>
                      <button type="button" onClick={() => rmPessoaSecundaria(i)} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input value={p.nome_usado} onChange={e => updPessoaSecundaria(i, 'nome_usado', e.target.value)} className={inputCls} placeholder="Nome usado" />
                      <input value={p.tipo} onChange={e => updPessoaSecundaria(i, 'tipo', e.target.value)} className={inputCls} placeholder="Tipo (genitor, namorado...)" />
                    </div>
                    <input value={p.mencao} onChange={e => updPessoaSecundaria(i, 'mencao', e.target.value)} className={inputCls} placeholder="Resumo breve..." />
                  </div>
                ))}
                <button type="button" onClick={addPessoaSecundaria} className="text-sm text-primary hover:text-primary/80 font-medium">+ Adicionar pessoa secundária</button>
              </EditSection>

              {/* Estratégia e Plano */}
              <EditSection title="Estratégia e Plano">
                <div>
                  <label className={labelCls}>Progresso de Tarefas Anteriores</label>
                  {r.progresso_tarefas.map((p, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">Tarefa {i + 1}</span>
                        <button type="button" onClick={() => rmProgresso(i)} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                      </div>
                      <input value={p.meta} onChange={e => updProgresso(i, 'meta', e.target.value)} className={inputCls} placeholder="Descrição da tarefa" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select value={p.status} onChange={e => updProgresso(i, 'status', e.target.value)} className={inputCls}>
                          <option value="concluida">Concluída</option>
                          <option value="em_andamento">Em andamento</option>
                          <option value="parcial">Parcial</option>
                          <option value="nao_realizada">Não realizada</option>
                        </select>
                        <input value={p.observacao} onChange={e => updProgresso(i, 'observacao', e.target.value)} className={inputCls} placeholder="Observação" />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addProgresso} className="text-sm text-primary hover:text-primary/80 font-medium">+ Adicionar progresso</button>
                </div>
                <div>
                  <label className={labelCls}>Tarefas Novas (uma por linha)</label>
                  <textarea value={r.estrategia_plano.tarefas_novas.join('\n')} onChange={e => upd('estrategia_plano', 'tarefas_novas', arrFromLines(e.target.value))} rows={3} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Metas Acordadas</label>
                  <textarea value={r.estrategia_plano.metas_acordadas || ''} onChange={e => upd('estrategia_plano', 'metas_acordadas', e.target.value || null)} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Foco Próxima Sessão</label>
                  <input value={r.estrategia_plano.foco_proxima_sessao || ''} onChange={e => upd('estrategia_plano', 'foco_proxima_sessao', e.target.value || null)} className={inputCls} />
                </div>
              </EditSection>

              {/* Mudanças e Padrões */}
              <EditSection title="Mudanças e Padrões">
                <div>
                  <label className={labelCls}>Mudanças Positivas (uma por linha)</label>
                  <textarea value={r.mudancas_padroes.mudancas_positivas.join('\n')} onChange={e => upd('mudancas_padroes', 'mudancas_positivas', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Padrões Identificados (um por linha)</label>
                  <textarea value={r.mudancas_padroes.padroes_identificados.join('\n')} onChange={e => upd('mudancas_padroes', 'padroes_identificados', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Crenças Centrais (uma por linha)</label>
                  <textarea value={r.mudancas_padroes.crencas_centrais.join('\n')} onChange={e => upd('mudancas_padroes', 'crencas_centrais', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Recursos do Paciente (um por linha)</label>
                  <textarea value={r.mudancas_padroes.recursos_paciente.join('\n')} onChange={e => upd('mudancas_padroes', 'recursos_paciente', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Persistências (uma por linha)</label>
                  <textarea value={r.mudancas_padroes.persistencias.join('\n')} onChange={e => upd('mudancas_padroes', 'persistencias', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
              </EditSection>

              {/* Farmacologia */}
              <EditSection title="Farmacologia">
                <div>
                  <label className={labelCls}>Adesão</label>
                  <select value={r.farmacologia.adesao || ''} onChange={e => upd('farmacologia', 'adesao', e.target.value || null)} className={inputCls}>
                    <option value="">—</option>
                    <option value="boa">boa</option>
                    <option value="irregular">irregular</option>
                    <option value="abandonou">abandonou</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Efeitos Relatados</label>
                  <input value={r.farmacologia.efeitos_relatados || ''} onChange={e => upd('farmacologia', 'efeitos_relatados', e.target.value || null)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Mudanças</label>
                  <input value={r.farmacologia.mudancas || ''} onChange={e => upd('farmacologia', 'mudancas', e.target.value || null)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Encaminhamento Psiquiátrico</label>
                  <input value={r.farmacologia.encaminhamento_psiquiatrico || ''} onChange={e => upd('farmacologia', 'encaminhamento_psiquiatrico', e.target.value || null)} className={inputCls} />
                </div>
              </EditSection>

              {/* Evolução CFP */}
              <EditSection title="Evolução (Prontuário CFP)" defaultOpen>
                <div>
                  <label className={labelCls}>Texto de Evolução</label>
                  <textarea value={r.evolucao_cfp} onChange={e => setEditedResumo(prev => ({ ...prev, evolucao_cfp: e.target.value }))} rows={6} className={textareaCls} placeholder="Paciente compareceu à sessão de psicoterapia..." />
                </div>
              </EditSection>

              {/* Pontos de Atenção */}
              <EditSection title="Pontos de Atenção" defaultOpen>
                <div>
                  <label className={labelCls}>Urgentes (um por linha)</label>
                  <textarea value={r.pontos_atencao.urgentes.join('\n')} onChange={e => upd('pontos_atencao', 'urgentes', arrFromLines(e.target.value))} rows={2} className={`${textareaCls} border-red-200 focus:border-red-400`} placeholder="Risco iminente..." />
                </div>
                <div>
                  <label className={labelCls}>Monitorar (um por linha)</label>
                  <textarea value={r.pontos_atencao.monitorar.join('\n')} onChange={e => upd('pontos_atencao', 'monitorar', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Acompanhar Próximas (um por linha)</label>
                  <textarea value={r.pontos_atencao.acompanhar_proximas.join('\n')} onChange={e => upd('pontos_atencao', 'acompanhar_proximas', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
              </EditSection>
            </div>
          )}
        </div>

        {/* AI Adjust Panel */}
        {mode === 'review' && showAiAdjust && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/80 flex-shrink-0">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  O que a IA deve ajustar?
                </label>
                <textarea
                  value={aiInstrucoes}
                  onChange={(e) => setAiInstrucoes(e.target.value)}
                  placeholder={'Ex: "O humor deveria ser ansioso, não eutímico" ou "Faltou mencionar a tarefa de exposição gradual"'}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 resize-none"
                  disabled={isAdjusting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleAiAdjust()
                    }
                  }}
                />
                {adjustError && (
                  <p className="text-xs text-red-600 mt-1">{adjustError}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">Ctrl+Enter para enviar</p>
              </div>
              <div className="flex flex-col gap-1.5 pt-5">
                <button
                  onClick={handleAiAdjust}
                  disabled={isAdjusting || !aiInstrucoes.trim()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {isAdjusting ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Ajustando...
                    </span>
                  ) : 'Enviar'}
                </button>
                <button
                  onClick={() => { setShowAiAdjust(false); setAiInstrucoes(''); setAdjustError(null) }}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                  disabled={isAdjusting}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {approveError && mode === 'review' && (
          <div className="px-6 py-2 border-t border-red-100 bg-red-50 flex-shrink-0">
            <p className="text-sm text-red-700">{approveError}</p>
          </div>
        )}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          {mode === 'review' ? (
            <>
              <button onClick={onClose} disabled={isAdjusting} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50">Fechar</button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiAdjust(!showAiAdjust)}
                  disabled={isAdjusting}
                  className="px-4 py-2 text-sm font-medium text-violet-700 bg-white border border-violet-300 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM19.5 10.5h-3m1.5-1.5v3" />
                    </svg>
                    Ajustar por IA
                  </span>
                </button>
                <button
                  onClick={() => {
                    setEditedResumo(displayedResumo ? cloneResumo(displayedResumo) : emptyResumo())
                    setMode('edit')
                  }}
                  disabled={isAdjusting}
                  className="px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                    Editar
                  </span>
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isAdjusting}
                  className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {isApproving ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {isApproving ? 'Aprovando...' : 'Aprovar'}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditedResumo(displayedResumo ? cloneResumo(displayedResumo) : emptyResumo())
                  setMode('review')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </>
          )}
        </div>
        {/* AI Adjust Result Overlay */}
        {adjustResult && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10 rounded-2xl">
            <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md mx-6 overflow-hidden">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM19.5 10.5h-3m1.5-1.5v3" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Resultado do ajuste</h3>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 max-h-60 overflow-y-auto">
                  {adjustResult}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button
                  onClick={() => setAdjustResult(null)}
                  className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Ver prontuário atualizado
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
