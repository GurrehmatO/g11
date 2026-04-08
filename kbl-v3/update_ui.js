const fs = require('fs');
let c = fs.readFileSync('src/app/match/[match_id]/page.tsx', 'utf8');

// Replace concurrent fetch with sequenced fetch
c = c.replace(
/const \[{ data: match }, { data: userTeams }, { data: scores }\] = await Promise\.all\(\[\s+supabase\.from\('matches'\)\.select\('\*'\)\.eq\('id', params\.match_id\)\.single\(\),\s+supabase\s+\.from\('user_teams'\)\s+\.select\('user_id, captain_id, vice_captain_id, user_team_players\(players\(id, name, role, team, cricbuzz_name\)\), user_substitutes\(players\(id, name, role, team, cricbuzz_name\), priority\)'\)\s+\.eq\('match_id', params\.match_id\),\s+supabase\s+\.from\('player_scores'\)\s+\.select\('player_id, points'\)\s+\.eq\('match_id', params\.match_id\),\s+\]\)\s+if \(!match\) return <div>Match not found<\/div>\s+const isCompleted = match\.status === 'completed'\s+const isLive = match\.status === 'live'/g,
`const { data: match } = await supabase.from('matches').select('*').eq('id', params.match_id).single()

  if (!match) return <div>Match not found</div>

  const isCompleted = match.status === 'completed'
  const isLive = match.status === 'live'

  const [{ data: userTeams }, { data: scores }] = await Promise.all([
    supabase
      .from('user_teams')
      .select('user_id, captain_id, vice_captain_id, user_team_players(players(id, name, role, team, cricbuzz_name)), user_substitutes(players(id, name, role, team, cricbuzz_name), priority)')
      .eq('match_id', params.match_id),
    supabase
      .from(isLive ? 'live_player_scores' : 'player_scores')
      .select('player_id, points')
      .eq('match_id', params.match_id),
  ])`
);

// Ranks
c = c.replace(
/const { data: ranks } = isCompleted\s+\? await supabase\s+\.from\('user_match_ranks'\)\s+\.select\('relative_rank, raw_score, relative_points, profiles\(display_name, email, id\)'\)\s+\.eq\('match_id', params\.match_id\)\s+\.order\('relative_rank', \{ ascending: true \}\)\s+: \{ data: null \}/g,
`const { data: ranks } = (isCompleted || isLive)
    ? await supabase
        .from(isLive ? 'live_user_match_ranks' : 'user_match_ranks')
        .select(\`relative_rank, raw_score, \${isCompleted ? 'relative_points,' : ''} profiles(display_name, email, id)\`)
        .eq('match_id', params.match_id)
        .order('relative_rank', { ascending: true })
    : { data: null }`
);

// Remove activePlayers calculation entirely since we aren't using them for live (fallback to completed logic)
c = c.replace(
/const { data: activePlayers } = isCompleted\s+\? await supabase\s+\.from\('players'\)\s+\.select\('name, cricbuzz_name'\)\s+\.in\('team', \[match\.team_a, match\.team_b\]\)\s+\.eq\('played_last_match', true\)\s+: \{ data: null \}/g,
`const { data: activePlayers } = isCompleted
    ? await supabase
        .from('players')
        .select('name, cricbuzz_name')
        .in('team', [match.team_a, match.team_b])
        .eq('played_last_match', true)
    : { data: null }`
);

c = c.replace(/\{\(isCompleted \|\| isLive\) && hasRanks && \(/g, '{isCompleted && hasRanks && ('); // temp undo if previously changed
c = c.replace(/\{isCompleted && hasRanks && \(/g, '{(isCompleted || isLive) && hasRanks && (');

c = c.replace(
/<div className="match-lb-header"[\s\S]*?<div style={{ width: '120px', textAlign: 'right' }}>Match Points<\/div>[\s\S]*?<\/div>/,
`<div className="match-lb-header" style={{ display: 'flex', padding: '1rem', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
              <div style={{ width: '60px', textAlign: 'center' }}>Rank</div>
              <div style={{ flex: 1 }}>Player</div>
              <div style={{ width: '100px', textAlign: 'right' }}>Raw Score</div>
              {isCompleted && <div style={{ width: '120px', textAlign: 'right' }}>Match Points</div>}
            </div>`
);

c = c.replace(
/<div className="match-lb-pts"[\s\S]*?\+\{r\.relative_points\}[\s\S]*?<\/div>/g,
`{isCompleted && (
                      <div className="match-lb-pts" style={{ width: '120px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: '#22c55e', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="mobile-only-label" style={{ fontSize: '0.65rem', textTransform: 'uppercase', display: 'none', color: '#94A3B8' }}>Match Points</span>
                        +{r.relative_points}
                      </div>
                    )}`
);

fs.writeFileSync('src/app/match/[match_id]/page.tsx', c);
console.log('done');
