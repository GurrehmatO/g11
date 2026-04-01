import fs from 'fs';

const html = fs.readFileSync('tmp_squads.html', 'utf8');

function extractSquads(html) {
  const activePlayers = new Set();
  
  const squadPattern = />playing XI<\/h1>([\s\S]*?)<h1[^>]*>substitutes<\/h1>([\s\S]*?)<h1[^>]*>bench<\/h1>/i;
  const match = html.match(squadPattern);
  
  if (match) {
    const playingXIHtml = match[1];
    const substitutesHtml = match[2];

    // Extract all players from Playing XI
    const playerRegex = /href="\/profiles\/\d+\/[^"]+".*?<span>([^<]+)<\/span>/g;
    let playingXIMatch;
    while ((playingXIMatch = playerRegex.exec(playingXIHtml)) !== null) {
      activePlayers.add(playingXIMatch[1].trim());
    }

    // Extract only the subbed-in players from Substitutes
    // The subbed in player has: <div class="bg-cbHundred ..."><span class="... cbMINOUT">
    // Wait, the structure is:
    // <a ... href="/profiles/.../player-slug"> ... <span>Player Name</span> ... <div class="bg-cbHundred ..."><span class="inline-block cbPlusIco cbMINOUT"></span></div> ... </a>
    // We can extract each player <a>...</a> block in substitutes
    const subPlayerBlockRegex = /<a [^>]*href="\/profiles\/\d+\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g;
    let subBlockMatch;
    while ((subBlockMatch = subPlayerBlockRegex.exec(substitutesHtml)) !== null) {
      const blockHtml = subBlockMatch[1];
      // Check if this block has the bg-cbHundred indicator (subbed in)
      if (blockHtml.includes('bg-cbHundred')) {
        const nameMatch = blockHtml.match(/<span>([^<]+)<\/span>/);
        if (nameMatch) {
          activePlayers.add(nameMatch[1].trim());
        }
      }
    }
  }
  
  return Array.from(activePlayers);
}

const res = extractSquads(html);
console.log('Active players count:', res.length);
console.log('Active players:', res);
