import fs from 'fs';
import https from 'https';
import path from 'path';

const TEAMS = [
  'chennai-super-kings',
  'delhi-capitals',
  'gujarat-titans',
  'kolkata-knight-riders',
  'lucknow-super-giants',
  'mumbai-indians',
  'punjab-kings',
  'rajasthan-royals',
  'royal-challengers-bengaluru',
  'sunrisers-hyderabad'
];

const PLAYERS_DIR = path.join(process.cwd(), 'public', 'players');

// 1. Delete existing images
if (fs.existsSync(PLAYERS_DIR)) {
  for (const file of fs.readdirSync(PLAYERS_DIR)) {
    if (file.endsWith('.png') || file.endsWith('.webp') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
      fs.unlinkSync(path.join(PLAYERS_DIR, file));
    }
  }
} else {
  fs.mkdirSync(PLAYERS_DIR, { recursive: true });
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      } else {
        file.close();
        // Ignore files that don't exist
        resolve();
      }
    }).on('error', err => {
      file.close();
      resolve();
    });
  });
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function scrape() {
  let count = 0;
  for (const team of TEAMS) {
    console.log(`Fetching team: ${team}`);
    const html = await fetchUrl(`https://www.iplt20.com/teams/${team}`);
    
    const blocks = html.match(/data-src="([^"]+)"\s*alt="">\s*<div class="ih-p-name">\s*<h2>([^<]+)<\/h2>/gi);
    
    if (blocks) {
      for (const block of blocks) {
        const urlMatch = block.match(/data-src="([^"]+)"/i);
        const nameMatch = block.match(/<h2>([^<]+)<\/h2>/i);
        
        if (urlMatch && nameMatch) {
          const imgUrl = urlMatch[1];
          const name = nameMatch[1].trim();
          
          if (imgUrl.includes('Default-Men') || imgUrl.includes('Default-Women') || imgUrl.includes('PHOTO-MISSING')) continue;

          const slug = slugify(name);
          const dest = path.join(PLAYERS_DIR, `${slug}.png`); // Download everything as png (standardization for avatar lookup)
          
          await downloadImage(imgUrl, dest);
          count++;
        }
      }
    }
  }
  console.log(`\nCompleted downloading ${count} player images!`);
}

scrape().catch(console.error);
