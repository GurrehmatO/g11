import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PitchModal from './PitchModal'

export default async function MatchResultPage(props: { params: Promise<{ match_id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: match }, { data: userTeams }, { data: scores }] = await Promise.all([
    supabase.from('matches').select('*').eq('id', params.match_id).single(),
    supabase
      .from('user_teams')
      .select('user_id, captain_id, vice_captain_id, user_team_players(players(id, name, role, team))')
      .eq('match_id', params.match_id),
    supabase
      .from('player_scores')
      .select('player_id, points')
      .eq('match_id', params.match_id),
  ])

  if (!match) return <div>Match not found</div>

  const isCompleted = match.status === 'completed'
  const isLive = match.status === 'live'

  const { data: ranks } = isCompleted
    ? await supabase
        .from('user_match_ranks')
        .select('relative_rank, raw_score, relative_points, profiles(display_name, email, id)')
        .eq('match_id', params.match_id)
        .order('relative_rank', { ascending: true })
    : { data: null }

  const { data: liveEntries } = (isLive || isCompleted)
    ? await supabase
        .from('user_teams')
        .select('user_id, captain_id, vice_captain_id, profiles(display_name, email, id), user_team_players(players(id, name, role, team))')
        .eq('match_id', params.match_id)
    : { data: null }

  const hasRanks = ranks && ranks.length > 0

  const scoreMap: Record<string, number> = {}
  if (scores) scores.forEach(s => scoreMap[s.player_id] = s.points)

  const teamMap: Record<string, any> = {}
  if (userTeams) {
    userTeams.forEach((ut: any) => {
      const players = ut.user_team_players.map((utp: any) => utp.players).filter(Boolean)
      teamMap[ut.user_id] = {
        captain_id: ut.captain_id,
        vice_captain_id: ut.vice_captain_id,
        players
      }
    })
  }

  const matchDateIST = new Date(match.match_date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  const statusLabel = isLive ? 'Live' : isCompleted ? 'Match Completed' : 'Upcoming'
  const statusColor = isLive ? '#EF4444' : isCompleted ? '#22c55e' : 'var(--primary)'

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <Link href="/dashboard" style={{ color: 'var(--accent)', textDecoration: 'none', marginBottom: '2rem', display: 'inline-block' }}>
        ← Back to Dashboard
      </Link>

      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ color: statusColor, fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
          {isLive && <span style={{ animation: 'pulse 2s infinite' }}>● </span>}
          {statusLabel}
        </p>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{match.team_a} vs {match.team_b}</h1>
        <p style={{ color: 'var(--border)' }}>{matchDateIST} IST</p>
      </div>

      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        {isLive ? 'Live Standings' : 'Match Leaderboard'}
      </h2>
      
      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {isCompleted && hasRanks && (
          <>
            <div className="match-lb-header" style={{ display: 'flex', padding: '1rem', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
              <div style={{ width: '60px', textAlign: 'center' }}>Rank</div>
              <div style={{ flex: 1 }}>Player</div>
              <div style={{ width: '100px', textAlign: 'right' }}>Raw Score</div>
              <div style={{ width: '120px', textAlign: 'right' }}>Match Points</div>
            </div>
            
            {ranks!.map((r: any, idx: number) => {
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
            })}
          </>
        )}

        {(isLive || (isCompleted && !hasRanks)) && (
          <>
            <div style={{ display: 'flex', padding: '1rem', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
              <div style={{ width: '40px', textAlign: 'center' }}>#</div>
              <div style={{ flex: 1 }}>Player</div>
              <div style={{ width: '100px', textAlign: 'right' }}>Status</div>
            </div>
            
            {isCompleted && !hasRanks && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(245, 158, 11, 0.1)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.8rem', color: '#F59E0B', textAlign: 'center' }}>
                ⏳ Scores are being calculated. Rankings will appear shortly.
              </div>
            )}
            
            {liveEntries && liveEntries.length > 0 ? liveEntries.map((entry: any, idx: number) => {
              const profile = entry.profiles
              const isYou = profile.id === user.id
              return (
                <div key={entry.user_id} style={{ display: 'flex', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', background: isYou ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
                  <div style={{ width: '40px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>{idx + 1}</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      {(profile.display_name || profile.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{profile.display_name || profile.email.split('@')[0]}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                        {isYou && <span style={{ fontSize: '0.65rem', color: '#EF4444', textTransform: 'uppercase', fontWeight: 'bold', border: '1px solid #EF4444', padding: '1px 4px', borderRadius: '4px' }}>You</span>}
                        {teamMap[profile.id] && (
                          <PitchModal 
                            team={teamMap[profile.id]} 
                            matchScores={scoreMap} 
                            userName={profile.display_name || profile.email.split('@')[0]} 
                            teamA={match.team_a}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '100px', textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: isLive ? '#EF4444' : '#F59E0B', fontWeight: 600, border: `1px solid ${isLive ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`, padding: '2px 8px', borderRadius: '4px' }}>
                      {isLive ? '● Live' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
              )
            }) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No teams were submitted for this match.</div>
            )}
          </>
        )}

        {!isLive && !isCompleted && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
            This match hasn&apos;t started yet. Draft your team before the deadline!
          </div>
        )}
      </div>
    </div>
  )
}
