// Probe CricAPI scorecard format for a real IPL 2025 match
// Run with: node tmp_probe_scorecard.mjs
import { readFileSync } from 'fs'
import https from 'https'

const envContent = readFileSync('.env.local', 'utf8')
envContent.split('\n').forEach(line => {
  const eqIdx = line.indexOf('=')
  if (eqIdx > 0) {
    const key = line.substring(0, eqIdx).trim()
    const val = line.substring(eqIdx + 1).trim()
    if (key && !key.startsWith('#')) process.env[key] = val
  }
})

const KEY = process.env.CRICAPI_KEY
if (!KEY) throw new Error('CRICAPI_KEY not found in .env.local')

// IPL 2025 series ID (from CricAPI public docs)
const IPL_2025_SERIES_ID = 'd5a498c8-7596-4b93-8ab0-e0efc3345312'

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  })
}

// Step 1: Get match list for IPL 2025
console.log('Fetching IPL 2025 series info...')
const series = await fetch(`https://api.cricapi.com/v1/series_info?apikey=${KEY}&id=${IPL_2025_SERIES_ID}`)
if (series.status !== 'success') {
  console.log('Series fetch failed:', JSON.stringify(series, null, 2))
  process.exit(1)
}

// Find a completed match
const completed = series.data.matchList?.find(m => m.matchEnded)
if (!completed) {
  console.log('No completed matches found. Match list:', series.data.matchList?.slice(0, 3))
  process.exit(1)
}

console.log('Found match:', completed.name, '| ID:', completed.id)

// Step 2: Fetch its scorecard
console.log('\nFetching scorecard...')
const scorecard = await fetch(`https://api.cricapi.com/v1/match_scorecard?apikey=${KEY}&id=${completed.id}`)
if (scorecard.status !== 'success') {
  console.log('Scorecard fetch failed:', JSON.stringify(scorecard, null, 2))
  process.exit(1)
}

// Print structure
const sc = scorecard.data
console.log('\n=== MATCH:', sc.name, '===')
console.log('Status:', sc.status)
console.log('\nScorecard keys:', Object.keys(sc))

if (sc.score) {
  console.log('\n--- Innings Scores ---')
  sc.score.forEach(s => console.log(s.inning, ':', s.r, '/', s.w, 'in', s.o, 'overs'))
}

const innings = sc.scorecard || sc.innings || []

if (innings.length > 0) {
  const first = innings[0]
  console.log('\n--- First Innings Keys ---:', Object.keys(first))
  console.log('InningName:', first.inning)
  if (first.batting) {
    console.log('\n--- Batting sample (first 3 rows) ---')
    first.batting.slice(0, 3).forEach(b => console.log(b))
  }
  if (first.bowling) {
    console.log('\n--- Bowling sample (first 3 rows) ---')
    first.bowling.slice(0, 3).forEach(b => console.log(b))
  }
}

console.log('\n\nFull match_id for testing:', completed.id)
