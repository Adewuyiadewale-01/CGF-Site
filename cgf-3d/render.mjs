// Render deterministic stills of each scene with headless Chromium (GPU via ANGLE/SwiftShader).
// usage: node render.mjs [scene ...]  (env: W, H, SCALE, ARMED, T)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = server.address().port;

const jobs = (process.argv.slice(2).length ? process.argv.slice(2) : ['hero', 'cctv', 'alarm', 'access', 'power']);
const W = +(process.env.W || 1600), H = +(process.env.H || 900), SCALE = +(process.env.SCALE || 1);
fs.mkdirSync(path.join(root, 'renders'), { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const job of jobs) {
  const [scene, armed = process.env.ARMED ?? '1', t = process.env.T ?? '2.2', w = W, h = H] = job.split(':');
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: SCALE });
  page.on('pageerror', (e) => console.error(scene, 'ERR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error(scene, m.text()); });
  await page.goto(`http://localhost:${port}/scene.html?scene=${scene}&still&armed=${armed}&t=${t}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const out = path.join(root, 'renders', `${scene}${armed === '1' ? '' : '-a' + armed}.png`);
  await page.screenshot({ path: out });
  console.log('wrote', out);
  await page.close();
}
await browser.close();
server.close();
