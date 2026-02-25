'use client'

import { useEffect, useState } from 'react'
import type { VideoPlataforma, VideoModoLink } from '@/lib/types'

type ModoAtendimento = 'presencial' | 'online' | 'hibrido'

interface GoogleStatus {
  connected: boolean
  email: string | null
  connectedAt: string | null
}

export default function ConfiguracoesPage() {
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Horário de atendimento
  const [horaInicio, setHoraInicio] = useState(7)
  const [horaFim, setHoraFim] = useState(19)
  const [savingHorario, setSavingHorario] = useState(false)
  const [horarioSaved, setHorarioSaved] = useState(false)

  // Modo de atendimento
  const [modo, setModo] = useState<ModoAtendimento>('presencial')

  // Videochamada
  const [videoPlataforma, setVideoPlataforma] = useState<VideoPlataforma>('nenhum')
  const [videoModoLink, setVideoModoLink] = useState<VideoModoLink>('por_paciente')
  const [videoLinkFixo, setVideoLinkFixo] = useState('')
  const [videoPlataformaNome, setVideoPlataformaNome] = useState('')
  const [savingVideo, setSavingVideo] = useState(false)
  const [videoSaved, setVideoSaved] = useState(false)
  const [generatingMeetLink, setGeneratingMeetLink] = useState(false)

  // Verificar status ao carregar
  useEffect(() => {
    fetchGoogleStatus()
    fetchConfiguracoes()

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
    if (!showDisconnectConfirm) {
      setShowDisconnectConfirm(true)
      return
    }
    setShowDisconnectConfirm(false)
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

  async function fetchConfiguracoes() {
    try {
      const res = await fetch('/api/configuracoes')
      if (res.ok) {
        const data = await res.json()
        setHoraInicio(data.hora_inicio_atendimento ?? 7)
        setHoraFim(data.hora_fim_atendimento ?? 19)
        const plat: VideoPlataforma = data.video_plataforma ?? 'nenhum'
        const hibrido: boolean = data.atendimento_hibrido ?? false
        setVideoPlataforma(plat)
        // Derive modo from plataforma + hibrido flag
        if (plat === 'nenhum') {
          setModo('presencial')
        } else if (hibrido) {
          setModo('hibrido')
        } else {
          setModo('online')
        }
        setVideoModoLink(data.video_modo_link ?? 'por_paciente')
        setVideoLinkFixo(data.video_link_fixo ?? '')
        setVideoPlataformaNome(data.video_plataforma_nome ?? '')
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

  // Effective plataforma: presencial uses 'nenhum', others use the selected platform
  const effectivePlataforma: VideoPlataforma = modo === 'presencial' ? 'nenhum' : videoPlataforma

  async function saveVideoConfig() {
    setSavingVideo(true)
    setVideoSaved(false)
    try {
      await fetch('/api/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_plataforma: effectivePlataforma,
          video_modo_link: videoModoLink,
          video_link_fixo: videoLinkFixo || null,
          video_plataforma_nome: effectivePlataforma === 'externo' ? videoPlataformaNome || null : null,
          atendimento_hibrido: modo === 'hibrido',
        }),
      })
      setVideoSaved(true)
      setTimeout(() => setVideoSaved(false), 2000)
    } catch {
      // ignore
    } finally {
      setSavingVideo(false)
    }
  }

  async function generateFixedMeetLink() {
    setGeneratingMeetLink(true)
    try {
      const res = await fetch('/api/auth/google/generate-fixed-link', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setVideoLinkFixo(data.videoLink)
      } else {
        const data = await res.json()
        setErrorMessage(data.message || 'Erro ao gerar link do Meet')
      }
    } catch {
      setErrorMessage('Erro de conexão ao gerar link')
    } finally {
      setGeneratingMeetLink(false)
    }
  }

  const showPlatformPicker = modo === 'online' || modo === 'hibrido'

  const videoConfigValid =
    effectivePlataforma === 'nenhum' ||
    (effectivePlataforma === 'google_meet' && (videoModoLink === 'por_paciente' || videoLinkFixo.trim())) ||
    (effectivePlataforma === 'externo' && (videoModoLink === 'por_paciente' || videoLinkFixo.trim()))

  function handleModoChange(newModo: ModoAtendimento) {
    setModo(newModo)
    if (newModo === 'presencial') {
      setVideoPlataforma('nenhum')
    } else if (videoPlataforma === 'nenhum') {
      setVideoPlataforma('google_meet')
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
              <p className="text-sm font-medium text-red-800">Erro</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Modo de Atendimento */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Modo de Atendimento
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure como você realiza suas sessões
            </p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Modo */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2.5">Como você atende?</label>
              <div className="space-y-2">
                {([
                  { value: 'presencial' as const, label: 'Apenas presencial', desc: 'Não uso videochamada nas sessões' },
                  { value: 'online' as const, label: 'Apenas online', desc: 'Todas as sessões por videochamada' },
                  { value: 'hibrido' as const, label: 'Híbrido', desc: 'Presencial e online, dependendo do paciente' },
                ]).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      modo === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modoAtendimento"
                      value={opt.value}
                      checked={modo === opt.value}
                      onChange={() => handleModoChange(opt.value)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Platform picker — shown for online & hybrid */}
            {showPlatformPicker && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2.5">Plataforma de vídeo</label>
                <div className="space-y-2">
                  {([
                    { value: 'google_meet' as const, label: 'Google Meet', desc: 'Links gerados automaticamente via Google Calendar' },
                    { value: 'externo' as const, label: 'Link externo', desc: 'Zoom, Teams, ou outra plataforma' },
                  ]).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        videoPlataforma === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="videoPlataforma"
                        value={opt.value}
                        checked={videoPlataforma === opt.value}
                        onChange={() => setVideoPlataforma(opt.value)}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Nome da plataforma externa */}
            {showPlatformPicker && videoPlataforma === 'externo' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome da plataforma</label>
                <input
                  type="text"
                  value={videoPlataformaNome}
                  onChange={(e) => setVideoPlataformaNome(e.target.value)}
                  placeholder="Ex: Zoom, Teams, Whereby..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  maxLength={50}
                />
              </div>
            )}

            {/* Modo do link */}
            {showPlatformPicker && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2.5">Modo do link</label>
                <div className="space-y-2">
                  {([
                    { value: 'por_paciente' as const, label: 'Um link por paciente', desc: 'Cada paciente tem seu próprio link de videochamada' },
                    { value: 'link_fixo' as const, label: 'Link fixo (único)', desc: 'Mesmo link para todos os pacientes' },
                  ]).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        videoModoLink === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="videoModoLink"
                        value={opt.value}
                        checked={videoModoLink === opt.value}
                        onChange={() => setVideoModoLink(opt.value)}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Link fixo input */}
            {showPlatformPicker && videoModoLink === 'link_fixo' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Link de videochamada</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={videoLinkFixo}
                    onChange={(e) => setVideoLinkFixo(e.target.value)}
                    placeholder="https://meet.google.com/... ou https://zoom.us/j/..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  {videoPlataforma === 'google_meet' && googleStatus?.connected && (
                    <button
                      onClick={generateFixedMeetLink}
                      disabled={generatingMeetLink}
                      className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5"
                    >
                      {generatingMeetLink ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      Gerar Link
                    </button>
                  )}
                </div>
                {videoLinkFixo && (
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Este link será usado em todas as sessões de todos os pacientes.
                  </p>
                )}
              </div>
            )}

            {/* Salvar */}
            <button
              onClick={saveVideoConfig}
              disabled={savingVideo || !videoConfigValid}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {savingVideo ? 'Salvando...' : videoSaved ? 'Salvo!' : 'Salvar configuração'}
            </button>
          </div>
        </section>

        {/* Google Meet Integration — só mostra quando plataforma é google_meet */}
        {effectivePlataforma === 'google_meet' && (
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
                Vincule sua conta Google para criar links de reunião automaticamente
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
                  {showDisconnectConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Tem certeza?</span>
                      <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {disconnecting ? 'Desconectando...' : 'Confirmar'}
                      </button>
                      <button
                        onClick={() => setShowDisconnectConfirm(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      Desconectar
                    </button>
                  )}
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
                    href="/api/auth/google?from=/configuracoes"
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
        )}

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
