// CGF homepage — interaction layer.
// Three.js scenes (scenes.js) + GSAP ScrollTrigger + Lenis. Everything degrades to the
// rendered stills when WebGL is unavailable or the visitor prefers reduced motion.
import { mountScene } from './scenes.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => matchMedia('(max-width: 860px)').matches;
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const live3D = hasGL && !reduce;
const { gsap, ScrollTrigger } = window;
gsap?.registerPlugin(ScrollTrigger);

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduce && window.Lenis) {
  lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToHash = (hash) => { const el = hash && hash.length > 1 && document.getElementById(hash.slice(1)); if (!el) return false; lenis ? lenis.scrollTo(el, { offset: -70 }) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return true; };
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  if (scrollToHash(a.getAttribute('href'))) { e.preventDefault(); closeDrop(); closeMobile(); }
});

/* ---------- nav: one shared dropdown ---------- */
const nav = $('#nav'), drop = $('#drop'), stage = $('.drop__stage', drop);
const triggers = $$('.links__btn[data-menu]');
let openKey = null, hoverT = null, leaveT = null;
function placeDrop(key) {
  const btn = triggers.find((b) => b.dataset.menu === key), menu = $(`.drop__menu[data-menu="${key}"]`);
  $$('.drop__menu', drop).forEach((m) => m.classList.toggle('is-on', m === menu));
  const w = menu.offsetWidth, h = menu.offsetHeight;
  const navBox = nav.querySelector('.nav__in').getBoundingClientRect(), b = btn.getBoundingClientRect();
  const left = Math.max(16, Math.min(window.innerWidth - w - 16, b.left + b.width / 2 - 200));
  drop.style.width = w + 'px'; drop.style.height = h + 'px'; drop.style.left = left + 'px';
  drop.style.top = (navBox.bottom + 10) + 'px'; drop.style.position = 'fixed';
}
function openDrop(key) {
  clearTimeout(leaveT);
  if (openKey === key) return;
  const wasOpen = !!openKey;
  openKey = key;
  triggers.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.menu === key)));
  if (!wasOpen) { drop.style.transition = 'none'; placeDrop(key); drop.offsetHeight; drop.style.transition = ''; drop.hidden = false; }
  else placeDrop(key);
  nav.classList.remove('is-hidden');
}
function closeDrop() { clearTimeout(hoverT); if (!openKey) return; openKey = null; drop.hidden = true; triggers.forEach((b) => b.setAttribute('aria-expanded', 'false')); }
triggers.forEach((btn) => {
  btn.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; clearTimeout(hoverT); hoverT = setTimeout(() => openDrop(btn.dataset.menu), openKey ? 0 : 120); });
  btn.addEventListener('pointerleave', () => { clearTimeout(hoverT); leaveT = setTimeout(closeDrop, 220); });
  btn.addEventListener('click', () => (openKey === btn.dataset.menu ? closeDrop() : openDrop(btn.dataset.menu)));
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); openDrop(btn.dataset.menu); $(`.drop__menu[data-menu="${btn.dataset.menu}"] a`)?.focus(); } });
});
drop.addEventListener('pointerenter', () => clearTimeout(leaveT));
drop.addEventListener('pointerleave', () => { leaveT = setTimeout(closeDrop, 220); });
drop.addEventListener('keydown', (e) => {
  const items = $$('.drop__menu.is-on a', drop), i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openKey) { const k = openKey; closeDrop(); triggers.find((b) => b.dataset.menu === k)?.focus(); } });
document.addEventListener('pointerdown', (e) => { if (openKey && !e.target.closest('.drop, .links')) closeDrop(); });
window.addEventListener('resize', () => openKey && placeDrop(openKey));

// solid after the hero; hide on scroll down, show on scroll up
let lastY = 0;
const onScroll = (y) => {
  const heroH = $('.hero').offsetHeight;
  nav.dataset.state = y > Math.min(heroH * 0.5, 420) ? 'solid' : 'top';
  if (!openKey && !document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > heroH && y > lastY + 2);
  if (y < lastY - 2) nav.classList.remove('is-hidden');
  lastY = y;
  if (openKey) placeDrop(openKey);
};
lenis ? lenis.on('scroll', ({ scroll }) => onScroll(scroll)) : window.addEventListener('scroll', () => onScroll(scrollY), { passive: true });

/* ---------- mobile menu ---------- */
const mm = $('#mobile-menu'), burger = $('.nav__burger');
function openMobile() { mm.hidden = false; burger.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); lenis?.stop(); $('.mmenu__x', mm).focus(); }
function closeMobile() { if (mm.hidden) return; mm.hidden = true; burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); lenis?.start(); }
burger.addEventListener('click', openMobile);
$('.mmenu__x', mm).addEventListener('click', () => { closeMobile(); burger.focus(); });
mm.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMobile(); burger.focus(); } });

/* ---------- hero: live scene + hold to arm ---------- */
const heroStage = $('#hero-stage');
let hero = null;
if (live3D) {
  hero = mountScene(heroStage, { scene: 'hero', armed: 0, t: 0 });
  requestAnimationFrame(() => requestAnimationFrame(() => heroStage.classList.add('is-live')));
  new IntersectionObserver(([en]) => (en.isIntersecting ? hero.resume() : hero.pause())).observe(heroStage);
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
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting) {
      if (!wired) { wired = mountScene(wStage, { scene: 'wired', armed: 1, t: 0 }); wired.setProgress(lastQ); requestAnimationFrame(() => wStage.classList.add('is-live')); }
      else wired.resume();
    } else wired?.pause();
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
    let api = null;
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) {
        if (!api) { api = mountScene(el, { scene: el.dataset.scene, armed: 1, t: 1.5 }); requestAnimationFrame(() => el.classList.add('is-live')); }
        else api.resume();
      } else api?.pause();
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
let activeRegion = 'sutherland';
fetch('assets/sydney-dots.svg').then((r) => r.text()).then((txt) => {
  mapSvg.innerHTML = txt;
  const svg = $('svg', mapSvg); svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Dot map of Greater Sydney with CGF service regions highlighted');
  const hq = document.createElement('div'); hq.className = 'map__hq'; hq.innerHTML = '<i></i><em>CGF HQ · Caringbah</em>'; mapEl.appendChild(hq);
  const place = () => { const k = mapSvg.clientWidth / VB; hq.style.left = HQ.x * k + 'px'; hq.style.top = (24 + HQ.y * k) + 'px'; setRegion(activeRegion, true); };
  Object.keys(REGIONS).forEach((key) => {
    const g = svg.getElementById(key); if (!g) return;
    g.addEventListener('pointerenter', () => setRegion(key));
  });
  $$('#regions li').forEach((li) => { li.addEventListener('pointerenter', () => setRegion(li.dataset.region)); li.addEventListener('click', () => setRegion(li.dataset.region)); li.tabIndex = 0; li.addEventListener('focus', () => setRegion(li.dataset.region)); });
  window.addEventListener('resize', place); place();
  if (!reduce) gsap.from($$('g', svg), { opacity: 0, duration: 1, stagger: 0.12, scrollTrigger: { trigger: mapEl, start: 'top 75%' } });
});
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
