import { syncMatches, syncPlayers, calculateScores } from './actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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
          <button type="submit" className="btn-primary">
            Sync Matches from CricAPI
          </button>
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
          <button type="submit" className="btn-primary">
            Sync Players from CricAPI
          </button>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#f59e0b' }}>3. Advanced Engine: Trigger Match Score Calculation</h3>
        <p style={{ color: 'var(--border)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Input an upcoming Match ID from the database. The engine will artificially end the match, evaluate ALL user teams, apply <strong>Dream11 Math</strong>, distribute <strong>Relative Ranks (tied-average logic)</strong>, and add points to user Profiles! 
        </p>
        <form action={calculateScores} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            name="matchId" 
            placeholder="Paste Match UUID here..." 
            required 
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#fff', fontSize: '1rem' }} 
          />
          <button type="submit" className="btn-primary" style={{ background: '#f59e0b', color: '#000', padding: '0 1.5rem' }}>
            Run Engine
          </button>
        </form>
      </div>
    </div>
  )
}
