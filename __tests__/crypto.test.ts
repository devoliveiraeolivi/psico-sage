import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { randomBytes } from 'crypto'

// Generate a test key (64 hex chars = 32 bytes)
const TEST_KEY = randomBytes(32).toString('hex')

describe('crypto', () => {
  beforeEach(() => {
    // Reset module cache so getKey() re-reads env
    vi.resetModules()
    process.env.ENCRYPTION_KEY = TEST_KEY
  })

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY
  })

  it('encrypts and decrypts a string round-trip', async () => {
    const { encrypt, decrypt } = await import('@/lib/utils/crypto')
    const plaintext = 'Sessão de terapia confidencial'
    const encrypted = encrypt(plaintext)
    expect(encrypted).toMatch(/^enc:v1:/)
    expect(encrypted).not.toContain(plaintext)
    expect(decrypt(encrypted)).toBe(plaintext)
  })

  it('produces different ciphertexts for the same input (unique IV)', async () => {
    const { encrypt } = await import('@/lib/utils/crypto')
    const plaintext = 'test'
    const a = encrypt(plaintext)
    const b = encrypt(plaintext)
    expect(a).not.toBe(b)
  })

  it('isEncrypted detects the enc:v1: prefix', async () => {
    const { isEncrypted } = await import('@/lib/utils/crypto')
    expect(isEncrypted('enc:v1:abc:def:123')).toBe(true)
    expect(isEncrypted('plain text')).toBe(false)
    expect(isEncrypted(null)).toBe(false)
    expect(isEncrypted(42)).toBe(false)
  })

  it('throws if ENCRYPTION_KEY is missing', async () => {
    delete process.env.ENCRYPTION_KEY
    const { encrypt } = await import('@/lib/utils/crypto')
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY')
  })

  it('throws if ENCRYPTION_KEY has wrong length', async () => {
    process.env.ENCRYPTION_KEY = 'tooshort'
    const { encrypt } = await import('@/lib/utils/crypto')
    expect(() => encrypt('test')).toThrow('64 caracteres')
  })

  it('throws on tampered ciphertext', async () => {
    const { encrypt, decrypt } = await import('@/lib/utils/crypto')
    const encrypted = encrypt('secret')
    // Flip the last hex char
    const tampered = encrypted.slice(0, -1) + (encrypted.slice(-1) === '0' ? '1' : '0')
    expect(() => decrypt(tampered)).toThrow()
  })

  it('throws if decrypt receives non-prefixed data', async () => {
    const { decrypt } = await import('@/lib/utils/crypto')
    expect(() => decrypt('not encrypted')).toThrow('formato criptografado')
  })

  it('handles empty string', async () => {
    const { encrypt, decrypt } = await import('@/lib/utils/crypto')
    const encrypted = encrypt('')
    expect(decrypt(encrypted)).toBe('')
  })

  it('handles unicode and emojis', async () => {
    const { encrypt, decrypt } = await import('@/lib/utils/crypto')
    const text = 'Paciente relatou 😢 e ansiedade — "não consigo dormir"'
    expect(decrypt(encrypt(text))).toBe(text)
  })
})
