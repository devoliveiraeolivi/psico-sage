import { formatTime } from '@/lib/utils'
import { mockSessoesHoje, mockPacientes } from '@/lib/mocks'
import Link from 'next/link'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

export default async function DashboardPage() {
  let sessoesHoje = mockSessoesHoje
  let totalPacientes = mockPacientes.filter(p => p.status === 'ativo').length

  if (!useMocks) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data } = await supabase
      .from('sessoes_hoje')
      .select('*')
      .order('data_hora', { ascending: true })

    const { count } = await supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')

    sessoesHoje = data || []
    totalPacientes = count || 0
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do seu dia</p>
      </div>

      {/* Métricas */}
      <div className="grid gap-5 sm:grid-cols-3">
        <MetricCard label="Sessões hoje" value={sessoesHoje?.length || 0} />
        <MetricCard label="Pacientes ativos" value={totalPacientes || 0} />
        <MetricCard label="Pendências" value="-" />
      </div>

      {/* Sessões */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Sessões de Hoje
        </h2>

        {sessoesHoje && sessoesHoje.length > 0 ? (
          <div className="bg-white rounded-xl border border-border/60 divide-y divide-border/60">
            {sessoesHoje.map((sessao) => (
              <Link
                key={sessao.id}
                href={`/sessoes/${sessao.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-700">
                      {sessao.paciente_nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{sessao.paciente_nome}</p>
                    <p className="text-sm text-muted-foreground">{formatTime(sessao.data_hora)}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  {sessao.status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border/60 px-5 py-12 text-center">
            <p className="text-muted-foreground">Nenhuma sessão agendada para hoje</p>
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-border/60 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tracking-tight mt-1">{value}</p>
    </div>
  )
}
