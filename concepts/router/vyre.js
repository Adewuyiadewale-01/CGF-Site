// Vyre One: the router, built from scratch, plus the scenes the site and the Figma renders use.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export { THREE };
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const COBALT = new THREE.Color('#3D38FF');
export const GLOW = new THREE.Color('#7C7BFF');

/* ---------- textures drawn in code ---------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 8; return t;
}
// fine horizontal ribs milled into the shell
const ribs = () => canvasTex(8, 1024, (g, w, h) => {
  // a smooth ridge every 8px: soft valleys read as milled grooves under raking light
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) { const v = 128 + 100 * Math.cos((y % 8) / 8 * Math.PI * 2); for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } }
  g.putImageData(img, 0, 0);
}, [1, 1]);
export const glowTex = () => canvasTex(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});

/* ---------- the product ---------- */
export const FINISHES = {
  graphite: { body: '#1A1A20', rough: 0.52, metal: 0.25, top: '#060608' },
  bone:     { body: '#E8E3D8', rough: 0.62, metal: 0.0,  top: '#16161A' },
  cobalt:   { body: '#20238A', rough: 0.38, metal: 0.55, top: '#07081C' },
};
// A ribbed cylinder, 10 x 24 cm: one vertical light line on the front, a recessed glass top
// ringed with light and a field of perforations. It floats on a small inset foot.
export function vyreOne(finish = 'graphite', { mini = false } = {}) {
  const f = FINISHES[finish], g = new THREE.Group(), H = mini ? 1.1 : 2.1, R = 0.55, W = 1, e = 0.07, y0 = 0.09;
  // lathe profile: soft bottom edge, straight wall, soft top edge, then a lip down into the recess
  const prof = [V(0, 0)];
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI / 2; prof.push(new THREE.Vector2(R - e + Math.cos(a) * e, e + Math.sin(a) * e)); }
  // milled ribs along the wall: real grooves, so light rakes across them at any distance
  const pitch = 0.028, ribTop = H - e - 0.02;
  for (let y = e + 0.02; y < ribTop; y += pitch / 6) { const ph = ((y - e) / pitch) % 1; prof.push(new THREE.Vector2(R - 0.007 * Math.pow(Math.sin(ph * Math.PI), 6), y)); }
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; prof.push(new THREE.Vector2(R - e + Math.cos(a) * e, H - e + Math.sin(a) * e)); }
  prof.push(new THREE.Vector2(R - 0.06, H), new THREE.Vector2(R - 0.06, H - 0.05), new THREE.Vector2(0, H - 0.05));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p.x, p.y)), 160), new THREE.MeshPhysicalMaterial({
    color: f.body, roughness: f.rough, metalness: f.metal, clearcoat: finish === 'cobalt' ? 0.6 : 0.2, clearcoatRoughness: 0.4,
  }));
  body.geometry.computeVertexNormals();
  body.position.y = y0; g.add(body);
  // the foot, set back so the column looks like it hovers
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.1, 64), new THREE.MeshStandardMaterial({ color: '#050507', roughness: 0.7 }));
  foot.position.y = 0.05; g.add(foot);
  // recessed glass top with a ring of light at its rim
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.065, R - 0.065, 0.012, 128), new THREE.MeshPhysicalMaterial({ color: f.top, roughness: 0.12, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }));
  top.position.y = y0 + H - 0.04; g.add(top);
  const lightMat = new THREE.MeshBasicMaterial({ color: COBALT.clone().multiplyScalar(2.2), toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.075, 0.014, 12, 160), lightMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = top.position.y + 0.008; g.add(ring);
  const dots = []; for (let r = 0.06; r < 0.34; r += 0.035) for (let i = 0, n = Math.round(r * 60); i < n; i++) dots.push([Math.cos(i / n * 6.283) * r, Math.sin(i / n * 6.283) * r]);
  const holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.007, 8), new THREE.MeshBasicMaterial({ color: '#2B2B36' }), dots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  dots.forEach(([x, z], i) => holes.setMatrixAt(i, m4.compose(V(x, top.position.y + 0.007, z), q, V(1, 1, 1)))); g.add(holes);
  // the light line: the only thing on the front
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.022, H * 0.74, 0.012), lightMat);
  slit.position.set(0, y0 + H * 0.52, R + 0.004); g.add(slit);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: COBALT, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(0.28, H * 0.8, 1); halo.position.copy(slit.position).add(V(0, 0, 0.05)); g.add(halo);
  // a tiny status dot under the line
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), new THREE.MeshBasicMaterial({ color: '#9BFFB9', toneMapped: false }));
  led.position.set(0, y0 + H * 0.13, R + 0.004); g.add(led);
  g.userData = { body, ring, slit, halo, lightMat, H };
  g.setLight = (v) => { lightMat.color.copy(COBALT).multiplyScalar(0.6 + 1.8 * v); halo.material.opacity = 0.2 + 0.5 * v; };
  return g;
}

/* ---------- a stage: renderer, camera, bloom ---------- */
export function makeStage(canvas, { fov = 30, bg = null, bloom = 0.9, exposure = 1, preserve = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: bg === null, preserveDrawingBuffer: preserve });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure;
  const scene = new THREE.Scene(); if (bg) scene.background = new THREE.Color(bg);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 400);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bp = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom, 0.6, 0.82); if (bloom) composer.addPass(bp);
  composer.addPass(new OutputPass());
  const st = { renderer, scene, camera, composer, bloom: bp, canvas };
  st.resize = () => {
    const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  st.render = () => (bloom ? composer.render() : renderer.render(scene, camera));
  st.resize();
  return st;
}

/* ---------- streak shader: light that runs along a line, long fading tail ---------- */
function streakMat(color, { speed = 1, len = 0.18, offset = 0, opacity = 1 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSpeed: { value: speed }, uLen: { value: len }, uOff: { value: offset }, uOpacity: { value: opacity } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float uTime, uSpeed, uLen, uOff, uOpacity; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float head = fract(uTime * uSpeed + uOff) * (1. + uLen * 2.) - uLen;
        float d = head - vUv.x;
        float tail = d > 0. ? exp(-d / uLen * 3.) : exp(d * 400.);
        float across = 1. - abs(vUv.y - .5) * 2.; across = pow(across, 1.6);
        vec3 c = mix(uColor, vec3(1.), pow(tail, 10.) * .8);
        gl_FragColor = vec4(c * 2.2, tail * across * uOpacity);
      }`,
  });
}

/* ---------- hero: the column on a dark floor, packets streaming through it ---------- */
export function heroScene(st, { finish = 'graphite', dist = 7, lookY = 1.2, camY = 1.8, lookX = 0 } = {}) {
  const { scene, camera } = st;
  scene.fog = new THREE.Fog('#0B0A10', 12, 34); scene.environmentIntensity = 0.35;
  const r = vyreOne(finish); scene.add(r);
  const key = new THREE.DirectionalLight('#fff4ea', 2.2); key.position.set(4, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#6E6BFF', 3.2); rim.position.set(-5, 3, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight('#9C9AFF', 1.4); rim2.position.set(5, 2, -5); scene.add(rim2);
  scene.add(new THREE.AmbientLight('#ffffff', 0.15));
  // a soft glossy floor and a pool of cobalt under the column
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: '#06050A', roughness: 0.22, metalness: 0.7 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: glowTex(), color: COBALT, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.005; scene.add(pool);
  // streaks: thin ribbons at many depths, flowing right into the column and out the other side
  const streaks = [];
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 64; i++) {
    const z = -10 + rnd() * 12.5, y = 0.15 + rnd() * 4.2, far = (2 - z) / 12, w = (0.012 + rnd() * 0.04) * (1 + far * 2.5);
    const m = streakMat(i % 6 === 0 ? '#C9C8FF' : '#3D38FF', { speed: 0.1 + rnd() * 0.16, len: 0.12 + rnd() * 0.22, offset: rnd(), opacity: 0.3 + rnd() * 0.7 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10 + far * 18, w), m); mesh.position.set(0, y, z); scene.add(mesh); streaks.push(m);
  }
  const D = dist; camera.position.set(lookX, camY, D); camera.lookAt(lookX, lookY, 0);
  const look = V(lookX, lookY, 0);
  return {
    router: r,
    set(t, { spin = 0, tilt = 0, light = 1 } = {}) {
      streaks.forEach((m) => { m.uniforms.uTime.value = t; });
      r.rotation.y = -0.55 + spin; r.setLight(light);
      camera.position.set(look.x + Math.sin(tilt) * D, camY + tilt * 1.2, Math.cos(tilt) * D); camera.lookAt(look);
    },
  };
}

/* ---------- studio: one or more finishes on a cream sweep ---------- */
export function studioScene(st, finishes = ['graphite', 'bone', 'cobalt']) {
  const { scene, camera } = st;
  scene.environmentIntensity = 0.45; const key = new THREE.DirectionalLight('#fff6ee', 2.6); key.position.set(-4, 9, 5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 6; key.shadow.camera.bottom = -6; key.shadow.radius = 8; key.shadow.bias = -0.0005;
  scene.add(key); scene.add(new THREE.HemisphereLight('#ffffff', '#cfc6b8', 0.45)); const fill = new THREE.DirectionalLight('#B9B6FF', 0.8); fill.position.set(6, 2, -3); scene.add(fill);
  st.renderer.shadowMap.enabled = true; st.renderer.shadowMap.type = THREE.PCFSoftShadowMap; key.shadow.radius = 4;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#E3DDD2', roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const units = finishes.map((f, i) => {
    const r = vyreOne(f); r.position.x = (i - (finishes.length - 1) / 2) * 1.9; r.rotation.y = -0.35 + i * 0.12;
    r.traverse((o) => { if (o.isMesh) { o.castShadow = true; } }); scene.add(r); return r;
  });
  camera.position.set(0, 6.2, 11.5); camera.lookAt(0, 0.95, 0);
  return { units };
}

/* ---------- the home: a plan of an apartment, walls, rooms, devices, lit paths ---------- */
// one shared layout, used by the light isometric planner and the dark signal map
export const PLAN = {
  w: 14, d: 10,
  walls: [ // [x1,z1,x2,z2] outer + inner, in plan units (origin at centre)
    [-7, -5, 7, -5], [7, -5, 7, 5], [7, 5, -7, 5], [-7, 5, -7, -5],
    [-1, -5, -1, -1.4], [-1, 0.4, -1, 5],          // living | bedrooms
    [-7, 0, -2.6, 0],                              // bedroom 1 | bedroom 2
    [3, -5, 3, -2.2], [3, -0.6, 3, 0.4],           // kitchen | living
    [3, 2.2, 7, 2.2], [4.6, 2.2, 4.6, 5],          // bath, studio
  ],
  rooms: [['Bedroom', -4, -2.5], ['Kids', -4, 2.5], ['Living', 1, 0.6], ['Kitchen', 5, -2.5], ['Studio', 5.8, 0.3], ['Bath', 5.8, 3.6]],
  router: [1.2, -3.2],
  mesh: [-2.2, 0.2],
  devices: [ // id, label, x, z, kind, via
    ['tv', 'Living room TV', 1.6, 4.2, 'tv', 'router'],
    ['mac', 'Studio Mac', 5.8, -0.4, 'desk', 'router'],
    ['console', 'Console', -0.2, 3.9, 'box', 'router'],
    ['phone', 'Maya’s phone', -4.6, -3.2, 'phone', 'mesh'],
    ['tablet', 'Kids tablet', -5, 3, 'tablet', 'mesh'],
    ['fridge', 'Fridge', 5.6, -4.1, 'box', 'router'],
    ['cam', 'Door camera', -6.4, 4.4, 'dot', 'mesh'],
  ],
};

function streakWire(a, b, { lift = 1.2, color = '#3D38FF', idle = '#C9C7D8', r = 0.035, speed = 0.45, offset = 0, len = 0.25 } = {}) {
  const mid = a.clone().lerp(b, 0.5); mid.y += lift;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const g = new THREE.Group();
  const geo = new THREE.TubeGeometry(curve, 64, r, 8, false);
  g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: idle, transparent: true, opacity: 0.55 })));
  const m = streakMat(color, { speed, len, offset });
  // the tube's uv.x runs along its length, uv.y around it: rotate the shader's "across" to always-on
  m.fragmentShader = m.fragmentShader.replace('float across = 1. - abs(vUv.y - .5) * 2.; across = pow(across, 1.6);', 'float across = 1.;');
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, r * 1.6, 8, false), m));
  return { group: g, mat: m, curve };
}

// light isometric apartment. Ink edges on white, the router's paths lit in cobalt.
export function planScene(st, { dark = false } = {}) {
  const { scene, camera } = st;
  const INK = dark ? '#5A5A7A' : '#1B1A22', FACE = dark ? '#121119' : '#FFFFFF', SIDE = dark ? '#0D0C13' : '#ECE8E1';
  scene.add(new THREE.HemisphereLight('#ffffff', dark ? '#08070C' : '#E4DED3', dark ? 0.6 : 1.6));
  const sun = new THREE.DirectionalLight('#fff', dark ? 0.6 : 1.2); sun.position.set(-6, 12, 8); scene.add(sun);
  const lines = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: dark ? 0.8 : 0.9 });
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
  const block = (w, h, d, x, y, z, face = FACE) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, [mat(SIDE), mat(SIDE), mat(face), mat(SIDE), mat(face), mat(face)]); m.position.set(x, y + h / 2, z);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lines); m.add(e); scene.add(m); return m;
  };
  // slab
  block(PLAN.w + 1.2, 0.5, PLAN.d + 1.2, 0, -0.5, 0, dark ? '#16151F' : '#F6F3EE');
  // walls
  const WH = 1.1, T = 0.14;
  for (const [x1, z1, x2, z2] of PLAN.walls) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const w = block(Math.abs(x2 - x1) + T, WH, Math.abs(z2 - z1) + T, (x1 + x2) / 2, 0, (z1 + z2) / 2);
    void len; void w;
  }
  // furniture, low and simple
  const F = [[-4.6, -3.4, 2.2, 0.35, 1.8], [-4.4, 3.4, 1.6, 0.3, 1.2], [0.2, 1.8, 2.6, 0.35, 0.9], [1.6, 4.5, 2, 0.12, 0.25], [5.8, -0.4, 1.6, 0.7, 0.7], [5, -4.3, 3.4, 0.9, 0.6], [1.2, -0.4, 1.2, 0.2, 1.2]];
  for (const [x, z, w, h, d] of F) block(w, h, d, x, 0, z, dark ? '#1A1925' : '#F7F5F1');
  // the router and a satellite
  const r = vyreOne('graphite'); r.scale.setScalar(0.42); r.position.set(PLAN.router[0], 0, PLAN.router[1]); scene.add(r);
  const m = vyreOne('graphite', { mini: true }); m.scale.setScalar(0.42); m.position.set(PLAN.mesh[0], 0, PLAN.mesh[1]); scene.add(m);
  // devices: a small plinth with a light cap
  const anchors = { router: V(PLAN.router[0], 1.25, PLAN.router[1]), mesh: V(PLAN.mesh[0], 0.7, PLAN.mesh[1]) };
  const caps = {};
  for (const [id, , x, z] of PLAN.devices) {
    block(0.36, 0.5, 0.36, x, 0, z, dark ? '#20202C' : '#FFFFFF');
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 24), new THREE.MeshBasicMaterial({ color: COBALT, toneMapped: false }));
    cap.position.set(x, 0.53, z); scene.add(cap); caps[id] = cap; anchors[id] = V(x, 0.55, z);
  }
  // paths: router -> mesh, router/mesh -> each device
  const wires = {};
  const add = (id, a, b, i) => { const w = streakWire(a, b, { lift: 0.6 + a.distanceTo(b) * 0.18, offset: i * 0.37, idle: dark ? '#2A2940' : '#CFCBD9' }); scene.add(w.group); wires[id] = w; };
  add('mesh', anchors.router, anchors.mesh, 0);
  PLAN.devices.forEach(([id, , , , , via], i) => add(id, anchors[via], anchors[id], i + 1));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: COBALT, transparent: true, opacity: dark ? 0.9 : 0.35, blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false }));
  halo.scale.set(3, 3, 1); halo.position.copy(anchors.router); scene.add(halo);
  // isometric-ish view
  camera.position.set(17, 19, 21); camera.lookAt(0.4, -0.4, 0.4);
  return {
    anchors, wires, caps, router: r,
    set(t, focus = null) {
      for (const [id, w] of Object.entries(wires)) {
        w.mat.uniforms.uTime.value = t;
        const on = !focus || focus === id || (focus && id === 'mesh' && PLAN.devices.find((d) => d[0] === focus)?.[5] === 'mesh');
        w.mat.uniforms.uOpacity.value += ((on ? 1 : 0.08) - w.mat.uniforms.uOpacity.value) * 0.12;
      }
      for (const [id, c] of Object.entries(caps)) c.material.color.copy(COBALT).multiplyScalar(!focus || focus === id ? 1.6 : 0.5);
    },
  };
}

/* ---------- signal map: top-down plan; a field shader paints coverage, walls cost signal ---------- */
export function signalScene(st) {
  const { scene, camera } = st;
  const N = PLAN.walls.length;
  const walls = PLAN.walls.map(([a, b, c, d]) => new THREE.Vector4(a, b, c, d));
  const field = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uWalls: { value: walls }, uAP: { value: [V(PLAN.router[0], PLAN.router[1], 1), V(PLAN.mesh[0], PLAN.mesh[1], 0.75)] }, uMesh: { value: 1 }, uPulse: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy * vec2(1., -1.); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `
      uniform float uTime, uMesh, uPulse; uniform vec4 uWalls[${N}]; uniform vec3 uAP[2]; varying vec2 vP;
      float cross2(vec2 a, vec2 b){ return a.x*b.y - a.y*b.x; }
      bool hit(vec2 p, vec2 q, vec2 a, vec2 b){ vec2 r = q-p, s = b-a; float d = cross2(r,s); if (abs(d) < 1e-5) return false; float t = cross2(a-p, s)/d, u = cross2(a-p, r)/d; return t>0. && t<1. && u>0. && u<1.; }
      float sig(vec3 ap, vec2 p){ float d = length(p - ap.xy); float s = ap.z * exp(-d * .21); for (int i=0;i<${N};i++){ if (hit(ap.xy, p, uWalls[i].xy, uWalls[i].zw)) s *= .8; } return s; }
      void main(){
        vec2 p = vP;
        float s0 = sig(uAP[0], p), s1 = sig(uAP[1], p) * uMesh, s = max(s0, s1);
        float lv = clamp(pow(s, 1.7) * 1.15, 0., 1.);
        float band = floor(lv * 8.) / 8.;
        float f = fract(lv * 8.);
        float iso = smoothstep(.06, 0., min(f, 1. - f)) * step(.1, lv);
        vec3 c0 = vec3(.03,.025,.05), c1 = vec3(.07,.05,.22), c2 = vec3(.20,.16,.85), c3 = vec3(.70,.70,1.);
        vec3 c = mix(c0, c1, smoothstep(.0,.3,band)); c = mix(c, c2, smoothstep(.35,.75,band)); c = mix(c, c3, smoothstep(.8,1.,band));
        float rip = 0.;
        for (int k = 0; k < 2; k++) { float d = length(p - uAP[k].xy); float w = fract(d * .18 - uTime * .45); rip += exp(-abs(w - .5) * 40.) * (k == 0 ? s0 : s1); }
        c += vec3(.5,.5,1.) * rip * .55;
        c += vec3(.75,.75,1.) * iso * (.12 + .4 * lv);
        c += vec3(.6,.6,1.) * uPulse * exp(-abs(length(p - uAP[0].xy) - uPulse * 14.) * 2.);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(PLAN.w + 0.01, PLAN.d + 0.01, 1, 1), field);
  plane.rotation.x = -Math.PI / 2; scene.add(plane);
  // walls drawn as crisp light lines over the field
  const pts = []; for (const [a, b, c, d] of PLAN.walls) pts.push(V(a, 0.02, b), V(c, 0.02, d));
  const wallGeo = new THREE.BufferGeometry().setFromPoints(pts);
  scene.add(new THREE.LineSegments(wallGeo, new THREE.LineBasicMaterial({ color: '#E8E7FF', transparent: true, opacity: 0.9 })));
  camera.position.set(0, 26, 0.001); camera.lookAt(0, 0, 0); camera.fov = 26; camera.updateProjectionMatrix();
  return {
    field,
    set(t, { mesh = 1, pulse = 0 } = {}) { field.uniforms.uTime.value = t; field.uniforms.uMesh.value = mesh; field.uniforms.uPulse.value = pulse; },
  };
}
