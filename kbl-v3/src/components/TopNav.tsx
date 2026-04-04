'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/auth/actions';

export function TopNav({ user }: { user: any }) {
  const pathname = usePathname();

  // Hide the global navigation bar on drafting screens to maximize viewport space
  if (pathname?.startsWith('/team/')) {
    return null;
  }

  return (
    <nav className="glass-panel main-nav" style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 50, 
      borderRight: 'none',
      borderLeft: 'none',
      borderTop: 'none',
      borderBottom: '1px solid var(--border)', 
      borderRadius: 0, 
      padding: '1rem 2rem', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link href={user ? '/dashboard' : '/'} style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-space-grotesk), sans-serif' }} className="heading-gradient">G11</Link>
      </div>
      <div className="nav-links" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link href="/dashboard" style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.95rem' }}>Dashboard</Link>
        
        {user ? (
          <div className="nav-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--border)' }}>{user.email}</span>
            <form action={logout}>
              <button type="submit" style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.5rem 0', background: 'transparent', border: 'none' }}>Logout</button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', marginLeft: '1rem' }}>Login</Link>
        )}
      </div>
    </nav>
  )
}
