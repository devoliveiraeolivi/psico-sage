/**
 * AES-256-GCM encryption for sensitive clinical data at rest.
 *
 * Format: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * - v1 prefix allows future algorithm changes
 * - IV is 12 bytes (96 bits), unique per encryption
 * - Auth tag is 16 bytes (128 bits), ensures integrity
 *
 * Requires ENCRYPTION_KEY env var (64 hex chars = 256 bits).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const PREFIX = 'enc:v1:'

let _key: Buffer | null = null

function getKey(): Buffer {
  if (_key) return _key

  const hex = process.env.ENCRYPTION_KEY
  if (!hex) {
    throw new Error(
      'ENCRYPTION_KEY não configurada. ' +
      'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }

  if (hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY deve ter 64 caracteres hex (256 bits)')
  }

  _key = Buffer.from(hex, 'hex')
  return _key
}

/** Encrypt a plaintext string. Returns prefixed ciphertext. */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return PREFIX + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex')
}

/** Decrypt a prefixed ciphertext string. Returns original plaintext. */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith(PREFIX)) {
    throw new Error('Dados não estão no formato criptografado esperado')
  }

  const key = getKey()
  const parts = ciphertext.slice(PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('Formato de ciphertext inválido')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = Buffer.from(parts[2], 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  return decipher.update(encrypted) + decipher.final('utf8')
}

/** Check if a value looks like encrypted data. */
export function isEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}
