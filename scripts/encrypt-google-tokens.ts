/**
 * Backfill script: encrypts existing google_refresh_token values in the database.
 *
 * Usage:
 *   npx tsx scripts/encrypt-google-tokens.ts
 *
 * Prerequisites:
 *   - ENCRYPTION_KEY must be set in .env
 *   - NEXT_PUBLIC_SUPABASE_URL must be set in .env
 *   - SUPABASE_SERVICE_ROLE_KEY must be set in .env
 *
 * Safe to run multiple times — skips tokens already encrypted (enc:v1: prefix).
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { encrypt, isEncrypted } from '../lib/utils/crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Validate ENCRYPTION_KEY is available (will throw via crypto.ts getKey)
if (!process.env.ENCRYPTION_KEY) {
  console.error('Missing ENCRYPTION_KEY env var')
  process.exit(1)
}

const db = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('Fetching users with google_refresh_token...')

  const { data: usuarios, error } = await db
    .from('usuarios')
    .select('id, google_refresh_token')
    .not('google_refresh_token', 'is', null)

  if (error) {
    console.error('Error fetching users:', error.message)
    process.exit(1)
  }

  if (!usuarios || usuarios.length === 0) {
    console.log('No users with google_refresh_token found. Nothing to do.')
    return
  }

  console.log(`Found ${usuarios.length} user(s) with google_refresh_token.`)

  let encrypted = 0
  let skipped = 0
  let errors = 0

  for (const usuario of usuarios) {
    const token = usuario.google_refresh_token as string

    if (isEncrypted(token)) {
      skipped++
      continue
    }

    try {
      const encryptedToken = encrypt(token)

      const { error: updateError } = await db
        .from('usuarios')
        .update({ google_refresh_token: encryptedToken })
        .eq('id', usuario.id)

      if (updateError) {
        console.error(`Error updating user ${usuario.id}:`, updateError.message)
        errors++
        continue
      }

      encrypted++
    } catch (err: any) {
      console.error(`Error encrypting token for user ${usuario.id}:`, err.message)
      errors++
    }
  }

  console.log(`\nDone:`)
  console.log(`  Encrypted: ${encrypted}`)
  console.log(`  Skipped (already encrypted): ${skipped}`)
  console.log(`  Errors: ${errors}`)

  if (errors > 0) {
    process.exit(1)
  }
}

main()
