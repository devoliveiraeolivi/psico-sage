import { mockPacientes, mockSessoes } from '@/lib/mocks'
import { formatDate, statusPacienteLabels, calcularIdade } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PacienteTabs } from '@/components/paciente-tabs'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pausado: 'bg-amber-50 text-amber-700 border-amber-200',
  encerrado: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default async function PacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let paciente = mockPacientes.find(p => p.id === id) || null
  let sessoes = mockSessoes.filter(s => s.paciente_id === id)

  if (!useMocks) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: p } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single()

    const { data: s } = await supabase
      .from('sessoes')
      .select('*')
      .eq('paciente_id', id)
      .order('data_hora', { ascending: false })
      .limit(20)

    paciente = p
    sessoes = s || []
  }

  if (!paciente) {
    notFound()
  }

  const resumo = paciente.resumo || {}
  const historico = paciente.historico || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
            <span className="text-lg font-semibold text-violet-700">
              {paciente.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{paciente.nome}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[paciente.status]}`}>
                {statusPacienteLabels[paciente.status]}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-3">
              {paciente.data_nascimento && (
                <span>{calcularIdade(paciente.data_nascimento)} anos</span>
              )}
              {paciente.data_inicio_terapia && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>Em terapia desde {formatDate(paciente.data_inicio_terapia)}</span>
                </>
              )}
              {sessoes.length > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{sessoes.length} sessões</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/pacientes/${id}/editar`}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Editar
          </Link>
          <Link
            href="/pacientes"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      {/* Síntese - card destacado */}
      {resumo.sintese && (
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
            Síntese Clínica
          </div>
          <p className="text-gray-700 leading-relaxed">{resumo.sintese}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal - Tabs */}
        <div className="lg:col-span-2">
          <PacienteTabs
            resumo={resumo}
            historico={historico}
            sessoes={sessoes}
          />
        </div>

        {/* Coluna lateral */}
        <div className="space-y-5">
          {/* Sessões Recentes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Sessões Recentes</h2>
              <span className="text-xs text-gray-400">{sessoes.length} total</span>
            </div>

            {sessoes.length > 0 ? (
              <div className="space-y-2">
                {sessoes.slice(0, 5).map((sessao) => (
                  <Link
                    key={sessao.id}
                    href={`/sessoes/${sessao.id}`}
                    className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        Sessão {sessao.numero_sessao}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(sessao.data_hora)}
                      </span>
                    </div>
                    {sessao.resumo?.sintese && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {sessao.resumo.sintese}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhuma sessão registrada</p>
            )}
          </div>

          {/* Contato */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Contato</h2>
            <div className="space-y-3">
              {paciente.email && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <span className="text-gray-600">{paciente.email}</span>
                </div>
              )}
              {paciente.telefone && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </div>
                  <span className="text-gray-600">{paciente.telefone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notas */}
          {paciente.notas && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Notas</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{paciente.notas}</p>
            </div>
          )}

          {/* Agendar nova sessão */}
          <Link
            href={`/agenda/nova?paciente=${id}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agendar Sessão
          </Link>
        </div>
      </div>
    </div>
  )
}
