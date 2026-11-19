// Vyre — the page: three live scenes (hero, planner, signal map) and the small interactions around them.
import Lenis from 'lenis';
import { THREE, V, makeStage, heroScene, planScene, signalScene, PLAN } from './vyre.js';

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

/* ---------- traffic planner: choose a device, its lane lights up, the path card follows ---------- */
const DEV = {
  mac:     { title: 'Studio Mac → Video call', ms: 3.1, sub: 'end to end · 14 reroutes today', jit: '0.4 ms', thr: '2.1 Gbps', prio: ['High', '1 of 23'], budget: 8, floor: 500, band: 2, focus: 1, hops: [['Studio Mac', '6 GHz · −41 dBm', '0.2 ms'], ['Vyre One · Living room', 'Lane 1 of 23', '0.3 ms', 1], ['Fibre · 1000/400', 'Northwire', '1.7 ms'], ['Sydney edge', 'Equinix SY4', '0.9 ms']] },
  console: { title: 'Console → Ranked match', ms: 4.6, sub: 'end to end · game servers in SYD', jit: '0.6 ms', thr: '340 Mbps', prio: ['High', '2 of 23'], budget: 12, floor: 200, band: 2, focus: 1, hops: [['Console', '6 GHz · −48 dBm', '0.4 ms'], ['Vyre One · Living room', 'Lane 2 of 23', '0.3 ms', 1], ['Fibre · 1000/400', 'Northwire', '1.7 ms'], ['Game server', 'Sydney · AWS', '2.2 ms']] },
  tv:      { title: 'Living room TV → 4K film', ms: 9.8, sub: 'buffer full · 0 stalls this week', jit: '1.1 ms', thr: '58 Mbps', prio: ['Normal', '6 of 23'], budget: 40, floor: 50, band: 1, focus: 0, hops: [['Living room TV', '5 GHz · −52 dBm', '0.9 ms'], ['Vyre One · Living room', 'Lane 6 of 23', '0.3 ms', 1], ['Fibre · 1000/400', 'Northwire', '1.7 ms'], ['Streaming cache', 'Alexandria', '6.9 ms']] },
  phone:   { title: 'Maya’s phone → FaceTime', ms: 6.2, sub: 'via Vyre Mini · handed off twice', jit: '0.9 ms', thr: '120 Mbps', prio: ['High', '3 of 23'], budget: 15, floor: 50, band: 2, focus: 0, hops: [['Maya’s phone', '6 GHz · −55 dBm', '0.8 ms'], ['Vyre Mini · Hallway', 'Wireless backhaul', '0.9 ms', 1], ['Vyre One · Living room', 'Lane 3 of 23', '0.3 ms', 1], ['Fibre · 1000/400', 'Northwire', '4.2 ms']] },
  tablet:  { title: 'Kids tablet → Homework', ms: 11.4, sub: 'focus hours on · games paused', jit: '1.6 ms', thr: '40 Mbps', prio: ['Low', '14 of 23'], budget: 60, floor: 20, band: 1, focus: 1, hops: [['Kids tablet', '5 GHz · −61 dBm', '1.4 ms'], ['Vyre Mini · Hallway', 'Wireless backhaul', '0.9 ms', 1], ['Vyre One · Living room', 'Lane 14 of 23', '0.3 ms', 1], ['Fibre · 1000/400', 'Northwire', '8.8 ms']] },
  cam:     { title: 'Door camera → Cloud clip', ms: 18.0, sub: 'isolated · can’t see other devices', jit: '2.4 ms', thr: '6 Mbps', prio: ['Isolated', 'IoT lane'], budget: 100, floor: 4, band: 0, focus: 0, hops: [['Door camera', '2.4 GHz · −67 dBm', '3.1 ms'], ['Vyre Mini · Hallway', 'IoT network', '0.9 ms', 1], ['Vyre One · Living room', 'Firewalled lane', '0.3 ms', 1], ['Camera cloud', 'Sydney', '13.7 ms']] },
};
let planFocus = 'mac', planAuto = true, planV = null;
const segSet = (el, i) => $$('button', el).forEach((b, j) => b.setAttribute('aria-checked', j === i));
function showDevice(id) {
  const d = DEV[id]; planFocus = id; $('#device').value = id;
  $('#pathTitle').textContent = d.title; $('#pathMs').textContent = d.ms.toFixed(1) + ' ms'; $('#pathSub').textContent = d.sub;
  $('#pJit').textContent = d.jit; $('#pThr').textContent = d.thr;
  $('#prio').innerHTML = `${d.prio[0]} <small>${d.prio[1]}</small>`; $('#budget').innerHTML = `${d.budget} <small>ms</small>`; $('#floor').innerHTML = `${d.floor} <small>Mbps</small>`;
  segSet($('#band'), d.band); segSet($('#focus'), d.focus);
  $('#hops').innerHTML = d.hops.map(([a, b, c, core], i) => `<li style="--i:${i}" class="${core ? 'core' : ''}"><span>${a}<small>${b}</small></span><em>${c}</em></li>`).join('');
}
showDevice('mac');
$('#device').addEventListener('change', (e) => { planAuto = false; showDevice(e.target.value); });
$$('.seg').forEach((s) => $$('button', s).forEach((b, i) => b.addEventListener('click', () => { planAuto = false; segSet(s, i); })));
$('#reroute').addEventListener('click', () => { planAuto = false; const d = DEV[planFocus]; d.ms = Math.max(1.8, d.ms * (0.82 + Math.random() * 0.1)); showDevice(planFocus); if (planV) planV.flash = 1; });
const order = Object.keys(DEV);
setInterval(() => { if (planAuto && !reduced && planV?.on) showDevice(order[(order.indexOf(planFocus) + 1) % order.length]); }, 3800);
planV = view($('#plan3d'), { bg: null, bloom: 0, fov: 22 }, (st) => {
  const p = planScene(st), ray = new THREE.Raycaster(), m = new THREE.Vector2();
  st.canvas.addEventListener('click', (e) => {
    const r = st.canvas.getBoundingClientRect(); m.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(m, st.camera); let best = null, bd = 1e9;
    for (const [id, c] of Object.entries(p.caps)) { const d = ray.ray.distanceToPoint(c.position); if (d < bd) { bd = d; best = id; } }
    if (best && bd < 1.2 && DEV[best]) { planAuto = false; showDevice(best); }
  });
  const base = st.camera.position.clone();
  return {
    flash: 0,
    tick(t, dt) {
      this.flash = Math.max(0, this.flash - dt * 1.5);
      p.set(t * (1 + this.flash * 3), planFocus);
      st.camera.position.set(base.x + pointer.x * 0.8, base.y - pointer.y * 0.5, base.z); st.camera.lookAt(0.4, -0.4, 0.4);
    },
  };
});

/* ---------- signal map: the field is live; switch the Mini off and watch the bedrooms go dark ---------- */
const pinsEl = $('#pins'), PINS = [
  ['Vyre One', PLAN.router[0], PLAN.router[1], 'ap'], ['Vyre Mini', PLAN.mesh[0], PLAN.mesh[1], 'ap mini'],
  ['Studio Mac', 5.8, -0.4, ''], ['Maya’s phone', -4.6, -3.2, 'mesh'], ['Kids tablet', -5, 3, 'mesh'], ['Living room TV', 1.6, 4.2, ''], ['Door camera', -6.4, 4.4, 'mesh'],
].map(([n, x, z, cls]) => { const el = document.createElement('span'); el.className = 'pin ' + cls; el.innerHTML = `<i></i>${n}`; pinsEl.append(el); return { el, p: V(x, 0, z) }; });
let meshOn = 1, meshLv = 1;
$('#meshToggle').addEventListener('click', (e) => {
  meshOn = meshOn ? 0 : 1; e.currentTarget.setAttribute('aria-pressed', !!meshOn);
  e.currentTarget.firstChild.textContent = `Vyre Mini: ${meshOn ? 'on' : 'off'} `;
  const note = $('#sigNote'); note.textContent = meshOn ? '−38 dBm in the studio · 0 dead zones' : '−79 dBm in the bedrooms · 3 dead zones'; note.classList.toggle('bad', !meshOn);
  $$('.pin.mesh').forEach((p) => p.classList.toggle('weak', !meshOn)); $('.pin.mini').classList.toggle('off', !meshOn);
});
view($('#signal3d'), { bg: '#08070C', bloom: 0.75, fov: 26 }, (st) => {
  const s = signalScene(st);
  // fit the 14 x 10 plan to the frame, a hair inside its edges
  const fit = () => { const a = st.canvas.clientWidth / Math.max(1, st.canvas.clientHeight), h = Math.max(10.3, 14.3 / a); st.camera.fov = 2 * Math.atan(h / 2 / 26) * 180 / Math.PI; st.camera.updateProjectionMatrix(); };
  fit();
  return {
    fit,
    tick(t, dt) {
      meshLv += (meshOn - meshLv) * Math.min(1, dt * 2.5);
      s.set(t, { mesh: meshLv });
      for (const { el, p } of PINS) { const [x, y] = toScreen(st, p); el.style.left = x + 'px'; el.style.top = y + 'px'; el.classList.toggle('flip', x > st.canvas.clientWidth - 110); }
    },
  };
});
const arc = $('#ringArc');
new IntersectionObserver(([e], o) => { if (e.isIntersecting) { arc.style.strokeDasharray = `${(2 * Math.PI * 34 * 200 / 240).toFixed(1)} 214`; o.disconnect(); } }, { threshold: 0.5 }).observe(arc);

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
  if (!reduced) drawTrace(t); else if (!trace.innerHTML) drawTrace(0);
  if (liveImg) { const r = liveImg.parentElement.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) liveImg.style.transform = `translateY(${((r.top + r.height / 2 - innerHeight / 2) * -0.06).toFixed(1)}px) scale(1.08)`; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
