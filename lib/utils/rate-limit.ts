interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
let cleanupScheduled = false
function scheduleCleanup() {
  if (cleanupScheduled) return
  cleanupScheduled = true
  setTimeout(() => {
    const now = Date.now()
    store.forEach((entry, key) => {
      if (entry.resetAt <= now) store.delete(key)
    })
    cleanupScheduled = false
  }, 5 * 60 * 1000)
}

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum requests allowed per window */
  maxRequests: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * Simple in-memory sliding window rate limiter.
 * Suitable for single-instance VPS deployments.
 *
 * @param key - Unique identifier (e.g. `transcribe:${userId}`)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  // Window expired or first request
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowMs
    store.set(key, { count: 1, resetAt })
    scheduleCleanup()
    return { success: true, remaining: config.maxRequests - 1, resetAt }
  }

  // Within window
  if (entry.count < config.maxRequests) {
    entry.count++
    return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
  }

  // Rate limited
  return { success: false, remaining: 0, resetAt: entry.resetAt }
}

/** Pre-configured rate limits for specific routes */
export const RATE_LIMITS = {
  transcribe: { windowMs: 60_000, maxRequests: 5 } as RateLimitConfig,
  extract: { windowMs: 60_000, maxRequests: 5 } as RateLimitConfig,
  uploadAudio: { windowMs: 60_000, maxRequests: 10 } as RateLimitConfig,
  batchPacientes: { windowMs: 60_000, maxRequests: 3 } as RateLimitConfig,
  aiAdjust: { windowMs: 60_000, maxRequests: 5 } as RateLimitConfig,
  reprocess: { windowMs: 60_000, maxRequests: 3 } as RateLimitConfig,
} as const
