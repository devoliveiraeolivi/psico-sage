'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface VerificacaoResult {
  valid: boolean
  error?: string
  sessao?: {
    numero: number | null
    data_hora: string
    duracao: number | null
    paciente: string
  }
  profissional?: {
    nome: string | null
    crp: string | null
  }
}

export function VerificacaoContent() {
  const searchParams = useSearchParams()
  const [result, setResult] = useState<VerificacaoResult | null>(null)
  const [loading, setLoading] = useState(true)

  const sessaoId = searchParams.get('s')
  const codigo = searchParams.get('c')

  useEffect(() => {
    if (!sessaoId || !codigo) {
      setResult({ valid: false, error: 'Parâmetros de verificação ausentes.' })
      setLoading(false)
      return
    }

    fetch(`/api/comprovante/verificar?s=${sessaoId}&c=${codigo}`)
      .then((res) => res.json())
      .then(setResult)
      .catch(() => setResult({ valid: false, error: 'Erro ao verificar documento.' }))
      .finally(() => setLoading(false))
  }, [sessaoId, codigo])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold text-gray-900">Verificação de Documento</h1>
          <p className="text-sm text-gray-500 mt-1">Declaração de Comparecimento</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <svg className="w-6 h-6 animate-spin text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500 mt-3">Verificando autenticidade...</p>
          </div>
        ) : result?.valid ? (
          <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
            <div className="bg-emerald-50 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Documento Autêntico</p>
                <p className="text-xs text-emerald-600">Código: {codigo}</p>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{result.sessao?.paciente}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Data da Sessão</p>
                  <p className="text-sm text-gray-900 mt-0.5">{result.sessao?.data_hora ? formatDate(result.sessao.data_hora) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Duração</p>
                  <p className="text-sm text-gray-900 mt-0.5">{result.sessao?.duracao ? `${result.sessao.duracao} min` : '-'}</p>
                </div>
              </div>
              {result.profissional?.nome && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Profissional</p>
                  <p className="text-sm text-gray-900 mt-0.5">
                    {result.profissional.nome}
                    {result.profissional.crp && <span className="text-gray-500"> — CRP {result.profissional.crp}</span>}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div className="bg-red-50 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-900">Documento Inválido</p>
                <p className="text-xs text-red-600">{result?.error || 'Não foi possível verificar este documento.'}</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Sistema de verificação de documentos — PsicoApp
        </p>
      </div>
    </div>
  )
}
