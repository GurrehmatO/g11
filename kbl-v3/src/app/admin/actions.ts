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

export async function changeMatchStatus(matchId: string, newStatus: string, cricbuzzUrl?: string, abandoned = false): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('matches').update({ status: newStatus, abandoned: newStatus === 'completed' ? abandoned : false }).eq('id', matchId)

  if (newStatus === 'completed') {
    try {
      if (abandoned) {
        await handleAbandonedMatch(matchId)
      } else {
        let finalUrl = cricbuzzUrl

        if (!finalUrl) {
          const { data: m } = await supabase.from('matches').select('cricbuzz_match_id').eq('id', matchId).single()
          if (m?.cricbuzz_match_id) {
            finalUrl = `https://www.cricbuzz.com/live-cricket-scorecard/${m.cricbuzz_match_id}`
          }
        }

        if (finalUrl) {
          await calculateScoresFromCricbuzz(matchId, finalUrl)
        }
      }
    } catch (err) {
      console.error('Scoring pipeline error (match still marked completed):', err)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

async function handleAbandonedMatch(matchId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: userTeams } = await supabase
    .from('user_teams')
    .select('user_id')
    .eq('match_id', matchId)

  if (!userTeams || userTeams.length === 0) return

  for (const ut of userTeams) {
    const { data: oldRank } = await supabase
      .from('user_match_ranks')
      .select('relative_points')
      .eq('user_id', ut.user_id)
      .eq('match_id', matchId)
      .single()

    const oldPoints = oldRank?.relative_points || 0
    const pointDiff = 1 - oldPoints

    await supabase.from('user_match_ranks').upsert({
      user_id: ut.user_id,
      match_id: matchId,
      raw_score: 0,
      relative_rank: 1,
      relative_points: 1,
    }, { onConflict: 'user_id,match_id' })

    const { data: prof } = await supabase
      .from('profiles')
      .select('total_points')
      .eq('id', ut.user_id)
      .single()

    await supabase
      .from('profiles')
      .update({ total_points: (prof?.total_points || 0) + pointDiff })
      .eq('id', ut.user_id)
  }

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, total_points')
    .order('total_points', { ascending: false })

  if (allProfiles) {
    for (let i = 0; i < allProfiles.length; i++) {
      await supabase
        .from('user_global_rank_history')
        .upsert({
          user_id: allProfiles[i].id,
          match_id: matchId,
          global_rank: i + 1,
        }, { onConflict: 'user_id,match_id' })
    }
  }
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

// ─── Helper: map role to tab (used in scoring) ─────────────────────────────
function getRoleTab(role: string) {
  if (role.toUpperCase().includes('WK')) return 'WK'
  if (role.toLowerCase().includes('allrounder')) return 'AR'
  if (role.toLowerCase().includes('bowler')) return 'BOWL'
  return 'BAT'
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

   // 7. Fetch user teams with substitutes
   const { data: userTeams } = await supabase
     .from('user_teams')
     .select(`
       id,
       user_id,
       captain_id,
       vice_captain_id,
       user_team_players ( player_id ),
       user_substitutes ( player_id, priority )
     `)
     .eq('match_id', matchId)
    if (!userTeams || userTeams.length === 0) return { success: false, error: 'No user teams found for this match' }

    // Helper: validate team composition (roles and team distribution)
   const validateTeamComposition = (playerIds: string[], dbPlayersMap: Map<string, any>, teamA: string, teamB: string): boolean => {
     let wk = 0, bat = 0, ar = 0, bowl = 0
     let countA = 0, countB = 0
     for (const pid of playerIds) {
       const p = dbPlayersMap.get(pid)
       if (!p) return false // missing player
       const roleTab = getRoleTab(p.role)
       if (roleTab === 'WK') wk++
       else if (roleTab === 'BAT') bat++
       else if (roleTab === 'AR') ar++
       else if (roleTab === 'BOWL') bowl++
       if (p.team === teamA) countA++
       else if (p.team === teamB) countB++
     }
     return wk >= 1 && bat >= 1 && ar >= 1 && bowl >= 1 && countA >= 1 && countB >= 1 && countA <= 10 && countB <= 10
   }

    // Helper: check if a player is active (playing)
    const isPlayerActive = (playerId: string, dbPlayersMap: Map<string, any>, activePlayers: Set<string>): boolean => {
      const p = dbPlayersMap.get(playerId)
      if (!p) return false
      const nameNorm = normName(p.name)
      const cricNameNorm = p.cricbuzz_name ? normName(p.cricbuzz_name) : null
      return activePlayers.has(nameNorm) || (cricNameNorm !== null && activePlayers.has(cricNameNorm))
    }

   // Build dbPlayersMap for quick lookup
   const dbPlayersMap = new Map<string, any>()
   for (const p of dbPlayers) {
     dbPlayersMap.set(p.id, p)
   }

   const userRankings: { userId: string, rawScore: number }[] = []

   for (const ut of userTeams) {
     const starters = ut.user_team_players.map((utp: any) => utp.player_id)
     const substitutes = (ut.user_substitutes || [])
       .sort((a: any, b: any) => a.priority - b.priority)
       .map((s: any) => s.player_id)

     // Determine which starters are not playing
     const nonPlayingIndices: number[] = []
     starters.forEach((pid, idx) => {
       if (!isPlayerActive(pid, dbPlayersMap, activePlayers)) {
         nonPlayingIndices.push(idx)
       }
     })

     // Start with original lineup
     let effectiveLineup = [...starters]
     let usedSubstitutes: string[] = []

     // Try to replace as many non-playing starters as possible, up to 4 subs, respecting priority and composition
     const maxReplacements = Math.min(4, nonPlayingIndices.length)
     let bestCount = -1
     let bestLineup: string[] = effectiveLineup
     let bestUsed: string[] = []

     // Brute-force: try all subsets of first k active subs that are playing
     // But we need to respect priority: if you skip a sub, you cannot use lower priority ones for earlier slots.
     // So we consider k from maxReplacements down to 0.
     outer: for (let k = maxReplacements; k >= 0; k--) {
       // We need to choose k substitutes from the ordered list such that all chosen substitutes are active and we use the earliest possible ones.
       // The simplest: take the first k substitutes that are active. But what if one of those k is not active? Then we take the next active ones, skipping inactive ones, but we must use exactly k subs. However, if we skip an inactive sub, that's fine; we just take the next active one. But the order of priority must be preserved: if sub #2 is inactive but sub #3 is active, we can use sub #3 as the second replacement (i.e., we can skip over inactive ones). The requirement says "first 2 will take their place" meaning you go down the priority list and assign replacements in order. So for k replacements needed, we take the first k active substitutes from the priority list. That's deterministic.
       const candidateSubs: string[] = []
       for (const subId of substitutes) {
         if (isPlayerActive(subId, dbPlayersMap, activePlayers)) {
           candidateSubs.push(subId)
           if (candidateSubs.length >= k) break
         }
       }
       if (candidateSubs.length < k) continue // not enough active subs for k replacements

       // Build candidate lineup: replace first k non-playing starters (in order of appearance) with these k subs (in order selected)
       const candidateLineup = [...starters]
       for (let i = 0; i < k; i++) {
         const idx = nonPlayingIndices[i]
         candidateLineup[idx] = candidateSubs[i]
       }

       // Validate composition
       if (!validateTeamComposition(candidateLineup, dbPlayersMap, matchData.team_a, matchData.team_b)) {
         continue
       }

       // Found a valid assignment for k replacements; since k is decreasing, this is the maximum possible
       bestLineup = candidateLineup
       bestUsed = candidateSubs.slice(0, k)
       break
     }

     // Calculate raw score using bestLineup
     let rawScore = 0
     for (const pid of bestLineup) {
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

  // 9. Compute global ranks for this match based on updated total_points
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, total_points')
    .order('total_points', { ascending: false })

  if (allProfiles) {
    for (let i = 0; i < allProfiles.length; i++) {
      await supabase
        .from('user_global_rank_history')
        .upsert({
          user_id: allProfiles[i].id,
          match_id: matchId,
          global_rank: i + 1,
        }, { onConflict: 'user_id,match_id' })
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { success: true }
}
