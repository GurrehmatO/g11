'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function saveTeam(matchId: string, playerIds: string[], captainId: string, viceCaptainId: string, substituteIds: string[] = []) {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()

   if (!user) {
     throw new Error('Unauthorized')
   }

   if (playerIds.length !== 11 || !captainId || !viceCaptainId) {
     return { error: 'Invalid team submission. Must have 11 players, C, and VC.' }
   }

   if (substituteIds.length > 4) {
     return { error: 'Maximum 4 substitutes allowed.' }
   }

   // Check for duplicates between main team and substitutes
   const allPlayerIds = new Set([...playerIds, ...substituteIds])
   if (allPlayerIds.size !== playerIds.length + substituteIds.length) {
     return { error: 'Substitutes cannot overlap with main team players.' }
   }

   // Total unique players cannot exceed 15
   if (allPlayerIds.size > 15) {
     return { error: 'Total players (main + substitutes) cannot exceed 15.' }
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

   // 4. Delete existing substitutes
   await supabase
     .from('user_substitutes')
     .delete()
     .eq('user_team_id', userTeam.id)

   // 5. Insert new substitutes with priorities
   if (substituteIds.length > 0) {
     const substituteInserts = substituteIds.map((pid, index) => ({
       user_team_id: userTeam.id,
       player_id: pid,
       priority: index + 1
     }))

     const { error: subsError } = await supabase
       .from('user_substitutes')
       .insert(substituteInserts)

     if (subsError) {
       console.error(subsError)
       return { error: 'Failed to assign substitutes.' }
     }
   }

   redirect('/dashboard')
 }
