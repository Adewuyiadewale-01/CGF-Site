// Mobile QA: hero fits one screen with the arm button visible; wired stage hides text behind it; areas accordion.
import { chromium } from 'playwright';
const OUT = process.argv[2] || '.';
const only = process.argv[3] || 'all';
const b = await chromium.launch({ args: ['--use-angle=metal'] });
const errs = [];
for (const [w, h] of [[390, 844], [375, 667]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => errs.push(`${w}: ${e.message}`));
  await p.goto('http://localhost:4190/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  if (only === 'all' || only === 'hero') {
    await p.screenshot({ path: `${OUT}/hero-${w}x${h}.png` });
    const m = await p.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      return { heroH: Math.round(r('.hero').height), vh: innerHeight, trustBottom: Math.round(r('.hero__trust').bottom), hold: [Math.round(r('#hold').top), Math.round(r('#hold').bottom)], copyTop: Math.round(r('.hero__copy').top) };
    });
    console.log(w, h, JSON.stringify(m));
    // hold to arm
    const hb = await p.$('#hold'); const bb = await hb.boundingBox();
    await p.touchscreen.tap; // noop: use pointer events below
    await p.mouse.move(bb.x + 20, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(1600);
    await p.screenshot({ path: `${OUT}/hero-armed-${w}x${h}.png` });
    console.log('state while held:', await p.$eval('#sim-state', (e) => e.textContent));
    await p.mouse.up();
  }
  if (w === 390 && (only === 'all' || only === 'wired')) {
    const top = await p.evaluate(() => document.querySelector('.wired__steps').getBoundingClientRect().top + scrollY);
    for (const [k, dy] of [[0, -200], [1, 200], [2, 600], [3, 1000]]) {
      await p.evaluate((y) => window.scrollTo(0, y), top + dy); await p.waitForTimeout(900);
      await p.screenshot({ path: `${OUT}/wired-${k}.png` });
    }
  }
  if (w === 390 && (only === 'all' || only === 'areas')) {
    await p.evaluate(() => window.scrollTo(0, document.querySelector('#areas').getBoundingClientRect().top + scrollY - 60)); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/areas-0.png` });
    const open = () => p.$$eval('#regions li.is-open', (a) => a.map((e) => e.dataset.region.slice(0, 5)).join(','));
    const log = [];
    for (let k = 1; k <= 12; k++) { // scroll down like a person: small flicks with pauses
      await p.evaluate(() => window.scrollBy(0, 260)); await p.waitForTimeout(700);
      log.push(await open());
      if (k === 2 || k === 4 || k === 7) await p.screenshot({ path: `${OUT}/areas-${k}.png` });
    }
    console.log(log.join(' | '));
    // tap toggles: close then reopen Inner West
    const iw = await p.$('#regions li[data-region="inner-west"] b');
    await iw.scrollIntoViewIfNeeded(); await iw.tap(); await p.waitForTimeout(900);
    const a = await open(); await iw.tap(); await p.waitForTimeout(900);
    console.log('tap closes ->', a, '| tap reopens ->', await open());
    await p.screenshot({ path: `${OUT}/areas-tap.png` });
  }
  console.log(w, 'overflow-x:', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await p.close();
}
await b.close();
console.log('errors:', errs.length ? errs : 'none');
