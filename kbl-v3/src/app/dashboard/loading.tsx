export default function DashboardLoading() {
  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <header className="global-header stagger-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ width: '200px', height: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px' }} />
          <div style={{ width: '150px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="stagger-2">
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ width: '120px', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1rem' }} />
            {[1, 2, 3].map(i => (
              <div key={i} className="match-card" style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ width: '80px', height: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
                  <div style={{ width: '100px', height: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />
                  <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />
                </div>
                <div style={{ width: '100%', height: '36px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
              </div>
            ))}
          </div>
        </div>

        <div className="stagger-3">
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ width: '140px', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1rem' }} />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '40px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
                <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />
                <div style={{ width: '120px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
                <div style={{ width: '60px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
