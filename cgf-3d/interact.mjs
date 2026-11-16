import { chromium } from 'playwright';
const url = process.argv[2], out = process.argv[3];
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const log = [];
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', (e) => log.push('PAGEERR ' + e.message));
await p.goto(url); await p.waitForTimeout(3000);
// dropdowns
for (const k of ['security', 'electrical', 'company']) {
  await p.hover(`.links__btn[data-menu="${k}"]`); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/i-drop-${k}.png`, clip: { x: 0, y: 0, width: 1440, height: 560 } });
  log.push(k + ' expanded=' + await p.getAttribute(`.links__btn[data-menu="${k}"]`, 'aria-expanded'));
}
await p.mouse.move(700, 800); await p.waitForTimeout(600);
log.push('after leave hidden=' + await p.evaluate(() => document.getElementById('drop').hidden));
// hold to arm
const h = await (await p.$('#hold')).boundingBox();
await p.mouse.move(h.x + 20, h.y + 20); await p.mouse.down(); await p.waitForTimeout(2200);
log.push('state while holding=' + await p.textContent('#sim-state') + ' cams=' + await p.textContent('#sim-cams'));
await p.screenshot({ path: `${out}/i-armed.png` });
await p.mouse.up(); await p.waitForTimeout(1800);
log.push('state after release=' + await p.textContent('#sim-state'));
// form
await p.evaluate(() => document.getElementById('quote').scrollIntoView()); await p.waitForTimeout(1200);
log.push('done hidden initially=' + await p.evaluate(() => document.getElementById('qdone').hidden && getComputedStyle(document.getElementById('qdone')).display));
await p.click('#q-next'); await p.waitForTimeout(400);
log.push('step2 label=' + await p.textContent('#q-step-label'));
await p.click('#q-next'); await p.waitForTimeout(300);
log.push('empty suburb err=' + await p.textContent('#qerr'));
await p.fill('#q-suburb', 'Cronulla 2230'); await p.click('#q-next'); await p.waitForTimeout(300);
await p.fill('#q-name', 'Test'); await p.fill('#q-phone', '0400 000 000'); await p.click('#q-next'); await p.waitForTimeout(500);
log.push('done visible=' + await p.evaluate(() => getComputedStyle(document.getElementById('qdone')).display));
await p.screenshot({ path: `${out}/i-formdone.png` });
// mobile
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
m.on('pageerror', (e) => log.push('M PAGEERR ' + e.message));
await m.goto(url); await m.waitForTimeout(3000);
log.push('m overflowX=' + await m.evaluate(() => document.documentElement.scrollWidth - innerWidth));
await m.screenshot({ path: `${out}/i-m-hero.png` });
await m.evaluate(() => document.querySelector('.step[data-step="2"]').scrollIntoView({ block: 'center' })); await m.waitForTimeout(1200);
await m.screenshot({ path: `${out}/i-m-steps.png` });
await m.click('.nav__burger'); await m.waitForTimeout(400); await m.screenshot({ path: `${out}/i-m-menu.png` });
console.log(log.join('\n')); await b.close();
