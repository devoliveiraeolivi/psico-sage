import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PendentesColumn } from '@/components/pendentes-column'
import type { Sessao } from '@/lib/types'
import { decryptJsonField } from '@/lib/supabase/encrypt'
import { PageTourWrapper } from '@/components/page-tour-wrapper'

const statusConfig: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  em_andamento: { label: 'Em Andamento', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  aguardando_aprovacao: { label: 'Validar', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  realizada: { label: 'Realizada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  falta: { label: 'Falta', color: 'bg-red-50 text-red-700 border-red-200' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  remarcada: { label: 'Remarcada', color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export default async function SessoesPage() {
  const supabase = await createClient()

  const { data: s } = await (supabase as any)
    .from('sessoes')
    .select('id, numero_sessao, data_hora, duracao_prevista, duracao_real, status, paciente_id, recording_status, processing_error, resumo')
    .order('data_hora', { ascending: false })
    .limit(100) as { data: Sessao[] | null }

  const { data: p } = await (supabase as any)
    .from('pacientes')
    .select('id, nome') as { data: { id: string; nome: string }[] | null }

  const sessoes = (s || []).map(sessao => {
    if (sessao.resumo) (sessao as any).resumo = decryptJsonField(sessao.resumo)
    return sessao
  })
  const pacientes = p || []
  const pacienteMap = new Map(pacientes.map(p => [p.id, p]))

  const finalizadas = sessoes.filter(s =>
    ['realizada', 'falta', 'cancelada', 'em_andamento'].includes(s.status)
  )

  const futuras = sessoes
    .filter(s => ['agendada', 'remarcada'].includes(s.status))
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))

  const pendentes = sessoes.filter(s => s.status === 'aguardando_aprovacao')
  const pendentesData = pendentes.map(s => ({
    id: s.id,
    resumo: s.resumo,
    pacienteNome: pacienteMap.get(s.paciente_id)?.nome || 'Paciente',
    numeroSessao: s.numero_sessao,
    dataHora: s.data_hora,
    sintese: s.resumo?.resumo?.sintese || null,
  }))

  function getInitials(nome: string) {
    return nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 overflow-hidden">
      <PageTourWrapper pageId="sessoes" />
      {/* Header */}
      <div id="sessoes-header" className="flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessões</h1>
          <p className="text-muted-foreground mt-1">
            {finalizadas.length} finalizadas · {futuras.length} agendadas · {pendentes.length} aguardando aprovação
          </p>
        </div>
        <Link
          href="/agenda/nova"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nova Sessão
        </Link>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Finalizadas */}
        <div id="finalizadas-column" className="flex flex-col min-h-0 bg-gray-50/50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900">Finalizadas</h2>
            {finalizadas.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                {finalizadas.length}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {finalizadas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Nenhuma sessão finalizada</p>
              </div>
            ) : (
              finalizadas.map((sessao) => {
                const paciente = pacienteMap.get(sessao.paciente_id)
                const nome = paciente?.nome || 'Paciente'
                const statusInfo = statusConfig[sessao.status] || statusConfig.realizada
                return (
                  <Link
                    key={sessao.id}
                    href={`/sessoes/${sessao.id}`}
                    className="block bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-slate-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-gray-600">
                          {getInitials(nome)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{nome}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {sessao.numero_sessao && `#${sessao.numero_sessao} · `}
                          {formatDate(sessao.data_hora)}
                          {sessao.duracao_real && ` · ${sessao.duracao_real} min`}
                        </p>
                        {sessao.resumo?.resumo?.sintese && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{sessao.resumo.resumo.sintese}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Futuras */}
        <div id="futuras-column" className="flex flex-col min-h-0 bg-blue-50/30 rounded-xl border border-blue-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-blue-100 flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900">Futuras</h2>
            {futuras.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                {futuras.length}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {futuras.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Nenhuma sessão agendada</p>
              </div>
            ) : (
              futuras.map((sessao) => {
                const paciente = pacienteMap.get(sessao.paciente_id)
                const nome = paciente?.nome || 'Paciente'
                const statusInfo = statusConfig[sessao.status] || statusConfig.agendada
                return (
                  <Link
                    key={sessao.id}
                    href={`/sessoes/${sessao.id}`}
                    className="block bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-blue-700">
                          {getInitials(nome)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{nome}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {sessao.numero_sessao && `#${sessao.numero_sessao} · `}
                          {formatDateTime(sessao.data_hora)}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Aguardando Aprovação */}
        <div id="aprovacao-column" className="flex flex-col min-h-0 bg-amber-50/30 rounded-xl border border-amber-100 overflow-hidden md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <h2 className="text-sm font-semibold text-gray-900">Aguardando Aprovação</h2>
            {pendentes.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                {pendentes.length}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            <PendentesColumn sessoes={pendentesData} />
          </div>
        </div>
      </div>
    </div>
  )
}
