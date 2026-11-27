#!/usr/bin/env node
/* Génère les fichiers du logo Azimut dans assets/logo/ depuis les tracés de js/icons.js (source unique).
   SVG : sans dépendance. PNG : nécessite Playwright (npm i playwright) ; sinon seuls les SVG sont écrits. */
const fs = require('fs'), path = require('path');
global.window = global;
require('../js/icons.js');
const out = path.join(__dirname, '..', 'assets', 'logo'); fs.mkdirSync(out, { recursive: true });
const W = (n, s) => fs.writeFileSync(path.join(out, n), s + '\n');
W('azimut-logo.svg', Icons.file('lockup', 'dark'));            // pour fonds sombres
W('azimut-logo-light.svg', Icons.file('lockup', 'light'));     // pour fonds clairs
W('azimut-mark.svg', Icons.file('mark', 'dark'));
W('azimut-mark-light.svg', Icons.file('mark', 'light'));
W('azimut-icon.svg', Icons.file('icon', 'dark'));
W('favicon.svg', Icons.file('icon', 'dark'));
console.log('SVG écrits dans', out);
(async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('Playwright absent : PNG non générés.'); return; }
  const b = await chromium.launch(), p = await b.newPage({ deviceScaleFactor: 1 });
  const png = async (svgName, file, w, h, bg) => {
    const svg = fs.readFileSync(path.join(out, svgName), 'utf8').replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`);
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<style>html,body{margin:0;background:${bg || 'transparent'}}svg{display:block}</style>${svg}`);
    await p.screenshot({ path: path.join(out, file), omitBackground: !bg });
  };
  await png('azimut-logo.svg', 'azimut-logo.png', 1600, 352);
  await png('azimut-logo-light.svg', 'azimut-logo-light.png', 1600, 352);
  await png('azimut-icon.svg', 'azimut-icon-512.png', 512, 512);
  await png('azimut-icon.svg', 'azimut-icon-192.png', 192, 192);
  await png('azimut-icon.svg', 'apple-touch-icon.png', 180, 180);
  await b.close(); console.log('PNG écrits.');
})();
