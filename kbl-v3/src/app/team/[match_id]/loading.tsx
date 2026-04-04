export default function TeamLoading() {
  return (
    <div style={{ margin: 0, padding: '2rem', minHeight: '100vh', background: '#000' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ width: '180px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '2rem' }} />
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ width: '200px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', marginBottom: '0.75rem' }} />
                <div style={{ width: '80%', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                <div style={{ width: '50%', height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
