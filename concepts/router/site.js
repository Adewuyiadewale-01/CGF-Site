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
