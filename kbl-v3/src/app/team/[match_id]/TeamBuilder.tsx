'use client'

import { useState, useEffect } from 'react'
import { saveTeam } from './actions'
import { Eye, ChevronLeft, Plus, Minus, Info, X } from 'lucide-react'
import { RulesModal } from '@/components/RulesModal'
import { TeamLogo } from '@/components/TeamLogo'
import { PlayerAvatar } from '@/components/PlayerAvatar'

type Player = {
  id: string
  name: string
  role: string
  team: string
  credits: number
}

// Map api roles to our tabs
const getRoleTab = (role: string) => {
  if (role.toUpperCase().includes('WK')) return 'WK'
  if (role.toLowerCase().includes('allrounder')) return 'AR'
  if (role.toLowerCase().includes('bowler')) return 'BOWL'
  return 'BAT' // default to BAT for Batsman
}

const getShortName = (name: string) => {
  if (!name) return '';
  const words = name.split(' ');
  if (words.length === 1) return name.substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').toUpperCase();
}

const getDeterministicNum = (str: string, min: number, max: number) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash % (max - min)) + min;
}

export default function TeamBuilder({ matchId, players, matchInfo, existingTeam }: any) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(existingTeam?.user_team_players?.map((p: any) => p.player_id) || [])
  )
  const [activeTab, setActiveTab] = useState('WK')
  const [step, setStep] = useState<'pick' | 'captain' | 'preview'>('pick')
  const [captainId, setCaptainId] = useState<string>(existingTeam?.captain_id || '')
  const [viceCaptainId, setViceCaptainId] = useState<string>(existingTeam?.vice_captain_id || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  // Generic team stats
  const teamA = matchInfo.team_a;
  const teamB = matchInfo.team_b;
  const shortA = getShortName(teamA);
  const shortB = getShortName(teamB);

  const selectedPlayers = players.filter((p: any) => selectedIds.has(p.id))
  const countA = selectedPlayers.filter((p: any) => p.team === teamA).length
  const countB = selectedPlayers.filter((p: any) => p.team === teamB).length

  const roles = { WK: 0, BAT: 0, AR: 0, BOWL: 0 } as any;
  selectedPlayers.forEach((p: any) => { roles[getRoleTab(p.role)]++; });
  const missingRoles = ['WK', 'BAT', 'AR', 'BOWL'].filter(r => roles[r] === 0);
  const slotsLeft = 11 - selectedIds.size;

  let isValidTeam = true;
  let validationMessage = '';
  if (slotsLeft > 0) {
    isValidTeam = false;
    validationMessage = `${slotsLeft} Players Left`;
  } else if (countA < 1) {
    isValidTeam = false;
    validationMessage = `Need 1+ ${shortA}`;
  } else if (countB < 1) {
    isValidTeam = false;
    validationMessage = `Need 1+ ${shortB}`;
  } else {
    if (roles.WK < 1) { isValidTeam = false; validationMessage = 'Need 1+ WK'; }
    else if (roles.BAT < 1) { isValidTeam = false; validationMessage = 'Need 1+ BAT'; }
    else if (roles.AR < 1) { isValidTeam = false; validationMessage = 'Need 1+ AR'; }
    else if (roles.BOWL < 1) { isValidTeam = false; validationMessage = 'Need 1+ BOWL'; }
  }

  const isPlayerDisabled = (p: any) => {
    if (selectedIds.has(p.id)) return false;
    if (slotsLeft === 0) return true;
    if (p.team === teamA && countA >= 10) return true;
    if (p.team === teamB && countB >= 10) return true;
    if (slotsLeft <= missingRoles.length) {
      if (!missingRoles.includes(getRoleTab(p.role))) return true;
    }
    return false;
  }

  const handleDisabledClick = (p: any) => {
    if (slotsLeft === 0) setError('Maximum 11 players allowed.');
    else if (p.team === teamA && countA >= 10) setError(`Maximum 10 players from ${shortA} allowed.`);
    else if (p.team === teamB && countB >= 10) setError(`Maximum 10 players from ${shortB} allowed.`);
    else if (slotsLeft <= missingRoles.length) setError(`You must select a player from: ${missingRoles.join(', ')}`);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const matchDate = new Date(matchInfo.match_date).getTime();
      const distance = matchDate - now;
      if (distance < 0) {
        setTimeLeft('Match Started');
        clearInterval(interval);
        return;
      }
      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) + (d * 24);
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s left`);
    }, 1000);
    return () => clearInterval(interval);
  }, [matchInfo.match_date])

  const togglePlayer = (id: string) => {
    setError('')
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
      if (captainId === id) setCaptainId('')
      if (viceCaptainId === id) setViceCaptainId('')
    } else {
      if (newSet.size >= 11) {
        setError('You can only select exactly 11 players.')
        return
      }
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleSave = async () => {
    if (selectedIds.size !== 11) {
      setError('You must select exactly 11 players.')
      return
    }
    if (!captainId || !viceCaptainId) {
      setError('You must select a Captain (C) and Vice-Captain (VC).')
      return
    }
    if (captainId === viceCaptainId) {
      setError('Captain and Vice-Captain must be different.')
      return
    }

    setLoading(true)
    const res = await saveTeam(matchId, Array.from(selectedIds), captainId, viceCaptainId)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  const renderPreviewRow = (title: string, playersList: any[]) => {
    if (playersList.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', zIndex: 2 }}>
        <div style={{ fontSize: '0.65rem', color: '#fff', opacity: 0.9, letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 600 }}>{title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem 0.5rem', width: '100%', padding: '0 0.5rem' }}>
          {playersList.map(p => (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <PlayerAvatar playerName={p.name} size={44} />
                <div style={{ background: p.team === teamA ? 'var(--foreground)' : 'var(--card)', color: p.team === teamA ? 'var(--background)' : 'var(--foreground)', fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap', minWidth: '55px', textAlign: 'center', marginTop: '-8px', position: 'relative', zIndex: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {p.name.split(' ').pop()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', background: '#111827', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
        {/* Header */}
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#fff' }}>
          <X size={24} onClick={() => setStep('pick')} style={{ cursor: 'pointer' }} />
          <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Team Preview</h2>
        </div>

        {/* Sub Header */}
        <div style={{ padding: '0 1.5rem 1rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Players</div>
            <div style={{ fontWeight: 700 }}>{selectedIds.size}/11</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1E293B', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.75rem', background: '#fff', color: '#000', padding: '0 4px', borderRadius: '2px', fontWeight: 'bold' }}>{shortA}</span>
            <span style={{ fontWeight: 700 }}>{countA} : {countB}</span>
            <span style={{ fontSize: '0.75rem', background: '#475569', color: '#fff', padding: '0 4px', borderRadius: '2px', fontWeight: 'bold' }}>{shortB}</span>
          </div>
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
            {renderPreviewRow('WICKET-KEEPERS', selectedPlayers.filter((p: any) => getRoleTab(p.role) === 'WK'))}
            {renderPreviewRow('BATTERS', selectedPlayers.filter((p: any) => getRoleTab(p.role) === 'BAT'))}
            {renderPreviewRow('ALL-ROUNDERS', selectedPlayers.filter((p: any) => getRoleTab(p.role) === 'AR'))}
            {renderPreviewRow('BOWLERS', selectedPlayers.filter((p: any) => getRoleTab(p.role) === 'BOWL'))}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'captain') {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', position: 'relative' }}>
        {/* Header */}
        <div style={{ background: '#111420', color: 'white', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ChevronLeft size={24} onClick={() => setStep('pick')} style={{ cursor: 'pointer' }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Choose Captain & Vice Captain</h2>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>C gets 2x points, VC gets 1.5x points</div>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff', paddingBottom: '90px' }}>
          {error && <div style={{ color: 'red', background: '#FEE2E2', padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}
          
          <div style={{ display: 'flex', background: '#F8FAFC', padding: '0.5rem 1rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 600, borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0 }}>
            <div style={{ flex: 1 }}>PLAYER</div>
            <div style={{ width: '40px', textAlign: 'center' }}>% C BY</div>
            <div style={{ width: '40px', textAlign: 'center', marginLeft: '1rem' }}>% VC BY</div>
          </div>

          <div style={{ padding: '0 1rem' }}>
            {['WK', 'BAT', 'AR', 'BOWL'].map(roleKey => {
              const rolePlayers = selectedPlayers
                .filter((p: any) => getRoleTab(p.role) === roleKey)
                .sort((a: any, b: any) => getDeterministicNum(b.id, 0, 300) - getDeterministicNum(a.id, 0, 300));
                
              if (rolePlayers.length === 0) return null;
              
              const sectionTitle = roleKey === 'WK' ? 'WICKET-KEEPERS' : roleKey === 'BAT' ? 'BATTERS' : roleKey === 'AR' ? 'ALL-ROUNDERS' : 'BOWLERS';

              return (
                <div key={roleKey}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.25rem', marginBottom: '0.25rem', marginTop: '1rem', letterSpacing: '0.05em' }}>
                    {sectionTitle}
                  </div>
                  {rolePlayers.map((p: any) => {
                    const isC = captainId === p.id;
                    const isVC = viceCaptainId === p.id;
                    
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <PlayerAvatar playerName={p.name} size={44} />
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)' }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{getRoleTab(p.role)}</div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button 
                            onClick={() => { setCaptainId(p.id); if(viceCaptainId === p.id) setViceCaptainId(''); }}
                            style={{ width: 36, height: 36, borderRadius: '50%', background: isC ? '#1E293B' : '#F8FAFC', color: isC ? '#fff' : '#64748B', border: '1px solid', borderColor: isC ? '#1E293B' : '#E2E8F0', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >C</button>
                          
                          <button 
                            onClick={() => { setViceCaptainId(p.id); if(captainId === p.id) setCaptainId(''); }}
                            style={{ width: 36, height: 36, borderRadius: '50%', background: isVC ? '#3B82F6' : '#F8FAFC', color: isVC ? '#fff' : '#64748B', border: '1px solid', borderColor: isVC ? '#3B82F6' : '#E2E8F0', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >VC</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sticky Fixed Bottom Bar Container */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', padding: '1rem', borderTop: '1px solid #E2E8F0', display: 'flex', boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)', zIndex: 50 }}>
          <button 
            disabled={loading || !captainId || !viceCaptainId}
            onClick={handleSave}
            style={{ flex: 1, background: '#22C55E', color: '#fff', border: 'none', padding: '1rem', borderRadius: '24px', fontWeight: 'bold', fontSize: '1rem', opacity: (!captainId || !viceCaptainId || loading) ? 0.5 : 1, transition: '0.2s' }}
          >
            {loading ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--background)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', position: 'relative' }}>
      
      {/* ---------- STICKY TOP VIEWPORT ENCLOSURE ---------- */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--background)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      
        {/* Top Dark Section */}
      <div style={{ background: 'linear-gradient(180deg, #1A0B1A 0%, #111420 100%)', color: 'white', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ChevronLeft size={24} onClick={() => window.history.back()} style={{ cursor: 'pointer' }} />
            <div>
              <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Create Team</h2>
              <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{timeLeft || 'Calculating...'}</div>
            </div>
          </div>
          <button onClick={() => setIsRulesOpen(true)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--foreground)', cursor: 'pointer' }}>PTS</button>
        </div>

        {/* Team Score Display */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <TeamLogo teamName={teamA} size={36} />
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{shortA}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{countA}</span>
            <span style={{ fontSize: '1.25rem', color: '#71717A', fontWeight: 300 }}>-</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{countB}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{shortB}</span>
            <TeamLogo teamName={teamB} size={36} />
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', width: '30px' }}>{selectedIds.size}/11</span>
          <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} style={{ 
                height: '6px', 
                flex: 1, 
                background: i < selectedIds.size ? '#22C55E' : '#334155',
                transform: 'skewX(-20deg)', 
                borderRadius: '1px',
                transition: 'background 0.3s'
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--card)', color: 'var(--foreground)', borderBottom: '1px solid var(--border)' }}>
        {['WK', 'BAT', 'AR', 'BOWL'].map(tab => {
          const countInTab = Array.from(selectedIds).filter(id => {
            const p = players.find((x: any) => x.id === id)
            return p && getRoleTab(p.role) === tab
          }).length;
          
          return (
            <div 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              style={{ 
                flex: 1, 
                textAlign: 'center', 
                padding: '1rem 0', 
                fontSize: '0.85rem',
                fontWeight: 700,
                color: activeTab === tab ? '#DC2626' : '#64748B',
                borderBottom: activeTab === tab ? '3px solid #DC2626' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab} {countInTab > 0 && `(${countInTab})`}
            </div>
          )
        })}
      </div>

      {/* Player List Headers */}
      <div style={{ display: 'flex', background: 'var(--card)', padding: '0.5rem 1rem', fontSize: '0.7rem', color: '#64748B', fontWeight: 600, borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>
        <div style={{ width: '50%' }}>PLAYER</div>
        <div style={{ width: '35%', textAlign: 'center' }}>POINTS</div>
        <div style={{ width: '15%', textAlign: 'center' }}></div>
      </div>
      </div>

      {/* Player List Main Area */}
      <div style={{ flex: 1, paddingBottom: '100px' }}>
        {players
          .filter((p: any) => getRoleTab(p.role) === activeTab)
          .sort((a: any, b: any) => getDeterministicNum(b.id, 0, 300) - getDeterministicNum(a.id, 0, 300))
          .map((p: any) => {
          const isSelected = selectedIds.has(p.id)
          const disabled = isPlayerDisabled(p)
          return (
            <div 
              key={p.id}
              onClick={() => {
                if (disabled) handleDisabledClick(p);
                else togglePlayer(p.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                background: isSelected ? 'rgba(34, 197, 94, 0.1)' : 'var(--card)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                opacity: disabled && !isSelected ? 0.4 : 1
              }}
            >
              {/* Avatar Box */}
              <div style={{ position: 'relative', marginRight: '1rem' }}>
                <PlayerAvatar playerName={p.name} size={48} />
                <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', background: p.team === teamA ? '#1E293B' : '#65A30D', color: '#fff', fontSize: '0.55rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  {getShortName(p.team)}
                </div>
                <div style={{ position: 'absolute', top: -2, left: -2, background: '#fff', borderRadius: '50%', display: 'flex' }}>
                  <Info size={14} color="#94A3B8" />
                </div>
              </div>

              {/* Player textual Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#2563EB', marginTop: '4px', fontWeight: 500 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563EB' }} />
                  Played last match
                </div>
              </div>

              {/* Points */}
              <div style={{ width: '35%', textAlign: 'center', fontSize: '0.95rem', color: '#475569', fontWeight: 500 }}>
                {getDeterministicNum(p.id, 0, 300)}
              </div>

              {/* Selection Button */}
              <div style={{ width: '15%', display: 'flex', justifyContent: 'flex-end', paddingLeft: '0.5rem' }}>
                {isSelected ? (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316' }}>
                    <Minus size={16} strokeWidth={3} />
                  </div>
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E' }}>
                    <Plus size={16} strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {error && <div style={{ color: 'red', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      </div>

      {/* Sticky Fixed Bottom Area */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', padding: '1rem', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '1rem', boxShadow: '0 -4px 10px rgba(0,0,0,0.05)', zIndex: 50 }}>
        <button 
          onClick={() => setStep('preview')}
          style={{ flex: 1, background: '#1E293B', color: '#fff', padding: '0.875rem', borderRadius: '24px', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
          <Eye size={18} /> PREVIEW
        </button>
        <button 
          disabled={!isValidTeam}
          onClick={() => setStep('captain')}
          style={{ flex: 1, background: isValidTeam ? '#F8FAFC' : '#F1F5F9', color: isValidTeam ? '#1E293B' : '#94A3B8', border: 'none', padding: '0.875rem', borderRadius: '24px', fontWeight: 700, fontSize: '0.85rem', transition: '0.2s', opacity: isValidTeam ? 1 : 0.6, cursor: isValidTeam ? 'pointer' : 'not-allowed' }}
        >
          {isValidTeam ? 'NEXT' : validationMessage}
        </button>
      </div>

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  )
}
