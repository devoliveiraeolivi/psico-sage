'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  startOfWeek,
  startOfMonth,
  addDays,
  addWeeks,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Types ───────────────────────────────────────────────────────────

export type CalendarViewMode = 'dia' | 'semana' | 'mes'

export interface CalendarSession {
  id: string
  data_hora: string
  duracao_prevista: number
  paciente_nome: string
  status: string
}

export interface UnifiedCalendarProps {
  sessions: CalendarSession[]
  views?: CalendarViewMode[]
  defaultView?: CalendarViewMode
  showNavigation?: boolean
  compact?: boolean
  hourStart?: number
  hourEnd?: number
  fillHeight?: boolean
  selectedDate?: string
  sessionHref?: string
  onClickSession?: (sessionId: string) => void
  onDateRangeChange?: (rangeStart: Date, rangeEnd: Date) => void
  headerAction?: React.ReactNode
}

const STATUS_LABEL: Record<string, string> = {
  agendada: 'Agendada',
  em_andamento: 'Em andamento',
  aguardando_aprovacao: 'Aguardando aprovação',
  realizada: 'Realizada',
  falta: 'Falta',
  cancelada: 'Cancelada',
  remarcada: 'Remarcada',
}

const EDITABLE_STATUSES = new Set(['agendada', 'remarcada'])

export const STATUS_COLORS: Record<string, string> = {
  agendada: 'bg-blue-100 border-blue-300 text-blue-800',
  em_andamento: 'bg-orange-100 border-orange-300 text-orange-800',
  aguardando_aprovacao: 'bg-amber-100 border-amber-300 text-amber-800',
  realizada: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  falta: 'bg-red-100 border-red-300 text-red-800',
  cancelada: 'bg-gray-100 border-gray-300 text-gray-500',
  remarcada: 'bg-purple-100 border-purple-300 text-purple-800',
}

const STATUS_DOT: Record<string, string> = {
  agendada: 'bg-blue-500',
  em_andamento: 'bg-orange-500',
  aguardando_aprovacao: 'bg-amber-500',
  realizada: 'bg-emerald-500',
  falta: 'bg-red-500',
  cancelada: 'bg-gray-300',
  remarcada: 'bg-purple-500',
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i)

const VIEW_LABELS: Record<CalendarViewMode, string> = {
  dia: 'Dia',
  semana: 'Semana',
  mes: 'Mês',
}

// ─── Main Component ──────────────────────────────────────────────────

export function UnifiedCalendar({
  sessions,
  views = ['semana'],
  defaultView,
  showNavigation = true,
  compact = false,
  hourStart = 7,
  fillHeight = false,
  selectedDate,
  sessionHref,
  onClickSession,
  onDateRangeChange,
  headerAction,
}: UnifiedCalendarProps) {
  const router = useRouter()
  const [view, setView] = useState<CalendarViewMode>(defaultView || views[0])
  const [currentDate, setCurrentDate] = useState(new Date())
  const prevRangeRef = useRef('')
  const [editingSession, setEditingSession] = useState<CalendarSession | null>(null)

  const handleSessionClick = useCallback(
    (id: string) => {
      if (onClickSession) {
        onClickSession(id)
        return
      }
      // Open edit modal for the clicked session
      const session = sessions.find(s => s.id === id)
      if (session) {
        setEditingSession(session)
      }
    },
    [onClickSession, sessions]
  )

  // Calendar is always interactive — clicking a session opens the edit modal
  const isInteractive = true

  // Compute visible range based on view + currentDate
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === 'dia') {
      const start = new Date(currentDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return { rangeStart: start, rangeEnd: end }
    }
    if (view === 'semana') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = addDays(start, 7)
      return { rangeStart: start, rangeEnd: end }
    }
    // mes
    const monthStart = startOfMonth(currentDate)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = addDays(gridStart, 42)
    return { rangeStart: gridStart, rangeEnd: gridEnd }
  }, [view, currentDate])

  // Notify parent when range changes
  useEffect(() => {
    const key = `${rangeStart.toISOString()}_${rangeEnd.toISOString()}`
    if (key !== prevRangeRef.current) {
      prevRangeRef.current = key
      onDateRangeChange?.(rangeStart, rangeEnd)
    }
  }, [rangeStart, rangeEnd, onDateRangeChange])

  const handleSessionUpdated = useCallback(() => {
    setEditingSession(null)
    onDateRangeChange?.(rangeStart, rangeEnd)
    router.refresh()
  }, [onDateRangeChange, rangeStart, rangeEnd, router])

  // Navigation
  function prev() {
    setCurrentDate((d) => {
      if (view === 'dia') return addDays(d, -1)
      if (view === 'semana') return addWeeks(d, -1)
      return addMonths(d, -1)
    })
  }

  function next() {
    setCurrentDate((d) => {
      if (view === 'dia') return addDays(d, 1)
      if (view === 'semana') return addWeeks(d, 1)
      return addMonths(d, 1)
    })
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function goToDay(date: Date) {
    setCurrentDate(date)
    if (views.includes('dia')) {
      setView('dia')
    }
  }

  // Date label
  const dateLabel = useMemo(() => {
    if (view === 'dia') {
      const label = format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })
      return isToday(currentDate) ? `Hoje — ${label}` : label
    }
    if (view === 'semana') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
      const we = addDays(ws, 6)
      return `${format(ws, "d 'de' MMMM", { locale: ptBR })} — ${format(we, "d 'de' MMMM, yyyy", { locale: ptBR })}`
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
  }, [view, currentDate])

  return (
    <div className={`flex flex-col ${fillHeight ? 'flex-1 min-h-0' : ''} gap-4`}>
      {/* Navigation */}
      {showNavigation && (
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={prev}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={next}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-gray-900 capitalize">{dateLabel}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            {views.length > 1 && (
              <div id="calendar-views" className="flex rounded-lg border border-gray-200 overflow-hidden">
                {views.map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      i > 0 ? 'border-l border-gray-200' : ''
                    } ${
                      view === v
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>
            )}
            {headerAction}
          </div>
        </div>
      )}

      {/* Calendar content */}
      <div className={`${fillHeight ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
        {view === 'dia' && (
          <TimeGrid
            sessions={sessions}
            referenceDate={currentDate}
            columns={1}
            compact={false}
            hourStart={hourStart}
            fillHeight={fillHeight}
            selectedDate={selectedDate}
            onClickSession={isInteractive ? handleSessionClick : undefined}
          />
        )}
        {view === 'semana' && (
          <TimeGrid
            sessions={sessions}
            referenceDate={currentDate}
            columns={7}
            compact={compact}
            hourStart={hourStart}
            fillHeight={fillHeight}
            selectedDate={selectedDate}
            onClickSession={isInteractive ? handleSessionClick : undefined}
          />
        )}
        {view === 'mes' && (
          <MonthGrid
            sessions={sessions}
            referenceDate={currentDate}
            onClickDay={goToDay}
          />
        )}
      </div>

      {/* Session edit modal */}
      {editingSession && (
        <SessionEditModal
          session={editingSession}
          sessionHref={sessionHref}
          onClose={() => setEditingSession(null)}
          onSaved={handleSessionUpdated}
        />
      )}
    </div>
  )
}

// ─── Session Edit Modal ─────────────────────────────────────────────

function SessionEditModal({
  session,
  sessionHref,
  onClose,
  onSaved,
}: {
  session: CalendarSession
  sessionHref?: string
  onClose: () => void
  onSaved: () => void
}) {
  const router = useRouter()
  const dt = parseISO(session.data_hora)
  const [dataHora, setDataHora] = useState(() => {
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    const h = String(dt.getHours()).padStart(2, '0')
    const min = String(dt.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d}T${h}:${min}`
  })
  const [duracao, setDuracao] = useState(session.duracao_prevista)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canEdit = EDITABLE_STATUSES.has(session.status)
  const statusColor = STATUS_COLORS[session.status] || STATUS_COLORS.agendada
  const statusLabel = STATUS_LABEL[session.status] || session.status

  async function handleSave() {
    setError(null)

    // Validate inputs
    if (!dataHora) {
      setError('Data e hora são obrigatórios')
      return
    }
    const newDate = new Date(dataHora)
    if (isNaN(newDate.getTime())) {
      setError('Data inválida')
      return
    }
    if (duracao < 15 || duracao > 180) {
      setError('Duração deve ser entre 15 e 180 minutos')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/sessoes/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_hora: new Date(dataHora).toISOString(),
          duracao_prevista: duracao,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/sessoes/${session.id}/destroy`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao excluir')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
      setDeleting(false)
    }
  }

  // Delete confirmation view
  if (confirmDelete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(false)} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Excluir sessão permanentemente</h3>
                <p className="text-xs text-gray-500 mt-0.5">{session.paciente_nome} — {format(dt, "dd/MM/yyyy 'às' HH:mm")}</p>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <p className="text-xs font-medium text-red-800">Todos os itens abaixo serão excluídos:</p>
              <ul className="text-xs text-red-700 space-y-1">
                <li className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Dados da sessão e agendamento
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Resumo e prontuário gerado pela IA
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Áudio da gravação
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Transcrição completa
                </li>
              </ul>
              <p className="text-[11px] text-red-600 font-medium pt-1">Esta ação não pode ser desfeita.</p>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Excluindo...
                </>
              ) : (
                'Sim, excluir'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{session.paciente_nome}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {canEdit ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Data e Hora
                </label>
                <input
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Duração (minutos)
                </label>
                <input
                  type="number"
                  min={15}
                  max={180}
                  step={5}
                  value={duracao}
                  onChange={(e) => setDuracao(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                />
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-gray-600">
                {format(dt, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
              <p className="text-xs text-gray-400 mt-1">{session.duracao_prevista} minutos</p>
              <p className="text-xs text-gray-400 mt-2">
                Apenas sessões agendadas ou remarcadas podem ser editadas.
              </p>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            {sessionHref && (
              <a
                href={`${sessionHref}/${session.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Ver sessão
              </a>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              title="Excluir sessão"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Excluir
            </button>
          </div>

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TimeGrid (Day + Week) ──────────────────────────────────────────

function TimeGrid({
  sessions,
  referenceDate,
  columns,
  compact,
  hourStart,
  fillHeight,
  selectedDate,
  onClickSession,
}: {
  sessions: CalendarSession[]
  referenceDate: Date
  columns: 1 | 7
  compact: boolean
  hourStart: number
  fillHeight?: boolean
  selectedDate?: string
  onClickSession?: (id: string) => void
}) {
  const scrolledRef = useRef(false)

  const slotHeight = compact ? 28 : columns === 1 ? 44 : 48

  const weekStart = useMemo(
    () => startOfWeek(referenceDate, { weekStartsOn: 1 }),
    [referenceDate]
  )

  const days = useMemo(
    () => (columns === 7 ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [referenceDate]),
    [columns, weekStart, referenceDate]
  )

  const selectedDay = selectedDate ? parseISO(selectedDate) : null
  const today = new Date()

  const scrollRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && !scrolledRef.current) {
        node.scrollTop = hourStart * slotHeight
        scrolledRef.current = true
      }
    },
    [hourStart, slotHeight]
  )

  // Reset scroll flag when view changes substantially
  useEffect(() => {
    scrolledRef.current = false
  }, [columns])

  // Filter sessions for day view
  const daySessions = useMemo(() => {
    if (columns === 1) {
      return sessions.filter((s) => isSameDay(parseISO(s.data_hora), referenceDate))
    }
    return sessions
  }, [sessions, columns, referenceDate])

  const isEmpty = columns === 1 && daySessions.length === 0

  const gridCols = columns === 7 ? 'grid-cols-[50px_repeat(7,1fr)]' : 'grid-cols-[50px_1fr]'

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white ${fillHeight ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
      <div
        ref={scrollRefCallback}
        className={`overflow-y-auto relative ${fillHeight ? 'flex-1 min-h-0' : ''}`}
        style={fillHeight ? undefined : { maxHeight: compact ? 300 : 600 }}
      >
        {/* Column headers (week view only) */}
        {columns === 7 && (
          <div className={`grid ${gridCols} border-b border-gray-200 bg-gray-50 sticky top-0 z-10`}>
            <div />
            {days.map((day) => {
              const dayIsToday = isSameDay(day, today)
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
              return (
                <div
                  key={day.toISOString()}
                  className={`py-2 text-center border-l border-gray-200 ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <div className={`text-xs font-medium ${dayIsToday ? 'text-blue-600' : 'text-gray-500'}`}>
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div
                    className={`text-sm font-semibold mt-0.5 ${
                      dayIsToday
                        ? 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto'
                        : 'text-gray-900'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Time grid */}
        <div className={`grid ${gridCols} relative`}>
          {/* Hour labels */}
          <div>
            {ALL_HOURS.map((hour) => (
              <div
                key={hour}
                className={`border-b border-gray-100 text-right pr-2 text-xs ${isEmpty ? 'text-gray-300' : 'text-gray-400'}`}
                style={{ height: slotHeight }}
              >
                {`${hour}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const colSessions =
              columns === 1
                ? daySessions
                : sessions.filter((s) => isSameDay(parseISO(s.data_hora), day))

            return (
              <div key={dayIndex} className="relative border-l border-gray-200">
                {/* Grid lines */}
                {ALL_HOURS.map((hour) => (
                  <div key={hour} className="border-b border-gray-100" style={{ height: slotHeight }} />
                ))}

                {/* Session blocks */}
                {colSessions.map((session) => (
                  <SessionBlock
                    key={session.id}
                    session={session}
                    slotHeight={slotHeight}
                    singleColumn={columns === 1}
                    onClick={onClickSession}
                  />
                ))}
              </div>
            )
          })}
        </div>

        {/* Empty overlay (day view only) */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-400 bg-white/80 px-4 py-2 rounded-lg">
              Nenhuma sessão neste dia
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SessionBlock ────────────────────────────────────────────────────

function SessionBlock({
  session,
  slotHeight,
  singleColumn,
  onClick,
}: {
  session: CalendarSession
  slotHeight: number
  singleColumn: boolean
  onClick?: (id: string) => void
}) {
  const dt = parseISO(session.data_hora)
  // Guard against invalid dates crashing the calendar
  if (isNaN(dt.getTime())) return null

  const hours = getHours(dt)
  const minutes = getMinutes(dt)
  const topOffset = (hours + minutes / 60) * slotHeight
  const height = (session.duracao_prevista / 60) * slotHeight
  const colorClass = STATUS_COLORS[session.status] || STATUS_COLORS.agendada
  const isCompact = slotHeight <= 28

  if (singleColumn) {
    return (
      <div
        className={`absolute left-1 right-1 rounded-lg border ${colorClass} overflow-hidden ${
          onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
        }`}
        style={{ top: topOffset, height: Math.max(height, 28) }}
        onClick={() => onClick?.(session.id)}
      >
        <div className="px-3 py-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium truncate">{session.paciente_nome}</p>
            <span className="text-xs opacity-75 flex-shrink-0 ml-2">
              {format(dt, 'HH:mm')} · {session.duracao_prevista}min
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`absolute left-0.5 right-0.5 rounded border ${colorClass} overflow-hidden ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      }`}
      style={{ top: topOffset, height: Math.max(height, isCompact ? 16 : 22) }}
      onClick={() => onClick?.(session.id)}
      title={`${session.paciente_nome} — ${format(dt, 'HH:mm')} (${session.duracao_prevista}min)`}
    >
      <div className={`px-1 ${isCompact ? 'py-0' : 'py-0.5'}`}>
        <p className={`font-medium truncate ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
          {session.paciente_nome}
        </p>
        {!isCompact && (
          <p className="text-[10px] opacity-75 truncate">
            {format(dt, 'HH:mm')} · {session.duracao_prevista}min
          </p>
        )}
      </div>
    </div>
  )
}

// ─── MonthGrid ───────────────────────────────────────────────────────

function MonthGrid({
  sessions,
  referenceDate,
  onClickDay,
}: {
  sessions: CalendarSession[]
  referenceDate: Date
  onClickDay?: (date: Date) => void
}) {
  const monthStart = startOfMonth(referenceDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart]
  )

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, CalendarSession[]>()
    sessions.forEach((s) => {
      const key = s.data_hora.slice(0, 10)
      const arr = map.get(key) || []
      arr.push(s)
      map.set(key, arr)
    })
    return map
  }, [sessions])

  const today = new Date()

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const daySessions = sessionsByDate.get(key) || []
          const isCurrentMonth = isSameMonth(day, referenceDate)
          const dayIsToday = isSameDay(day, today)

          return (
            <div
              key={key}
              className={`min-h-[72px] p-1.5 border-b border-r border-gray-100 transition-colors ${
                !isCurrentMonth ? 'bg-gray-50/50' : ''
              } ${onClickDay ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}
              onClick={() => onClickDay?.(day)}
            >
              <div
                className={`text-xs font-medium mb-1 ${
                  !isCurrentMonth
                    ? 'text-gray-300'
                    : dayIsToday
                      ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center'
                      : 'text-gray-700'
                }`}
              >
                {format(day, 'd')}
              </div>
              {daySessions.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {daySessions.slice(0, 3).map((s, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s.status] || STATUS_DOT.agendada}`}
                      title={`${s.paciente_nome} - ${format(parseISO(s.data_hora), 'HH:mm')}`}
                    />
                  ))}
                  {daySessions.length > 3 && (
                    <span className="text-[9px] text-gray-400 leading-none">+{daySessions.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Calendar Legend ──────────────────────────────────────────────────

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
      {Object.entries(STATUS_LABEL).map(([key, label]) => (
        <div key={key} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${STATUS_DOT[key]}`} />
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  )
}
