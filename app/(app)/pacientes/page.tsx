import { statusPacienteLabels } from '@/lib/utils'
import { mockPacientes } from '@/lib/mocks'
import Link from 'next/link'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pausado: 'bg-amber-50 text-amber-700 border-amber-200',
  encerrado: 'bg-gray-100 text-gray-600 border-gray-200',
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

  const pacientesAtivos = pacientes.filter(p => p.status === 'ativo').length
  const pacientesPausados = pacientes.filter(p => p.status === 'pausado').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground mt-1">
            {pacientesAtivos} ativos{pacientesPausados > 0 ? ` · ${pacientesPausados} pausados` : ''}
          </p>
        </div>
        <Link
          href="/pacientes/novo"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Novo Paciente
        </Link>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2">
        <button className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-900 text-white">
          Todos
        </button>
        <button className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
          Ativos
        </button>
        <button className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
          Pausados
        </button>
      </div>

      {/* Lista de pacientes */}
      {pacientes && pacientes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pacientes.map((paciente) => {
            const resumo = paciente.resumo || {}

            return (
              <Link
                key={paciente.id}
                href={`/pacientes/${paciente.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-gray-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-violet-700">
                      {paciente.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[paciente.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {statusPacienteLabels[paciente.status] || paciente.status}
                  </span>
                </div>

                <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                  {paciente.nome}
                </h3>

                {paciente.data_inicio_terapia && (
                  <p className="text-sm text-gray-500 mt-1">
                    Desde {new Date(paciente.data_inicio_terapia).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </p>
                )}

                {/* Momento atual ou síntese */}
                {(resumo.momento || resumo.sintese) && (
                  <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                    {resumo.momento || resumo.sintese}
                  </p>
                )}

                {/* Tags de diagnósticos/temas */}
                {resumo.diagnosticos && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {resumo.diagnosticos.split(',')[0].trim()}
                    </span>
                  </div>
                )}

                {/* Indicador visual de seta */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Ver ficha</span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum paciente cadastrado</h3>
          <p className="text-gray-500 mb-6">Comece adicionando seu primeiro paciente ao sistema</p>
          <Link
            href="/pacientes/novo"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Cadastrar primeiro paciente
          </Link>
        </div>
      )}
    </div>
  )
}
