'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { RecordingStatus } from '@/lib/types'
import { RecordingStatusIndicator } from './recording-status'

interface SessionRecorderProps {
  sessaoId: string
  status: string
  recordingStatus?: RecordingStatus | null
  processingError?: string | null
  meetLink?: string | null
  hasAudio?: boolean
}

type SessionMode = 'meet' | 'presencial'

export function SessionRecorder({
  sessaoId,
  status,
  recordingStatus: initialRecordingStatus,
  processingError: initialError,
  meetLink: initialMeetLink,
  hasAudio = false,
}: SessionRecorderProps) {
  const [mode, setMode] = useState<SessionMode | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [pipelineStatus, setPipelineStatus] = useState<RecordingStatus | null>(
    initialRecordingStatus || null
  )
  const [error, setError] = useState<string | null>(initialError || null)
  const [isStarting, setIsStarting] = useState(false)
  const [googleNotConnected, setGoogleNotConnected] = useState(false)

  const [isUploading, setIsUploading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)
  const recordingTimeRef = useRef(0)
  const meetWindowRef = useRef<Window | null>(null)
  const meetPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll session status for background processing updates
  const startPolling = useCallback(() => {
    if (pollRef.current) return // Already polling

    setPipelineStatus('transcribing') // Show initial processing state

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessoes/${sessaoId}/status`)
        if (!res.ok) return

        const data = await res.json()
        const { recording_status, processing_error } = data

        // Update UI with current status
        if (recording_status) {
          setPipelineStatus(recording_status)
        }

        if (recording_status === 'done') {
          // Processing complete — reload to show results
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          setTimeout(() => window.location.reload(), 1500)
        } else if (recording_status === 'error') {
          // Processing failed
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          setError(processing_error || 'Erro no processamento')
        }
      } catch {
        // Network error — keep polling, it might recover
      }
    }, 3000) // Poll every 3 seconds
  }, [sessaoId])

  // Re-trigger processing for failed sessions
  const handleReprocess = useCallback(async () => {
    setError(null)
    setPipelineStatus('transcribing')
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/reprocess`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Falha ao reprocessar')
      }
      startPolling()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reprocessar. Tente novamente.')
      setPipelineStatus('error')
    }
  }, [sessaoId, startPolling])

  // On mount: if session is already processing, start polling
  useEffect(() => {
    if (
      initialRecordingStatus &&
      ['transcribing', 'processing', 'uploading'].includes(initialRecordingStatus)
    ) {
      startPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Limpar recursos no unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (meetPollRef.current) clearInterval(meetPollRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      displayStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return

    // Parar timer e polling do Meet
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (meetPollRef.current) {
      clearInterval(meetPollRef.current)
      meetPollRef.current = null
    }

    const duration = recordingTimeRef.current

    // Parar gravação
    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!
      recorder.onstop = async () => {
        setIsRecording(false)

        // Parar streams
        streamRef.current?.getTracks().forEach((t) => t.stop())
        displayStreamRef.current?.getTracks().forEach((t) => t.stop())

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

        // Upload audio — background processing is triggered automatically via Inngest
        try {
          setPipelineStatus('uploading')
          const uploadForm = new FormData()
          uploadForm.append('audio', audioBlob, `sessao_${sessaoId}.webm`)
          uploadForm.append('duration', String(duration))

          const uploadRes = await fetch(`/api/sessoes/${sessaoId}/upload-audio`, {
            method: 'POST',
            body: uploadForm,
          })
          if (!uploadRes.ok) throw new Error('Falha no upload do áudio')

          // Upload done — pipeline runs in background. Start polling for status.
          startPolling()
        } catch (err) {
          setPipelineStatus('error')
          setError(err instanceof Error ? err.message : 'Erro no processamento')
        }

        resolve()
      }

      recorder.stop()
    })
  }, [sessaoId])

  const startRecording = useCallback(async (selectedMode: SessionMode) => {
    setIsStarting(true)
    setError(null)

    try {
      // 1. Capturar áudio ANTES de tudo (pedir permissão ao usuário)
      let combinedStream: MediaStream

      if (selectedMode === 'meet') {
        // Telehealth: mic + áudio da aba do Meet
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          streamRef.current = micStream
          combinedStream = micStream
        } catch {
          throw new Error('Permissão de microfone negada')
        }
      } else {
        // Presencial: só microfone
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          streamRef.current = micStream
          combinedStream = micStream
        } catch {
          throw new Error('Permissão de microfone negada')
        }
      }

      // 2. Iniciar sessão no backend (pular se já está em andamento)
      let meetLink: string | null = null

      if (status !== 'em_andamento') {
        const startRes = await fetch(`/api/sessoes/${sessaoId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: selectedMode }),
        })

        if (!startRes.ok) {
          const data = await startRes.json()
          // Liberar mic se falhar
          streamRef.current?.getTracks().forEach(t => t.stop())
          streamRef.current = null
          if (data.error === 'google_not_connected') {
            setGoogleNotConnected(true)
            setIsStarting(false)
            return
          }
          throw new Error(data.message || data.error || 'Erro ao iniciar sessão')
        }

        const result = await startRes.json()
        meetLink = result.meetLink
      }

      // 3. Abrir Google Meet se modo telehealth (só na primeira vez)
      if (selectedMode === 'meet' && meetLink) {
        const meetWindow = window.open(meetLink, '_blank')
        meetWindowRef.current = meetWindow

        // Tentar capturar áudio da aba do Meet (após abrir)
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: false,
          } as any)
          displayStreamRef.current = displayStream

          // Combinar mic + display audio
          const audioContext = new AudioContext()
          const destination = audioContext.createMediaStreamDestination()

          const micSource = audioContext.createMediaStreamSource(streamRef.current!)
          micSource.connect(destination)

          const displaySource = audioContext.createMediaStreamSource(displayStream)
          displaySource.connect(destination)

          combinedStream = destination.stream

          // Se o display stream for encerrado, parar gravação
          displayStream.getAudioTracks()[0]?.addEventListener('ended', () => {
            if (mediaRecorderRef.current?.state === 'recording') {
              stopRecording()
            }
          })
        } catch {
          // Se não conseguir capturar tab audio, usar só o mic
          console.warn('Não foi possível capturar áudio da aba. Usando apenas microfone.')
        }
      }

      // 4. Iniciar MediaRecorder
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(1000) // Chunk a cada 1s
      mediaRecorderRef.current = recorder

      // 5. Timer
      recordingTimeRef.current = 0
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1
        setRecordingTime((t) => t + 1)
      }, 1000)

      // 6. Polling: encerrar sessão automaticamente quando Meet for fechado
      if (selectedMode === 'meet' && meetWindowRef.current) {
        meetPollRef.current = setInterval(() => {
          if (meetWindowRef.current?.closed) {
            if (meetPollRef.current) {
              clearInterval(meetPollRef.current)
              meetPollRef.current = null
            }
            // Meet foi fechado → encerrar gravação e sessão
            if (mediaRecorderRef.current?.state === 'recording') {
              stopRecording()
            }
          }
        }, 2000)
      }

      setIsRecording(true)
      setMode(selectedMode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar gravação')
    } finally {
      setIsStarting(false)
    }
  }, [sessaoId, stopRecording])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Ask for confirmation if there's already an audio recording
    if (hasAudio) {
      const confirmed = window.confirm(
        'Esta sessão já possui uma gravação. Deseja substituí-la pelo novo arquivo?'
      )
      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
    }

    setIsUploading(true)
    setError(null)

    try {
      // Iniciar sessão se ainda está agendada
      if (status === 'agendada') {
        const startRes = await fetch(`/api/sessoes/${sessaoId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'presencial' }),
        })
        if (!startRes.ok) {
          const data = await startRes.json()
          throw new Error(data.message || data.error || 'Erro ao iniciar sessão')
        }
      }

      // Upload — background processing is triggered automatically via Inngest
      setPipelineStatus('uploading')
      const uploadForm = new FormData()
      uploadForm.append('audio', file, file.name)

      const uploadRes = await fetch(`/api/sessoes/${sessaoId}/upload-audio`, {
        method: 'POST',
        body: uploadForm,
      })
      if (!uploadRes.ok) throw new Error('Falha no upload do áudio')

      // Upload done — pipeline runs in background. Start polling for status.
      startPolling()
    } catch (err) {
      setPipelineStatus('error')
      setError(err instanceof Error ? err.message : 'Erro no processamento')
    } finally {
      setIsUploading(false)
      // Resetar input para permitir re-upload do mesmo arquivo
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [sessaoId, status, hasAudio, startPolling])

  // Reusable upload strip shown across multiple states
  const uploadStrip = (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/50">
      <p className="text-xs text-gray-500">
        {hasAudio ? 'Substituir gravação? Envie outro áudio.' : 'Gravou por fora? Envie o áudio da sessão.'}
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.mp4"
        className="hidden"
        onChange={handleFileUpload}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
      >
        {isUploading ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        )}
        {isUploading ? 'Enviando...' : 'Enviar Áudio'}
      </button>
    </div>
  )

  // Sessão cancelada — nada a mostrar
  if (status === 'cancelada') return null

  // Sessão não é agendada nem em andamento — mostrar pipeline status + upload
  if (status !== 'agendada' && status !== 'em_andamento') {
    // Pipeline actively running (uploading/transcribing/processing)
    const isActivelyProcessing = pipelineStatus && ['uploading', 'transcribing', 'processing'].includes(pipelineStatus)
    if (isActivelyProcessing) {
      return (
        <RecordingStatusIndicator status={pipelineStatus} error={error} onReprocess={handleReprocess} />
      )
    }

    // Pipeline error — show compact error with reprocess
    if (pipelineStatus === 'error') {
      return (
        <RecordingStatusIndicator status={pipelineStatus} error={error} onReprocess={handleReprocess} />
      )
    }

    // Completed or idle — compact inline: just a subtle upload option
    return (
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.mp4"
          className="hidden"
          onChange={handleFileUpload}
        />
        {pipelineStatus === 'done' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Processado
          </span>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {isUploading ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
          {isUploading ? 'Enviando...' : hasAudio ? 'Reenviar áudio' : 'Enviar áudio'}
        </button>
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    )
  }

  // Sessão em andamento mas não estamos gravando (recarregou a página ou erro anterior)
  if (status === 'em_andamento' && !isRecording) {
    // Se tem erro, mostrar com opção de retomar
    const showError = pipelineStatus === 'error' && error

    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2.5">
        {showError && (
          <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
            <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-red-700 flex-1">{error}</p>
            <button onClick={() => { setError(null); setPipelineStatus(null) }} className="text-red-400 hover:text-red-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-sm text-orange-700">
            Sessão em andamento. A gravação não está ativa nesta aba.
          </p>
          <div className="flex items-center gap-2">
            {initialMeetLink && (
              <a
                href={initialMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Reabrir Meet
              </a>
            )}
            <button
              onClick={() => { setError(null); setPipelineStatus(null); startRecording('presencial') }}
              disabled={isStarting}
              className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-white border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              {isStarting ? 'Iniciando...' : 'Retomar Gravação'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Gravando — mostrar timer e botão de parar
  if (isRecording) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Gravando {mode === 'meet' ? '(Google Meet)' : '(Presencial)'}
              </p>
              <p className="text-xl font-mono font-bold text-red-700 mt-0.5">
                {formatTime(recordingTime)}
              </p>
            </div>
          </div>
          <button
            onClick={stopRecording}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Encerrar Sessão
          </button>
        </div>
      </div>
    )
  }

  // Pipeline em andamento
  if (pipelineStatus) {
    const isActivelyProcessing = ['uploading', 'transcribing', 'processing'].includes(pipelineStatus)
    return (
      <div className="space-y-0">
        <RecordingStatusIndicator status={pipelineStatus} error={error} onReprocess={handleReprocess} />
        {!isActivelyProcessing && (
          <div className="bg-gray-50 border border-gray-200 rounded-b-xl px-4 pb-3 -mt-1 pt-1 rounded-t-none">
            {uploadStrip}
          </div>
        )}
      </div>
    )
  }

  // Google não conectado — mostrar prompt
  if (googleNotConnected) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900">Conta Google não vinculada</h3>
            <p className="text-xs text-amber-700 mt-1">
              Para iniciar sessões via Google Meet, você precisa conectar sua conta Google.
              Após conectar, volte aqui e clique em &quot;Google Meet&quot; novamente.
            </p>
            <div className="flex gap-2 mt-3">
              <a
                href="/api/auth/google"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="white" opacity="0.8"/>
                </svg>
                Conectar Google
              </a>
              <button
                onClick={() => { setGoogleNotConnected(false); setError(null) }}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Estado inicial — escolher modo
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-blue-900">Iniciar Sessão</h3>
          <p className="text-xs text-blue-600 mt-0.5">
            Escolha o modo e a gravação começará automaticamente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => startRecording('presencial')}
            disabled={isStarting}
            className="px-3.5 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            Presencial
          </button>
          <button
            onClick={() => startRecording('meet')}
            disabled={isStarting}
            className="px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isStarting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            )}
            Google Meet
          </button>
        </div>
      </div>

      {/* Upload manual */}
      {uploadStrip}

      {error && (
        <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
