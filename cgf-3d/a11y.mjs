// Accessibility check with axe-core (the engine behind Lighthouse's accessibility score).
// Usage: node a11y.mjs [url ...]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const axe = readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const urls = process.argv.slice(2).length ? process.argv.slice(2) : ['http://localhost:4190/', 'http://localhost:4190/security/cctv/'];
const b = await chromium.launch();
for (const url of urls) {
  for (const [w, h] of [[1440, 900], [412, 823]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 });
    await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    await p.addScriptTag({ content: axe });
    const r = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, n: v.nodes.length, ex: v.nodes.slice(0, 6).map((x) => x.target.join(' ') + (x.any[0]?.data?.contrastRatio ? ` (${x.any[0].data.contrastRatio}:1 ${x.any[0].data.fgColor} on ${x.any[0].data.bgColor})` : '')) })));
    console.log(url.replace('http://localhost:4190', ''), w, r.length ? JSON.stringify(r, null, 1) : 'no violations');
    await p.close();
  }
}
await b.close();
