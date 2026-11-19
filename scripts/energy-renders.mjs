// Render the Nanomantic 3D assets to transparent, trimmed PNGs (concepts/energy/assets/).
// usage: node scripts/energy-renders.mjs [name ...]   (needs the static server on :4420)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = require(path.join(root, 'cgf-3d/node_modules/playwright'));
const sharp = require('sharp');

const JOBS = {
  'street-noon':    'asset=street&phase=0.6',
  'street-evening': 'asset=street&phase=2.5',
  house:            'asset=house',
  strata:           'asset=strata',
  shop:             'asset=shop',
  'panel-exploded': 'asset=panel&t=1',
  'battery-exploded': 'asset=battery&t=1',
  'flight-roof':    'asset=flight&cam=-7,16,26,-21.5,3.6,0.5&phase=0.5',
  'flight-evening': 'asset=flight&cam=20,19,33,-1,3.6,0&phase=2.35',
  diorama:          'asset=diorama',
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const name of names) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error(name, e.message));
  await page.goto(`http://localhost:4420/render.html?${JOBS[name]}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  await page.waitForTimeout(200);
  const buf = await page.screenshot({ omitBackground: true });
  const out = path.join(root, 'concepts/energy/assets', name + '.png');
  await sharp(buf).trim({ threshold: 1 }).extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(out);
  const m = await sharp(out).metadata(); console.log('wrote', name, m.width + 'x' + m.height);
  await page.close();
}
await browser.close();
