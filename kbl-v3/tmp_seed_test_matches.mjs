// Script to seed 3 dummy matches in all 3 states for testing
// Run with: node tmp_seed_test_matches.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load env from .env.local manually
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

const now = new Date()
const past2h = new Date(now - 2 * 60 * 60 * 1000).toISOString()
const past30m = new Date(now - 30 * 60 * 1000).toISOString()
const future2h = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

const testMatches = [
  {
    api_match_id: 'TEST-COMPLETED-001',
    name: 'TEST: Completed Game',
    match_date: past2h,
    status: 'completed',
    team_a: 'Chennai Super Kings',
    team_b: 'Mumbai Indians'
  },
  {
    api_match_id: 'TEST-LIVE-001',
    name: 'TEST: Live Game',
    match_date: past30m,
    status: 'live',
    team_a: 'Kolkata Knight Riders',
    team_b: 'Royal Challengers Bengaluru'
  },
  {
    api_match_id: 'TEST-UPCOMING-001',
    name: 'TEST: Upcoming Game',
    match_date: future2h,
    status: 'upcoming',
    team_a: 'Rajasthan Royals',
    team_b: 'Delhi Capitals'
  }
]

for (const match of testMatches) {
  const { data, error } = await supabase
    .from('matches')
    .upsert(match, { onConflict: 'api_match_id' })
    .select()
  if (error) console.error(`Error inserting ${match.name}:`, error.message)
  else console.log(`✓ ${match.name} (${match.status}) - ID: ${data[0].id}`)
}

console.log('\nDone! Refresh the dashboard to see all 3 states.')
