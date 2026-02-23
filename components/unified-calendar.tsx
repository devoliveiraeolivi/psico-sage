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

  const handleSessionClick = useCallback(
    (id: string) => {
      if (onClickSession) {
        onClickSession(id)
      } else if (sessionHref) {
        router.push(`${sessionHref}/${id}`)
      }
    },
    [onClickSession, sessionHref, router]
  )

  const isInteractive = !!(onClickSession || sessionHref)

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
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
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
