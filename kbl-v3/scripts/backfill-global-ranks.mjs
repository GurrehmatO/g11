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

  console.log('Fetching all users...')
  const { data: allUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id')

  if (usersError) {
    console.error('Error fetching users:', usersError)
    process.exit(1)
  }

  const allUserIds = new Set(allUsers.map(u => u.id))
  console.log(`Found ${allUserIds.size} users.`)

  const cumulativePoints = {}
  allUserIds.forEach(id => { cumulativePoints[id] = 0 })

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

    for (const rank of ranks || []) {
      cumulativePoints[rank.user_id] += Number(rank.relative_points)
    }

    const sorted = Object.entries(cumulativePoints)
      .filter(([, pts]) => pts > 0)
      .sort(([, a], [, b]) => b - a)

    const rankMap = {}
    sorted.forEach(([userId], index) => {
      rankMap[userId] = index + 1
    })

    for (const userId of allUserIds) {
      const globalRank = rankMap[userId] || allUserIds.size
      const { error: upsertError } = await supabase
        .from('user_global_rank_history')
        .upsert({ user_id: userId, match_id: match.id, global_rank: globalRank })

      if (upsertError) {
        console.error(`  Error upserting ${userId}:`, upsertError)
      }
    }

    console.log(`  Updated ${allUserIds.size} users. Top 3:`, sorted.slice(0, 3).map(([id, pts], i) => `#${i + 1} ${id.slice(0, 8)} (${pts.toFixed(1)})`).join(', '))
  }

  console.log('\nBackfill complete.')
}

backfillGlobalRanks()
