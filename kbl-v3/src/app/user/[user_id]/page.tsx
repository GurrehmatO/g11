import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { RankChart } from './RankChart'

export default async function UserProfilePage({ params }: { params: Promise<{ user_id: string }> }) {
  const { user_id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, email, total_points')
    .eq('id', user_id)
    .single()

  if (!profile) {
    notFound()
  }

  const { data: completedMatches } = await supabase
    .from('matches')
    .select('id, name, match_date, team_a, team_b')
    .eq('status', 'completed')
    .order('match_date', { ascending: true })

  if (!completedMatches || completedMatches.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <Link href="/dashboard" className="profile-back-link">← Back to Dashboard</Link>
        <div className="profile-header stagger-1">
          <h1 className="profile-name heading-gradient">{profile.display_name || profile.email.split('@')[0]}</h1>
          <div className="profile-stats">
            <span className="profile-stat"><strong>{profile.total_points}</strong> total points</span>
          </div>
        </div>
        <div className="glass-panel stagger-2" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>No completed matches yet.</p>
        </div>
      </div>
    )
  }

  const matchIds = completedMatches.map(m => m.id)

  const { data: userMatchRanks } = await supabase
    .from('user_match_ranks')
    .select('match_id, raw_score, relative_rank, relative_points')
    .eq('user_id', user_id)
    .in('match_id', matchIds)

  const { data: globalRanks } = await supabase
    .from('user_global_rank_history')
    .select('match_id, global_rank')
    .eq('user_id', user_id)
    .in('match_id', matchIds)

  const rankMap = new Map()
  userMatchRanks?.forEach(r => rankMap.set(r.match_id, r))

  const globalRankMap = new Map()
  globalRanks?.forEach(r => globalRankMap.set(r.match_id, r.global_rank))

  const playedCount = userMatchRanks?.length || 0

  const chartData = completedMatches.map((match, index) => {
    const userRank = rankMap.get(match.id)
    return {
      matchLabel: `${match.team_a} vs ${match.team_b}`,
      matchNumber: index + 1,
      matchDate: match.match_date,
      matchRank: userRank ? userRank.relative_rank : null,
      globalRank: globalRankMap.get(match.id) || null,
      rawScore: userRank ? Number(userRank.raw_score) : null,
      points: userRank ? Number(userRank.relative_points) : null,
      matchId: match.id,
    }
  })

  const tableData = chartData

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <Link href="/dashboard" className="profile-back-link">
        ← Back to Dashboard
      </Link>

      <div className="profile-header stagger-1">
        <h1 className="profile-name heading-gradient">{profile.display_name || profile.email.split('@')[0]}</h1>
        <div className="profile-stats">
          <span className="profile-stat"><strong>{profile.total_points}</strong> total points</span>
          <span className="profile-stat"><strong>{playedCount}</strong> matches played</span>
        </div>
      </div>

      <div className="glass-panel stagger-2" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h2 className="section-header">Rank History</h2>
        <div className="chart-container">
          <RankChart data={chartData} />
        </div>
      </div>

      <div className="glass-panel stagger-3" style={{ padding: '1.75rem' }}>
        <h2 className="section-header">Match History</h2>
        <div className="match-history-table">
          <div className="match-history-header">
            <span>Match</span>
            <span>Date</span>
            <span>Raw</span>
            <span>Rank</span>
            <span>Pts</span>
            <span>Global</span>
          </div>
          {tableData.map((row) => (
            <Link
              key={row.matchId}
              href={`/match/${row.matchId}`}
              className="match-history-row"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <span className="mh-match">{row.matchLabel}</span>
              <span className="mh-date">
                {new Date(row.matchDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}
              </span>
              <span className="mh-raw">{row.rawScore != null ? row.rawScore : '—'}</span>
              <span className="mh-rank">{row.matchRank != null ? `#${row.matchRank}` : '—'}</span>
              <span className="mh-pts">{row.points != null ? row.points : '—'}</span>
              <span className="mh-global">{row.globalRank != null ? `#${row.globalRank}` : '—'}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
