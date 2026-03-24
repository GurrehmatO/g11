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

  // Fetch the match
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', params.match_id)
    .single()

  if (!match) {
    return <div style={{ padding: '2rem' }}>Match not found.</div>
  }

  // Check if they already have a team
  const { data: existingTeam } = await supabase
    .from('user_teams')
    .select('*, user_team_players(player_id)')
    .eq('user_id', user.id)
    .eq('match_id', match.id)
    .single()

  // Fetch players for both teams
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .in('team', [match.team_a, match.team_b])
    .order('credits', { ascending: false })

  // Pass match object fully to client
  return (
    <div style={{ margin: 0, padding: 0, animation: 'fadeIn 0.3s ease', minHeight: '100vh', background: '#000' }}>
      <TeamBuilder 
        matchId={match.id} 
        players={players || []} 
        matchInfo={match}
        existingTeam={existingTeam} 
      />
    </div>
  )
}
