'use client'
import { useState } from 'react'

// Map team name to slug for team logo
function teamSlug(teamName: string) {
  if (!teamName) return '';
  return teamName.toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Cricket batter silhouette as inline SVG (head + body in stance)
function CricketSilhouette({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size}
      fill="currentColor"
      style={{ opacity: 0.35, display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head */}
      <circle cx="50" cy="18" r="14" />
      {/* Body torso */}
      <ellipse cx="50" cy="52" rx="18" ry="22" />
      {/* Left arm */}
      <ellipse cx="30" cy="52" rx="8" ry="16" transform="rotate(-20 30 52)" />
      {/* Right arm / bat arm */}
      <ellipse cx="70" cy="48" rx="8" ry="18" transform="rotate(25 70 48)" />
      {/* Bat */}
      <rect x="75" y="30" width="6" height="50" rx="3" transform="rotate(20 75 30)" />
      {/* Legs */}
      <ellipse cx="43" cy="92" rx="9" ry="20" transform="rotate(-5 43 92)" />
      <ellipse cx="57" cy="92" rx="9" ry="20" transform="rotate(5 57 92)" />
    </svg>
  );
}

export function PlayerAvatar({
  playerName,
  teamName,
  size = 44,
  className,
  style
}: {
  playerName: string
  teamName?: string
  size?: number
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any
}) {
  const [error, setError] = useState(false);

  const slug = playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const src = `/players/${slug}.png`;

  if (error) {
    // Fallback: silhouette + small team logo badge
    const logoSize = Math.round(size * 0.38);
    const tSlug = teamName ? teamSlug(teamName) : '';

    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '12%',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'visible',
          flexShrink: 0,
          ...style
        }}
      >
        {/* Silhouette SVG */}
        <div style={{ color: 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CricketSilhouette size={Math.round(size * 0.85)} />
        </div>

        {/* Team logo badge at bottom */}
        {tSlug && (
          <img
            src={`/teams/${tSlug}.png`}
            alt={teamName}
            style={{
              position: 'absolute',
              bottom: -Math.round(size * 0.12),
              left: '50%',
              transform: 'translateX(-50%)',
              width: logoSize,
              height: logoSize,
              objectFit: 'contain',
              borderRadius: '50%',
              background: 'var(--background)',
              border: '1px solid var(--border)',
              padding: '1px'
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
      </div>
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
