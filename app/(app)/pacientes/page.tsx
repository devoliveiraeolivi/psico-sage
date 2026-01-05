import { statusPacienteLabels } from '@/lib/utils'
import { mockPacientes } from '@/lib/mocks'
import Link from 'next/link'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700',
  pausado: 'bg-amber-50 text-amber-700',
  encerrado: 'bg-gray-100 text-gray-600',
}

export default async function PacientesPage() {
  let pacientes = mockPacientes

  if (!useMocks) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar pacientes:', error)
    }
    pacientes = data || []
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus pacientes</p>
        </div>
        <Link
          href="/pacientes/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Novo Paciente
        </Link>
      </div>

      {/* Lista */}
      {pacientes && pacientes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pacientes.map((paciente) => (
            <Link
              key={paciente.id}
              href={`/pacientes/${paciente.id}`}
              className="bg-white rounded-xl border border-border/60 p-5 hover:shadow-md hover:border-border transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-violet-700">
                    {paciente.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[paciente.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusPacienteLabels[paciente.status] || paciente.status}
                </span>
              </div>

              <h3 className="font-medium text-foreground">{paciente.nome}</h3>

              {paciente.data_inicio_terapia && (
                <p className="text-sm text-muted-foreground mt-1">
                  Desde {new Date(paciente.data_inicio_terapia).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                </p>
              )}

              {paciente.resumo?.momento && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {paciente.resumo.momento}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border/60 px-5 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="text-muted-foreground mb-4">Nenhum paciente cadastrado</p>
          <Link
            href="/pacientes/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Cadastrar primeiro paciente
          </Link>
        </div>
      )}
    </div>
  )
}
