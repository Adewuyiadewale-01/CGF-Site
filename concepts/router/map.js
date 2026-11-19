// Vyre's home map: one apartment on level 4 of a harbourside building, drawn like a city map.
// The same geometry makes the light map (Traffic Planner), the dark map (Signal Map) and the
// coverage field. Pure functions, no DOM: used by the site and by scripts/router-maps.mjs.

export const W = 1600, H = 1000;

// the apartment (4.02) and its rooms
export const ROOMS = [
  { id: 'studio',  name: 'Studio',   x: 1080, y: 150, w: 200, h: 150, tint: 'violet' },
  { id: 'kitchen', name: 'Kitchen',  x: 1280, y: 150, w: 200, h: 150, tint: 'sand' },
  { id: 'living',  name: 'Living',   x: 1080, y: 300, w: 400, h: 260, tint: 'sand' },
  { id: 'bed',     name: 'Bedroom',  x: 900,  y: 150, w: 180, h: 210, tint: 'blue' },
  { id: 'kids',    name: 'Kids',     x: 900,  y: 360, w: 180, h: 200, tint: 'blue' },
  { id: 'bal',     name: 'Balcony',  x: 1480, y: 330, w: 70,  h: 190, tint: 'green' },
];
// walls as segments [x1, y1, x2, y2]; gaps are doorways
export const WALLS = [
  [900, 150, 1480, 150], [1480, 150, 1480, 330], [1480, 520, 1480, 560], [1480, 560, 1150, 560], [1110, 560, 900, 560], [900, 560, 900, 150], // shell, front door at 1110–1150
  [1080, 150, 1080, 215], [1080, 255, 1080, 400], [1080, 440, 1080, 560],   // bedrooms | studio & living
  [900, 360, 1035, 360],                                                      // bed | kids
  [1080, 300, 1160, 300], [1200, 300, 1330, 300], [1430, 300, 1480, 300],   // studio & kitchen | living
  [1280, 150, 1280, 300],                                                     // studio | kitchen
];
export const GLASS = [[1480, 330, 1480, 520]]; // balcony doors
export const FURNITURE = [
  { t: 'rect', x: 1235, y: 468, w: 150, h: 34, r: 8 },  // sofa
  { t: 'rect', x: 1385, y: 440, w: 34, h: 62, r: 8 },   // sofa return
  { t: 'rect', x: 1262, y: 400, w: 96, h: 44, r: 6 },   // coffee table
  { t: 'rect', x: 1452, y: 384, w: 12, h: 120, r: 2 },  // tv unit
  { t: 'circle', x: 1150, y: 360, r: 34 },              // dining table
  { t: 'rect', x: 920, y: 172, w: 100, h: 120, r: 6 },  // bed
  { t: 'rect', x: 920, y: 470, w: 70, h: 72, r: 6 },    // kids bed
  { t: 'rect', x: 1100, y: 162, w: 150, h: 26, r: 4 },  // studio desk
  { t: 'rect', x: 1292, y: 162, w: 176, h: 24, r: 3 },  // kitchen bench
  { t: 'rect', x: 1340, y: 222, w: 92, h: 34, r: 4 },   // island
];
export const AP = { router: [1300, 430], mini: [1040, 300] };
export const DEVICES = [
  { id: 'mac',     name: 'Studio Mac',     x: 1180, y: 205, icon: 'desk',  via: 'router' },
  { id: 'console', name: 'Console',        x: 1420, y: 470, icon: 'game',  via: 'router' },
  { id: 'tv',      name: 'Living room TV', x: 1458, y: 410, icon: 'tv',    via: 'router' },
  { id: 'phone',   name: 'Maya’s phone',   x: 980,  y: 250, icon: 'phone', via: 'mini' },
  { id: 'tablet',  name: 'Kids tablet',    x: 1000, y: 455, icon: 'tablet', via: 'mini' },
  { id: 'cam',     name: 'Door camera',    x: 1130, y: 548, icon: 'cam',   via: 'mini' },
];
// out of the flat, down the riser, along the street to the exchange
export const UPLINK = [[1300, 430], [1130, 520], [1130, 588], [860, 588], [800, 588], [800, 815], [1600, 815]];
export const HOPS = { door: [1130, 588], mdf: [800, 588], pit: [800, 815], exit: [1600, 815] };

// a smooth route from a device to the router (and through the mini if it hangs off it), then the uplink
export function routeFor(id) {
  const d = DEVICES.find((x) => x.id === id) || DEVICES[0];
  const pts = [[d.x, d.y]];
  if (d.via === 'mini') pts.push(AP.mini);
  if (id === 'mac') pts.push([1180, 330]);
  pts.push(...UPLINK);
  return pts;
}
// rounded polyline path
export function roundedPath(pts, r = 26) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], [cx, cy] = pts[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), rr = Math.min(r, l1 / 2, l2 / 2);
    const p1 = [bx - (bx - ax) / l1 * rr, by - (by - ay) / l1 * rr], p2 = [bx + (cx - bx) / l2 * rr, by + (cy - by) / l2 * rr];
    d += ` L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Q${bx} ${by} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const z = pts[pts.length - 1]; return d + ` L${z[0]} ${z[1]}`;
}

/* ---------- palettes ---------- */
export const LIGHT = {
  ground: '#EFEDE6', water: '#B9DCE6', waterLine: '#A3CFDB', waterText: '#6C9DAD', park: '#DCE7D3', parkLine: '#CBDCBF', parkText: '#7E9A72', tree: '#C9DBBC',
  road: '#FFFFFF', roadEdge: '#E1DDD3', roadText: '#9A958A', building: '#F8F6F1', buildingEdge: '#D8D2C6', unit: '#F3F0EA', unitText: '#ABA597', core: '#E7E3DA',
  wall: '#4A4652', wallThin: '#B9B3A7', furniture: '#E2DDD2', furnitureEdge: '#CFC8BA', roomText: '#8D877B',
  tints: { sand: '#FBF8F2', blue: '#F1F4F8', violet: '#F2F1FA', green: '#EAF1E5' }, glass: '#9FC9D8',
};
export const DARK = {
  ground: '#0E0D13', water: '#0F1424', waterLine: '#16203A', waterText: '#45507A', park: '#111A14', parkLine: '#18241B', parkText: '#3E5A45', tree: '#16231A',
  road: '#1A1922', roadEdge: '#22212C', roadText: '#4D4A5C', building: '#14131B', buildingEdge: '#24232F', unit: '#16151E', unitText: '#3F3D4E', core: '#1B1A24',
  wall: '#D9D7E8', wallThin: '#3A3848', furniture: '#1D1C27', furnitureEdge: '#2C2B39', roomText: '#6B6880',
  tints: { sand: '#17161F', blue: '#16161F', violet: '#18172A', green: '#131A16' }, glass: '#3B4C78',
};

/* ---------- the map as SVG ---------- */
export function mapSVG(P = LIGHT, { route = null, labels = true, apartmentOnly = false, marina = true } = {}) {
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Geist, Inter, system-ui, sans-serif">`);
  o.push(`<rect width="${W}" height="${H}" fill="${P.ground}"/>`);
  if (!apartmentOnly) {
    // the bay, with a soft shoreline
    o.push(`<path d="M0 0 H690 C660 70 600 110 610 190 C622 280 560 330 520 380 C470 440 420 470 300 500 C190 528 90 520 0 545 Z" fill="${P.water}"/>`);
    o.push(`<path d="M690 0 C660 70 600 110 610 190 C622 280 560 330 520 380 C470 440 420 470 300 500 C190 528 90 520 0 545" fill="none" stroke="${P.waterLine}" stroke-width="2"/>`);
    // a promenade along the water
    o.push(`<path d="M716 0 C688 76 632 116 640 196 C650 292 590 346 548 398 C496 460 438 496 312 528 C196 556 92 548 0 574" fill="none" stroke="${P.road}" stroke-width="10" stroke-linecap="round"/>`);
    // the park
    o.push(`<path d="M0 600 C120 580 260 590 380 560 C470 540 560 520 640 560 L700 640 L700 790 L0 790 Z" fill="${P.park}" stroke="${P.parkLine}" stroke-width="2"/>`);
    for (const [x, y, r] of [[90, 660, 22], [170, 700, 16], [260, 650, 26], [360, 715, 18], [470, 650, 20], [560, 720, 24], [640, 640, 14], [40, 740, 18]]) o.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${P.tree}"/>`);
    o.push(`<path d="M20 760 C160 700 300 760 420 690 C520 630 600 690 690 680" fill="none" stroke="${P.road}" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 9" opacity=".9"/>`);
    // a marina: a jetty, berths and a few boats (left out where copy sits on the water)
    if (marina) {
    o.push(`<path d="M330 120 H560 M380 120 V60 M420 120 V60 M460 120 V60 M500 120 V60 M380 120 V180 M420 120 V180 M460 120 V180 M500 120 V180" stroke="${P.road}" stroke-width="4" stroke-linecap="round"/>`);
    for (const [x, y, r] of [[400, 88, 0], [440, 150, 0], [480, 92, 0], [520, 150, 0], [360, 150, 0]]) o.push(`<path d="M${x - 7} ${y - 14} Q${x} ${y - 24} ${x + 7} ${y - 14} V${y + 12} Q${x} ${y + 18} ${x - 7} ${y + 12} Z" fill="${P.road}" stroke="${P.waterLine}" stroke-width="1"/>`);
    o.push(`<text x="445" y="40" fill="${P.waterText}" font-size="11" letter-spacing="1.5" text-anchor="middle">MARINA</text>`);
    }
    // streets
    o.push(`<rect x="0" y="800" width="${W}" height="60" fill="${P.road}"/><path d="M0 800 H${W} M0 860 H${W}" stroke="${P.roadEdge}" stroke-width="2"/>`);
    o.push(`<path d="M0 830 H${W}" stroke="${P.roadEdge}" stroke-width="1.5" stroke-dasharray="18 14"/>`);
    o.push(`<g fill="${P.road}">${Array.from({ length: 6 }, (_, i) => `<rect x="${744 + i * 9}" y="804" width="5" height="52"/>`).join('')}</g><g fill="${P.roadEdge}">${Array.from({ length: 6 }, (_, i) => `<rect x="${744 + i * 9}" y="806" width="5" height="48" opacity=".9"/>`).join('')}</g>`);
    for (let x = 60; x < W; x += 120) if (x < 700 || x > 1580) o.push(`<circle cx="${x}" cy="878" r="9" fill="${P.tree}"/>`); else o.push(`<circle cx="${x}" cy="878" r="9" fill="${P.tree}"/><circle cx="${x + 40}" cy="792" r="7" fill="${P.tree}"/>`);
    o.push(`<rect x="660" y="0" width="0" height="0"/>`);
    // blocks across the street
    for (const [x, w] of [[40, 260], [320, 300], [640, 340], [1000, 260], [1280, 300]]) o.push(`<rect x="${x}" y="890" width="${w}" height="140" rx="6" fill="${P.unit}" stroke="${P.buildingEdge}" stroke-width="1.5"/>`);
    // the building, level 4
    o.push(`<rect x="700" y="80" width="880" height="700" rx="14" fill="${P.building}" stroke="${P.buildingEdge}" stroke-width="2"/>`);
    // neighbours and the core
    o.push(`<rect x="716" y="96" width="160" height="300" rx="4" fill="${P.unit}" stroke="${P.buildingEdge}"/>`);
    o.push(`<rect x="716" y="410" width="160" height="150" rx="4" fill="${P.core}" stroke="${P.buildingEdge}"/>`);
    o.push(`<rect x="900" y="620" width="320" height="144" rx="4" fill="${P.unit}" stroke="${P.buildingEdge}"/><rect x="1236" y="620" width="328" height="144" rx="4" fill="${P.unit}" stroke="${P.buildingEdge}"/>`);
    // lift and stairs, drawn like map symbols
    o.push(`<rect x="740" y="432" width="48" height="48" rx="4" fill="none" stroke="${P.unitText}" stroke-width="1.5"/><path d="M752 450 l12 -8 l12 8 M752 462 l12 8 l12 -8" fill="none" stroke="${P.unitText}" stroke-width="1.5"/>`);
    o.push(`<g stroke="${P.unitText}" stroke-width="1.2">${Array.from({ length: 7 }, (_, i) => `<path d="M${806 + i * 8} 432 V520"/>`).join('')}</g>`);
    if (labels) {
      o.push(`<text x="796" y="250" fill="${P.unitText}" font-size="13" text-anchor="middle" letter-spacing="1">4.01</text>`);
      o.push(`<text x="1060" y="700" fill="${P.unitText}" font-size="13" text-anchor="middle" letter-spacing="1">4.04</text><text x="1400" y="700" fill="${P.unitText}" font-size="13" text-anchor="middle" letter-spacing="1">4.05</text>`);
      o.push(`<text x="796" y="545" fill="${P.unitText}" font-size="10.5" text-anchor="middle" letter-spacing="1.5">LIFT · STAIRS</text>`);
      o.push(`<text x="1230" y="600" fill="${P.unitText}" font-size="10.5" text-anchor="middle" letter-spacing="2">CORRIDOR</text>`);
      if (marina) o.push(`<text x="250" y="270" fill="${P.waterText}" font-size="22" font-style="italic" font-family="Newsreader, Georgia, serif" letter-spacing=".5">Rushcutters Bay</text>`);
      else o.push(`<text x="232" y="486" fill="${P.waterText}" font-size="18" font-style="italic" font-family="Newsreader, Georgia, serif" letter-spacing=".5">Rushcutters Bay</text>`);
      o.push(`<text x="190" y="640" fill="${P.parkText}" font-size="15" letter-spacing="1">Beare Park</text>`);
      o.push(`<text x="420" y="850" fill="${P.roadText}" font-size="13" letter-spacing="1.2">Ithaca Rd</text><text x="1200" y="850" fill="${P.roadText}" font-size="13" letter-spacing="1.2">Ithaca Rd</text>`);
      o.push(`<text x="1140" y="62" fill="${P.roadText}" font-size="12" letter-spacing="1.2" text-anchor="middle">THE ITHACA · LEVEL 4</text>`);
    }
  }
  // the flat: rooms, furniture, walls
  for (const r of ROOMS) o.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${P.tints[r.tint]}"/>`);
  for (const f of FURNITURE) o.push(f.t === 'circle'
    ? `<circle cx="${f.x}" cy="${f.y}" r="${f.r}" fill="${P.furniture}" stroke="${P.furnitureEdge}" stroke-width="1.2"/>`
    : `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="${f.r}" fill="${P.furniture}" stroke="${P.furnitureEdge}" stroke-width="1.2"/>`);
  o.push(`<g stroke="${P.wall}" stroke-width="5" stroke-linecap="square">${WALLS.map(([a, b, c, d]) => `<path d="M${a} ${b} L${c} ${d}"/>`).join('')}</g>`);
  o.push(`<g stroke="${P.glass}" stroke-width="4">${GLASS.map(([a, b, c, d]) => `<path d="M${a} ${b} L${c} ${d}"/>`).join('')}</g>`);
  // door swings
  o.push(`<g fill="none" stroke="${P.wallThin}" stroke-width="1.2"><path d="M1110 560 A40 40 0 0 1 1150 520"/><path d="M1080 215 A40 40 0 0 1 1120 255"/><path d="M1080 400 A40 40 0 0 1 1120 440"/><path d="M1035 360 A45 45 0 0 1 1080 405"/></g>`);
  if (labels) for (const r of ROOMS) o.push(`<text x="${r.x + 14}" y="${r.y + r.h - 14}" fill="${P.roomText}" font-size="10.5" letter-spacing="1.6">${r.name.toUpperCase()}</text>`);
  if (labels) o.push(`<text x="990" y="128" fill="${P.roomText}" font-size="11" letter-spacing="1.6" font-weight="600">4.02 · YOUR HOME</text>`);
  if (route) {
    const d = roundedPath(route);
    o.push(`<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#3D38FF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  o.push('</svg>');
  return o.join('');
}

/* ---------- coverage: two access points, each wall costs signal; soft shadows ---------- */
function crosses(px, py, qx, qy, ax, ay, bx, by) {
  const rx = qx - px, ry = qy - py, sx = bx - ax, sy = by - ay, d = rx * sy - ry * sx;
  if (Math.abs(d) < 1e-6) return false;
  const t = ((ax - px) * sy - (ay - py) * sx) / d, u = ((ax - px) * ry - (ay - py) * rx) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
}
// returns Float32Array(gw*gh) of 0..1 signal for one access point at grid resolution
export function fieldFor([ax, ay], { gw = 200, gh = 125, power = 1, wallLoss = 0.74, falloff = 0.0042 } = {}) {
  const out = new Float32Array(gw * gh), sx = W / gw, sy = H / gh;
  const jit = [[0, 0], [7, 0], [-7, 0], [0, 7], [0, -7]];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = (i + 0.5) * sx, y = (j + 0.5) * sy;
    const d = Math.hypot(x - ax, y - ay);
    let loss = 0;
    for (const [jx, jy] of jit) { let k = 1; for (const w of WALLS) if (crosses(ax + jx, ay + jy, x, y, w[0], w[1], w[2], w[3])) k *= wallLoss; for (const w of GLASS) if (crosses(ax + jx, ay + jy, x, y, w[0], w[1], w[2], w[3])) k *= 0.9; loss += k; }
    out[j * gw + i] = power * Math.exp(-d * falloff) * (loss / jit.length);
  }
  return out;
}
// combine router + mini (mini scaled by m in 0..1) and paint RGBA; inside = only paint where the flat is
export function paintField(a, b, m, rgba, { gw = 200, gh = 125, dark = true } = {}) {
  const stops = dark
    ? [[0, [14, 13, 19, 0]], [0.18, [40, 30, 140, 70]], [0.42, [61, 56, 255, 150]], [0.7, [124, 123, 255, 200]], [1, [214, 214, 255, 235]]]
    : [[0, [61, 56, 255, 0]], [0.3, [61, 56, 255, 30]], [0.7, [61, 56, 255, 80]], [1, [61, 56, 255, 130]]];
  const sx = W / gw, sy = H / gh;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = (i + 0.5) * sx, y = (j + 0.5) * sy, k = j * gw + i;
    const inFlat = x > 900 && x < 1550 && y > 150 && y < 560 && !(x > 1480 && (y < 330 || y > 520));
    let v = Math.max(a[k], b[k] * m); v = Math.min(1, Math.pow(v, 0.8) * 1.15);
    if (!inFlat) v *= 0.12;
    let c = stops[stops.length - 1][1];
    for (let s = 1; s < stops.length; s++) if (v <= stops[s][0]) { const [p0, c0] = stops[s - 1], [p1, c1] = stops[s], t = (v - p0) / (p1 - p0); c = c0.map((q, n) => q + (c1[n] - q) * t); break; }
    rgba[k * 4] = c[0]; rgba[k * 4 + 1] = c[1]; rgba[k * 4 + 2] = c[2]; rgba[k * 4 + 3] = c[3];
  }
  return rgba;
}
