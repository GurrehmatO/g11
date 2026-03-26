'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

const CRICAPI_KEY = process.env.CRICAPI_KEY!
const IPL_SERIES_ID = '87c62aac-bc3c-4738-ab93-19da0690488f' // IPL 2026

export async function syncMatches(formData?: FormData): Promise<void> {
  const supabase = createAdminClient()
  
  const res = await fetch(`https://api.cricapi.com/v1/series_info?apikey=${CRICAPI_KEY}&id=${IPL_SERIES_ID}`, { cache: 'no-store' })
  const json = await res.json()
  
  if (json.status !== 'success') return

  const matches = json.data.matchList;

  for (const match of matches) {
    let matchStatus = 'upcoming'
    if (match.matchEnded) matchStatus = 'completed'
    else if (match.matchStarted) matchStatus = 'live'

    await supabase
      .from('matches')
      .upsert({
        api_match_id: match.id,
        name: match.name,
        match_date: match.dateTimeGMT,
        status: matchStatus,
        team_a: match.teams[0],
        team_b: match.teams[1]
      }, { onConflict: 'api_match_id' })
  }

  // Auto-promote upcoming matches that have passed their start time to 'live'
  await supabase
    .from('matches')
    .update({ status: 'live' })
    .eq('status', 'upcoming')
    .lte('match_date', new Date().toISOString())

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

export async function syncPlayers(formData?: FormData): Promise<void> {
  const supabase = createAdminClient()
  
  const res = await fetch(`https://api.cricapi.com/v1/series_squad?apikey=${CRICAPI_KEY}&id=${IPL_SERIES_ID}`, { cache: 'no-store' })
  const json = await res.json()
  
  if (json.status !== 'success') return

  for (const team of json.data) {
    for (const player of team.players) {
      const credits = Number((Math.random() * 2.5 + 8).toFixed(1))

      await supabase
        .from('players')
        .upsert({
          api_player_id: player.id,
          name: player.name,
          role: player.role,
          team: team.teamName,
          credits: credits
        }, { onConflict: 'api_player_id' });
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

export async function calculateScores(formData: FormData): Promise<void> {
  const matchId = formData.get('matchId') as string
  if (!matchId) return

  const supabase = createAdminClient()
  
  // 1. Fetch user teams for this match
  const { data: userTeams, error: utError } = await supabase
    .from('user_teams')
    .select(`
      id, user_id, captain_id, vice_captain_id,
      user_team_players(player_id)
    `)
    .eq('match_id', matchId)

  if (utError || !userTeams) return

  // 2. Fetch players for this match
  const { data: matchData } = await supabase.from('matches').select('team_a, team_b').eq('id', matchId).single()
  if (!matchData) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allPlayers } = await supabase.from('players').select('id, name, role').in('team', [matchData.team_a, matchData.team_b])
  if (!allPlayers) return

  // 3. Dream11 T20 Engine: Compute player points deterministically
  const playerBasePoints: Record<string, number> = {}
  
  for (const p of allPlayers) {
    let points = 4; // In lineup bonus
    
    let hash = 0;
    for (let i = 0; i < p.id.length; i++) hash = p.id.charCodeAt(i) + ((hash << 5) - hash);
    const rand = Math.abs(hash % 100);
    
    if (p.role.includes('Bat') || p.role.includes('WK')) {
      const runs = Math.floor(rand * 1.5);
      points += runs;
      if (runs >= 50 && runs < 100) points += 8;
      if (runs >= 100) points += 16;
      if (runs === 0 && rand < 10) points -= 2; // Duck
      points += Math.floor(runs / 10); // 4s 
      points += Math.floor(runs / 20) * 2; // 6s 
      const sr = 130 + (rand - 50);
      if (runs > 10) {
         if (sr > 170) points += 6;
         else if (sr > 150) points += 4;
         else if (sr > 130) points += 2;
         else if (sr < 50) points -= 6;
      }
    } else if (p.role.includes('Bowl') || p.role.includes('All')) {
      const wickets = Math.floor(rand / 25);
      points += wickets * 25;
      if (wickets >= 4) points += 8;
      if (wickets >= 5) points += 16;
      const econ = 6 + (rand / 20);
      if (econ < 5) points += 6;
      else if (econ < 6) points += 4;
      else if (econ > 12) points -= 6;
      else if (econ > 11) points -= 4;
      else if (econ > 10) points -= 2;
    }
    
    if (rand % 5 === 0) points += 8; // Catch
    
    playerBasePoints[p.id] = points;
    
    await supabase.from('player_scores').upsert({
      match_id: matchId,
      player_id: p.id,
      points: points
    }, { onConflict: 'match_id,player_id' });
  }

  // 4. Calculate User Raw Scores
  const userRankings: { userId: string, rawScore: number }[] = [];
  for (const ut of userTeams) {
    let rawScore = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedIds = ut.user_team_players.map((utp: any) => utp.player_id);
    for (const pid of selectedIds) {
      let pt = playerBasePoints[pid] || 0;
      if (pid === ut.captain_id) pt *= 2;
      else if (pid === ut.vice_captain_id) pt *= 1.5;
      rawScore += pt;
    }
    rawScore = Math.round(rawScore * 10) / 10;
    userRankings.push({ userId: ut.user_id, rawScore });
  }

  // 5. Apply Relative Rank Tie-Breaker Algorithm
  userRankings.sort((a, b) => b.rawScore - a.rawScore); 
  
  const N = userRankings.length;
  if(N > 0) {
    let currentRank = 1;
    while (currentRank <= N) {
      let tieCount = 1;
      const score = userRankings[currentRank - 1].rawScore;
      while (currentRank - 1 + tieCount < N && userRankings[currentRank - 1 + tieCount].rawScore === score) {
        tieCount++;
      }
      
      let totalPointsForGroup = 0;
      for(let i=0; i<tieCount; i++) {
         totalPointsForGroup += (N - (currentRank - 1 + i));
      }
      const avgRelativePoints = totalPointsForGroup / tieCount;
      
      for(let i=0; i<tieCount; i++) {
         const u = userRankings[currentRank - 1 + i];
         await supabase.from('user_match_ranks').upsert({
           user_id: u.userId,
           match_id: matchId,
           raw_score: u.rawScore,
           relative_rank: currentRank,
           relative_points: avgRelativePoints
         }, { onConflict: 'user_id,match_id' });
         
         const { data: prof } = await supabase.from('profiles').select('total_points').eq('id', u.userId).single();
         const newTotal = (prof?.total_points || 0) + avgRelativePoints;
         await supabase.from('profiles').update({ total_points: newTotal }).eq('id', u.userId);
      }
      currentRank += tieCount;
    }
  }

  // 6. Mark match as completed
  await supabase.from('matches').update({ status: 'completed' }).eq('id', matchId);
  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

export async function syncLiveScores(formData: FormData): Promise<void> {
  const matchId = formData.get('matchId') as string
  if (!matchId) return

  const supabase = createAdminClient()
  
  const { data: matchData } = await supabase.from('matches').select('team_a, team_b').eq('id', matchId).single()
  if (!matchData) return

  const { data: allPlayers } = await supabase.from('players').select('id, name, role').in('team', [matchData.team_a, matchData.team_b])
  if (!allPlayers) return

  // Generate Deterministic Live Points (Simulating mid-game / innings break)
  for (const p of allPlayers) {
    let points = 4; // In lineup bonus
    
    let hash = 0;
    for (let i = 0; i < p.id.length; i++) hash = p.id.charCodeAt(i) + ((hash << 5) - hash);
    const rand = Math.abs(hash % 100);
    
    if (p.role.includes('Bat') || p.role.includes('WK')) {
      const runs = Math.floor(rand * 0.8); // 80% progression
      points += runs;
      if (runs >= 50 && runs < 100) points += 8;
      if (runs >= 100) points += 16;
      if (runs === 0 && rand < 10) points -= 2; 
    } else if (p.role.includes('Bowl') || p.role.includes('All')) {
      const wickets = Math.floor(rand / 35); // Less wickets mid-game
      points += wickets * 25;
      if (wickets >= 4) points += 8;
      if (wickets >= 5) points += 16;
    }
    
    if (rand % 5 === 0) points += 8; // Catch
    
    await supabase.from('player_scores').upsert({
      match_id: matchId,
      player_id: p.id,
      points: points
    }, { onConflict: 'match_id,player_id' });
  }

  // Update Match Status to live
  await supabase.from('matches').update({ status: 'live' }).eq('id', matchId);
  revalidatePath('/admin')
  revalidatePath('/dashboard')
}
