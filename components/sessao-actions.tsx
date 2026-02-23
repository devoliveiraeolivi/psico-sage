'use client'

import { useState } from 'react'
import { ApprovalModal } from './approval-modal'
import type { SessaoResumo } from '@/lib/types'

interface SessaoActionsProps {
  sessaoId: string
  status: string
  resumo: SessaoResumo | null
  pacienteNome: string
  numeroSessao: number | null
  dataHora: string
}

export function SessaoActionsBar({
  sessaoId,
  status,
  resumo,
  pacienteNome,
  numeroSessao,
  dataHora,
}: SessaoActionsProps) {
  const [open, setOpen] = useState(false)

  if (status !== 'aguardando_aprovacao') {
    return null
  }

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-800">Prontuário gerado pela IA</p>
            <p className="text-xs text-amber-600">Revise e aprove ou edite antes de salvar</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-3.5 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shrink-0 flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
          Revisar e Aprovar
        </button>
      </div>

      <ApprovalModal
        open={open}
        onClose={() => setOpen(false)}
        sessaoId={sessaoId}
        resumo={resumo}
        pacienteNome={pacienteNome}
        numeroSessao={numeroSessao}
        dataHora={dataHora}
      />
    </>
  )
}
