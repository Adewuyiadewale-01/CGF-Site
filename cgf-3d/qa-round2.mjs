// QA for: logo marquee, who-we-work-with photo peek, review wall, process copy.
import { chromium } from 'playwright';
const OUT = process.argv[2] || '.';
const URL = 'http://localhost:4190/';
const b = await chromium.launch({ args: ['--use-angle=metal'] });
const errs = [];
const shot = async (p, sel, name, opts = {}) => { const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(opts.wait ?? 900); await p.screenshot({ path: `${OUT}/${name}.png` }); };

// desktop
let p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', (e) => errs.push('desktop: ' + e.message));
p.on('console', (m) => m.type() === 'error' && errs.push('desktop console: ' + m.text()));
await p.goto(URL, { waitUntil: 'networkidle' });
await p.evaluate(() => window.scrollTo(0, document.querySelector('.marquee').offsetTop - 300));
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/d-marquee.png`, clip: { x: 0, y: 200, width: 1440, height: 300 } });
const logos = await p.$$eval('.marquee__row img', (a) => a.map((i) => [i.getAttribute('src'), i.naturalWidth, Math.round(i.getBoundingClientRect().width)]));
console.log('logos', JSON.stringify(logos.slice(0, 6)));

await p.evaluate(() => window.scrollTo(0, document.querySelector('.who').offsetTop));
await p.waitForTimeout(1200);
const rows = await p.$$('.who a.tr[data-peek]');
const r = await rows[1].boundingBox();
await p.mouse.move(r.x + 300, r.y + r.height / 2, { steps: 6 });
await p.waitForTimeout(900);
await p.screenshot({ path: `${OUT}/d-who-strata.png` });
const r3 = await rows[2].boundingBox();
await p.mouse.move(r3.x + 700, r3.y + r3.height / 2, { steps: 10 });
await p.waitForTimeout(900);
await p.screenshot({ path: `${OUT}/d-who-business.png` });
console.log('peek on:', await p.$eval('.peek', (e) => e.classList.contains('is-on')));
await p.mouse.move(5, 5);
await p.waitForTimeout(500);
console.log('peek off after leave:', !(await p.$eval('.peek', (e) => e.classList.contains('is-on'))));

await shot(p, '.process', 'd-process');
await p.evaluate(() => window.scrollTo(0, document.querySelector('#reviews').offsetTop - 40));
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/d-reviews.png` });
const t0 = await p.$$eval('.quotes__track', (a) => a.map((t) => getComputedStyle(t).transform));
await p.waitForTimeout(1500);
const t1 = await p.$$eval('.quotes__track', (a) => a.map((t) => getComputedStyle(t).transform));
console.log('review tracks move:', JSON.stringify(t0), '->', JSON.stringify(t1));
console.log('cards per track:', await p.$$eval('.quotes__track', (a) => a.map((t) => t.children.length)));
console.log('desktop overflow:', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
await p.close();

// mobile
p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => errs.push('mobile: ' + e.message));
await p.goto(URL, { waitUntil: 'networkidle' });
for (const [sel, name] of [['.marquee', 'm-marquee'], ['.who .table', 'm-who'], ['.process .steps5', 'm-process'], ['.quotes', 'm-reviews']]) {
  await p.evaluate((s) => window.scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY - 120), sel);
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `${OUT}/${name}.png` });
}
console.log('mobile overflow:', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
await b.close();
console.log('errors:', errs.length ? errs : 'none');
