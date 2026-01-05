'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { statusPacienteLabels } from '@/lib/utils'
import type { Paciente } from '@/lib/types'

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pausado: 'bg-amber-50 text-amber-700 border-amber-200',
  encerrado: 'bg-gray-100 text-gray-600 border-gray-200',
}

type StatusFilter = 'todos' | 'ativo' | 'pausado'

interface PacientesListProps {
  pacientes: Paciente[]
}

export function PacientesList({ pacientes }: PacientesListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')

  const filteredPacientes = useMemo(() => {
    return pacientes.filter(p => {
      // Filter by status
      if (statusFilter !== 'todos' && p.status !== statusFilter) {
        return false
      }
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase()
        return p.nome.toLowerCase().includes(searchLower)
      }
      return true
    })
  }, [pacientes, search, statusFilter])

  const pacientesAtivos = pacientes.filter(p => p.status === 'ativo').length
  const pacientesPausados = pacientes.filter(p => p.status === 'pausado').length

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
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

        {/* Filter buttons */}
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

      {/* Lista de pacientes */}
      {filteredPacientes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPacientes.map((paciente) => {
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
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[paciente.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {statusPacienteLabels[paciente.status] || paciente.status}
                  </span>
                </div>

                <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                  {paciente.nome}
                </h3>

                {paciente.data_inicio_terapia && (
                  <p className="text-sm text-gray-500 mt-1">
                    Desde {new Date(paciente.data_inicio_terapia).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </p>
                )}

                {/* Momento atual ou síntese */}
                {(resumo.momento || resumo.sintese) && (
                  <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                    {resumo.momento || resumo.sintese}
                  </p>
                )}

                {/* Tags de diagnósticos/temas */}
                {resumo.diagnosticos && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {resumo.diagnosticos.split(',')[0].trim()}
                    </span>
                  </div>
                )}

                {/* Indicador visual de seta */}
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
