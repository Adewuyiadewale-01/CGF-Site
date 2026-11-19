// Scenes built from the kit. Each is used live on the site and rendered to stills for Figma (render.html).
import { THREE, V, makeKit } from './kit.js';

/* ---------- the street: homes, apartments and a shop on one street battery, wired the Sydney way ----------
   Timber poles carry the mains along the front; service drops run to every roof; the battery hangs off the
   middle pole through its transformer. Power is light running along the cables.
   set(phase, time, dt, focus): phase 0 noon export .. 1 battery full .. 2.3 evening .. 3 paid;
   focus {h1, h2, bat, apt, shop, wires}: 0..1, everything else fades back. */
export function street(stage) {
  const { scene } = stage, k = makeKit(scene), C = (c) => new THREE.Color(c);
  const P = [
    { k: 'h1', x: -18, z: 0, w: 9, d: 9, top: 0 },
    { k: 'h2', x: -8, z: 0, w: 9, d: 9, top: 1.2 },
    { k: 'bat', x: 2.5, z: 0, w: 10, d: 9, top: 2.4 },
    { k: 'apt', x: 13.5, z: -1, w: 9, d: 9, top: 0.6 },
    { k: 'shop', x: 23, z: 0, w: 9, d: 9, top: 0 },
  ];
  const groups = {};
  const grab = (key, fn) => { const before = scene.children.length; const r = fn(); groups[key] = groups[key] || []; groups[key].push(...scene.children.slice(before)); return r; };
  for (const p of P) grab(p.k, () => k.plinth(scene, p.x, p.z, p.w, p.d, p.top, 16));
  const b = {
    h1: grab('h1', () => k.house(scene, -18.6, 0, -0.6, 1.15, { solar: true, ev: true })),
    h2: grab('h2', () => k.house(scene, -8.8, 1.2, -0.6, 1.15, { solar: true })),
    bat: grab('bat', () => k.battery(scene, 1.7, 2.4, -0.8)),
    apt: grab('apt', () => k.strata(scene, 13.5, 0.6, -1.4)),
    shop: grab('shop', () => k.shop(scene, 23, 0, -0.6)),
  };
  // roof masts for the service drops, meters and inverters on the houses
  const leds = [];
  const ledMat = () => { const m = new THREE.MeshBasicMaterial({ color: C('#C9D3CF') }); leds.push(m); return m; };
  const mast = (key, x, y, z, h = 0.9) => grab(key, () => k.box(scene, 0.09, h, 0.09, x, y, z, { edges: k.E.main }));
  mast('h1', -16.3, 4.2, -0.6); mast('h2', -6.5, 5.4, -0.6); mast('shop', 25.2, 2.8, -0.2, 0.8);
  for (const [key, x, y, z] of [['h1', -16.9, 0.75, 1.36], ['h2', -7.1, 1.95, 1.36]]) {
    grab(key, () => {
      k.box(scene, 0.5, 0.62, 0.16, x, y, z + 0.08, { edges: k.E.main });          // smart meter
      k.box(scene, 0.55, 0.7, 0.2, x + 0.7, y - 0.05, z + 0.1, { edges: k.E.main }); // inverter
      const led = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), ledMat()); led.position.set(x, y + 0.45, z + 0.17); scene.add(led);
      const led2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.06), ledMat()); led2.position.set(x + 0.7, y + 0.5, z + 0.21); scene.add(led2);
    });
  }
  // battery: a ten-segment charge strip on the cabinet face
  const charge = []; grab('bat', () => { for (let i = 0; i < 10; i++) { const m = new THREE.MeshBasicMaterial({ color: C('#D7DEDB') }); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.1), m); s.position.set(-0.25 + i * 0.205, 4.95, 0.515); scene.add(s); charge.push(m); } });
  // trees
  for (const [x, y, z, s] of [[-21.6, 0, 2.7, 1], [-11.6, 1.2, 3, 0.85], [-1.2, 2.4, 2.9, 0.8], [9.8, 0.6, 2.2, 1], [20.2, 0, 2.9, 0.9]]) k.tree(scene, x, y, z, s);
  // poles along the front, street lights on three of them
  const poles = [[-14.6, 0], [-4.6, 1.2], [6.6, 2.4], [17.2, 0.6], [26.4, 0]].map(([x, y], i) => k.pole(scene, x, y, 3.4, 7.5, { lamp: i % 2 === 0 }));
  // wires: the front conductor carries the light; the back one is plain cable
  const W = { mainsL: [], mainsR: [], drops: {} };
  const far = (x, y) => V(x, y, 3.4 + 0.75);
  W.mainsL.push(k.wire(far(-30, 7.1), poles[0].b, { sag: 0.5 }));
  for (let i = 0; i < 4; i++) { const w = k.wire(poles[i].b, poles[i + 1].b, { sag: 0.55, offset: i * 1.3 }); (i < 2 ? W.mainsL : W.mainsR).push(w); }
  W.mainsR.push(k.wire(poles[4].b, far(34, 7.0), { sag: 0.5 }));
  const quiet = [k.wire(V(-30, 7.1, 2.65), poles[0].a, { sag: 0.5 })];
  for (let i = 0; i < 4; i++) quiet.push(k.wire(poles[i].a, poles[i + 1].a, { sag: 0.55 }));
  quiet.push(k.wire(poles[4].a, V(34, 7.0, 2.65), { sag: 0.5 }));
  W.drops.h1 = k.wire(poles[0].a, V(-16.3, 5.05, -0.6), { sag: 0.35, r: 0.035, spacing: 1.8 });
  W.drops.h2 = k.wire(poles[1].a, V(-6.5, 6.25, -0.6), { sag: 0.35, r: 0.035, spacing: 1.8 });
  W.drops.bat = k.wire(poles[2].a, V(5.1, 4.1, 0.8), { sag: 0.25, r: 0.04, spacing: 1.6 });
  W.drops.apt = k.wire(poles[3].a, V(15.6, 6.6, 0.95), { sag: 0.3, r: 0.035, spacing: 1.8 });
  W.drops.shop = k.wire(poles[4].a, V(25.2, 3.55, -0.2), { sag: 0.35, r: 0.035, spacing: 1.8 });
  // windows that light up in the evening (houses + a scatter on the apartments)
  const glowMat = new THREE.MeshBasicMaterial({ color: C('#F2FFF7'), transparent: true, opacity: 0 });
  const halos = [];
  const winZ = (key, x0, x1, y0, y1, z, cols, rows, pick = () => true) => grab(key, () => {
    const cw = (x1 - x0) / cols, rh = (y1 - y0) / rows;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      if (!pick(c, r)) continue;
      const w = cw * 0.56, h = rh * 0.55, cx = x0 + c * cw + cw * 0.5, cy = y0 + r * rh + rh * 0.525;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glowMat); m.position.set(cx, cy, z + 0.012); scene.add(m);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: k.glowTex, color: k.VOLT, transparent: true, opacity: 0, depthWrite: false })); s.scale.set(w * 3, h * 3, 1); s.position.set(cx, cy, z + 0.2); scene.add(s); halos.push(s.material);
    }
  });
  const s1 = 1.15;
  winZ('h1', -18.6 - 2.1 * s1, -18.6 + 0.6 * s1, 0.5 * s1, 1.9 * s1, -0.6 + 1.71 * s1, 3, 1);
  winZ('h2', -8.8 - 2.1 * s1, -8.8 + 0.6 * s1, 1.2 + 0.5 * s1, 1.2 + 1.9 * s1, -0.6 + 1.71 * s1, 3, 1);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  winZ('apt', 11.2, 15.8, 1.2, 10.6, 0.91, 4, 7, () => rnd() < 0.5);
  winZ('shop', 20, 26, 0.15, 1.8, 1.41, 3, 1);
  // focus: every building's line materials become its own, so they can fade back independently
  const lineMats = {};
  for (const [key, objs] of Object.entries(groups)) {
    lineMats[key] = [];
    for (const o of objs) o.traverse((n) => { if (n.isLineSegments || n.isLine) { n.material = n.material.clone(); n.material.userData.base = n.material.opacity; lineMats[key].push(n.material); } });
  }
  // dusk: the street's faces darken so lit windows and lamps can glow
  const day = { top: k.M.top.color.clone(), left: k.M.left.color.clone(), right: k.M.right.color.clone(), roof: k.M.roof.color.clone() };
  const dusk = { top: C('#C3CEC9'), left: C('#B8C4BF'), right: C('#A7B4AE'), roof: C('#BBC6C1') };
  const INK = k.INK, VOLT = k.VOLT, idleLed = C('#C9D3CF');
  let chg = 0;
  const cl = (x) => THREE.MathUtils.clamp(x, 0, 1);
  function set(phase, time, dt = 0.016, focus = {}) {
    const noon = cl(1 - Math.abs(phase - 0.6) / 1.4), eve = cl((phase - 1.7) / 0.6), paid = cl((phase - 2.7) / 0.4);
    const exporting = phase < 1.75;
    // light on the wires
    const outL = exporting ? 1 : -1, outR = exporting ? -1 : 1;
    const lvMains = exporting ? cl(0.25 + noon) : cl(eve);
    W.mainsL.forEach((w) => w.set(lvMains, outL, time));
    W.mainsR.forEach((w) => w.set(exporting ? 0.08 : lvMains, outR, time));
    W.drops.h1.set(exporting ? cl(0.2 + noon) : eve, exporting ? -1 : 1, time);
    W.drops.h2.set(exporting ? cl(0.2 + noon) : eve, exporting ? -1 : 1, time);
    W.drops.bat.set(exporting ? cl(0.25 + noon) : eve, exporting ? 1 : -1, time);
    for (const key of ['apt', 'shop']) W.drops[key].set(exporting ? 0 : eve, 1, time);
    quiet.forEach((w) => w.set(0, 1, time));
    // battery charge strip
    const target = exporting ? cl(phase / 1.2) : 1 - cl((phase - 1.75) / 1.3) * 0.7;
    chg += (target - chg) * Math.min(1, dt * 4);
    charge.forEach((m, i) => m.color.copy((i + 0.5) / 10 < chg ? VOLT : C('#D7DEDB')));
    // panels, meters, lamps, windows
    for (const key of ['h1', 'h2']) { const p = b[key].panel; p.material.color.copy(INK).lerp(VOLT, noon); p.userData.fill.material.opacity = noon * 0.9; }
    leds.forEach((m, i) => m.color.copy(idleLed).lerp(VOLT, i % 2 ? noon : Math.max(noon, eve)));
    poles.forEach((p) => p.light && p.light(eve));
    glowMat.opacity = eve; halos.forEach((m) => { m.opacity = eve * 0.35; });
    for (const n of ['top', 'left', 'right', 'roof']) k.M[n].color.copy(day[n]).lerp(dusk[n], eve * 0.85);
    // focus
    for (const [key, mats] of Object.entries(lineMats)) {
      const f = focus[key] ?? 1;
      for (const m of mats) m.opacity = m.userData.base * (0.18 + 0.82 * f);
    }
    return { eve, paid };
  }
  const mid = poles[1].b.clone().lerp(poles[2].b, 0.5).setY(poles[1].b.y - 0.2);
  return { set, anchors: { h1: b.h1.top, h2: b.h2.top, bat: b.bat.top, apt: b.apt.top, shop: b.shop.top, mains: mid, meter: V(-16.9, 1.4, 1.5) } };
}
/* ---------- a single building on its plinth ---------- */
export function building(stage, kind) {
  const k = makeKit(stage.scene);
  k.plinth(stage.scene, 0, 0, 11, 11, 0, 2.2);
  let b;
  if (kind === 'house') b = k.house(stage.scene, -1, 0, -0.4, 1.35, { solar: true, ev: true });
  if (kind === 'strata') b = k.strata(stage.scene, 0, 0, -0.4);
  if (kind === 'shop') b = k.shop(stage.scene, 0, 0, -0.6);
  if (b.panel) { b.panel.material.color.copy(k.VOLT); b.panel.userData.fill.material.opacity = 0.9; }
  return { b, k };
}

/* ---------- exploded objects ---------- */
export function exploded(stage, kind) {
  const k = makeKit(stage.scene);
  const o = kind === 'panel' ? k.panelStack(stage.scene) : k.batteryStack(stage.scene);
  return o;
}

/* ---------- the diorama for "Check your street": one battery ringed by homes, wired out to each ----------
   set(level, time): level 0 idle, 1 lit (after an address check) */
export function diorama(stage) {
  // drawn in the card's own colours (deep green faces, soft green lines) so it reads as the card's background
  const DARK = { bg: '#001509', top: '#0F3320', left: '#0B2818', right: '#082013', roof: '#0F3320', edge: '#3E9D68', volt: '#20AC5D', voltMid: '#A9DEBF', voltSoft: '#16492C', ink: '#001509' };
  const { scene } = stage, k = makeKit(scene, DARK);
  k.plinth(scene, 0, 0, 11, 9, 0, 1.2, { rules: false });
  const bat = k.battery(scene, -0.6, 0, -0.6);
  const homes = [], wires = [];
  // two rings of lots around the battery, wired back to it with lit cables
  let seed = 4; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lots = [];
  for (const [r, n, off] of [[17, 7, 0.2], [31, 11, 0.5]]) for (let i = 0; i < n; i++) { const a = off + i / n * Math.PI * 2; lots.push([Math.cos(a) * r + (rnd() - 0.5) * 3, Math.sin(a) * r + (rnd() - 0.5) * 3, r]); }
  lots.forEach(([x, z, r], i) => {
    k.plinth(scene, x, z, 7, 7, -0.6, 0.6, { rules: false, hatch: false });
    const kind = rnd();
    const h = kind < 0.12 ? k.shop(scene, x, -0.6, z - 0.3) : kind < 0.22 ? k.strata(scene, x, -0.6, z - 0.4) : k.house(scene, x - 0.6, -0.6, z - 0.4, 0.9, { solar: rnd() < 0.55 });
    homes.push(h);
    if (r < 20 || rnd() < 0.55) wires.push(k.wire(V(0, 0.4, 0), V(x, -0.2, z), { sag: -(1.2 + r * 0.05), r: 0.06, idle: '#1C4A30', spacing: 6, speed: 6, offset: i * 1.7 }));
  });
  // a pulse ring that runs out from the battery when a street is checked
  const ringGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, i) => { const a = i / 128 * Math.PI * 2; return V(Math.cos(a), 0, Math.sin(a)); }));
  const pulse = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: k.VOLT, transparent: true, opacity: 0 })); pulse.position.y = -0.5; scene.add(pulse);
  const ripples = [9, 24, 38].map((r) => { const l = new THREE.Line(ringGeo, new THREE.LineDashedMaterial({ color: '#3E9D68', transparent: true, opacity: 0.25, dashSize: 0.02, gapSize: 0.02 })); l.scale.setScalar(r); l.position.y = -0.55; l.computeLineDistances(); scene.add(l); return l; });
  const EDGE = new THREE.Color(DARK.edge), VOLT = k.VOLT;
  let pulseT = 99;
  function set(level, time, dt = 0.016, fire = false) {
    if (fire) pulseT = 0;
    pulseT += dt;
    wires.forEach((w, i) => w.set(0.3 + 0.7 * level, i % 4 === 3 ? -1 : 1, time));
    for (const e of bat.edges) e.color.copy(EDGE).lerp(VOLT, 0.4 + 0.5 * level);
    homes.forEach((h, i) => { const lv = level * (0.5 + 0.5 * Math.sin(time * 1.6 + i)); for (const e of h.edges) e.color.copy(EDGE).lerp(VOLT, lv * 0.6); });
    const r = 1 + pulseT * 18; pulse.scale.set(r, 1, r); pulse.material.opacity = Math.max(0, 0.9 - pulseT * 0.4);
    ripples.forEach((l, i) => { l.material.opacity = 0.16 + 0.1 * level + 0.06 * Math.sin(time * 1.2 - i); });
  }
  return { set };
}
