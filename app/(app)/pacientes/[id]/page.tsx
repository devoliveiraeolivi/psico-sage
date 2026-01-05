import { mockPacientes, mockSessoes } from '@/lib/mocks'
import { formatDate, statusPacienteColors, statusPacienteLabels, calcularIdade } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

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
      .limit(10)

    paciente = p
    sessoes = s || []
  }

  if (!paciente) {
    notFound()
  }

  const resumo = paciente.resumo || {}
  const historico = paciente.historico || {}

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{paciente.nome}</h1>
            <span className={`text-xs px-2 py-1 rounded-full ${statusPacienteColors[paciente.status]}`}>
              {statusPacienteLabels[paciente.status]}
            </span>
          </div>
          <div className="text-muted-foreground mt-1 space-x-4">
            {paciente.data_nascimento && (
              <span>{calcularIdade(paciente.data_nascimento)} anos</span>
            )}
            {paciente.data_inicio_terapia && (
              <span>Em terapia desde {formatDate(paciente.data_inicio_terapia)}</span>
            )}
          </div>
        </div>
        <Link
          href="/pacientes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Voltar
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal - Resumo */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estado Atual */}
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Estado Atual</h2>

            {resumo.sintese && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">Síntese</p>
                <p className="mt-1">{resumo.sintese}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {resumo.humor && (
                <div>
                  <p className="text-sm text-muted-foreground">Humor</p>
                  <p className="mt-1">{resumo.humor}</p>
                </div>
              )}
              {resumo.momento && (
                <div>
                  <p className="text-sm text-muted-foreground">Momento</p>
                  <p className="mt-1">{resumo.momento}</p>
                </div>
              )}
              {resumo.diagnosticos && (
                <div>
                  <p className="text-sm text-muted-foreground">Diagnósticos</p>
                  <p className="mt-1">{resumo.diagnosticos}</p>
                </div>
              )}
              {resumo.conflitos && (
                <div>
                  <p className="text-sm text-muted-foreground">Conflitos Atuais</p>
                  <p className="mt-1">{resumo.conflitos}</p>
                </div>
              )}
              {resumo.traumas && (
                <div>
                  <p className="text-sm text-muted-foreground">Traumas</p>
                  <p className="mt-1">{resumo.traumas}</p>
                </div>
              )}
              {resumo.padroes && (
                <div>
                  <p className="text-sm text-muted-foreground">Padrões</p>
                  <p className="mt-1">{resumo.padroes}</p>
                </div>
              )}
              {resumo.gatilhos && (
                <div>
                  <p className="text-sm text-muted-foreground">Gatilhos</p>
                  <p className="mt-1">{resumo.gatilhos}</p>
                </div>
              )}
              {resumo.recursos && (
                <div>
                  <p className="text-sm text-muted-foreground">Recursos</p>
                  <p className="mt-1">{resumo.recursos}</p>
                </div>
              )}
            </div>

            {resumo.tarefas && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Tarefas Atuais</p>
                <p className="mt-1">{resumo.tarefas}</p>
              </div>
            )}

            {resumo.alertas && resumo.alertas !== 'nenhum no momento' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm font-medium text-yellow-800">Alertas</p>
                <p className="mt-1 text-yellow-700">{resumo.alertas}</p>
              </div>
            )}
          </div>

          {/* Histórico / Timeline */}
          {Object.keys(historico).length > 0 && (
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Histórico Evolutivo</h2>
              <div className="space-y-4">
                {Object.entries(historico).map(([tema, items]) => (
                  <div key={tema}>
                    <p className="text-sm font-medium capitalize">{tema}</p>
                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted">
                      {(items as Array<{data: string; valor: string; acao?: string}>)?.map((item, i) => (
                        <div key={i} className="text-sm">
                          <span className="text-muted-foreground">{formatDate(item.data)}</span>
                          {item.acao && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted">
                              {item.acao}
                            </span>
                          )}
                          <p className="mt-0.5">{item.valor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna lateral - Sessões */}
        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Sessões Recentes</h2>
              <span className="text-sm text-muted-foreground">{sessoes.length}</span>
            </div>

            {sessoes.length > 0 ? (
              <div className="space-y-3">
                {sessoes.map((sessao) => (
                  <Link
                    key={sessao.id}
                    href={`/sessoes/${sessao.id}`}
                    className="block p-3 rounded-md border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Sessão {sessao.numero_sessao}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(sessao.data_hora)}
                      </span>
                    </div>
                    {sessao.resumo?.sintese && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {sessao.resumo.sintese}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sessão registrada.</p>
            )}
          </div>

          {/* Contato */}
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Contato</h2>
            <div className="space-y-2 text-sm">
              {paciente.email && (
                <p><span className="text-muted-foreground">Email:</span> {paciente.email}</p>
              )}
              {paciente.telefone && (
                <p><span className="text-muted-foreground">Tel:</span> {paciente.telefone}</p>
              )}
            </div>
          </div>

          {/* Notas */}
          {paciente.notas && (
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Notas</h2>
              <p className="text-sm whitespace-pre-wrap">{paciente.notas}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
