'use client'
import { X } from 'lucide-react'

export function RulesModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} 
        onClick={onClose}
      />
      <div style={{ 
        position: 'relative', 
        background: '#1E293B', 
        width: '90%', 
        maxWidth: '500px', 
        maxHeight: '85vh', 
        overflowY: 'auto',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: '#fff',
        padding: '1.5rem',
        animation: 'slideUp 0.3s ease-out',
        textAlign: 'left'
      }}>
        <style>{`
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>League & Match Rules</h2>
          <X size={24} onClick={onClose} style={{ cursor: 'pointer', color: '#94A3B8' }} />
        </div>

        <div style={{ paddingBottom: '1rem' }}>
          <h3 style={{ color: '#38BDF8', fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 700 }}>🏆 1. G11 League Scoring System</h3>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#CBD5E1', marginBottom: '1rem' }}>
            Instead of simply adding up total points over the season, G11 uses a competitive <strong>Match-by-Match Ranking System</strong> to keep the leaderboard balanced:
          </p>
          <ul style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#CBD5E1', paddingLeft: '1.5rem', marginBottom: '2rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>For every match, participants are ranked based on their team's points.</li>
            <li style={{ marginBottom: '0.5rem' }}>If <strong>N</strong> people draft a team, the <strong>1st Place</strong> user gets <strong>N</strong> leaderboard points.</li>
            <li style={{ marginBottom: '0.5rem' }}>The <strong>2nd Place</strong> user gets <strong>N-1</strong> points, scaling down to 1 point for the last place.</li>
            <li><strong>Tie-Breakers:</strong> If two users tie for 1st place in a match with 5 total players, they split the 1st (5) and 2nd (4) place points, earning <strong>4.5 points</strong> each.</li>
          </ul>

          <h3 style={{ color: '#22C55E', fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 700 }}>🏏 2. Match Point System (T20)</h3>

          <h4 style={{ fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Substitutes (Optional)</h4>
          <ul style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#CBD5E1', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>You can select up to 4 extra players as substitutes in priority order.</li>
            <li style={{ marginBottom: '0.5rem' }}>If any of your first 11 players do not play, substitutes automatically replace them, respecting team composition rules.</li>
            <li>The 1st sub takes the first non-playing spot, 2nd sub takes the second, etc.</li>
            <li>Only substitutes who are playing will be used; inactive substitutes are skipped.</li>
            <li>If no valid substitution is possible, as many valid subs as possible are used.</li>
          </ul>

          <h4 style={{ fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Batting</h4>
          <ul style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#CBD5E1', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li>Run: +1</li>
            <li>Boundary Bonus: 4s (+1) | 6s (+2)</li>
            <li>Milestone Bonus: Half-Century (+8) | Century (+16)</li>
            <li>Dismissal for a Duck: -2 (Batsmen, WK, AR only)</li>
            <li>Strike Rate (&gt;10 runs): &gt;170 (+6) | &gt;150 (+4) | &gt;130 (+2) | &lt;50 (-6)</li>
          </ul>

          <h4 style={{ fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Bowling</h4>
          <ul style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#CBD5E1', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li>Wicket: +25 (Excludes Run Outs)</li>
            <li>Milestone Bonus: 4 Wickets (+8) | 5 Wickets (+16)</li>
            <li>Economy Rate: &lt;5 (+6) | &lt;6 (+4) | &gt;10 (-2) | &gt;11 (-4) | &gt;12 (-6)</li>
          </ul>

          <h4 style={{ fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Fielding & Captaincy</h4>
          <ul style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#CBD5E1', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li>Catch / Stumping / Run Out: +8</li>
            <li>In Starting 11: +4</li>
            <li><strong>Captain:</strong> 2x Points</li>
            <li><strong>Vice-Captain:</strong> 1.5x Points</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
