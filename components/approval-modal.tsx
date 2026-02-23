'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { ResumoTab } from './sessao-tabs'
import type { SessaoResumo, PessoaMencionada, ProgressoMeta } from '@/lib/types'

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
    resumo_sessao: { sintese: '', pontos_principais: [], mudancas_observadas: [], proximos_passos: [] },
    queixa_sintomatologia: { queixa_sessao: null, sintomas_relatados: [], intensidade: null, frequencia: null, gatilhos: [], estrategias_que_ajudaram: [], evidencias: [] },
    estado_mental_sessao: { humor: null, afeto: null, pensamento_curso: null, pensamento_conteudo: { resumo: null, evidencias: [] }, insight: null, juizo_critica: null, sensopercepcao: null, risco_suicida: 'não avaliado', risco_heteroagressivo: 'não avaliado' },
    pessoas_mencionadas: [],
    intervencoes: { objetivos_sessao: null, tecnicas_utilizadas: [], temas_trabalhados: [], resposta_do_paciente: null },
    plano_metas: { progresso_relatado: [], tarefas_novas: [], metas_acordadas: null, foco_proxima_sessao: null },
    medicacao_sessao: { medicacoes_mencionadas: null, adesao: null, efeitos_relatados: null, mudancas: null, encaminhamentos: null },
    fatos_novos_biograficos: [],
    alertas: { urgentes: [], atencao: [], acompanhar: [] },
    evolucao_crp: '',
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
  const [mode, setMode] = useState<'review' | 'edit'>('review')
  const [isApproving, setIsApproving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedResumo, setEditedResumo] = useState<SessaoResumo>(resumo ? cloneResumo(resumo) : emptyResumo())

  // Reset state when modal opens with new data
  useEffect(() => {
    if (open) {
      setMode('review')
      setEditedResumo(resumo ? cloneResumo(resumo) : emptyResumo())
    }
  }, [open, resumo])

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

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

  // Helpers for nested updates
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
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/approve`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        console.error('Erro ao aprovar:', data.error)
        return
      }
      onClose()
      router.refresh()
    } catch (err) {
      console.error('Erro ao aprovar sessão:', err)
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
        const data = await res.json()
        console.error('Erro ao salvar:', data.error)
        return
      }
      setMode('review')
      router.refresh()
    } catch (err) {
      console.error('Erro ao salvar edição:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Pessoa handlers
  const addPessoa = () => {
    setEditedResumo(prev => ({
      ...prev,
      pessoas_mencionadas: [...prev.pessoas_mencionadas, { nome_usado: '', categoria: 'outros', tipo: 'outro', contexto: null, relevancia: 'secundaria', nota: '' }],
    }))
  }
  const updPessoa = (idx: number, field: keyof PessoaMencionada, value: string) => {
    setEditedResumo(prev => ({
      ...prev,
      pessoas_mencionadas: prev.pessoas_mencionadas.map((p, i) => i === idx ? { ...p, [field]: value || (field === 'contexto' ? null : value) } : p),
    }))
  }
  const rmPessoa = (idx: number) => {
    setEditedResumo(prev => ({
      ...prev,
      pessoas_mencionadas: prev.pessoas_mencionadas.filter((_, i) => i !== idx),
    }))
  }

  // Progresso handlers
  const addProgresso = () => {
    setEditedResumo(prev => ({
      ...prev,
      plano_metas: {
        ...prev.plano_metas,
        progresso_relatado: [...prev.plano_metas.progresso_relatado, { meta: '', status: 'em_andamento', observacao: '' }],
      },
    }))
  }
  const updProgresso = (idx: number, field: keyof ProgressoMeta, value: string) => {
    setEditedResumo(prev => ({
      ...prev,
      plano_metas: {
        ...prev.plano_metas,
        progresso_relatado: prev.plano_metas.progresso_relatado.map((p, i) =>
          i === idx ? { ...p, [field]: value } : p
        ),
      },
    }))
  }
  const rmProgresso = (idx: number) => {
    setEditedResumo(prev => ({
      ...prev,
      plano_metas: {
        ...prev.plano_metas,
        progresso_relatado: prev.plano_metas.progresso_relatado.filter((_, i) => i !== idx),
      },
    }))
  }

  const r = editedResumo

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-xl flex flex-col">
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
            <ResumoTab resumo={resumo} jaRealizada={true} />
          ) : (
            <div className="space-y-3">
              {/* Resumo da Sessão */}
              <EditSection title="Resumo da Sessão" defaultOpen>
                <div>
                  <label className={labelCls}>Síntese</label>
                  <textarea value={r.resumo_sessao.sintese} onChange={e => upd('resumo_sessao', 'sintese', e.target.value)} rows={2} className={textareaCls} placeholder="Frase resumindo a sessão..." />
                </div>
                <div>
                  <label className={labelCls}>Pontos Principais (um por linha)</label>
                  <textarea value={r.resumo_sessao.pontos_principais.join('\n')} onChange={e => upd('resumo_sessao', 'pontos_principais', arrFromLines(e.target.value))} rows={3} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Mudanças Observadas (um por linha)</label>
                  <textarea value={r.resumo_sessao.mudancas_observadas.join('\n')} onChange={e => upd('resumo_sessao', 'mudancas_observadas', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Próximos Passos (um por linha)</label>
                  <textarea value={r.resumo_sessao.proximos_passos.join('\n')} onChange={e => upd('resumo_sessao', 'proximos_passos', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
              </EditSection>

              {/* Estado Mental */}
              <EditSection title="Estado Mental" defaultOpen>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Humor</label>
                    <input value={r.estado_mental_sessao.humor || ''} onChange={e => upd('estado_mental_sessao', 'humor', e.target.value || null)} className={inputCls} placeholder="ansioso, eutímico..." />
                  </div>
                  <div>
                    <label className={labelCls}>Afeto</label>
                    <select value={r.estado_mental_sessao.afeto || ''} onChange={e => upd('estado_mental_sessao', 'afeto', e.target.value || null)} className={inputCls}>
                      <option value="">—</option>
                      <option value="congruente">congruente</option>
                      <option value="incongruente">incongruente</option>
                      <option value="embotado">embotado</option>
                      <option value="expansivo">expansivo</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Pensamento (curso)</label>
                    <select value={r.estado_mental_sessao.pensamento_curso || ''} onChange={e => upd('estado_mental_sessao', 'pensamento_curso', e.target.value || null)} className={inputCls}>
                      <option value="">—</option>
                      <option value="normal">normal</option>
                      <option value="acelerado">acelerado</option>
                      <option value="lentificado">lentificado</option>
                      <option value="desorganizado">desorganizado</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Insight</label>
                    <select value={r.estado_mental_sessao.insight || ''} onChange={e => upd('estado_mental_sessao', 'insight', e.target.value || null)} className={inputCls}>
                      <option value="">—</option>
                      <option value="presente">presente</option>
                      <option value="parcial">parcial</option>
                      <option value="ausente">ausente</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Risco Suicida</label>
                    <select value={r.estado_mental_sessao.risco_suicida} onChange={e => upd('estado_mental_sessao', 'risco_suicida', e.target.value)} className={inputCls}>
                      <option value="ausente">ausente</option>
                      <option value="ideação passiva">ideação passiva</option>
                      <option value="ideação ativa">ideação ativa</option>
                      <option value="plano estruturado">plano estruturado</option>
                      <option value="não avaliado">não avaliado</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Risco Heteroagressivo</label>
                    <select value={r.estado_mental_sessao.risco_heteroagressivo} onChange={e => upd('estado_mental_sessao', 'risco_heteroagressivo', e.target.value)} className={inputCls}>
                      <option value="ausente">ausente</option>
                      <option value="presente">presente</option>
                      <option value="não avaliado">não avaliado</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Conteúdo do Pensamento</label>
                  <textarea value={r.estado_mental_sessao.pensamento_conteudo?.resumo || ''} onChange={e => setEditedResumo(prev => ({ ...prev, estado_mental_sessao: { ...prev.estado_mental_sessao, pensamento_conteudo: { ...prev.estado_mental_sessao.pensamento_conteudo, resumo: e.target.value || null } } }))} rows={2} className={textareaCls} />
                </div>
              </EditSection>

              {/* Queixa e Sintomatologia */}
              <EditSection title="Queixa e Sintomatologia">
                <div>
                  <label className={labelCls}>Queixa da Sessão</label>
                  <textarea value={r.queixa_sintomatologia.queixa_sessao || ''} onChange={e => upd('queixa_sintomatologia', 'queixa_sessao', e.target.value || null)} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Sintomas Relatados (separados por vírgula)</label>
                  <input value={r.queixa_sintomatologia.sintomas_relatados.join(', ')} onChange={e => upd('queixa_sintomatologia', 'sintomas_relatados', arrFromCommas(e.target.value))} className={inputCls} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Intensidade (0-10)</label>
                    <input type="number" min={0} max={10} value={r.queixa_sintomatologia.intensidade ?? ''} onChange={e => upd('queixa_sintomatologia', 'intensidade', e.target.value ? Number(e.target.value) : null)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Frequência</label>
                    <input value={r.queixa_sintomatologia.frequencia || ''} onChange={e => upd('queixa_sintomatologia', 'frequencia', e.target.value || null)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Gatilhos (um por linha)</label>
                  <textarea value={r.queixa_sintomatologia.gatilhos.join('\n')} onChange={e => upd('queixa_sintomatologia', 'gatilhos', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Estratégias que Ajudaram (um por linha)</label>
                  <textarea value={r.queixa_sintomatologia.estrategias_que_ajudaram.join('\n')} onChange={e => upd('queixa_sintomatologia', 'estrategias_que_ajudaram', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
              </EditSection>

              {/* Intervenções */}
              <EditSection title="Intervenções">
                <div>
                  <label className={labelCls}>Objetivo da Sessão</label>
                  <input value={r.intervencoes.objetivos_sessao || ''} onChange={e => upd('intervencoes', 'objetivos_sessao', e.target.value || null)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Temas Trabalhados (separados por vírgula)</label>
                  <input value={r.intervencoes.temas_trabalhados.join(', ')} onChange={e => upd('intervencoes', 'temas_trabalhados', arrFromCommas(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Técnicas Utilizadas (uma por linha)</label>
                  <textarea value={r.intervencoes.tecnicas_utilizadas.join('\n')} onChange={e => upd('intervencoes', 'tecnicas_utilizadas', arrFromLines(e.target.value))} rows={3} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Resposta do Paciente</label>
                  <textarea value={r.intervencoes.resposta_do_paciente || ''} onChange={e => upd('intervencoes', 'resposta_do_paciente', e.target.value || null)} rows={2} className={textareaCls} />
                </div>
              </EditSection>

              {/* Pessoas */}
              <EditSection title="Pessoas Mencionadas">
                {r.pessoas_mencionadas.map((p, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-400">Pessoa {i + 1}</span>
                      <button type="button" onClick={() => rmPessoa(i)} className="text-xs text-red-500 hover:text-red-700">Remover</button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input value={p.nome_usado} onChange={e => updPessoa(i, 'nome_usado', e.target.value)} className={inputCls} placeholder="Nome usado" />
                      <select value={p.categoria} onChange={e => updPessoa(i, 'categoria', e.target.value)} className={inputCls}>
                        <option value="familia_origem">Família Origem</option>
                        <option value="familia_constituida">Família Constituída</option>
                        <option value="trabalho">Trabalho</option>
                        <option value="social">Social</option>
                        <option value="profissional_saude">Profissional Saúde</option>
                        <option value="outros">Outros</option>
                      </select>
                      <input value={p.tipo} onChange={e => updPessoa(i, 'tipo', e.target.value)} className={inputCls} placeholder="Tipo (mae, chefe...)" />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input value={p.contexto || ''} onChange={e => updPessoa(i, 'contexto', e.target.value)} className={inputCls} placeholder="Contexto (ex: irmão do parceiro)" />
                      <select value={p.relevancia} onChange={e => updPessoa(i, 'relevancia', e.target.value)} className={inputCls}>
                        <option value="central">Central</option>
                        <option value="secundaria">Secundária</option>
                      </select>
                    </div>
                    <input value={p.nota} onChange={e => updPessoa(i, 'nota', e.target.value)} className={inputCls} placeholder="O que foi mencionado..." />
                  </div>
                ))}
                <button type="button" onClick={addPessoa} className="text-sm text-primary hover:text-primary/80 font-medium">+ Adicionar pessoa</button>
              </EditSection>

              {/* Plano e Metas */}
              <EditSection title="Plano e Metas">
                <div>
                  <label className={labelCls}>Progresso de Tarefas Anteriores</label>
                  {r.plano_metas.progresso_relatado.map((p, i) => (
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
                  <textarea value={r.plano_metas.tarefas_novas.join('\n')} onChange={e => upd('plano_metas', 'tarefas_novas', arrFromLines(e.target.value))} rows={3} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Metas Acordadas</label>
                  <textarea value={r.plano_metas.metas_acordadas || ''} onChange={e => upd('plano_metas', 'metas_acordadas', e.target.value || null)} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Foco Próxima Sessão</label>
                  <input value={r.plano_metas.foco_proxima_sessao || ''} onChange={e => upd('plano_metas', 'foco_proxima_sessao', e.target.value || null)} className={inputCls} />
                </div>
              </EditSection>

              {/* Medicação */}
              <EditSection title="Medicação">
                <div>
                  <label className={labelCls}>Medicações</label>
                  <input value={r.medicacao_sessao.medicacoes_mencionadas || ''} onChange={e => upd('medicacao_sessao', 'medicacoes_mencionadas', e.target.value || null)} className={inputCls} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Adesão</label>
                    <input value={r.medicacao_sessao.adesao || ''} onChange={e => upd('medicacao_sessao', 'adesao', e.target.value || null)} className={inputCls} placeholder="boa, irregular..." />
                  </div>
                  <div>
                    <label className={labelCls}>Mudanças</label>
                    <input value={r.medicacao_sessao.mudancas || ''} onChange={e => upd('medicacao_sessao', 'mudancas', e.target.value || null)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Efeitos Relatados</label>
                  <input value={r.medicacao_sessao.efeitos_relatados || ''} onChange={e => upd('medicacao_sessao', 'efeitos_relatados', e.target.value || null)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Encaminhamentos</label>
                  <input value={r.medicacao_sessao.encaminhamentos || ''} onChange={e => upd('medicacao_sessao', 'encaminhamentos', e.target.value || null)} className={inputCls} />
                </div>
              </EditSection>

              {/* Fatos Biográficos */}
              <EditSection title="Fatos Biográficos (desta sessão)">
                <div>
                  <label className={labelCls}>Informações biográficas reveladas (uma por linha)</label>
                  <textarea value={r.fatos_novos_biograficos.join('\n')} onChange={e => setEditedResumo(prev => ({ ...prev, fatos_novos_biograficos: arrFromLines(e.target.value) }))} rows={3} className={textareaCls} placeholder="Dados de infância, família, marcos de vida..." />
                </div>
              </EditSection>

              {/* Evolução CRP */}
              <EditSection title="Evolução (Prontuário CFP)" defaultOpen>
                <div>
                  <label className={labelCls}>Texto de Evolução</label>
                  <textarea value={r.evolucao_crp} onChange={e => setEditedResumo(prev => ({ ...prev, evolucao_crp: e.target.value }))} rows={6} className={textareaCls} placeholder="Paciente compareceu à sessão de psicoterapia..." />
                </div>
              </EditSection>

              {/* Alertas */}
              <EditSection title="Alertas" defaultOpen>
                <div>
                  <label className={labelCls}>Urgentes (um por linha)</label>
                  <textarea value={r.alertas.urgentes.join('\n')} onChange={e => upd('alertas', 'urgentes', arrFromLines(e.target.value))} rows={2} className={`${textareaCls} border-red-200 focus:border-red-400`} placeholder="Risco iminente..." />
                </div>
                <div>
                  <label className={labelCls}>Atenção (um por linha)</label>
                  <textarea value={r.alertas.atencao.join('\n')} onChange={e => upd('alertas', 'atencao', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Acompanhar (um por linha)</label>
                  <textarea value={r.alertas.acompanhar.join('\n')} onChange={e => upd('alertas', 'acompanhar', arrFromLines(e.target.value))} rows={2} className={textareaCls} />
                </div>
              </EditSection>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          {mode === 'review' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Fechar
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode('edit')}
                  className="px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
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
                  disabled={isApproving}
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
                  setEditedResumo(resumo ? cloneResumo(resumo) : emptyResumo())
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
      </div>
    </div>
  )
}
