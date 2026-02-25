'use client'

import { useState, useEffect } from 'react'
import {
  WelcomeIllustration,
  VideoCallIllustration,
  LinkModeIllustration,
  GoogleConnectIllustration,
  ScheduleIllustration,
  ReadyIllustration,
} from '@/lib/help/illustrations'
import type { VideoPlataforma, VideoModoLink } from '@/lib/types/database'

const WIZARD_STORAGE_KEY = 'psico-setup-wizard'

interface SetupWizardProps {
  onComplete: () => void
}

type ModoAtendimento = 'presencial' | 'online' | 'hibrido'
type StepId = 'welcome' | 'plataforma' | 'link-mode' | 'google-connect' | 'horario' | 'ready'

interface WizardState {
  step: number
  modo: ModoAtendimento
  plataforma: VideoPlataforma
  modoLink: VideoModoLink
  plataformaNome: string
  linkFixo: string
  horaInicio: number
  horaFim: number
}

function saveWizardState(state: WizardState) {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

function loadWizardState(): WizardState | null {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clearWizardState() {
  try {
    localStorage.removeItem(WIZARD_STORAGE_KEY)
  } catch { /* ignore */ }
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const saved = loadWizardState()

  const [currentStep, setCurrentStep] = useState(saved?.step ?? 0)
  const [modo, setModo] = useState<ModoAtendimento>(saved?.modo ?? 'presencial')
  const [plataforma, setPlataforma] = useState<VideoPlataforma>(saved?.plataforma ?? 'nenhum')
  const [modoLink, setModoLink] = useState<VideoModoLink>(saved?.modoLink ?? 'por_paciente')
  const [plataformaNome, setPlataformaNome] = useState(saved?.plataformaNome ?? '')
  const [linkFixo, setLinkFixo] = useState(saved?.linkFixo ?? '')
  const [horaInicio, setHoraInicio] = useState(saved?.horaInicio ?? 8)
  const [horaFim, setHoraFim] = useState(saved?.horaFim ?? 18)
  const [saving, setSaving] = useState(false)

  // Check for Google OAuth return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleResult = params.get('google')
    if (googleResult === 'success' || googleResult === 'error') {
      // Clean up query params
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Derive effective plataforma from modo
  const effectivePlataforma: VideoPlataforma =
    modo === 'presencial' ? 'nenhum' : plataforma
  const isHibrido = modo === 'hibrido'

  // Build dynamic steps based on choices
  const allSteps: StepId[] = (() => {
    const steps: StepId[] = ['welcome', 'plataforma']
    if (effectivePlataforma !== 'nenhum') steps.push('link-mode')
    if (effectivePlataforma === 'google_meet') steps.push('google-connect')
    steps.push('horario', 'ready')
    return steps
  })()

  const step = allSteps[currentStep]
  const isLast = currentStep === allSteps.length - 1
  const isFirst = currentStep === 0
  const progress = ((currentStep + 1) / allSteps.length) * 100

  async function saveConfig(fields: Record<string, unknown>) {
    try {
      await fetch('/api/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
    } catch {
      // Best-effort
    }
  }

  async function handleNext() {
    // Save relevant config at each step transition
    if (step === 'plataforma') {
      await saveConfig({
        video_plataforma: effectivePlataforma,
        atendimento_hibrido: isHibrido,
        ...(effectivePlataforma === 'externo' ? { video_plataforma_nome: plataformaNome } : {}),
      })
    } else if (step === 'link-mode') {
      await saveConfig({
        video_modo_link: modoLink,
        ...(modoLink === 'link_fixo' && linkFixo.trim() ? { video_link_fixo: linkFixo.trim() } : {}),
      })
    } else if (step === 'horario') {
      await saveConfig({
        hora_inicio_atendimento: horaInicio,
        hora_fim_atendimento: horaFim,
      })
    }

    if (isLast) {
      setSaving(true)
      try {
        await fetch('/api/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setup_completed: true }),
        })
      } catch {
        // Best-effort
      }
      clearWizardState()
      onComplete()
      return
    }

    setCurrentStep((s) => Math.min(s + 1, allSteps.length - 1))
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-fade-in">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step content */}
        <div className="px-8 py-8 min-h-[420px] flex flex-col">
          {step === 'welcome' && <WelcomeStep />}
          {step === 'plataforma' && (
            <PlataformaStep
              modo={modo}
              onModoChange={(m) => {
                setModo(m)
                if (m === 'presencial') {
                  setPlataforma('nenhum')
                } else if (m === 'online' || m === 'hibrido') {
                  // Default to google_meet if currently nenhum
                  if (plataforma === 'nenhum') setPlataforma('google_meet')
                }
              }}
              plataforma={plataforma}
              onPlataformaChange={setPlataforma}
              nomeExterno={plataformaNome}
              onNomeChange={setPlataformaNome}
            />
          )}
          {step === 'link-mode' && (
            <LinkModeStep
              value={modoLink}
              onChange={setModoLink}
              linkFixo={linkFixo}
              onLinkFixoChange={setLinkFixo}
            />
          )}
          {step === 'google-connect' && (
            <GoogleConnectStep
              onSaveState={() => {
                saveWizardState({
                  step: currentStep,
                  modo,
                  plataforma,
                  modoLink,
                  plataformaNome,
                  linkFixo,
                  horaInicio,
                  horaFim,
                })
              }}
            />
          )}
          {step === 'horario' && (
            <HorarioStep
              horaInicio={horaInicio}
              horaFim={horaFim}
              onInicioChange={setHoraInicio}
              onFimChange={setHoraFim}
            />
          )}
          {step === 'ready' && (
            <ReadyStep
              modo={modo}
              plataforma={effectivePlataforma}
              modoLink={modoLink}
              linkFixo={linkFixo}
              horaInicio={horaInicio}
              horaFim={horaFim}
            />
          )}

          {/* Spacer to push buttons down */}
          <div className="flex-1" />

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-6">
            <div>
              {!isFirst && (
                <button
                  onClick={handleBack}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2"
                >
                  ← Voltar
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Step indicator dots */}
              <div className="flex gap-1.5 mr-3">
                {allSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentStep
                        ? 'bg-blue-500'
                        : i < currentStep
                        ? 'bg-blue-300'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleNext}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: isLast ? 'linear-gradient(135deg, #22C55E, #10B981)' : 'hsl(221, 83%, 53%)' }}
              >
                {saving ? 'Salvando...' : isLast ? 'Começar a usar' : 'Continuar →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Step components ---------- */

function WelcomeStep() {
  return (
    <div className="text-center flex flex-col items-center">
      <WelcomeIllustration className="w-40 h-32 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900">Bem-vindo ao PsicoApp</h2>
      <p className="text-gray-500 mt-3 max-w-md leading-relaxed">
        Vamos configurar o essencial para você começar a usar a plataforma.
        São poucos passos e você pode alterar tudo depois nas Configurações.
      </p>
    </div>
  )
}

function PlataformaStep({
  modo,
  onModoChange,
  plataforma,
  onPlataformaChange,
  nomeExterno,
  onNomeChange,
}: {
  modo: ModoAtendimento
  onModoChange: (v: ModoAtendimento) => void
  plataforma: VideoPlataforma
  onPlataformaChange: (v: VideoPlataforma) => void
  nomeExterno: string
  onNomeChange: (v: string) => void
}) {
  const modoOptions: { id: ModoAtendimento; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'presencial',
      title: 'Presencial',
      desc: 'Atendimentos apenas presenciais, sem videochamada',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
    },
    {
      id: 'online',
      title: 'Online',
      desc: 'Atendimentos apenas por videochamada',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      id: 'hibrido',
      title: 'Híbrido',
      desc: 'Presencial e online, dependendo do paciente',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
    },
  ]

  const showPlatformPicker = modo === 'online' || modo === 'hibrido'

  const platformOptions: { id: VideoPlataforma; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'google_meet',
      title: 'Google Meet',
      desc: 'Links automáticos + sync com Google Calendar',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M12 15V9l6-4.5v15L12 15z" fill="#34A853" />
          <rect x="4" y="6.5" width="8" height="11" rx="1" fill="#4285F4" />
        </svg>
      ),
    },
    {
      id: 'externo',
      title: 'Outra Plataforma',
      desc: 'Zoom, Teams ou qualquer outra',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <VideoCallIllustration className="w-20 h-16 shrink-0" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Modo de Atendimento</h2>
          <p className="text-sm text-gray-500 mt-1">Como você realiza suas sessões?</p>
        </div>
      </div>

      {/* Mode selection */}
      <div className="space-y-2.5">
        {modoOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onModoChange(opt.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              modo === opt.id
                ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              modo === opt.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {opt.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-900">{opt.title}</span>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
            {modo === opt.id && (
              <div className="shrink-0">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12"><path d="M3.5 6l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Platform sub-selector — shown for online and hybrid modes */}
      {showPlatformPicker && (
        <div className="mt-4 pl-4 border-l-2 border-blue-200">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            Plataforma de vídeo
          </label>
          <div className="space-y-2">
            {platformOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onPlataformaChange(opt.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  plataforma === opt.id
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  plataforma === opt.id ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900">{opt.title}</span>
                  <p className="text-[11px] text-gray-500">{opt.desc}</p>
                </div>
                {plataforma === opt.id && (
                  <div className="shrink-0">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12"><path d="M3.5 6l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {plataforma === 'externo' && (
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome da plataforma</label>
              <input
                type="text"
                value={nomeExterno}
                onChange={(e) => onNomeChange(e.target.value)}
                placeholder="Ex: Zoom, Teams, Whereby..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LinkModeStep({
  value,
  onChange,
  linkFixo,
  onLinkFixoChange,
}: {
  value: VideoModoLink
  onChange: (v: VideoModoLink) => void
  linkFixo: string
  onLinkFixoChange: (v: string) => void
}) {
  const options: { id: VideoModoLink; title: string; desc: string }[] = [
    {
      id: 'por_paciente',
      title: 'Um link por paciente',
      desc: 'Cada paciente terá um link exclusivo de videochamada. Mais organizado e seguro.',
    },
    {
      id: 'link_fixo',
      title: 'Link fixo para todos',
      desc: 'Um único link de sala para todas as sessões. Mais simples de gerenciar.',
    },
  ]

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <LinkModeIllustration className="w-20 h-16 shrink-0" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Link de Videochamada</h2>
          <p className="text-sm text-gray-500 mt-1">Como você prefere gerar os links?</p>
        </div>
      </div>
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all ${
              value === opt.id
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-900">{opt.title}</span>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{opt.desc}</p>
            </div>
            {value === opt.id && (
              <div className="shrink-0">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12"><path d="M3.5 6l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Input do link fixo */}
      {value === 'link_fixo' && (
        <div className="mt-4 animate-fade-in">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">
            Informe o link da sua sala (opcional)
          </label>
          <input
            type="url"
            value={linkFixo}
            onChange={(e) => onLinkFixoChange(e.target.value)}
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
          />
          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            Pode deixar em branco e configurar depois em Configurações.
          </p>
        </div>
      )}
    </div>
  )
}

function GoogleConnectStep({ onSaveState }: { onSaveState: () => void }) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'connected' | 'connecting'>('checking')
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)

  // Check if Google is already connected
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/auth/google/status')
        if (res.ok) {
          const data = await res.json()
          if (data.connected) {
            setStatus('connected')
            setGoogleEmail(data.email)
            return
          }
        }
      } catch { /* ignore */ }
      setStatus('idle')
    }
    check()
  }, [])

  function handleConnect() {
    setStatus('connecting')
    // Save wizard state before redirect so we can resume
    onSaveState()
    // Redirect with `from` param so callback returns here
    window.location.href = '/api/auth/google?from=/dashboard'
  }

  if (status === 'checking') {
    return (
      <div className="text-center flex flex-col items-center justify-center py-8">
        <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-gray-500 mt-3">Verificando conexão...</p>
      </div>
    )
  }

  if (status === 'connected') {
    return (
      <div className="text-center flex flex-col items-center">
        <GoogleConnectIllustration className="w-40 h-32 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Google Conectado</h2>
        <div className="mt-4 flex items-center gap-3 px-5 py-3 bg-green-50 border border-green-200 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-green-800">Conta vinculada</p>
            {googleEmail && <p className="text-xs text-green-600">{googleEmail}</p>}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Links do Google Meet serão gerados automaticamente para suas sessões.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center flex flex-col items-center">
      <GoogleConnectIllustration className="w-40 h-32 mb-4" />
      <h2 className="text-xl font-bold text-gray-900">Conectar Google</h2>
      <p className="text-sm text-gray-500 mt-2 max-w-md leading-relaxed">
        Conecte sua conta Google para criar links do Meet automaticamente e sincronizar com seu Google Calendar.
      </p>
      <div className="mt-6 space-y-3 w-full max-w-xs">
        <button
          onClick={handleConnect}
          disabled={status === 'connecting'}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white border-2 border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {status === 'connecting' ? 'Redirecionando...' : 'Conectar com Google'}
        </button>
        <p className="text-xs text-gray-400">
          Você pode fazer isso depois em Configurações
        </p>
      </div>
    </div>
  )
}

function HorarioStep({
  horaInicio,
  horaFim,
  onInicioChange,
  onFimChange,
}: {
  horaInicio: number
  horaFim: number
  onInicioChange: (v: number) => void
  onFimChange: (v: number) => void
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <ScheduleIllustration className="w-20 h-16 shrink-0" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Horário de Atendimento</h2>
          <p className="text-sm text-gray-500 mt-1">Define o intervalo exibido no calendário</p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Início
            </label>
            <select
              value={horaInicio}
              onChange={(e) => onInicioChange(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300"
            >
              {hours.filter((h) => h < horaFim).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Fim
            </label>
            <select
              value={horaFim}
              onChange={(e) => onFimChange(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300"
            >
              {hours.filter((h) => h > horaInicio).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          O calendário mostrará apenas esse intervalo de horário
        </div>
      </div>
    </div>
  )
}

function ReadyStep({
  modo,
  plataforma,
  modoLink,
  linkFixo,
  horaInicio,
  horaFim,
}: {
  modo: ModoAtendimento
  plataforma: VideoPlataforma
  modoLink: VideoModoLink
  linkFixo: string
  horaInicio: number
  horaFim: number
}) {
  const plataformaLabel = (() => {
    if (modo === 'hibrido') {
      return `Híbrido (${plataforma === 'google_meet' ? 'Google Meet' : 'Plataforma externa'})`
    }
    if (plataforma === 'google_meet') return 'Online — Google Meet'
    if (plataforma === 'externo') return 'Online — Plataforma externa'
    return 'Presencial'
  })()

  const linkLabel = modoLink === 'link_fixo' ? 'Link fixo' : 'Por paciente'

  return (
    <div className="text-center flex flex-col items-center">
      <ReadyIllustration className="w-40 h-32 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900">Tudo pronto!</h2>
      <p className="text-gray-500 mt-2 max-w-md">
        Seu PsicoApp está configurado. Confira o resumo:
      </p>
      <div className="mt-5 w-full max-w-sm space-y-2">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-sm">
          <span className="text-gray-500">Atendimento</span>
          <span className="font-medium text-gray-900">{plataformaLabel}</span>
        </div>
        {plataforma !== 'nenhum' && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-sm">
            <span className="text-gray-500">Modo de link</span>
            <span className="font-medium text-gray-900">{linkLabel}</span>
          </div>
        )}
        {modoLink === 'link_fixo' && linkFixo.trim() && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-sm">
            <span className="text-gray-500">Link</span>
            <span className="font-medium text-gray-900 truncate max-w-[200px]">{linkFixo.trim()}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-sm">
          <span className="text-gray-500">Horário</span>
          <span className="font-medium text-gray-900">
            {String(horaInicio).padStart(2, '0')}:00 — {String(horaFim).padStart(2, '0')}:00
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4">
        Você pode alterar tudo em Configurações a qualquer momento
      </p>
    </div>
  )
}
