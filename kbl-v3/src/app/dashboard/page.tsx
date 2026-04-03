import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { NavButton } from '@/components/NavButton'
import { TeamLogo } from '@/components/TeamLogo'
import { PaginatedResults } from '@/components/PaginatedResults'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: liveMatches } = await supabase
    .from('matches')
    .select('id, name, match_date, team_a, team_b, user_teams(count)')
    .eq('status', 'live')
    .order('match_date', { ascending: true })

  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select('id, name, match_date, team_a, team_b, user_teams(count)')
    .eq('status', 'upcoming')
    .order('match_date', { ascending: true })
    .limit(5)

  const { data: completedMatches } = await supabase
    .from('matches')
    .select('id, name, match_date, team_a, team_b')
    .eq('status', 'completed')
    .order('match_date', { ascending: false })

  const { data: myTeams } = await supabase
    .from('user_teams')
    .select('match_id')
    .eq('user_id', user.id)

  const myTeamMatchIds = new Set(myTeams?.map(t => t.match_id) || [])

  const { data: leaderboard } = await supabase
    .from('profiles')
    .select('id, display_name, email, total_points')
    .order('total_points', { ascending: false })
    .limit(15)

  const getRankClass = (index: number) => {
    if (index === 0) return 'gold'
    if (index === 1) return 'silver'
    if (index === 2) return 'bronze'
    return 'default'
  }

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <header className="global-header stagger-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="heading-gradient" style={{ fontSize: '2.25rem', marginBottom: '0.35rem', lineHeight: 1.15, fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 800 }}>Dashboard</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Welcome back, <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{user.email}</span></p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="stagger-2">
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            {liveMatches && liveMatches.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h2 className="section-header live">Live Matches</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {liveMatches.map((match: any) => {
                    const teamsJoined = match.user_teams?.[0]?.count || 0;
                    return (
                      <div key={match.id} className="match-card live">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span className="live-badge">
                            <span className="live-dot" />
                            In Progress
                          </span>
                          <span className="teams-badge">Teams Joined: {teamsJoined}</span>
                        </div>
                        <div className="match-teams">
                          <TeamLogo teamName={match.team_a} size={36} />
                          <span className="match-vs">vs</span>
                          <TeamLogo teamName={match.team_b} size={36} />
                        </div>
                        <div className="match-labels">
                          <span>{match.team_a}</span>
                          <span>{match.team_b}</span>
                        </div>
                        <NavButton href={`/match/${match.id}`} className="btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.65rem', display: 'block', textAlign: 'center' }} pendingText="Loading...">
                          View Live Standings
                        </NavButton>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <h2 className="section-header">Upcoming Matches</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {upcomingMatches && upcomingMatches.length > 0 ? (
                upcomingMatches.map((match: any) => {
                  const hasTeam = myTeamMatchIds.has(match.id);
                  const teamsJoined = match.user_teams?.[0]?.count || 0;
                  return (
                    <div key={match.id} className="match-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <p className="match-date">
                          {new Date(match.match_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} IST
                        </p>
                        <span className="teams-badge">Teams Joined: {teamsJoined}</span>
                      </div>
                      <div className="match-teams">
                        <TeamLogo teamName={match.team_a} size={36} />
                        <span className="match-vs">vs</span>
                        <TeamLogo teamName={match.team_b} size={36} />
                      </div>
                      <div className="match-labels">
                        <span>{match.team_a}</span>
                        <span>{match.team_b}</span>
                      </div>
                      <NavButton href={`/team/${match.id}`} className={hasTeam ? "btn-secondary" : "btn-primary"} style={{ width: '100%', fontSize: '0.8rem', padding: '0.65rem', display: 'block', textAlign: 'center' }} pendingText="Loading Pitch...">
                        {hasTeam ? 'Edit Team' : 'Draft Team'}
                      </NavButton>
                    </div>
                  )
                })
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No upcoming matches found.</p>
              )}
            </div>
          </div>
        </div>

        <div className="stagger-3">
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h2 className="section-header">Global Leaderboard</h2>
            <div className="scoreboard" style={{ marginBottom: '2.5rem' }}>
              {leaderboard && leaderboard.map((player, index) => (
                <div key={player.id} className={`scoreboard-row ${player.id === user.id ? 'you' : ''}`}>
                  <span className={`scoreboard-rank ${getRankClass(index)}`}>#{index + 1}</span>
                  <div className="scoreboard-avatar">
                    {(player.display_name || player.email)[0].toUpperCase()}
                  </div>
                  <div className="scoreboard-name">
                    {player.display_name || player.email.split('@')[0]}
                    {player.id === user.id && <span className="scoreboard-you-badge">You</span>}
                  </div>
                  <div className="scoreboard-points">
                    {player.total_points}<span className="scoreboard-points-label">PTS</span>
                  </div>
                </div>
              ))}
              {(!leaderboard || leaderboard.length === 0) && (
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No points on the board yet!</p>
              )}
            </div>

            <h2 className="section-header">Recent Results</h2>
            <PaginatedResults matches={completedMatches || []} />
          </div>
        </div>
      </div>
    </div>
  )
}
