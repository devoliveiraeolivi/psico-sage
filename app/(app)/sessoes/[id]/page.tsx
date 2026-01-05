import { mockSessoes, mockSessoesHoje, mockPacientes } from '@/lib/mocks'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SessaoTabs, ContextoPacienteSidebar } from '@/components/sessao-tabs'
import { SessaoActionsBar } from '@/components/sessao-actions'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

const statusConfig: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  realizada: { label: 'Realizada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  falta: { label: 'Falta', color: 'bg-red-50 text-red-700 border-red-200' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  remarcada: { label: 'Remarcada', color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export default async function SessaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Busca em todos os mocks
  let sessao = mockSessoes.find(s => s.id === id) ||
               mockSessoesHoje.find(s => s.id === id) as typeof mockSessoes[0] | undefined

  let paciente = sessao ? mockPacientes.find(p => p.id === sessao!.paciente_id) : null

  if (!useMocks) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: s } = await supabase
      .from('sessoes')
      .select('*, pacientes(*)')
      .eq('id', id)
      .single()

    if (s) {
      sessao = s
      paciente = s.pacientes
    }
  }

  if (!sessao) {
    notFound()
  }

  const preparacao = sessao.preparacao
  const resumo = sessao.resumo
  const pacienteResumo = paciente?.resumo || {}
  const jaRealizada = sessao.status === 'realizada' || sessao.status === 'aguardando_aprovacao'
  const statusInfo = statusConfig[sessao.status] || statusConfig.agendada

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
            <span className="text-base font-semibold text-blue-700">
              {paciente?.nome.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">
                {'numero_sessao' in sessao && sessao.numero_sessao
                  ? `Sessão ${sessao.numero_sessao}`
                  : 'Sessão'
                } — {paciente?.nome || 'Paciente'}
              </h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-3">
              <span>{formatDateTime(sessao.data_hora)}</span>
              {'duracao_real' in sessao && sessao.duracao_real && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{sessao.duracao_real} minutos</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {paciente && (
            <Link
              href={`/pacientes/${paciente.id}`}
              className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Ver Ficha Completa
            </Link>
          )}
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      {/* Barra de ações para sessões aguardando aprovação */}
      <SessaoActionsBar
        sessaoId={id}
        status={sessao.status}
        resumo={resumo ?? null}
      />

      {/* Main Content - Tabs + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tabs - coluna principal */}
        <div className="lg:col-span-2">
          <SessaoTabs
            preparacao={preparacao ?? null}
            resumo={resumo ?? null}
            integra={'integra' in sessao ? sessao.integra ?? null : null}
            jaRealizada={jaRealizada}
          />
        </div>

        {/* Sidebar - Contexto do Paciente */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
            Contexto do Paciente
          </div>
          <ContextoPacienteSidebar
            pacienteResumo={pacienteResumo}
            pacienteHistorico={paciente?.historico}
          />
        </div>
      </div>
    </div>
  )
}
