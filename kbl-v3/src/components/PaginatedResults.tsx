'use client'
import { useState } from 'react'
import Link from 'next/link'
import { TeamLogo } from '@/components/TeamLogo'

type Match = { id: string; match_date: string; team_a: string; team_b: string; }

const PAGE_SIZE = 5

export function PaginatedResults({ matches }: { matches: Match[] }) {
  const [page, setPage] = useState(0)

  if (!matches || matches.length === 0) {
    return <p style={{ color: 'var(--border)' }}>No completed matches yet.</p>
  }

  const totalPages = Math.ceil(matches.length / PAGE_SIZE)
  const slice = matches.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {slice.map((match) => (
          <div
            key={match.id}
            style={{
              padding: '1rem',
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <TeamLogo teamName={match.team_a} size={24} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94A3B8' }}>vs</span>
                <TeamLogo teamName={match.team_b} size={24} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--border)', margin: 0 }}>
                {new Date(match.match_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <Link href={`/match/${match.id}`} style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              View Points →
            </Link>
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: page === 0 ? 'var(--border)' : 'var(--foreground)',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >← Prev</button>

          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            {page + 1} / {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: page === totalPages - 1 ? 'var(--border)' : 'var(--foreground)',
              cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >Next →</button>
        </div>
      )}
    </div>
  )
}
