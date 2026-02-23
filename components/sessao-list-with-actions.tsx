'use client'

import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/utils'
import { SessaoQuickActions } from './sessao-quick-actions'

interface SessaoItem {
  id: string
  paciente_id: string
  paciente_nome: string
  paciente_initials: string
  numero_sessao: number | null
  data_hora: string
  duracao_real: number | null
  status: string
  sintese: string | null
}

const statusConfig: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  em_andamento: { label: 'Em Andamento', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  aguardando_aprovacao: { label: 'Validar', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  realizada: { label: 'Realizada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  falta: { label: 'Falta', color: 'bg-red-50 text-red-700 border-red-200' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  remarcada: { label: 'Remarcada', color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export function SessaoListWithActions({ sessoes }: { sessoes: SessaoItem[] }) {
  if (sessoes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </div>
        <p className="text-gray-500">Nenhuma sessão registrada ainda</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {sessoes.map((sessao) => {
        const statusInfo = statusConfig[sessao.status] || statusConfig.agendada

        return (
          <div
            key={sessao.id}
            className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
          >
            <Link
              href={`/sessoes/${sessao.id}`}
              className="flex items-center gap-4 flex-1 min-w-0"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-blue-700">
                  {sessao.paciente_initials}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{sessao.paciente_nome}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {sessao.numero_sessao && `Sessão ${sessao.numero_sessao} · `}
                  {formatDate(sessao.data_hora)}
                  {sessao.duracao_real && ` · ${sessao.duracao_real} min`}
                </div>
              </div>

              {sessao.sintese && (
                <p className="hidden md:block text-sm text-gray-500 max-w-md truncate">
                  {sessao.sintese}
                </p>
              )}
            </Link>

            {/* Quick actions para sessões agendadas */}
            {sessao.status === 'agendada' ? (
              <SessaoQuickActions
                sessaoId={sessao.id}
                status={sessao.status}
                dataHora={sessao.data_hora}
                duracaoPrevista={50}
                pacienteId={sessao.paciente_id}
                pacienteNome={sessao.paciente_nome}
                variant="inline"
              />
            ) : (
              <Link href={`/sessoes/${sessao.id}`}>
                <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
