'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ApprovalModal } from './approval-modal'
import type { SessaoResumo } from '@/lib/types'

interface PendenteSessao {
  id: string
  resumo: SessaoResumo | null
  pacienteNome: string
  numeroSessao: number | null
  dataHora: string
}

export function ValidarResumosSidebar({ sessoes }: { sessoes: PendenteSessao[] }) {
  const [selected, setSelected] = useState<PendenteSessao | null>(null)

  if (sessoes.length === 0) return null

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <h2 className="text-sm font-semibold text-gray-900">Validar Resumos</h2>
          </div>
          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
            {sessoes.length}
          </span>
        </div>
        <div className="space-y-2">
          {sessoes.slice(0, 3).map((sessao) => (
            <button
              key={sessao.id}
              onClick={() => setSelected(sessao)}
              className="w-full text-left p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{sessao.pacienteNome}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
              <p className="text-xs text-gray-500">
                {sessao.numeroSessao && `Sessão ${sessao.numeroSessao} · `}
                {formatDate(sessao.dataHora)}
              </p>
            </button>
          ))}
        </div>
        {sessoes.length > 3 && (
          <Link
            href="/sessoes"
            className="block mt-3 text-center text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            Ver todas ({sessoes.length}) →
          </Link>
        )}
      </div>

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
