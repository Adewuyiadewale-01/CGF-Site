// Nanomantic 3D kit: the isometric building language from the hero, packaged so every section
// (and the Figma renders) draws from the same parts. White faces, two greys, ink edges, one green.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export { THREE };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const PAL = {
  bg: '#EEF2F1', top: '#FFFFFF', left: '#F1F5F4', right: '#E1E8E7', roof: '#EDF2F1',
  edge: '#1C1C20', volt: '#20AC5D', voltMid: '#A9DEBF', voltSoft: '#E6F5EC', ink: '#141416',
};

export function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

/** A drawing context: materials + builders bound to one scene. */
export function makeKit(scene, pal = PAL) {
  const col = (c) => new THREE.Color(c);
  const INK = col(pal.edge), VOLT = col(pal.volt);
  const M = {
    top: new THREE.MeshBasicMaterial({ color: col(pal.top), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    left: new THREE.MeshBasicMaterial({ color: col(pal.left), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    right: new THREE.MeshBasicMaterial({ color: col(pal.right), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    roof: new THREE.MeshBasicMaterial({ color: col(pal.roof), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    volt: new THREE.MeshBasicMaterial({ color: VOLT }),
    voltSoft: new THREE.MeshBasicMaterial({ color: col(pal.voltSoft), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    ink: new THREE.MeshBasicMaterial({ color: col(pal.ink) }),
  };
  const edge = (o = 0.85) => new THREE.LineBasicMaterial({ color: INK.clone(), transparent: true, opacity: o });
  const E = { main: edge(0.85), mid: edge(0.4), fine: edge(0.16), faint: edge(0.07) };
  const faces = (top = M.top) => [M.right, M.top, top, M.top, M.left, M.top];

  function lines(parent, segs, mat = E.fine) {
    const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), mat); parent.add(l); return l;
  }
  function box(parent, w, h, d, x, y, z, { top, edges = E.main, mats } = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mats || faces(top)); m.position.set(x, y + h / 2, z);
    if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edges));
    parent.add(m); return m;
  }
  function windowsZ(parent, x0, x1, y0, y1, z, cols, rows, mat = E.mid) {
    const s = [], cw = (x1 - x0) / cols, rh = (y1 - y0) / rows;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const a = x0 + c * cw + cw * 0.22, b = x0 + (c + 1) * cw - cw * 0.22, p = y0 + r * rh + rh * 0.25, q = y0 + (r + 1) * rh - rh * 0.2;
      s.push(V(a, p, z), V(b, p, z), V(b, p, z), V(b, q, z), V(b, q, z), V(a, q, z), V(a, q, z), V(a, p, z));
    }
    return lines(parent, s, mat);
  }
  function windowsX(parent, z0, z1, y0, y1, x, cols, rows, mat = E.mid) {
    const s = [], cw = (z1 - z0) / cols, rh = (y1 - y0) / rows;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const a = z0 + c * cw + cw * 0.22, b = z0 + (c + 1) * cw - cw * 0.22, p = y0 + r * rh + rh * 0.25, q = y0 + (r + 1) * rh - rh * 0.2;
      s.push(V(x, p, a), V(x, p, b), V(x, p, b), V(x, q, b), V(x, q, b), V(x, q, a), V(x, q, a), V(x, p, a));
    }
    return lines(parent, s, mat);
  }
  // pitched roof: two slabs with overhang, gable ends in the wall plane, seams on the front slope
  function pitched(parent, len, span, rise, x, y, z, { edges = E.main, alongX = true, seams = true } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); if (!alongX) g.rotation.y = Math.PI / 2; parent.add(g);
    const half = span / 2, a = Math.atan2(rise, half), ov = 0.28, th = 0.13, L = Math.hypot(rise, half) + ov;
    for (const sd of [1, -1]) {
      const geo = new THREE.BoxGeometry(len + ov * 2, th, L);
      const slab = new THREE.Mesh(geo, [M.left, M.left, sd > 0 ? M.roof : M.right, M.left, M.left, M.left]);
      const u = V(0, -Math.sin(a), sd * Math.cos(a)), n = V(0, Math.cos(a), sd * Math.sin(a));
      slab.position.copy(V(0, rise, 0).addScaledVector(u, L / 2).addScaledVector(n, th / 2));
      slab.rotation.x = sd * a;
      slab.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edges)); g.add(slab);
      if (sd > 0 && seams) {
        const sg = [], top = V(0, rise, 0).addScaledVector(n, th + 0.01);
        for (let i = -len / 2 + 0.35; i < len / 2; i += 0.35) sg.push(top.clone().setX(i), top.clone().addScaledVector(u, L).setX(i));
        lines(g, sg, E.fine);
      }
    }
    const tri = new THREE.Shape(); tri.moveTo(-half, 0); tri.lineTo(half, 0); tri.lineTo(0, rise); tri.closePath();
    for (const end of [1, -1]) {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), alongX ? M.right : M.left);
      m.rotation.y = Math.PI / 2; m.position.x = end * len / 2; g.add(m);
    }
    return { group: g, slope: { a, rise, half, th } };
  }

  /* ---------- plinth: a white slab, optionally deep like a section cut ---------- */
  function plinth(parent, cx, cz, w, d, top, depth = 2, { hatch = true, rules = true } = {}) {
    const g = new THREE.Group(); parent.add(g);
    box(g, w, depth, d, cx, top - depth, cz);
    if (rules) {
      const s = []; for (let t = -w / 2 + 0.9; t < w / 2; t += 0.9) s.push(V(cx + t, top - 0.3, cz + d / 2 + 0.01), V(cx + t, top - Math.min(depth, 6), cz + d / 2 + 0.01));
      for (let t = -d / 2 + 0.9; t < d / 2; t += 0.9) s.push(V(cx + w / 2 + 0.01, top - 0.3, cz + t), V(cx + w / 2 + 0.01, top - Math.min(depth, 6), cz + t));
      lines(g, s, E.faint);
    }
    if (hatch) {
      const h = [], y = top + 0.01, x0 = cx - w / 2, x1 = cx + w / 2, z1 = cz + d / 2;
      for (let i = 0; i <= w; i += 0.7) h.push(V(x0 + i, y, z1), V(Math.min(x0 + i + 1.6, x1), y, z1 - Math.min(1.6, x1 - x0 - i)));
      lines(g, h, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.12 }));
    }
    return g;
  }

  /* ---------- buildings: each returns { group, edges, anchors } ---------- */
  function house(parent, x, y, z, s = 1, { solar = false, ev = false, edges } = {}) {
    const e = edges || edge(0.85), f = edge(0.4), g = new THREE.Group(); parent.add(g);
    box(g, 4.6 * s, 2.2 * s, 3.4 * s, x, y, z, { edges: e });
    const r = pitched(g, 4.6 * s, 3.4 * s, 1.5 * s, x, y + 2.2 * s, z, { edges: e, seams: !solar });
    box(g, 2.2 * s, 1.6 * s, 2.4 * s, x + 2.6 * s, y, z + 1.6 * s, { edges: e });
    pitched(g, 2.4 * s, 2.2 * s, 0.9 * s, x + 2.6 * s, y + 1.6 * s, z + 1.6 * s, { edges: e, alongX: false });
    windowsZ(g, x - 2.1 * s, x + 0.6 * s, y + 0.5 * s, y + 1.9 * s, z + 1.71 * s, 3, 1, f);
    windowsX(g, z - 1.5 * s, z + 0.9 * s, y + 0.4 * s, y + 1.9 * s, x + 2.31 * s, 2, 1, f);
    lines(g, [V(x + 2.0 * s, y, z + 2.81 * s), V(x + 2.0 * s, y + 1.2 * s, z + 2.81 * s), V(x + 2.0 * s, y + 1.2 * s, z + 2.81 * s), V(x + 3.2 * s, y + 1.2 * s, z + 2.81 * s), V(x + 3.2 * s, y + 1.2 * s, z + 2.81 * s), V(x + 3.2 * s, y, z + 2.81 * s)], f);
    let panel = null;
    if (solar) { // a framed panel array lying on the front roof sheet, cells drawn in green when live
      const half = 1.7 * s, rise = 1.5 * s, base = y + 2.2 * s, a = Math.atan2(rise, half);
      const onSlope = (xx, t) => V(xx, base + rise * (1 - t) + 0.14 / Math.cos(a) + 0.04, z + half * t);
      const x0 = x - 1.9 * s, x1 = x + 1.5 * s, t0 = 0.18, t1 = 0.82, p = [];
      for (let i = 0; i <= 5; i++) { const xx = x0 + (x1 - x0) * (i / 5); p.push(onSlope(xx, t0), onSlope(xx, t1)); }
      for (const t of [t0, (t0 + t1) / 2, t1]) p.push(onSlope(x0, t), onSlope(x1, t));
      panel = lines(g, p, edge(0.85));   // its own material, so it can light up without the house
      // a soft fill under the cells so the array reads as a surface
      const q = [onSlope(x0, t0), onSlope(x1, t0), onSlope(x1, t1), onSlope(x0, t1)].map((v) => v.clone().setY(v.y - 0.02));
      const fill = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([q[0], q[1], q[2], q[0], q[2], q[3]]), new THREE.MeshBasicMaterial({ color: col(pal.voltSoft), side: THREE.DoubleSide, transparent: true, opacity: 0 }));
      g.add(fill); panel.userData.fill = fill;
    }
    if (ev) {
      box(g, 1.3 * s, 0.55 * s, 2.4 * s, x + 4.6 * s, y + 0.15 * s, z + 2.4 * s, { edges: e });
      box(g, 1.0 * s, 0.45 * s, 1.3 * s, x + 4.6 * s, y + 0.7 * s, z + 2.2 * s, { edges: e });
      box(g, 0.25 * s, 1.3 * s, 0.25 * s, x + 4.6 * s, y, z + 0.4 * s, { edges: e });
    }
    return { group: g, edges: [e], panel, top: V(x, y + 3.9 * s, z) };
  }
  function strata(parent, x, y, z, { edges } = {}) {
    const e = edges || edge(0.85), f = edge(0.35), g = new THREE.Group(); parent.add(g);
    box(g, 4.6, 10, 4.6, x, y, z, { edges: e });
    box(g, 3.0, 4, 3.0, x - 0.8, y + 10, z - 0.8, { edges: e });
    box(g, 1.4, 0.9, 1.2, x + 1.2, y + 10, z + 1.2, { edges: e });
    windowsZ(g, x - 2.3, x + 2.3, y + 0.6, y + 10, z + 2.31, 4, 7, f);
    windowsX(g, z - 2.3, z + 2.3, y + 0.6, y + 10, x + 2.31, 4, 7, f);
    windowsZ(g, x - 2.3, x + 0.7, y + 10.3, y + 14, z + 0.71, 2, 3, f);
    return { group: g, edges: [e], top: V(x, y + 14, z) };
  }
  function shop(parent, x, y, z, { edges } = {}) {
    const e = edges || edge(0.85), f = edge(0.4), g = new THREE.Group(); parent.add(g);
    box(g, 6, 2.8, 4, x, y, z, { edges: e });
    box(g, 6.4, 0.18, 1.2, x, y + 2.0, z + 2.6, { edges: e });
    box(g, 3.2, 0.7, 0.12, x - 0.6, y + 2.85, z + 2.0, { edges: e });
    windowsZ(g, x - 3, x + 3, y + 0.15, y + 1.8, z + 2.01, 3, 1, f);
    box(g, 1.6, 0.6, 1.2, x + 2, y + 2.8, z - 1, { edges: e });
    // a flat rooftop array
    const p = [], y1 = y + 2.81; for (let i = 0; i <= 4; i++) p.push(V(x - 2.6 + i * 0.8, y1, z - 1.6), V(x - 2.6 + i * 0.8, y1, z + 0.4));
    for (const zz of [-1.6, -0.6, 0.4]) p.push(V(x - 2.6, y1, z + zz), V(x + 0.6, y1, z + zz));
    lines(g, p, f);
    return { group: g, edges: [e], top: V(x, y + 3.6, z) };
  }
  function battery(parent, x, y, z, { edges } = {}) {
    const e = edges || edge(0.85), f = edge(0.4), g = new THREE.Group(); parent.add(g);
    box(g, 6.4, 0.25, 4.4, x + 0.6, y, z + 0.4, { edges: e });
    for (const dx of [-0.9, 1.9]) {
      box(g, 2.4, 2.6, 2.6, x + dx, y + 0.25, z, { edges: e });
      const s = []; for (let i = 1; i < 6; i++) { const xx = x + dx - 1.2 + i * 0.4; s.push(V(xx, y + 0.5, z + 1.31), V(xx, y + 2.6, z + 1.31)); } lines(g, s, f);
    }
    box(g, 1.2, 1.4, 1.2, x + 3.4, y + 0.25, z + 1.6, { edges: e });
    return { group: g, edges: [e], top: V(x + 0.5, y + 3, z) };
  }

  /* ---------- exploded objects (t: 0 assembled -> 1 apart). Each returns { group, set(t), anchors } ---------- */
  // a solar panel, layer by layer: glass, encapsulant, cells, backsheet, frame, junction box
  function panelStack(parent, { w = 10, d = 6 } = {}) {
    const g = new THREE.Group(); parent.add(g);
    const layers = [];
    const add = (build, gap) => { const l = new THREE.Group(); g.add(l); build(l); layers.push({ l, gap }); return l; };
    add((l) => { // frame
      const t = 0.32, h = 0.5;
      box(l, w, h, t, 0, 0, -d / 2 + t / 2); box(l, w, h, t, 0, 0, d / 2 - t / 2);
      box(l, t, h, d - 2 * t, -w / 2 + t / 2, 0, 0); box(l, t, h, d - 2 * t, w / 2 - t / 2, 0, 0);
      box(l, 1.4, 0.35, 1.0, w / 2 - 1.6, -0.35, -d / 2 + 1.0, { edges: E.main }); // junction box, under the frame
    }, 0);
    add((l) => { box(l, w - 0.5, 0.06, d - 0.5, 0, 0, 0, { edges: E.mid }); }, 2.4);                   // backsheet
    add((l) => { // cells: a 10 x 6 grid with green busbars
      box(l, w - 0.6, 0.05, d - 0.6, 0, 0, 0, { edges: E.mid, mats: faces(M.voltSoft) });
      const s = [], b = [], cx = 10, cz = 6, cw = (w - 0.9) / cx, cd = (d - 0.9) / cz, y = 0.06;
      for (let i = 0; i < cx; i++) for (let j = 0; j < cz; j++) {
        const x0 = -w / 2 + 0.45 + i * cw + 0.06, x1 = x0 + cw - 0.12, z0 = -d / 2 + 0.45 + j * cd + 0.06, z1 = z0 + cd - 0.12;
        s.push(V(x0, y, z0), V(x1, y, z0), V(x1, y, z0), V(x1, y, z1), V(x1, y, z1), V(x0, y, z1), V(x0, y, z1), V(x0, y, z0));
      }
      for (let j = 0; j < cz; j++) { const zz = -d / 2 + 0.45 + (j + 0.5) * cd; b.push(V(-w / 2 + 0.4, y + 0.005, zz), V(w / 2 - 0.4, y + 0.005, zz)); }
      lines(l, s, E.mid);
      lines(l, b, new THREE.LineBasicMaterial({ color: VOLT }));
    }, 2.2);
    add((l) => { box(l, w - 0.5, 0.05, d - 0.5, 0, 0, 0, { edges: E.fine }); }, 1.6);                  // encapsulant
    add((l) => { // glass with a few glints
      box(l, w - 0.4, 0.1, d - 0.4, 0, 0, 0, { edges: E.main });
      lines(l, [V(-w / 2 + 1, 0.11, d / 2 - 1.2), V(-w / 2 + 2.6, 0.11, d / 2 - 2.6), V(-w / 2 + 1.6, 0.11, d / 2 - 0.8), V(-w / 2 + 3.6, 0.11, d / 2 - 2.8)], E.fine);
    }, 2.0);
    const anchors = layers.map((x) => x.l);
    const guide = guides(g, [[-w / 2 + 0.2, d / 2 - 0.2], [w / 2 - 0.2, d / 2 - 0.2], [w / 2 - 0.2, -d / 2 + 0.2]]);
    const set = (t) => { let y = 0; layers.forEach(({ l, gap }) => { y += gap * t + 0.08; l.position.y = y; }); guide(0.5, y); };
    set(0); return { group: g, set, layers: anchors, names: ['Frame + junction box', 'Backsheet', 'Cells', 'Encapsulant', 'Glass'] };
  }
  // a street battery: pad, rack, six modules, inverter, enclosure shell, roof cap
  function batteryStack(parent) {
    const g = new THREE.Group(); parent.add(g);
    const layers = [];
    const add = (name, build, gap) => { const l = new THREE.Group(); g.add(l); build(l); layers.push({ l, gap, name }); return l; };
    add('Concrete pad', (l) => { box(l, 9, 0.5, 6, 0, 0, 0); }, 0);
    add('Inverter + switchgear', (l) => {
      box(l, 2.4, 2.4, 2.2, 3.0, 0, 1.2);
      windowsZ(l, 1.9, 4.1, 0.4, 2.1, 2.31, 2, 2, E.mid);
      const c = []; for (let i = 0; i < 6; i++) c.push(V(1.9 + i * 0.35, 2.41, 0.4), V(1.9 + i * 0.35, 2.41, 1.9)); lines(l, c, E.fine);
    }, 1.0);
    add('Battery modules', (l) => {
      for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) {
        const x = -3.0 + i * 1.75, y = k * 1.25, z = -0.6;
        box(l, 1.55, 1.05, 3.4, x, y, z, { mats: faces(M.top) });
        // cell rows on the face, one green status light
        const s = []; for (let r = 1; r < 4; r++) s.push(V(x - 0.7, y + r * 0.26, z + 1.71), V(x + 0.7, y + r * 0.26, z + 1.71)); lines(l, s, E.fine);
        const led = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), M.volt); led.position.set(x + 0.55, y + 0.82, z + 1.72); l.add(led);
      }
      lines(l, [V(-3.8, 2.6, 1.15), V(1.4, 2.6, 1.15)], new THREE.LineBasicMaterial({ color: VOLT }));
    }, 1.4);
    add('Rack + cooling', (l) => {
      const s = [];
      for (const x of [-3.9, 1.6]) for (const z of [-2.4, 1.2]) s.push(V(x, 0, z), V(x, 2.7, z));
      for (const y of [0, 2.7]) s.push(V(-3.9, y, -2.4), V(1.6, y, -2.4), V(-3.9, y, 1.2), V(1.6, y, 1.2), V(-3.9, y, -2.4), V(-3.9, y, 1.2), V(1.6, y, -2.4), V(1.6, y, 1.2));
      lines(l, s, E.main);
      box(l, 1.8, 0.5, 1.6, -1.2, 2.7, -0.6, { edges: E.main });
      const fan = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, b = (i + 1) / 24 * Math.PI * 2; fan.push(V(-1.2 + Math.cos(a) * 0.55, 3.21, -0.6 + Math.sin(a) * 0.55), V(-1.2 + Math.cos(b) * 0.55, 3.21, -0.6 + Math.sin(b) * 0.55)); }
      lines(l, fan, E.mid);
    }, 1.6);
    add('Enclosure', (l) => {
      box(l, 6.4, 3.4, 4.2, -1.15, 0, -0.6, { edges: E.main });
      const s = []; for (let i = 1; i < 12; i++) { const xx = -4.35 + i * 0.53; s.push(V(xx, 0.3, 1.51), V(xx, 3.1, 1.51)); } lines(l, s, E.fine);
      lines(l, [V(-1.15, 0.2, 1.51), V(-1.15, 3.2, 1.51)], E.mid);
    }, 2.6);
    add('Roof + sensors', (l) => {
      box(l, 6.9, 0.3, 4.7, -1.15, 0, -0.6, { edges: E.main });
      box(l, 0.3, 0.9, 0.3, 1.6, 0.3, -2.3, { edges: E.main });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), M.volt); led.position.set(1.6, 1.4, -2.3); l.add(led);
    }, 1.8);
    const guide = guides(g, [[-4.6, 1.75], [2.25, 1.75], [2.25, -2.95]]);
    // assembled: modules sit on the pad (0.5), enclosure over them, roof on top of the enclosure
    const base = [0, 0.5, 0.5, 0.5, 0.5, 3.9];
    const set2 = (t) => { let lift = 0; layers.forEach(({ l, gap }, i) => { lift += gap * t; l.position.y = base[i] + (i ? lift : 0); }); };
    set2(0); return { group: g, set: (t) => { set2(t); guide(0.5, layers.at(-1).l.position.y); }, layers: layers.map((x) => x.l), names: layers.map((x) => x.name) };
  }

  /* ---------- energy: a volt line with travelling pulses ---------- */
  const glowTex = glowTexture();
  function current(points, resolution, { width = 2.4 } = {}) {
    const g = new LineGeometry(); g.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
    const mat = new LineMaterial({ color: VOLT.getHex(), linewidth: width, transparent: true, opacity: 0, resolution });
    const line = new Line2(g, mat); line.computeLineDistances(); scene.add(line);
    const lens = [0]; for (let i = 1; i < points.length; i++) lens.push(lens[i - 1] + points[i].distanceTo(points[i - 1]));
    const total = lens.at(-1), pulses = [];
    for (let i = 0; i < 4; i++) { const m = new THREE.SpriteMaterial({ map: glowTex, color: VOLT, transparent: true, opacity: 0, depthTest: false }); const s = new THREE.Sprite(m); s.scale.setScalar(1.1); scene.add(s); pulses.push({ s, m, off: i / 4 }); }
    const at = (t) => { const d = t * total; let i = 1; while (i < lens.length - 1 && lens[i] < d) i++; const a = lens[i - 1], b = lens[i]; return points[i - 1].clone().lerp(points[i], b > a ? (d - a) / (b - a) : 0); };
    // level 0..1, dir 1 forward / -1 back, time in seconds
    const update = (level, time, dir = 1) => {
      mat.opacity = level;
      for (const p of pulses) { const f = (p.off + time * (9 / total)) % 1, u = dir > 0 ? f : 1 - f; p.s.position.copy(at(u)); p.m.opacity = level * Math.sin(u * Math.PI); }
    };
    return { line, update, at, total };
  }
  function tray(points, width = 1.3) {
    const L = [], R = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      const dir = V(b.x - a.x, 0, b.z - a.z).normalize(); const n = V(-dir.z, 0, dir.x).multiplyScalar(width / 2);
      L.push(points[i].clone().add(n).setY(points[i].y + 0.02)); R.push(points[i].clone().sub(n).setY(points[i].y + 0.02));
    }
    const pos = []; for (let i = 0; i < points.length - 1; i++) pos.push(L[i], R[i], R[i + 1], L[i], R[i + 1], L[i + 1]);
    scene.add(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(pos), new THREE.MeshBasicMaterial({ color: col(pal.top), side: THREE.DoubleSide })));
    const sk = []; for (let i = 0; i < points.length - 1; i++) { const d = V(0, -0.35, 0); sk.push(R[i], R[i + 1], R[i + 1].clone().add(d), R[i], R[i + 1].clone().add(d), R[i].clone().add(d)); }
    scene.add(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(sk), new THREE.MeshBasicMaterial({ color: col(pal.right), side: THREE.DoubleSide })));
    const s = []; for (let i = 0; i < points.length - 1; i++) s.push(L[i], L[i + 1], R[i], R[i + 1], R[i].clone().setY(R[i].y - 0.35), R[i + 1].clone().setY(R[i + 1].y - 0.35)); lines(scene, s, E.main);
  }
  function ring(cx, y, cz, r, opacity = 0.35) {
    const pts = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(V(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: INK, transparent: true, opacity, dashSize: 0.45, gapSize: 0.5 }));
    l.computeLineDistances(); scene.add(l); return l;
  }

  // dashed assembly guides: vertical lines at the given (x, z) corners spanning a group's layers
  function guides(group, corners) {
    const mat = new THREE.LineDashedMaterial({ color: INK, transparent: true, opacity: 0.3, dashSize: 0.22, gapSize: 0.22 });
    const geo = new THREE.BufferGeometry(); const l = new THREE.LineSegments(geo, mat); group.add(l);
    return (y0, y1) => { const p = []; for (const [x, z] of corners) p.push(V(x, y0, z), V(x, y1, z)); geo.setFromPoints(p); l.computeLineDistances(); };
  }
  return { M, E, INK, VOLT, edge, lines, box, windowsZ, windowsX, pitched, plinth, house, strata, shop, battery, panelStack, batteryStack, current, tray, ring, glowTex };
}

/** An isometric stage on a canvas: renderer + ortho camera framed on a box. */
export function makeStage(canvas, { viewH = 30, look = V(0, 0, 0), az = Math.PI / 4, el = 0.6155, transparent = true, preserve = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, preserveDrawingBuffer: preserve });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  const resolution = new THREE.Vector2();
  const view = { viewH, look: look.clone(), az, el, dist: 100 };
  function place() {
    const { look: l, az: a, el: e, dist } = view;
    camera.position.set(l.x + Math.sin(a) * Math.cos(e) * dist, l.y + Math.sin(e) * dist, l.z + Math.cos(a) * Math.cos(e) * dist);
    camera.lookAt(l);
  }
  function resize() {
    const W = canvas.clientWidth || canvas.width, H = canvas.clientHeight || canvas.height, aspect = W / H;
    renderer.setSize(W, H, false);
    camera.top = view.viewH / 2; camera.bottom = -view.viewH / 2; camera.left = -view.viewH * aspect / 2; camera.right = view.viewH * aspect / 2;
    camera.updateProjectionMatrix();
    resolution.set(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());
  }
  resize(); place();
  return { renderer, scene, camera, resolution, view, place, resize, render: () => { place(); renderer.render(scene, camera); } };
}
