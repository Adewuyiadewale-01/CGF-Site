import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(process.argv[2]); await p.waitForTimeout(2500);
const start = await p.evaluate(() => document.getElementById('wired-pin').getBoundingClientRect().top + scrollY - 90);
for (const f of [0.16, 0.25]) {
  await p.evaluate((y) => window.scrollTo(0, y), start + f * 4320); await p.waitForTimeout(1500);
  console.log(f, JSON.stringify(await p.evaluate(() => ({ y: scrollY, st: ScrollTrigger.getAll().filter(s => s.pin).map(s => [Math.round(s.start), Math.round(s.end), +s.progress.toFixed(3)]), num: document.getElementById('wired-num').textContent, bar: document.getElementById('wired-bar').style.transform }))));
}
await b.close();
