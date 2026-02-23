'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NovoPacientePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    data_inicio_terapia: new Date().toISOString().split('T')[0],
    notas: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.nome.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar paciente')
      }

      const paciente = await res.json()
      router.push(`/pacientes/${paciente.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar paciente')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo Paciente</h1>
          <p className="text-muted-foreground mt-1">Cadastre um novo paciente</p>
        </div>
        <Link
          href="/pacientes"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Nome */}
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nome completo <span className="text-red-500">*</span>
          </label>
          <input
            id="nome"
            type="text"
            value={form.nome}
            onChange={(e) => update('nome', e.target.value)}
            required
            placeholder="Nome do paciente"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Email e Telefone */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Telefone
            </label>
            <input
              id="telefone"
              type="tel"
              value={form.telefone}
              onChange={(e) => update('telefone', e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
            />
          </div>
        </div>

        {/* Datas */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="data_nascimento" className="block text-sm font-medium text-gray-700 mb-1.5">
              Data de nascimento
            </label>
            <input
              id="data_nascimento"
              type="date"
              value={form.data_nascimento}
              onChange={(e) => update('data_nascimento', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="data_inicio_terapia" className="block text-sm font-medium text-gray-700 mb-1.5">
              Início da terapia
            </label>
            <input
              id="data_inicio_terapia"
              type="date"
              value={form.data_inicio_terapia}
              onChange={(e) => update('data_inicio_terapia', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label htmlFor="notas" className="block text-sm font-medium text-gray-700 mb-1.5">
            Notas iniciais
          </label>
          <textarea
            id="notas"
            value={form.notas}
            onChange={(e) => update('notas', e.target.value)}
            rows={3}
            placeholder="Observações iniciais sobre o paciente (opcional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors resize-none"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Cadastrando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Cadastrar Paciente
              </>
            )}
          </button>
          <Link
            href="/pacientes"
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
