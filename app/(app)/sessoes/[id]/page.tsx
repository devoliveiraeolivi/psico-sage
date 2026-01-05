import { mockSessoes, mockSessoesHoje, mockPacientes } from '@/lib/mocks'
import { formatDateTime, statusSessaoColors, statusSessaoLabels } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

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
  const jaRealizada = sessao.status === 'realizada' || sessao.status === 'aguardando_aprovacao'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              Sessão {'numero_sessao' in sessao ? sessao.numero_sessao : ''} - {paciente?.nome || 'Paciente'}
            </h1>
            <span className={`text-xs px-2 py-1 rounded-full ${statusSessaoColors[sessao.status]}`}>
              {statusSessaoLabels[sessao.status]}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            {formatDateTime(sessao.data_hora)}
            {'duracao_real' in sessao && sessao.duracao_real && ` - ${sessao.duracao_real} min`}
          </p>
        </div>
        <div className="flex gap-2">
          {paciente && (
            <Link
              href={`/pacientes/${paciente.id}`}
              className="text-sm px-3 py-1.5 rounded-md border hover:bg-accent"
            >
              Ver Paciente
            </Link>
          )}
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Voltar
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Preparação (Pré-sessão) */}
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Preparação (Pré-sessão)
          </h2>

          {preparacao ? (
            <div className="space-y-4">
              {preparacao.contexto && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contexto</p>
                  <p className="mt-1">{preparacao.contexto}</p>
                </div>
              )}

              {preparacao.pontos_retomar && preparacao.pontos_retomar.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pontos a Retomar</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    {preparacao.pontos_retomar.map((ponto, i) => (
                      <li key={i}>{ponto}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preparacao.tarefas_pendentes && preparacao.tarefas_pendentes.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tarefas Pendentes</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    {preparacao.tarefas_pendentes.map((tarefa, i) => (
                      <li key={i}>{tarefa}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preparacao.perguntas_sugeridas && preparacao.perguntas_sugeridas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Perguntas Sugeridas</p>
                  <ul className="mt-1 space-y-2">
                    {preparacao.perguntas_sugeridas.map((pergunta, i) => (
                      <li key={i} className="p-2 bg-muted rounded text-sm italic">
                        &ldquo;{pergunta}&rdquo;
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preparacao.sugestoes && preparacao.sugestoes.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sugestões</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    {preparacao.sugestoes.map((sugestao, i) => (
                      <li key={i}>{sugestao}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preparacao.alertas && preparacao.alertas.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm font-medium text-yellow-800">Alertas</p>
                  <ul className="mt-1 space-y-1 text-yellow-700">
                    {preparacao.alertas.map((alerta, i) => (
                      <li key={i}>{alerta}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Preparação ainda não gerada.</p>
          )}
        </div>

        {/* Resumo (Pós-sessão) */}
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${jaRealizada ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            Resumo (Pós-sessão)
          </h2>

          {resumo ? (
            <div className="space-y-4">
              {resumo.sintese && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Síntese</p>
                  <p className="mt-1">{resumo.sintese}</p>
                </div>
              )}

              {resumo.humor && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Humor</p>
                  <p className="mt-1">{resumo.humor}</p>
                </div>
              )}

              {resumo.temas && resumo.temas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Temas Abordados</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {resumo.temas.map((tema, i) => (
                      <span key={i} className="px-2 py-0.5 bg-muted rounded text-sm">
                        {tema}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {resumo.insights && resumo.insights.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Insights</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    {resumo.insights.map((insight, i) => (
                      <li key={i}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {resumo.pontos_importantes && resumo.pontos_importantes.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pontos Importantes</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    {resumo.pontos_importantes.map((ponto, i) => (
                      <li key={i}>{ponto}</li>
                    ))}
                  </ul>
                </div>
              )}

              {resumo.tarefas && resumo.tarefas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tarefas para Próxima Sessão</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    {resumo.tarefas.map((tarefa, i) => (
                      <li key={i}>{tarefa}</li>
                    ))}
                  </ul>
                </div>
              )}

              {resumo.alertas && resumo.alertas.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm font-medium text-yellow-800">Alertas</p>
                  <ul className="mt-1 space-y-1 text-yellow-700">
                    {resumo.alertas.map((alerta, i) => (
                      <li key={i}>{alerta}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {jaRealizada ? 'Resumo sendo processado...' : 'Sessão ainda não realizada.'}
            </p>
          )}
        </div>
      </div>

      {/* Transcrição */}
      {'integra' in sessao && sessao.integra && (
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Transcrição Completa</h2>
          <div className="p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono">{sessao.integra}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
