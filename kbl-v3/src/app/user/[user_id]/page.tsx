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

  const { data: matchHistory } = await supabase
    .from('user_match_ranks')
    .select(`
      match_id,
      raw_score,
      relative_rank,
      relative_points,
      global_rank,
      matches!inner (
        id,
        name,
        match_date,
        team_a,
        team_b,
        status
      )
    `)
    .eq('user_id', user_id)
    .order('match_date', { referencedTable: 'matches', ascending: true })

  const sortedHistory = (matchHistory || [])
    .map((entry: any) => ({
      ...entry,
      matches: entry.matches,
    }))
    .filter((entry: any) => entry.matches && entry.matches.status === 'completed')

  const matchCount = sortedHistory.length

  const chartData = sortedHistory.map((entry: any, index: number) => ({
    matchLabel: `${entry.matches.team_a} vs ${entry.matches.team_b}`,
    matchNumber: index + 1,
    matchDate: entry.matches.match_date,
    matchRank: entry.relative_rank,
    globalRank: entry.global_rank,
    rawScore: Number(entry.raw_score),
    points: Number(entry.relative_points),
  }))

  const tableData = sortedHistory.map((entry: any) => ({
    matchId: entry.matches.id,
    matchLabel: `${entry.matches.team_a} vs ${entry.matches.team_b}`,
    date: entry.matches.match_date,
    rawScore: Number(entry.raw_score),
    matchRank: entry.relative_rank,
    points: Number(entry.relative_points),
    globalRank: entry.global_rank,
  }))

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <Link href="/dashboard" className="profile-back-link">
        ← Back to Dashboard
      </Link>

      <div className="profile-header stagger-1">
        <h1 className="profile-name heading-gradient">{profile.display_name || profile.email.split('@')[0]}</h1>
        <div className="profile-stats">
          <span className="profile-stat"><strong>{profile.total_points}</strong> total points</span>
          <span className="profile-stat"><strong>{matchCount}</strong> matches played</span>
        </div>
      </div>

      {chartData.length > 0 ? (
        <>
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
              {tableData.map((row: any) => (
                <Link
                  key={row.matchId}
                  href={`/match/${row.matchId}`}
                  className="match-history-row"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  <span className="mh-match">{row.matchLabel}</span>
                  <span className="mh-date">
                    {new Date(row.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}
                  </span>
                  <span className="mh-raw">{row.rawScore}</span>
                  <span className="mh-rank">#{row.matchRank}</span>
                  <span className="mh-pts">{row.points}</span>
                  <span className="mh-global">{row.globalRank != null ? `#${row.globalRank}` : '—'}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="glass-panel stagger-2" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>No completed matches yet for this user.</p>
        </div>
      )}
    </div>
  )
}
