// CGF homepage — hero, how-it's-wired, services, map, quote form, FAQ, reviews.
import { $, $$, reduce, mobile, live3D, gsap, ScrollTrigger, lenis } from './site.js';

/* ---------- live 3D: loaded on demand ----------
   The page loads with the rendered stills (they match the scenes' first frame). Three.js and the
   scenes are fetched only once the page has finished loading AND the visitor interacts, so the 3D
   never competes with the first paint or blocks the main thread while the page is loading. */
let mountP = null;
const pageLoaded = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', () => r(), { once: true })));
const engaged = new Promise((r) => {
  const evs = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'];
  const go = () => { evs.forEach((e) => removeEventListener(e, go, true)); r(); };
  evs.forEach((e) => addEventListener(e, go, { capture: true, passive: true }));
});
const load3D = () => (mountP ||= Promise.all([pageLoaded, engaged]).then(() => import('./scenes.js')).then((m) => m.mountScene));

/* ---------- hero: live scene + hold to arm ---------- */
const heroStage = $('#hero-stage');
let hero = null;
let heroVisible = true;
if (live3D) {
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; hero && (heroVisible ? hero.resume() : hero.pause()); }).observe(heroStage);
  load3D().then((mountScene) => {
    // start from wherever the hold-to-arm control already is, so the hand-off from the still is seamless
    hero = mountScene(heroStage, { scene: 'hero', armed: simA, t: 0 });
    hero.setArmed(simTarget);
    if (!heroVisible) hero.pause();
    requestAnimationFrame(() => requestAnimationFrame(() => heroStage.classList.add('is-live')));
  });
}
const hold = $('#hold'), ring = $('#hold-ring');
let holding = false, simA = 0, simTarget = 0;
const down = (e) => { e.preventDefault(); holding = true; hold.classList.add('is-down'); simTarget = 1; hero?.setArmed(1); };
const up = () => { if (!holding) return; holding = false; hold.classList.remove('is-down'); simTarget = 0; hero?.setArmed(0); };
hold.addEventListener('pointerdown', down);
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hold.addEventListener(ev, up));
hold.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) down(e); });
hold.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
hold.addEventListener('contextmenu', (e) => e.preventDefault());
const callouts = $$('.callout');
(function tick() {
  const a = hero ? hero.armed : (simA += (simTarget - simA) * 0.08);
  ring.style.strokeDashoffset = (94.25 * (1 - a)).toFixed(2);
  $('#sim-cams').textContent = Math.round(3 * a);
  $('#sim-zones').textContent = Math.round(4 * a);
  const armed = a > 0.95, arming = a > 0.05 && !armed, st = $('#sim-state');
  st.textContent = armed ? 'Armed' : arming ? (holding ? 'Arming' : 'Disarming') : 'Idle';
  st.classList.toggle('is-on', a > 0.05);
  $('#hold-label').textContent = armed ? 'Property armed' : 'Hold to arm the property';
  if (hero && !mobile()) callouts.forEach((c) => { const p = hero.project(c.dataset.anchor); if (!p) return; c.style.transform = `translate(${p.x - 3}px, ${p.y - 12}px)`; c.classList.toggle('is-on', a > 0.35); });
  requestAnimationFrame(tick);
})();

/* ---------- how it's wired: one live scene, driven by scroll ---------- */
const steps = $$('.step'), railItems = $$('.wired__rail li'), wImg = $('#wired-img'), wTag = $('#wired-tag');
const nextItems = $$('#wired-next li'), wStage = $('#wired-stage'), wNum = $('#wired-num'), wName = $('#wired-name'), wBar = $('#wired-bar');
const NAMES = ['The switchboard', 'Power & lighting', 'Cameras', 'Alarm & sensors', 'Intercom & access', 'Support'];
const LAST = steps.length - 1;
let cur = -1, wired = null, lastQ = 0;
if (live3D) {
  let near = false, asked = false;
  new IntersectionObserver(([en]) => {
    near = en.isIntersecting;
    if (near && !wired && !asked) {
      asked = true;
      load3D().then((mountScene) => { wired = mountScene(wStage, { scene: 'wired', armed: 1, t: 0 }); wired.setProgress(lastQ); if (!near) wired.pause(); requestAnimationFrame(() => wStage.classList.add('is-live')); });
    } else if (wired) near ? wired.resume() : wired.pause();
  }, { rootMargin: '300px' }).observe(wStage);
} else steps.forEach((s) => { const i = new Image(); i.src = s.dataset.img; });
function setStep(i) {
  if (i === cur) return; cur = i;
  steps.forEach((s, k) => s.classList.toggle('is-on', k === i || mobile()));
  railItems.forEach((r, k) => r.classList.toggle('is-on', k === i));
  nextItems.forEach((li, k) => { li.classList.toggle('is-done', k + 1 <= i); li.classList.toggle('is-next', k + 1 === i + 1); });
  wNum.textContent = i === LAST ? '∞' : String(i + 1).padStart(2, '0'); wName.textContent = NAMES[i];
  wTag.textContent = steps[i].dataset.tag;
  if (!wired) { wImg.classList.add('is-swap'); setTimeout(() => { wImg.src = steps[i].dataset.img; wImg.alt = steps[i].querySelector('h3').textContent; wImg.classList.remove('is-swap'); }, 220); }
}
// Dwell: hold on each station for the first part of its scroll segment, then fly to the next.
const dwell = (p) => { const s = Math.min(LAST, p * LAST), i = Math.min(LAST - 1, Math.floor(s)), f = s - i; const g = Math.max(0, Math.min(1, (f - 0.42) / 0.58)); return (i + g * g * (3 - 2 * g)) / LAST; };
function setProgress(p) {
  const q = dwell(p); lastQ = q;
  wired?.setProgress(q);
  wBar.style.transform = `scaleX(${Math.max(0.04, p)})`;
  setStep(Math.min(LAST, Math.round(q * LAST)));
}
setStep(0);
ScrollTrigger.matchMedia({
  '(min-width: 861px)': () => {
    const st = ScrollTrigger.create({ trigger: '#wired-pin', start: 'top 90px', end: () => '+=' + steps.length * window.innerHeight * 0.8, pin: true, pinSpacing: true, onUpdate: (self) => setProgress(self.progress) });
    return () => st.kill();
  },
  '(max-width: 860px)': () => {
    // phones: steps stack and scroll under a sticky stage; the scene follows the step in view
    steps.forEach((s) => s.classList.add('is-on'));
    const sts = steps.map((s, k) => ScrollTrigger.create({ trigger: s, start: 'top 62%', end: 'bottom 62%', onToggle: (self) => { if (!self.isActive) return; lastQ = k / LAST; wired?.setProgress(k / LAST); wBar.style.transform = `scaleX(${Math.max(0.04, k / LAST)})`; setStep(k); } }));
    return () => sts.forEach((t) => t.kill());
  },
});

/* ---------- services: live discipline scenes ---------- */
if (live3D) {
  $$('[data-scene]').forEach((el) => {
    let api = null, near = false, asked = false;
    new IntersectionObserver(([en]) => {
      near = en.isIntersecting;
      if (near && !api && !asked) {
        asked = true;
        load3D().then((mountScene) => { api = mountScene(el, { scene: el.dataset.scene, armed: 1, t: 1.5 }); if (!near) api.pause(); requestAnimationFrame(() => el.classList.add('is-live')); });
      } else if (api) near ? api.resume() : api.pause();
    }, { rootMargin: '150px' }).observe(el);
  });
}

/* ---------- motion details ---------- */
if (!reduce) {
  gsap.from('.rail', { scaleX: 0, ease: 'none', scrollTrigger: { trigger: '.process', start: 'top 70%', end: 'top 20%', scrub: true } });
  $$('.reveal img').forEach((img) => gsap.fromTo(img, { clipPath: 'inset(18% 0 0 0 round 18px)', scale: 1.08 }, { clipPath: 'inset(0% 0 0 0 round 18px)', scale: 1, ease: 'power2.out', duration: 1.2, scrollTrigger: { trigger: img, start: 'top 88%' } }));
  gsap.to('.quote__bg img', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.quote', { y: 80, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'top 40%', scrub: true } });
}

/* ---------- service areas map ---------- */
const REGIONS = {
  sutherland: { label: 'Sutherland Shire · home base', p: 'Caringbah, Cronulla, Miranda, Sutherland, Engadine, Menai', x: 205.8, y: 803.9 },
  eastern: { label: 'Eastern Suburbs', p: 'Bondi, Randwick, Coogee, Maroubra, Double Bay', x: 452.8, y: 568.3 },
  'inner-west': { label: 'Inner West', p: 'Newtown, Marrickville, Leichhardt, Balmain, Ashfield', x: 331.7, y: 520.9 },
  'north-shore': { label: 'North Shore', p: 'Chatswood, Mosman, Lane Cove, Willoughby', x: 351.2, y: 325.8 },
  'northern-beaches': { label: 'Northern Beaches', p: 'Manly, Dee Why, Brookvale, Mona Vale', x: 461.3, y: 198.4 },
};
const HQ = { x: 283.3, y: 761.5 }, VB = 600;
const mapEl = $('#map'), mapSvg = $('#map-svg'), tip = $('#map-tip');
const phoneMQ = matchMedia('(max-width: 860px)');
let activeRegion = 'sutherland';
fetch('/assets/sydney-dots.svg').then((r) => r.text()).then((txt) => {
  mapSvg.innerHTML = txt;
  const svg = $('svg', mapSvg); svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Dot map of Greater Sydney with CGF service regions highlighted');
  const hq = document.createElement('div'); hq.className = 'map__hq'; hq.innerHTML = '<i></i><em>CGF HQ · Caringbah</em>'; mapEl.appendChild(hq);
  const place = () => { const k = mapSvg.clientWidth / VB; hq.style.left = HQ.x * k + 'px'; hq.style.top = (24 + HQ.y * k) + 'px'; setRegion(activeRegion, true); };
  Object.keys(REGIONS).forEach((key) => {
    const g = svg.getElementById(key); if (!g) return;
    g.addEventListener('pointerenter', () => setRegion(key));
  });
  $$('#regions li').forEach((li) => {
    li.tabIndex = 0;
    li.addEventListener('pointerenter', () => setRegion(li.dataset.region));
    li.addEventListener('focus', () => { if (!phoneMQ.matches) setRegion(li.dataset.region); });
  });
  window.addEventListener('resize', place); place();
  if (!reduce) gsap.from($$('g', svg), { opacity: 0, duration: 1, stagger: 0.12, scrollTrigger: { trigger: mapEl, start: 'top 75%' } });
  buildPhoneRegions(txt);
});

// Phones: every region gets its own body (suburbs + a map panned to that region). Sutherland starts open;
// the others expand one after another as they scroll into view and stay open. Tapping a title toggles it.
function buildPhoneRegions(txt) {
  const items = $$('#regions li');
  items.forEach((li, idx) => {
    const key = li.dataset.region, r = REGIONS[key];
    const body = document.createElement('div'); body.className = 'r-body';
    // one lightweight image per region (not 5 live SVG copies): the same dot map with this region lit
    const lit = txt.replace('</svg>', `<style>#${key}{fill:#FF5B2E;fill-opacity:.95}</style></svg>`);
    const src = URL.createObjectURL(new Blob([lit], { type: 'image/svg+xml' }));
    body.innerHTML = `<div><p>${$('span', li).textContent}</p><div class="r-map"><img class="map__svg" src="${src}" alt="Dot map of Sydney with ${r.label.split(' · ')[0]} highlighted" width="600" height="990" decoding="async"><div class="map__hq"><i></i><em>CGF HQ · Caringbah</em></div></div></div>`;
    li.appendChild(body);
    li.setAttribute('aria-expanded', 'false');
    if (idx === 0) open(li);
    li.addEventListener('click', (e) => { if (!phoneMQ.matches || e.target.closest('.r-map')) return; li.classList.contains('is-open') ? close(li) : open(li); });
    li.addEventListener('keydown', (e) => { if (phoneMQ.matches && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); li.click(); } });
  });
  const pan = () => items.forEach((li) => {
    const key = li.dataset.region, box = $('.r-map', li), layer = $('.map__svg', box), pin = $('.map__hq', box);
    const W = box.clientWidth, H = box.clientHeight; if (!W) return;
    const k = W / VB, svgH = 990 * k;
    const y = key === 'sutherland' ? (REGIONS[key].y + HQ.y) / 2 : REGIONS[key].y;
    const off = Math.max(Math.min(0, H - svgH), Math.min(0, H / 2 - y * k));
    layer.style.transform = `translateY(${off}px)`;
    const hy = off + HQ.y * k;
    pin.style.left = HQ.x * k + 'px'; pin.style.top = hy + 'px'; pin.style.opacity = hy < 30 || hy > H - 30 ? 0 : 1;
  });
  pan(); window.addEventListener('resize', pan);
  // Expand strictly in order, one at a time: the next region opens once its title has come up past ~70% of
  // the screen and the previous one has finished expanding (which pushes the rest down). Once open, it stays open.
  let next = 1, last = 0, ticking = false;
  const check = () => {
    ticking = false;
    if (!phoneMQ.matches || next >= items.length || performance.now() - last < 650) return;
    const t = items[next].getBoundingClientRect().top;
    if (t > 0 && t < innerHeight * 0.7) { // only while its title is on screen (not when jumping past)
      open(items[next]); next++; last = performance.now();
      setTimeout(() => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, 700); // keep going if they're already in view
    }
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
}
function open(li) { li.classList.add('is-open'); li.setAttribute('aria-expanded', 'true'); }
function close(li) { li.classList.remove('is-open'); li.setAttribute('aria-expanded', 'false'); }

function setRegion(key, force) {
  if (!REGIONS[key] || (key === activeRegion && !force)) return;
  activeRegion = key;
  $$('#map-svg g').forEach((g) => g.classList.toggle('is-on', g.id === key));
  $$('#regions li').forEach((li) => li.classList.toggle('is-on', li.dataset.region === key));
  const r = REGIONS[key], k = mapSvg.clientWidth / VB;
  $('#tip-h').textContent = r.label; $('#tip-p').textContent = r.p;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.x * k - tw / 2, y = 24 + r.y * k + 28;
  if (key === 'sutherland') { x = 28; y = 24 + HQ.y * k + 56; }
  x = Math.max(16, Math.min(mapEl.clientWidth - tw - 16, x)); y = Math.max(56, Math.min(mapEl.clientHeight - th - 40, y));
  tip.style.transform = `translate(${x}px, ${y}px)`;
}

/* ---------- quote form (3 steps) ---------- */
const form = $('#qform'), qsteps = $$('.qstep', form), bars = $$('.qform__bar i', form);
const labels = ['Step 1 of 3 · The job', 'Step 2 of 3 · The property', 'Step 3 of 3 · Your details'];
const foots = ['Takes about a minute · Next: where the property is', 'Next: how we reach you', 'We’ll call within 24 hours'];
let q = 0;
const err = $('#qerr');
function showQ(i) {
  q = i; qsteps.forEach((s, k) => s.classList.toggle('is-on', k === i)); bars.forEach((b, k) => b.classList.toggle('on', k <= i));
  $('#q-step-label').textContent = labels[i]; $('#q-foot').textContent = foots[i];
  $('#q-back').hidden = i === 0; $('#q-next').firstChild.textContent = i === 2 ? 'Request my free quote ' : 'Continue ';
  err.hidden = true;
}
function validate(i) {
  if (i === 0 && !$$('input[name="need"]:checked', form).length) return 'Choose at least one thing you need.';
  const bad = $$('input[required]', qsteps[i]).filter((el) => !el.value.trim());
  $$('input', qsteps[i]).forEach((el) => el.removeAttribute('aria-invalid'));
  bad.forEach((el) => el.setAttribute('aria-invalid', 'true'));
  if (bad.length) { bad[0].focus(); return i === 1 ? 'Add a suburb or postcode so we can send the right team.' : 'Add your name and a phone number so we can call you back.'; }
  if (i === 2) { const ph = $('#q-phone').value.replace(/\D/g, ''); if (ph.length < 8) { $('#q-phone').setAttribute('aria-invalid', 'true'); return 'That phone number looks short. Check it and try again.'; } }
  return '';
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = validate(q); if (msg) { err.textContent = msg; err.hidden = false; return; }
  if (q < 2) return showQ(q + 1);
  // TODO(build): post FormData(form) to CGF's existing enquiry endpoint / CRM.
  qsteps.forEach((s) => s.classList.remove('is-on')); $('.qform__foot', form).hidden = true; $('.qform__top', form).hidden = true; $('#qdone').hidden = false;
});
$('#q-back').addEventListener('click', () => showQ(Math.max(0, q - 1)));

/* ---------- FAQ: one open at a time ---------- */
$$('.faq details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) $$('.faq details').forEach((o) => o !== d && (o.open = false)); ScrollTrigger.refresh(); }));

window.addEventListener('load', () => ScrollTrigger.refresh());

/* ---------- who we work with: photo peek ---------- */
{
  const table = $('.who .table'), peek = $('.who .peek');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  if (table && peek) {
    const imgs = $$('.peek__frame img', peek), caps = $$('figcaption span', peek);
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false;
    const show = (i) => { imgs.forEach((im, k) => im.classList.toggle('is-on', k === i)); caps.forEach((c, k) => c.classList.toggle('is-on', k === i)); };
    const tick = () => {
      const k = reduce ? 1 : 0.16; x += (tx - x) * k; y += (ty - y) * k;
      const tilt = reduce ? 0 : Math.max(-8, Math.min(8, (tx - x) * 0.06));
      peek.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
      raf = on || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    const aim = (cx, cy) => {
      const h = peek.offsetHeight || 340;
      tx = cx + 28; ty = Math.max(12, Math.min(innerHeight - h - 12, cy - h * 0.5));
      if (tx + 260 > innerWidth - 12) tx = cx - 288;
    };
    const start = (cx, cy, jump) => { aim(cx, cy); if (jump) { x = tx; y = ty; } on = true; peek.classList.add('is-on'); if (!raf) raf = requestAnimationFrame(tick); };
    const stop = () => { on = false; peek.classList.remove('is-on'); };
    table.addEventListener('pointermove', (e) => {
      if (!fine.matches || e.pointerType !== 'mouse') return;
      const row = e.target.closest('a.tr[data-peek]');
      if (!row) return stop();
      show(+row.dataset.peek); start(e.clientX, e.clientY, !on);
    });
    table.addEventListener('pointerleave', stop);
    window.addEventListener('scroll', () => { if (on && !table.matches(':hover')) stop(); }, { passive: true });
    $$('a.tr[data-peek]', table).forEach((row) => {
      row.addEventListener('focus', () => {
        if (!fine.matches || !row.matches(':focus-visible')) return;
        const r = row.getBoundingClientRect(); show(+row.dataset.peek); start(r.right - 320, r.top + r.height / 2, !on);
      });
      row.addEventListener('blur', stop);
    });
    // load the four photos just before the table scrolls in, so the first reveal isn't blank
    new IntersectionObserver((es, o) => { if (es.some((e) => e.isIntersecting)) { imgs.forEach((im) => { im.loading = 'eager'; }); o.disconnect(); } }, { rootMargin: '600px' }).observe(table);
  }
}

/* ---------- reviews: loop each column by cloning its cards once ---------- */
if (!reduce) $$('.quotes__track').forEach((track) => {
  [...track.children].forEach((card) => { const c = card.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
});

/* ---------- arriving from another page at /#section: re-scroll once pinned sections have laid out ---------- */
if (location.hash) addEventListener('load', () => setTimeout(() => {
  const el = document.getElementById(location.hash.slice(1)); if (!el) return;
  ScrollTrigger.refresh(); lenis?.resize();
  // jump (no animation): the page was just opened at this section
  lenis ? lenis.scrollTo(el, { offset: -70, immediate: true, force: true }) : el.scrollIntoView();
}, 80));
