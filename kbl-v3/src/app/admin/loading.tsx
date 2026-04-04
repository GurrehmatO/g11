export default function AdminLoading() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ width: '250px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem' }} />

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ width: '180px', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1.5rem' }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: '200px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
            <div style={{ width: '100px', height: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
          </div>
        ))}
      </div>

      {[1, 2].map(i => (
        <div key={i} className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ width: '150px', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '0.5rem' }} />
          <div style={{ width: '300px', height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '1.5rem' }} />
          <div style={{ width: '200px', height: '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
        </div>
      ))}
    </div>
  )
}
