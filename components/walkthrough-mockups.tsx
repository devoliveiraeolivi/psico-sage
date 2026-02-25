'use client'

interface MockupProps {
  activeHighlightId: string
  ringColor: string // e.g. 'ring-blue-400'
}

function Region({
  id,
  activeId,
  ringColor,
  children,
  className = '',
}: {
  id: string
  activeId: string
  ringColor: string
  children: React.ReactNode
  className?: string
}) {
  const isActive = id === activeId
  return (
    <div
      className={`transition-all duration-300 rounded-lg ${
        isActive
          ? `${ringColor} ring-2 ring-offset-2 shadow-md relative z-10`
          : 'opacity-50'
      } ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Barra de status fake ───
function FakeStatusBadge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${color}`}>
      {text}
    </span>
  )
}

// ─── SESSION PAGE MOCKUP (Recording) ───
export function RecordingMockup({ activeHighlightId, ringColor }: MockupProps) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2 text-[10px]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
          <span className="text-[8px] font-semibold text-blue-700">MC</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-900">Sessão 12</span>
            <FakeStatusBadge text="Agendada" color="bg-blue-50 text-blue-700 border-blue-200" />
          </div>
          <span className="text-[9px] text-gray-400">Maria Costa · 24/02/2026, 14:00</span>
        </div>
      </div>

      {/* Iniciar Sessão Bar */}
      <Region id="start-session" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-blue-900">Iniciar Sessão</p>
              <p className="text-[8px] text-blue-600">Escolha o modo e a gravação começa</p>
            </div>
            <div className="flex gap-1">
              <span className="px-2 py-1 text-[8px] font-medium text-blue-700 bg-white border border-blue-200 rounded-md">
                Presencial
              </span>
              <span className="px-2 py-1 text-[8px] font-medium text-white bg-blue-600 rounded-md">
                Google Meet
              </span>
            </div>
          </div>
        </div>
      </Region>

      {/* Recording Bar — Presencial */}
      <Region id="recording-presencial" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div>
                <p className="text-[10px] font-medium text-red-800">Gravando (Presencial)</p>
                <p className="text-[13px] font-mono font-bold text-red-700">12:34</p>
              </div>
            </div>
            <span className="px-2 py-1 text-[8px] font-medium text-white bg-red-600 rounded-md flex items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
              Encerrar
            </span>
          </div>
          <p className="text-[7px] text-red-500 mt-1">Microfone do computador · Início e encerramento manuais</p>
        </div>
      </Region>

      {/* Recording Bar — Google Meet */}
      <Region id="recording-meet" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-[10px] font-medium text-emerald-800">Gravando (Google Meet)</p>
                <p className="text-[13px] font-mono font-bold text-emerald-700">08:15</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none">
                <path d="M12 15V9l6-4.5v15L12 15z" fill="#34A853" />
                <rect x="4" y="6.5" width="8" height="11" rx="1" fill="#4285F4" />
              </svg>
              <span className="text-[8px] font-medium text-emerald-700">Chamada ativa</span>
            </div>
          </div>
          <p className="text-[7px] text-emerald-500 mt-1">Áudio da videochamada · Início e encerramento automáticos</p>
        </div>
      </Region>

      {/* Upload Strip */}
      <Region id="upload-strip" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="flex items-center justify-between border-t border-gray-200 pt-2 px-1">
          <p className="text-[9px] text-gray-500">Gravou por fora? Envie o áudio da sessão.</p>
          <span className="px-2 py-1 text-[8px] font-medium text-gray-600 bg-white border border-gray-200 rounded-md flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Enviar Áudio
          </span>
        </div>
      </Region>

      {/* Pipeline Status */}
      <Region id="pipeline-status" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
          <div className="flex items-center gap-1.5">
            {['Enviando', 'Transcrevendo', 'Processando', 'Concluído'].map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${
                  i < 2 ? 'bg-blue-600 text-white' : i === 2 ? 'bg-blue-200 text-blue-600' : 'bg-gray-200 text-gray-400'
                }`}>
                  {i < 2 ? '✓' : i + 1}
                </div>
                <span className={`text-[8px] ${i <= 2 ? 'text-blue-700' : 'text-gray-400'}`}>{label}</span>
                {i < 3 && <div className={`w-3 h-px ${i < 2 ? 'bg-blue-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      </Region>
    </div>
  )
}

// ─── SESSION PAGE MOCKUP (Prontuário) ───
export function ProntuarioMockup({ activeHighlightId, ringColor }: MockupProps) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2 text-[10px]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
          <span className="text-[8px] font-semibold text-blue-700">MC</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-900">Sessão 12</span>
            <FakeStatusBadge text="Aguardando Aprovação" color="bg-amber-50 text-amber-700 border-amber-200" />
          </div>
          <span className="text-[9px] text-gray-400">Maria Costa · 24/02/2026, 14:00</span>
        </div>
      </div>

      {/* Pipeline done */}
      <Region id="pipeline-done" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[9px] text-emerald-700 font-medium">Transcrição e prontuário gerados pela IA</span>
        </div>
      </Region>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        <span className="text-[9px] px-2 py-1 text-gray-400">Preparação</span>
        <span className="text-[9px] px-2 py-1 font-semibold text-blue-600 border-b-2 border-blue-600">Prontuário</span>
        <span className="text-[9px] px-2 py-1 text-gray-400">Transcrição</span>
      </div>

      {/* Prontuário Content */}
      <Region id="prontuario-content" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="space-y-1.5 p-2 bg-white rounded-lg border border-gray-100">
          <div>
            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Síntese</p>
            <div className="h-2 bg-gray-200 rounded w-full mt-0.5" />
            <div className="h-2 bg-gray-200 rounded w-4/5 mt-0.5" />
          </div>
          <div>
            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Pontos de Atenção</p>
            <div className="flex gap-1 mt-0.5">
              <span className="h-2 bg-red-200 rounded w-16" />
              <span className="h-2 bg-amber-200 rounded w-20" />
            </div>
          </div>
          <div>
            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Estado Mental</p>
            <div className="flex gap-1 mt-0.5 flex-wrap">
              <span className="px-1 py-0.5 bg-blue-50 text-[7px] text-blue-600 rounded">Humor: ansioso</span>
              <span className="px-1 py-0.5 bg-blue-50 text-[7px] text-blue-600 rounded">Afeto: congruente</span>
              <span className="px-1 py-0.5 bg-blue-50 text-[7px] text-blue-600 rounded">Insight: parcial</span>
            </div>
          </div>
          <div>
            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Evolução CFP</p>
            <div className="h-2 bg-gray-200 rounded w-full mt-0.5" />
            <div className="h-2 bg-gray-200 rounded w-3/4 mt-0.5" />
          </div>
          <div>
            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Plano Terapêutico</p>
            <div className="h-2 bg-gray-200 rounded w-full mt-0.5" />
          </div>
        </div>
      </Region>

      {/* Adjust Section */}
      <Region id="adjust-section" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="bg-violet-50/50 border border-violet-200 rounded-lg p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Ajustar por IA
            </p>
          </div>
          <div className="bg-white border border-violet-100 rounded-md p-1.5 text-[8px] text-gray-400">
            Ex: &quot;O humor deveria ser ansioso, não eutímico&quot;
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[7px] text-violet-400">Descreva o que precisa corrigir</span>
            <span className="px-2 py-0.5 text-[7px] font-medium text-white bg-violet-600 rounded-md">
              Enviar
            </span>
          </div>
        </div>
      </Region>

      {/* Approval Bar */}
      <Region id="approve-button" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2">
          <span className="text-[9px] text-gray-500">Revise e aprove o prontuário</span>
          <div className="flex gap-1">
            <span className="px-2 py-1 text-[8px] font-medium text-amber-700 bg-white border border-amber-300 rounded-md">
              Editar
            </span>
            <span className="px-2 py-1 text-[8px] font-medium text-white bg-emerald-600 rounded-md">
              Aprovar
            </span>
          </div>
        </div>
      </Region>
    </div>
  )
}

// ─── PATIENT REGISTRATION MOCKUP ───
export function PatientRegistrationMockup({ activeHighlightId, ringColor }: MockupProps) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2 text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-gray-900">Pacientes</span>
          <span className="text-[9px] text-gray-400 ml-1.5">12 cadastrados</span>
        </div>
        <Region id="new-patient-btn" activeId={activeHighlightId} ringColor={ringColor} className="inline-flex">
          <span className="px-2 py-1 text-[8px] font-medium text-white bg-blue-600 rounded-md flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Novo Paciente
          </span>
        </Region>
      </div>

      {/* Batch registration */}
      <Region id="batch-registration" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <span className="text-[9px] font-medium text-blue-700">Cadastro em Massa</span>
            </div>
            <span className="text-[8px] text-blue-600">Tabela editável →</span>
          </div>
          <div className="mt-1.5 grid grid-cols-4 gap-px bg-blue-200 rounded overflow-hidden">
            {['Nome *', 'Email', 'Dia *', 'Horário *'].map(h => (
              <div key={h} className="bg-blue-100 px-1 py-0.5 text-[7px] font-medium text-blue-600">{h}</div>
            ))}
            {['Ana Silva', 'ana@...', 'Segunda', '09:00'].map((v, i) => (
              <div key={i} className="bg-white px-1 py-0.5 text-[7px] text-gray-600">{v}</div>
            ))}
            {['Carlos M.', '', 'Quarta', '14:00'].map((v, i) => (
              <div key={i} className="bg-white px-1 py-0.5 text-[7px] text-gray-600">{v || <span className="text-gray-300">—</span>}</div>
            ))}
          </div>
        </div>
      </Region>

      {/* Patient profile */}
      <Region id="patient-profile" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="bg-white border border-gray-200 rounded-lg p-2">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <span className="text-[8px] font-semibold text-emerald-700">AS</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-gray-900">Ana Silva</span>
              <div className="flex items-center gap-1">
                <FakeStatusBadge text="Ativo" color="bg-emerald-50 text-emerald-700 border-emerald-200" />
                <span className="text-[8px] text-gray-400">Seg, 09:00</span>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div>
              <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Síntese Clínica</p>
              <div className="h-1.5 bg-gray-100 rounded w-full mt-0.5" />
              <div className="h-1.5 bg-gray-100 rounded w-3/4 mt-0.5" />
            </div>
            <div className="flex gap-1">
              <span className="text-[7px] px-1 py-0.5 bg-blue-50 text-blue-600 rounded">Humor</span>
              <span className="text-[7px] px-1 py-0.5 bg-violet-50 text-violet-600 rounded">Conflitos</span>
              <span className="text-[7px] px-1 py-0.5 bg-amber-50 text-amber-600 rounded">Evolução</span>
            </div>
          </div>
        </div>
      </Region>

      {/* Video link */}
      <Region id="video-link" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2">
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-[9px] text-gray-600">meet.google.com/abc-defg-hij</span>
          </div>
          <span className="px-1.5 py-0.5 text-[7px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded">
            Google Meet
          </span>
        </div>
      </Region>
    </div>
  )
}

// ─── CALENDAR PAGE MOCKUP ───
export function CalendarMockup({ activeHighlightId, ringColor }: MockupProps) {
  const hours = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2 text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold text-gray-900">Fev 2026</span>
            <span className="w-4 h-4 flex items-center justify-center text-gray-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          </div>
          <span className="px-1.5 py-0.5 text-[8px] text-gray-600 border border-gray-200 rounded-md bg-white">Hoje</span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <Region id="calendar-views" activeId={activeHighlightId} ringColor={ringColor} className="inline-flex">
            <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
              <span className="px-2 py-1 text-[8px] font-medium bg-blue-600 text-white">Semana</span>
              <span className="px-2 py-1 text-[8px] font-medium text-gray-600">Mês</span>
            </div>
          </Region>

          {/* Nova Sessão */}
          <Region id="nova-sessao-btn" activeId={activeHighlightId} ringColor={ringColor} className="inline-flex">
            <span className="px-2 py-1 text-[8px] font-medium text-white bg-blue-600 rounded-lg flex items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nova Sessão
            </span>
          </Region>
        </div>
      </div>

      {/* Google sync badge */}
      <Region id="google-sync" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
          <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <span className="text-[8px] text-emerald-700 font-medium">Sincronizado com Google Calendar</span>
          <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </Region>

      {/* Calendar Grid */}
      <Region id="calendar-grid" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-6 border-b border-gray-100">
            <div className="p-1" /> {/* hour column */}
            {days.map(day => (
              <div key={day} className="p-1 text-center text-[8px] font-medium text-gray-500 border-l border-gray-100">
                {day}
              </div>
            ))}
          </div>

          {/* Time rows */}
          {hours.map((hour, hi) => (
            <div key={hour} className="grid grid-cols-6 border-b border-gray-50 min-h-[18px]">
              <div className="px-1 py-0.5 text-[7px] text-gray-400 text-right pr-1.5">{hour}</div>
              {days.map((day, di) => (
                <div key={day} className="border-l border-gray-50 relative">
                  {/* Session blocks */}
                  {hi === 0 && di === 0 && (
                    <div className="absolute inset-x-0.5 top-0.5 bg-blue-100 border border-blue-300 rounded px-0.5 py-px text-[6px] text-blue-700 truncate">
                      Ana S.
                    </div>
                  )}
                  {hi === 2 && di === 1 && (
                    <div className="absolute inset-x-0.5 top-0.5 bg-emerald-100 border border-emerald-300 rounded px-0.5 py-px text-[6px] text-emerald-700 truncate">
                      Carlos M.
                    </div>
                  )}
                  {hi === 4 && di === 2 && (
                    <div className="absolute inset-x-0.5 top-0.5 bg-amber-100 border border-amber-300 rounded px-0.5 py-px text-[6px] text-amber-700 truncate">
                      Julia R.
                    </div>
                  )}
                  {hi === 5 && di === 3 && (
                    <div className="absolute inset-x-0.5 top-0.5 bg-blue-100 border border-blue-300 rounded px-0.5 py-px text-[6px] text-blue-700 truncate">
                      Pedro L.
                    </div>
                  )}
                  {hi === 1 && di === 4 && (
                    <div className="absolute inset-x-0.5 top-0.5 bg-emerald-100 border border-emerald-300 rounded px-0.5 py-px text-[6px] text-emerald-700 truncate">
                      Maria C.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Region>

      {/* Working hours indicator */}
      <Region id="working-hours" activeId={activeHighlightId} ringColor={ringColor}>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg">
          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[8px] text-gray-600">Horário de atendimento: <strong>08:00 – 18:00</strong></span>
        </div>
      </Region>
    </div>
  )
}
