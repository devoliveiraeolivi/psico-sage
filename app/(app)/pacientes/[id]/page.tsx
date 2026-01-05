import { mockPacientes, mockSessoes } from '@/lib/mocks'
import { formatDate, statusPacienteLabels, calcularIdade } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-5">
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

          {/* Estado Atual - grid de cards com ícones coloridos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">Estado Atual</h2>
              <span className="text-xs text-gray-400">Atualizado na última sessão</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {resumo.humor && (
                <InfoCard
                  label="Humor"
                  value={resumo.humor}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  icon={<MoodIcon />}
                />
              )}
              {resumo.momento && (
                <InfoCard
                  label="Momento"
                  value={resumo.momento}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  icon={<MomentoIcon />}
                />
              )}
              {resumo.diagnosticos && (
                <InfoCard
                  label="Diagnósticos"
                  value={resumo.diagnosticos}
                  iconBg="bg-violet-50"
                  iconColor="text-violet-600"
                  icon={<DiagIcon />}
                />
              )}
              {resumo.conflitos && (
                <InfoCard
                  label="Conflitos Atuais"
                  value={resumo.conflitos}
                  iconBg="bg-orange-50"
                  iconColor="text-orange-600"
                  icon={<ConflictIcon />}
                />
              )}
              {resumo.traumas && (
                <InfoCard
                  label="Traumas"
                  value={resumo.traumas}
                  iconBg="bg-rose-50"
                  iconColor="text-rose-600"
                  icon={<TraumaIcon />}
                />
              )}
              {resumo.padroes && (
                <InfoCard
                  label="Padrões"
                  value={resumo.padroes}
                  iconBg="bg-indigo-50"
                  iconColor="text-indigo-600"
                  icon={<PatternIcon />}
                />
              )}
              {resumo.gatilhos && (
                <InfoCard
                  label="Gatilhos"
                  value={resumo.gatilhos}
                  iconBg="bg-red-50"
                  iconColor="text-red-500"
                  icon={<TriggerIcon />}
                />
              )}
              {resumo.recursos && (
                <InfoCard
                  label="Recursos"
                  value={resumo.recursos}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  icon={<ResourceIcon />}
                />
              )}
            </div>

            {/* Tarefas */}
            {resumo.tarefas && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <div className="w-5 h-5 rounded bg-sky-50 flex items-center justify-center">
                    <svg className="w-3 h-3 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Tarefas em Andamento
                </div>
                <p className="text-sm text-gray-600 pl-7">{resumo.tarefas}</p>
              </div>
            )}
          </div>

          {/* Alerta - se houver */}
          {resumo.alertas && resumo.alertas !== 'nenhum no momento' && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Atenção
              </div>
              <p className="text-sm text-amber-800">{resumo.alertas}</p>
            </div>
          )}

          {/* Histórico Evolutivo */}
          {Object.keys(historico).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-5">Histórico Evolutivo</h2>

              <div className="space-y-4">
                {historico.marcos && historico.marcos.length > 0 && (
                  <TimelineSection
                    title="Marcos"
                    items={historico.marcos}
                    tagClass="bg-emerald-50 text-emerald-700"
                  />
                )}
                {historico.insights && historico.insights.length > 0 && (
                  <TimelineSection
                    title="Insights"
                    items={historico.insights}
                    tagClass="bg-blue-50 text-blue-700"
                  />
                )}
                {historico.humor && historico.humor.length > 0 && (
                  <TimelineSection
                    title="Humor"
                    items={historico.humor}
                    tagClass="bg-purple-50 text-purple-700"
                  />
                )}
                {historico.conflitos && historico.conflitos.length > 0 && (
                  <TimelineSection
                    title="Conflitos"
                    items={historico.conflitos}
                    tagClass="bg-orange-50 text-orange-700"
                  />
                )}
                {historico.traumas && historico.traumas.length > 0 && (
                  <TimelineSection
                    title="Traumas"
                    items={historico.traumas}
                    tagClass="bg-red-50 text-red-700"
                  />
                )}
                {historico.tarefas && historico.tarefas.length > 0 && (
                  <TimelineSection
                    title="Tarefas"
                    items={historico.tarefas}
                    tagClass="bg-gray-100 text-gray-700"
                  />
                )}
              </div>
            </div>
          )}
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

// Componentes auxiliares

function InfoCard({
  label,
  value,
  icon,
  iconBg,
  iconColor
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="p-3.5 rounded-lg bg-gray-50/50 border border-gray-100">
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-6 h-6 rounded-md ${iconBg} flex items-center justify-center`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-sm text-gray-700 pl-8.5">{value}</p>
    </div>
  )
}

function TimelineSection({
  title,
  items,
  tagClass
}: {
  title: string
  items: Array<{ data: string; valor: string; acao?: string }>
  tagClass: string
}) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-2 pl-3 border-l-2 border-gray-100">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="text-gray-400 text-xs w-16 flex-shrink-0 pt-0.5">
              {formatDate(item.data)}
            </span>
            <div className="flex-1">
              <span className="text-gray-700">{item.valor}</span>
              {item.acao && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${tagClass}`}>
                  {item.acao}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Icons - agora menores para caber no quadradinho
function MoodIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
    </svg>
  )
}

function MomentoIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function DiagIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  )
}

function ConflictIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )
}

function TraumaIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function PatternIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
    </svg>
  )
}

function TriggerIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

function ResourceIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}
