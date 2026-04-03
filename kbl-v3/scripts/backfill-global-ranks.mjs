import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function backfillGlobalRanks() {
  console.log('Fetching completed matches...')
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, match_date')
    .eq('status', 'completed')
    .order('match_date', { ascending: true })

  if (matchesError) {
    console.error('Error fetching matches:', matchesError)
    process.exit(1)
  }

  if (!matches || matches.length === 0) {
    console.log('No completed matches found.')
    process.exit(0)
  }

  console.log(`Found ${matches.length} completed matches.`)

  const cumulativePoints = {}

  for (const match of matches) {
    console.log(`\nProcessing match: ${match.id} (${match.match_date})`)

    const { data: ranks, error: ranksError } = await supabase
      .from('user_match_ranks')
      .select('user_id, match_id, relative_points')
      .eq('match_id', match.id)

    if (ranksError) {
      console.error(`Error fetching ranks for match ${match.id}:`, ranksError)
      continue
    }

    if (!ranks || ranks.length === 0) {
      console.log('  No ranks for this match, skipping.')
      continue
    }

    for (const rank of ranks) {
      if (!cumulativePoints[rank.user_id]) {
        cumulativePoints[rank.user_id] = 0
      }
      cumulativePoints[rank.user_id] += Number(rank.relative_points)
    }

    const sorted = Object.entries(cumulativePoints)
      .sort(([, a], [, b]) => b - a)

    const rankMap = {}
    sorted.forEach(([userId], index) => {
      rankMap[userId] = index + 1
    })

    for (const rank of ranks) {
      const globalRank = rankMap[rank.user_id]
      const { error: updateError } = await supabase
        .from('user_match_ranks')
        .update({ global_rank: globalRank })
        .eq('user_id', rank.user_id)
        .eq('match_id', rank.match_id)

      if (updateError) {
        console.error(`  Error updating ${rank.user_id}:`, updateError)
      }
    }

    console.log(`  Updated ${ranks.length} users. Top 3:`, sorted.slice(0, 3).map(([id, pts], i) => `#${i + 1} ${id.slice(0, 8)} (${pts.toFixed(1)})`).join(', '))
  }

  console.log('\nBackfill complete.')
}

backfillGlobalRanks()
