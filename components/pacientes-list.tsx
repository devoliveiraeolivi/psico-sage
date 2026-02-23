'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { statusPacienteLabels, calcularIdade } from '@/lib/utils'
import type { Paciente } from '@/lib/types'

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pausado: 'bg-amber-50 text-amber-700 border-amber-200',
  encerrado: 'bg-gray-100 text-gray-600 border-gray-200',
}

type StatusFilter = 'todos' | 'ativo' | 'pausado'
type ViewMode = 'cards' | 'lista' | 'kanban'

const diasSemana = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
]

interface PacientesListProps {
  pacientes: Paciente[]
}

function PacienteAvatar({ nome }: { nome: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-violet-700">
        {nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {statusPacienteLabels[status] || status}
    </span>
  )
}

// ====== CARD VIEW ======
function CardView({ pacientes }: { pacientes: Paciente[] }) {
  return (
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
              <StatusBadge status={paciente.status} />
            </div>

            <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
              {paciente.nome}
            </h3>

            {paciente.data_inicio_terapia && (
              <p className="text-sm text-gray-500 mt-1">
                Desde {new Date(paciente.data_inicio_terapia).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </p>
            )}

            {(resumo.momento || resumo.sintese) && (
              <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                {resumo.momento || resumo.sintese}
              </p>
            )}

            {resumo.diagnosticos && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {resumo.diagnosticos.split(',')[0].trim()}
                </span>
              </div>
            )}

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
  )
}

// ====== LIST VIEW ======
function ListView({ pacientes }: { pacientes: Paciente[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_120px_120px_140px_100px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <span>Paciente</span>
        <span>Dia/Horário</span>
        <span>Frequência</span>
        <span>Diagnóstico</span>
        <span className="text-right">Status</span>
      </div>

      {/* Rows */}
      {pacientes.map((paciente, i) => {
        const resumo = paciente.resumo || {}
        const dia = paciente.dia_semana_preferido != null
          ? diasSemana.find(d => d.value === paciente.dia_semana_preferido)?.label
          : null

        return (
          <Link
            key={paciente.id}
            href={`/pacientes/${paciente.id}`}
            className={`flex flex-col sm:grid sm:grid-cols-[1fr_120px_120px_140px_100px] gap-2 sm:gap-4 items-start sm:items-center px-5 py-4 hover:bg-gray-50 transition-colors group ${
              i > 0 ? 'border-t border-gray-100' : ''
            }`}
          >
            {/* Nome + avatar */}
            <div className="flex items-center gap-3 min-w-0">
              <PacienteAvatar nome={paciente.nome} />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate group-hover:text-primary transition-colors">
                  {paciente.nome}
                </p>
                {paciente.data_nascimento && (
                  <p className="text-xs text-gray-400">{calcularIdade(paciente.data_nascimento)} anos</p>
                )}
              </div>
            </div>

            {/* Dia/Horário */}
            <div className="text-sm text-gray-600">
              {dia && paciente.hora_preferida ? (
                <span>{dia} {paciente.hora_preferida}</span>
              ) : (
                <span className="text-gray-300">--</span>
              )}
            </div>

            {/* Frequência */}
            <div className="text-sm text-gray-600 capitalize">
              {paciente.frequencia_sessoes || <span className="text-gray-300">--</span>}
            </div>

            {/* Diagnóstico */}
            <div className="min-w-0">
              {resumo.diagnosticos ? (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded truncate block">
                  {resumo.diagnosticos.split(',')[0].trim()}
                </span>
              ) : (
                <span className="text-sm text-gray-300">--</span>
              )}
            </div>

            {/* Status */}
            <div className="sm:text-right">
              <StatusBadge status={paciente.status} />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ====== KANBAN VIEW ======
function KanbanView({ pacientes }: { pacientes: Paciente[] }) {
  const columns = useMemo(() => {
    const grouped: Record<number | string, Paciente[]> = { sem_dia: [] }
    diasSemana.forEach(d => { grouped[d.value] = [] })

    pacientes.forEach(p => {
      if (p.dia_semana_preferido != null && grouped[p.dia_semana_preferido]) {
        grouped[p.dia_semana_preferido].push(p)
      } else {
        grouped['sem_dia'].push(p)
      }
    })

    return grouped
  }, [pacientes])

  const semDia = columns['sem_dia'] || []

  return (
    <div className="space-y-4">
      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {diasSemana.map(dia => {
          const items = columns[dia.value] || []
          return (
            <div key={dia.value} className="flex-shrink-0 w-56">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-semibold text-gray-700">{dia.label}</h3>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2.5">
                {items.length > 0 ? items.map(paciente => (
                  <KanbanCard key={paciente.id} paciente={paciente} />
                )) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-400">Nenhum paciente</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sem dia definido */}
      {semDia.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-500">Sem dia definido</h3>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {semDia.length}
            </span>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            {semDia.map(paciente => (
              <div key={paciente.id} className="w-56">
                <KanbanCard paciente={paciente} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KanbanCard({ paciente }: { paciente: Paciente }) {
  const resumo = paciente.resumo || {}
  return (
    <Link
      href={`/pacientes/${paciente.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <PacienteAvatar nome={paciente.nome} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors">
            {paciente.nome}
          </p>
          {paciente.hora_preferida && (
            <p className="text-xs text-gray-400">{paciente.hora_preferida} · {paciente.duracao_padrao}min</p>
          )}
        </div>
      </div>

      <StatusBadge status={paciente.status} />

      {resumo.momento && (
        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{resumo.momento}</p>
      )}

      {resumo.diagnosticos && (
        <div className="mt-2">
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
            {resumo.diagnosticos.split(',')[0].trim()}
          </span>
        </div>
      )}
    </Link>
  )
}

// ====== ICONS ======
function IconCards({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}

function IconList({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  )
}

function IconKanban({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

// ====== MAIN COMPONENT ======
export function PacientesList({ pacientes }: PacientesListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')

  const filteredPacientes = useMemo(() => {
    return pacientes.filter(p => {
      if (statusFilter !== 'todos' && p.status !== statusFilter) return false
      if (search) {
        const searchLower = search.toLowerCase()
        return p.nome.toLowerCase().includes(searchLower)
      }
      return true
    })
  }, [pacientes, search, statusFilter])

  const pacientesAtivos = pacientes.filter(p => p.status === 'ativo').length
  const pacientesPausados = pacientes.filter(p => p.status === 'pausado').length

  const viewModes: { mode: ViewMode; label: string; icon: typeof IconCards }[] = [
    { mode: 'cards', label: 'Cards', icon: IconCards },
    { mode: 'lista', label: 'Lista', icon: IconList },
    { mode: 'kanban', label: 'Kanban', icon: IconKanban },
  ]

  return (
    <div className="space-y-6">
      {/* Search, Filters and View Toggle */}
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>

        {/* View toggle + Status filters */}
        <div className="flex items-start gap-8">
          {/* Visualização */}
          <div>
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Visualização</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {viewModes.map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div>
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">Filtros</span>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === 'todos'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Todos ({pacientes.length})
              </button>
              <button
                onClick={() => setStatusFilter('ativo')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === 'ativo'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Ativos ({pacientesAtivos})
              </button>
              <button
                onClick={() => setStatusFilter('pausado')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === 'pausado'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Pausados ({pacientesPausados})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredPacientes.length > 0 ? (
        <>
          {viewMode === 'cards' && <CardView pacientes={filteredPacientes} />}
          {viewMode === 'lista' && <ListView pacientes={filteredPacientes} />}
          {viewMode === 'kanban' && <KanbanView pacientes={filteredPacientes} />}
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">Nenhum paciente encontrado</h3>
          <p className="text-sm text-gray-500">
            {search ? `Nenhum resultado para "${search}"` : 'Não há pacientes com este filtro'}
          </p>
        </div>
      )}
    </div>
  )
}
