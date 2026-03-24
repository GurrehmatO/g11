'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function saveTeam(matchId: string, playerIds: string[], captainId: string, viceCaptainId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  if (playerIds.length !== 11 || !captainId || !viceCaptainId) {
    return { error: 'Invalid team submission. Must have 11 players, C, and VC.' }
  }

  const { data: match } = await supabase.from('matches').select('status').eq('id', matchId).single()
  if (!match || match.status !== 'upcoming') {
    return { error: 'Team submission is locked for this match.' }
  }

  // 1. Upsert into user_teams
  const { data: userTeam, error: teamError } = await supabase
    .from('user_teams')
    .upsert({
      user_id: user.id,
      match_id: matchId,
      captain_id: captainId,
      vice_captain_id: viceCaptainId
    }, { onConflict: 'user_id, match_id' })
    .select()
    .single()

  if (teamError || !userTeam) {
    console.error(teamError)
    return { error: 'Failed to create user team record.' }
  }

  // 2. Delete existing players in case it's an edit
  await supabase
    .from('user_team_players')
    .delete()
    .eq('user_team_id', userTeam.id)

  // 3. Insert new players
  const playerInserts = playerIds.map(pid => ({
    user_team_id: userTeam.id,
    player_id: pid
  }))

  const { error: playersError } = await supabase
    .from('user_team_players')
    .insert(playerInserts)

  if (playersError) {
    console.error(playersError)
    return { error: 'Failed to assign players to team.' }
  }

  redirect('/dashboard')
}
