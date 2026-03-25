'use client'
import { useState } from 'react'

export function TeamLogo({ teamName, size = 36, className, style }: { teamName: string, size?: number, className?: string, style?: any }) {
  const [error, setError] = useState(false);

  const getShortName = (name: string) => {
    if (!name) return '';
    const words = name.split(' ');
    if (words.length === 1) return name.substring(0, 3).toUpperCase();
    return words.map(w => w[0]).join('').toUpperCase();
  }

  // Predefined map so use knows exactly what to name files
  const slugMap: Record<string, string> = {
    'Royal Challengers Bengaluru': 'rcb',
    'Mumbai Indians': 'mi',
    'Chennai Super Kings': 'csk',
    'Kolkata Knight Riders': 'kkr',
    'Delhi Capitals': 'dc',
    'Rajasthan Royals': 'rr',
    'Punjab Kings': 'pbks',
    'Sunrisers Hyderabad': 'srh',
    'Lucknow Super Giants': 'lsg',
    'Gujarat Titans': 'gt',
  }

  const shortName = getShortName(teamName);
  const slug = slugMap[teamName] || shortName.toLowerCase();
  const src = `/teams/${slug}.png`;

  if (error) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#fff',
          color: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: `${size / 2.5}px`,
          border: '2px solid #333',
          lineHeight: 1,
          flexShrink: 0,
          ...style
        }}
      >
        {shortName}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={teamName}
      className={className}
      style={{ width: size * 1.5, height: size * 1.5, objectFit: 'contain', flexShrink: 0, ...style }}
      onError={() => setError(true)}
    />
  )
}
