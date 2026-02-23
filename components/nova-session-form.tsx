'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UnifiedCalendar, type CalendarSession } from './unified-calendar'

const DIAS_SEMANA: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

const FREQUENCIA_LABEL: Record<string, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
}

interface Paciente {
  id: string
  nome: string
  frequencia_sessoes?: string | null
  dia_semana_preferido?: number | null
  hora_preferida?: string | null
  duracao_padrao?: number | null
}

interface NovaSessionFormProps {
  pacientes: Paciente[]
  defaultPacienteId?: string | null
  weekSessions: CalendarSession[]
}

export function NovaSessionForm({
  pacientes,
  defaultPacienteId,
  weekSessions,
}: NovaSessionFormProps) {
  const router = useRouter()
  const [pacienteId, setPacienteId] = useState(defaultPacienteId || '')
  const [dataHora, setDataHora] = useState(() => {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    now.setHours(now.getHours() + 1)
    return formatForInput(now)
  })
  const [duracao, setDuracao] = useState(50)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<CalendarSession[]>(weekSessions)

  const selectedPaciente = pacientes.find(p => p.id === pacienteId)
  const hasRecurrence = !!(
    selectedPaciente?.frequencia_sessoes &&
    selectedPaciente.dia_semana_preferido !== null &&
    selectedPaciente.dia_semana_preferido !== undefined &&
    selectedPaciente.hora_preferida
  )

  const handleDateRangeChange = useCallback(async (start: Date, end: Date) => {
    try {
      const res = await fetch(`/api/sessoes?from=${start.toISOString()}&to=${end.toISOString()}`)
      if (!res.ok) return
      const data = await res.json()
      setSessions(
        data.map((sess: any) => ({
          id: sess.id,
          data_hora: sess.data_hora,
          duracao_prevista: sess.duracao_prevista || 50,
          paciente_nome: sess.pacientes?.nome || 'Paciente',
          status: sess.status,
        }))
      )
    } catch {
      // keep previous data on error
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!pacienteId) {
      setError('Selecione um paciente')
      return
    }
    if (!dataHora) {
      setError('Informe a data e hora')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/sessoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          data_hora: new Date(dataHora).toISOString(),
          duracao_prevista: duracao,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar sessão')
      }

      const sessao = await res.json()
      router.push(`/sessoes/${sessao.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar sessão')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Formulário compacto */}
      <div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          {/* Seleção de paciente — sempre visível */}
          <div>
            <label htmlFor="paciente" className="block text-xs font-medium text-gray-700 mb-1">
              Paciente
            </label>
            <select
              id="paciente"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
            >
              <option value="">Selecione...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            {pacientes.length === 0 ? (
              <p className="text-xs text-gray-500 mt-1.5">
                Nenhum paciente.{' '}
                <Link href="/pacientes/novo" className="text-primary hover:underline font-medium">
                  Cadastrar
                </Link>
              </p>
            ) : (
              <Link
                href="/pacientes/novo"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Novo paciente
              </Link>
            )}
          </div>

          {/* Aviso: paciente com sessões auto-geradas */}
          {hasRecurrence && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">
                      Sessões auto-geradas
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Este paciente tem agenda recorrente configurada. A próxima sessão é criada automaticamente ao encerrar a atual.
                    </p>
                  </div>
                </div>

                <div className="bg-white/60 rounded-md p-2.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-emerald-800">
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span className="font-medium">
                      {FREQUENCIA_LABEL[selectedPaciente!.frequencia_sessoes!] || selectedPaciente!.frequencia_sessoes}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-800">
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {DIAS_SEMANA[selectedPaciente!.dia_semana_preferido!]} às {selectedPaciente!.hora_preferida}, {selectedPaciente!.duracao_padrao || 50}min
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={`/pacientes/${selectedPaciente!.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Gerenciar agenda recorrente
              </Link>
            </div>
          )}

          {/* Formulário de criação manual — só aparece se paciente não tem recorrência */}
          {!hasRecurrence && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="dataHora" className="block text-xs font-medium text-gray-700 mb-1">
                  Data e Hora
                </label>
                <input
                  id="dataHora"
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="duracao" className="block text-xs font-medium text-gray-700 mb-1">
                  Duração (minutos)
                </label>
                <input
                  id="duracao"
                  type="number"
                  min={15}
                  max={180}
                  step={5}
                  value={duracao}
                  onChange={(e) => setDuracao(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-0.5">Padrão: 50 minutos</p>
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Criando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Agendar Sessão
                  </>
                )}
              </button>
            </form>
          )}

          {/* Estado vazio — nenhum paciente selecionado */}
          {!pacienteId && (
            <p className="text-xs text-gray-400 text-center py-2">
              Selecione um paciente para continuar
            </p>
          )}
        </div>
      </div>

      {/* Calendário principal */}
      <div>
        <UnifiedCalendar
          sessions={sessions}
          views={['semana']}
          selectedDate={hasRecurrence ? undefined : dataHora}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>
    </div>
  )
}

function formatForInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}
