'use client'

import { useState } from 'react'

const DIAS_SEMANA = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

const FREQUENCIAS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
]

interface PatientRecurrenceConfigProps {
  pacienteId: string
  initialFrequencia: string | null
  initialDiaSemana: number | null
  initialHora: string | null
  initialDuracao: number
}

export function PatientRecurrenceConfig({
  pacienteId,
  initialFrequencia,
  initialDiaSemana,
  initialHora,
  initialDuracao,
}: PatientRecurrenceConfigProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [frequencia, setFrequencia] = useState(initialFrequencia || '')
  const [diaSemana, setDiaSemana] = useState(initialDiaSemana ?? 2) // terça por padrão
  const [hora, setHora] = useState(initialHora || '10:00')
  const [duracao, setDuracao] = useState(initialDuracao || 50)

  // Estado salvo (para exibição)
  const [saved, setSaved] = useState({
    frequencia: initialFrequencia,
    diaSemana: initialDiaSemana,
    hora: initialHora,
    duracao: initialDuracao,
  })

  const isConfigured = saved.frequencia !== null

  const save = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/pacientes/${pacienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequencia_sessoes: frequencia || null,
          dia_semana_preferido: frequencia ? diaSemana : null,
          hora_preferida: frequencia ? hora : null,
          duracao_padrao: duracao,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      setSaved({
        frequencia: frequencia || null,
        diaSemana: frequencia ? diaSemana : null,
        hora: frequencia ? hora : null,
        duracao,
      })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  const disable = async () => {
    setFrequencia('')
    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/pacientes/${pacienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequencia_sessoes: null,
          dia_semana_preferido: null,
          hora_preferida: null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao desativar')
      }

      setSaved({ frequencia: null, diaSemana: null, hora: null, duracao })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar')
    } finally {
      setIsSaving(false)
    }
  }

  const getDiaLabel = (dia: number | null) =>
    DIAS_SEMANA.find(d => d.value === dia)?.label || ''

  const getFreqLabel = (freq: string | null) =>
    FREQUENCIAS.find(f => f.value === freq)?.label?.toLowerCase() || ''

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Agenda Recorrente</h2>

      {error && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <p className="text-xs text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Modo visualização */}
      {!isEditing && isConfigured && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            <span className="text-xs text-emerald-800">
              {getFreqLabel(saved.frequencia)}, {getDiaLabel(saved.diaSemana)} às {saved.hora}, {saved.duracao}min
            </span>
          </div>
          <p className="text-[10px] text-gray-400">
            Próxima sessão é criada automaticamente ao encerrar a atual
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Editar configuração
          </button>
        </div>
      )}

      {/* Não configurado */}
      {!isEditing && !isConfigured && (
        <button
          onClick={() => { setIsEditing(true); setFrequencia('semanal') }}
          className="w-full px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Configurar agenda recorrente
        </button>
      )}

      {/* Modo edição */}
      {isEditing && (
        <div className="space-y-3">
          {/* Frequência */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Frequência</label>
            <select
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            >
              <option value="">Desativado</option>
              {FREQUENCIAS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {frequencia && (
            <>
              {/* Dia da semana */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dia da semana</label>
                <select
                  value={diaSemana}
                  onChange={(e) => setDiaSemana(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                >
                  {DIAS_SEMANA.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Horário */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Horário</label>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                />
              </div>

              {/* Duração */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duração (min)</label>
                <input
                  type="number"
                  value={duracao}
                  onChange={(e) => setDuracao(Number(e.target.value))}
                  min={10}
                  max={300}
                  step={5}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                />
              </div>
            </>
          )}

          {/* Botões */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={isSaving}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
            {isConfigured && (
              <button
                onClick={disable}
                disabled={isSaving}
                className="px-3 py-2 text-xs text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                Desativar
              </button>
            )}
            <button
              onClick={() => {
                setIsEditing(false)
                setFrequencia(saved.frequencia || '')
                setDiaSemana(saved.diaSemana ?? 2)
                setHora(saved.hora || '10:00')
                setDuracao(saved.duracao || 50)
              }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
