// Render the Vyre 3D assets for Figma and the site (concepts/router/assets/).
// usage: node scripts/router-renders.mjs [name ...]   (needs the static server on :4430)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = require(path.join(root, 'cgf-3d/node_modules/playwright'));
const sharp = require('sharp');

// name: [query, width, height, trim]
const JOBS = {
  hero:            ['asset=hero', 1600, 1000],
  'hero-wide':     ['asset=hero&dist=8.2&lookY=1.3&camY=1.9&lookX=-1.55', 1600, 1000],
  'hero-turn':     ['asset=hero&spin=1.1&tilt=0.35&t=3.1', 1600, 1000],
  studio:          ['asset=studio', 1600, 900],
  'single-graphite': ['asset=single&f=graphite', 900, 1100],
  'single-bone':   ['asset=single&f=bone', 900, 1100],
  'single-cobalt': ['asset=single&f=cobalt', 900, 1100],
  plan:            ['asset=plan', 1600, 1100, true],
  'plan-dark':     ['asset=plan-dark', 1600, 1100],
  signal:          ['asset=signal', 1600, 1100],
  macro:           ['asset=macro', 1400, 1000],
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const name of names) {
  const [qs, w, h, trim] = JOBS[name];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error(name, e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error(name, m.text()); });
  await page.goto(`http://localhost:4430/render.html?${qs}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  let img = sharp(await page.screenshot({ omitBackground: !!trim }));
  if (trim) img = img.trim({ threshold: 1 }).extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const out = path.join(root, 'concepts/router/assets', name + (trim ? '.png' : '.jpg'));
  await (trim ? img.png({ compressionLevel: 9 }) : img.jpeg({ quality: 90 })).toFile(out);
  const m = await sharp(out).metadata(); console.log('wrote', name, m.width + 'x' + m.height);
  await page.close();
}
await browser.close();
