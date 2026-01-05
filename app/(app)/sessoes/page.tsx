import { mockSessoes, mockPacientes } from '@/lib/mocks'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

const statusConfig: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  aguardando_aprovacao: { label: 'Validar', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  realizada: { label: 'Realizada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  falta: { label: 'Falta', color: 'bg-red-50 text-red-700 border-red-200' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  remarcada: { label: 'Remarcada', color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export default async function SessoesPage() {
  let sessoes = mockSessoes
  let pacientes = mockPacientes

  if (!useMocks) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: s } = await supabase
      .from('sessoes')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(50)

    const { data: p } = await supabase
      .from('pacientes')
      .select('id, nome')

    sessoes = s || []
    pacientes = p || []
  }

  // Criar mapa de pacientes para lookup rápido
  const pacienteMap = new Map(pacientes.map(p => [p.id, p]))

  // Separar sessões pendentes de validação
  const sessoesPendentes = sessoes.filter(s => s.status === 'aguardando_aprovacao')
  const sessoesRecentes = sessoes.filter(s => s.status !== 'aguardando_aprovacao')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessões</h1>
          <p className="text-muted-foreground mt-1">
            {sessoesPendentes.length > 0
              ? `${sessoesPendentes.length} sessões aguardando validação`
              : 'Histórico de sessões realizadas'
            }
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

      {/* Sessões Pendentes de Validação */}
      {sessoesPendentes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <h2 className="text-sm font-semibold text-gray-900">Aguardando Validação</h2>
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
              {sessoesPendentes.length}
            </span>
          </div>

          <div className="space-y-3">
            {sessoesPendentes.map((sessao) => {
              const paciente = pacienteMap.get(sessao.paciente_id)
              const resumo = sessao.resumo

              return (
                <Link
                  key={sessao.id}
                  href={`/sessoes/${sessao.id}`}
                  className="block bg-amber-50 rounded-xl border border-amber-200 p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-gray-900">{paciente?.nome || 'Paciente'}</span>
                        <span className="text-sm text-gray-500">
                          {'numero_sessao' in sessao && sessao.numero_sessao && `Sessão ${sessao.numero_sessao} · `}
                          {formatDateTime(sessao.data_hora)}
                        </span>
                      </div>

                      {resumo?.sintese && (
                        <p className="text-sm text-amber-800 line-clamp-2">{resumo.sintese}</p>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-medium text-amber-700 bg-white px-2 py-1 rounded border border-amber-200">
                          Revisar e aprovar resumo gerado por IA
                        </span>
                      </div>
                    </div>

                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Sessões Recentes */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Sessões Recentes</h2>

        {sessoesRecentes.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {sessoesRecentes.map((sessao) => {
              const paciente = pacienteMap.get(sessao.paciente_id)
              const statusInfo = statusConfig[sessao.status] || statusConfig.agendada
              const resumo = sessao.resumo

              return (
                <Link
                  key={sessao.id}
                  href={`/sessoes/${sessao.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-blue-700">
                        {paciente?.nome.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{paciente?.nome || 'Paciente'}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {'numero_sessao' in sessao && sessao.numero_sessao && `Sessão ${sessao.numero_sessao} · `}
                        {formatDate(sessao.data_hora)}
                        {'duracao_real' in sessao && sessao.duracao_real && ` · ${sessao.duracao_real} min`}
                      </div>
                    </div>

                    {resumo?.sintese && (
                      <p className="hidden md:block text-sm text-gray-500 max-w-md truncate">
                        {resumo.sintese}
                      </p>
                    )}

                    <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-gray-500">Nenhuma sessão registrada ainda</p>
          </div>
        )}
      </div>
    </div>
  )
}
