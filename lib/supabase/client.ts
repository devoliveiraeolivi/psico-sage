import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'

export const useMocks = !process.env.NEXT_PUBLIC_SUPABASE_URL

export function createClient() {
  if (useMocks) {
    return null
  }
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
