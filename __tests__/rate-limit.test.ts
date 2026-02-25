import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('rate-limit', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('allows requests within the limit', async () => {
    const { checkRateLimit } = await import('@/lib/utils/rate-limit')
    const config = { windowMs: 60_000, maxRequests: 3 }

    const r1 = checkRateLimit('test-allow', config)
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = checkRateLimit('test-allow', config)
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = checkRateLimit('test-allow', config)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests over the limit', async () => {
    const { checkRateLimit } = await import('@/lib/utils/rate-limit')
    const config = { windowMs: 60_000, maxRequests: 2 }

    checkRateLimit('test-block', config)
    checkRateLimit('test-block', config)

    const blocked = checkRateLimit('test-block', config)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.resetAt).toBeGreaterThan(Date.now())
  })

  it('resets after window expires', async () => {
    const { checkRateLimit } = await import('@/lib/utils/rate-limit')
    const config = { windowMs: 100, maxRequests: 1 }

    const r1 = checkRateLimit('test-reset', config)
    expect(r1.success).toBe(true)

    const r2 = checkRateLimit('test-reset', config)
    expect(r2.success).toBe(false)

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 150))

    const r3 = checkRateLimit('test-reset', config)
    expect(r3.success).toBe(true)
  })

  it('tracks different keys independently', async () => {
    const { checkRateLimit } = await import('@/lib/utils/rate-limit')
    const config = { windowMs: 60_000, maxRequests: 1 }

    const a = checkRateLimit('user-a', config)
    const b = checkRateLimit('user-b', config)
    expect(a.success).toBe(true)
    expect(b.success).toBe(true)

    // user-a is now blocked
    expect(checkRateLimit('user-a', config).success).toBe(false)
    // user-b is now blocked
    expect(checkRateLimit('user-b', config).success).toBe(false)
  })

  it('RATE_LIMITS has all expected keys', async () => {
    const { RATE_LIMITS } = await import('@/lib/utils/rate-limit')
    expect(RATE_LIMITS).toHaveProperty('transcribe')
    expect(RATE_LIMITS).toHaveProperty('extract')
    expect(RATE_LIMITS).toHaveProperty('uploadAudio')
    expect(RATE_LIMITS).toHaveProperty('batchPacientes')
    expect(RATE_LIMITS).toHaveProperty('aiAdjust')
    expect(RATE_LIMITS).toHaveProperty('reprocess')
  })
})
