export default function UserProfileLoading() {
  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ width: '180px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '2rem' }} />
      
      <div className="profile-header stagger-1">
        <div style={{ width: '200px', height: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '12px' }} />
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ width: '120px', height: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
          <div style={{ width: '120px', height: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
        </div>
      </div>

      <div className="glass-panel stagger-2" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: '100px', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1.5rem' }} />
        <div style={{ width: '100%', height: '250px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }} />
      </div>

      <div className="glass-panel stagger-3" style={{ padding: '1.75rem' }}>
        <div style={{ width: '120px', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1rem' }} />
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ flex: 1, height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
            <div style={{ width: '60px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: '1rem' }} />
            <div style={{ width: '40px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: '1rem' }} />
            <div style={{ width: '40px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: '1rem' }} />
            <div style={{ width: '40px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: '1rem' }} />
            <div style={{ width: '40px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: '1rem' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
