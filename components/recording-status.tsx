'use client'

import type { RecordingStatus } from '@/lib/types'

const steps: { key: RecordingStatus; label: string }[] = [
  { key: 'uploading', label: 'Enviando áudio' },
  { key: 'transcribing', label: 'Transcrevendo' },
  { key: 'processing', label: 'Analisando com IA' },
  { key: 'done', label: 'Pronto' },
]

interface RecordingStatusProps {
  status: RecordingStatus | null
  error?: string | null
  onReprocess?: () => void
}

export function RecordingStatusIndicator({ status, error, onReprocess }: RecordingStatusProps) {
  if (!status || status === 'recording') return null

  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">Erro no processamento</p>
            {error && <p className="text-xs text-red-600 mt-0.5 truncate">{error}</p>}
          </div>
          {onReprocess && (
            <button
              onClick={onReprocess}
              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Reprocessar
            </button>
          )}
        </div>
      </div>
    )
  }

  const currentIndex = steps.findIndex((s) => s.key === status)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
      <div className="flex items-center gap-2.5 mb-2">
        {status !== 'done' && (
          <svg className="w-4 h-4 text-blue-600 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {status === 'done' && (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <p className="text-sm font-medium text-blue-800">
          {status === 'done' ? 'Processamento concluído!' : 'Processando sessão...'}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {steps.map((step, i) => {
          const isDone = i < currentIndex || status === 'done'
          const isCurrent = i === currentIndex && status !== 'done'

          return (
            <div key={step.key} className="flex items-center gap-1.5 flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-full h-1 rounded-full transition-colors ${
                    isDone
                      ? 'bg-emerald-400'
                      : isCurrent
                        ? 'bg-blue-400 animate-pulse'
                        : 'bg-gray-200'
                  }`}
                />
                <span
                  className={`text-[10px] mt-1 ${
                    isDone ? 'text-emerald-600' : isCurrent ? 'text-blue-600 font-medium' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
