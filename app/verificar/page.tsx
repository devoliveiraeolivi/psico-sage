import { Suspense } from 'react'
import { VerificacaoContent } from './verificacao-content'

export default function VerificarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <h1 className="text-lg font-semibold text-gray-900">Verificação de Documento</h1>
              <p className="text-sm text-gray-500 mt-1">Declaração de Comparecimento</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <svg className="w-6 h-6 animate-spin text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500 mt-3">Carregando...</p>
            </div>
          </div>
        </div>
      }
    >
      <VerificacaoContent />
    </Suspense>
  )
}
