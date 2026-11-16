import { chromium } from 'playwright';
const url = process.argv[2]; const out = process.argv[3];
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const log = [];
for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => log.push(tag + ' PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') log.push(tag + ' ' + m.text()); });
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  log.push(`${tag} height=${total} overflowX=${await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)}`);
  let i = 0;
  for (let y = 0; y < total; y += h * 0.9) {
    await p.evaluate((y) => { window.__lenis?.scrollTo?.(y, { immediate: true }); window.scrollTo(0, y); }, y);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/${tag}-${String(i++).padStart(2, '0')}.png` });
  }
  await p.close();
}
console.log(log.join('\n')); await b.close();
