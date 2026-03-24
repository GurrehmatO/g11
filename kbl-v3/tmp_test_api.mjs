import fs from 'fs';

async function test() {
  const CRICAPI_KEY = "570cc7bd-b34f-4f8c-838c-d581afff7e20"; 
  const res = await fetch(`https://api.cricapi.com/v1/series?apikey=${CRICAPI_KEY}&offset=0&search=Indian Premier League`);
  const data = await res.json();
  
  const series = data.data.filter(s => s.name.includes('2026') || s.name.includes('2025'));
  console.log(JSON.stringify(series, null, 2));
}

test();
