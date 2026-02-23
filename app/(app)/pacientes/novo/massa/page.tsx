'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Row {
  id: string
  nome: string
  email: string
  telefone: string
  dia_semana: string
  horario: string
}

const diasSemana = [
  { value: '', label: '—' },
  { value: '1', label: 'Segunda' },
  { value: '2', label: 'Terça' },
  { value: '3', label: 'Quarta' },
  { value: '4', label: 'Quinta' },
  { value: '5', label: 'Sexta' },
]

function createEmptyRow(): Row {
  return {
    id: crypto.randomUUID(),
    nome: '',
    email: '',
    telefone: '',
    dia_semana: '',
    horario: '',
  }
}

export default function CadastroMassaPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: 5 }, createEmptyRow)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ criados: number } | null>(null)
  const [touched, setTouched] = useState(false)

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    setResult(null)
    setError(null)
  }

  function addRow() {
    setRows(prev => [...prev, createEmptyRow()])
  }

  function removeRow(id: string) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev)
  }

  // Filtra linhas preenchidas (que tem qualquer campo obrigatório tocado)
  function getFilledRows() {
    return rows.filter(r => r.nome.trim().length > 0 || r.dia_semana || r.horario)
  }

  async function handleSave() {
    setTouched(true)
    const filled = getFilledRows()

    if (filled.length === 0) {
      setError('Preencha pelo menos um nome')
      return
    }

    const semNome = filled.filter(r => r.nome.trim().length < 2)
    const semDia = filled.filter(r => !r.dia_semana)
    const semHora = filled.filter(r => !r.horario)

    if (semNome.length > 0 || semDia.length > 0 || semHora.length > 0) {
      const msgs: string[] = []
      if (semNome.length > 0) msgs.push('nome (mín. 2 caracteres)')
      if (semDia.length > 0) msgs.push('dia da semana')
      if (semHora.length > 0) msgs.push('horário')
      setError(`Preencha os campos obrigatórios: ${msgs.join(', ')}`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const pacientes = filled.map(r => ({
        nome: r.nome.trim(),
        email: r.email.trim() || undefined,
        telefone: r.telefone.trim() || undefined,
        dia_semana_preferido: r.dia_semana ? parseInt(r.dia_semana) : null,
        hora_preferida: r.horario || undefined,
      }))

      const res = await fetch('/api/pacientes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacientes }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        return
      }

      setResult({ criados: data.criados })
    } catch {
      setError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const filledCount = getFilledRows().length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cadastro em Massa</h1>
          <p className="text-muted-foreground mt-1">
            Preencha a tabela abaixo para cadastrar vários pacientes de uma vez
          </p>
        </div>
        <Link
          href="/pacientes"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar
        </Link>
      </div>

      {/* Resultado de sucesso */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm font-medium text-emerald-800">
              {result.criados} paciente{result.criados !== 1 ? 's' : ''} cadastrado{result.criados !== 1 ? 's' : ''} com sucesso!
            </span>
          </div>
          <button
            onClick={() => router.push('/pacientes')}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            Ver pacientes →
          </button>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-10">#</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Nome *</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Telefone</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Dia *</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-28">Horário *</th>
                <th className="w-12 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isFilled = row.nome.trim().length > 0 || row.dia_semana || row.horario
                const nomeInvalid = touched && isFilled && row.nome.trim().length < 2
                const diaInvalid = touched && isFilled && !row.dia_semana
                const horaInvalid = touched && isFilled && !row.horario
                return (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Nome completo"
                        value={row.nome}
                        onChange={e => updateRow(row.id, 'nome', e.target.value)}
                        className={`w-full text-sm px-2.5 py-1.5 border rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                          nomeInvalid ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={row.email}
                        onChange={e => updateRow(row.id, 'email', e.target.value)}
                        className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="tel"
                        placeholder="(11) 99999-0000"
                        value={row.telefone}
                        onChange={e => updateRow(row.id, 'telefone', e.target.value)}
                        className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={row.dia_semana}
                        onChange={e => updateRow(row.id, 'dia_semana', e.target.value)}
                        className={`w-full text-sm px-2.5 py-1.5 border rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                          diaInvalid ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      >
                        {diasSemana.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="time"
                        value={row.horario}
                        onChange={e => updateRow(row.id, 'horario', e.target.value)}
                        className={`w-full text-sm px-2.5 py-1.5 border rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                          horaInvalid ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => removeRow(row.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        title="Remover linha"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer da tabela */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Adicionar linha
          </button>
          <span className="text-xs text-gray-400">
            {filledCount} paciente{filledCount !== 1 ? 's' : ''} preenchido{filledCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || filledCount === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Salvando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Salvar {filledCount > 0 ? `(${filledCount})` : ''}
            </>
          )}
        </button>
        <Link
          href="/pacientes"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </div>
  )
}
