// Nanomantic full site: smooth scroll, reveals, and the live 3D sections.
// One loop drives everything: each section reads its own scroll progress and renders only while on screen.
import { THREE, V, makeStage } from './kit.js';
import { street, exploded, diorama } from './scenes.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduced) root.classList.add('reduced');
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
if (!hasGL) root.classList.add('no-webgl');

/* ---------- smooth scroll ---------- */
const lenis = !reduced && window.Lenis ? new window.Lenis({ lerp: 0.11 }) : null;
if (lenis) root.classList.add('lenis');
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'); if (id.length < 2) return;
  const el = document.querySelector(id); if (!el) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(el, { duration: 1.4 }); else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
});
// progress of a tall (sticky) section: 0 when its top reaches the top of the viewport, 1 when its bottom does
const stickyProgress = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };
// progress of an element moving through the viewport: 0 as its top enters the bottom, 1 as its centre reaches `at`
const passProgress = (el, at = 0.5) => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight * (1 - at) + r.height / 2)); };

/* ---------- reveals + count-ups ---------- */
const countUp = (el) => {
  const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '', t0 = performance.now();
  if (reduced) return;
  const step = (t) => { const k = ease(clamp((t - t0) / 1400)); el.textContent = (to * k).toFixed(dec) + suf; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
};
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('is-in'); io.unobserve(e.target);
  $$('[data-count]', e.target).forEach(countUp);
}), { rootMargin: '0px 0px -12% 0px' });
$$('[data-reveal]').forEach((el) => {
  const sibs = $$(':scope > [data-reveal]', el.parentElement); el.style.setProperty('--d', (sibs.indexOf(el) * 0.08) + 's');
  io.observe(el);
});

/* ---------- nav: frosts after the hero, turns dark over dark bands, slides away while scrolling down ---------- */
const nav = $('.nav'), darks = [$('.calc'), $('.cta-card')];
let lastY = 0;
function navTick() {
  const y = scrollY; nav.classList.toggle('stuck', y > 40);
  const mid = 39; nav.classList.toggle('on-dark', darks.some((d) => { const r = d.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; }));
  if (Math.abs(y - lastY) > 6) { nav.classList.toggle('hide', y > lastY && y > innerHeight * 0.9 && !nav.contains(document.activeElement)); lastY = y; }
}

/* ---------- live 3D views ---------- */
const views = [];
const pointer = { x: 0, y: 0 };
addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; });
function view(canvas, opts, build) {
  if (!hasGL || !canvas) return null;
  const st = makeStage(canvas, opts), v = { st, on: false };
  Object.assign(v, build(st, v));
  new IntersectionObserver(([e]) => { v.on = e.isIntersecting; }, { rootMargin: '120px' }).observe(canvas);
  views.push(v); return v;
}
addEventListener('resize', () => views.forEach((v) => { v.fit?.(); v.st.resize(); }));
const tmp = new THREE.Vector3();
const toScreen = (st, p) => { tmp.copy(p).project(st.camera); const c = st.renderer.domElement; return [(tmp.x + 1) / 2 * c.clientWidth, (1 - tmp.y) / 2 * c.clientHeight]; };

/* 03: the solar panel comes apart as the cell scrolls into view */
view($('#panel3d'), { viewH: 16, look: V(0, 4.2, 0) }, (st) => {
  const o = exploded(st, 'panel'), tags = $$('#panelTags li'), cell = $('.cell-art'), canvas = st.renderer.domElement;
  let t = 0;
  return {
    tick(time) {
      const target = reduced ? 1 : ease(passProgress(cell, 0.45));
      t += (target - t) * 0.12; o.set(t);
      st.view.az = Math.PI / 4 + pointer.x * 0.25 - (1 - t) * 0.35;
      st.view.el = 0.6155 - pointer.y * 0.08;
      st.view.look.y = 1.2 + 3 * t; st.view.viewH = 9 + 7 * t;
      st.project(); st.place();
      const oy = canvas.offsetTop;
      o.layers.forEach((l, i) => { const [, y] = toScreen(st, V(4.8, l.position.y, -2.8)); tags[i].style.top = (oy + y) + 'px'; tags[i].style.opacity = clamp((t - 0.25) * 3); });
    },
  };
});

/* 04: a flight down one street. Scroll moves a perspective camera between five close-ups,
   and the street's day (noon export -> evening import -> paid) follows the camera. */
const how = $('.how');
view($('#street3d'), { fov: 32 }, (st) => {
  const s = street(st), cam = st.camera, chs = $$('#chapters .ch'), rail = $$('#rail li'), N = chs.length;
  st.scene.fog = new THREE.Fog(new THREE.Color(getComputedStyle(root).getPropertyValue('--bg').trim()), 40, 120);
  const readout = $('#readout'), rtext = $('#readoutText'), credits = $$('#credits span');
  const r = { export: $('#r-export'), charge: $('#r-charge'), import: $('#r-import'), paid: $('#r-paid') };
  // camera stops: [position, look-at, street phase, readout anchor]
  const K = [
    [V(-7, 16, 26), V(-21.5, 3.6, 0.5), 0.5, V(-19.2, 5.2, -0.6)],      // 01 the two solar roofs
    [V(2, 19, 27), V(-9, 6.2, 2.5), 0.8, V(0.9, 9.2, 4.15)],            // 02 along the mains
    [V(13, 15, 23), V(-1.5, 3.2, 0.5), 1.15, V(2.2, 5.6, -0.8)],        // 03 the street battery
    [V(20, 19, 33), V(-1, 3.6, 0), 2.35, V(-8.8, 5.4, -0.6)],           // 04 six o'clock
    [V(-2, 40, 40), V(-2, 0, -4), 3.05, V(13.5, 15.6, -1.4)],           // 05 high and wide
  ];
  // what each chapter is about; everything else fades back
  const F = [
    { h1: 1, h2: 1, bat: 0, apt: 0, shop: 0 },
    { h1: 0.35, h2: 0.35, bat: 0.35, apt: 0, shop: 0 },
    { h1: 0, h2: 0, bat: 1, apt: 0, shop: 0 },
    { h1: 1, h2: 1, bat: 1, apt: 1, shop: 1 },
    { h1: 1, h2: 1, bat: 1, apt: 1, shop: 1 },
  ];
  const focus = {}, sticky = $('.how-sticky'), dayBg = new THREE.Color(getComputedStyle(root).getPropertyValue('--bg').trim()), duskBg = new THREE.Color('#D3DCD8'), bgNow = new THREE.Color();
  const readouts = (ph) => [
    'Panel array · 6.6 kW · ' + Math.round(1020 * clamp(1.4 - ph)) + ' W/m²',
    'Mains · 415 V · flowing to the battery',
    'Street battery · ' + Math.round(clamp(ph / 1.1) * 100) + '% · charging',
    'Home 14 · from the battery · 1.9 kW',
    'This street today · 61 homes · +$146.20',
  ];
  const pos = new THREE.Vector3(), look = new THREE.Vector3(), tmpL = new THREE.Vector3();
  let k = 0, chOn = -1, ph = 0;
  rail.forEach((li) => li.querySelector('button')?.addEventListener('click', () => {
    const rr = how.getBoundingClientRect(), top = scrollY + rr.top, span = rr.height - innerHeight;
    const target = top + span * (+li.querySelector('button').dataset.ch + 0.5) / N;
    if (lenis) lenis.scrollTo(target, { duration: 1.6 }); else scrollTo({ top: target, behavior: 'smooth' });
  }));
  return {
    tick(time, dt) {
      const p = reduced ? 0.1 : stickyProgress(how);
      // hold on each stop through the middle of its slice; travel between stops at the edges
      const x = clamp(p * N - 0.5, 0, N - 1), i = Math.min(N - 2, Math.floor(x)), f = x - i;
      const hold = 0.28, target = i + ease(clamp((f - hold) / (1 - 2 * hold)));
      k += (target - k) * Math.min(1, dt * 4.5);
      const a = Math.min(N - 2, Math.floor(k)), t = k - a;
      pos.lerpVectors(K[a][0], K[a + 1][0], t); look.lerpVectors(K[a][1], K[a + 1][1], t);
      ph = K[a][2] + (K[a + 1][2] - K[a][2]) * t;
      // tall (phone) screens: back the camera off so the subject still fits
      const aspect = st.renderer.domElement.clientWidth / Math.max(1, st.renderer.domElement.clientHeight);
      if (aspect < 1.2) pos.sub(look).multiplyScalar(1 + (1.2 - aspect) * 1.1).add(look);
      pos.x += pointer.x * 1.6; pos.y -= pointer.y * 1.0;
      cam.position.copy(pos); cam.lookAt(look);
      for (const key of ['h1', 'h2', 'bat', 'apt', 'shop']) focus[key] = F[a][key] + (F[a + 1][key] - F[a][key]) * t;
      const { eve } = s.set(ph, time, dt, focus);
      // the page darkens with the street at dusk
      bgNow.copy(dayBg).lerp(duskBg, eve * 0.9); st.scene.fog.color.copy(bgNow);
      const hex = '#' + bgNow.getHexString(); if (sticky.dataset.bg !== hex) { sticky.dataset.bg = hex; sticky.style.setProperty('--how-bg', hex); }
      // chapter text
      const c = Math.round(k);
      if (c !== chOn) {
        chOn = c;
        chs.forEach((el, j) => { el.classList.toggle('on', j === c); el.classList.toggle('past', j < c); });
        rail.forEach((li, j) => li.classList.toggle('on', j === c));
      }
      // the readout follows the subject of the current stop, and hides while the camera travels
      tmpL.lerpVectors(K[a][3], K[a + 1][3], t);
      const [rx0, ry] = toScreen(st, tmpL), half = readout.offsetWidth / 2 + 12, rx = clamp(rx0, half, innerWidth - half);
      readout.style.transform = 'translate(' + rx + 'px, ' + (ry - 30) + 'px) translate(-50%, -100%)';
      readout.style.opacity = (t < 0.15 || t > 0.85) ? 1 : 0;
      rtext.textContent = readouts(ph)[c];
      // live figures in the chapter specs
      const irr = clamp(1.4 - ph);
      r.export.textContent = '+' + (3.4 * irr + 0.2).toFixed(1) + ' kW';
      r.charge.textContent = Math.round(clamp(ph / 1.1) * 100) + '%';
      r.import.textContent = (1.2 + 0.7 * clamp((ph - 1.8) / 0.5)).toFixed(1) + ' kW';
      // credits float up off the roofs in the last chapter
      const show = clamp((k - 3.4) / 0.5);
      r.paid.textContent = '$' + (146.2 * show).toFixed(2);
      credits.forEach((el, j) => {
        const [cx, cy] = toScreen(st, s.anchors[el.dataset.at]);
        const rise = (time * 0.35 + j * 0.27) % 1;
        el.style.transform = 'translate(' + cx + 'px, ' + (cy - 20 - rise * 60) + 'px) translate(-50%, -100%)';
        el.style.opacity = show * Math.sin(rise * Math.PI);
      });
    },
  };
});

/* 05: the street battery opens up layer by layer, with leader lines to each part */
const inside = $('.inside');
view($('#battery3d'), { viewH: 10, look: V(-0.8, 2.4, -0.4) }, (st) => {
  const o = exploded(st, 'battery'), canvas = st.renderer.domElement, stage = $('.inside-stage'), svg = $('#leaders');
  const callouts = $$('#callouts li'), NS = 'http://www.w3.org/2000/svg';
  const lines = callouts.map(() => { const l = document.createElementNS(NS, 'line'), c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 3.5); svg.append(l, c); return { l, c }; });
  const box = new THREE.Box3(); let t = 0;
  return {
    tick() {
      const p = reduced ? 0.8 : stickyProgress(inside), target = ease(clamp((p - 0.05) / 0.7));
      t += (target - t) * 0.1; o.set(t);
      // fit by height on wide canvases, by width on narrow ones (phones)
      const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      st.view.viewH = (9 + 8.5 * t) * Math.max(1, 0.95 / aspect); st.view.look.set(-0.8, 2.3 + 4.1 * t, -0.4);
      st.view.az = Math.PI / 4 - 0.45 + p * 0.8 + pointer.x * 0.1; st.project(); st.place();
      const W = stage.clientWidth, ox = canvas.offsetLeft - canvas.clientWidth / 2, oy = canvas.offsetTop, narrow = W < 900;
      // on phones only the part that most recently came apart is captioned
      const cur = callouts.filter((li) => t > 0.12 + (5 - +li.dataset.layer) * 0.1).at(-1);
      callouts.forEach((li, i) => {
        li.classList.toggle('cur', li === cur);
        const layer = o.layers[+li.dataset.layer], left = li.dataset.side === 'l';
        box.setFromObject(layer);
        const [ax, ay] = toScreen(st, V(left ? box.min.x : box.max.x, (box.min.y + box.max.y) / 2, left ? box.max.z : box.min.z));
        const x = ox + ax, y = oy + ay, on = t > 0.12 + (5 - +li.dataset.layer) * 0.1;
        li.classList.toggle('in', on);
        const top = clamp(y - 10, 0, stage.clientHeight - li.offsetHeight); li.style.top = top + 'px';
        const ex = left ? li.offsetLeft + li.offsetWidth + 16 : li.offsetLeft - 16;
        const L = lines[i]; L.l.setAttribute('x1', ex); L.l.setAttribute('y1', top + 6); L.l.setAttribute('x2', x); L.l.setAttribute('y2', y);
        L.c.setAttribute('cx', x); L.c.setAttribute('cy', y);
        L.l.style.opacity = L.c.style.opacity = on && !narrow ? 1 : 0;
      });
    },
  };
});

/* ---------- 06 who it's for: filter + tilt ---------- */
$$('.seg [data-filter]').forEach((b) => b.addEventListener('click', () => {
  $$('.seg [data-filter]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  $$('.card').forEach((c) => c.classList.toggle('dim', b.dataset.filter !== 'all' && c.dataset.kind !== b.dataset.filter));
}));
$$('.card-art').forEach((a) => {
  a.addEventListener('pointermove', (e) => { const r = a.getBoundingClientRect(); a.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 14 + 'deg'); a.style.setProperty('--rx', -((e.clientY - r.top) / r.height - 0.5) * 10 + 'deg'); });
  a.addEventListener('pointerleave', () => { a.style.setProperty('--ry', '0deg'); a.style.setProperty('--rx', '0deg'); });
});

/* ---------- 07 calculator ---------- */
{
  const kw = $('#kw'), use = $('#use'), sub = $('#suburb'), badge = $('#subBadge');
  const out = { kw: $('#outKw'), use: $('#outUse'), total: $('#total'), v1: $('#v1'), v2: $('#v2'), v3: $('#v3') };
  const sp = [$('#sp1'), $('#sp2'), $('#sp3')], P = { s: $('#dSolar'), u: $('#dUse'), e: $('#dExport'), v: $('#dEvening') };
  const grid = $('#day .grid'); for (let i = 0; i <= 4; i++) { const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('x1', 0); l.setAttribute('x2', 700); l.setAttribute('y1', 20 + i * 40); l.setAttribute('y2', 20 + i * 40); grid.append(l); }
  const NOW = 18 + 40 / 60, nx = NOW / 24 * 700; $('#dNow').setAttribute('x1', nx); $('#dNow').setAttribute('x2', nx);
  const nt = $('#dNowT'); nt.setAttribute('x', nx + 8); nt.textContent = '18:40  BATTERY → YOUR HOME';
  const shown = { total: 486, v1: 254, v2: 148, v3: 84 };
  const money = (n) => '$' + Math.round(n).toLocaleString();
  function tween(key, to) {
    const from = shown[key], t0 = performance.now();
    const step = (t) => { const k = reduced ? 1 : ease(clamp((t - t0) / 650)); shown[key] = from + (to - from) * k; out[key].textContent = money(shown[key]); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function update() {
    const k = +kw.value, u = +use.value / 100, bat = $('input[name="bat"]:checked').value, onStreet = sub.value === '1';
    out.kw.textContent = k.toFixed(1) + ' kW'; out.use.textContent = Math.round(u * 100) + '%';
    kw.style.setProperty('--p', (k - 3) / 10.2 * 100 + '%'); use.style.setProperty('--p', (u * 100 - 10) / 60 * 100 + '%');
    badge.textContent = onStreet ? '● Battery on your street' : '○ Next battery here: mid 2027'; badge.classList.toggle('off', !onStreet);
    // the money (illustrative)
    const gen = k * 1400, exported = gen * (1 - u) * 0.85;
    const v1 = exported * 0.05, v2 = Math.min(exported * 0.6, 1900) * 0.075 * (onStreet ? 1 : 0.4), v3 = (onStreet ? 84 : 36) + (bat === 'have' ? 120 : 0);
    tween('v1', v1); tween('v2', v2); tween('v3', v3); tween('total', v1 + v2 + v3);
    const sum = v1 + v2 + v3; sp[0].style.flexGrow = v1 / sum; sp[1].style.flexGrow = v2 / sum; sp[2].style.flexGrow = v3 / sum;
    // the day: solar vs use, export band at noon, battery band in the evening
    const solar = (h) => 160 * (k / 13.2) * Math.max(0, Math.sin((h - 6) / 13 * Math.PI));
    const usage = (h) => 22 + 22 * Math.exp(-((h - 7.5) ** 2) / 2.5) + 78 * Math.exp(-((h - 19) ** 2) / 4) + 70 * u * Math.exp(-((h - 13) ** 2) / 9);
    const N = 96, X = (i) => (i / N * 700).toFixed(1), Y = (v) => (180 - v).toFixed(1), H = (i) => i / N * 24;
    let ds = '', du = '', de = '', dv = '';
    for (let i = 0; i <= N; i++) { ds += (i ? 'L' : 'M') + X(i) + ' ' + Y(solar(H(i))); du += (i ? 'L' : 'M') + X(i) + ' ' + Y(usage(H(i))); }
    // export: between the curves where solar is above use
    let top = '', bot = '';
    for (let i = 0; i <= N; i++) { const s = solar(H(i)), w = usage(H(i)); top += (i ? 'L' : 'M') + X(i) + ' ' + Y(Math.max(s, w)); bot = 'L' + X(i) + ' ' + Y(w) + bot; }
    de = top + bot + 'Z';
    // evening: under the use curve, above solar, from 16:00 to 23:00
    const i0 = 64, i1 = 92; top = ''; bot = '';
    for (let i = i0; i <= i1; i++) { const s = solar(H(i)), w = usage(H(i)); top += (i === i0 ? 'M' : 'L') + X(i) + ' ' + Y(w); bot = 'L' + X(i) + ' ' + Y(Math.min(w, s)) + bot; }
    dv = onStreet ? top + bot + 'Z' : 'M0 180Z';
    P.s.setAttribute('d', ds); P.u.setAttribute('d', du); P.e.setAttribute('d', de); P.v.setAttribute('d', dv);
  }
  [kw, use, sub].forEach((x) => x.addEventListener('input', update));
  $$('input[name="bat"]').forEach((x) => x.addEventListener('change', update));
  update();
}

/* ---------- 08 network: parallax, a live feed, drifting numbers ---------- */
const net = $('.network'), netImg = $('.net-map');
{
  const feed = $('#feed'), clockEl = $('#feedClock');
  const pool = [['Newtown battery → 58 homes', '39 kW'], ['Erskineville roofs → battery', '+11 kW'], ['Member credit · Marrickville', '$1.80'], ['Dulwich Hill battery → 44 homes', '27 kW'], ['Network peak shaved', '−9%'], ['Member credit · Newtown', '$3.10'], ['Marrickville battery → 72 homes', '46 kW']];
  let n = 0, mins = 18 * 60 + 42;
  if (!reduced) setInterval(() => {
    if (!net.matches(':hover') && net.getBoundingClientRect().top < innerHeight && net.getBoundingClientRect().bottom > 0) {
      mins++; const t = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`; clockEl.textContent = '● ' + t;
      const [e, v] = pool[n++ % pool.length], li = document.createElement('li'); li.className = 'new';
      li.innerHTML = `<small>${t}</small><span>${e}</span><b>${v}</b>`; feed.prepend(li); feed.lastElementChild.remove();
      $('#pinM').textContent = (78 + Math.round(Math.random() * 8)) + '% charged';
      $('#pinN').textContent = 'discharging ' + (36 + Math.round(Math.random() * 10)) + ' kW';
      $('#totMw').textContent = (3.9 + Math.random() * 0.6).toFixed(1) + ' MW';
    }
  }, 3200);
}

/* ---------- 09 the quote lights up word by word ---------- */
const quote = $('#quote p'), words = [];
quote.innerHTML = quote.textContent.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
words.push(...$$('.w', quote));

/* ---------- 07 what we believe: photo drifts, the promise nearest the middle of the screen lights up ---------- */
const believe = $('.believe'), beliefRows = $$('#beliefs li'), believeImg = $('.team-photo img');
function believeTick() {
  const r = believe.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
  if (!reduced) { const c = believeImg.parentElement.getBoundingClientRect(); believeImg.style.setProperty('--py', ((c.top + c.height / 2 - innerHeight / 2) * -0.08).toFixed(1) + 'px'); }
  let best = -1, bestD = Infinity;
  beliefRows.forEach((li, i) => { const b = li.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - innerHeight * 0.52); if (d < bestD) { bestD = d; best = i; } });
  if (bestD < innerHeight * 0.45) beliefRows.forEach((li, i) => li.classList.toggle('on', i === best));
}

/* ---------- 10 check your street: a live diorama; checking an address lights the street up (demo: nothing leaves the page) ---------- */
let ctaFire = false, ctaLevel = 0;
view($('#cta3d'), { viewH: 64, look: V(-14, -1, 4), el: 0.6 }, (st) => {
  const d = diorama(st); let lv = 0;
  return {
    tick(time, dt) {
      lv += (ctaLevel - lv) * Math.min(1, dt * 3);
      st.view.az = Math.PI / 4 + (reduced ? 0 : time * 0.06) + pointer.x * 0.15;
      const aspect = st.renderer.domElement.clientWidth / Math.max(1, st.renderer.domElement.clientHeight);
      st.view.viewH = (64 - 6 * lv) * Math.max(1, 1.4 / aspect); st.view.look.set(aspect > 1.2 ? -16 : 0, -1, aspect > 1.2 ? 6 : 0);
      st.project(); st.place();
      d.set(lv, time, dt, ctaFire); ctaFire = false;
    },
  };
});
$('#check-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#addr').value.trim(), outEl = $('#checkOut'), res = $('#result');
  if (v.length < 4) { outEl.textContent = 'Type a street address to check.'; outEl.classList.add('bad'); $('#addr').focus(); return; }
  outEl.classList.remove('bad');
  let h = 0; for (const c of v.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const street = v.split(',')[0], live = h % 3 !== 0;
  outEl.innerHTML = '<i class="live-dot"></i>' + (live ? 'Found it: ' : 'Not yet: ') + street.replace(/[<>&]/g, '');
  $('#resK').textContent = live ? '● Battery on your street' : '○ Next battery here: ' + ['March', 'June', 'September'][h % 3] + ' 2027';
  $('#resK').classList.toggle('wait', !live);
  $('#resDist').textContent = live ? (120 + h % 380) + ' m' : (900 + h % 1400) + ' m';
  $('#resHomes').textContent = live ? String(40 + h % 41) : (h % 30) + ' signed up';
  $('#resCredit').textContent = '$' + (380 + h % 240) + ' / yr';
  $('#resBtn').firstChild.textContent = live ? 'Reserve my spot ' : 'Join the waitlist ';
  res.hidden = false;
  ctaLevel = live ? 1 : 0.45; ctaFire = true;
});

/* ---------- footer: the logo, huge; letters rise in, the mark turns ---------- */
{
  const giant = $('#footGiant'), word = $('#footWord');
  $('#footMark').append($('.logo .mark').cloneNode(true));
  word.innerHTML = [...word.textContent].map((c, i) => '<span class="l" style="--i:' + i + '">' + c + '</span>').join('');
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { giant.classList.add('in'); o.disconnect(); } }, { threshold: 0.35 }).observe(giant);
}

/* ---------- the loop ---------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000), time = now / 1000; last = now;
  lenis?.raf(now);
  navTick();
  for (const v of views) if (v.on) { v.tick(time, dt); v.st.renderer.render(v.st.scene, v.st.camera); }
  // network parallax and quote
  const np = passProgress(net, 0.5); netImg.style.setProperty('--s', (1.14 - 0.1 * np).toFixed(4));
  const qp = reduced ? 1 : clamp((innerHeight * 0.85 - quote.getBoundingClientRect().top) / (innerHeight * 0.55));
  const lit = Math.round(qp * words.length); words.forEach((w, i) => w.classList.toggle('lit', i < lit));
  believeTick();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
