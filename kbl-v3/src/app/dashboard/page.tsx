import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NavButton } from '@/components/NavButton'
import { TeamLogo } from '@/components/TeamLogo'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select('id, name, match_date, team_a, team_b')
    .eq('status', 'upcoming')
    .order('match_date', { ascending: true })
    .limit(5)
    
  const { data: completedMatches } = await supabase
    .from('matches')
    .select('id, name, match_date, team_a, team_b')
    .eq('status', 'completed')
    .order('match_date', { ascending: false })
    .limit(5)
    
  const { data: myTeams } = await supabase
    .from('user_teams')
    .select('match_id')
    .eq('user_id', user.id)

  const myTeamMatchIds = new Set(myTeams?.map(t => t.match_id) || [])
    
  const { data: leaderboard } = await supabase
    .from('profiles')
    .select('id, display_name, email, total_points')
    .order('total_points', { ascending: false })
    .limit(10)

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <header className="global-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 className="heading-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>Dashboard</h1>
          <p style={{ color: 'var(--border)', fontSize: '1.1rem' }}>Welcome back, <span style={{ color: 'var(--foreground)' }}>{user.email}</span></p>
        </div>
      </header>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--primary)' }}>•</span> Upcoming Matches
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {upcomingMatches && upcomingMatches.length > 0 ? (
              upcomingMatches.map((match) => {
                const hasTeam = myTeamMatchIds.has(match.id);
                return (
                  <div key={match.id} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {new Date(match.match_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} IST
                    </p>
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <TeamLogo teamName={match.team_a} size={36} />
                      <h4 style={{ fontSize: '1.1rem', margin: 0, flex: 1, textAlign: 'center', color: '#fff' }}>vs</h4>
                      <TeamLogo teamName={match.team_b} size={36} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1.25rem', fontWeight: 600 }}>
                      <span style={{ textAlign: 'left', flex: 1 }}>{match.team_a}</span>
                      <span style={{ textAlign: 'right', flex: 1 }}>{match.team_b}</span>
                    </div>
                    <NavButton href={`/team/${match.id}`} className={hasTeam ? "btn-secondary" : "btn-primary"} style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem', display: 'block', textAlign: 'center', background: hasTeam ? '#1E293B' : undefined, color: hasTeam ? '#fff' : undefined, border: hasTeam ? '1px solid #334155' : undefined }} pendingText="Loading Pitch...">
                      {hasTeam ? 'Edit Team' : 'Draft Team'}
                    </NavButton>
                  </div>
                )
              })
            ) : (
              <p style={{ color: 'var(--border)' }}>No upcoming matches found.</p>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#F97316' }}>🏆</span> Global Leaderboard
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2.5rem' }}>
            {leaderboard && leaderboard.map((player, index) => (
              <div key={player.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem', background: player.id === user.id ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: player.id === user.id ? '1px solid #F97316' : '1px solid transparent' }}>
                <div style={{ width: '30px', fontWeight: 'bold', color: index === 0 ? '#F59E0B' : index === 1 ? '#94A3B8' : index === 2 ? '#B45309' : '#64748B' }}>#{index + 1}</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {(player.display_name || player.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{player.display_name || player.email.split('@')[0]}</div>
                    {player.id === user.id && <div style={{ fontSize: '0.7rem', color: '#F97316', fontWeight: 'bold', textTransform: 'uppercase' }}>You</div>}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>{player.total_points} <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>PTS</span></div>
              </div>
            ))}
            {(!leaderboard || leaderboard.length === 0) && <p style={{ color: 'var(--border)' }}>No points on the board yet!</p>}
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Recent Results</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {completedMatches && completedMatches.length > 0 ? (
              completedMatches.map((match) => (
                <div key={match.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <TeamLogo teamName={match.team_a} size={24} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94A3B8' }}>vs</span>
                      <TeamLogo teamName={match.team_b} size={24} />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--border)' }}>{new Date(match.match_date).toLocaleDateString()}</p>
                  </div>
                  <Link href={`/match/${match.id}`} style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600 }}>
                    View Points →
                  </Link>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--border)' }}>No completed matches yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
