// Usage: node render.js  → exporte chaque template en PNG 1080x1920 dans output/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const f of fs.readdirSync('templates').filter(f => f.endsWith('.html'))) {
    await p.goto('file://' + path.resolve('templates', f));
    await p.screenshot({ path: `output/${f.replace('.html', '.png')}` });
    console.log('ok', f);
  }
  await b.close();
})();
