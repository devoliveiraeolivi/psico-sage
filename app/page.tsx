import Link from 'next/link'
import { redirect } from 'next/navigation'

const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

export default function Home() {
  // Em modo mock, vai direto para o dashboard
  if (useMocks) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">PsicoSage</h1>
        <p className="text-muted-foreground mb-8">
          Sistema de gestão de sessões de terapia com IA
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Entrar
        </Link>
      </div>
    </main>
  )
}
