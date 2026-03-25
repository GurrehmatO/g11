'use client'

import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import { PlayerAvatar } from '@/components/PlayerAvatar'

// Map api roles to our tabs
const getRoleTab = (role: string) => {
  if (role.toUpperCase().includes('WK')) return 'WK'
  if (role.toLowerCase().includes('allrounder')) return 'AR'
  if (role.toLowerCase().includes('bowler')) return 'BOWL'
  return 'BAT'
}

export default function PitchModal({ team, matchScores, userName, teamA }: any) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}
      >
        <Eye size={16} /> VIEW TEAM
      </button>
    )
  }

  const captainId = team.captain_id
  const viceCaptainId = team.vice_captain_id
  const players = team.players

  const renderPreviewRow = (title: string, playersList: any[]) => {
    if (playersList.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', zIndex: 2 }}>
        <div style={{ fontSize: '0.65rem', color: '#fff', opacity: 0.9, letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 600 }}>{title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', width: '100%', padding: '0 0.5rem' }}>
          {playersList.map(p => {
             const isC = p.id === captainId;
             const isVC = p.id === viceCaptainId;
             const basePoints = matchScores[p.id] || 0;
             const finalPts = isC ? basePoints * 2 : isVC ? basePoints * 1.5 : basePoints;

             return (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <PlayerAvatar playerName={p.name} size={48} />
                  {isC && <div style={{ position: 'absolute', top: -4, left: -4, background: '#1E293B', color: '#fff', border: '1px solid #fff', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>C</div>}
                  {isVC && <div style={{ position: 'absolute', top: -4, left: -4, background: '#3B82F6', color: '#fff', border: '1px solid #fff', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 'bold' }}>VC</div>}
                  
                  <div style={{ background: p.team === teamA ? 'var(--foreground)' : 'var(--card)', color: p.team === teamA ? 'var(--background)' : 'var(--foreground)', fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap', minWidth: '55px', textAlign: 'center', marginTop: '-8px', position: 'relative', zIndex: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    {p.name.split(' ').pop()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--foreground)', fontWeight: 'bold', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', marginTop: '4px', padding: '1px 0' }}>
                     {finalPts} pts
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s' }}>
      <div style={{ background: '#111827', width: '100%', maxWidth: '480px', height: '100%', maxHeight: '800px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 600 }}>{userName}'s Team</h2>
          </div>
          <X size={24} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }} />
        </div>

        {/* CSS Field */}
        <div style={{ 
          flex: 1, 
          background: '#34A853',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,0,0,0.06) 40px, rgba(0,0,0,0.06) 80px)',
          position: 'relative', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '1.5rem',
          paddingBottom: '2rem'
        }}>
          {/* 30 Yard Oval */}
          <div style={{ position: 'absolute', top: '15%', left: '5%', right: '5%', bottom: '15%', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '100px / 200px', zIndex: 1 }} />
          {/* Pitch Area */}
          <div style={{ position: 'absolute', top: '35%', left: '38%', right: '38%', height: '30%', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.15)', zIndex: 1 }} />
          
          <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-around' }}>
            {renderPreviewRow('WICKET-KEEPERS', players.filter((p: any) => getRoleTab(p.role) === 'WK'))}
            {renderPreviewRow('BATTERS', players.filter((p: any) => getRoleTab(p.role) === 'BAT'))}
            {renderPreviewRow('ALL-ROUNDERS', players.filter((p: any) => getRoleTab(p.role) === 'AR'))}
            {renderPreviewRow('BOWLERS', players.filter((p: any) => getRoleTab(p.role) === 'BOWL'))}
          </div>
        </div>

      </div>
    </div>
  )
}
