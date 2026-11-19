// X-ray of a finished two-storey home: faint structure, the full electrical
// installation drawn on top, and four circuits that light up on demand.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

const BG = 0xECE9E2;
const COLORS = { lighting: 0xE39A2D, power: 0xD2552B, solar: 0x3C8D69, ev: 0x3D6CD6 };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('xray');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(BG);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(BG, 34, 58);
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
const target = new THREE.Vector3();

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const resolution = new THREE.Vector2(1, 1);

/* ---------- structure (thin graphite lines) ---------- */
function lineSet(opacity, color = 0x2B2925) {
  const pts = [];
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, fog: true });
  return {
    pts,
    seg(a, b) { pts.push(a, b); },
    poly(list, closed = false) { for (let i = 0; i < list.length - 1; i++) pts.push(list[i], list[i + 1]); if (closed) pts.push(list[list.length - 1], list[0]); },
    build() { const g = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.LineSegments(g, mat); scene.add(l); return l; },
  };
}
const walls = lineSet(0.5);
const detail = lineSet(0.26);
const furniture = lineSet(0.14);

function box(set, x0, x1, y0, y1, z0, z1) {
  const c = [V(x0,y0,z0),V(x1,y0,z0),V(x1,y0,z1),V(x0,y0,z1),V(x0,y1,z0),V(x1,y1,z0),V(x1,y1,z1),V(x0,y1,z1)];
  [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b]) => set.seg(c[a], c[b]));
}
const rectZ = (set, z, x0, x1, y0, y1) => set.poly([V(x0,y0,z),V(x1,y0,z),V(x1,y1,z),V(x0,y1,z)], true);
const rectX = (set, x, z0, z1, y0, y1) => set.poly([V(x,y0,z0),V(x,y0,z1),V(x,y1,z1),V(x,y1,z0)], true);

// shell: house x -7..3.5 (two storeys), garage x 3.5..7 (single storey)
box(walls, -7, 3.5, 0, 3, -5, 5);
box(walls, -7, 3.5, 3, 6, -5, 5);
box(walls, 3.5, 7, 0, 3.2, -5, 5);
// roof: gable along x, ridge at z = 0
const ridgeY = 8.4, eaveY = 6, ov = 0.4;
const roofY = (z) => ridgeY - (Math.abs(z) / (5 + ov)) * (ridgeY - eaveY);
walls.poly([V(-7.3, eaveY, 5 + ov), V(-7.3, ridgeY, 0), V(-7.3, eaveY, -5 - ov)]);
walls.poly([V(3.8, eaveY, 5 + ov), V(3.8, ridgeY, 0), V(3.8, eaveY, -5 - ov)]);
walls.seg(V(-7.3, ridgeY, 0), V(3.8, ridgeY, 0));
walls.seg(V(-7.3, eaveY, 5 + ov), V(3.8, eaveY, 5 + ov));
walls.seg(V(-7.3, eaveY, -5 - ov), V(3.8, eaveY, -5 - ov));
for (let x = -6.5; x <= 3.4; x += 0.9) { detail.poly([V(x, eaveY, 5 + ov), V(x, ridgeY, 0), V(x, eaveY, -5 - ov)]); } // rafters
// internal walls
rectX(walls, -2.5, -5, 5, 3, 6); rectX(walls, 0.8, -5, 5, 3, 6);
rectZ(detail, -1.6, -2.5, 0.8, 3, 6);
// openings, front (z = 5)
rectZ(detail, 5, -6.2, -3.2, 0.35, 2.6); detail.seg(V(-4.7,0.35,5), V(-4.7,2.6,5));
rectZ(detail, 5, -1.6, -0.6, 0, 2.2);
rectZ(detail, 5, 4.0, 6.5, 0, 2.4); for (let y = 0.6; y < 2.4; y += 0.6) detail.seg(V(4.0,y,5), V(6.5,y,5));
rectZ(detail, 5, -6, -3.8, 3.9, 5.4); rectZ(detail, -2, -0.4, 4.4, 5.4); rectZ(detail, 5, 1.4, 3, 3.9, 5.4);
// openings, back (z = -5)
rectZ(detail, -5, -6.4, -4.4, 1.2, 2.5); rectZ(detail, -5, -5.6, -3.8, 3.9, 5.4); rectZ(detail, -5, 1.4, 3, 3.9, 5.4);
// stairs
for (let i = 0; i < 12; i++) { const z = -4.9 + i * 0.27, y = i * 0.25; detail.poly([V(0.1, y, z), V(0.1, y + 0.25, z), V(0.1, y + 0.25, z + 0.27)]); }
// furniture: kitchen bench + uppers, island, sofa, beds, vanity, car
box(furniture, -4.6, -0.6, 0, 0.9, -5, -4.4); box(furniture, -4.6, -0.6, 1.6, 2.3, -5, -4.65);
box(furniture, -3.2, -0.6, 0, 0.92, -0.9, 0.3);
box(furniture, -6.6, -4.4, 0, 0.75, 1.2, 2.2); box(furniture, -6.6, -6.1, 0, 0.75, 2.2, 3.8);
box(furniture, -6.4, -4.4, 3, 3.55, -1.4, 0.9); box(furniture, 1.3, 3.0, 3, 3.55, -1.2, 1.0);
box(furniture, -2.2, -1.2, 3, 3.85, -4.9, -4.4);
box(furniture, 4.1, 6.4, 0.25, 1.05, -2.4, 2.6); box(furniture, 4.4, 6.1, 1.05, 1.6, -1.2, 1.4);
// ground
detail.seg(V(-30, 0, 5), V(30, 0, 5)); detail.seg(V(-30, 0, -5), V(30, 0, -5));
walls.build(); detail.build(); furniture.build();

/* ---------- electrical installation ---------- */
const circuits = { lighting: [], power: [], solar: [], ev: [] };
const devices = lineSet(0.55, 0x1E1D1A);
const IDLE = new THREE.Color(0x4A4740);

function wire(circuit, points) {
  const flat = points.flatMap((p) => [p.x, p.y, p.z]);
  const g = new LineGeometry(); g.setPositions(flat);
  const mat = new LineMaterial({ color: IDLE.getHex(), linewidth: 1.1, transparent: true, opacity: 0.55, fog: true, resolution });
  const line = new Line2(g, mat); line.computeLineDistances(); scene.add(line);
  // cumulative lengths for the travelling current
  const lens = [0]; for (let i = 1; i < points.length; i++) lens.push(lens[i - 1] + points[i].distanceTo(points[i - 1]));
  circuits[circuit].push({ line, mat, points, lens, total: lens[lens.length - 1] });
}

// devices
const SB = V(6.93, 1.5, -3);
box(devices, 6.82, 6.95, 1.0, 1.95, -3.35, -2.65);
for (let y = 1.15; y < 1.9; y += 0.18) devices.seg(V(6.81, y, -3.28), V(6.81, y, -2.72));
box(devices, 6.82, 6.95, 1.35, 1.95, -1.9, -1.35);           // inverter
box(devices, 6.7, 6.95, 0.05, 1.25, -0.9, -0.1);             // battery
box(devices, 3.52, 3.66, 1.0, 1.45, 2.3, 2.7);               // EV charger

const ceilG = 2.85, ceilU = 5.85;
const fittings = []; // {pos, circuit}
function light(x, y, z, pendant = false) {
  if (pendant) { devices.seg(V(x, y, z), V(x, y - 0.75, z)); devices.poly([V(x - 0.18, y - 0.95, z), V(x, y - 0.75, z), V(x + 0.18, y - 0.95, z)], true); fittings.push({ pos: V(x, y - 1.0, z), c: 'lighting', r: 1.25 }); }
  else { const r = 0.12, pts = []; for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push(V(x + Math.cos(a) * r, y, z + Math.sin(a) * r)); } devices.poly(pts); fittings.push({ pos: V(x, y - 0.1, z), c: 'lighting', r: 0.9 }); }
}
function gpo(x, y, z, axis) {
  const w = 0.16, h = 0.1;
  if (axis === 'z') rectZ(devices, z, x - w, x + w, y - h, y + h); else rectX(devices, x, z - w, z + w, y - h, y + h);
  fittings.push({ pos: V(x, y, z), c: 'power', r: 0.35 });
}

// LIGHTING — ground floor trunk along z = -3.1 in the ceiling space
const gTrunkZ = -3.1;
wire('lighting', [V(6.93, 1.95, -3.1), V(6.93, ceilG, gTrunkZ), V(-6, ceilG, gTrunkZ)]);
[[-2.6, -0.3, true], [-1.8, -0.3, true], [-1.0, -0.3, true], [-6, 0.6], [-6, 3.4], [-4.1, 0.6], [-4.1, 3.4], [-1.1, 3.7], [5.2, 0.3], [5.2, -3.6]].forEach(([x, z, p]) => {
  wire('lighting', [V(x, ceilG, gTrunkZ), V(x, ceilG, z)]); light(x, ceilG, z, !!p);
});
// upper floor via riser in the garage/house wall
const uTrunkZ = -3.4;
wire('lighting', [V(6.93, 1.95, -3.25), V(6.93, 3.05, -3.25), V(3.45, 3.05, uTrunkZ), V(3.45, ceilU, uTrunkZ), V(-5.2, ceilU, uTrunkZ)]);
[[-4.8, 0], [-4.8, 3.2], [-0.85, -3.3], [-0.85, 1.8], [2.15, 0], [2.15, 3.2]].forEach(([x, z]) => {
  wire('lighting', [V(x, ceilU, uTrunkZ), V(x, ceilU, z)]); light(x, ceilU, z);
});

// POWER — floor-level ring along the walls, risers to each outlet
const fl = 0.18;
wire('power', [V(6.93, 1.0, -2.9), V(6.93, fl, -2.9), V(6.93, fl, -4.88), V(-6.92, fl, -4.88), V(-6.92, fl, 4.88), V(3.45, fl, 4.88)]);
[[5.4, -4.88, 0.3, 'z'], [-1.2, -4.88, 1.1, 'z'], [-3.0, -4.88, 1.1, 'z'], [-6.92, -2.0, 0.3, 'x'], [-6.92, 2.4, 0.3, 'x'], [-5.2, 4.88, 0.3, 'z'], [1.6, 4.88, 0.3, 'z'], [3.45, 0, 0.3, 'x']].forEach(([x, z, y, axis]) => {
  if (axis === 'x' && x > 0) wire('power', [V(3.45, fl, 4.88), V(3.45, fl, z), V(3.45, y - 0.1, z)]);
  else wire('power', [V(x, fl, z), V(x, y - 0.1, z)]);
  gpo(x, y, z, axis);
});
const flU = 3.18;
wire('power', [V(3.45, fl, -4.88), V(3.45, flU, -4.88), V(-6.92, flU, -4.88), V(-6.92, flU, 4.88), V(3.45, flU, 4.88)]);
[[2.6, -4.88, 'z'], [-3.4, -4.88, 'z'], [-6.92, 1.6, 'x'], [-5.4, 4.88, 'z'], [1.6, 4.88, 'z'], [-1.6, -4.88, 'z']].forEach(([x, z, axis]) => {
  wire('power', [V(x, flU, z), V(x, flU + 0.2, z)]); gpo(x, flU + 0.3, z, axis);
});

// SOLAR — panel array on the front roof slope, strings down to inverter + battery
const panelRows = [1.0, 2.15, 3.3], panelCols = [-5.6, -4.1, -2.6, -1.1, 0.4];
const solarPanels = [];
for (const z0 of panelRows) for (const x0 of panelCols) {
  const z1 = z0 + 1.05, x1 = x0 + 1.4, lift = 0.06;
  const q = [V(x0, roofY(z0) + lift, z0), V(x1, roofY(z0) + lift, z0), V(x1, roofY(z1) + lift, z1), V(x0, roofY(z1) + lift, z1)];
  devices.poly(q, true); devices.seg(q[0].clone().lerp(q[1], .5), q[3].clone().lerp(q[2], .5));
  solarPanels.push(q);
}
for (const z0 of panelRows) { const z = z0 + 0.5; wire('solar', [V(-5.6, roofY(z) + 0.08, z), V(1.8, roofY(z) + 0.08, z), V(2.4, roofY(z) + 0.08, z)]); }
wire('solar', [V(2.4, roofY(1.5) + .08, 1.5), V(2.4, roofY(3.8) + .08, 3.8), V(3.45, roofY(3.8) + .08, 3.8), V(3.45, 3.1, 3.8), V(6.93, 3.1, 3.8), V(6.93, 3.1, -1.62), V(6.93, 1.95, -1.62)]);
wire('solar', [V(6.93, 1.35, -1.62), V(6.93, 1.3, -0.5), V(6.93, 1.25, -0.5)]);
wire('solar', [V(6.93, 1.65, -1.9), V(6.93, 1.65, -2.65)]);
fittings.push({ pos: V(6.9, 0.65, -0.5), c: 'solar', r: 0.9 }, { pos: V(6.9, 1.65, -1.62), c: 'solar', r: 0.6 });

// EV — dedicated circuit from the board to the wall charger, lead to the car
wire('ev', [V(6.93, 1.95, -2.75), V(6.93, 3.0, -2.75), V(3.62, 3.0, -2.75), V(3.62, 3.0, 2.5), V(3.62, 1.45, 2.5)]);
wire('ev', [V(3.66, 1.05, 2.5), V(3.9, 0.55, 2.4), V(4.15, 0.75, 2.2)]);
fittings.push({ pos: V(3.62, 1.22, 2.5), c: 'ev', r: 0.55 }, { pos: V(5.25, 0.8, 0.1), c: 'ev', r: 1.6 });

devices.build();

/* ---------- glow sprites + travelling current ---------- */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const glowTex = glowTexture();
const glows = fittings.map((f) => {
  const m = new THREE.SpriteMaterial({ map: glowTex, color: COLORS[f.c], transparent: true, opacity: 0, depthWrite: false, fog: true });
  const s = new THREE.Sprite(m); s.position.copy(f.pos); s.scale.setScalar(f.r); scene.add(s);
  return { s, m, c: f.c };
});
const panelMat = new THREE.MeshBasicMaterial({ color: COLORS.solar, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: true });
for (const q of solarPanels) {
  const g = new THREE.BufferGeometry().setFromPoints([q[0], q[1], q[2], q[0], q[2], q[3]]);
  scene.add(new THREE.Mesh(g, panelMat));
}

const pulses = [];
for (const [c, list] of Object.entries(circuits)) for (const w of list) {
  const n = Math.max(1, Math.round(w.total / 3.2));
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({ map: glowTex, color: COLORS[c], transparent: true, opacity: 0, depthWrite: false, fog: true });
    const s = new THREE.Sprite(m); s.scale.setScalar(0.32); scene.add(s);
    pulses.push({ s, m, w, c, off: i / n });
  }
}
function pointAt(w, t) {
  const d = t * w.total; let i = 1; while (i < w.lens.length - 1 && w.lens[i] < d) i++;
  const a = w.lens[i - 1], b = w.lens[i]; return w.points[i - 1].clone().lerp(w.points[i], b > a ? (d - a) / (b - a) : 0);
}

/* ---------- labels anchored to 3D points ---------- */
const labelsEl = document.getElementById('labels');
const labelDefs = [
  { pos: V(6.9, 1.95, -3), text: 'Main switchboard', c: null },
  { pos: V(-1.8, 1.75, -0.3), text: 'Pendants · 3 × LED, dimmable', c: 'lighting' },
  { pos: V(-6.92, 0.45, 2.4), text: 'Double GPO · 10 A', c: 'power' },
  { pos: V(-2.6, roofY(2.6) + 0.2, 2.6), text: '15 panels · 6.6 kW', c: 'solar' },
  { pos: V(3.62, 1.5, 2.5), text: '7 kW wall charger', c: 'ev' },
];
const labels = labelDefs.map((d) => {
  const el = document.createElement('span'); el.className = 'tag';
  el.innerHTML = (d.c ? `<i style="--c:var(--${d.c})"></i>` : '') + d.text;
  labelsEl.appendChild(el); return { ...d, el };
});

/* ---------- state ---------- */
const level = { lighting: 0, power: 0, solar: 0, ev: 0 };
const on = { lighting: true, power: false, solar: false, ev: false };
document.querySelectorAll('.sw').forEach((b) => b.addEventListener('click', () => {
  const c = b.dataset.c; on[c] = !on[c]; b.setAttribute('aria-checked', String(on[c]));
}));

/* ---------- camera + parallax ---------- */
const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; });
let mobile = false;
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  mobile = w < 900;
  // desktop: render the house into the right of the frame, leaving the left for the copy
  if (mobile) camera.clearViewOffset(); else camera.setViewOffset(w, h, -w * 0.13, h * 0.03, w, h);
  camera.updateProjectionMatrix();
  resolution.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
}
addEventListener('resize', resize); resize();

const tmp = new THREE.Vector3(), white = new THREE.Color();
const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime(), dt = Math.min(clock.getDelta(), 0.05) || 0.016;
  eased.x += (pointer.x - eased.x) * 0.05; eased.y += (pointer.y - eased.y) * 0.05;

  const sway = reduced ? 0 : Math.sin(t * 0.12) * 0.05;
  const az = 0.55 + sway + eased.x * 0.22, el = 0.24 - eased.y * 0.08, dist = mobile ? 44 : 35;
  target.set(-1.2, 3.6, 0);
  camera.position.set(target.x + Math.sin(az) * dist * Math.cos(el), target.y + Math.sin(el) * dist, Math.cos(az) * dist * Math.cos(el));
  camera.lookAt(target);

  for (const c of Object.keys(level)) {
    level[c] += ((on[c] ? 1 : 0) - level[c]) * (reduced ? 1 : 0.06);
    const col = white.setHex(COLORS[c]);
    for (const w of circuits[c]) {
      w.mat.color.copy(IDLE).lerp(col, level[c]);
      w.mat.linewidth = 1.1 + level[c] * 1.5;
      w.mat.opacity = 0.55 + level[c] * 0.45;
    }
  }
  for (const g of glows) g.m.opacity = level[g.c] * (g.c === 'lighting' ? 0.85 : 0.7) * (0.9 + 0.1 * Math.sin(t * 3 + g.s.position.x));
  panelMat.opacity = level.solar * 0.22;
  for (const p of pulses) {
    const k = level[p.c];
    if (k < 0.02 || reduced) { p.m.opacity = 0; continue; }
    const u = (p.off + t * (2.4 / p.w.total)) % 1;
    p.s.position.copy(pointAt(p.w, u)); p.m.opacity = k * Math.sin(u * Math.PI);
  }

  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const l of labels) {
    tmp.copy(l.pos).project(camera);
    l.el.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px) translate(-50%, calc(-100% - 14px))`;
    l.el.classList.toggle('on', !mobile && (l.c ? level[l.c] > 0.5 : true));
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
