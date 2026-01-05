import { createClient } from '@/lib/supabase/server'
import { formatTime } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Busca sessões de hoje
  const { data: sessoesHoje } = await supabase
    .from('sessoes_hoje')
    .select('*')
    .order('data_hora', { ascending: true })

  // Busca pacientes ativos para contagem
  const { count: totalPacientes } = await supabase
    .from('pacientes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ativo')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu dia</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Sessões hoje</p>
          <p className="text-3xl font-bold">{sessoesHoje?.length || 0}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Pacientes ativos</p>
          <p className="text-3xl font-bold">{totalPacientes || 0}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Pendências</p>
          <p className="text-3xl font-bold">-</p>
        </div>
      </div>

      {/* Sessões do dia */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Sessões de Hoje</h2>
        {sessoesHoje && sessoesHoje.length > 0 ? (
          <div className="space-y-2">
            {sessoesHoje.map((sessao) => (
              <Link
                key={sessao.id}
                href={`/sessoes/${sessao.id}`}
                className="block rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sessao.paciente_nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(sessao.data_hora)}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    {sessao.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhuma sessão agendada para hoje.</p>
        )}
      </div>
    </div>
  )
}
