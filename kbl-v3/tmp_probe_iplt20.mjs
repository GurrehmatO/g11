import https from 'https';

https.get('https://www.iplt20.com/teams/delhi-capitals', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // See how players are defined
    const matches = [...data.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)]
      .map(m => m[1])
      .filter(src => src.includes('player') || src.includes('photos') || src.includes('headshots'));
    console.log(matches.slice(0, 10));
  });
}).on('error', (err) => {
  console.log("Error: " + err.message);
});
