import https from 'https';
import fs from 'fs';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
};

https.get('https://www.iplt20.com/teams/delhi-capitals', options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('tmp_dc2.html', data);
    console.log("Written", data.length, "bytes.");
    
    // Quick regex to see player names and images 
    const matches = [...data.matchAll(/<img[^>]*src="([^"]+(?:png|jpg|jpeg|webp))"[^>]*alt="([^"]*)"/gi)];
    matches.filter(m => m[1].includes('player') || m[2].includes('Rishabh') || m[2].includes('Axar')).slice(0, 10).forEach(m => {
       console.log("Image:", m[1], "Alt:", m[2]);
    });
  });
}).on('error', (err) => {
  console.log("Error: " + err.message);
});
