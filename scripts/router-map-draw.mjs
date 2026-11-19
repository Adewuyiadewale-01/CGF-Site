// Draw Vyre's city map of Perth from OpenStreetMap data (© OpenStreetMap contributors, ODbL),
// in the palette of an atlas: pale blue water, olive land, soft greens, white roads, tiny labels.
// usage: node scripts/router-map-draw.mjs  (reads concepts/router/assets/map/data/perth.json)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('../cgf-3d/node_modules/playwright');
const sharp = require('sharp');
const dir = new URL('../concepts/router/assets/map/', import.meta.url).pathname;
const W = 2784, H = 2300, Z = 13, west = 115.53, north = -31.80;
const mx = (lon) => (lon + 180) / 360 * 2 ** Z * 256;
const my = (lat) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** Z * 256; };
const X0 = mx(west), Y0 = my(north);
const P = (g) => g.map((p) => [Math.round((mx(p.lon) - X0) * 2) / 2, Math.round((my(p.lat) - Y0) * 2) / 2]);
const inView = (pts) => pts.some(([x, y]) => x > -200 && x < W + 200 && y > -200 && y < H + 200);
const d = JSON.parse(readFileSync(dir + 'data/perth.json'));
const L = { coast: [], water: [], green: [], wood: [], sand: [], roads: { motorway: [], trunk: [], primary: [], secondary: [] }, runway: [], places: [] };
for (const e of d.elements) {
  const t = e.tags || {};
  if (e.type === 'node') { if (t.name) { const [p] = P([e]); if (p[0] > 20 && p[0] < W - 20 && p[1] > 20 && p[1] < H - 20) L.places.push({ p, n: t['name:en'] || t.name, k: t.place }); } continue; }
  const rings = e.type === 'way' ? [P(e.geometry)] : (e.members || []).filter((m) => m.geometry).map((m) => P(m.geometry));
  if (!rings.length || !rings.some(inView)) continue;
  if (t.natural === 'coastline') L.coast.push(rings[0]);
  else if (t.natural === 'water') L.water.push(rings);
  else if (t.natural === 'wood' || t.landuse === 'forest' || t.leisure === 'nature_reserve' || t.natural === 'scrub') L.wood.push(rings);
  else if (t.natural === 'beach' || t.natural === 'sand') L.sand.push(rings);
  else if (t.leisure || t.landuse || t.natural) L.green.push(rings);
  else if (t.highway) (L.roads[t.highway] || []).push(rings[0]);
  else if (t.aeroway) L.runway.push(rings[0]);
}
console.log('coast', L.coast.length, 'water', L.water.length, 'wood', L.wood.length, 'green', L.green.length, 'places', L.places.length);

const THEMES = {
  light: { land: '#D8DFBF', water: '#9DD2DE', wood: '#C7D8AC', green: '#CFDDB4', sand: '#EAE6CC', road: ['#FBF9EF', '#FBF9EF', '#F7F4E6', '#EEEDDB'], roadCase: '#C9CDB0', runway: '#E4E3D2', label: '#6E716A', city: '#3B3D38', water_label: '#5E99A8', shore: '#8FC6D3' },
  dark:  { land: '#2E2D2C', water: '#232120', wood: '#33322F', green: '#32312E', sand: '#353330', road: ['#45423F', '#403D3A', '#3A3836', '#363432'], roadCase: '#2A2928', runway: '#3A3836', label: '#6E6762', city: '#9A928C', water_label: '#4B4643', shore: '#2A2827' },
};
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 800, height: 600 } });
await page.setContent('<canvas id="c"></canvas>');
for (const [name, T] of Object.entries(THEMES)) {
  const png = await page.evaluate(async ({ L, T, W, H }) => {
    const c = document.getElementById('c'); c.width = W; c.height = H; const g = c.getContext('2d');
    const path = (rings) => { g.beginPath(); for (const r of rings) { r.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); } };
    // 1. the sea: coastline as a barrier, flood-filled from the open ocean on the left
    const m = document.createElement('canvas'); m.width = W; m.height = H; const mg = m.getContext('2d');
    mg.fillStyle = '#000'; mg.fillRect(0, 0, W, H); mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.lineJoin = 'round';
    for (const r of L.coast) { mg.beginPath(); r.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.stroke(); }
    const md = mg.getImageData(0, 0, W, H).data, sea = new Uint8Array(W * H), stack = [[4, Math.round(H * 0.5)], [4, 8], [4, H - 8]];
    while (stack.length) { const [x, y] = stack.pop(); if (x < 0 || y < 0 || x >= W || y >= H) continue; const k = y * W + x; if (sea[k] || md[k * 4] > 100) continue; sea[k] = 1; stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    g.fillStyle = T.land; g.fillRect(0, 0, W, H);
    const img = g.getImageData(0, 0, W, H), hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), wc = hx(T.water);
    for (let k = 0; k < W * H; k++) if (sea[k] || md[k * 4] > 100 && (sea[k - 1] || sea[k + 1])) { img.data[k * 4] = wc[0]; img.data[k * 4 + 1] = wc[1]; img.data[k * 4 + 2] = wc[2]; }
    g.putImageData(img, 0, 0);
    // 2. land cover
    for (const [set, col] of [[L.wood, T.wood], [L.green, T.green], [L.sand, T.sand]]) { g.fillStyle = col; for (const r of set) { path(r); g.fill('evenodd'); } }
    // land cover stops at the shore: repaint the open sea over any marine reserve
    { const im = g.getImageData(0, 0, W, H); for (let k = 0; k < W * H; k++) if (sea[k]) { im.data[k * 4] = wc[0]; im.data[k * 4 + 1] = wc[1]; im.data[k * 4 + 2] = wc[2]; } g.putImageData(im, 0, 0); }
    // 3. rivers and lakes
    g.fillStyle = T.water; for (const r of L.water) { path(r); g.fill('evenodd'); }
    g.strokeStyle = T.shore; g.lineWidth = 1.2; for (const r of L.coast) { g.beginPath(); r.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
    // 4. runways and roads
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = T.runway; g.lineWidth = 9; for (const r of L.runway) { path([r]); g.stroke(); }
    const widths = { motorway: 4.2, trunk: 3.4, primary: 2.2, secondary: 1.4 }, order = ['secondary', 'primary', 'trunk', 'motorway'];
    order.forEach((k) => { g.strokeStyle = T.roadCase; g.lineWidth = widths[k] + 1.6; for (const r of L.roads[k]) { path([r]); g.stroke(); } });
    order.forEach((k, i) => { g.strokeStyle = T.road[3 - i]; g.lineWidth = widths[k]; for (const r of L.roads[k]) { path([r]); g.stroke(); } });
    // 5. labels: suburbs small, the city larger, islands italic; spaced so they never pile up
    await document.fonts.load('22px Helvetica');
    const placed = [];
    const free = (x, y, w, h) => !placed.some((b) => x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1]);
    const label = (txt, x, y, size, col, italic, dot) => { g.font = `${italic ? 'italic ' : ''}${size}px Helvetica, Arial, sans-serif`; const w = g.measureText(txt).width; const bx = x - w / 2, by = y - size - (dot ? 10 : 0); if (!free(bx - 14, by - 6, w + 28, size + 18)) return; placed.push([bx - 14, by - 6, w + 28, size + 18]); g.fillStyle = col; g.textAlign = 'center'; g.fillText(txt, x, y - (dot ? 10 : 0)); if (dot) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fillStyle = col; g.fill(); } };
    const pri = { city: 0, town: 1, island: 2, suburb: 3 };
    for (const p of [...L.places].sort((a, b) => pri[a.k] - pri[b.k])) {
      if (p.k === 'city') label(p.n, p.p[0], p.p[1], 34, T.city, false, true);
      else if (p.k === 'town') label(p.n, p.p[0], p.p[1], 25, T.city, false, true);
      else if (p.k === 'island') label(p.n, p.p[0], p.p[1], 22, T.water_label, true, false);
      else label(p.n, p.p[0], p.p[1], 19, T.label, false, false);
    }
    g.save(); g.translate(W * 0.2, H * 0.62); g.rotate(-0.32); g.font = 'italic 40px Georgia, serif'; g.fillStyle = T.water_label; g.textAlign = 'center'; g.fillText('Indian Ocean', 0, 0); g.restore();
    return c.toDataURL('image/png');
  }, { L, T, W, H });
  await sharp(Buffer.from(png.split(',')[1], 'base64')).jpeg({ quality: 88, mozjpeg: true }).toFile(dir + `perth-${name}.jpg`);
  console.log('wrote', name);
}
await b.close();
