import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SessaoTabs, ContextoPacienteSidebar } from '@/components/sessao-tabs'
import { SessaoActionsBar } from '@/components/sessao-actions'
import { SessionRecorder } from '@/components/session-recorder'
import { SessaoQuickActions } from '@/components/sessao-quick-actions'
import { ComprovanteSessao } from '@/components/comprovante-sessao'
import { createClient } from '@/lib/supabase/server'
import { gerarCodigoVerificacao } from '@/lib/comprovante'

const statusConfig: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  em_andamento: { label: 'Em Andamento', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  realizada: { label: 'Realizada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  falta: { label: 'Falta', color: 'bg-red-50 text-red-700 border-red-200' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  remarcada: { label: 'Remarcada', color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export default async function SessaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const db = supabase as any

  const { data: s } = await db
    .from('sessoes')
    .select('*, pacientes(*)')
    .eq('id', id)
    .single()

  const sessao = s as any
  const paciente = sessao?.pacientes || null

  if (!sessao) {
    notFound()
  }

  // Fetch professional data for comprovante
  const { data: { user } } = await (supabase as any).auth.getUser()
  const { data: usuario } = user ? await db
    .from('usuarios')
    .select('nome, crp')
    .eq('id', user.id)
    .single() : { data: null }

  const preparacao = sessao.preparacao
  const resumo = sessao.resumo
  const pacienteResumo = paciente?.resumo || {}
  const jaRealizada = sessao.status === 'realizada' || sessao.status === 'aguardando_aprovacao'
  const statusInfo = statusConfig[sessao.status] || statusConfig.agendada

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
            <span className="text-base font-semibold text-blue-700">
              {paciente?.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">
                {sessao.numero_sessao ? `Sessão ${sessao.numero_sessao}` : 'Sessão'}
              </h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-3">
              {paciente && (
                <Link href={`/pacientes/${paciente.id}`} className="font-medium text-primary hover:text-primary/80 transition-colors">
                  {paciente.nome}
                </Link>
              )}
              <span className="text-gray-300">·</span>
              <span>{formatDateTime(sessao.data_hora)}</span>
              {sessao.duracao_real > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{sessao.duracao_real} min</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessao.status === 'agendada' && (
            <SessaoQuickActions
              sessaoId={id}
              status={sessao.status}
              dataHora={sessao.data_hora}
              duracaoPrevista={sessao.duracao_prevista}
              pacienteId={sessao.paciente_id}
              pacienteNome={paciente?.nome || 'Paciente'}
              variant="header"
            />
          )}
          {sessao.status === 'realizada' && (
            <ComprovanteSessao
              sessaoId={id}
              pacienteNome={paciente?.nome || 'Paciente'}
              pacienteEmail={paciente?.email ?? null}
              sessaoNumero={sessao.numero_sessao}
              sessaoDataHora={sessao.data_hora}
              sessaoDuracao={sessao.duracao_real}
              profissionalNome={usuario?.nome ?? null}
              profissionalCrp={usuario?.crp ?? null}
              codigoVerificacao={gerarCodigoVerificacao(id)}
              appUrl={process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
            />
          )}
          <Link href="/sessoes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar
          </Link>
        </div>
      </div>

      {sessao.meet_link && sessao.status === 'em_andamento' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <svg className="w-5 h-5 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Sessão via Google Meet</p>
            <p className="text-xs text-blue-600 truncate">{sessao.meet_link}</p>
          </div>
          <a href={sessao.meet_link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Entrar na Reunião
          </a>
        </div>
      )}

      <SessionRecorder
        sessaoId={id}
        status={sessao.status}
        recordingStatus={sessao.recording_status || null}
        processingError={sessao.processing_error || null}
        meetLink={sessao.meet_link || null}
        hasAudio={!!sessao.audio_url}
      />

      <SessaoActionsBar
        sessaoId={id}
        status={sessao.status}
        resumo={resumo ?? null}
        pacienteNome={paciente?.nome || 'Paciente'}
        numeroSessao={sessao.numero_sessao}
        dataHora={sessao.data_hora}
      />

      <div className="grid gap-5 lg:grid-cols-3 flex-1 lg:min-h-[480px]">
        <div className="lg:col-span-2">
          <SessaoTabs
            preparacao={preparacao ?? null}
            resumo={resumo ?? null}
            integra={sessao.integra ?? null}
            jaRealizada={jaRealizada}
            sessaoId={id}
            hasAudio={!!sessao.audio_url}
          />
        </div>
        <div>
          <ContextoPacienteSidebar pacienteResumo={pacienteResumo} pacienteHistorico={paciente?.historico} />
        </div>
      </div>
    </div>
  )
}
