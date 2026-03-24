'use client'
import { useState } from 'react'
import { RulesModal } from '@/components/RulesModal'

export default function Home() {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', textAlign: 'center', animation: 'fadeIn 0.8s ease-out' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        display: 'inline-block',
        padding: '0.5rem 1rem',
        borderRadius: '2rem',
        background: 'rgba(59, 130, 246, 0.1)',
        color: 'var(--primary)',
        fontWeight: 600,
        marginBottom: '1.5rem',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        🏏 IPL 2026 Season is Live
      </div>
      <h1 style={{ fontSize: '4.5rem', fontWeight: 900, marginBottom: '1.5rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        Bahot hua D11 <br />
        <span className="heading-gradient">Abki Baar G11</span>
      </h1>
      <p style={{ fontSize: '1.25rem', opacity: 0.8, maxWidth: '600px', marginBottom: '2.5rem', lineHeight: 1.6 }}>
        Draft your dream squad of 11. Compete against your friends with our custom automated ranking algorithm. Climb the global leaderboard.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <a href="/login" className="btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1.125rem' }}>
          Draft Your Team
        </a>
        <button onClick={() => setIsRulesOpen(true)} className="glass-panel" style={{ border: 'none', padding: '0.875rem 2rem', fontSize: '1.125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)', transition: 'background-color 0.2s', cursor: 'pointer' }}>
          Read the Rules
        </button>
      </div>

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
