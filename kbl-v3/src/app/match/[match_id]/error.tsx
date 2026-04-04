'use client'

export default function MatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ef4444' }}>Something went wrong</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>{error.message || 'Failed to load match'}</p>
        <button onClick={reset} className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
          Try again
        </button>
      </div>
    </div>
  )
}
