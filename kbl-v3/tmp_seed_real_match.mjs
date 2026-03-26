// Seed a real IPL 2025 past match for testing real scoring
// CSK vs KKR - 25th Match IPL 2025
// CricAPI match ID: b39bbd39-c67f-4892-9a48-02e958946718
// Run with: node tmp_seed_real_match.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env.local', 'utf8')
envContent.split('\n').forEach(line => {
  const eqIdx = line.indexOf('=')
  if (eqIdx > 0) {
    const key = line.substring(0, eqIdx).trim()
    const val = line.substring(eqIdx + 1).trim()
    if (key && !key.startsWith('#')) process.env[key] = val
  }
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

// Seed the match as 'upcoming' so you can draft a team against it
const { data, error } = await supabase
  .from('matches')
  .upsert({
    api_match_id: 'REAL-TEST-CSK-KKR-2025-25',
    name: 'CSK vs KKR, 25th Match IPL 2025 [REAL TEST]',
    match_date: '2025-03-29T14:00:00.000Z', // Already in past, safe for testing
    status: 'upcoming', // Draft your team first, then trigger real scoring
    team_a: 'Chennai Super Kings',
    team_b: 'Kolkata Knight Riders'
  }, { onConflict: 'api_match_id' })
  .select()

if (error) {
  console.error('Error:', error.message)
} else {
  console.log('✓ Test match seeded!')
  console.log('  DB Match UUID:', data[0].id)
  console.log('  CricAPI Match ID: b39bbd39-c67f-4892-9a48-02e958946718')
  console.log('')
  console.log('NEXT STEPS:')
  console.log('  1. Go to dashboard - you will see "CSK vs KKR, 25th Match IPL 2025 [REAL TEST]"')
  console.log('  2. Draft your team (pick from CSK + KKR players)')
  console.log('  3. Copy the DB Match UUID above')
  console.log('  4. Go to Admin > Section 5 "Real Data Engine"')
  console.log('     - Paste DB Match UUID in field 1')
  console.log('     - Paste "b39bbd39-c67f-4892-9a48-02e958946718" in field 2')
  console.log('  5. Click "Score from Real Data"')
  console.log('  6. Go to Recent Results and view your actual raw score!')
}
