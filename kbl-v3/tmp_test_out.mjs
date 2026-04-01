const descriptions = [
  'c Kohli b Bumrah',
  'c & b Ashwin',
  'c &amp; b Ashwin',
  'c (sub) Manish Pandey b Harshit Rana',
  'st Dhoni b Chahal',
  'run out (Kohli)',
  'run out (Fielder1/Fielder2)',
  'run out (sub F1/sub F2)'
];

descriptions.forEach(desc => {
  console.log(`\nDesc: "\${desc}"`);

  // Catch (c Fielder b Bowler)
  let m1 = /c ([^&][^b]*?) b /i.exec(desc);
  let matcher = desc.match(/c(?:\s+\(sub\))?\s+([^&b]+?)\s+b\s+/i);
  if (matcher) {
      console.log('-> Catch by:', matcher[1].trim());
  }

  // Caught & Bowled
  let m2 = /c\s*(?:&|&amp;)\s*b\s+([^'"\\]+)/i.exec(desc);
  if (m2) {
      console.log('-> Caught & Bowled by:', m2[1].trim());
  }

  // Stumping
  let m3 = /^st(?:\s+\(sub\))?\s+(.+?)\s+b\s+/i.exec(desc);
  if (m3) {
      console.log('-> Stumped by:', m3[1].trim());
  }

  // Run out
  let m4 = /run out\s*\(([^)]+)\)/i.exec(desc);
  if (m4) {
      let fielders = m4[1].split('/').map(f => f.replace(/\(sub\)/gi, '').trim());
      console.log('-> Run out by:', fielders);
  }
});
