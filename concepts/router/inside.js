// Inside Vyre One: the router taken apart, part by part, for the exploded-view section.
// set(t): 0 = assembled, 1 = fully exploded. layers[] are the parts the captions point at.
import { THREE, V, COBALT, glowTex } from './vyre.js';

const R = 0.55, H = 2.1, Y0 = 0.09, E = 0.07;
const at = (m, p, r) => { m.position.copy(p); if (r) m.rotation.copy(r); return m; };

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t; }

// the shell's milled profile, as a wall with thickness so the cut edges read as solid metal
function shellProfile() {
  const out = [], inner = [];
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI / 2; out.push(new THREE.Vector2(R - E + Math.cos(a) * E, E + Math.sin(a) * E)); }
  for (let y = E + 0.02; y < H - E - 0.02; y += 0.028 / 6) { const ph = ((y - E) / 0.028) % 1; out.push(new THREE.Vector2(R - 0.007 * Math.pow(Math.sin(ph * Math.PI), 6), y)); }
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; out.push(new THREE.Vector2(R - E + Math.cos(a) * E, H - E + Math.sin(a) * E)); }
  out.push(new THREE.Vector2(R - 0.06, H));
  inner.push(new THREE.Vector2(R - 0.06, H - 0.03), new THREE.Vector2(R - 0.05, 0.04), new THREE.Vector2(R - 0.06, 0.004));
  return [...out, ...inner];
}

// a circuit board texture: dark solder mask, fine traces, a few gold pads
const pcbTex = () => canvasTex(1024, 1024, (g, w) => {
  g.fillStyle = '#0E1311'; g.fillRect(0, 0, w, w);
  let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.lineWidth = 2; g.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    let x = r() * w, y = r() * w; g.strokeStyle = r() < 0.15 ? 'rgba(124,123,255,.55)' : 'rgba(180,170,140,.22)'; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { if (r() < 0.5) x += (r() - 0.5) * 220; else y += (r() - 0.5) * 220; g.lineTo(x, y); } g.stroke();
  }
  for (let i = 0; i < 180; i++) { g.fillStyle = r() < 0.6 ? '#B89A55' : '#7F6A3C'; const x = r() * w, y = r() * w; g.fillRect(x, y, 6, 6); }
});
// an antenna board: copper meanders on a dark board
const antTex = () => canvasTex(256, 1024, (g, w, h) => {
  g.fillStyle = '#101614'; g.fillRect(0, 0, w, h); g.strokeStyle = '#C08A4A'; g.lineWidth = 6;
  for (const y0 of [80, 420, 760]) { g.beginPath(); let x = 40, y = y0; g.moveTo(x, y); for (let k = 0; k < 9; k++) { y += 24; g.lineTo(x, y); x = x === 40 ? 216 : 40; g.lineTo(x, y); } g.stroke(); g.fillStyle = '#C08A4A'; g.fillRect(110, y0 + 240, 36, 36); }
});

export function vyreInside(st, { finish = 'graphite' } = {}) {
  const { scene, camera } = st;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight('#fff4ea', 2.4); key.position.set(4, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#6E6BFF', 2.6); rim.position.set(-5, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight('#ffffff', 0.5); fill.position.set(-3, -2, 5); scene.add(fill);
  scene.add(new THREE.AmbientLight('#ffffff', 0.18));
  const root = new THREE.Group(); scene.add(root);
  const light = new THREE.MeshBasicMaterial({ color: COBALT.clone().multiplyScalar(2.2), toneMapped: false });
  const body = { graphite: '#1A1A20', bone: '#E8E3D8', cobalt: '#20238A' }[finish];
  const shellMat = new THREE.MeshPhysicalMaterial({ color: body, roughness: 0.5, metalness: 0.3, clearcoat: 0.2, side: THREE.DoubleSide });
  const alu = new THREE.MeshStandardMaterial({ color: '#A7ABB2', metalness: 0.9, roughness: 0.32 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: '#111114', roughness: 0.7 });
  const chip = new THREE.MeshStandardMaterial({ color: '#17171B', roughness: 0.5 });
  const lid = new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 0.95, roughness: 0.25 });
  const L = (name, y) => { const g = new THREE.Group(); g.name = name; g.userData.base = y; g.position.y = y; root.add(g); return g; };

  // 0 · foot with the port ring
  const foot = L('Foot', 0);
  foot.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.11, 64), darkPlastic), V(0, 0.055, 0)));
  for (let i = 0; i < 5; i++) { const a = -0.55 + i * 0.27; const p = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.04, 0.03), new THREE.MeshStandardMaterial({ color: '#2A2A30', metalness: 0.6, roughness: 0.4 })); p.position.set(Math.sin(a) * 0.43, 0.06, Math.cos(a) * 0.43); p.rotation.y = a; foot.add(p);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.01), i === 0 ? light : new THREE.MeshBasicMaterial({ color: '#7BFFB0', toneMapped: false })); led.position.set(Math.sin(a) * 0.445, 0.09, Math.cos(a) * 0.445); led.rotation.y = a; foot.add(led); }

  // 1 · mainboard
  const board = L('Mainboard', 0.16);
  const pcb = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.025, 96), [new THREE.MeshStandardMaterial({ color: '#0E1311', roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: pcbTex(), roughness: 0.55, metalness: 0.1 }), new THREE.MeshStandardMaterial({ color: '#0E1311' })]);
  board.add(pcb);
  const soc = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.2), lid); soc.position.y = 0.028; board.add(soc);
  for (const [x, z, w, d] of [[-0.24, 0.05, 0.1, 0.16], [0.25, 0.04, 0.1, 0.16], [0.02, -0.26, 0.16, 0.08], [0.05, 0.27, 0.14, 0.07], [-0.18, -0.2, 0.08, 0.08], [0.2, -0.18, 0.08, 0.08]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), chip); c.position.set(x, 0.022, z); board.add(c); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 12), alu); c.position.set(Math.cos(a) * 0.39, 0.03, Math.sin(a) * 0.39); board.add(c); }

  // 2 · heat sink: radial fins on a copper core
  const sink = L('Heat sink', 0.26);
  sink.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.24, 48), new THREE.MeshStandardMaterial({ color: '#B87543', metalness: 0.9, roughness: 0.3 })), V(0, 0.12, 0)));
  sink.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.02, 96), alu), V(0, 0.01, 0)));
  for (let i = 0; i < 56; i++) { const a = i / 56 * Math.PI * 2; const f = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.008), alu); f.position.set(Math.cos(a) * 0.28, 0.13, Math.sin(a) * 0.28); f.rotation.y = -a; sink.add(f); }

  // 3 · antenna array + light guide
  const ant = L('Antenna array', 0.55);
  ant.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.3, 48), darkPlastic), V(0, 0.65, 0)));
  const aTex = antTex(), aMat = new THREE.MeshStandardMaterial({ map: aTex, roughness: 0.5, metalness: 0.2, emissive: COBALT, emissiveIntensity: 0, emissiveMap: aTex });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.26; const b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 1.12, 0.012), aMat); b.position.set(Math.cos(a) * 0.3, 0.66, Math.sin(a) * 0.3); b.rotation.y = -a + Math.PI / 2; ant.add(b); }
  for (const y of [0.08, 1.24]) ant.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.012, 8, 96), alu), V(0, y, 0), new THREE.Euler(Math.PI / 2, 0, 0)));
  const guide = new THREE.Mesh(new THREE.BoxGeometry(0.03, H * 0.74, 0.03), light); guide.position.set(0, Y0 + H * 0.52 - 0.55, R - 0.03); ant.add(guide);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: COBALT, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(0.3, H * 0.8, 1); halo.position.copy(guide.position).add(V(0, 0, 0.04)); ant.add(halo);

  // 4 · shell, split into two halves that slide apart
  const prof = shellProfile();
  const shellL = L('Shell', 0), shellR = new THREE.Group(); shellR.userData.base = 0; root.add(shellR);
  for (const [grp, start] of [[shellR, 0], [shellL, Math.PI]]) { const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 120, start, Math.PI), shellMat); m.position.y = Y0; m.geometry.computeVertexNormals(); grp.add(m); }

  // 5 · glass top: perforated, ringed with light
  const top = L('Glass top', Y0 + H - 0.04);
  top.add(new THREE.Mesh(new THREE.CylinderGeometry(R - 0.065, R - 0.065, 0.014, 128), new THREE.MeshPhysicalMaterial({ color: '#060608', roughness: 0.12, metalness: 0.2, clearcoat: 1 })));
  top.add(at(new THREE.Mesh(new THREE.TorusGeometry(R - 0.075, 0.014, 12, 160), light), V(0, 0.008, 0), new THREE.Euler(Math.PI / 2, 0, 0)));
  const dots = []; for (let r = 0.06; r < 0.34; r += 0.035) for (let i = 0, n = Math.round(r * 60); i < n; i++) dots.push([Math.cos(i / n * 6.283) * r, Math.sin(i / n * 6.283) * r]);
  const holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.007, 8), new THREE.MeshBasicMaterial({ color: '#2B2B36' }), dots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  dots.forEach(([x, z], i) => holes.setMatrixAt(i, m4.compose(V(x, 0.008, z), q, V(1, 1, 1)))); top.add(holes);

  // how far each part travels when the router opens up
  const LIFT = { Foot: 0, Mainboard: 0.42, 'Heat sink': 0.95, 'Antenna array': 1.55, 'Glass top': 2.5 };
  const box = new THREE.Box3(), size = new THREE.Vector3(), centre = new THREE.Vector3();
  const layers = [top, shellR, ant, sink, board, foot]; // top to bottom, the order the captions run
  return {
    layers, shellR, root,
    set(t, { az = 0.6, time = 0, aspect = 1 } = {}) {
      const e = t;
      for (const g of [foot, board, sink, ant, top]) g.position.y = g.userData.base + LIFT[g.name] * e;
      shellL.position.set(-0.012 - 1.25 * e, 0.75 * e, 0); shellR.position.set(0.012 + 1.25 * e, 0.75 * e, 0);
      aMat.emissiveIntensity = 0.35 * e * (0.7 + 0.3 * Math.sin(time * 2));
      root.rotation.y = az;
      // frame everything that is visible, with room for the captions on either side
      box.setFromObject(root); box.getSize(size); box.getCenter(centre);
      const fov = camera.fov * Math.PI / 180, needH = size.y * 1.06, needW = (size.x + 0.2) * 1.06 / Math.max(0.5, aspect);
      const dist = Math.max(needH, needW) / 2 / Math.tan(fov / 2) + 0.4;
      camera.position.set(centre.x, centre.y + dist * 0.28, centre.z + dist); camera.lookAt(centre.x, centre.y - 0.05, centre.z);
    },
  };
}
