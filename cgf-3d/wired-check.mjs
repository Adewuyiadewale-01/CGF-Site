import { chromium } from 'playwright';
const url = process.argv[2], out = process.argv[3];
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const log = []; p.on('pageerror', (e) => log.push('ERR ' + e.message)); p.on('console', (m) => m.type() === 'error' && log.push('CON ' + m.text()));
await p.goto(url); await p.waitForTimeout(2500);
const start = await p.evaluate(() => document.getElementById('wired-pin').getBoundingClientRect().top + scrollY - 90);
const len = 6 * 900 * 0.8;
const fr = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
for (let i = 0; i < fr.length; i++) {
  await p.mouse.wheel(0, 0);
  await p.evaluate((y) => window.scrollTo(0, y), start + fr[i] * len);
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${out}/w-${String(i).padStart(2, '0')}.png` });
  log.push(fr[i] + ' num=' + (await p.textContent('#wired-num')) + ' name=' + (await p.textContent('#wired-name')) + ' live=' + (await p.evaluate(() => document.getElementById('wired-stage').classList.contains('is-live'))));
}
console.log(log.join('\n')); await b.close();
