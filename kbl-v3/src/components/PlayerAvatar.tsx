'use client'
import { useState } from 'react'

export function PlayerAvatar({ playerName, size = 44, className, style }: { playerName: string, size?: number, className?: string, style?: any }) {
  const [error, setError] = useState(false);

  // Normalize: Rohit Sharma -> rohit-sharma.png
  const slug = playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const src = `/players/${slug}.png`;

  if (error) {
    return (
      <img 
        src="https://h.cricapi.com/img/icon512.png" 
        alt={playerName} 
        className={className}
        style={{ width: size, height: size, borderRadius: '12%', objectFit: 'cover', flexShrink: 0, ...style }} 
      />
    );
  }

  return (
    <img 
      src={src} 
      alt={playerName} 
      className={className}
      style={{ width: size, height: size, borderRadius: '12%', objectFit: 'contain', flexShrink: 0, ...style }} 
      onError={() => setError(true)} 
    />
  )
}
