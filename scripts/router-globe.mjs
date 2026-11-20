// Vyre's world view for the app dashboard: a dotted globe drawn like a technical instrument,
// with the live routes leaving Perth as lifted great-circle arcs.
// Land from Natural Earth 1:50m via world-atlas (public domain).
// usage: node scripts/router-globe.mjs   → concepts/router/assets/globe.png + globe.json
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const out = new URL('../concepts/router/assets/', import.meta.url).pathname;
const topo = JSON.parse(readFileSync(out + 'map/data/land-50m.json'));

/* --- topojson → polygons (rings of [lon, lat]) --- */
const { scale: [kx, ky], translate: [tx, ty] } = topo.transform;
const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => [(x += dx) * kx + tx, (y += dy) * ky + ty]); });
const arc = (i) => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
const ring = (ids) => ids.flatMap((i, k) => (k ? arc(i).slice(1) : arc(i)));
const polys = [];
for (const g of topo.objects.land.geometries) {
  if (g.type === 'Polygon') polys.push(g.arcs.map(ring));
  else if (g.type === 'MultiPolygon') g.arcs.forEach((p) => polys.push(p.map(ring)));
}
const boxes = polys.map((p) => { const r = p[0]; let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const [x, y] of r) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); } return [a, b, c, d]; });
const inRing = (x, y, r) => { let o = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) o = !o; } return o; };
const onLand = (lon, lat) => polys.some((p, k) => { const b = boxes[k]; return lon >= b[0] && lon <= b[1] && lat >= b[2] && lat <= b[3] && inRing(lon, lat, p[0]) && !p.slice(1).some((h) => inRing(lon, lat, h)); });

/* --- orthographic camera --- */
const S = 1600, R = 610, CX = S / 2, CY = S / 2 + 10, rad = Math.PI / 180;
const LON0 = 122, LAT0 = -6; // Singapore near the middle, Perth low-left, Tokyo up-right, Sydney right
const v3 = (lon, lat, h = 0) => {
  const l = (lon - LON0) * rad, p = lat * rad, p0 = LAT0 * rad, k = R * (1 + h);
  const x = Math.cos(p) * Math.sin(l), y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l), z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  return { x: CX + x * k, y: CY - y * k, z };
};

/* --- dots --- */
let dots = '';
for (let lat = -84; lat <= 84; lat += 0.82) {
  const step = 0.82 / Math.max(0.2, Math.cos(lat * rad));
  for (let lon = -180; lon < 180; lon += step) {
    const q = v3(lon, lat); if (q.z < 0.02) continue;
    if (!onLand(lon, lat)) continue;
    const r = (1.15 + q.z * 1.6).toFixed(2), a = (0.5 + q.z * 0.5).toFixed(2);
    dots += `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${r}" fill="#262322" fill-opacity="${a}"/>`;
  }
}

/* --- graticule, the instrument ring --- */
const path = (pts) => { let d = '', pen = false; for (const q of pts) { if (q.z < 0) { pen = false; continue; } d += (pen ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1); pen = true; } return d; };
let grat = '';
for (let lon = -180; lon < 180; lon += 15) grat += `<path d="${path(Array.from({ length: 121 }, (_, i) => v3(lon, -90 + i * 1.5)))}"/>`;
for (let lat = -75; lat <= 75; lat += 15) grat += `<path d="${path(Array.from({ length: 241 }, (_, i) => v3(-180 + i * 1.5, lat)))}"/>`;
let ticks = '';
for (let i = 0; i < 360; i += 2) {
  const a = i * rad, long = i % 30 === 0, mid = i % 10 === 0, r0 = R + 26, r1 = r0 + (long ? 22 : mid ? 13 : 7);
  ticks += `<line x1="${(CX + Math.cos(a) * r0).toFixed(1)}" y1="${(CY + Math.sin(a) * r0).toFixed(1)}" x2="${(CX + Math.cos(a) * r1).toFixed(1)}" y2="${(CY + Math.sin(a) * r1).toFixed(1)}" stroke-opacity="${long ? 0.55 : 0.28}"/>`;
}

/* --- routes: Perth out to the servers people are actually using tonight --- */
const PER = [115.86, -31.95];
const ROUTES = [
  { id: 'sg', name: 'Singapore', to: [103.82, 1.35], h: 0.42, on: true },
  { id: 'syd', name: 'Sydney', to: [151.21, -33.87], h: 0.2 },
  { id: 'tyo', name: 'Tokyo', to: [139.69, 35.68], h: 0.36 },
  { id: 'jkt', name: 'Jakarta', to: [106.85, -6.2], h: 0.14 },
  { id: 'lax', name: 'Los Angeles', to: [-118.24, 34.05], h: 0.1 },
  { id: 'fra', name: 'Frankfurt', to: [8.68, 50.11], h: 0.1 },
  { id: 'akl', name: 'Auckland', to: [174.76, -36.85], h: 0.22 },
];
const slerp = (a, b, t) => {
  const toV = ([lon, lat]) => [Math.cos(lat * rad) * Math.cos(lon * rad), Math.cos(lat * rad) * Math.sin(lon * rad), Math.sin(lat * rad)];
  const A = toV(a), B = toV(b), w = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])), s = Math.sin(w);
  const P = A.map((v, i) => (Math.sin((1 - t) * w) * v + Math.sin(t * w) * B[i]) / s);
  return [Math.atan2(P[1], P[0]) / rad, Math.asin(P[2]) / rad];
};
const meta = { size: S, R, center: [CX, CY], cities: {}, routes: {} };
let arcsSvg = '', glow = '', packets = '';
for (const r of ROUTES) {
  const pts = Array.from({ length: 161 }, (_, i) => { const t = i / 160, [lo, la] = slerp(PER, r.to, t); return v3(lo, la, r.h * Math.sin(Math.PI * t)); });
  // a lifted point stays visible while it clears the limb: test against the globe's silhouette, not just z
  const vis = pts.map((q) => q.z >= 0 || Math.hypot(q.x - CX, q.y - CY) > R + 1);
  const d = pts.reduce((s, q, i) => s + (vis[i] ? ((i && vis[i - 1]) ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1) : ''), '');
  if (r.on) {
    glow += `<path d="${d}" stroke="#3D38FF" stroke-width="34" stroke-opacity=".22"/>`;
    arcsSvg += `<path d="${d}" stroke="#3D38FF" stroke-width="8"/>`;
  } else arcsSvg += `<path d="${d}" stroke="#3D38FF" stroke-opacity=".85" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>`;
  for (const t of r.on ? [0.22, 0.47, 0.71] : [0.38, 0.74]) { const q = pts[Math.round(t * 160)]; if (vis[Math.round(t * 160)]) packets += `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${r.on ? 7 : 4.5}" fill="${r.on ? '#fff' : '#3D38FF'}" ${r.on ? 'stroke="#3D38FF" stroke-width="4"' : ''}/>`; }
  const end = v3(...r.to), top = pts[80], last = [...pts].reverse().find((q, i) => vis[160 - i]);
  meta.routes[r.id] = { name: r.name, end: [end.x, end.y], endVisible: end.z > 0, mid: [top.x, top.y], last: [last.x, last.y], d: d.replace(/(\d+\.\d)\d*/g, '$1') };
  if (end.z > 0) packets += `<circle cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="${r.on ? 11 : 7}" fill="#FFFFFB" stroke="#3D38FF" stroke-width="${r.on ? 5 : 3.5}"/>`;
}
const per = v3(...PER); meta.cities.perth = [per.x, per.y];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<defs>
  <radialGradient id="sea" cx="42%" cy="36%" r="70%"><stop offset="0" stop-color="#FFFFFB"/><stop offset=".72" stop-color="#F1F0EA"/><stop offset="1" stop-color="#E4E2DB"/></radialGradient>
  <radialGradient id="rim" cx="50%" cy="50%" r="50%"><stop offset=".86" stop-color="#3D38FF" stop-opacity="0"/><stop offset="1" stop-color="#262322" stop-opacity=".07"/></radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  <clipPath id="disc"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
</defs>
<ellipse cx="${CX}" cy="${CY + R + 46}" rx="${R * 0.78}" ry="34" fill="#262322" fill-opacity=".10" filter="url(#soft)"/>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#sea)"/>
<g clip-path="url(#disc)" fill="none" stroke="#262322" stroke-opacity=".12" stroke-width="1.3">${grat}</g>
<g>${dots}</g>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#rim)"/>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#262322" stroke-opacity=".22" stroke-width="1.5"/>
<circle cx="${CX}" cy="${CY}" r="${R + 26}" fill="none" stroke="#262322" stroke-opacity=".18" stroke-width="1.2"/>
<g stroke="#262322" stroke-width="1.4">${ticks}</g>
<g fill="none" filter="url(#soft)">${glow}</g>
<g fill="none" stroke-linecap="round">${arcsSvg}</g>
${packets}
<circle cx="${per.x}" cy="${per.y}" r="46" fill="#3D38FF" fill-opacity=".10"/>
<circle cx="${per.x}" cy="${per.y}" r="26" fill="#3D38FF" fill-opacity=".18"/>
<circle cx="${per.x}" cy="${per.y}" r="14" fill="#3D38FF" stroke="#FFFFFB" stroke-width="5"/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(out + 'globe.png');
// the site draws the routes live on top of a bare globe, so it can switch and animate them
const base = svg.replace(/<g fill="none" filter="url\(#soft\)">[\s\S]*<\/svg>/, '</svg>');
await sharp(Buffer.from(base)).png({ palette: true, quality: 92, compressionLevel: 9 }).toFile(out + 'globe-base.png');
writeFileSync(out + 'globe.json', JSON.stringify(meta, null, 1));
console.log(JSON.stringify(meta));
