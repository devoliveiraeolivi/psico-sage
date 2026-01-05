import { mockPacientes } from '@/lib/mocks'
import Link from 'next/link'
import { PacientesList } from '@/components/pacientes-list'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

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

      {/* Lista com busca e filtros */}
      {pacientes && pacientes.length > 0 ? (
        <PacientesList pacientes={pacientes} />
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
