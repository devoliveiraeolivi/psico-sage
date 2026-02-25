import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <h2 className="text-lg font-semibold text-gray-900">Página não encontrada</h2>
      <p className="text-sm text-gray-500">A página que você procura não existe ou foi movida.</p>
      <Link
        href="/dashboard"
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
