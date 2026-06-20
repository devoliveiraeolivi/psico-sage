'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SessaoRecomendacoes } from '@/lib/types'
import { useToast } from './toast'

const DISCLAIMER = 'Sugestões de apoio à decisão geradas por IA. A responsabilidade clínica é do profissional. Hipóteses diagnósticas devem ser investigadas, não assumidas.'

export function RecomendacoesTab({
  recomendacoes,
  sessaoId,
}: {
  recomendacoes: SessaoRecomendacoes | null
  sessaoId: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [regenerating, setRegenerating] = useState(false)

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/recomendacoes?force=1`, { method: 'POST' })
      if (!res.ok) {
        toast('Erro ao gerar recomendações. Tente novamente.', 'error')
        setRegenerating(false)
        return
      }
      router.refresh()
    } catch {
      toast('Erro de conexão. Tente novamente.', 'error')
      setRegenerating(false)
    }
  }

  if (!recomendacoes) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm mb-3">As recomendações são geradas após a aprovação do prontuário.</p>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {regenerating ? 'Gerando...' : 'Gerar recomendações'}
        </button>
      </div>
    )
  }

  const r = recomendacoes

  return (
    <div className="space-y-5">
      {/* Alertas clínicos primeiro (segurança) */}
      {r.alertas_clinicos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Alertas Clínicos</div>
          <ul className="space-y-1.5">
            {r.alertas_clinicos.map((a, i) => (
              <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${a.nivel === 'urgente' ? 'bg-red-200 text-red-900' : 'bg-amber-100 text-amber-800'}`}>{a.nivel}</span>
                {a.descricao}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Técnicas sugeridas (por abordagem) */}
      {r.tecnicas_sugeridas.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Técnicas Sugeridas</div>
          <div className="space-y-2">
            {r.tecnicas_sugeridas.map((t, i) => (
              <div key={i} className="p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded">{t.abordagem}</span>
                  <span className="text-sm font-medium text-gray-800">{t.nome}</span>
                </div>
                <p className="text-sm text-gray-600">{t.descricao_curta}</p>
                {t.quando_usar && <p className="text-xs text-gray-400 mt-1">Quando: {t.quando_usar}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hipóteses diagnósticas */}
      {r.hipoteses_diagnosticas.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Hipóteses a Investigar</div>
          <div className="space-y-3">
            {r.hipoteses_diagnosticas.map((h, i) => (
              <div key={i} className="p-3 rounded-lg border border-violet-100 bg-violet-50/40">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">{h.sistema}</span>
                  <span className="text-sm font-medium text-gray-800">{h.hipotese}</span>
                </div>
                {h.sinais_observados.length > 0 && <p className="text-xs text-gray-500 mt-1"><strong>Sinais:</strong> {h.sinais_observados.join('; ')}</p>}
                {h.criterios_a_confirmar.length > 0 && <p className="text-xs text-gray-500 mt-1"><strong>Confirmar:</strong> {h.criterios_a_confirmar.join('; ')}</p>}
                {h.perguntas_rastreio.length > 0 && <p className="text-xs text-gray-500 mt-1"><strong>Rastreio:</strong> {h.perguntas_rastreio.join(' / ')}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalas sugeridas */}
      {r.escalas_sugeridas.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Escalas / Instrumentos</div>
          <ul className="space-y-1.5">
            {r.escalas_sugeridas.map((e, i) => (
              <li key={i} className="text-sm text-gray-700"><strong>{e.nome}</strong> — {e.objetivo}{e.quando_aplicar ? ` (${e.quando_aplicar})` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Psicoeducação */}
      {r.psicoeducacao.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Psicoeducação</div>
          <ul className="space-y-1.5">
            {r.psicoeducacao.map((p, i) => (
              <li key={i} className="text-sm text-gray-700"><strong>{p.tema}</strong> — {p.descricao_curta}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Condução da próxima sessão */}
      {r.conducao_proxima_sessao.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Para a Próxima Sessão</div>
          <ul className="space-y-1.5">
            {r.conducao_proxima_sessao.map((c, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded shrink-0">{c.tipo}</span>
                {c.conteudo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer + Regerar */}
      <div className="pt-3 border-t border-gray-100 flex items-start justify-between gap-3">
        <p className="text-xs text-gray-400 italic flex-1">{DISCLAIMER}</p>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0 disabled:opacity-50"
        >
          {regenerating ? 'Gerando...' : 'Regerar'}
        </button>
      </div>
    </div>
  )
}
