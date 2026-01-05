import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="font-bold">
            PsicoSage
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm hover:text-primary">
              Dashboard
            </Link>
            <Link href="/pacientes" className="text-sm hover:text-primary">
              Pacientes
            </Link>
            <Link href="/agenda" className="text-sm hover:text-primary">
              Agenda
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
