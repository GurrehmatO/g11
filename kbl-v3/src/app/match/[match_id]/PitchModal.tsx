'use client'

import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import { PlayerAvatar } from '@/components/PlayerAvatar'

const getRoleTab = (role: string) => {
  if (!role) return 'BAT'
  if (role.toUpperCase().includes('WK')) return 'WK'
  if (role.toLowerCase().includes('allrounder')) return 'AR'
  if (role.toLowerCase().includes('bowler')) return 'BOWL'
  return 'BAT'
}

export default function PitchModal({ team, matchScores, userName, teamA, activePlayers }: any) {
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
  const substitutes = team.substitutes || []
  const normName = (name: string) => name.toLowerCase().replace(/[^a-z ]/g, '').trim()

  const activeSet = new Set()
  if (activePlayers) {
    for (const p of activePlayers) {
      if (p.name) activeSet.add(normName(p.name))
      if (p.cricbuzz_name) activeSet.add(normName(p.cricbuzz_name))
    }
  }

  const isPlayerActive = (p: any) => activeSet.has(normName(p.name)) || (p.cricbuzz_name && activeSet.has(normName(p.cricbuzz_name)))

  const subIds = new Set(substitutes.map((s: any) => s.id))
  const usedSubs = substitutes.filter((s: any) => (matchScores[s.id] || 0) > 0)
  const benchedStarters = players.filter((p: any) => !isPlayerActive(p) && !subIds.has(p.id))

  const renderPreviewRow = (title: string, playersList: any[]) => {
    if (playersList.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', zIndex: 2 }}>
        <div style={{ fontSize: '0.65rem', color: '#fff', opacity: 0.9, letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 600 }}>{title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', width: '100%', padding: '0 0.5rem' }}>
          {playersList.map(p => {
             const isC = p.id === captainId;
             const isVC = p.id === viceCaptainId;
             const isSub = subIds.has(p.id);
             const wasBenched = !isPlayerActive(p) && !isSub;
             const basePoints = matchScores[p.id] || 0;
             const finalPts = isC ? basePoints * 2 : isVC ? basePoints * 1.5 : basePoints;

             const nameParts = p.name.trim().split(' ');
             const lastName = nameParts.length > 1 ? nameParts.pop() : '';
             const firstLines = nameParts.join(' ');

             return (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ position: 'relative', borderRadius: '50%', padding: '2px', border: wasBenched ? '2px solid #EF4444' : isSub ? '2px solid #FBBF24' : 'none' }}>
                    <PlayerAvatar playerName={p.name} teamName={p.team} size={48} />
                    {wasBenched && <div style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: '#fff', fontSize: '0.5rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>OUT</div>}
                    {isSub && <div style={{ position: 'absolute', top: -6, right: -6, background: '#FBBF24', color: '#000', fontSize: '0.5rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>SUB</div>}
                  </div>
                  {isC && <div style={{ position: 'absolute', top: -4, left: -4, background: '#1E293B', color: '#fff', border: '1px solid #fff', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>C</div>}
                  {isVC && <div style={{ position: 'absolute', top: -4, left: -4, background: '#3B82F6', color: '#fff', border: '1px solid #fff', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 'bold' }}>VC</div>}
                  
                  <div style={{ background: p.team === teamA ? 'var(--foreground)' : 'var(--card)', color: p.team === teamA ? 'var(--background)' : 'var(--foreground)', fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap', minWidth: '55px', textAlign: 'center', marginTop: '-8px', position: 'relative', zIndex: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.3)', lineHeight: '1.1', opacity: wasBenched ? 0.4 : 1 }}>
                    {firstLines && <div style={{ fontSize: '0.55rem', opacity: 0.9 }}>{firstLines}</div>}
                    <div style={wasBenched ? { textDecoration: 'line-through' } : {}}>{lastName || p.name}</div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--foreground)', fontWeight: 'bold', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', marginTop: '4px', padding: '1px 0', width: '100%', opacity: wasBenched ? 0.4 : 1 }}>
                     {wasBenched ? '0 pts' : `${finalPts} pts`}
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
            {(benchedStarters.length > 0 || usedSubs.length > 0) && (
              <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '0.25rem 0 0 0' }}>
                {benchedStarters.length > 0 && <span style={{ color: '#EF4444' }}>{benchedStarters.length} player{benchedStarters.length > 1 ? 's' : ''} benched</span>}
                {benchedStarters.length > 0 && usedSubs.length > 0 && <span> · </span>}
                {usedSubs.length > 0 && <span style={{ color: '#FBBF24' }}>{usedSubs.length} sub{usedSubs.length > 1 ? 's' : ''} used</span>}
              </p>
            )}
          </div>
          <X size={24} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }} />
        </div>

        {/* Substitutes summary */}
        {substitutes.length > 0 && (
          <div style={{ padding: '0 1.5rem 1rem 1.5rem', background: '#0F172A' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Substitutes ({substitutes.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {substitutes.map((p: any, idx: number) => {
                const wasUsed = (matchScores[p.id] || 0) > 0
                return (
                  <div key={p.id} style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    color: wasUsed ? '#22C55E' : '#FBBF24', 
                    background: wasUsed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 191, 36, 0.1)', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    border: wasUsed ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid transparent'
                  }}>
                    {idx + 1}. {p.name}{wasUsed ? ` (${matchScores[p.id]} pts)` : ''}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
