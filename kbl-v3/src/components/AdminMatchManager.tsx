'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { changeMatchStatus } from '@/app/admin/actions'
import { TeamLogo } from '@/components/TeamLogo'

type Match = {
  id: string
  name: string
  match_date: string
  team_a: string
  team_b: string
  status: string
  api_match_id: string | null
}

const STATUS_COLORS: Record<string, string> = {
  live: '#EF4444',
  upcoming: 'var(--primary)',
  completed: '#94A3B8'
}

const STATUS_OPTIONS: Record<string, string[]> = {
  upcoming: ['live', 'completed'],
  live: ['completed', 'upcoming'],
  completed: ['live', 'upcoming']
}

function MatchRow({ match, onDone }: { match: Match; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState<string | null>(null)

  const handleRequest = (newStatus: string) => {
    setConfirming(newStatus)
  }

  const handleConfirm = () => {
    if (!confirming) return
    startTransition(async () => {
      await changeMatchStatus(match.id, match.api_match_id, confirming)
      setConfirming(null)
      onDone()
    })
  }

  return (
    <div style={{ padding: '1rem 1.25rem', background: 'var(--card)', borderRadius: 'var(--radius)', border: `1px solid ${STATUS_COLORS[match.status] ?? 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', opacity: pending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {/* Team logos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 160 }}>
        <TeamLogo teamName={match.team_a} size={28} />
        <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>vs</span>
        <TeamLogo teamName={match.team_b} size={28} />
      </div>

      {/* Match name + date */}
      <div style={{ flex: 2, minWidth: 180 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}>{match.name}</div>
        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
          {new Date(match.match_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} IST
        </div>
      </div>

      {/* Status badge */}
      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: STATUS_COLORS[match.status], border: `1px solid ${STATUS_COLORS[match.status]}`, padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
        {match.status}
      </span>

      {/* Change status buttons */}
      {!confirming ? (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {STATUS_OPTIONS[match.status]?.map(s => (
            <button
              key={s}
              onClick={() => handleRequest(s)}
              disabled={pending}
              style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', background: 'var(--card)', border: `1px solid ${STATUS_COLORS[s]}`, color: STATUS_COLORS[s], cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              → {s}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#F59E0B' }}>
            {confirming === 'completed' ? '⚠ Will score & lock. Confirm?' : `Set to ${confirming}?`}
          </span>
          <button onClick={handleConfirm} disabled={pending} style={{ fontSize: '0.72rem', padding: '4px 12px', borderRadius: '6px', background: confirming === 'completed' ? '#22C55E' : STATUS_COLORS[confirming], color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            {pending ? '...' : 'Yes'}
          </button>
          <button onClick={() => setConfirming(null)} disabled={pending} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', background: 'transparent', border: '1px solid #64748B', color: '#94A3B8', cursor: 'pointer' }}>
            No
          </button>
        </div>
      )}
    </div>
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
        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>No matches in DB. Use &quot;Sync Matches&quot; above.</p>
      )}
    </div>
  )
}
