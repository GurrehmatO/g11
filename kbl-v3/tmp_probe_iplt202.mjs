import https from 'https';
import fs from 'fs';

https.get('https://www.iplt20.com/teams/delhi-capitals', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('tmp_dc.html', data);
    console.log("Written to tmp_dc.html, length:", data.length);
  });
}).on('error', (err) => {
  console.log("Error: " + err.message);
});
