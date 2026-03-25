import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";
import { logout } from "./auth/actions";
import { ThemeToggle } from "@/components/ThemeToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "G11 | IPL Fantasy League",
  description: "Unified, automated, and scalable fantasy league platform for the IPL. Experience premium team selection and relative ranking algorithms.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={inter.className}>
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
            <a href={user ? '/dashboard' : '/'} style={{ fontSize: '1.5rem', fontWeight: 800 }} className="heading-gradient">G11</a>
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="/dashboard" style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.95rem' }}>Dashboard</a>
            
            {user ? (
              <div className="nav-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--border)' }}>{user.email}</span>
                <form action={logout}>
                  <button type="submit" style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.5rem 0', background: 'transparent', border: 'none' }}>Logout</button>
                </form>
              </div>
            ) : (
              <a href="/login" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', marginLeft: '1rem' }}>Login</a>
            )}
          </div>
        </nav>
        <main style={{ minHeight: 'calc(100vh - 72px)' }}>
          {children}
        </main>
        <ThemeToggle />
      </body>
    </html>
  );
}
