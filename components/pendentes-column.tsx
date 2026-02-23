'use client'

import { useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import { ApprovalModal } from './approval-modal'
import type { SessaoResumo } from '@/lib/types'

interface PendenteSessao {
  id: string
  resumo: SessaoResumo | null
  pacienteNome: string
  numeroSessao: number | null
  dataHora: string
  sintese: string | null
}

export function PendentesColumn({ sessoes }: { sessoes: PendenteSessao[] }) {
  const [selected, setSelected] = useState<PendenteSessao | null>(null)

  return (
    <>
      {sessoes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">Nenhuma sessão pendente</p>
        </div>
      ) : (
        sessoes.map((sessao) => (
          <button
            key={sessao.id}
            onClick={() => setSelected(sessao)}
            className="w-full text-left bg-white rounded-lg border border-amber-100 p-3 hover:shadow-sm hover:border-amber-200 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{sessao.pacienteNome}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {sessao.numeroSessao && `#${sessao.numeroSessao} · `}
                  {formatDateTime(sessao.dataHora)}
                </p>
                {sessao.sintese && (
                  <p className="text-xs text-amber-800 mt-1.5 line-clamp-2">{sessao.sintese}</p>
                )}
                <span className="inline-block mt-2 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Revisar resumo IA
                </span>
              </div>
            </div>
          </button>
        ))
      )}

      {selected && (
        <ApprovalModal
          open={true}
          onClose={() => setSelected(null)}
          sessaoId={selected.id}
          resumo={selected.resumo}
          pacienteNome={selected.pacienteNome}
          numeroSessao={selected.numeroSessao}
          dataHora={selected.dataHora}
        />
      )}
    </>
  )
}
