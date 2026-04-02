'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

const CRICAPI_KEY = process.env.CRICAPI_KEY!
const IPL_SERIES_ID = '87c62aac-bc3c-4738-ab93-19da0690488f' // IPL 2026
const CRICBUZZ_SERIES_ID = '9241' // IPL 2026

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

  // Automate Cricbuzz ID discovery after syncing
  try {
    await discoverCricbuzzIds()
  } catch (err) {
    console.error('Cricbuzz ID discovery failed:', err)
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

const TEAM_MAP: Record<string, string> = {
  'Royal Challengers Bengaluru': 'rcb',
  'Sunrisers Hyderabad': 'srh',
  'Mumbai Indians': 'mi',
  'Kolkata Knight Riders': 'kkr',
  'Delhi Capitals': 'dc',
  'Rajasthan Royals': 'rr',
  'Punjab Kings': 'pbks',
  'Chennai Super Kings': 'csk',
  'Gujarat Titans': 'gt',
  'Lucknow Super Giants': 'lsg'
}

import cricbuzzData from '@/data/cricbuzz_ids.json'

export async function discoverCricbuzzIds(): Promise<void> {
  const supabase = createAdminClient()
  
  // 1. Fetch matches from DB that need an update
  const { data: dbMatches } = await supabase.from('matches').select('id, name, team_a, team_b')
  if (!dbMatches) return

  // 2. Prepare common scraper data as fallback
  let scraperMatches: { id: string, slug: string, matchNum?: string }[] = []
  let scraperAttempted = false

  async function tryScrape() {
    if (scraperAttempted) return
    scraperAttempted = true
    const url = `https://www.cricbuzz.com/cricket-series/${CRICBUZZ_SERIES_ID}/indian-premier-league-2026/matches`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
    if (!res.ok) return
    const html = await res.text()
    const matchRegex = /\/(\d+)\/([a-z0-9-]+-indian-premier-league-2026[^"]*)/g
    let m
    while ((m = matchRegex.exec(html)) !== null) {
      const id = m[1]
      const slug = m[2]
      const numMatch = slug.match(/(\d+)(st|nd|rd|th)-match/)
      scraperMatches.push({ id, slug, matchNum: numMatch ? numMatch[1] : undefined })
    }
  }

  for (const match of dbMatches) {
    // Extract match number: "1st Match", "2nd Match" etc.
    const dbMatchNum = match.name.match(/(\d+)(st|nd|rd|th)\s+Match/i)
    const targetNum = dbMatchNum ? dbMatchNum[1] : undefined
    
    let foundId: string | null = null

    // Method A: Check hardcoded/pre-mapped data (Guaranteed for regular season)
    if (targetNum && (cricbuzzData as any)[targetNum]) {
      foundId = (cricbuzzData as any)[targetNum].id
    }

    // Method B: Fallback to dynamic scraper (Useful for playoffs or if JSON is outdated)
    if (!foundId) {
      await tryScrape()
      const tA = TEAM_MAP[match.team_a]
      const tB = TEAM_MAP[match.team_b]
      if (tA && tB) {
        const found = scraperMatches.find(cm => {
          if (targetNum && cm.matchNum && targetNum !== cm.matchNum) return false
          const slugParts = cm.slug.split('-')
          return slugParts.includes(tA) && slugParts.includes(tB)
        })
        if (found) foundId = found.id
      }
    }

    if (foundId) {
      await supabase.from('matches').update({ cricbuzz_match_id: foundId }).eq('id', match.id)
      console.log(`Linked Match ${match.id} (${match.name}) with CB ID ${foundId}`)
    }
  }
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

export async function changeMatchStatus(matchId: string, apiMatchId: string | null, newStatus: string, cricbuzzUrl?: string): Promise<void> {
  const supabase = createAdminClient()

  // Always update the status first
  await supabase.from('matches').update({ status: newStatus }).eq('id', matchId)

  // If completing, attempt real-data scoring as a best-effort step
  if (newStatus === 'completed') {
    try {
      let finalUrl = cricbuzzUrl

      // If no URL provided, try to find the saved Cricbuzz ID
      if (!finalUrl) {
        const { data: m } = await supabase.from('matches').select('cricbuzz_match_id').eq('id', matchId).single()
        if (m?.cricbuzz_match_id) {
          finalUrl = `https://www.cricbuzz.com/live-cricket-scorecard/${m.cricbuzz_match_id}`
        }
      }

      if (finalUrl) {
        // Use Cricbuzz scraper
        await calculateScoresFromCricbuzz(matchId, finalUrl)
      } else if (apiMatchId) {
        // Fallback to CricAPI
        const fd = new FormData()
        fd.set('matchId', matchId)
        fd.set('apiMatchId', apiMatchId)
        await calculateScoresFromAPI(fd)
      }
    } catch (err) {
      console.error('Scoring pipeline error (match still marked completed):', err)
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

    // Derive two independent deterministic numbers from player ID
    let hash1 = 0, hash2 = 0;
    for (let i = 0; i < p.id.length; i++) {
      hash1 = p.id.charCodeAt(i) + ((hash1 << 5) - hash1);
      hash2 = p.id.charCodeAt(p.id.length - 1 - i) + ((hash2 << 3) - hash2);
    }
    const batRand = Math.abs(hash1 % 100); // 0–99, drives batting
    const bowlRand = Math.abs(hash2 % 100); // 0–99, drives bowling

    // ── BATTING (applies to ALL players who batted) ──
    const runs = Math.floor(batRand * 1.2);
    points += runs;
    if (runs >= 50 && runs < 100) points += 8;  // Half-century bonus
    if (runs >= 100) points += 16;               // Century bonus
    if (runs === 0 && batRand < 15) points -= 2; // Duck
    points += Math.floor(runs / 10);             // Boundary bonus (4s)
    points += Math.floor(runs / 20) * 2;         // Six bonus
    if (runs > 10) {
      const sr = 80 + batRand; // simulate SR range 80–180
      if (sr > 170) points += 6;
      else if (sr > 150) points += 4;
      else if (sr > 130) points += 2;
      else if (sr < 60) points -= 2;
      else if (sr < 50) points -= 4;
    }

    // ── BOWLING (applies to ALL players who bowled) ──
    // Use bowlRand to determine if they bowled at all (> 30 = bowled 2+ overs)
    if (bowlRand > 30) {
      const wickets = Math.floor(bowlRand / 30); // 0–3 wickets
      points += wickets * 25;
      if (wickets >= 4) points += 8;  // 4-wkt haul bonus
      if (wickets >= 5) points += 16; // 5-wkt haul bonus
      if (bowlRand % 7 === 0) points += 8; // Maiden over
      const econ = 4 + (bowlRand % 10); // Economy 4–14
      if (econ < 5) points += 6;
      else if (econ < 6) points += 4;
      else if (econ < 7) points += 2;
      else if (econ >= 10 && econ < 11) points -= 2;
      else if (econ >= 11 && econ < 12) points -= 4;
      else if (econ >= 12) points -= 6;
    }

    // ── FIELDING ──
    if (batRand % 5 === 0) points += 8;  // Catch
    if (bowlRand % 12 === 0) points += 12; // Stumping / direct hit
    
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

// ─── Helper: Dream11 T20 points from real batting stats ───────────────────────
function battingPoints(r: number, b: number, fours: number, sixes: number, isDuck: boolean): number {
  let pts = 0
  pts += r                       // 1 pt per run
  pts += fours                   // 1 extra per 4
  pts += sixes * 2               // 2 extra per 6
  if (r >= 100) pts += 16        // century bonus
  else if (r >= 50) pts += 8     // half-century bonus
  if (isDuck) pts -= 2           // duck penalty
  // SR bonus/penalty (min 10 balls faced)
  if (b >= 10) {
    const sr = (r / b) * 100
    if (sr > 170)      pts += 6
    else if (sr > 150) pts += 4
    else if (sr > 130) pts += 2
    else if (sr < 50)  pts -= 6
    else if (sr < 60)  pts -= 4
    else if (sr < 70)  pts -= 2
  }
  return pts
}

// ─── Helper: Dream11 T20 points from real bowling stats ───────────────────────
function bowlingPoints(w: number, m: number, r: number, o: number): number {
  let pts = 0
  pts += w * 25                  // 25 per wicket
  if (w >= 5) pts += 16          // 5-wicket haul
  else if (w >= 4) pts += 8      // 4-wicket haul
  pts += m * 8                   // maiden bonus
  // Economy bonus/penalty (min 2 overs)
  if (o >= 2) {
    const eco = r / o
    if (eco < 5)       pts += 6
    else if (eco < 6)  pts += 4
    else if (eco < 7)  pts += 2
    else if (eco >= 10 && eco < 11) pts -= 2
    else if (eco >= 11 && eco < 12) pts -= 4
    else if (eco >= 12) pts -= 6
  }
  return pts
}

// ─── Helper: fuzzy name normaliser ────────────────────────────────────────────
function normName(name: string) {
  return name.toLowerCase().replace(/[^a-z ]/g, '').trim()
}

// ─── Real scorecard scoring engine ────────────────────────────────────────────
export async function calculateScoresFromAPI(formData: FormData): Promise<void> {
  const matchId     = formData.get('matchId') as string      // our DB UUID
  const apiMatchId  = formData.get('apiMatchId') as string   // CricAPI match ID for scorecard

  if (!matchId || !apiMatchId) return

  const supabase = createAdminClient()
  const key = process.env.CRICAPI_KEY
  if (!key) { console.error('CRICAPI_KEY not set'); return }

  // 1. Fetch scorecard from CricAPI
  const res = await fetch(`https://api.cricapi.com/v1/match_scorecard?apikey=${key}&id=${apiMatchId}`, { cache: 'no-store' })
  if (!res.ok) { console.error('CricAPI HTTP error:', res.status, await res.text()); return }
  const sc = await res.json()
  if (sc.status !== 'success') { console.error('CricAPI error:', sc); return }

  const scorecard: any[] = sc.data.scorecard || []

  // 2. Aggregate stats per player ID (CricAPI player ID, not our DB ID)
  const apiStats: Record<string, { runs: number; balls: number; fours: number; sixes: number; isDuck: boolean; wickets: number; maidens: number; runsConceded: number; overs: number; catches: number }> = {}

  const ensure = (id: string) => {
    if (!apiStats[id]) apiStats[id] = { runs: 0, balls: 0, fours: 0, sixes: 0, isDuck: false, wickets: 0, maidens: 0, runsConceded: 0, overs: 0, catches: 0 }
    return apiStats[id]
  }

  for (const inning of scorecard) {
    for (const row of (inning.batting || [])) {
      const pid  = row.batsman?.id; if (!pid) continue
      const stat = ensure(pid)
      stat.runs  += row.r  || 0
      stat.balls += row.b  || 0
      stat.fours += row['4s'] || 0
      stat.sixes += row['6s'] || 0
      if ((row.r || 0) === 0 && (row.b || 0) > 0 && row.dismissal !== 'not out') stat.isDuck = true
    }
    for (const row of (inning.bowling || [])) {
      const pid  = row.bowler?.id; if (!pid) continue
      const stat = ensure(pid)
      stat.wickets      += row.w || 0
      stat.maidens      += row.m || 0
      stat.runsConceded += row.r || 0
      stat.overs        += parseFloat(row.o) || 0
    }
    for (const row of (inning.catching || [])) {
      if (row.fielder?.id) ensure(row.fielder.id).catches++
    }
  }

  // Build CricAPI id → name map for later matching
  const apiIdToName: Record<string, string> = {}
  for (const inning of scorecard) {
    for (const row of (inning.batting || [])) if (row.batsman?.id) apiIdToName[row.batsman.id] = row.batsman.name
    for (const row of (inning.bowling || [])) if (row.bowler?.id)  apiIdToName[row.bowler.id]  = row.bowler.name
  }

  // 3. Load our DB players for this match
  const { data: matchData } = await supabase.from('matches').select('team_a, team_b').eq('id', matchId).single()
  if (!matchData) return
  const { data: dbPlayers } = await supabase.from('players').select('id, name').in('team', [matchData.team_a, matchData.team_b])
  if (!dbPlayers) return

  // 4. Match DB players to API stats via normalised name fuzzy-join
  const playerBasePoints: Record<string, number> = {}

  for (const dbP of dbPlayers) {
    const normDb  = normName(dbP.name)
    const lastDb  = normDb.split(' ').pop() || ''

    // Find matching API player: exact > last-name > no match
    let matchedApiId: string | null = null
    for (const [apiId, apiName] of Object.entries(apiIdToName)) {
      const normApi  = normName(apiName)
      const lastApi  = normApi.split(' ').pop() || ''
      if (normApi === normDb || lastApi === lastDb) { matchedApiId = apiId; break }
    }

    let pts = 4 // in-lineup bonus
    if (matchedApiId && apiStats[matchedApiId]) {
      const s = apiStats[matchedApiId]
      pts += battingPoints(s.runs, s.balls, s.fours, s.sixes, s.isDuck)
      pts += bowlingPoints(s.wickets, s.maidens, s.runsConceded, s.overs)
      pts += s.catches * 8   // 8 per catch/stumping
    }

    playerBasePoints[dbP.id] = pts

    await supabase.from('player_scores').upsert({
      match_id: matchId,
      player_id: dbP.id,
      points: pts
    }, { onConflict: 'match_id,player_id' })
  }

  // 5. Calculate raw team scores
  const { data: userTeams } = await supabase
    .from('user_teams')
    .select('id, user_id, captain_id, vice_captain_id, user_team_players(player_id)')
    .eq('match_id', matchId)
  if (!userTeams) return

  const userRankings: { userId: string, rawScore: number }[] = []
  for (const ut of userTeams) {
    let rawScore = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedIds = ut.user_team_players.map((utp: any) => utp.player_id)
    for (const pid of selectedIds) {
      let pt = playerBasePoints[pid] || 0
      if (pid === ut.captain_id)      pt *= 2
      else if (pid === ut.vice_captain_id) pt *= 1.5
      rawScore += pt
    }
    rawScore = Math.round(rawScore * 10) / 10
    userRankings.push({ userId: ut.user_id, rawScore })
  }

  // 6. Relative rank tie-breaker
  userRankings.sort((a, b) => b.rawScore - a.rawScore)
  const N = userRankings.length
  if (N > 0) {
    let currentRank = 1
    while (currentRank <= N) {
      let tieCount = 1
      const score = userRankings[currentRank - 1].rawScore
      while (currentRank - 1 + tieCount < N && userRankings[currentRank - 1 + tieCount].rawScore === score) tieCount++

      let total = 0
      for (let i = 0; i < tieCount; i++) total += N - (currentRank - 1 + i)
      const avg = total / tieCount

      for (let i = 0; i < tieCount; i++) {
        const u = userRankings[currentRank - 1 + i]
        await supabase.from('user_match_ranks').upsert({
          user_id: u.userId, match_id: matchId,
          raw_score: u.rawScore, relative_rank: currentRank, relative_points: avg
        }, { onConflict: 'user_id,match_id' })
        const { data: prof } = await supabase.from('profiles').select('total_points').eq('id', u.userId).single()
        await supabase.from('profiles').update({ total_points: (prof?.total_points || 0) + avg }).eq('id', u.userId)
      }
      currentRank += tieCount
    }
  }

  // 7. Mark match as completed
  await supabase.from('matches').update({ status: 'completed' }).eq('id', matchId)
  revalidatePath('/admin')
  revalidatePath('/dashboard')
}


// ─── Cricbuzz Scorecard Scraper & Scoring Pipeline ────────────────────────────
export async function calculateScoresFromCricbuzz(matchId: string, cricbuzzUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!matchId || !cricbuzzUrl) return { success: false, error: 'Missing matchId or cricbuzzUrl' }

  const supabase = createAdminClient()

  // 1. Fetch Cricbuzz page HTML
  const res = await fetch(cricbuzzUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    cache: 'no-store'
  })
  if (!res.ok) return { success: false, error: `Cricbuzz HTTP error: ${res.status}` }
  const html = await res.text()

  // 2. Extract batting data from embedded JSON
  const batRegex = /\\?"batId\\?":\s*(\d+)\s*,\s*\\?"batName\\?":\s*\\?"([^"\\]+)\\?"[^}]*?\\?"runs\\?":\s*(\d+)\s*,\s*\\?"balls\\?":\s*(\d+)\s*,\s*\\?"dots\\?":\s*\d+\s*,\s*\\?"fours\\?":\s*(\d+)\s*,\s*\\?"sixes\\?":\s*(\d+)[^}]*?\\?"strikeRate\\?":\s*([\d.]+)\s*,\s*\\?"outDesc\\?":\s*\\?"([^"\\]*)\\?"[^}]*?\\?"wicketCode\\?":\s*\\?"([^"\\]*)\\?"/g

  const playerStats: Record<string, { name: string; runs: number; balls: number; fours: number; sixes: number; isDuck: boolean; wickets: number; maidens: number; runsConceded: number; overs: number; catches: number; stumpings: number; runOuts: number }> = {}

  const ensure = (name: string) => {
    const key = normName(name)
    if (!playerStats[key]) playerStats[key] = { name, runs: 0, balls: 0, fours: 0, sixes: 0, isDuck: false, wickets: 0, maidens: 0, runsConceded: 0, overs: 0, catches: 0, stumpings: 0, runOuts: 0 }
    return playerStats[key]
  }

  let m
  while ((m = batRegex.exec(html)) !== null) {
    const s = ensure(m[2])
    s.runs += parseInt(m[3])
    s.balls += parseInt(m[4])
    s.fours += parseInt(m[5])
    s.sixes += parseInt(m[6])
    if (parseInt(m[3]) === 0 && parseInt(m[4]) > 0 && m[9] !== '') s.isDuck = true
  }

  // 3. Extract bowling data
  const bowlRegex = /\\?"bowlerId\\?":\s*\d+\s*,\s*\\?"bowlName\\?":\s*\\?"([^"\\]+)\\?"[^}]*?\\?"overs\\?":\s*([\d.]+)\s*,\s*\\?"maidens\\?":\s*(\d+)\s*,\s*\\?"runs\\?":\s*(\d+)\s*,\s*\\?"wickets\\?":\s*(\d+)\s*,\s*\\?"economy\\?":\s*([\d.]+)/g

  while ((m = bowlRegex.exec(html)) !== null) {
    const s = ensure(m[1])
    s.overs += parseFloat(m[2])
    s.maidens += parseInt(m[3])
    s.runsConceded += parseInt(m[4])
    s.wickets += parseInt(m[5])
  }

  // 4. Extract fielding points (catches, stumpings, run outs) from dismissal descriptions
  const outDescRegex = /\\?"outDesc\\?":\s*\\?"([^"\\]+)\\?"/g
  while ((m = outDescRegex.exec(html)) !== null) {
    const desc = m[1].trim()
    
    // Catch: "c Fielder b Bowler" but ignore c & b
    if (desc.startsWith('c ') && !desc.startsWith('c & b') && !desc.startsWith('c &amp; b')) {
      const cMatch = desc.match(/^c\s+(.+?)\s+b\s+/)
      if (cMatch) { const s = ensure(cMatch[1].replace(/\(sub\)/gi, '').trim()); s.catches++ }
    }
    // Caught & Bowled: "c & b Bowler"
    else if (desc.startsWith('c & b') || desc.startsWith('c &amp; b')) {
      const cbMatch = desc.match(/^c\s*(?:&|&amp;)\s*b\s+(.+)$/)
      if (cbMatch) { const s = ensure(cbMatch[1].replace(/\(sub\)/gi, '').trim()); s.catches++ }
    }
    // Stumping: "st Wicketkeeper b Bowler"
    else if (desc.startsWith('st ')) {
      const stMatch = desc.match(/^st\s+(.+?)\s+b\s+/)
      if (stMatch) { const s = ensure(stMatch[1].replace(/\(sub\)/gi, '').trim()); s.stumpings++ }
    }
    // Run out: "run out (Fielder1/Fielder2)"
    else if (desc.startsWith('run out')) {
      const roMatch = desc.match(/run out\s*\(([^)]+)\)/)
      if (roMatch) {
        const fielders = roMatch[1].split('/').map(f => f.replace(/\(sub\)/gi, '').trim())
        for (const f of fielders) { const s = ensure(f); s.runOuts++ }
      }
    }
  }

  const statsCount = Object.keys(playerStats).length
  if (statsCount === 0) return { success: false, error: 'No scorecard data found on the page. Is the URL correct?' }

  // 4a. Fetch Squads Page to find actual Playing XI + Impact Subs
  const squadsUrl = cricbuzzUrl.replace('/live-cricket-scorecard/', '/cricket-match-squads/').replace('/live-cricket-scores/', '/cricket-match-squads/')
  const cbSquadsRes = await fetch(squadsUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    cache: 'no-store'
  })
  const squadsHtml = await cbSquadsRes.text()
  
  const activePlayers = new Set<string>()
  const lowHtml = squadsHtml.toLowerCase()
  const playingXIStart = lowHtml.indexOf('>playing xi</h1>')
  const substitutesStart = lowHtml.indexOf('>substitutes</h1>')
  const benchStart = lowHtml.indexOf('>bench</h1>')
  
  if (playingXIStart !== -1 && substitutesStart !== -1) {
    const playingXIHtml = squadsHtml.substring(playingXIStart, substitutesStart)
    const endSubIdx = benchStart !== -1 ? benchStart : squadsHtml.length
    const substitutesHtml = squadsHtml.substring(substitutesStart, endSubIdx)

    const playerRegex = /href="\/profiles\/\d+\/[^"]+".*?<span>([^<]+)<\/span>/g
    let m
    while ((m = playerRegex.exec(playingXIHtml)) !== null) activePlayers.add(normName(m[1].trim()))

    const subBlockRegex = /<a [^>]*href="\/profiles\/\d+\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g
    while ((m = subBlockRegex.exec(substitutesHtml)) !== null) {
      if (m[1].includes('bg-cbHundred')) { // subbed in impact player
        const nameMatch = m[1].match(/<span>([^<]+)<\/span>/)
        if (nameMatch) activePlayers.add(normName(nameMatch[1].trim()))
      }
    }
  }

  // 5. Load our DB players for this match and match by name
  const { data: matchData } = await supabase.from('matches').select('team_a, team_b, match_date').eq('id', matchId).single()
  if (!matchData) return { success: false, error: 'Match not found in database' }

  // Check if this match is still the latest completed match for both teams, 
  // so we avoid corrupting 'played_last_match' if an admin retroactively scores an old game
  const { data: latestA } = await supabase.from('matches').select('match_date').or(`team_a.eq.${matchData.team_a},team_b.eq.${matchData.team_a}`).eq('status', 'completed').order('match_date', { ascending: false }).limit(1).single()
  const { data: latestB } = await supabase.from('matches').select('match_date').or(`team_a.eq.${matchData.team_b},team_b.eq.${matchData.team_b}`).eq('status', 'completed').order('match_date', { ascending: false }).limit(1).single()
  
  const isLatestForA = !latestA || new Date(matchData.match_date) >= new Date(latestA.match_date)
  const isLatestForB = !latestB || new Date(matchData.match_date) >= new Date(latestB.match_date)

  // Select 'cricbuzz_name' to allow explicit exact matching overrides
  const { data: dbPlayers } = await supabase.from('players').select('id, name, cricbuzz_name, team').in('team', [matchData.team_a, matchData.team_b])
  if (!dbPlayers) return { success: false, error: 'No players found for this match' }

  // 6. Exact-match DB players to scraped stats and compute fantasy points
  const playerBasePoints: Record<string, number> = {}

  for (const dbP of dbPlayers) {
    const normDb = normName(dbP.name)
    const dbNameMatch = dbP.cricbuzz_name ? normName(dbP.cricbuzz_name) : normDb

    // Check if player is an active player (Playing 11 + Impact Player) using Exact Matches
    let isActive = false
    for (const actP of Array.from(activePlayers)) {
      if (actP === dbNameMatch || actP === normDb) { isActive = true; break }
    }

    // Find matching scraped player stats using Exact Matches
    let matched: typeof playerStats[string] | null = null
    for (const [key, stats] of Object.entries(playerStats)) {
      if (key === dbNameMatch || key === normDb) { matched = stats; break }
    }

    let pts = isActive ? 4 : 0 // in-lineup bonus
    if (matched) {
      pts += battingPoints(matched.runs, matched.balls, matched.fours, matched.sixes, matched.isDuck)
      pts += bowlingPoints(matched.wickets, matched.maidens, matched.runsConceded, matched.overs)
      pts += matched.catches * 8
      pts += matched.stumpings * 12
      pts += matched.runOuts * 12
    }

    playerBasePoints[dbP.id] = pts
    
    // Update played_last_match status ONLY IF this is the most recent completed match for their team
    const shouldUpdateFlag = (dbP.team === matchData.team_a && isLatestForA) || (dbP.team === matchData.team_b && isLatestForB)
    if (shouldUpdateFlag) {
      await supabase.from('players').update({ played_last_match: isActive }).eq('id', dbP.id)
    }
    
    await supabase.from('player_scores').upsert({
      match_id: matchId, player_id: dbP.id, points: pts
    }, { onConflict: 'match_id,player_id' })
  }

  // 7. Calculate raw team scores and rankings (same as CricAPI pipeline)
  const { data: userTeams } = await supabase
    .from('user_teams')
    .select('id, user_id, captain_id, vice_captain_id, user_team_players(player_id)')
    .eq('match_id', matchId)
  if (!userTeams || userTeams.length === 0) return { success: false, error: 'No user teams found for this match' }

  const userRankings: { userId: string, rawScore: number }[] = []
  for (const ut of userTeams) {
    let rawScore = 0
    const selectedIds = ut.user_team_players.map((utp: any) => utp.player_id)
    for (const pid of selectedIds) {
      let pt = playerBasePoints[pid] || 0
      if (pid === ut.captain_id) pt *= 2
      else if (pid === ut.vice_captain_id) pt *= 1.5
      rawScore += pt
    }
    rawScore = Math.round(rawScore * 10) / 10
    userRankings.push({ userId: ut.user_id, rawScore })
  }

  // 8. Relative rank tie-breaker
  userRankings.sort((a, b) => b.rawScore - a.rawScore)
  const N = userRankings.length
  if (N > 0) {
    let currentRank = 1
    while (currentRank <= N) {
      let tieCount = 1
      const score = userRankings[currentRank - 1].rawScore
      while (currentRank - 1 + tieCount < N && userRankings[currentRank - 1 + tieCount].rawScore === score) tieCount++

      let total = 0
      for (let i = 0; i < tieCount; i++) total += N - (currentRank - 1 + i)
      const avg = total / tieCount

      for (let i = 0; i < tieCount; i++) {
        const u = userRankings[currentRank - 1 + i]

        // Fetch old points to enforce idempotency on re-scores
        const { data: oldRank } = await supabase.from('user_match_ranks')
          .select('relative_points').eq('user_id', u.userId).eq('match_id', matchId).single()
        const oldPoints = oldRank?.relative_points || 0
        const pointDiff = avg - oldPoints

        await supabase.from('user_match_ranks').upsert({
          user_id: u.userId, match_id: matchId,
          raw_score: u.rawScore, relative_rank: currentRank, relative_points: avg
        }, { onConflict: 'user_id,match_id' })
        
        const { data: prof } = await supabase.from('profiles').select('total_points').eq('id', u.userId).single()
        await supabase.from('profiles').update({ total_points: (prof?.total_points || 0) + pointDiff }).eq('id', u.userId)
      }
      currentRank += tieCount
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { success: true }
}
