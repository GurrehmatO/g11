import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TeamBuilder from './TeamBuilder'

export default async function TeamPage(props: { params: Promise<{ match_id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: match }, { data: existingTeam }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .eq('id', params.match_id)
      .single(),
    supabase
      .from('user_teams')
      .select('*, user_team_players(player_id), user_substitutes(player_id, priority)')
      .eq('user_id', user.id)
      .eq('match_id', params.match_id)
      .single(),
  ])

  if (!match) {
    return <div style={{ padding: '2rem' }}>Match not found.</div>
  }

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .in('team', [match.team_a, match.team_b])
    .order('credits', { ascending: false })

  const playerIds = players?.map(p => p.id) || []
  const { data: allScores } = await supabase
    .from('player_scores')
    .select('player_id, points')
    .in('player_id', playerIds)

  const scoreMap: Record<string, number> = {}
  allScores?.forEach(s => {
    scoreMap[s.player_id] = (scoreMap[s.player_id] || 0) + s.points
  })

  const playersWithPoints = players?.map(p => ({
    ...p,
    totalPoints: scoreMap[p.id]
  }))

  return (
    <div style={{ margin: 0, padding: 0, animation: 'fadeIn 0.3s ease', minHeight: '100vh', background: '#000' }}>
      <TeamBuilder 
        matchId={match.id} 
        players={playersWithPoints || []} 
        matchInfo={match}
        existingTeam={existingTeam} 
      />
    </div>
  )
}
