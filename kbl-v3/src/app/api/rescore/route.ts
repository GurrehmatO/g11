import { NextResponse } from 'next/server'
import { calculateScoresFromCricbuzz } from '@/app/admin/actions'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  const supabase = createAdminClient()
  const { data: allMatches } = await supabase.from('matches').select('*')
  console.log('Total matches:', allMatches?.length)
  console.log('Completed matches:', allMatches?.filter(m => m.status === 'completed').length)
  console.log('With cricbuzz ID:', allMatches?.filter(m => !!m.cricbuzz_match_id).length)
  console.log('Completed AND with cricbuzz ID:', allMatches?.filter(m => !!m.cricbuzz_match_id && m.status === 'completed').length)

  const { data: matches } = await supabase.from('matches').select('id, cricbuzz_match_id, status').not('cricbuzz_match_id', 'is', null).eq('status', 'completed').order('match_date', { ascending: true })
  if (!matches || matches.length === 0) {
     return NextResponse.json({ 
        error: "No completed matches found",
        debug: {
           total: allMatches?.length,
           completed: allMatches?.filter(m => m.status === 'completed').length,
           withCricbuzz: allMatches?.filter(m => !!m.cricbuzz_match_id).length,
           completedAndWithCricbuzz: allMatches?.filter(m => !!m.cricbuzz_match_id && m.status === 'completed').length
        }
     })
  }

  const results = []
  for (const m of matches) {
    if (m.cricbuzz_match_id) {
       const url = `https://www.cricbuzz.com/live-cricket-scorecard/${m.cricbuzz_match_id}`
       const res = await calculateScoresFromCricbuzz(m.id, url)
       results.push({ matchId: m.id, success: res.success, error: res.error })
    }
  }

  // Final exact recalculation of profiles.total_points based on exactly the new user_match_ranks table
  const { data: allRanks } = await supabase.from('user_match_ranks').select('user_id, relative_points')
  if (allRanks) {
     const userSums: Record<string, number> = {}
     for (const r of allRanks) {
        userSums[r.user_id] = (userSums[r.user_id] || 0) + (r.relative_points || 0)
     }
     
     // Set all profiles to 0 first, then update with correct sum (in case they have no ranks anymore)
     const { data: profiles } = await supabase.from('profiles').select('id')
     if (profiles) {
        for (const p of profiles) {
           const correctSum = userSums[p.id] || 0
           await supabase.from('profiles').update({ total_points: correctSum }).eq('id', p.id)
        }
     }
  }

  return NextResponse.json({ message: "Rescored all completed matches successfully", results })
}
