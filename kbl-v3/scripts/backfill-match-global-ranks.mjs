import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const envContent = readFileSync('.env.local', 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const eq = trimmed.indexOf('=')
    if (eq > 0) {
      process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
    }
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const matchId = process.argv[2]

if (!matchId) {
  console.log('Usage: node scripts/backfill-match-global-ranks.mjs <match_id>')
  console.log('\nTo find the match ID, run:')
  console.log('  node scripts/list-matches.mjs')
  process.exit(1)
}

console.log(`Backfilling global ranks for match: ${matchId}`)

const { data: allProfiles } = await supabase
  .from('profiles')
  .select('id, total_points')
  .order('total_points', { ascending: false })

if (!allProfiles || allProfiles.length === 0) {
  console.log('No profiles found.')
  process.exit(1)
}

console.log(`Found ${allProfiles.length} users.`)

for (let i = 0; i < allProfiles.length; i++) {
  const { error } = await supabase
    .from('user_global_rank_history')
    .upsert({
      user_id: allProfiles[i].id,
      match_id: matchId,
      global_rank: i + 1,
    }, { onConflict: 'user_id,match_id' })

  if (error) {
    console.error(`Error for user ${allProfiles[i].id}:`, error)
  }
}

console.log(`\nGlobal ranks backfilled for match ${matchId}.`)
console.log('Top 5:')
allProfiles.slice(0, 5).forEach((p, i) => {
  console.log(`  #${i + 1} ${p.id.slice(0, 8)} — ${p.total_points} pts`)
})
