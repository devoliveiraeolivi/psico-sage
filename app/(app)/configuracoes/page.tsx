'use client'

import { useEffect, useState } from 'react'

interface GoogleStatus {
  connected: boolean
  email: string | null
  connectedAt: string | null
}

export default function ConfiguracoesPage() {
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Horário de atendimento
  const [horaInicio, setHoraInicio] = useState(7)
  const [horaFim, setHoraFim] = useState(19)
  const [savingHorario, setSavingHorario] = useState(false)
  const [horarioSaved, setHorarioSaved] = useState(false)

  // Verificar status ao carregar
  useEffect(() => {
    fetchGoogleStatus()
    fetchHorario()

    // Verificar query params do callback OAuth
    const params = new URLSearchParams(window.location.search)
    const googleResult = params.get('google')
    if (googleResult === 'success') {
      fetchGoogleStatus()
    } else if (googleResult === 'error') {
      setErrorMessage(params.get('message') || 'Erro ao conectar com o Google')
    }
    // Limpar query params
    if (googleResult) {
      window.history.replaceState({}, '', '/configuracoes')
    }
  }, [])

  async function fetchGoogleStatus() {
    try {
      const res = await fetch('/api/auth/google/status')
      if (res.ok) {
        const data = await res.json()
        setGoogleStatus(data)
      }
    } catch {
      // Ignorar erro em mock mode
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Deseja desconectar sua conta Google? Você não poderá criar sessões via Google Meet até reconectar.')) {
      return
    }
    setDisconnecting(true)
    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST' })
      if (res.ok) {
        setGoogleStatus({ connected: false, email: null, connectedAt: null })
      }
    } catch {
      // ignore
    } finally {
      setDisconnecting(false)
    }
  }

  async function fetchHorario() {
    try {
      const res = await fetch('/api/configuracoes')
      if (res.ok) {
        const data = await res.json()
        setHoraInicio(data.hora_inicio_atendimento ?? 7)
        setHoraFim(data.hora_fim_atendimento ?? 19)
      }
    } catch {
      // ignore
    }
  }

  async function saveHorario() {
    setSavingHorario(true)
    setHorarioSaved(false)
    try {
      await fetch('/api/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hora_inicio_atendimento: horaInicio,
          hora_fim_atendimento: horaFim,
        }),
      })
      setHorarioSaved(true)
      setTimeout(() => setHorarioSaved(false), 2000)
    } catch {
      // ignore
    } finally {
      setSavingHorario(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
      <p className="text-sm text-slate-500 mt-1">Gerencie suas integrações e preferências</p>

      <div className="mt-8 space-y-6">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Erro na conexão Google</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {/* Google Meet Integration */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Meet
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Vincule sua conta Google para criar links de reunião automaticamente ao iniciar sessões
            </p>
          </div>

          <div className="px-6 py-5">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verificando...
              </div>
            ) : googleStatus?.connected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Conta conectada</p>
                    <p className="text-xs text-slate-500">{googleStatus.email}</p>
                    {googleStatus.connectedAt && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Conectado em {new Date(googleStatus.connectedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {disconnecting ? 'Desconectando...' : 'Desconectar'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Conta não conectada</p>
                    <p className="text-xs text-slate-500">Conecte para usar Google Meet nas sessões</p>
                  </div>
                </div>
                <a
                  href="/api/auth/google"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="white" opacity="0.8"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" opacity="0.6"/>
                  </svg>
                  Conectar Google
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Horário de Atendimento */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Horário de Atendimento
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define o range de horários exibido nos calendários
            </p>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Início</label>
                <select
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 5).map((h) => (
                    <option key={h} value={h}>{`${h}:00`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Fim</label>
                <select
                  value={horaFim}
                  onChange={(e) => setHoraFim(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 7).map((h) => (
                    <option key={h} value={h}>{`${h}:00`}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={saveHorario}
                disabled={savingHorario || horaFim <= horaInicio}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingHorario ? 'Salvando...' : horarioSaved ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
            {horaFim <= horaInicio && (
              <p className="text-xs text-red-500 mt-2">O horário de fim deve ser maior que o de início</p>
            )}
            <p className="text-xs text-slate-400 mt-3">
              Padrão: 7:00 — 19:00. Os calendários mostrarão apenas este intervalo.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
