import * as Sentry from '@sentry/node'

let initialized = false

/**
 * Initialize Sentry for server-side error tracking.
 * Only initializes once, safe to call multiple times.
 * Set SENTRY_DSN env var to enable.
 */
export function initSentry() {
  if (initialized) return
  initialized = true

  const dsn = process.env.SENTRY_DSN
  if (!dsn) return // Sentry is optional — skip if no DSN configured

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    // Don't send PII (patient data) to Sentry
    beforeSend(event) {
      // Strip any potential patient data from error messages
      if (event.message) {
        event.message = event.message.replace(/paciente[_\s]?id[:\s]*[a-f0-9-]+/gi, 'paciente_id:[REDACTED]')
      }
      return event
    },
  })
}

/**
 * Capture an exception with optional context.
 * No-op if Sentry is not configured.
 */
export function captureException(
  error: Error,
  context?: { sessaoId?: string; userId?: string; operation?: string }
) {
  if (!process.env.SENTRY_DSN) return

  initSentry()

  Sentry.withScope((scope) => {
    if (context?.sessaoId) scope.setTag('sessao_id', context.sessaoId)
    if (context?.userId) scope.setTag('user_id', context.userId)
    if (context?.operation) scope.setTag('operation', context.operation)
    Sentry.captureException(error)
  })
}
