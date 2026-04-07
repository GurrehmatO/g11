'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { changeMatchStatus, checkTeamsNeedingSubstitution, finalizeScoringWithSubstitutions } from '@/app/admin/actions'
import { TeamLogo } from '@/components/TeamLogo'
import { SubstitutionModal } from '@/components/SubstitutionModal'

type Match = {
  id: string
  name: string
  match_date: string
  team_a: string
  team_b: string
  status: string
  abandoned?: boolean
  cricbuzz_match_id?: string
}

const STATUS_COLORS: Record<string, string> = {
  live: '#EF4444',
  upcoming: 'var(--primary)',
  completed: '#94A3B8',
  abandoned: '#F59E0B'
}

const STATUS_OPTIONS: Record<string, string[]> = {
  upcoming: ['live', 'completed'],
  live: ['completed', 'upcoming'],
  completed: ['live', 'upcoming']
}

type TeamNeedingSub = {
  userId: string
  userName: string
  starters: Array<{ id: string; name: string; role: string; team: string; isPlaying: boolean }>
  substitutes: Array<{ id: string; name: string; role: string; team: string; priority: number; isPlaying: boolean }>
  captainId: string
  viceCaptainId: string
}

function MatchRow({ match, onDone }: { match: Match; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [cricbuzzUrl, setCricbuzzUrl] = useState('')
  const [abandoned, setAbandoned] = useState(false)

  const [showSubModal, setShowSubModal] = useState(false)
  const [teamsNeedingSub, setTeamsNeedingSub] = useState<TeamNeedingSub[]>([])
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0)
  const [substitutions, setSubstitutions] = useState<Record<string, Record<string, string>>>({})
  const [scoringInProgress, setScoringInProgress] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequest = (newStatus: string) => {
    setConfirming(newStatus)
    setAbandoned(false)
  }

  const handleConfirm = async () => {
    if (!confirming) return

    if (confirming === 'completed' && !abandoned) {
      startTransition(async () => {
        try {
          await changeMatchStatus(match.id, 'completed', cricbuzzUrl, false)

          const result = await checkTeamsNeedingSubstitution(match.id)
          
          if (result.needs_substitution && result.teams && result.teams.length > 0) {
            setTeamsNeedingSub(result.teams)
            setCurrentTeamIndex(0)
            setSubstitutions({})
            setShowSubModal(true)
            setConfirming(null)
            setCricbuzzUrl('')
            setAbandoned(false)
          } else {
            let finalUrl = cricbuzzUrl
            if (!finalUrl && match.cricbuzz_match_id) {
              finalUrl = `https://www.cricbuzz.com/live-cricket-scorecard/${match.cricbuzz_match_id}`
            }
            if (finalUrl) {
              setScoringInProgress(true)
              await finalizeScoringWithSubstitutions(match.id, finalUrl, {})
              setScoringInProgress(false)
            }
            setConfirming(null)
            setCricbuzzUrl('')
            setAbandoned(false)
            onDone()
          }
        } catch (err) {
          console.error('Error in scoring flow:', err)
          setError(err instanceof Error ? err.message : 'An error occurred')
          setConfirming(null)
        }
      })
    } else {
      startTransition(async () => {
        await changeMatchStatus(match.id, confirming, cricbuzzUrl, confirming === 'completed' ? abandoned : false)
        setConfirming(null)
        setCricbuzzUrl('')
        setAbandoned(false)
        onDone()
      })
    }
  }

  const handleSubSave = (userId: string, newSubs: Record<string, string>) => {
    const updatedSubs = {
      ...substitutions,
      [userId]: newSubs
    }

    if (currentTeamIndex < teamsNeedingSub.length - 1) {
      setSubstitutions(updatedSubs)
      setCurrentTeamIndex(currentTeamIndex + 1)
    } else {
      setShowSubModal(false)
      runScoring(updatedSubs)
    }
  }

  const handleSubSkip = (userId: string) => {
    const updatedSubs = {
      ...substitutions,
      [userId]: {}
    }

    if (currentTeamIndex < teamsNeedingSub.length - 1) {
      setSubstitutions(updatedSubs)
      setCurrentTeamIndex(currentTeamIndex + 1)
    } else {
      setShowSubModal(false)
      runScoring(updatedSubs)
    }
  }

  const runScoring = async (subs?: Record<string, Record<string, string>>) => {
    setScoringInProgress(true)
    setError(null)

    let finalUrl = cricbuzzUrl
    if (!finalUrl && match.cricbuzz_match_id) {
      finalUrl = `https://www.cricbuzz.com/live-cricket-scorecard/${match.cricbuzz_match_id}`
    }

    if (finalUrl) {
      const result = await finalizeScoringWithSubstitutions(match.id, finalUrl, subs || substitutions)
      if (!result.success) {
        setError(result.error || 'Scoring failed')
      }
    }

    setScoringInProgress(false)
    onDone()
  }

  const isShowingSubModal = showSubModal && teamsNeedingSub.length > 0
  const currentTeam = isShowingSubModal ? teamsNeedingSub[currentTeamIndex] : null

  return (
    <>
      <div style={{ padding: '1rem 1.25rem', background: 'var(--card)', borderRadius: 'var(--radius)', border: `1px solid ${STATUS_COLORS[match.status] ?? 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', opacity: pending || scoringInProgress ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 160 }}>
          <TeamLogo teamName={match.team_a} size={28} />
          <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>vs</span>
          <TeamLogo teamName={match.team_b} size={28} />
        </div>

        <div style={{ flex: 2, minWidth: 180 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}>{match.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 2 }}>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              {new Date(match.match_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} IST
            </div>
            {match.cricbuzz_match_id && (
              <div style={{ fontSize: '0.65rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                CB ID: {match.cricbuzz_match_id}
              </div>
            )}
          </div>
        </div>

        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: match.status === 'completed' && match.abandoned ? STATUS_COLORS.abandoned : STATUS_COLORS[match.status], border: `1px solid ${match.status === 'completed' && match.abandoned ? STATUS_COLORS.abandoned : STATUS_COLORS[match.status]}`, padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
          {match.status === 'completed' && match.abandoned ? 'abandoned' : match.status}
        </span>

        {!confirming || scoringInProgress ? (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {STATUS_OPTIONS[match.status]?.map(s => (
              <button
                key={s}
                onClick={() => handleRequest(s)}
                disabled={pending || scoringInProgress}
                style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', background: 'var(--card)', border: `1px solid ${STATUS_COLORS[s]}`, color: STATUS_COLORS[s], cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                → {s}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%', marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,158,11,0.2)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#F59E0B', fontWeight: 600 }}>
                {confirming === 'completed' ? '⚠ Warning: This will score and lock the match. Are you sure?' : `Set to ${confirming}?`}
              </span>
              
              {confirming === 'completed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
                    {match.cricbuzz_match_id ? 'Automated Scoring Active (ID Found)' : 'Optional: Cricbuzz Scorecard URL (Manual Override)'}
                  </label>
                  <input 
                    type="text" 
                    value={cricbuzzUrl} 
                    onChange={(e) => setCricbuzzUrl(e.target.value)}
                    placeholder={match.cricbuzz_match_id ? `Using saved ID: ${match.cricbuzz_match_id}` : "https://www.cricbuzz.com/..."}
                    style={{ width: '100%', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '4px', padding: '6px 10px', fontSize: '0.75rem', color: '#fff' }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#94A3B8', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={abandoned}
                      onChange={(e) => setAbandoned(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#F59E0B' }}
                    />
                    Abandoned? (Everyone gets 1 point, no player scoring)
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleConfirm} disabled={pending} style={{ fontSize: '0.72rem', padding: '6px 16px', borderRadius: '6px', background: confirming === 'completed' ? '#22C55E' : STATUS_COLORS[confirming], color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  {pending ? 'Processing...' : 'Yes, Confirm'}
                </button>
                <button onClick={() => { setConfirming(null); setCricbuzzUrl(''); setAbandoned(false); }} disabled={pending} style={{ fontSize: '0.72rem', padding: '6px 12px', borderRadius: '6px', background: 'transparent', border: '1px solid #64748B', color: '#94A3B8', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <span style={{ fontSize: '0.78rem', color: '#EF4444', fontWeight: 600 }}>Error: {error}</span>
          </div>
        )}
      </div>

      {isShowingSubModal && currentTeam && (
        <SubstitutionModal
          team={currentTeam}
          teamA={match.team_a}
          onSave={handleSubSave}
          onSkip={handleSubSkip}
          isLast={currentTeamIndex === teamsNeedingSub.length - 1}
          currentIndex={currentTeamIndex}
          totalTeams={teamsNeedingSub.length}
        />
      )}
    </>
  )
}

function Section({ title, color, matches, onDone }: { title: string; color: string; matches: Match[]; onDone: () => void }) {
  if (matches.length === 0) return null
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {matches.map(m => <MatchRow key={m.id} match={m} onDone={onDone} />)}
      </div>
    </div>
  )
}

export function AdminMatchManager({ liveMatches, upcomingMatches, completedMatches }: { liveMatches: Match[]; upcomingMatches: Match[]; completedMatches: Match[] }) {
  const router = useRouter()

  const refresh = () => {
    router.refresh()
  }

  return (
    <div>
      <Section title="Live Matches" color="#EF4444" matches={liveMatches} onDone={refresh} />
      <Section title="Upcoming Matches" color="var(--primary)" matches={upcomingMatches} onDone={refresh} />
      <Section title="Completed Matches" color="#94A3B8" matches={completedMatches} onDone={refresh} />
      {liveMatches.length + upcomingMatches.length + completedMatches.length === 0 && (
        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>No matches in DB. Use "Sync Matches" above.</p>
      )}
    </div>
  )
}
