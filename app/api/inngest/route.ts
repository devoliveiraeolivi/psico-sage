import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { processSessionPipeline, extractSessionOnly, recoverStuckSessions } from '@/lib/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processSessionPipeline, extractSessionOnly, recoverStuckSessions],
})
