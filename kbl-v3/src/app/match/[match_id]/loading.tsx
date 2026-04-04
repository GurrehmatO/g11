export default function MatchLoading() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ width: '180px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '2rem' }} />

      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: '80px', height: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', margin: '0 auto 0.5rem' }} />
        <div style={{ width: '300px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', margin: '0 auto 0.5rem' }} />
        <div style={{ width: '150px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', margin: '0 auto' }} />
      </div>

      <div style={{ width: '150px', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1.5rem' }} />
      
      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', padding: '1rem', background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ width: '60px', height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
          <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: '1rem' }} />
          <div style={{ width: '100px', height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: '1rem' }} />
          <div style={{ width: '120px', height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: '1rem' }} />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: 'flex', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
            <div style={{ width: '60px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
            <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', marginLeft: '1rem' }} />
            <div style={{ width: '120px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: '1rem' }} />
            <div style={{ width: '100px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: 'auto' }} />
            <div style={{ width: '120px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginLeft: '1rem' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
