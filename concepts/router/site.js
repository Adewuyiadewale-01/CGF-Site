// Vyre — the page: three live scenes (hero, planner, signal map) and the small interactions around them.
import Lenis from 'lenis';
import { THREE, V, makeStage, heroScene } from './vyre.js';
import { mapSVG, LIGHT, DARK, routeFor, roundedPath, DEVICES, AP, HOPS, fieldFor, paintField, W as MW, H as MH } from './map.js';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
if (!hasGL) document.documentElement.classList.add('no-webgl');

/* ---------- smooth scroll ---------- */
const lenis = reduced ? null : new Lenis({ lerp: 0.1, smoothWheel: true });
window.lenis = lenis;
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault();
  lenis ? lenis.scrollTo(t, { offset: -84 }) : t.scrollIntoView({ behavior: 'smooth' });
}));

/* ---------- headings rise word by word; blocks fade up; numbers count ---------- */
$$('.split').forEach((el) => {
  let i = 0;
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((w) => { if (!w) return; if (/^\s+$/.test(w)) { frag.append(w); return; } const s = document.createElement('span'); s.className = 'w'; s.innerHTML = `<span style="--i:${i++}">${w}</span>`; frag.append(s); });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
  });
  walk(el);
});
const fmt = (v, dec) => v.toLocaleString('en-AU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
function count(el) {
  const to = +el.dataset.count, dec = +(el.dataset.dec || 0), t0 = performance.now(), dur = 1400;
  const step = (now) => { const k = clamp((now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e, dec); if (k < 1) requestAnimationFrame(step); };
  reduced ? (el.textContent = fmt(to, dec)) : requestAnimationFrame(step);
}
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); io.unobserve(e.target);
  $$('[data-count]', e.target).forEach(count);
  if (e.target.matches('[data-count]')) count(e.target);
}), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
$$('.reveal, .split, .giant, .macro, .score').forEach((el) => io.observe(el));

/* ---------- nav: glass once scrolled, tucks away going down ---------- */
const nav = $('#nav'); let lastY = 0;
function navTick(y) { nav.classList.toggle('stuck', y > 20); nav.classList.toggle('hide', y > 600 && y > lastY + 2); if (y < lastY - 2) nav.classList.remove('hide'); lastY = y; }

/* ---------- views: render only while on screen ---------- */
const views = [];
function view(canvas, opts, build) {
  if (!hasGL || !canvas) return null;
  const st = makeStage(canvas, opts), v = { st, on: false, ...build(st) };
  new IntersectionObserver(([e]) => { v.on = e.isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
  views.push(v); return v;
}
addEventListener('resize', () => views.forEach((v) => { v.st.resize(); v.fit?.(); }));
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => { pointer.tx = e.clientX / innerWidth * 2 - 1; pointer.ty = e.clientY / innerHeight * 2 - 1; });
const proj = new THREE.Vector3();
const toScreen = (st, p) => { proj.copy(p).project(st.camera); const c = st.canvas; return [(proj.x + 1) / 2 * c.clientWidth, (1 - proj.y) / 2 * c.clientHeight]; };

/* ---------- hero: the column, packets streaming past; the lane card hangs off its light ---------- */
const heroEl = $('.hero'), lane = $('#lane');
view($('#hero3d'), { bg: '#0B0A10', bloom: 1.05, fov: 30 }, (st) => {
  let h = null;
  const fit = () => { const w = st.canvas.clientWidth, narrow = w < 820; st.scene.clear(); h = heroScene(st, narrow ? { dist: 7.4, lookY: 1.05, camY: 1.7, lookX: 0 } : { dist: 8.2, lookY: 1.3, camY: 1.9, lookX: -1.55 }); };
  fit();
  return {
    fit,
    tick(t) {
      const r = heroEl.getBoundingClientRect(), k = clamp(-r.top / r.height);
      h.set(t, { spin: (reduced ? 0 : t * 0.08) + k * 1.6 + pointer.x * 0.25, tilt: pointer.x * 0.06 + k * 0.25, light: 0.75 + 0.25 * Math.sin(t * 1.3) });
      st.camera.position.y += -pointer.y * 0.12;
      if (lane && innerWidth > 1180) {
        const [x, y] = toScreen(st, V(-0.02, 1.45, 0.56)), gap = 90;
        lane.style.left = (x - gap - lane.offsetWidth) + 'px'; lane.style.top = (y - lane.offsetHeight / 2) + 'px'; lane.style.setProperty('--leader', gap + 'px');
      }
    },
  };
});
// the latency trace: jagged before Vyre, calm after, always moving
const trace = $('#trace');
function drawTrace(t) {
  if (!trace) return;
  let rough = '', calm = '';
  for (let i = 0; i <= 64; i++) {
    const x = i * 5, n = i + Math.floor(t * 8);
    if (i <= 26) rough += (i ? 'L' : 'M') + x + ' ' + (36 - Math.abs(Math.sin(n * 1.7) * 22) - (n % 5 === 0 ? 14 : 0)).toFixed(1);
    if (i >= 26) calm += (i === 26 ? 'M' : 'L') + x + ' ' + (46 - Math.sin(i * 0.5 + t * 2) * 2.2).toFixed(1);
  }
  trace.innerHTML = `<line x1="130" y1="0" x2="130" y2="80" stroke="#3D38FF" stroke-dasharray="2 3"/><path d="${rough}" fill="none" stroke="#0B0A10" stroke-width="1.3"/><path d="${calm}" fill="none" stroke="#3D38FF" stroke-width="2.2"/><text x="136" y="10" font-family="Geist Mono" font-size="9" fill="#3D38FF">VYRE ON</text>`;
}
$$('.tabs button').forEach((b) => b.addEventListener('click', () => $$('.tabs button').forEach((x) => x.setAttribute('aria-selected', x === b))));

/* ---------- the home as a map: a viewBox fitted to its stage, and a way to place HTML on it ---------- */
const mob = () => innerWidth <= 1180;
function mapView(el, P, opts) {
  el.innerHTML = mapSVG(P, opts);
  const svg = el.querySelector('svg'), m = { el, svg };
  m.fit = () => {
    m.vb = mob() ? [830, 60, 780, 560] : [150, -40, 1416, 1040]; m.align = mob() ? 'mid' : 'max';
    svg.setAttribute('viewBox', m.vb.join(' ')); svg.setAttribute('preserveAspectRatio', (m.align === 'max' ? 'xMax' : 'xMid') + 'YMid slice');
    const w = el.clientWidth, h = el.clientHeight, [vx, vy, vw, vh] = m.vb, s = Math.max(w / vw, h / vh);
    m.s = s; m.ox = (m.align === 'max' ? w - vw * s : (w - vw * s) / 2) - vx * s; m.oy = (h - vh * s) / 2 - vy * s;
  };
  m.px = (x, y) => [x * m.s + m.ox, y * m.s + m.oy];
  m.fit(); return m;
}
const place = (m, el, x, y) => { const [a, b] = m.px(x, y); el.style.left = a + 'px'; el.style.top = b + 'px'; el.classList.toggle('flip', a > m.el.clientWidth - 120); };

/* ---------- traffic planner: pick a device, its lane draws itself out of the flat and down the street ---------- */
const DEV = {
  mac:     { title: 'Studio Mac to Video call', sub: 'Lane 1 of 23 · 4K · Priority high', ms: 3.1, stable: 'Stable for 14 h', meta: '4 hops · 2.1 Gbps · 2 reroutes today', jit: '0.4 ms', thr: '2.1 Gbps', res: '500 Mbps', warn: 'Microwave noise on 2.4 GHz — lane kept on 6 GHz', budget: 8, floor: 500, rank: 1, band: '6 GHz', focus: 1, first: ['Studio Mac', '6 GHz · −41 dBm', '0.2 ms'] },
  console: { title: 'Console to Ranked match', sub: 'Lane 2 of 23 · Game mode · Priority high', ms: 4.6, stable: 'Stable for 6 h', meta: '4 hops · 340 Mbps · 0 reroutes today', jit: '0.6 ms', thr: '340 Mbps', res: '200 Mbps', warn: 'Game servers pinned to Sydney — Singapore blocked', budget: 12, floor: 200, rank: 2, band: '6 GHz', focus: 1, first: ['Console', '6 GHz · −48 dBm', '0.4 ms'] },
  tv:      { title: 'Living room TV to 4K film', sub: 'Lane 6 of 23 · Streaming · Priority normal', ms: 9.8, stable: '0 stalls this week', meta: '4 hops · 58 Mbps · buffer full', jit: '1.1 ms', thr: '58 Mbps', res: '50 Mbps', warn: 'Updates for the TV moved to 3 am', budget: 40, floor: 50, rank: 6, band: '5 GHz', focus: 0, first: ['Living room TV', '5 GHz · −52 dBm', '0.9 ms'] },
  phone:   { title: 'Maya’s phone to FaceTime', sub: 'Lane 3 of 23 · Via Vyre Mini · Priority high', ms: 6.2, stable: 'Handed off twice', meta: '5 hops · 120 Mbps · roaming on', jit: '0.9 ms', thr: '120 Mbps', res: '50 Mbps', warn: 'Moved to the Mini as Maya walked to the bedroom', budget: 15, floor: 50, rank: 3, band: '6 GHz', focus: 0, first: ['Maya’s phone', '6 GHz · −55 dBm', '0.8 ms'] },
  tablet:  { title: 'Kids tablet to Homework', sub: 'Lane 14 of 23 · Focus hours on · Priority low', ms: 11.4, stable: 'Games paused', meta: '5 hops · 40 Mbps · 3 sites blocked', jit: '1.6 ms', thr: '40 Mbps', res: '20 Mbps', warn: 'Focus hours end at 8:30 pm', budget: 60, floor: 20, rank: 14, band: '5 GHz', focus: 1, first: ['Kids tablet', '5 GHz · −61 dBm', '1.4 ms'] },
  cam:     { title: 'Door camera to Cloud clip', sub: 'IoT lane · Isolated from other devices', ms: 18.0, stable: 'Firewalled', meta: '5 hops · 6 Mbps · can’t see your laptop', jit: '2.4 ms', thr: '6 Mbps', res: '4 Mbps', warn: 'Blocked 2 unknown servers this week', budget: 100, floor: 4, rank: 21, band: '2.4 GHz', focus: 0, first: ['Door camera', '2.4 GHz · −67 dBm', '3.1 ms'] },
};
const HOPINFO = {
  door: { logo: '4.02', t: 'Front door · wall riser', chips: ['Cat 6A', '10 Gbps', '0.1 ms'], rows: [['Cable run', '18 m'], ['Link state', 'Clean', 'ok'], ['Last fault', 'Never']] },
  mdf:  { logo: 'B', t: 'Building comms room · Level 4', chips: ['Fibre', '10 Gbps', '0.2 ms'], rows: [['Shared with', '11 flats'], ['Load now', '14 %', 'ok'], ['Peak tonight', '8 pm, 41 %']] },
  pit:  { logo: 'n', t: 'Northwire pit · Ithaca Rd', chips: ['FTTP', '1 Gbps', '0.3 ms'], rows: [['Splitter', '1 : 32'], ['Signal', '−17 dBm', 'ok'], ['Weather', 'Dry pit']] },
  exch: { logo: 'n', t: 'Northwire · Surry Hills exchange', chips: ['1 Gbps', '1.7 ms', 'FTTP'], rows: [['Distance', '1.2 km'], ['Congestion now', 'Low', 'ok'], ['Peak tonight', '7–10 pm, avoided']] },
};
let planFocus = 'mac', planAuto = true, plan = null;
const planEl = $('#planMap');
if (planEl) {
  plan = mapView(planEl, LIGHT, { marina: false });
  const NS = 'http://www.w3.org/2000/svg', g = document.createElementNS(NS, 'g');
  g.innerHTML = '<path class="r-case" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path class="r-line" fill="none" stroke="#3D38FF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' + Array.from({ length: 4 }, () => '<circle class="r-pk" r="5" fill="#fff" stroke="#3D38FF" stroke-width="2.5"/>').join('');
  plan.svg.append(g);
  plan.line = g.querySelector('.r-line'); plan.casing = g.querySelector('.r-case'); plan.pk = [...g.querySelectorAll('.r-pk')];
  const mk = $('#planMarkers'); plan.marks = [];
  const add = (cls, html, x, y, on) => { const e = document.createElement('button'); e.type = 'button'; e.className = cls; e.innerHTML = html; mk.append(e); plan.marks.push({ e, x, y }); if (on) e.addEventListener('click', on); return e; };
  plan.dev = {};
  for (const d of DEVICES) plan.dev[d.id] = add('mk', `<i></i>${d.name}`, d.x, d.y, () => { planAuto = false; showDevice(d.id); });
  add('mk ap', '<i></i>Vyre One', AP.router[0], AP.router[1]); add('mk ap', '<i></i>Vyre Mini', AP.mini[0], AP.mini[1]);
  plan.hops = {};
  for (const [k, [x, y]] of Object.entries({ door: HOPS.door, mdf: HOPS.mdf, pit: HOPS.pit, exch: [1560, 815] })) plan.hops[k] = add('hop', '', x, y, () => showHop(k));
  plan.layout = () => { plan.fit(); for (const m of plan.marks) place(plan, m.e, m.x, m.y); };
  plan.layout();
}
function showHop(k) {
  const h = HOPINFO[k], c = $('#hopCard'); Object.values(plan.hops).forEach((e) => e.classList.remove('sel')); plan.hops[k].classList.add('sel');
  c.classList.add('swap');
  setTimeout(() => {
    $('#hopLogo').textContent = h.logo; $('#hopLogo').style.fontSize = h.logo.length > 2 ? '10px' : '16px'; $('#hopTitle').textContent = h.t;
    $('#hopChips').innerHTML = h.chips.map((x) => `<span>${x}</span>`).join('');
    $('#hopRows').innerHTML = h.rows.map(([a, b, c2]) => `<div><dt>${a}</dt><dd class="${c2 || ''}">${b}</dd></div>`).join('');
    c.classList.remove('swap');
  }, 180);
}
function showDevice(id) {
  const d = DEV[id]; planFocus = id; $('#device').value = id;
  $('#laneTitle').textContent = d.title; $('#laneSub').textContent = d.sub; $('#laneMs').textContent = d.ms.toFixed(1) + ' ms end to end'; $('#laneStable').textContent = d.stable; $('#laneMeta').textContent = d.meta;
  $('#lJit').textContent = d.jit; $('#lThr').textContent = d.thr; $('#lRes').textContent = d.res; $('#lWarn span').textContent = d.warn;
  $('#budget').textContent = d.budget; $('#floor').textContent = d.floor; $('#rank').textContent = d.rank; $('#band').textContent = d.band;
  $$('#focus button').forEach((b, i) => b.setAttribute('aria-checked', i === d.focus));
  const via = DEVICES.find((x) => x.id === id).via === 'mini';
  const items = [[...d.first, 0], ...(via ? [['Vyre Mini · Hallway', 'Wireless backhaul · 6 GHz', '0.9 ms', 1]] : []), ['Vyre One · Living room', d.sub.split(' · ')[0], '0.3 ms', 1], ['Building comms room', 'Level 4 · fibre riser', '0.2 ms'], ['Northwire · Surry Hills', 'Exchange · 1.2 km', '1.7 ms']];
  $('#routeList').innerHTML = items.map(([a, b, c, core], i) => `<li style="--i:${i}" class="${core ? 'core' : ''}"><span><b>${a}</b><small>${b}</small></span><em>${c}</em></li>`).join('');
  if (!plan) return;
  for (const [k, e] of Object.entries(plan.dev)) e.classList.toggle('on', k === id);
  const dPath = roundedPath(routeFor(id));
  plan.line.setAttribute('d', dPath); plan.casing.setAttribute('d', dPath);
  const L = plan.line.getTotalLength(); plan.len = L;
  for (const p of [plan.line, plan.casing]) { p.style.transition = 'none'; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect(); p.style.transition = reduced ? 'none' : 'stroke-dashoffset 1.2s cubic-bezier(.6,0,.2,1)'; p.style.strokeDashoffset = 0; }
  plan.t0 = performance.now();
}
showDevice('mac'); if (plan) showHop('exch');
$('#device').addEventListener('change', (e) => { planAuto = false; showDevice(e.target.value); });
$$('#focus button').forEach((b, i) => b.addEventListener('click', () => { planAuto = false; $$('#focus button').forEach((x, j) => x.setAttribute('aria-checked', i === j)); }));
$$('.step button').forEach((b) => b.addEventListener('click', () => { planAuto = false; const r = $('#rank'); r.textContent = clamp(+r.textContent + +b.dataset.step, 1, 23); }));
$('#reroute').addEventListener('click', (e) => { planAuto = false; const b = e.currentTarget; b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin'); const d = DEV[planFocus]; d.ms = Math.max(1.8, +(d.ms * (0.84 + Math.random() * 0.08)).toFixed(1)); showDevice(planFocus); });
const ORDER = Object.keys(DEV);
const planSec = $('#planner'); let planVis = false;
new IntersectionObserver(([e]) => { planVis = e.isIntersecting; }).observe(planSec);
setInterval(() => { if (planAuto && planVis && !reduced) showDevice(ORDER[(ORDER.indexOf(planFocus) + 1) % ORDER.length]); }, 4200);
function planTick(now) {
  if (!plan || !planVis || !plan.len) return;
  const k = clamp((now - plan.t0) / 1200);
  plan.pk.forEach((c, i) => { const u = ((now / 2600 + i / plan.pk.length) % 1) * k; const p = plan.line.getPointAtLength(u * plan.len); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.style.opacity = k < 1 ? 0 : 1; });
}

/* ---------- signal map: the same home after dark; coverage is computed from the walls, live ---------- */
let sig = null, meshOn = 1, meshLv = 1, heatDirty = true;
const sigEl = $('#sigMap');
if (sigEl) {
  sig = mapView(sigEl, DARK, { marina: false });
  const heat = $('#heat'), small = document.createElement('canvas'); small.width = 200; small.height = 125;
  const sctx = small.getContext('2d'), img = sctx.createImageData(200, 125); let fields = null;
  const mk = $('#sigMarkers'); sig.marks = [];
  const add = (cls, html, x, y) => { const e = document.createElement('span'); e.className = cls; e.innerHTML = html; mk.append(e); sig.marks.push({ e, x, y }); return e; };
  for (const [ap, d] of [[AP.router, 0], [AP.router, 1.07], [AP.router, 2.13], [AP.mini, 0.5], [AP.mini, 1.6], [AP.mini, 2.7]]) add('ripple' + (ap === AP.mini ? ' mini' : ''), '', ap[0], ap[1]).style.setProperty('--d', d + 's');
  add('mk ap', '<i></i>Vyre One', AP.router[0], AP.router[1]); sig.mini = add('mk ap', '<i></i>Vyre Mini', AP.mini[0], AP.mini[1]);
  sig.dev = DEVICES.filter((d) => d.id !== 'cam').map((d) => ({ d, e: add('mk', `<i></i>${d.name}`, d.x, d.y) }));
  sig.paint = () => {
    if (!fields) fields = [fieldFor(AP.router), fieldFor(AP.mini, { power: 0.8 })];
    paintField(fields[0], fields[1], meshLv, img.data); sctx.putImageData(img, 0, 0);
    const dpr = Math.min(devicePixelRatio, 2), w = heat.clientWidth, h = heat.clientHeight;
    if (heat.width !== Math.round(w * dpr)) { heat.width = Math.round(w * dpr); heat.height = Math.round(h * dpr); }
    const ctx = heat.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const [x0, y0] = sig.px(0, 0); ctx.filter = `blur(${Math.round(9 * sig.s)}px)`; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, x0, y0, MW * sig.s, MH * sig.s); ctx.filter = 'none';
  };
  sig.layout = () => { sig.fit(); for (const m of sig.marks) place(sig, m.e, m.x, m.y); heatDirty = true; };
  sig.layout();
}
$('#meshToggle').addEventListener('click', (e) => {
  meshOn = meshOn ? 0 : 1; e.currentTarget.setAttribute('aria-checked', !!meshOn);
  $('#meshState').textContent = meshOn ? 'Mesh node · online 41 days' : 'Switched off · router on its own';
  $('#mCovers').textContent = meshOn ? 'Bedroom · Kids · Entry' : '—'; $('#mBack').textContent = meshOn ? '6 GHz · 2.4 Gbps' : 'Off';
  const wk = $('#mWeak'); wk.textContent = meshOn ? 'Kids · −54 dBm' : 'Kids · −79 dBm, dead zone'; wk.className = meshOn ? 'ok' : 'bad';
  if (sig) { sig.mini.classList.toggle('off', !meshOn); $$('.ripple.mini').forEach((r) => r.classList.toggle('off', !meshOn)); sig.dev.forEach(({ d, e }) => e.classList.toggle('weak', !meshOn && d.via === 'mini')); }
});
const sigSec = $('#signal'); let sigVis = false;
new IntersectionObserver(([e]) => { sigVis = e.isIntersecting; if (sigVis) heatDirty = true; }, { rootMargin: '200px' }).observe(sigSec);
function sigTick(dt) {
  if (!sig || !sigVis) return;
  const target = meshOn, prev = meshLv; meshLv += (target - meshLv) * Math.min(1, dt * 3);
  if (Math.abs(meshLv - prev) > 0.002) heatDirty = true;
  if (heatDirty) { sig.paint(); heatDirty = false; }
}
addEventListener('resize', () => { plan?.layout(); sig?.layout(); });
const arc = $('#ringArc');
new IntersectionObserver(([e], o) => { if (e.isIntersecting) { arc.style.strokeDasharray = `${(2 * Math.PI * 46 * 200 / 240).toFixed(1)} 290`; o.disconnect(); } }, { threshold: 0.5 }).observe(arc);

/* ---------- uptime heartbeat; score bars; push a policy to every site ---------- */
$('#beat').innerHTML = Array.from({ length: 60 }, (_, i) => `<i style="--i:${i}" class="${i === 41 ? 'blip' : ''}"></i>`).join('');
$('#scoreBars').innerHTML = Array.from({ length: 24 }, (_, i) => `<i style="--i:${i};--h:${(30 + 70 * (0.45 + 0.55 * Math.pow(i / 23, 1.3)) * (0.85 + 0.15 * Math.sin(i * 2.3))) / 1.2}" class="${i > 18 ? 'hi' : ''}"></i>`).join('');
$('#pushAll').addEventListener('click', (e) => {
  const b = e.currentTarget; if (b.classList.contains('done')) return;
  b.textContent = 'Pushing…';
  $$('#sitesBody .st').forEach((s, i) => setTimeout(() => { s.className = 'st ok'; s.textContent = 'Healthy'; }, 300 + i * 220));
  setTimeout(() => { b.textContent = 'Pushed to 11 sites ✓'; b.classList.add('done'); }, 300 + 6 * 220);
});

/* ---------- finishes ---------- */
const studio = $('#studio');
$$('.picker button').forEach((b) => b.addEventListener('click', () => {
  const f = studio.dataset.f === b.dataset.f ? 'all' : b.dataset.f; studio.dataset.f = f;
  $$('.picker button').forEach((x) => x.setAttribute('aria-checked', x.dataset.f === f));
}));

/* ---------- footer wordmark: letters rise in, light up on hover ---------- */
const giant = $('.giant'); giant.innerHTML = [...giant.textContent].map((c, i) => `<span style="--i:${i}">${c}</span>`).join('');

/* ---------- the loop ---------- */
const liveImg = $('#liveImg');
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
  lenis?.raf(now);
  pointer.x += (pointer.tx - pointer.x) * 0.06; pointer.y += (pointer.ty - pointer.y) * 0.06;
  navTick(scrollY);
  for (const v of views) if (v.on) { v.tick(t, dt); v.st.render(); }
  planTick(now); sigTick(dt);
  if (!reduced) drawTrace(t); else if (!trace.innerHTML) drawTrace(0);
  if (liveImg) { const r = liveImg.parentElement.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) liveImg.style.transform = `translateY(${((r.top + r.height / 2 - innerHeight / 2) * -0.06).toFixed(1)}px) scale(1.08)`; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
