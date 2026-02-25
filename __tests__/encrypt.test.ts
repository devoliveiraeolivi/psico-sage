import { describe, it, expect, beforeEach, vi } from 'vitest'
import { randomBytes } from 'crypto'

const TEST_KEY = randomBytes(32).toString('hex')

describe('supabase/encrypt helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.ENCRYPTION_KEY = TEST_KEY
  })

  describe('encryptTextField / decryptTextField', () => {
    it('round-trips a string', async () => {
      const { encryptTextField, decryptTextField } = await import('@/lib/supabase/encrypt')
      const encrypted = encryptTextField('hello world')
      expect(encrypted).toMatch(/^enc:v1:/)
      expect(decryptTextField(encrypted)).toBe('hello world')
    })

    it('returns null for null/undefined input', async () => {
      const { encryptTextField, decryptTextField } = await import('@/lib/supabase/encrypt')
      expect(encryptTextField(null)).toBeNull()
      expect(encryptTextField(undefined)).toBeNull()
      expect(decryptTextField(null)).toBeNull()
      expect(decryptTextField(undefined)).toBeNull()
    })

    it('passes through legacy unencrypted text', async () => {
      const { decryptTextField } = await import('@/lib/supabase/encrypt')
      expect(decryptTextField('plain text legacy')).toBe('plain text legacy')
    })

    it('returns null for non-string input', async () => {
      const { decryptTextField } = await import('@/lib/supabase/encrypt')
      expect(decryptTextField(42)).toBeNull()
      expect(decryptTextField({})).toBeNull()
    })
  })

  describe('encryptJsonField / decryptJsonField', () => {
    it('round-trips a JSON object', async () => {
      const { encryptJsonField, decryptJsonField } = await import('@/lib/supabase/encrypt')
      const obj = { sintese: 'Paciente estável', humor: 'neutro', diagnosticos: 'F41.1' }
      const encrypted = encryptJsonField(obj)
      expect(typeof encrypted).toBe('string')
      expect(encrypted).toMatch(/^enc:v1:/)
      expect(decryptJsonField(encrypted)).toEqual(obj)
    })

    it('returns null for null/undefined', async () => {
      const { encryptJsonField, decryptJsonField } = await import('@/lib/supabase/encrypt')
      expect(encryptJsonField(null)).toBeNull()
      expect(encryptJsonField(undefined)).toBeNull()
      expect(decryptJsonField(null)).toBeNull()
      expect(decryptJsonField(undefined)).toBeNull()
    })

    it('handles legacy unencrypted JSON objects', async () => {
      const { decryptJsonField } = await import('@/lib/supabase/encrypt')
      const obj = { humor: 'ansioso' }
      // Direct object (legacy jsonb from DB)
      expect(decryptJsonField(obj)).toEqual(obj)
    })

    it('handles legacy JSON string (non-encrypted)', async () => {
      const { decryptJsonField } = await import('@/lib/supabase/encrypt')
      const str = '{"humor":"feliz"}'
      expect(decryptJsonField(str)).toEqual({ humor: 'feliz' })
    })

    it('returns null for invalid JSON string', async () => {
      const { decryptJsonField } = await import('@/lib/supabase/encrypt')
      expect(decryptJsonField('not json')).toBeNull()
    })
  })

  describe('decryptSessao', () => {
    it('decrypts integra and resumo fields in-place', async () => {
      const { encryptTextField, encryptJsonField, decryptSessao } = await import('@/lib/supabase/encrypt')
      const resumo = { resumo: { sintese: 'ok', pontos_principais: [] } }
      const sessao = {
        id: '123',
        integra: encryptTextField('Transcrição completa'),
        resumo: encryptJsonField(resumo),
        status: 'realizada',
      }
      decryptSessao(sessao)
      expect(sessao.integra).toBe('Transcrição completa')
      expect(sessao.resumo).toEqual(resumo)
      expect(sessao.status).toBe('realizada') // untouched
    })

    it('handles null sessao', async () => {
      const { decryptSessao } = await import('@/lib/supabase/encrypt')
      expect(decryptSessao(null as any)).toBeNull()
    })
  })

  describe('decryptPaciente', () => {
    it('decrypts resumo, historico, and notas fields', async () => {
      const { encryptTextField, encryptJsonField, decryptPaciente } = await import('@/lib/supabase/encrypt')
      const paciente = {
        id: '456',
        nome: 'Maria',
        resumo: encryptJsonField({ humor: 'estável' }),
        historico: encryptJsonField({ humor: [{ data: '2024-01-01', sessao_id: 'x', valor: 'ok' }] }),
        notas: encryptTextField('Nota do terapeuta'),
      }
      decryptPaciente(paciente)
      expect(paciente.nome).toBe('Maria')
      expect(paciente.resumo).toEqual({ humor: 'estável' })
      expect(paciente.historico).toEqual({ humor: [{ data: '2024-01-01', sessao_id: 'x', valor: 'ok' }] })
      expect(paciente.notas).toBe('Nota do terapeuta')
    })
  })
})
