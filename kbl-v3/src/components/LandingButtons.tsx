'use client'

import { useState } from 'react'
import { RulesModal } from './RulesModal'

export function LandingButtons({ user }: { user: any }) {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <a 
          href={user ? "/dashboard" : "/login"} 
          className="btn-primary" 
          style={{ padding: '0.875rem 2rem', fontSize: '1.125rem' }}
        >
          Draft Your Team
        </a>
        <button 
          onClick={() => setIsRulesOpen(true)} 
          className="glass-panel" 
          style={{ 
            border: 'none', 
            padding: '0.875rem 2rem', 
            fontSize: '1.125rem', 
            fontWeight: 600, 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderRadius: 'var(--radius)', 
            transition: 'background-color 0.2s', 
            cursor: 'pointer' 
          }}
        >
          Read the Rules
        </button>
      </div>

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </>
  );
}
