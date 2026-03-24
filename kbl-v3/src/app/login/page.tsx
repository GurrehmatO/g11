import { login } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

export default async function LoginPage(props: {
  searchParams: Promise<{ message: string }>
}) {
  const searchParams = await props.searchParams;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
        <h2 className="heading-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome Back</h2>
        <p style={{ color: 'var(--border)', marginBottom: '2rem', fontSize: '0.9rem' }}>Sign in to draft your team.</p>

        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email Address</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'rgba(0,0,0,0.2)',
                color: 'var(--foreground)',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <SubmitButton formAction={login} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} pendingText="Sending Email...">
            Send Magic Link
          </SubmitButton>
          
          {searchParams?.message && (
            <p style={{ marginTop: '1rem', color: 'var(--accent)', fontSize: '0.875rem', background: 'rgba(139, 92, 246, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
              {searchParams.message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
