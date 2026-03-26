import { syncMatches, syncPlayers, calculateScores, syncLiveScores, calculateScoresFromAPI } from './actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SubmitButton } from '@/components/SubmitButton'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { count: matchCount } = await supabase.from('matches').select('*', { count: 'exact', head: true })
  const { count: playerCount } = await supabase.from('players').select('*', { count: 'exact', head: true })

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <h1 className="heading-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Platform Admin</h1>
      
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>1. Match Synchronization</h3>
        <p style={{ color: 'var(--border)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Fetch the latest IPL fixtures from CricAPI and update the database.
          <br/>
          <strong>Current Matches in DB:</strong> {matchCount || 0}
        </p>
        <form action={syncMatches}>
          <SubmitButton type="submit" className="btn-primary" pendingText="Syncing...">
            Sync Matches from CricAPI
          </SubmitButton>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>2. Player Synchronization</h3>
        <p style={{ color: 'var(--border)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Fetch all IPL squads from CricAPI to allow users to build their teams. Random fantasy credits will be assigned.
          <br/>
          <strong>Current Players in DB:</strong> {playerCount || 0}
        </p>
        <form action={syncPlayers}>
          <SubmitButton type="submit" className="btn-primary" pendingText="Syncing...">
            Sync Players from CricAPI
          </SubmitButton>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid #3B82F6' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#3B82F6' }}>3. Live Engine: Sync Interim Match Scores</h3>
        <p style={{ color: 'var(--border)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Input an upcoming Match ID from the database. The engine will artificially set its state to <strong>LIVE</strong>, evaluate base player points, and push them to the Live Match View <strong>WITHOUT</strong> locking rankings or distributing Global Leaderboard points.
        </p>
        <form action={syncLiveScores} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            name="matchId" 
            placeholder="Paste Match UUID here..." 
            required 
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#fff', fontSize: '1rem' }} 
          />
          <SubmitButton type="submit" className="btn-primary" style={{ background: '#3B82F6', color: '#fff', padding: '0 1.5rem' }} pendingText="Syncing Live...">
            Sync Live Scores
          </SubmitButton>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#f59e0b' }}>4. Advanced Engine: Trigger Match Completion</h3>
        <p style={{ color: 'var(--border)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Input an upcoming or live Match ID. The engine will end the match, evaluate ALL user teams, apply <strong>Dream11 Math</strong>, distribute <strong>Relative Ranks</strong>, and permanently add points to Profiles.
        </p>
        <form action={calculateScores} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            name="matchId" 
            placeholder="Paste Match UUID here..." 
            required 
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#fff', fontSize: '1rem' }} 
          />
          <SubmitButton type="submit" className="btn-primary" style={{ background: '#f59e0b', color: '#000', padding: '0 1.5rem' }} pendingText="Simulating Match...">
            Run Final Engine
          </SubmitButton>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid #22C55E' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#22C55E' }}>5. Real Data Engine: Score from CricAPI Scorecard</h3>
        <p style={{ color: 'var(--border)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Fetches a real scorecard from CricAPI, maps player stats to Dream11 points (runs, wickets, SR, economy, catches), then finalises rankings. Requires the <strong>DB Match UUID</strong> and the <strong>CricAPI Match ID</strong>.
        </p>
        <form action={calculateScoresFromAPI} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input type="text" name="matchId" placeholder="DB Match UUID" required
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#fff', fontSize: '0.9rem' }} />
          <input type="text" name="apiMatchId" placeholder="CricAPI Match ID (e.g. b39bbd39-c67f-...)" required
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#fff', fontSize: '0.9rem' }} />
          <SubmitButton type="submit" className="btn-primary" style={{ background: '#22C55E', color: '#000', padding: '0.75rem 1.5rem', fontWeight: 700 }} pendingText="Fetching Scorecard...">
            Score from Real Data
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}
