// Usage: node render.js  → exporte tous les visuels en PNG 1080x1920 dans output/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const types = { '.html':'text/html', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg' };
const server = http.createServer((q, r) => {
  const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }), r.end(d)));
}).listen(0);
(async () => {
  const base = `http://localhost:${server.address().port}/templates/`;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const shot = async (url, out) => {
    await p.goto(base + url); 
    if (url.match(/candidat|grille/)) await p.waitForSelector('body[data-ready]');
    await p.waitForTimeout(300);
    await p.screenshot({ path: out }); console.log('ok', out);
  };
  fs.mkdirSync('output/candidats', { recursive: true });
  for (const f of ['citation','sondage','jx','fiche']) await shot(f + '.html', `output/${f}.png`);
  await shot('grille.html', 'output/grille.png');
  for (const c of JSON.parse(fs.readFileSync('candidats.json')).filter(c => fs.existsSync(`assets/candidats/${c.id}.jpg`))) await shot(`candidat.html?id=${c.id}`, `output/candidats/${c.id}.png`);
  await b.close(); server.close();
})();
