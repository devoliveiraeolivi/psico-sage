import { createClient } from '@/lib/supabase/server'
import { statusPacienteColors, statusPacienteLabels } from '@/lib/utils'
import Link from 'next/link'

export default async function PacientesPage() {
  const supabase = await createClient()

  const { data: pacientes, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar pacientes:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie seus pacientes</p>
        </div>
        <Link
          href="/pacientes/novo"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Novo Paciente
        </Link>
      </div>

      {pacientes && pacientes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pacientes.map((paciente) => (
            <Link
              key={paciente.id}
              href={`/pacientes/${paciente.id}`}
              className="block rounded-lg border p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{paciente.nome}</p>
                  {paciente.data_inicio_terapia && (
                    <p className="text-sm text-muted-foreground">
                      Desde {new Date(paciente.data_inicio_terapia).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    statusPacienteColors[paciente.status] || 'bg-gray-100'
                  }`}
                >
                  {statusPacienteLabels[paciente.status] || paciente.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Nenhum paciente cadastrado.</p>
          <Link
            href="/pacientes/novo"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Cadastrar primeiro paciente
          </Link>
        </div>
      )}
    </div>
  )
}
