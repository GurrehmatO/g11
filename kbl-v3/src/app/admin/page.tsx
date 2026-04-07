import { syncMatches, syncPlayers } from './actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SubmitButton } from '@/components/SubmitButton'
import { AdminMatchManager } from '@/components/AdminMatchManager'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [
    { count: matchCount },
    { count: playerCount },
    { data: liveMatches },
    { data: upcomingMatches },
    { data: completedMatches },
  ] = await Promise.all([
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('id, name, match_date, team_a, team_b, status, abandoned, cricbuzz_match_id').eq('status', 'live').order('match_date', { ascending: true }),
    supabase.from('matches').select('id, name, match_date, team_a, team_b, status, abandoned, cricbuzz_match_id').eq('status', 'upcoming').order('match_date', { ascending: true }),
    supabase.from('matches').select('id, name, match_date, team_a, team_b, status, abandoned, cricbuzz_match_id').eq('status', 'completed').order('match_date', { ascending: false }),
  ])

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <h1 className="heading-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Platform Admin</h1>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Match State Manager</h3>
        <AdminMatchManager
          liveMatches={liveMatches || []}
          upcomingMatches={upcomingMatches || []}
          completedMatches={completedMatches || []}
        />
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>1. Match Synchronization</h3>
        <p style={{ color: 'var(--border)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Fetch latest IPL fixtures from CricAPI and update the database.<br />
          <strong>Matches in DB:</strong> {matchCount || 0}
        </p>
        <form action={syncMatches}>
          <SubmitButton type="submit" className="btn-primary" pendingText="Syncing...">
            Sync Matches from CricAPI
          </SubmitButton>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>2. Player Synchronization</h3>
        <p style={{ color: 'var(--border)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Fetch all IPL squads from CricAPI to populate the player pool.<br />
          <strong>Players in DB:</strong> {playerCount || 0}
        </p>
        <form action={syncPlayers}>
          <SubmitButton type="submit" className="btn-primary" pendingText="Syncing...">
            Sync Players from CricAPI
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}
