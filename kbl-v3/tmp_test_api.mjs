import fs from 'fs';

async function run() {
  const apikey = '570cc7bd-b34f-4f8c-838c-d581afff7e20';
  let offset = 0;
  let successData = null;
  while(!successData && offset < 200) {
    const res = await fetch(`https://api.cricapi.com/v1/matches?apikey=${apikey}&offset=${offset}`);
    const data = await res.json();
    if(!data.data) break;
    
    // Check scorecards of completed t20/odi matches
    for(let m of data.data) {
      if(m.matchEnded) {
        const scoreRes = await fetch(`https://api.cricapi.com/v1/match_scorecard?apikey=${apikey}&id=${m.id}`);
        const scoreData = await scoreRes.json();
        if(scoreData.status !== 'failure' && scoreData.data && scoreData.data.length > 0) {
          successData = scoreData;
          console.log('Scorecard found for match:', m.name);
          break;
        }
      }
    }
    if (successData) break;
    offset += 25;
  }
  
  if(successData) {
    fs.writeFileSync('c:/Antigravity Projects/G11/kbl-v3/tmp_scorecard.json', JSON.stringify(successData, null, 2));
    console.log('Saved successfully.');
  } else {
    console.log('Could not find any scorecard.');
  }
}
run();
