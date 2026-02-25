import { Sidebar } from './sidebar'
import { AppProviders } from '@/components/app-providers'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth is enforced by middleware (lib/supabase/middleware.ts)
  // No need to call auth.getUser() here — saves a network round-trip per page load

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AppProviders>
          <div className="px-8 py-8 w-full flex-1 flex flex-col min-h-0 overflow-auto">
            {children}
          </div>
        </AppProviders>
      </main>
    </div>
  )
}
