// Vyre — page behaviour: reveals, counters, the hero chart, the planner cards, the coverage blob.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* nav gains a shadow once the page moves */
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('stuck', scrollY > 8), { passive: true });

/* numbers count up the first time they are seen */
function count(el) {
  const to = +el.dataset.count, suf = el.dataset.suf || '', t0 = performance.now(), dur = 1600;
  const fmt = (v) => Math.round(v).toLocaleString('en-AU') + suf;
  if (reduced) { el.textContent = fmt(to); return; }
  const step = (now) => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
$$('[data-count]').forEach((el) => { el.textContent = '0' + (el.dataset.suf || ''); });
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); io.unobserve(e.target);
  $$('[data-count]', e.target).forEach(count);
  if (e.target.id === 'signal') $('#partnerArc').style.strokeDasharray = `${(2 * Math.PI * 64 * 950 / 1500).toFixed(1)} 403`;
}), { threshold: 0.2 });
$$('.rise, .planner, .signal, .dash').forEach((el) => io.observe(el));
requestAnimationFrame(() => $$('.hero .rise').forEach((el) => el.classList.add('in')));

/* hero chart: a jagged evening that goes calm where Vyre takes over */
const chart = $('#heroChart path');
function drawChart(t) {
  let d = '';
  for (let i = 0; i <= 48; i++) {
    const x = i * 5, rough = i < 22, n = i + Math.floor(t * 2);
    const y = rough ? 70 - Math.abs(Math.sin(n * 1.9) * 34) - (n % 6 === 0 ? 22 : 0) + Math.sin(n * .7) * 8 : 108 - Math.sin(i * .45 + t) * 3;
    d += (i ? 'L' : 'M') + x + ' ' + y.toFixed(1);
  }
  chart.setAttribute('d', d);
}
drawChart(0);
if (!reduced) { let last = 0; const tick = (now) => { if (now - last > 600) { drawChart(now / 1000); last = now; } requestAnimationFrame(tick); }; requestAnimationFrame(tick); }

/* planner cards: small, real interactions */
$('#reroute').addEventListener('click', (e) => {
  const b = e.currentTarget; b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin');
  const el = $('#tripMs'), ms = parseInt(el.textContent, 10); el.textContent = Math.max(31, ms - 2 - Math.round(Math.random() * 3)) + ' ms round trip';
});
$$('.pm button').forEach((b) => b.addEventListener('click', () => { const p = $('#people'); p.textContent = Math.min(9, Math.max(1, +p.textContent + +b.dataset.d)); }));
$$('#gaming button').forEach((b) => b.addEventListener('click', () => $$('#gaming button').forEach((x) => x.classList.toggle('on', x === b))));

/* coverage: each finish gets its own coverage shape; the blob morphs between them */
function blob(seed, r, jag) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = 72, pts = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI, k = 1 + (rnd() - 0.5) * jag + Math.sin(i * 0.5 + seed) * 0.04;
    pts.push([300 + Math.cos(a) * r * 1.25 * k, 400 + Math.sin(a) * r * k]);
  }
  return 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L') + ' Z';
}
const SHAPES = { graphite: blob(11, 300, 0.16), bone: blob(5, 250, 0.2), cobalt: blob(23, 330, 0.14) };
const range = $('#range'), blobPath = $('#blobPath');
function pick(f) {
  range.dataset.f = f; blobPath.setAttribute('d', SHAPES[f]);
  $$('.car', range).forEach((c) => c.classList.toggle('on', c.dataset.f === f));
}
pick('graphite');
$$('.car', range).forEach((c) => c.addEventListener('click', () => pick(c.dataset.f)));

/* inside Vyre One: the router comes apart as you scroll through the section, captions on leader lines */
const insideSec = $('#inside');
if (insideSec) new IntersectionObserver(async ([e], o) => {
  if (!e.isIntersecting) return; o.disconnect();
  let mods; try { mods = await Promise.all([import('./vyre.js'), import('./inside.js')]); } catch { document.documentElement.classList.add('no-webgl'); return; }
  const [{ makeStage, THREE }, { vyreInside }] = mods, canvas = $('#inside3d'), stage = $('#insideStage'), svg = $('#leaders');
  // the background is pre-brightened so that, after filmic tone mapping, it lands exactly on the panel's #262322
  let st; try { st = makeStage(canvas, { bg: '#363432', bloom: 0.7, fov: 26 }); } catch { document.documentElement.classList.add('no-webgl'); return; }
  const v = vyreInside(st), parts = $$('#parts li'), NS = 'http://www.w3.org/2000/svg', pv = new THREE.Vector3(), box = new THREE.Box3(), right = new THREE.Vector3();
  const lines = parts.map(() => { const l = document.createElementNS(NS, 'line'), c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 4); svg.append(l, c); return { l, c }; });
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ease = (x) => x * x * (3 - 2 * x);
  let t = 0, px = 0, tx = 0, on = true;
  addEventListener('pointermove', (ev) => { tx = ev.clientX / innerWidth * 2 - 1; });
  new IntersectionObserver(([en]) => { on = en.isIntersecting; }).observe(insideSec);
  addEventListener('resize', () => st.resize());
  const tick = (now) => {
    requestAnimationFrame(tick); if (!on) return;
    const r = insideSec.getBoundingClientRect(), p = clamp(-r.top / Math.max(1, r.height - innerHeight));
    t += ((reduced ? 0.85 : ease(clamp((p - 0.06) / 0.72))) - t) * 0.1; px += (tx - px) * 0.05;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    // a gentle orbit that keeps the shell halves parting sideways, never toward the camera
    v.set(t, { az: -0.25 + p * 0.6 + px * 0.1, time: now / 1000, aspect }); st.render();
    // captions: each part is labelled once it has come apart; leaders run to its outer edge
    const ox = canvas.offsetLeft, narrow = stage.clientWidth < 700;
    right.set(1, 0, 0).applyQuaternion(st.camera.quaternion);
    const cur = parts.filter((li, i) => t > 0.1 + i * 0.12).at(-1);
    // where each part's outer edge lands on screen, then caption tops that never overlap on a side
    const anchors = parts.map((li, i) => {
      box.setFromObject(v.layers[i]); box.getCenter(pv);
      const half = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
      pv.addScaledVector(right, li.dataset.side === 'l' ? -half : half); pv.project(st.camera);
      return [ox + (pv.x + 1) / 2 * canvas.clientWidth, (1 - pv.y) / 2 * canvas.clientHeight];
    });
    const tops = []; const lastBottom = { l: -1e9, r: -1e9 };
    parts.forEach((li, i) => { const sd = li.dataset.side, want = clamp(anchors[i][1] - 22, 0, stage.clientHeight - li.offsetHeight); tops[i] = Math.max(want, lastBottom[sd] + 14); lastBottom[sd] = tops[i] + li.offsetHeight; });
    for (const sd of ['l', 'r']) { const over = lastBottom[sd] - stage.clientHeight; if (over > 0) parts.forEach((li, i) => { if (li.dataset.side === sd) tops[i] = Math.max(0, tops[i] - over); }); }
    parts.forEach((li, i) => {
      const left = li.dataset.side === 'l', shown = t > 0.1 + i * 0.12, [x, y] = anchors[i];
      li.classList.toggle('in', shown); li.classList.toggle('cur', li === cur);
      const top = tops[i]; li.style.top = top + 'px';
      const ex = left ? li.offsetLeft + li.offsetWidth + 18 : li.offsetLeft - 18, L = lines[i];
      L.l.setAttribute('x1', ex); L.l.setAttribute('y1', top + 22); L.l.setAttribute('x2', x); L.l.setAttribute('y2', y); L.c.setAttribute('cx', x); L.c.setAttribute('cy', y);
      L.l.style.opacity = L.c.style.opacity = shown && !narrow ? 1 : 0;
    });
  };
  st.resize(); requestAnimationFrame(tick);
}, { rootMargin: '800px' }).observe(insideSec);
