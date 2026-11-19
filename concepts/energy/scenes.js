// Scenes built from the kit. Each is used live on the site and rendered to stills for Figma (render.html).
import { THREE, V, makeKit } from './kit.js';

/* ---------- the street: homes, apartments and a shop wired to one street battery ----------
   phase 0..3: 0 noon (roofs export to the battery), 1 battery full, 2 evening (battery feeds the street), 3 paid */
export function street(stage) {
  const { scene, resolution } = stage, k = makeKit(scene);
  const P = [
    { k: 'h1', x: -18, z: 0, w: 9, d: 9, top: 0 },
    { k: 'h2', x: -8, z: 0, w: 9, d: 9, top: 1.2 },
    { k: 'bat', x: 2.5, z: 0, w: 10, d: 9, top: 2.4 },
    { k: 'apt', x: 13.5, z: -1, w: 9, d: 9, top: 0.6 },
    { k: 'shop', x: 23, z: 0, w: 9, d: 9, top: 0 },
  ];
  for (const p of P) k.plinth(scene, p.x, p.z, p.w, p.d, p.top, 16);
  const b = {
    h1: k.house(scene, P[0].x - 0.6, P[0].top, -0.6, 1.15, { solar: true, ev: true }),
    h2: k.house(scene, P[1].x - 0.8, P[1].top, -0.6, 1.15, { solar: true }),
    bat: k.battery(scene, P[2].x - 0.8, P[2].top, -0.8),
    apt: k.strata(scene, P[3].x, P[3].top, P[3].z - 0.4),
    shop: k.shop(scene, P[4].x, P[4].top, -0.6),
  };
  // one tray along the front edge of the street, stepping between plinth heights
  const zt = 3.9, y = (p) => p.top;
  const trayPts = [V(-21, y(P[0]), zt), V(-13.6, y(P[0]), zt), V(-12.4, y(P[1]), zt), V(-3.6, y(P[1]), zt), V(-2.4, y(P[2]), zt), V(7.4, y(P[2]), zt), V(8.6, y(P[3]), zt), V(17.4, y(P[3]), zt), V(18.6, y(P[4]), zt), V(26, y(P[4]), zt)];
  k.tray(trayPts);
  const lift = (pts) => pts.map((p) => p.clone().setY(p.y + 0.07));
  const C = {
    h1: k.current(lift([V(-18.6, 0, 1.4), V(-18.6, 0, zt), V(-13.6, 0, zt), V(-12.4, 1.2, zt), V(-3.6, 1.2, zt), V(-2.4, 2.4, zt), V(2, 2.4, zt), V(2, 2.4, 2.4)]), resolution),
    h2: k.current(lift([V(-8.8, 1.2, 1.4), V(-8.8, 1.2, zt), V(-3.6, 1.2, zt), V(-2.4, 2.4, zt), V(2, 2.4, zt), V(2, 2.4, 2.4)]), resolution),
    apt: k.current(lift([V(13.5, 0.6, 1.9), V(13.5, 0.6, zt), V(8.6, 0.6, zt), V(7.4, 2.4, zt), V(3, 2.4, zt), V(3, 2.4, 2.4)]), resolution),
    shop: k.current(lift([V(23, 0, 2.2), V(23, 0, zt), V(18.6, 0, zt), V(17.4, 0.6, zt), V(8.6, 0.6, zt), V(7.4, 2.4, zt), V(3, 2.4, zt), V(3, 2.4, 2.4)]), resolution),
  };
  // the sun (noon) and a crescent moon (evening), as flat discs high over the street
  const sun = new THREE.Group(); scene.add(sun);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: k.glowTex, color: k.VOLT, transparent: true, opacity: 0.25, depthWrite: false })); halo.scale.setScalar(16);
  const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => V(Math.cos(i / 64 * Math.PI * 2) * 2.2, Math.sin(i / 64 * Math.PI * 2) * 2.2, 0))), new THREE.LineBasicMaterial({ color: k.INK, transparent: true, opacity: 0.8 }));
  sun.add(halo, disc, rim);
  // battery charge gauge: a column of 8 cells beside the cabinets
  const gauge = []; for (let i = 0; i < 8; i++) { const m = new THREE.MeshBasicMaterial({ color: 0xffffff }); const c = k.box(scene, 0.7, 0.32, 0.7, 7.0, P[2].top + 0.3 + i * 0.42, 1.8, { mats: [m, m, m, m, m, m], edges: k.E.mid }); gauge.push(m); }
  // window glow for the evening
  const glow = new THREE.MeshBasicMaterial({ color: k.VOLT, transparent: true, opacity: 0 });
  for (const [x, yy, z] of [[-20.3, 1.0, 1.36], [-19, 1.0, 1.36], [-10.5, 2.2, 1.36], [-9.2, 2.2, 1.36]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), glow); m.position.set(x, yy, z + 0.01); scene.add(m); }
  const lit = new THREE.Color(), INK = k.INK, VOLT = k.VOLT;
  let charge = 0;
  function set(phase, time, dt = 0.016) {
    // phase 0-1: export, 1-2: full, 2-3: evening import, 3+: paid
    const noon = THREE.MathUtils.clamp(1 - Math.abs(phase - 0.6) / 1.6, 0, 1), eve = THREE.MathUtils.clamp((phase - 1.6) / 0.8, 0, 1);
    const exporting = phase < 1.7, flow = phase < 0.15 ? phase / 0.15 : phase > 2.9 ? Math.max(0, 1 - (phase - 2.9) / 0.4) : 1;
    for (const [key, c] of Object.entries(C)) {
      const on = exporting ? (key === 'h1' || key === 'h2' ? 1 : 0) : 1;
      c.update(on * flow * (exporting ? 1 : eve), time, exporting ? 1 : -1);
    }
    const target = exporting ? Math.min(1, phase / 1.1) : 1 - (phase - 1.7) / 1.4 * 0.75;
    charge += (target - charge) * Math.min(1, dt * 4);
    gauge.forEach((m, i) => m.color.copy(i / 8 < charge ? VOLT : lit.set(0xffffff)));
    for (const key of ['h1', 'h2']) { const p = b[key].panel; p.material.color.copy(INK).lerp(VOLT, noon); p.userData.fill.material.opacity = noon * 0.9; }
    glow.opacity = eve * 0.55;
    // sun arcs over the street and sets; it reads as a moon (no halo) in the evening
    const a = THREE.MathUtils.lerp(0.25, -0.9, THREE.MathUtils.clamp(phase / 2.4, 0, 1));
    sun.position.set(-4 + Math.sin(a) * 30, 22 + Math.cos(a) * 6, -24);
    sun.quaternion.copy(stage.camera.quaternion);
    halo.material.opacity = 0.28 * (1 - eve); disc.material.color.set(eve > 0.5 ? 0xEEF2F1 : 0xffffff);
    for (const key of Object.keys(b)) {
      const lv = key === 'bat' ? 0.6 * flow : (exporting ? (key[0] === 'h' ? noon : 0) : eve) * flow;
      for (const e of b[key].edges) e.color.copy(INK).lerp(VOLT, lv * 0.45);
    }
  }
  return { set, anchors: { h1: b.h1.top, h2: b.h2.top, bat: b.bat.top, apt: b.apt.top, shop: b.shop.top } };
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
  const { scene, resolution } = stage, k = makeKit(scene);
  k.plinth(scene, 0, 0, 11, 9, 0, 1.4, { rules: false });
  const bat = k.battery(scene, -0.6, 0, -0.6);
  const homes = [], currents = [];
  const spots = [[-17, -9], [-15, 9], [-3, 17], [12, 14], [18, -1], [8, -16], [-6, -18]];
  spots.forEach(([x, z], i) => {
    k.plinth(scene, x, z, 7, 7, -0.6, 0.8, { rules: false, hatch: false });
    const h = i === 2 ? k.shop(scene, x, -0.6, z - 0.3) : k.house(scene, x - 0.6, -0.6, z - 0.4, 0.9, { solar: i % 2 === 0 });
    homes.push(h);
    // a gentle arc from the battery pad out to each lot
    const a = V(0, 0.08, 0), b = V(x, -0.52, z), m = a.clone().lerp(b, 0.5).setY(1.6);
    const pts = new THREE.QuadraticBezierCurve3(a, m, b).getPoints(28);
    currents.push(k.current(pts, resolution, { width: 2 }));
  });
  // white dashed rings, so they read on the dark card
  const rings = [7.5, 12.5, 20].map((r) => {
    const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; pts.push(V(Math.cos(a) * r, -0.5, Math.sin(a) * r)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, dashSize: 0.5, gapSize: 0.5 }));
    l.computeLineDistances(); scene.add(l); return l;
  });
  const pulse = new THREE.Line(rings[0].geometry, new THREE.LineBasicMaterial({ color: k.VOLT, transparent: true, opacity: 0 }));
  pulse.position.y = 0.02; scene.add(pulse);
  const INK = k.INK, VOLT = k.VOLT;
  let pulseT = 99;
  function set(level, time, dt = 0.016, fire = false) {
    if (fire) pulseT = 0;
    pulseT += dt;
    currents.forEach((c, i) => c.update(0.25 + 0.75 * level, time + i * 0.4, i % 3 ? -1 : 1));
    for (const e of bat.edges) e.color.copy(INK).lerp(VOLT, 0.25 + 0.5 * level);
    homes.forEach((h, i) => { const lv = level * (0.5 + 0.5 * Math.sin(time * 2 + i)); for (const e of h.edges) e.color.copy(INK).lerp(VOLT, lv * 0.5); });
    const r = 1 + pulseT * 2.2; pulse.scale.set(r, 1, r); pulse.material.opacity = Math.max(0, 0.9 - pulseT * 0.45);
    rings.forEach((l, i) => { l.material.opacity = 0.18 + 0.12 * level + 0.06 * Math.sin(time * 1.5 - i); });
  }
  return { set };
}
