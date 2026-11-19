// Isometric hero: Sydney properties on white plinths, all wired back to the CGF depot.
// Pick a property and current runs along its cable to it.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

const VOLT = new THREE.Color(0x4A3AFF);
const INK = new THREE.Color(0x1C1C20);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('iso');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0xffffff);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
const resolution = new THREE.Vector2();
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- materials: flat white faces, two greys for the sides ---------- */
const M = {
  top: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  left: new THREE.MeshBasicMaterial({ color: 0xF5F5F7 }),   // +z face
  right: new THREE.MeshBasicMaterial({ color: 0xE8E8EC }),  // +x face
  hidden: new THREE.MeshBasicMaterial({ color: 0xffffff }),
};
const faceSet = (top = M.top) => [M.right, M.hidden, top, M.hidden, M.left, M.hidden];
const edgeMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 });
const fineMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.16 });

function boxAt(parent, w, h, d, x, y, z, { top, edges = edgeMat } = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, faceSet(top)); m.position.set(x + 0, y + h / 2, z);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edges); m.add(e);
  parent.add(m); return m;
}
function gable(parent, w, d, rise, x, y, z, { edges = edgeMat, alongX = true } = {}) {
  // triangular prism roof; ridge runs along x (alongX) or z
  const s = new THREE.Shape(); const half = (alongX ? d : w) / 2;
  s.moveTo(-half, 0); s.lineTo(half, 0); s.lineTo(0, rise); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: alongX ? w : d, bevelEnabled: false });
  g.translate(0, 0, -(alongX ? w : d) / 2);
  const m = new THREE.Mesh(g, [M.left, M.top]);
  if (alongX) m.rotation.y = Math.PI / 2;
  m.position.set(x, y, z);
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), edges));
  parent.add(m); return m;
}
function lines(parent, segs, mat = fineMat) {
  const g = new THREE.BufferGeometry().setFromPoints(segs); const l = new THREE.LineSegments(g, mat); parent.add(l); return l;
}
// window grid on the +z face (zFace) or +x face (xFace) of a box
function windowsZ(parent, x0, x1, y0, y1, z, cols, rows, mat) {
  const s = [], cw = (x1 - x0) / cols, rh = (y1 - y0) / rows;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const a = x0 + c * cw + cw * 0.22, b = x0 + (c + 1) * cw - cw * 0.22, p = y0 + r * rh + rh * 0.25, q = y0 + (r + 1) * rh - rh * 0.2;
    s.push(V(a,p,z),V(b,p,z), V(b,p,z),V(b,q,z), V(b,q,z),V(a,q,z), V(a,q,z),V(a,p,z));
  }
  return lines(parent, s, mat);
}
function windowsX(parent, z0, z1, y0, y1, x, cols, rows, mat) {
  const s = [], cw = (z1 - z0) / cols, rh = (y1 - y0) / rows;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const a = z0 + c * cw + cw * 0.22, b = z0 + (c + 1) * cw - cw * 0.22, p = y0 + r * rh + rh * 0.25, q = y0 + (r + 1) * rh - rh * 0.2;
    s.push(V(x,p,a),V(x,p,b), V(x,p,b),V(x,q,b), V(x,q,b),V(x,q,a), V(x,q,a),V(x,p,a));
  }
  return lines(parent, s, mat);
}

/* ---------- plinths ---------- */
const DEPTH = 60;
function plinth(cx, cz, size, top, hatch = true) {
  const g = new THREE.Group(); scene.add(g);
  boxAt(g, size, top + DEPTH, size, cx, -DEPTH, cz);
  // faint vertical rules on the two visible sides
  const s = [];
  for (let i = 1; i < size / 0.9; i++) { const t = -size / 2 + i * 0.9; s.push(V(cx + size / 2 + 0.01, top - 0.3, cz + t), V(cx + size / 2 + 0.01, top - 6, cz + t)); }
  lines(g, s, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.05 }));
  if (hatch) { // diagonal hatch strip along the front edge of the top
    const h = [], y = top + 0.01, x0 = cx - size / 2, z1 = cz + size / 2;
    for (let i = 0; i <= size; i += 0.7) { h.push(V(x0 + i, y, z1), V(Math.min(x0 + i + 1.6, cx + size / 2), y, z1 - Math.min(1.6, cx + size / 2 - x0 - i))); }
    lines(g, h, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.12 }));
  }
  return g;
}

/* ---------- buildings (each returns its edge materials so they can light up) ---------- */
function liveEdges() { return new THREE.LineBasicMaterial({ color: INK.clone(), transparent: true, opacity: 0.85 }); }

function house(x, y, z, s = 1, extra = {}) {
  const e = liveEdges(), f = new THREE.LineBasicMaterial({ color: INK.clone(), transparent: true, opacity: 0.4 });
  const g = new THREE.Group(); scene.add(g);
  boxAt(g, 4.6 * s, 2.2 * s, 3.4 * s, x, y, z, { edges: e });
  gable(g, 4.9 * s, 3.8 * s, 1.5 * s, x, y + 2.2 * s, z, { edges: e });
  boxAt(g, 2.2 * s, 1.6 * s, 2.4 * s, x + 2.6 * s, y, z + 1.6 * s, { edges: e });          // garage wing
  gable(g, 2.4 * s, 2.6 * s, 0.9 * s, x + 2.6 * s, y + 1.6 * s, z + 1.6 * s, { edges: e, alongX: false });
  windowsZ(g, x - 2.1 * s, x + 0.6 * s, y + 0.5 * s, y + 1.9 * s, z + 1.71 * s, 3, 1, f);
  windowsX(g, z - 1.5 * s, z + 0.9 * s, y + 0.4 * s, y + 1.9 * s, x + 2.31 * s, 2, 1, f);
  lines(g, [V(x + 2.0 * s, y, z + 2.81 * s), V(x + 2.0 * s, y + 1.2 * s, z + 2.81 * s), V(x + 2.0 * s, y + 1.2 * s, z + 2.81 * s), V(x + 3.2 * s, y + 1.2 * s, z + 2.81 * s), V(x + 3.2 * s, y + 1.2 * s, z + 2.81 * s), V(x + 3.2 * s, y, z + 2.81 * s)], f);
  if (extra.solar) { // panel grid on the front roof slope
    const p = [], r0 = y + 2.2 * s, rise = 1.5 * s, d = 1.9 * s;
    for (let i = 0; i <= 4; i++) { const xx = x - 2.0 * s + i * 0.9 * s; p.push(V(xx, r0 + 0.25 * s, z + d * 0.75), V(xx, r0 + rise * 0.85, z + d * 0.12)); }
    for (let j = 0; j <= 2; j++) { const t = j / 2, zz = z + d * (0.75 - 0.63 * t), yy = r0 + 0.25 * s + (rise * 0.85 - 0.25 * s) * t; p.push(V(x - 2.0 * s, yy + 0.02, zz), V(x + 1.6 * s, yy + 0.02, zz)); }
    lines(g, p, e);
  }
  if (extra.ev) { // car + charger post on the driveway
    boxAt(g, 1.3 * s, 0.55 * s, 2.4 * s, x + 4.6 * s, y + 0.15 * s, z + 2.4 * s, { edges: e });
    boxAt(g, 1.0 * s, 0.45 * s, 1.3 * s, x + 4.6 * s, y + 0.7 * s, z + 2.2 * s, { edges: e });
    boxAt(g, 0.25 * s, 1.3 * s, 0.25 * s, x + 4.6 * s, y, z + 0.4 * s, { edges: e });
  }
  return [e];
}
function strata(x, y, z) {
  const e = liveEdges(), f = new THREE.LineBasicMaterial({ color: INK.clone(), transparent: true, opacity: 0.35 });
  const g = new THREE.Group(); scene.add(g);
  boxAt(g, 4.6, 10, 4.6, x, y, z, { edges: e });
  boxAt(g, 3.0, 4, 3.0, x - 0.8, y + 10, z - 0.8, { edges: e });
  boxAt(g, 1.4, 0.9, 1.2, x + 1.2, y + 10, z + 1.2, { edges: e });                         // rooftop plant
  windowsZ(g, x - 2.3, x + 2.3, y + 0.6, y + 10, z + 2.31, 4, 7, f);
  windowsX(g, z - 2.3, z + 2.3, y + 0.6, y + 10, x + 2.31, 4, 7, f);
  windowsZ(g, x - 2.3, x + 0.7, y + 10.3, y + 14, z + 0.71, 2, 3, f);
  return [e];
}
function shop(x, y, z) {
  const e = liveEdges(), f = new THREE.LineBasicMaterial({ color: INK.clone(), transparent: true, opacity: 0.4 });
  const g = new THREE.Group(); scene.add(g);
  boxAt(g, 6, 2.8, 4, x, y, z, { edges: e });
  boxAt(g, 6.4, 0.18, 1.2, x, y + 2.0, z + 2.6, { edges: e });                              // awning
  boxAt(g, 3.2, 0.7, 0.12, x - 0.6, y + 2.85, z + 2.0, { edges: e });                       // sign board
  windowsZ(g, x - 3, x + 3, y + 0.15, y + 1.8, z + 2.01, 3, 1, f);
  boxAt(g, 1.6, 0.6, 1.2, x + 2, y + 2.8, z - 1, { edges: e });                             // AC units
  return [e];
}
function depot(x, y, z) {
  const e = liveEdges(), f = new THREE.LineBasicMaterial({ color: INK.clone(), transparent: true, opacity: 0.4 });
  const g = new THREE.Group(); scene.add(g);
  boxAt(g, 4.2, 2.4, 3.4, x, y, z, { edges: e });
  const s = []; for (let i = 0; i <= 6; i++) { const yy = y + 0.2 + i * 0.28; s.push(V(x - 1.7, yy, z + 1.71), V(x + 0.3, yy, z + 1.71)); } lines(g, s, f);  // roller door
  boxAt(g, 1.8, 0.5, 0.1, x + 1.0, y + 2.4, z + 1.2, { edges: e });                         // sign
  // van
  boxAt(g, 1.2, 0.9, 2.4, x + 3.2, y, z + 2.2, { edges: e }); boxAt(g, 1.1, 0.5, 0.9, x + 3.2, y + 0.9, z + 1.6, { edges: e });
  return [e];
}

/* ---------- layout: spread along the screen diagonal so it fills the page width ---------- */
const P = {
  depot:    { c: [1.4, -1.4],    size: 11, top: 6 },
  homes:    { c: [-1.4, 18.4],   size: 11, top: 3 },
  solar:    { c: [-18.4, 26.9],  size: 11, top: 0 },
  business: { c: [18.4, -7.1],   size: 11, top: 4 },
  strata:   { c: [16.3, -30.4],  size: 11, top: 16 },
};
for (const k in P) plinth(P[k].c[0], P[k].c[1], P[k].size, P[k].top, k !== 'strata');

const S = 1.35;
const live = {
  depot: depot(0.6, P.depot.top, -2.4),
  homes: house(-2.4, P.homes.top, 17.6, S),
  strata: strata(16.1, P.strata.top, -30.9),
  business: shop(17.8, P.business.top, -8),
  solar: house(-19.4, P.solar.top, 26.1, 1.2, { solar: true, ev: true }),
};

/* ---------- cable trays (white ribbons) between plinths ---------- */
const routes = {
  homes:    [V(0, 6, 4.1), V(0, 6, 7), V(0, 3, 12.9), V(0, 3, 15)],
  solar:    [V(-4.1, 6, -1), V(-9.5, 6, -1), V(-9.5, 0, 11), V(-9.5, 0, 27), V(-15, 0, 27)],
  business: [V(6.9, 6, -4.6), V(9.2, 6, -4.6), V(12.9, 4, -4.6), V(14.6, 4, -4.6)],
};
const trayTop = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
function tray(points, width = 1.3) {
  const L = [], R = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dir = V(b.x - a.x, 0, b.z - a.z).normalize(); const n = V(-dir.z, 0, dir.x).multiplyScalar(width / 2);
    L.push(points[i].clone().add(n).setY(points[i].y + 0.02)); R.push(points[i].clone().sub(n).setY(points[i].y + 0.02));
  }
  const pos = [];
  for (let i = 0; i < points.length - 1; i++) pos.push(L[i], R[i], R[i + 1], L[i], R[i + 1], L[i + 1]);
  scene.add(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(pos), trayTop));
  // side skirts so the ribbon reads as a slab
  const sk = []; for (let i = 0; i < points.length - 1; i++) { const d = V(0, -0.35, 0); sk.push(R[i], R[i + 1], R[i + 1].clone().add(d), R[i], R[i + 1].clone().add(d), R[i].clone().add(d)); }
  scene.add(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(sk), new THREE.MeshBasicMaterial({ color: 0xEDEDF0, side: THREE.DoubleSide })));
  const s = []; for (let i = 0; i < points.length - 1; i++) s.push(L[i], L[i + 1], R[i], R[i + 1], R[i].clone().setY(R[i].y - 0.35), R[i + 1].clone().setY(R[i + 1].y - 0.35)); lines(scene, s, edgeMat);
}
Object.values(routes).forEach((r) => tray(r));
// strata is too high for a tray: an overhead feeder arc, drawn dashed (like a flight path)
const arcCurve = new THREE.QuadraticBezierCurve3(V(4, 8, -4), V(12, 44, -18), V(17.4, 31.4, -29.4));
const arcPts = arcCurve.getPoints(60);
const arcLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), new THREE.LineDashedMaterial({ color: INK, transparent: true, opacity: 0.45, dashSize: 0.5, gapSize: 0.45 }));
arcLine.computeLineDistances(); scene.add(arcLine);
routes.strata = arcPts;

/* ---------- response rings around the depot ---------- */
function ring(r) {
  const pts = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(V(Math.cos(a) * r, 0.02, Math.sin(a) * r)); }
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: INK, transparent: true, opacity: 0.35, dashSize: 0.45, gapSize: 0.5 }));
  l.computeLineDistances(); l.position.set(P.depot.c[0], 6, P.depot.c[1]); scene.add(l);
}
ring(14); ring(27);

/* ---------- current: volt-coloured line over each route + travelling pulses ---------- */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
const glowTex = glowTexture();
const current = {};
for (const [k, pts] of Object.entries(routes)) {
  const raised = pts.map((p) => p.clone().setY(p.y + 0.05));
  const g = new LineGeometry(); g.setPositions(raised.flatMap((p) => [p.x, p.y, p.z]));
  const mat = new LineMaterial({ color: VOLT.getHex(), linewidth: 2.4, transparent: true, opacity: 0, resolution });
  const line = new Line2(g, mat); line.computeLineDistances(); scene.add(line);
  const lens = [0]; for (let i = 1; i < raised.length; i++) lens.push(lens[i - 1] + raised[i].distanceTo(raised[i - 1]));
  const pulses = [];
  for (let i = 0; i < 4; i++) { const m = new THREE.SpriteMaterial({ map: glowTex, color: VOLT, transparent: true, opacity: 0, depthTest: false }); const s = new THREE.Sprite(m); s.scale.setScalar(1.1); scene.add(s); pulses.push({ s, m, off: i / 4 }); }
  current[k] = { mat, pts: raised, lens, total: lens[lens.length - 1], pulses, level: 0 };
}
function pointAt(c, t) { const d = t * c.total; let i = 1; while (i < c.lens.length - 1 && c.lens[i] < d) i++; const a = c.lens[i - 1], b = c.lens[i]; return c.pts[i - 1].clone().lerp(c.pts[i], b > a ? (d - a) / (b - a) : 0); }

/* ---------- capsules + italic tags (HTML, anchored to scene points) ---------- */
const overlay = document.getElementById('overlay');
const ITEMS = [
  { k: 'homes',    name: 'Homes',      stat: '1,200+', at: V(-2.4, 12, 17.6),  leader: 30 },
  { k: 'business', name: 'Business',   stat: '24/7',   at: V(17.8, 14, -8),    leader: 30 },
  { k: 'strata',   name: 'Strata',     stat: '60',     at: V(16.1, 36, -30.9), leader: 30 },
  { k: 'solar',    name: 'Solar + EV', stat: '6.6 kW', at: V(-19.4, 9, 26.1),  leader: 30 },
];
const figure = '<svg viewBox="0 0 26 40" aria-hidden="true"><path class="a" d="M13 1a5 5 0 1 1 0 10a5 5 0 1 1 0-10zM5 13h16a3 3 0 0 1 3 3v11h-4v12h-5V27h-4v12H6V27H2V16a3 3 0 0 1 3-3z"/><path class="b" d="M13 20h-8v7h1v12h5V27h2zm0 0h8v7h-1v12h-5V27h-2z" opacity=".95"/></svg>';
const bolt = '<svg viewBox="0 0 26 40" aria-hidden="true"><path class="a" d="M16 1L3 23h9l-2 16 13-22h-9z"/><path class="b" d="M12 23l-2 16 13-22h-6z"/></svg>';
const caps = ITEMS.map((it) => {
  const b = document.createElement('button'); b.className = 'cap'; b.type = 'button';
  b.setAttribute('aria-label', `Show the circuit to ${it.name}`);
  b.innerHTML = (it.k === 'solar' ? bolt : figure) + `<b>${it.stat}</b>`;
  b.style.setProperty('--leader', it.leader + 'px');
  b.addEventListener('click', () => select(it.k, true));
  overlay.appendChild(b); return { ...it, el: b };
});
const TAGS = [
  { text: 'Within 30 min', at: V(1.4 + 9.9, 6, -1.4 + 9.9) },
  { text: 'Within 60 min', at: V(1.4 + 19, 6, -1.4 + 19) },
  { text: 'CGF depot', at: V(-3.2, 6, 3.6) },
  { text: 'Solar + EV homes', at: V(-23.4, -2.5, 32.4), slant: true },
  { text: 'Homes', at: V(-6.4, 0.5, 23.9), slant: true },
  { text: 'Shops & offices', at: V(13, 1.5, -1.6), slant: true },
  { text: 'Strata buildings', at: V(11, 13, -24.9), slant: true },
];
const tags = TAGS.map((t) => { const s = document.createElement('span'); s.className = 'tag' + (t.slant ? ' slant' : ''); s.textContent = t.text; overlay.appendChild(s); return { ...t, el: s }; });

const chipsEl = document.getElementById('chips');
const chips = ITEMS.map((it) => {
  const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.setAttribute('aria-pressed', 'false');
  b.innerHTML = `<i></i>${it.name}`; b.addEventListener('click', () => select(it.k, true)); chipsEl.appendChild(b); return { k: it.k, el: b };
});

/* ---------- selection ---------- */
let active = 'homes', userPicked = false, lastSwitch = 0;
function select(k, byUser = false) {
  active = k; if (byUser) userPicked = true;
  caps.forEach((c) => c.el.classList.toggle('on', c.k === k));
  chips.forEach((c) => c.el.setAttribute('aria-pressed', String(c.k === k)));
}
select('homes');

/* ---------- camera ---------- */
const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; });
let W = 1, H = 1, mobile = false;
function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight; mobile = W < 900;
  renderer.setSize(W, H, false);
  const viewH = mobile ? 96 : 60, aspect = W / H;
  camera.top = viewH / 2; camera.bottom = -viewH / 2; camera.left = -viewH * aspect / 2; camera.right = viewH * aspect / 2;
  camera.updateProjectionMatrix();
  resolution.set(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());
}
addEventListener('resize', resize); resize();

const tmp = new THREE.Vector3(), white = new THREE.Color();
const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime();
  eased.x += (pointer.x - eased.x) * 0.04; eased.y += (pointer.y - eased.y) * 0.04;

  // true isometric, nudged by the pointer
  const az = Math.PI / 4 + eased.x * 0.12, el = 0.6155 - eased.y * 0.05;
  const look = mobile ? V(4, 24, 4) : V(-6, 10.5, -4); // scene runs the full width, a touch right of centre
  camera.position.set(look.x + Math.sin(az) * Math.cos(el) * 100, look.y + Math.sin(el) * 100, look.z + Math.cos(az) * Math.cos(el) * 100);
  camera.lookAt(look);

  if (!userPicked && !reduced && t - lastSwitch > 4.2) { lastSwitch = t; const order = ['homes', 'business', 'strata', 'solar']; select(order[(order.indexOf(active) + 1) % order.length]); }

  for (const [k, c] of Object.entries(current)) {
    c.level += ((k === active ? 1 : 0) - c.level) * (reduced ? 1 : 0.07);
    c.mat.opacity = c.level;
    for (const p of c.pulses) {
      if (c.level < 0.02 || reduced) { p.m.opacity = 0; continue; }
      const u = (p.off + t * (9 / c.total)) % 1; p.s.position.copy(pointAt(c, u)); p.m.opacity = c.level * Math.sin(u * Math.PI);
    }
  }
  for (const [k, mats] of Object.entries(live)) {
    const lv = k === 'depot' ? Math.max(...Object.values(current).map((c) => c.level)) * 0.6 : (current[k]?.level ?? 0);
    for (const m of mats) m.color.copy(INK).lerp(white.copy(VOLT), lv);
  }

  for (const c of caps) {
    tmp.copy(c.at).project(camera);
    const lift = c.k === active ? -6 : 0;
    c.el.style.transform = `translate(${((tmp.x + 1) / 2) * W - 29}px, ${((1 - tmp.y) / 2) * H - 90 + lift}px)`;
  }
  for (const g of tags) { tmp.copy(g.at).project(camera); g.el.style.transform = `translate(${((tmp.x + 1) / 2) * W}px, ${((1 - tmp.y) / 2) * H}px) rotate(${g.slant ? 30 : 0}deg)`; }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
