/**
 * Backfill script: semeia pacientes.ficha a partir de resumo/historico legados.
 *
 * Evita regressão: sem isso, a 1ª consolidação projetaria ficha vazia de volta.
 *
 * Usage:
 *   npx tsx scripts/backfill-ficha.ts
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL must be set in .env
 *   - SUPABASE_SERVICE_ROLE_KEY must be set in .env
 *   - ENCRYPTION_KEY must be set in .env (used by decryptJsonField/encryptJsonField)
 *
 * Safe to run multiple times — skips patients already seeded (ficha.atual exists).
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { seedFichaFromLegacy } from '@/lib/ficha/merge'
import { decryptJsonField, encryptJsonField } from '@/lib/supabase/encrypt'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Validate ENCRYPTION_KEY is available (will throw via encrypt.ts getKey)
if (!process.env.ENCRYPTION_KEY) {
  console.error('Missing ENCRYPTION_KEY env var')
  process.exit(1)
}

const db = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('Fetching patients for backfill...')

  const { data: pacientes, error } = await db
    .from('pacientes')
    .select('id, resumo, historico, ficha')

  if (error) {
    console.error('Error fetching patients:', error.message)
    process.exit(1)
  }

  if (!pacientes || pacientes.length === 0) {
    console.log('No patients found. Nothing to do.')
    return
  }

  console.log(`Found ${pacientes.length} patient(s).`)

  let seeded = 0
  let skipped = 0
  let errors = 0

  for (const p of pacientes) {
    const fichaAtual = decryptJsonField<any>(p.ficha)
    if (fichaAtual?.atual) {
      skipped++
      continue // já tem ficha v2 — não sobrescreve
    }

    try {
      const resumo = decryptJsonField<any>(p.resumo)
      const historico = decryptJsonField<any>(p.historico)
      const ficha = seedFichaFromLegacy(resumo ?? null, historico ?? null)

      const { error: upErr } = await db
        .from('pacientes')
        .update({ ficha: encryptJsonField(ficha) })
        .eq('id', p.id)

      if (upErr) {
        console.error(`Error updating patient ${p.id}:`, upErr.message)
        errors++
        continue
      }

      seeded++
    } catch (err: any) {
      console.error(`Error processing patient ${p.id}:`, err.message)
      errors++
    }
  }

  console.log(`\nDone:`)
  console.log(`  Seeded: ${seeded}`)
  console.log(`  Skipped (already have ficha.atual): ${skipped}`)
  console.log(`  Errors: ${errors}`)

  if (errors > 0) {
    process.exit(1)
  }
}

main()
