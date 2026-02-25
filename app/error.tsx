'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Algo deu errado</h2>
      <p className="text-sm text-gray-500">Ocorreu um erro inesperado. Tente novamente.</p>
      {error.digest && (
        <p className="text-xs text-gray-400">Código: {error.digest}</p>
      )}
      <button
        onClick={() => reset()}
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
