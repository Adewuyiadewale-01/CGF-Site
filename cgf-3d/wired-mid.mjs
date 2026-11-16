import { chromium } from 'playwright';
const url = process.argv[2], out = process.argv[3];
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const log = []; p.on('pageerror', (e) => log.push('ERR ' + e.message));
await p.goto(url); await p.waitForTimeout(2500);
const start = await p.evaluate(() => document.getElementById('wired-pin').getBoundingClientRect().top + scrollY - 90);
const len = 6 * 900 * 0.8;
for (const [i, f] of [[0, 0.16], [1, 0.36], [2, 0.98]]) { await p.evaluate((y) => window.scrollTo(0, y), start + f * len); await p.waitForTimeout(1600); await p.screenshot({ path: `${out}/wm-${i}.png`, clip: { x: 620, y: 140, width: 820, height: 620 } }); }
const m = await b.newPage({ viewport: { width: 390, height: 844 } }); m.on('pageerror', (e) => log.push('M ERR ' + e.message));
await m.goto(url); await m.waitForTimeout(2500);
for (const k of [1, 3]) { await m.evaluate((k) => document.querySelector(`.step[data-step="${k}"]`).scrollIntoView({ block: 'center' }), k); await m.waitForTimeout(1800); await m.screenshot({ path: `${out}/wmob-${k}.png` }); log.push('mobile step ' + k + ' num=' + await m.textContent('#wired-num')); }
log.push('m overflowX=' + await m.evaluate(() => document.documentElement.scrollWidth - innerWidth));
console.log(log.join('\n')); await b.close();
