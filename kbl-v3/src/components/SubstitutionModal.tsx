'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { PlayerAvatar } from '@/components/PlayerAvatar'

const getRoleTab = (role: string) => {
  if (!role) return 'BAT'
  if (role.toUpperCase().includes('WK')) return 'WK'
  if (role.toLowerCase().includes('allrounder')) return 'AR'
  if (role.toLowerCase().includes('bowler')) return 'BOWL'
  return 'BAT'
}

type Player = {
  id: string
  name: string
  role: string
  team: string
  isPlaying: boolean
}

type Substitute = {
  id: string
  name: string
  role: string
  team: string
  priority: number
  isPlaying: boolean
}

type Team = {
  userId: string
  userName: string
  starters: Player[]
  substitutes: Substitute[]
  captainId: string
  viceCaptainId: string
}

type Props = {
  team: Team
  teamA: string
  onSave: (userId: string, subs: Record<string, string>) => void
  onSkip: (userId: string) => void
  isLast: boolean
  currentIndex: number
  totalTeams: number
}

export function SubstitutionModal({ team, teamA, onSave, onSkip, isLast, currentIndex, totalTeams }: Props) {
  const [selections, setSelections] = useState<Record<string, string>>({})

  const nonPlayingStarters = team.starters.filter(s => !s.isPlaying)
  const playingSubs = team.substitutes.filter(s => s.isPlaying)

  const handleSelect = (starterId: string, subId: string) => {
    setSelections(prev => {
      const next = { ...prev }
      if (subId === '') {
        delete next[starterId]
      } else {
        next[starterId] = subId
      }
      return next
    })
  }

  const handleConfirm = () => {
    onSave(team.userId, selections)
  }

  const handleSkip = () => {
    onSkip(team.userId)
  }

  const renderPlayerOnField = (player: Player) => {
    const isC = player.id === team.captainId
    const isVC = player.id === team.viceCaptainId
    const isNonPlaying = !player.isPlaying
    const selectedSubId = selections[player.id]
    const selectedSub = selectedSubId ? team.substitutes.find(s => s.id === selectedSubId) : null

    const nameParts = player.name.trim().split(' ')
    const lastName = nameParts.length > 1 ? nameParts.pop() : ''
    const firstLines = nameParts.join(' ')

    return (
      <div key={player.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', borderRadius: '50%', padding: '2px', border: isNonPlaying ? '2px solid #EF4444' : 'none' }}>
            <PlayerAvatar playerName={player.name} teamName={player.team} size={48} />
            {isNonPlaying && (
              <div style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: '#fff', fontSize: '0.5rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                OUT
              </div>
            )}
          </div>
          {isC && <div style={{ position: 'absolute', top: -4, left: -4, background: '#1E293B', color: '#fff', border: '1px solid #fff', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>C</div>}
          {isVC && <div style={{ position: 'absolute', top: -4, left: -4, background: '#3B82F6', color: '#fff', border: '1px solid #fff', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 'bold' }}>VC</div>}
          
          <div style={{ background: player.team === teamA ? 'var(--foreground)' : 'var(--card)', color: player.team === teamA ? 'var(--background)' : 'var(--foreground)', fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap', minWidth: '55px', textAlign: 'center', marginTop: '-8px', position: 'relative', zIndex: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.3)', lineHeight: '1.1', opacity: isNonPlaying ? 0.5 : 1 }}>
            {firstLines && <div style={{ fontSize: '0.55rem', opacity: 0.9 }}>{firstLines}</div>}
            <div>{lastName || player.name}</div>
          </div>
          
          {selectedSub && (
            <div style={{ fontSize: '0.6rem', color: '#22C55E', fontWeight: 600, marginTop: '2px', background: 'rgba(34, 197, 94, 0.1)', padding: '1px 6px', borderRadius: '3px' }}>
              → {selectedSub.name}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderPreviewRow = (title: string, playersList: Player[]) => {
    if (playersList.length === 0) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', zIndex: 2 }}>
        <div style={{ fontSize: '0.65rem', color: '#fff', opacity: 0.9, letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 600 }}>{title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', width: '100%', padding: '0 0.5rem' }}>
          {playersList.map(p => renderPlayerOnField(p))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s' }}>
      <div style={{ background: '#111827', width: '100%', maxWidth: '520px', height: '100%', maxHeight: '900px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>{team.userName}'s Team</h2>
              <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                {currentIndex + 1} of {totalTeams}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.25rem 0 0 0' }}>
              {nonPlayingStarters.length} player{nonPlayingStarters.length > 1 ? 's' : ''} not playing — choose substitutions
            </p>
          </div>
          <X size={24} onClick={handleSkip} style={{ cursor: 'pointer', color: '#64748B' }} />
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
            {renderPreviewRow('WICKET-KEEPERS', team.starters.filter(p => getRoleTab(p.role) === 'WK'))}
            {renderPreviewRow('BATTERS', team.starters.filter(p => getRoleTab(p.role) === 'BAT'))}
            {renderPreviewRow('ALL-ROUNDERS', team.starters.filter(p => getRoleTab(p.role) === 'AR'))}
            {renderPreviewRow('BOWLERS', team.starters.filter(p => getRoleTab(p.role) === 'BOWL'))}
          </div>
        </div>

        {/* Substitution Panel */}
        <div style={{ background: '#0F172A', borderTop: '1px solid #1E293B', padding: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={16} color="#F59E0B" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Substitutions Required
            </span>
          </div>

          {nonPlayingStarters.map(starter => {
            const isC = starter.id === team.captainId
            const isVC = starter.id === team.viceCaptainId
            const multiplier = isC ? ' (C x2)' : isVC ? ' (VC x1.5)' : ''
            const selectedSubId = selections[starter.id]

            return (
              <div key={starter.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#EF4444' }}>{starter.name}</span>
                    <span style={{ fontSize: '0.6rem', background: '#EF4444', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>OUT</span>
                    {multiplier && <span style={{ fontSize: '0.65rem', color: '#FBBF24', fontWeight: 600 }}>{multiplier}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B' }}>→</span>
                  <select
                    value={selectedSubId || ''}
                    onChange={e => handleSelect(starter.id, e.target.value)}
                    style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', color: '#fff', cursor: 'pointer', minWidth: '140px' }}
                  >
                    <option value="">Select substitute...</option>
                    {team.substitutes.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}{sub.isPlaying ? ' (Playing)' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedSubId && playingSubs.find(s => s.id === selectedSubId) && (
                    <span style={{ fontSize: '0.65rem', color: '#22C55E', fontWeight: 600 }}>✓</span>
                  )}
                </div>
              </div>
            )
          })}

          {playingSubs.length === 0 && (
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              No substitutes are playing. Non-playing players will score 0 points unless you skip.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '1rem', background: '#0F172A', borderTop: '1px solid #1E293B', display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={handleSkip}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'transparent', border: '1px solid #64748B', color: '#94A3B8', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            Skip (0 points)
          </button>
          <button 
            onClick={handleConfirm}
            style={{ flex: 2, padding: '0.75rem', borderRadius: '8px', background: '#22C55E', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
          >
            {isLast ? 'Confirm & Score' : 'Confirm & Next'}
          </button>
        </div>

      </div>
    </div>
  )
}
