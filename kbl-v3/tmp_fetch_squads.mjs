import fs from 'fs';

async function testFetch() {
  const url = 'https://www.cricbuzz.com/cricket-match-squads/149618/srh-vs-rcb-1st-match-indian-premier-league-2026';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  
  // Let's print out the sections or around the players
  fs.writeFileSync('tmp_squads.html', html);
  console.log('Saved to tmp_squads.html');
}

testFetch();
