'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AuthMode = 'login' | 'signup' | 'forgot'

function mapSupabaseError(message: string): string {
  const map: Record<string, string> = {
    'invalid login credentials': 'Email ou senha incorretos.',
    'email not confirmed': 'Email ainda não confirmado. Verifique sua caixa de entrada.',
    'user already registered': 'Este email já está cadastrado.',
    'password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
    'for security purposes, you can only request this once every 60 seconds':
      'Por segurança, aguarde 60 segundos antes de solicitar novamente.',
    'signup requires a valid password': 'Informe uma senha válida.',
  }

  const lower = message.toLowerCase()
  for (const [key, value] of Object.entries(map)) {
    if (lower.includes(key)) return value
  }

  return 'Ocorreu um erro inesperado. Tente novamente.'
}

function getPasswordStrength(pw: string) {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++

  const levels = [
    { label: 'Muito fraca', color: 'bg-red-500' },
    { label: 'Fraca', color: 'bg-orange-500' },
    { label: 'Razoável', color: 'bg-yellow-500' },
    { label: 'Boa', color: 'bg-blue-500' },
    { label: 'Forte', color: 'bg-green-500' },
  ]

  return { score, ...levels[score] }
}

/* ---------- SVG Icons ---------- */

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

/* ---------- Left Branding Panel ---------- */

function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(222,47%,11%)] via-[hsl(222,47%,18%)] to-[hsl(221,83%,40%)] flex-col justify-between p-12 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full border border-white/10" />
      <div className="absolute -bottom-12 -right-12 w-72 h-72 rounded-full border border-white/[0.06]" />
      <div className="absolute top-16 right-16 w-20 h-20 rounded-full bg-white/[0.04]" />
      <div className="absolute top-1/2 -left-8 w-40 h-40 rounded-full bg-white/[0.03]" />

      {/* Top - Brand */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">PsicoApp</h1>
        </div>
        <p className="text-white/60 text-sm mt-1">Plataforma inteligente para psicólogos</p>
      </div>

      {/* Middle - Features */}
      <div className="relative z-10 space-y-8">
        <Feature
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
          title="Prontuários com IA"
          description="Resumos automáticos das sessões gerados por inteligência artificial"
        />
        <Feature
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
          title="Agenda integrada"
          description="Sincronize com Google Calendar e gerencie seus horários"
        />
        <Feature
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          }
          title="Transcrição automática"
          description="Grave e transcreva sessões com alta precisão"
        />
      </div>

      {/* Bottom - Footer */}
      <div className="relative z-10">
        <p className="text-white/40 text-xs">&copy; {new Date().getFullYear()} PsicoApp. Todos os direitos reservados.</p>
      </div>
    </div>
  )
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/80 shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-medium text-sm">{title}</h3>
        <p className="text-white/50 text-sm mt-0.5">{description}</p>
      </div>
    </div>
  )
}

/* ---------- Main Login Content ---------- */

function LoginContent() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [isLoading, setIsLoading] = useState(false)

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Feedback
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check for callback errors from URL
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError === 'auth_callback_failed') {
      setError('Não foi possível processar o link. Tente solicitar um novo.')
    }
  }, [searchParams])

  function switchMode(newMode: AuthMode) {
    setMode(newMode)
    setError(null)
    setSuccess(null)
    setFieldErrors({})
    setPassword('')
    setConfirmPassword('')
    setFullName('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  function validateSignup(): boolean {
    const errors: Record<string, string> = {}
    if (!fullName.trim()) errors.name = 'Nome é obrigatório'
    if (password.length < 6) errors.password = 'Mínimo de 6 caracteres'
    if (password !== confirmPassword) errors.confirmPassword = 'As senhas não coincidem'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleLogin() {
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(mapSupabaseError(err instanceof Error ? err.message : 'Erro desconhecido'))
      setIsLoading(false)
    }
  }

  async function handleSignup() {
    if (!validateSignup()) return
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome: fullName.trim() },
        },
      })
      if (error) throw error
      setIsLoading(false)
      setSuccess('Conta criada com sucesso! Verifique seu email para confirmar o cadastro.')
    } catch (err) {
      setError(mapSupabaseError(err instanceof Error ? err.message : 'Erro desconhecido'))
      setIsLoading(false)
    }
  }

  async function handleForgotPassword() {
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      if (error) throw error
      setIsLoading(false)
      setSuccess('Email enviado! Verifique sua caixa de entrada para redefinir sua senha.')
    } catch (err) {
      setError(mapSupabaseError(err instanceof Error ? err.message : 'Erro desconhecido'))
      setIsLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'login') handleLogin()
    else if (mode === 'signup') handleSignup()
    else handleForgotPassword()
  }

  const strength = getPasswordStrength(password)

  const titles: Record<AuthMode, { heading: string; sub: string }> = {
    login: { heading: 'Bem-vindo de volta', sub: 'Entre na sua conta para continuar' },
    signup: { heading: 'Crie sua conta', sub: 'Comece a usar o PsicoApp gratuitamente' },
    forgot: { heading: 'Esqueceu a senha?', sub: 'Enviaremos um link para redefinir sua senha' },
  }

  const buttonLabels: Record<AuthMode, { idle: string; loading: string }> = {
    login: { idle: 'Entrar', loading: 'Entrando...' },
    signup: { idle: 'Criar conta', loading: 'Criando...' },
    forgot: { idle: 'Enviar link', loading: 'Enviando...' },
  }

  return (
    <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md">
        {/* Mobile brand header */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-foreground">PsicoApp</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-8">
          {/* Header */}
          <div className="mb-6" key={`header-${mode}`}>
            <h2 className="text-xl font-semibold text-foreground animate-fade-in">{titles[mode].heading}</h2>
            <p className="text-muted-foreground text-sm mt-1 animate-fade-in">{titles[mode].sub}</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 animate-fade-in">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Success banner */}
          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-3 animate-fade-in">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-700 flex-1">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} key={mode} className="animate-fade-in">
            <div className="space-y-4">
              {/* Full Name (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                    Nome completo
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      fieldErrors.name ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="Seu nome"
                  />
                  {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="seu@email.com"
                />
              </div>

              {/* Password (login & signup) */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                      Senha
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                      }}
                      required
                      minLength={6}
                      className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-lg bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                        fieldErrors.password ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOffIcon className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}

                  {/* Password strength (signup only) */}
                  {mode === 'signup' && password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i < strength.score ? strength.color : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{strength.label}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                      }}
                      required
                      minLength={6}
                      className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-lg bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                        fieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="Repita a senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOffIcon className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Spinner />}
              {isLoading ? buttonLabels[mode].loading : buttonLabels[mode].idle}
            </button>
          </form>

          {/* Mode switches */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' && (
              <p>
                Ainda não tem conta?{' '}
                <button onClick={() => switchMode('signup')} className="text-primary font-medium hover:text-primary/80 transition-colors">
                  Cadastre-se
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Já tem conta?{' '}
                <button onClick={() => switchMode('login')} className="text-primary font-medium hover:text-primary/80 transition-colors">
                  Faça login
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                Lembrou a senha?{' '}
                <button onClick={() => switchMode('login')} className="text-primary font-medium hover:text-primary/80 transition-colors">
                  Voltar ao login
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer (mobile) */}
        <p className="lg:hidden text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} PsicoApp. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}

/* ---------- Loading Skeleton ---------- */

function LoginSkeleton() {
  return (
    <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-8">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mb-8" />
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse mt-6" />
        </div>
      </div>
    </div>
  )
}

/* ---------- Page Export ---------- */

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-background">
      <BrandingPanel />
      <Suspense fallback={<LoginSkeleton />}>
        <LoginContent />
      </Suspense>
    </main>
  )
}
