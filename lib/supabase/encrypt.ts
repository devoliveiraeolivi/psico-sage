/**
 * Field-level encryption helpers for Supabase data.
 *
 * Handles encrypt before write and decrypt after read for sensitive fields.
 * Backward-compatible: unencrypted legacy data (objects / plain strings) is returned as-is.
 *
 * Encrypted fields:
 *   sessoes.integra     (text)  — full therapy transcription
 *   sessoes.resumo      (jsonb) — clinical prontuário
 *   pacientes.resumo    (jsonb) — patient clinical state
 *   pacientes.historico (jsonb) — longitudinal patient history
 *   pacientes.notas     (text)  — free-form therapist notes
 */

import { encrypt, decrypt, isEncrypted } from '@/lib/utils/crypto'

// ---------------------------------------------------------------------------
// Encrypt (before writing to DB)
// ---------------------------------------------------------------------------

/** Encrypt a plain text field (integra, notas). Returns encrypted string or null. */
export function encryptTextField(value: string | null | undefined): string | null {
  if (!value) return null
  return encrypt(value)
}

/** Encrypt a JSON object field (resumo, historico). Returns encrypted string or null. */
export function encryptJsonField(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null
  return encrypt(JSON.stringify(obj))
}

// ---------------------------------------------------------------------------
// Decrypt (after reading from DB)
// ---------------------------------------------------------------------------

/** Decrypt a text field. Handles: encrypted string, plain string (legacy), null. */
export function decryptTextField(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  if (isEncrypted(value)) return decrypt(value)
  return value // Legacy unencrypted data
}

/**
 * Decrypt a JSON field. Handles:
 * - Encrypted string → decrypt → parse → T
 * - Plain object (legacy unencrypted jsonb) → return as T
 * - null/undefined → null
 */
export function decryptJsonField<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    if (isEncrypted(value)) {
      return JSON.parse(decrypt(value)) as T
    }
    // Shouldn't happen normally, but handle gracefully
    try { return JSON.parse(value) as T } catch { return null }
  }
  // Already a parsed object (legacy unencrypted jsonb)
  return value as T
}

// ---------------------------------------------------------------------------
// Convenience: decrypt a full sessao or paciente row in-place
// ---------------------------------------------------------------------------

/** Decrypt sensitive fields on a sessao row. Mutates the object. */
export function decryptSessao(sessao: Record<string, any>): Record<string, any> {
  if (!sessao) return sessao
  if ('integra' in sessao) sessao.integra = decryptTextField(sessao.integra)
  if ('resumo' in sessao) sessao.resumo = decryptJsonField(sessao.resumo)
  return sessao
}

/** Decrypt sensitive fields on a paciente row. Mutates the object. */
export function decryptPaciente(paciente: Record<string, any>): Record<string, any> {
  if (!paciente) return paciente
  if ('resumo' in paciente) paciente.resumo = decryptJsonField(paciente.resumo)
  if ('historico' in paciente) paciente.historico = decryptJsonField(paciente.historico)
  if ('notas' in paciente) paciente.notas = decryptTextField(paciente.notas)
  return paciente
}
