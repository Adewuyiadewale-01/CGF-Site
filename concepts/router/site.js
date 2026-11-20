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

/* the vyre app: every route out of the house, live on a globe */
const appSec = $('#app');
if (appSec) (async () => {
  const dash = $('#dash'), size = $('#dashSize'), scroller = $('#dashScroll'), device = $('#device'), NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.append(n); return n; };
  // fit the 1172 × 733 artboard to the device; on phones it keeps a readable size and scrolls sideways
  const fit = () => { const w = scroller.clientWidth, k = innerWidth <= 760 ? 0.66 : w / 1172; dash.style.setProperty('--k', k); size.style.width = innerWidth <= 760 ? 1172 * k + 'px' : ''; size.style.height = 733 * k + 'px'; };
  new ResizeObserver(fit).observe(scroller); fit();
  // the device leans back until it arrives, then lies flat
  const tilt = () => { if (reduced || innerWidth <= 760) return device.style.setProperty('--tilt', 0); const r = device.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.75))); device.style.setProperty('--tilt', (1 - p * p * (3 - 2 * p)).toFixed(3)); };
  addEventListener('scroll', tilt, { passive: true }); addEventListener('resize', tilt); tilt();

  // small drawn details: the logo's dot matrix and the router drawing's ribs
  [3, 5, 7, 7, 7, 5, 3].forEach((n, row) => { for (let i = 0; i < n; i++) el('circle', { cx: 27.67 + (i - (n - 1) / 2) * 3.2556, cy: 17.9 + row * 3.2556, r: 1.22 }, $('#logoDots')); });
  for (let i = 0, y = 56.97; y < 228; i++, y += 5.86) el('path', { d: `M19.5 ${y.toFixed(1)}H94.4`, opacity: i % 5 ? .25 : .55 }, $('#drawRules'));

  const ROUTES = {
    sg: { city: 'Singapore', svc: 'Valorant · SG-1', cat: 'Gaming', ms: 38.2, isp: 74, fly: '1,840 km over the Indian Ocean', at: [10, -10], hops: [['Cable landing', 'Perth coast', 3.0], ['Subsea west', '3,900 km · Indian Ocean', 34.6], ['SG-1 edge', 'Singapore', 38.2]] },
    syd: { city: 'Sydney', svc: 'Zoom · Sydney', cat: 'Calls', ms: 47.1, isp: 63, fly: '1,650 km across the Nullarbor', at: [6, -30], hops: [['Nullarbor fibre', '2,700 km · overland', 39.5], ['Adelaide relay', 'South Australia', 42.8], ['Sydney edge', 'New South Wales', 47.1]] },
    tyo: { city: 'Tokyo', svc: 'Steam · Tokyo', cat: 'Downloads', ms: 96.4, isp: 131, fly: '3,900 km over the South China Sea', at: [10, -10], hops: [['Singapore relay', 'via Subsea west', 38.6], ['Subsea north', '5,300 km · South China Sea', 91.7], ['Tokyo edge', 'Japan', 96.4]] },
    jkt: { city: 'Jakarta', svc: 'Mobile Legends · JKT', cat: 'Gaming', ms: 33.2, isp: 52, fly: '1,500 km over the Indian Ocean', at: [11, -7], hops: [['Cable landing', 'Perth coast', 3.0], ['Subsea west', '3,000 km · Indian Ocean', 30.1], ['Jakarta edge', 'Indonesia', 33.2]] },
    akl: { city: 'Auckland', svc: 'Slack huddle · AKL', cat: 'Calls', ms: 71.3, isp: 88, fly: '2,600 km over the Tasman Sea', at: [-84, 10], hops: [['Sydney relay', 'via Nullarbor fibre', 47.1], ['Tasman cable', '2,200 km · Tasman Sea', 67.9], ['Auckland edge', 'New Zealand', 71.3]] },
    lax: { city: 'Los Angeles', svc: 'Twitch ingest · LA', cat: 'Streaming', ms: 148.2, isp: 192, fly: '7,400 km over the Pacific', at: [-112, -34], arrow: 'r', hops: [['Sydney relay', 'via Nullarbor fibre', 47.1], ['Trans-Pacific', '12,000 km · Pacific', 143.6], ['LA edge', 'California', 148.2]] },
    fra: { city: 'Frankfurt', svc: 'GitHub · Frankfurt', cat: 'Work', ms: 211.4, isp: 248, fly: '6,900 km over the Arabian Sea', at: [-76, -31], arrow: 'l', hops: [['Singapore relay', 'via Subsea west', 38.6], ['Subsea Europe', '10,200 km · via Suez', 205.3], ['Frankfurt edge', 'Germany', 211.4]] },
  };
  const ORDER = ['sg', 'syd', 'jkt', 'akl', 'tyo', 'lax', 'fra'];
  let geo; try { geo = await (await fetch('./assets/globe.json')).json(); } catch { return; }
  const D = ([x, y]) => [222 + x * 0.4875, y * 0.4875];
  const svg = $('#routesSvg'), gGlow = el('g', {}, svg), gArc = el('g', {}, svg), gDots = el('g', {}, svg);
  const per = geo.cities.perth;
  for (const id of ORDER) {
    const r = ROUTES[id], g = geo.routes[id];
    r.glow = el('path', { d: g.d, class: 'glow' }, gGlow); r.arc = el('path', { d: g.d, class: 'arc' }, gArc);
    if (g.endVisible) r.end = el('circle', { cx: g.end[0], cy: g.end[1], r: 7, class: 'end' }, gDots);
    r.anchor = D(g.endVisible ? g.end : g.last); r.mid = D(g.mid); r.len = r.arc.getTotalLength();
    const p = document.createElement('button'); p.type = 'button'; p.className = 'pill'; p.dataset.id = id;
    p.innerHTML = r.arrow === 'l' ? `<b>←&nbsp; ${r.city}</b><span>${Math.round(r.ms)} ms</span>` : `<b>${r.city}${r.arrow ? '&nbsp; →' : ''}</b><span>${Math.round(r.ms)} ms</span>`;
    p.style.left = r.anchor[0] + r.at[0] + 'px'; p.style.top = r.anchor[1] + r.at[1] + 'px'; p.setAttribute('aria-label', `Show the route to ${r.city}`);
    $('#pills').append(p); r.pill = p;
  }
  el('circle', { cx: per[0], cy: per[1], r: 26, class: 'ping' }, gDots);
  el('circle', { cx: per[0], cy: per[1], r: 14, class: 'home-dot' }, gDots);
  const pk = [0, 1, 2].map(() => el('circle', { r: 7, class: 'pk' }, gDots));
  const pp = D(per), me = document.createElement('span'); me.className = 'pill dark'; me.innerHTML = '<b>Vyre One · Perth</b>'; me.style.left = pp[0] + 12 + 'px'; me.style.top = pp[1] + 11 + 'px'; $('#pills').append(me);

  // the list view
  const list = $('#routeList');
  list.innerHTML = '<div class="lr" role="row"><span>Route</span><span>Traffic</span><span>ISP</span><span>Vyre</span><span>Saved</span></div>' + ORDER.map((id) => { const r = ROUTES[id]; return `<button type="button" class="lr" role="row" data-id="${id}"><span><b>Perth → ${r.city}</b><small>${r.svc}</small></span><span>${r.cat}</span><span class="m">${r.isp} ms</span><span class="m v">${Math.round(r.ms)} ms</span><span class="bars"><i style="width:${r.isp / 2.5}%"></i><i style="width:${r.ms / 2.5}%"></i></span></button>`; }).join('');

  // home view: lanes from Vyre One to the rooms
  // pin spots are measured on the 1026 × 684 render placed at (97, 33); the render now sits smaller, clear of the title
  const IMG = { x: 280, y: 70, k: 800 / 1026 }, H = ([x, y]) => [IMG.x + (x - 97) * IMG.k, IMG.y + (y - 33) * IMG.k];
  const HOME = { hub: H([815.5, 326.5]), pins: [[...H([414.5, 236.5]), 'big'], [...H([685, 205]), 'Bedroom · Phone'], [...H([657, 370]), 'Living · TV 4K'], [...H([741, 423]), 'Den · Console 9.8 ms']] };
  const lanes = $('#lanesSvg'), hp = $('#homePins');
  HOME.pins.forEach(([x, y, label], i) => {
    const [hx, hy] = HOME.hub, cx = (x + hx) / 2, cy = Math.min(y, hy) - 40 - i * 6;
    el('path', { d: `M${hx} ${hy}Q${cx} ${cy} ${x} ${y}`, class: i ? '' : 'on' }, lanes);
    const pin = document.createElement('i'); pin.className = 'hpin' + (i ? '' : ' big'); pin.style.left = x + 'px'; pin.style.top = y + 'px'; hp.append(pin);
    if (i) { const t = document.createElement('span'); t.className = 'pill'; t.style.cursor = 'default'; t.innerHTML = `<b>${label.split(' · ')[0]}</b><span>${label.split(' · ').slice(1).join(' · ')}</span>`; t.style.left = x + 10 + 'px'; t.style.top = y - 8 + 'px'; if (x > 740) { t.style.left = x - 10 + 'px'; t.style.transform = 'translateX(-100%)'; } hp.append(t); }
  });
  const hub = document.createElement('span'); hub.className = 'pill dark'; hub.innerHTML = '<b>Vyre One</b>'; hub.style.left = HOME.hub[0] - 16 + 'px'; hub.style.top = HOME.hub[1] - 10 + 'px'; hub.style.transform = 'translateX(-100%)'; hp.append(hub);
  const hubPin = document.createElement('i'); hubPin.className = 'hpin big'; hubPin.style.left = HOME.hub[0] + 'px'; hubPin.style.top = HOME.hub[1] + 'px'; hp.append(hubPin);

  // selecting a route updates the arc, the callout, the in-flight tag and the left panel
  let cur = 'sg', view = 'globe';
  const callout = $('#callout'), line = $('#leaderLine'), flight = $('#flight');
  const fmt = (v) => v.toFixed(1);
  function placeCallout() {
    if (view === 'home') { callout.style.left = HOME.pins[0][0] - 30 + 'px'; callout.style.top = HOME.pins[0][1] - 128 + 'px'; $('#cK').textContent = 'Studio · Video call'; $('#cMs').textContent = '3.1'; $('#cWas').textContent = '4K · lane 1 of 23'; return; }
    const r = ROUTES[cur], [ax, ay] = r.anchor;
    let x = ax - 185, y = ay - 76; x = Math.min(Math.max(x, 338), 720); y = Math.min(Math.max(y, 72), 560);
    callout.style.left = x + 'px'; callout.style.top = y + 'px';
    const ex = x + 166 < ax ? x + 166 : x > ax ? x : x + 83, ey = x + 166 < ax || x > ax ? y + 44 : y + 88;
    line.setAttribute('x1', ex); line.setAttribute('y1', ey); line.setAttribute('x2', ax); line.setAttribute('y2', ay);
    $('#cK').textContent = r.svc; $('#cWas').textContent = `Was ${r.isp} ms on your ISP’s path`;
    $('#flightTxt').textContent = r.fly; flight.style.left = r.mid[0] - 12 - flight.offsetWidth + 'px'; flight.style.top = r.mid[1] - 11 + 'px';
  }
  function select(id) {
    cur = id; const r = ROUTES[id];
    for (const k of ORDER) { const o = ROUTES[k], on = k === id; o.arc.classList.toggle('on', on); o.glow.classList.toggle('on', on); o.end?.classList.toggle('on', on); o.end?.setAttribute('r', on ? 11 : 7); o.pill.classList.toggle('on', on); }
    $('#rTitle').innerHTML = `Perth →<br>${r.city}`; $('#rCat').textContent = r.cat;
    const hops = [['Vyre One', 'Home · Perth', 0.4], ['WA exchange', 'Peering · 2 km', 2.1], ...r.hops];
    $('#hops').innerHTML = hops.map(([a, b, ms], i) => `<li class="${i === 3 ? 'lead' : ''}"><b>${a}</b><small>${b}</small><em>${fmt(ms)}</em></li>`).join('');
    $('#ispMs').textContent = r.isp + ' ms'; $('#ispBar').style.width = '92%'; $('#vyreBar').style.width = (92 * r.ms / r.isp).toFixed(1) + '%';
    $('#saved').textContent = '−' + Math.round(r.isp - r.ms); $('#eSaved').textContent = Math.round(r.isp - r.ms) + ' ms';
    tickMs(); placeCallout();
  }
  function tickMs() {
    if (view === 'home') return;
    const r = ROUTES[cur], v = r.ms + (Math.random() - 0.5) * (reduced ? 0 : 0.8);
    $('#cMs').textContent = Math.round(v); $('#vyreMs').textContent = Math.round(v) + ' ms';
    const last = $('#hops li:last-child em'); if (last) last.textContent = fmt(v);
  }
  $('#pills').addEventListener('click', (e) => { const b = e.target.closest('.pill[data-id]'); if (b) select(b.dataset.id); });
  list.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) { select(b.dataset.id); setView('globe'); } });

  const TITLES = { globe: ['Live<br>Routes', '47 routes · 6 regions · live'], home: ['Home<br>Overview', '23 devices · 5 rooms · live'], list: ['All<br>Routes', '7 pinned of 47 · sorted by traffic'] };
  function setView(v) {
    view = v; dash.dataset.view = v;
    $$('.d-switch button').forEach((b) => b.setAttribute('aria-selected', b.dataset.v === v));
    $('#dTitle').innerHTML = TITLES[v][0]; $('#dSub').textContent = TITLES[v][1];
    if (v === 'home') placeCallout(); else select(cur);
  }
  $$('.d-switch button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.v)));

  // latency budget: a tighter budget means Vyre re-routes more often
  const budget = $('#budget');
  const onBudget = () => { const v = +budget.value; $('#budgetV').textContent = v + ' ms'; $('#budgetFill').style.width = (v / 20 * 100).toFixed(1) + '%'; $('#reroutes').textContent = Math.max(2, Math.round(12 + (8 - v) * 1.6)); };
  budget.addEventListener('input', onBudget); onBudget();

  select('sg');
  // live: packets ride the pinned arc; numbers breathe every two seconds
  let on = false; new IntersectionObserver(([e]) => { on = e.isIntersecting; }, { rootMargin: '200px' }).observe(appSec);
  let gb = 72.3;
  setInterval(() => {
    if (!on) return; tickMs();
    const s = 98.4 + Math.random() * 0.4; $('#score').textContent = s.toFixed(1); $('#gaugeArc').setAttribute('stroke-dasharray', `${(128.4 + (s - 98.6) * 6).toFixed(1)} 138`);
    $('#jitter').textContent = (0.6 + Math.random() * 0.4).toFixed(1) + ' ms';
    if (Math.random() < 0.5) $('#abroad').textContent = (gb += 0.1).toFixed(1) + ' GB';
  }, 2000);
  const step = (now) => {
    requestAnimationFrame(step); if (!on || view !== 'globe') return;
    const r = ROUTES[cur], t = reduced ? 0 : now / 2600;
    pk.forEach((c, i) => { const q = r.arc.getPointAtLength(((t + i / 3) % 1) * r.len); c.setAttribute('cx', q.x); c.setAttribute('cy', q.y); });
  };
  requestAnimationFrame(step);
})();
