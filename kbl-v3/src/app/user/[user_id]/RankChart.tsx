'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Label,
} from 'recharts'

const axisStyle = {
  fontSize: 12,
  fill: '#5a5a64',
  fontFamily: "'IBM Plex Sans', sans-serif",
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <div
      style={{
        background: '#141418',
        border: '1px solid #2a2a30',
        borderRadius: '8px',
        padding: '0.85rem 1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        minWidth: '200px',
      }}
    >
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', color: '#e8e6e1' }}>
        {data.matchLabel}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <span style={{ color: '#f0a500' }}>Match Rank</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: '#f0a500' }}>#{data.matchRank}</span>
        </div>
        {data.globalRank != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: '#5a5a64' }}>Global Rank</span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: '#5a5a64' }}>#{data.globalRank}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid #2a2a30', paddingTop: '0.3rem', marginTop: '0.15rem' }}>
          <span style={{ color: '#e8e6e1' }}>Points</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: '#e8e6e1' }}>{data.points}</span>
        </div>
      </div>
    </div>
  )
}

export function RankChart({ data }: { data: Array<{ matchLabel: string; matchNumber: number; matchRank: number; globalRank: number | null; rawScore: number; points: number }> }) {
  const maxRank = Math.max(
    ...data.map(d => d.matchRank),
    ...data.filter(d => d.globalRank != null).map(d => d.globalRank as number)
  )

  const yAxisDomain = [Math.max(1, maxRank - 2), 1]

  const totalMatches = data.length
  const tickInterval = totalMatches <= 5 ? 1 : Math.ceil(totalMatches / 6)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" />
        <XAxis
          dataKey="matchNumber"
          axisLine={{ stroke: '#2a2a30' }}
          tickLine={false}
          tick={axisStyle}
          interval={tickInterval}
          domain={['dataMin', 'dataMax']}
        >
          <Label
            value="Match #"
            position="insideBottom"
            offset={-5}
            style={{ ...axisStyle, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          />
        </XAxis>
        <YAxis
          domain={yAxisDomain}
          axisLine={{ stroke: '#2a2a30' }}
          tickLine={false}
          tick={axisStyle}
          reversed
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '0.8rem', fontFamily: "'IBM Plex Sans', sans-serif", paddingTop: '0.5rem' }}
        />
        <Line
          type="monotone"
          dataKey="matchRank"
          name="Match Rank"
          stroke="#f0a500"
          strokeWidth={2.5}
          dot={{ fill: '#f0a500', strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, stroke: '#f0a500', strokeWidth: 2, fill: '#141418' }}
        />
        <Line
          type="monotone"
          dataKey="globalRank"
          name="Global Rank"
          stroke="#5a5a64"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={{ fill: '#5a5a64', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, stroke: '#5a5a64', strokeWidth: 2, fill: '#141418' }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
