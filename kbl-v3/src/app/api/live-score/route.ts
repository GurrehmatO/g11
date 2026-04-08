import { NextResponse } from 'next/server'
import { calculateLiveScoresFromCricbuzz } from '@/app/admin/actions'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
  // Check authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: matches } = await supabase
    .from('matches')
    .select('id, cricbuzz_match_id, status')
    .not('cricbuzz_match_id', 'is', null)
    .eq('status', 'live')

  if (!matches || matches.length === 0) {
    return NextResponse.json({ message: "No live matches found with Cricbuzz IDs to score." })
  }

  const results = []
  for (const m of matches) {
    if (m.cricbuzz_match_id) {
       const url = `https://www.cricbuzz.com/live-cricket-scorecard/${m.cricbuzz_match_id}`
       const res = await calculateLiveScoresFromCricbuzz(m.id, url)
       results.push({ matchId: m.id, success: res.success, error: res.error })
    }
  }

  return NextResponse.json({ message: "Processed live matches successfully", results })
}
