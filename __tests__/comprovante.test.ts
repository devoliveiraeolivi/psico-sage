import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('comprovante', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.COMPROVANTE_HMAC_SECRET = 'test-secret-key-for-hmac'
  })

  it('generates a deterministic 8-char uppercase hex code', async () => {
    const { gerarCodigoVerificacao } = await import('@/lib/comprovante')
    const code = gerarCodigoVerificacao('sessao-123')
    expect(code).toMatch(/^[0-9A-F]{8}$/)

    // Same input always produces same output
    const code2 = gerarCodigoVerificacao('sessao-123')
    expect(code2).toBe(code)
  })

  it('generates different codes for different sessions', async () => {
    const { gerarCodigoVerificacao } = await import('@/lib/comprovante')
    const a = gerarCodigoVerificacao('sessao-aaa')
    const b = gerarCodigoVerificacao('sessao-bbb')
    expect(a).not.toBe(b)
  })

  it('verificarCodigo returns true for valid code', async () => {
    const { gerarCodigoVerificacao, verificarCodigo } = await import('@/lib/comprovante')
    const code = gerarCodigoVerificacao('sessao-xyz')
    expect(verificarCodigo('sessao-xyz', code)).toBe(true)
  })

  it('verificarCodigo is case-insensitive', async () => {
    const { gerarCodigoVerificacao, verificarCodigo } = await import('@/lib/comprovante')
    const code = gerarCodigoVerificacao('sessao-xyz')
    expect(verificarCodigo('sessao-xyz', code.toLowerCase())).toBe(true)
  })

  it('verificarCodigo returns false for wrong code', async () => {
    const { verificarCodigo } = await import('@/lib/comprovante')
    expect(verificarCodigo('sessao-xyz', 'AAAAAAAA')).toBe(false)
  })

  it('throws if no secret is configured', async () => {
    delete process.env.COMPROVANTE_HMAC_SECRET
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const { gerarCodigoVerificacao } = await import('@/lib/comprovante')
    expect(() => gerarCodigoVerificacao('test')).toThrow('COMPROVANTE_HMAC_SECRET')
  })

  it('falls back to SUPABASE_SERVICE_ROLE_KEY', async () => {
    delete process.env.COMPROVANTE_HMAC_SECRET
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fallback-key'
    const { gerarCodigoVerificacao } = await import('@/lib/comprovante')
    // Should not throw
    const code = gerarCodigoVerificacao('test')
    expect(code).toMatch(/^[0-9A-F]{8}$/)
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })
})
