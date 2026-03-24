import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PitchModal from './PitchModal'

export default async function MatchResultPage(props: { params: Promise<{ match_id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: match } = await supabase.from('matches').select('*').eq('id', params.match_id).single()
  if (!match) return <div>Match not found</div>

  const { data: ranks } = await supabase
    .from('user_match_ranks')
    .select('relative_rank, raw_score, relative_points, profiles(display_name, email, id)')
    .eq('match_id', params.match_id)
    .order('relative_rank', { ascending: true })

  // Fetch full team players and scores for the modal
  const { data: userTeams } = await supabase
    .from('user_teams')
    .select('user_id, captain_id, vice_captain_id, user_team_players(players(id, name, role, team))')
    .eq('match_id', params.match_id)
    
  const { data: scores } = await supabase
    .from('player_scores')
    .select('player_id, points')
    .eq('match_id', params.match_id)
    
  // Map scores
  const scoreMap: Record<string, number> = {}
  if (scores) scores.forEach(s => scoreMap[s.player_id] = s.points)

  // Map teams
  const teamMap: Record<string, any> = {}
  if (userTeams) {
    userTeams.forEach((ut: any) => {
      // Flatten the player relation
      const players = ut.user_team_players.map((utp: any) => utp.players).filter(Boolean)
      teamMap[ut.user_id] = {
        captain_id: ut.captain_id,
        vice_captain_id: ut.vice_captain_id,
        players
      }
    })
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <Link href="/dashboard" style={{ color: 'var(--accent)', textDecoration: 'none', marginBottom: '2rem', display: 'inline-block' }}>
        ← Back to Dashboard
      </Link>

      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Match Completed</p>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{match.team_a} vs {match.team_b}</h1>
        <p style={{ color: 'var(--border)' }}>{new Date(match.match_date).toLocaleString()}</p>
      </div>

      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Match Leaderboard</h2>
      
      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="match-lb-header" style={{ display: 'flex', padding: '1rem', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
          <div style={{ width: '60px', textAlign: 'center' }}>Rank</div>
          <div style={{ flex: 1 }}>Player</div>
          <div style={{ width: '100px', textAlign: 'right' }}>Raw Score</div>
          <div style={{ width: '120px', textAlign: 'right' }}>Match Points</div>
        </div>
        
        {ranks && ranks.length > 0 ? ranks.map((r: any, idx: number) => {
          const isYou = r.profiles.id === user.id;
          return (
            <div key={idx} className="match-lb-row" style={{ display: 'flex', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', background: isYou ? 'rgba(34, 197, 94, 0.1)' : 'transparent' }}>
              <div className="match-lb-rank" style={{ width: '60px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: r.relative_rank === 1 ? '#F59E0B' : r.relative_rank === 2 ? '#94A3B8' : r.relative_rank === 3 ? '#B45309' : '#fff' }}>
                #{r.relative_rank}
              </div>
              <div className="match-lb-player" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {(r.profiles.display_name || r.profiles.email)[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{r.profiles.display_name || r.profiles.email.split('@')[0]}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                    {isYou && <span style={{ fontSize: '0.65rem', color: '#22c55e', textTransform: 'uppercase', fontWeight: 'bold', border: '1px solid #22c55e', padding: '1px 4px', borderRadius: '4px' }}>You</span>}
                    {teamMap[r.profiles.id] && (
                      <PitchModal 
                        team={teamMap[r.profiles.id]} 
                        matchScores={scoreMap} 
                        userName={r.profiles.display_name || r.profiles.email.split('@')[0]} 
                        teamA={match.team_a}
                      />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Stats wrapper for mobile */}
              <div className="match-lb-stats" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                <div className="match-lb-raw" style={{ width: '100px', textAlign: 'right', fontWeight: 600, color: '#94A3B8', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span className="mobile-only-label" style={{ fontSize: '0.65rem', textTransform: 'uppercase', display: 'none' }}>Raw Score</span>
                  {r.raw_score.toFixed(1)}
                </div>
                <div className="match-lb-pts" style={{ width: '120px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: '#22c55e', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span className="mobile-only-label" style={{ fontSize: '0.65rem', textTransform: 'uppercase', display: 'none', color: '#94A3B8' }}>Match Points</span>
                  +{r.relative_points}
                </div>
              </div>
            </div>
          )
        }) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No teams were submitted for this match.</div>
        )}
      </div>
    </div>
  )
}
