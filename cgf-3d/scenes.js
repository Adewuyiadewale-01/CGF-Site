// CGF — procedural Three.js scenes. No imported models, no AI imagery.
// Every object is built from primitives so lighting, colour and motion are fully controllable.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PALETTE = {
  bg: 0x0a0b0d,
  graphite: 0x26282c,
  graphiteLight: 0x34373c,
  concrete: 0x3c3d40,
  slab: 0x1c1d20,
  signal: 0xff5b2e,      // the one accent: "live / recording" signal
  warm: 0xffb27a,       // interior light, never used in UI
  white: 0xf2efe8,
};

const C = (h) => new THREE.Color(h);

/* ---------------- shared materials ---------------- */
function mats() {
  return {
    graphite: new THREE.MeshStandardMaterial({ color: PALETTE.graphite, roughness: 0.78, metalness: 0.05 }),
    graphiteLight: new THREE.MeshStandardMaterial({ color: PALETTE.graphiteLight, roughness: 0.7, metalness: 0.05 }),
    concrete: new THREE.MeshStandardMaterial({ color: PALETTE.concrete, roughness: 0.92 }),
    slab: new THREE.MeshStandardMaterial({ color: PALETTE.slab, roughness: 0.95 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8b8e94, roughness: 0.35, metalness: 0.9 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.4, metalness: 0.7 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe9e7e2, roughness: 0.45, metalness: 0.0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0c0e12, roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.02, metalness: 0.5, clearcoat: 1 }),
    warmGlass: new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, emissive: C(PALETTE.warm), emissiveIntensity: 0.16, roughness: 0.06, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }),
    signal: new THREE.MeshStandardMaterial({ color: 0x220a04, emissive: C(PALETTE.signal), emissiveIntensity: 2.2 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: C(PALETTE.white), emissiveIntensity: 0 }),
    solar: new THREE.MeshPhysicalMaterial({ color: 0x0b1018, roughness: 0.15, metalness: 0.6, clearcoat: 1 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x1a201c, roughness: 1, flatShading: true }),
  };
}

/* ---------------- interior glow (canvas) ---------------- */
// Fakes a lit room behind the glass: warm ceiling wash, a pendant, furniture silhouettes.
function interiorTexture(w, h, seed = 1) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const x = c.getContext('2d'); const H = c.height;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffcf9e'); g.addColorStop(0.35, '#b8723f'); g.addColorStop(1, '#2a160b');
  x.fillStyle = g; x.fillRect(0, 0, 512, H);
  const rnd = (n) => { const v = Math.sin(seed * 999 + n * 77.7) * 43758.5; return v - Math.floor(v); };
  for (let i = 0; i < 3; i++) { const px = 60 + rnd(i) * 390; const rg = x.createRadialGradient(px, H * 0.12, 4, px, H * 0.2, 140); rg.addColorStop(0, 'rgba(255,236,210,0.95)'); rg.addColorStop(1, 'rgba(255,200,150,0)'); x.fillStyle = rg; x.fillRect(0, 0, 512, H); x.fillStyle = '#1a0f08'; x.fillRect(px - 1, 0, 2, H * 0.12); }
  x.fillStyle = 'rgba(16,9,5,0.92)';
  for (let i = 0; i < 4; i++) { const fx = rnd(i + 10) * 440, fw = 50 + rnd(i + 20) * 110, fh = H * (0.16 + rnd(i + 30) * 0.22); x.fillRect(fx, H - fh, fw, fh); }
  x.fillRect(0, H * 0.9, 512, H * 0.1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function windowMat(w, h, seed, k = 1) {
  const tex = interiorTexture(w, h, seed);
  return new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.85 * k, roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 });
}

/* ---------------- shader helpers ---------------- */
// Energy flowing along a tube: uv.x runs along the cable length.
function cableMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uColor: { value: C(PALETTE.signal) }, uSpeed: { value: 0.6 }, uOffset: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform float uTime,uOn,uSpeed,uOffset; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float p = fract(vUv.x*3.0 - uTime*uSpeed + uOffset);
        float pulse = smoothstep(0.0,0.12,p)*(1.0-smoothstep(0.12,0.32,p));
        vec3 base = vec3(0.07,0.07,0.08);
        vec3 col = base + uColor*(0.18*uOn + pulse*3.2*uOn);
        gl_FragColor = vec4(col,1.0);
      }`,
  });
}

// Camera field-of-view volume: soft additive cone fading with distance.
function coneMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uOn: { value: 0 }, uColor: { value: C(PALETTE.signal) }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform float uOn,uTime; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float along = 1.0 - vUv.y;               // 0 at apex, 1 at base
        float fade = (1.0-along) * smoothstep(0.0,0.08,along);
        float scan = 0.55 + 0.45*smoothstep(0.85,1.0, sin(along*18.0 - uTime*3.0)*0.5+0.5);
        gl_FragColor = vec4(uColor*fade*scan*0.075*uOn, 1.0);
      }`,
  });
}

function groundMaterial(size = 120) {
  return new THREE.ShaderMaterial({
    uniforms: { uSize: { value: size } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vW;
      float line(float x,float w){ float f=abs(fract(x-0.5)-0.5); return 1.0-smoothstep(0.0,w,f); }
      void main(){
        float d = length(vW.xz);
        float g = max(line(vW.x/2.0,0.012), line(vW.z/2.0,0.012));
        float fade = 1.0 - smoothstep(8.0, 26.0, d);
        vec3 base = vec3(0.0030,0.0034,0.0041);
        vec3 col = base + vec3(0.010)*g*fade;
        col = mix(base*0.8, col, fade);
        gl_FragColor = vec4(col,1.0);
      }`,
  });
}

/* ---------------- renderer + post ---------------- */
function makeStage(container, { transparent, fov = 30, bloom = [0.85, 0.55, 0.78] }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!transparent, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = transparent ? null : C(PALETTE.bg);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, 0.1, 400);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), ...bloom);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const onResize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);
  return { renderer, scene, camera, composer, bloomPass };
}

const box = (w, h, d, m, x = 0, y = 0, z = 0, r = 0) => {
  const g = r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
};

function cable(points, mat, radius = 0.035) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.05);
  const geo = new THREE.TubeGeometry(curve, Math.max(40, points.length * 30), radius, 8, false);
  return new THREE.Mesh(geo, mat);
}

// A turret security camera, origin at its wall mount, looking along +Z then pitched down.
function securityCamera(M, signalMat) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 32), M.white); base.rotation.x = Math.PI / 2; g.add(base);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.22, 16), M.white); arm.rotation.x = Math.PI / 2; arm.position.z = 0.13; g.add(arm);
  const head = new THREE.Group(); head.position.z = 0.28; g.add(head);
  const housing = new THREE.Mesh(new THREE.SphereGeometry(0.17, 40, 24), M.white); housing.scale.set(1, 0.9, 1.15); head.add(housing);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.13, 0.08, 40), M.darkMetal); visor.rotation.x = Math.PI / 2; visor.position.z = 0.16; head.add(visor);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 16), M.lens); lens.position.z = 0.19; head.add(lens);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), signalMat); led.position.set(0.075, 0.06, 0.19); head.add(led);
  g.userData = { head, led };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function viewCone(length, radius) {
  const geo = new THREE.ConeGeometry(radius, length, 48, 1, true);
  geo.translate(0, -length / 2, 0); // apex at origin, opens toward -Y
  geo.rotateX(-Math.PI / 2);        // now opens toward +Z
  return new THREE.Mesh(geo, coneMaterial());
}

/* =====================================================================
   HERO — the whole property, wired by one team. Hold to arm.
   ===================================================================== */
function buildHero(stage) {
  const { scene, camera } = stage; const M = mats();
  scene.fog = new THREE.Fog(PALETTE.bg, 24, 52);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), groundMaterial()); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.55 })); shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = 0.005; shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);

  const house = new THREE.Group(); scene.add(house);
  // plinth + lawn + driveway
  house.add(box(17, 0.3, 12, M.slab, 0.5, 0.15, 0.5));
  house.add(box(4.6, 0.04, 6.2, new THREE.MeshStandardMaterial({ color: 0x1e1f22, roughness: 0.9 }), 5.6, 0.32, 6.1));
  // ground floor living
  house.add(box(10, 3.2, 8, M.graphite, -1.5, 1.9, 0));
  // garage
  house.add(box(5, 2.9, 7, M.graphiteLight, 5.6, 1.75, -0.5));
  // upper floor cantilever
  house.add(box(9.4, 3, 7.2, M.graphite, 0.2, 4.95, -0.4));
  const batten = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.85 });
  for (let i = 0; i < 26; i++) { const x = -4.45 + i * 0.36; if (x > -3.85 && x < 4.05) continue; house.add(box(0.07, 3.0, 0.08, batten, x, 4.95, 3.24)); }
  for (let i = 0; i < 20; i++) house.add(box(0.08, 3.0, 0.07, batten, -4.5, 4.95, -3.8 + i * 0.36));
  house.add(box(9.6, 0.08, 7.4, M.darkMetal, 0.2, 3.5, -0.4));
  // roofs (thin overhanging slabs)
  house.add(box(10.2, 0.22, 8.2, M.slab, 0.2, 6.56, -0.2));
  house.add(box(5.6, 0.18, 7.6, M.slab, 5.6, 3.29, -0.4));
  house.add(box(10.6, 0.18, 8.6, M.slab, -1.5, 3.59, 0.3));
  // glazing — ground floor living, upper bedroom band, side
  const g1 = box(5.6, 2.3, 0.06, windowMat(5.6, 2.3, 1), -3.6, 1.62, 4.03); house.add(g1);
  for (let i = 0; i < 5; i++) house.add(box(0.05, 2.3, 0.08, M.darkMetal, -6.4 + i * 1.4, 1.62, 4.06));
  const door = box(1.2, 2.5, 0.1, new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.6 }), 0.9, 1.55, 4.04); house.add(door);
  house.add(box(0.04, 0.6, 0.05, M.metal, 1.35, 1.55, 4.12));
  const g2 = box(7.6, 1.6, 0.06, windowMat(7.6, 1.6, 2, 0.6), 0.2, 5.0, 3.23); house.add(g2);
  for (let i = 0; i < 6; i++) house.add(box(0.05, 1.6, 0.08, M.darkMetal, -3.6 + i * 1.52, 5.0, 3.26));
  house.add(box(0.06, 2.0, 2.6, windowMat(2.6, 2.0, 3, 0.7), -6.53, 1.8, 1.4));
  // garage door with grooves
  house.add(box(4.1, 2.35, 0.08, M.graphiteLight, 5.6, 1.5, 3.03));
  for (let i = 0; i < 6; i++) house.add(box(4.1, 0.02, 0.1, M.slab, 5.6, 0.5 + i * 0.4, 3.08));
  // fence + gate pillar + intercom
  for (let x = -7.6; x < -1.9; x += 0.32) house.add(box(0.14, 1.5, 0.08, M.graphite, x, 1.05, 6.4));
  house.add(box(5.9, 0.06, 0.1, M.darkMetal, -4.75, 1.78, 6.4));
  const pillar = box(0.55, 1.9, 0.55, M.concrete, -1.5, 1.25, 6.4); house.add(pillar);
  const intercomPanel = box(0.22, 0.38, 0.04, M.darkMetal, -1.5, 1.45, 6.69, 0.015); house.add(intercomPanel);
  const intercomScreen = box(0.15, 0.13, 0.01, M.signal.clone(), -1.5, 1.52, 6.715); intercomScreen.material.emissiveIntensity = 0.2; house.add(intercomScreen);
  const intercomBtn = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 32), M.signal.clone()); intercomBtn.position.set(-1.5, 1.36, 6.715); intercomBtn.material.emissiveIntensity = 0.3; house.add(intercomBtn);
  // path from gate to door
  for (let i = 0; i < 4; i++) house.add(box(1.1, 0.04, 0.5, M.concrete, -0.4 + i * 0.35, 0.33, 5.9 - i * 0.55));
  // switchboard on garage wall
  const sb = box(0.6, 0.85, 0.14, M.white, 3.55, 1.6, 3.12, 0.02); house.add(sb);
  const sbLed = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), M.signal.clone()); sbLed.position.set(3.75, 1.92, 3.2); house.add(sbLed);
  // EV charger
  const ev = box(0.34, 0.5, 0.14, M.white, 7.55, 1.3, 3.12, 0.05); house.add(ev);
  const evRing = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 40), M.signal.clone()); evRing.position.set(7.55, 1.36, 3.2); house.add(evRing);
  // wall sconces
  const lampMat = M.lamp;
  const lamps = [[-0.2, 2.4, 4.08], [2.0, 2.4, 4.08], [3.25, 2.5, 3.1], [7.95, 2.5, 3.1]].map(([x, y, z]) => { const l = box(0.12, 0.3, 0.1, lampMat, x, y, z, 0.02); house.add(l); return l; });
  const lampLights = lamps.map((l) => { const p = new THREE.PointLight(PALETTE.white, 0, 5, 1.6); p.position.copy(l.position).add(new THREE.Vector3(0, -0.2, 0.4)); scene.add(p); return p; });
  // solar array on upper roof
  const solar = new THREE.Group(); solar.position.set(0.4, 6.72, -0.6); house.add(solar);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const p = box(1.85, 0.05, 1.1, M.solar, -2.85 + c * 1.95, 0.12, -1.6 + r * 1.2); p.rotation.x = -0.12; solar.add(p);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.85, 0.05, 1.1)), new THREE.LineBasicMaterial({ color: 0x3a4250 })); frame.position.copy(p.position); frame.rotation.copy(p.rotation); solar.add(frame);
  }
  // trees
  const leaf = new THREE.MeshStandardMaterial({ color: 0x0f1213, roughness: 0.95 });
  const tree = (x, z, s) => { const t = new THREE.Group(); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.08 * s, 3.2 * s, 8), M.slab); trunk.position.y = 1.6 * s; t.add(trunk); const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.9 * s, 32, 20), leaf); c1.scale.set(1, 1.9, 1); c1.position.y = 3.4 * s; c1.castShadow = true; t.add(c1); t.position.set(x, 0.3, z); return t; };
  scene.add(tree(-9.2, -1.5, 1.25), tree(-10.6, -4.8, 1.0), tree(10.2, -5.2, 1.15));
  for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.34 + (i % 3) * 0.07, 24, 16), leaf); s.position.set(-7.4 + i * 0.62, 0.55, 5.6); s.castShadow = true; house.add(s); }

  // security cameras
  const signalCam = M.signal.clone();
  const cams = [
    { pos: [-6.5, 3.3, 4.05], yaw: 0.55, pitch: 0.55 },
    { pos: [8.1, 3.0, 2.95], yaw: -0.55, pitch: 0.5 },
    { pos: [-1.2, 3.3, 4.05], yaw: 0.05, pitch: 0.75 },
  ].map(({ pos, yaw, pitch }) => {
    const cam = securityCamera(M, signalCam); cam.position.set(...pos); cam.rotation.y = yaw; cam.userData.head.rotation.x = pitch; cam.scale.setScalar(1.25); house.add(cam);
    const cone = viewCone(6.0, 2.4); cam.userData.head.add(cone); cone.position.z = 0.2;
    cam.userData.cone = cone; cam.userData.baseYaw = yaw; return cam;
  });

  // cables — every device traces back to the one switchboard
  const cableMats = [];
  const mk = (pts, off) => { const m = cableMaterial(); m.uniforms.uOffset.value = off; cableMats.push(m); const c = cable(pts, m); house.add(c); return c; };
  const SB = [3.55, 1.6, 3.22];
  mk([SB, [3.55, 2.6, 3.24], [3.55, 3.15, 3.3], [6.5, 3.2, 3.2], [8.1, 3.05, 3.1]], 0.0);                 // garage camera
  mk([SB, [3.55, 1.0, 3.24], [5.0, 0.95, 3.2], [7.2, 1.0, 3.2], [7.5, 1.2, 3.2]], 0.3);                   // EV charger
  mk([SB, [3.3, 0.36, 3.6], [1.5, 0.36, 5.2], [-0.6, 0.36, 6.2], [-1.5, 0.36, 6.75], [-1.5, 1.2, 6.72]], 0.55); // intercom (underground run)
  mk([SB, [3.2, 2.5, 3.24], [2.6, 3.4, 4.2], [0.5, 3.45, 4.25], [-1.2, 3.35, 4.15]], 0.15);               // front camera
  mk([[-1.2, 3.42, 4.25], [-3.8, 3.5, 4.3], [-6.5, 3.4, 4.15]], 0.7);                                      // corner camera
  mk([SB, [3.0, 2.6, 3.24], [3.0, 4.2, 3.4], [3.6, 6.4, 3.2], [3.2, 6.7, 1.5], [2.0, 6.85, 0.6]], 0.85);   // solar
  mk([[2.6, 3.4, 4.2], [2.0, 2.9, 4.12], [2.0, 2.5, 4.12]], 0.4);
  mk([[0.5, 3.45, 4.25], [-0.2, 2.9, 4.12], [-0.2, 2.5, 4.12]], 0.2);

  // light
  scene.add(new THREE.HemisphereLight(0x8a96a8, 0x0a0b0d, 0.18));
  const moon = new THREE.DirectionalLight(0xb7c4d8, 1.6); moon.position.set(-14, 22, 10); moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 }); moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.02; scene.add(moon);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5); rim.position.set(16, 10, -14); scene.add(rim);
  const interior1 = new THREE.PointLight(PALETTE.warm, 1.4, 5, 1.8); interior1.position.set(-3.5, 0.5, 4.9); scene.add(interior1);
  const interior2 = new THREE.PointLight(PALETTE.warm, 0.0, 6, 1.6); interior2.position.set(0.2, 5.0, 4.2); scene.add(interior2);
  const gateGlow = new THREE.PointLight(PALETTE.signal, 0, 3, 2); gateGlow.position.set(-1.5, 1.5, 7.1); scene.add(gateGlow);

  // airborne dust catching the light
  const dustGeo = new THREE.BufferGeometry(); const N = 600; const dp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { dp[i * 3] = (Math.sin(i * 12.9898) * 43758.5 % 1) * 30 - 10; dp[i * 3 + 1] = Math.abs(Math.sin(i * 78.233) * 43758.5 % 1) * 9; dp[i * 3 + 2] = (Math.sin(i * 39.425) * 43758.5 % 1) * 24 - 6; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.35, depthWrite: false })); scene.add(dust);
  camera.fov = 26; camera.updateProjectionMatrix();
  const camHome = new THREE.Vector3(-21.5, 12.5, 31.5), target = new THREE.Vector3(-5.6, 3.4, 1.2);
  if (camera.aspect < 1) { camHome.set(-26, 16, 38); target.set(1.2, 3.4, 1.2); } // portrait: centre the house
  camera.position.copy(camHome); camera.lookAt(target);

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = (e.clientY / innerHeight) * 2 - 1; });

  return {
    update(t, armed) {
      const a = armed;
      cableMats.forEach((m) => { m.uniforms.uTime.value = t; m.uniforms.uOn.value = 0.25 + a * 0.75; });
      cams.forEach((c, i) => { c.userData.cone.material.uniforms.uOn.value = a; c.userData.cone.material.uniforms.uTime.value = t; c.rotation.y = c.userData.baseYaw + Math.sin(t * 0.6 + i * 1.7) * 0.22 * a; });
      signalCam.emissiveIntensity = 0.6 + a * 2.4 * (0.6 + 0.4 * Math.sin(t * 6));
      lampMat.emissiveIntensity = a * 1.4; lampLights.forEach((l) => (l.intensity = a * 2.2));
      intercomScreen.material.emissiveIntensity = 0.15 + a * 1.4; intercomBtn.material.emissiveIntensity = 0.2 + a * 2.5; gateGlow.intensity = a * 2.5;
      evRing.material.emissiveIntensity = 0.3 + a * 2.2; sbLed.material.emissiveIntensity = 1 + a * 2;
      dust.position.y = Math.sin(t * 0.2) * 0.3; dust.rotation.y = t * 0.01;
      pointer.sx += (pointer.x - pointer.sx) * 0.05; pointer.sy += (pointer.y - pointer.sy) * 0.05;
      camera.position.set(camHome.x + pointer.sx * 1.6, camHome.y - pointer.sy * 0.8, camHome.z);
      camera.lookAt(target);
    },
    stats(a) { return { cameras: Math.round(3 * a), zones: Math.round(4 * a) }; },
  };
}

/* =====================================================================
   CATEGORY ILLUSTRATIONS — studio product shots of each discipline
   ===================================================================== */
function studio(stage, { camPos, target, fov = 30 }) {
  const { scene, camera } = stage;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), groundMaterial()); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.6 })); sc.rotation.x = -Math.PI / 2; sc.position.y = 0.003; sc.receiveShadow = true; scene.add(sc);
  scene.fog = new THREE.Fog(PALETTE.bg, 8, 20);
  scene.add(new THREE.HemisphereLight(0x9aa4b4, 0x050506, 0.22));
  const key = new THREE.SpotLight(0xffffff, 38, 24, 0.5, 0.8, 1.4); key.position.set(-3.5, 7, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.target.position.copy(target); scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xc9d4ff, 0.9); rim.position.set(6, 5, -4); scene.add(rim);
  camera.fov = fov; camera.updateProjectionMatrix(); camera.position.copy(camPos); camera.lookAt(target);
}
// A wall "sample tile": the surface each device is mounted on.
function tile(scene, M, w = 3.2, h = 3.6) { const t = box(w, h, 0.3, M.graphite, 0, h / 2, -0.15); scene.add(t); scene.add(box(w + 0.2, 0.12, 0.6, M.slab, 0, 0.06, 0)); return t; }
function studioMats() { const M = mats(); M.white.color.set(0xd2cfc9); M.white.roughness = 0.5; return M; }

function buildCCTV(stage) {
  const { scene } = stage; const M = studioMats();
  studio(stage, { camPos: new THREE.Vector3(5.2, 2.9, 8.0), target: new THREE.Vector3(0.7, 1.5, 0.9) });
  tile(scene, M);
  const signal = M.signal.clone();
  const cam = securityCamera(M, signal); cam.scale.setScalar(2.6); cam.position.set(0, 2.6, 0); cam.rotation.y = 0.55; scene.add(cam);
  const head = cam.userData.head; head.rotation.x = 0.5;
  const cone = viewCone(2.6, 1.05); head.add(cone); cone.position.z = 0.2;
  // detection: a target zone on the floor with corner brackets
  const zone = new THREE.Group(); zone.position.set(1.6, 0.012, 2.6); zone.rotation.y = 0.55; scene.add(zone);
  const lm = new THREE.LineBasicMaterial({ color: PALETTE.signal, transparent: true });
  const L = 0.22, W = 0.55, D = 0.8; const corners = [[-W, -D, 1, 1], [W, -D, -1, 1], [W, D, -1, -1], [-W, D, 1, -1]];
  corners.forEach(([x, z, sx, sz]) => { zone.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x + sx * L, 0, z), new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 0, z + sz * L)]), lm)); });
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshBasicMaterial({ color: PALETTE.signal, transparent: true, opacity: 0.06 })); fill.rotation.x = -Math.PI / 2; zone.add(fill);
  return { update(t, a) { cone.material.uniforms.uOn.value = a * 0.9; cone.material.uniforms.uTime.value = t; signal.emissiveIntensity = 1.2 + Math.sin(t * 5) * 1.0; lm.opacity = 0.3 + 0.7 * a; head.rotation.y = Math.sin(t * 0.5) * 0.12; } };
}

function buildAlarm(stage) {
  const { scene } = stage; const M = studioMats();
  studio(stage, { camPos: new THREE.Vector3(3.9, 2.5, 7.4), target: new THREE.Vector3(0.25, 1.75, 0.4) });
  tile(scene, M, 3.6, 3.8);
  const kp = box(0.9, 1.25, 0.12, M.white, -0.7, 1.7, 0.06, 0.05); scene.add(kp);
  const lcd = box(0.66, 0.22, 0.02, M.signal.clone(), -0.7, 2.06, 0.13, 0.01); lcd.material.emissiveIntensity = 0.7; scene.add(lcd);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) scene.add(box(0.16, 0.11, 0.04, M.graphiteLight, -0.9 + c * 0.2, 1.82 - r * 0.17, 0.13, 0.015));
  const pir = new THREE.Group(); pir.position.set(0.95, 3.0, 0.12); scene.add(pir);
  pir.add(box(0.42, 0.6, 0.24, M.white, 0, 0, 0, 0.07));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xbfbcb6, roughness: 0.3 })); dome.rotation.x = Math.PI / 2; dome.position.set(0, -0.08, 0.12); pir.add(dome);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), M.signal); led.position.set(0.12, 0.2, 0.125); pir.add(led);
  // detection curtain: thin beams fanning down to the floor
  const beamMat = new THREE.LineBasicMaterial({ color: PALETTE.signal, transparent: true, opacity: 0.4 });
  for (let i = -7; i <= 7; i++) { const ang = i * 0.1; const end = new THREE.Vector3(0.95 + Math.sin(ang) * 3.4, 0.01, 0.12 + Math.cos(ang) * 3.4); scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.95, 2.92, 0.26), end]), beamMat)); }
  const zones = []; for (let i = 0; i < 4; i++) { const z = new THREE.Mesh(new THREE.RingGeometry(1.1 + i * 0.75, 1.12 + i * 0.75, 96, 1, Math.PI / 2 - 0.72, 1.44), new THREE.MeshBasicMaterial({ color: PALETTE.signal, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); z.rotation.x = -Math.PI / 2; z.position.set(0.95, 0.012, 0.12); scene.add(z); zones.push(z); }
  return { update(t, a) { beamMat.opacity = 0.12 + 0.4 * a; zones.forEach((z, i) => (z.material.opacity = a * (0.2 + 0.6 * Math.max(0, Math.sin(t * 2 - i * 0.8))))); M.signal.emissiveIntensity = 1 + 1.5 * a * (0.5 + 0.5 * Math.sin(t * 4)); } };
}

function buildAccess(stage) {
  const { scene } = stage; const M = studioMats();
  studio(stage, { camPos: new THREE.Vector3(4.4, 2.3, 7.4), target: new THREE.Vector3(-0.7, 1.3, 0) });
  const pillar = box(0.9, 2.6, 0.9, M.concrete, 0, 1.3, 0); scene.add(pillar);
  for (let i = 0; i < 14; i++) scene.add(box(0.16, 2.2, 0.09, M.graphite, -0.68 - i * 0.27, 1.2, -0.1));
  scene.add(box(4.0, 0.07, 0.12, M.darkMetal, -2.45, 2.32, -0.1));
  const panel = box(0.4, 0.78, 0.05, M.darkMetal, 0, 1.6, 0.47, 0.03); scene.add(panel);
  const lensI = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 16), M.lens); lensI.position.set(0, 1.88, 0.5); scene.add(lensI);
  const screen = box(0.28, 0.2, 0.01, M.signal.clone(), 0, 1.68, 0.5, 0.01); screen.material.emissiveIntensity = 0.45; scene.add(screen);
  const btn = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 10, 48), M.signal.clone()); btn.position.set(0, 1.42, 0.5); scene.add(btn);
  const reader = box(0.28, 0.4, 0.05, M.graphiteLight, 0, 0.98, 0.47, 0.03); scene.add(reader);
  const readerMark = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.06, 40), M.signal.clone()); readerMark.position.set(0, 0.98, 0.5); scene.add(readerMark);
  const fob = new THREE.Group(); fob.position.set(0.75, 1.05, 0.95); fob.rotation.set(0.15, -0.5, 0.3); scene.add(fob);
  fob.add(box(0.22, 0.32, 0.045, M.white, 0, 0, 0, 0.09));
  const fobDot = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), M.signal); fobDot.position.set(0, 0.08, 0.025); fob.add(fobDot);
  const arcs = []; for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.12 + i * 0.08, 0.005, 6, 48, Math.PI * 0.55), new THREE.MeshBasicMaterial({ color: PALETTE.signal, transparent: true })); r.position.set(0.32, 0.98, 0.62); r.rotation.set(0, -0.9, Math.PI * 0.72); scene.add(r); arcs.push(r); }
  return { update(t, a) { arcs.forEach((r, i) => (r.material.opacity = a * (0.35 + 0.65 * Math.max(0, Math.sin(t * 3 - i))))); btn.material.emissiveIntensity = 0.8 + a * 1.6; readerMark.material.emissiveIntensity = 1 + a * 2; fob.position.y = 1.05 + Math.sin(t * 1.2) * 0.04; } };
}

function buildPower(stage) {
  const { scene } = stage; const M = studioMats();
  studio(stage, { camPos: new THREE.Vector3(-2.8, 2.4, 7.4), target: new THREE.Vector3(0.6, 1.75, 0.2) });
  tile(scene, M, 4.4, 3.9);
  const enc = box(1.6, 2.2, 0.3, M.white, 0, 1.85, 0.15, 0.04); scene.add(enc);
  scene.add(box(1.42, 2.02, 0.04, M.darkMetal, 0, 1.85, 0.31));
  const hinge = new THREE.Group(); hinge.position.set(0.8, 1.85, 0.32); scene.add(hinge);
  const door = box(1.6, 2.2, 0.05, M.white, -0.8, 0, 0.025, 0.03); hinge.add(door); hinge.rotation.y = 1.95;
  const toggles = []; const breakerMat = new THREE.MeshStandardMaterial({ color: 0xd8d5cf, roughness: 0.5 });
  for (let r = 0; r < 2; r++) { scene.add(box(1.3, 0.05, 0.03, M.metal, 0, 2.38 - r * 0.8, 0.34)); for (let i = 0; i < 9; i++) { const x = -0.56 + i * 0.14, y = 2.38 - r * 0.8; scene.add(box(0.125, 0.44, 0.14, breakerMat, x, y, 0.4, 0.01)); const on = !(r === 1 && i > 6); const tg = box(0.05, 0.09, 0.05, i === 3 && r === 0 ? M.signal : M.graphiteLight, x, y + (on ? 0.04 : -0.04), 0.49, 0.01); scene.add(tg); toggles.push(tg); } }
  const mats2 = [];
  [[-0.5, 0], [0, 1], [0.5, 2]].forEach(([x, i]) => { const m = cableMaterial(); m.uniforms.uOffset.value = i * 0.33; m.uniforms.uSpeed.value = 0.45; mats2.push(m); scene.add(cable([[x, 2.95, 0.15], [x, 3.35, 0.2], [x * 1.6, 3.7, 0.25], [x * 3.2, 3.85, 0.25]], m, 0.03)); });
  const ev = box(0.5, 0.8, 0.2, M.white, 1.65, 1.4, 0.1, 0.1); scene.add(ev);
  const evRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.016, 10, 48), M.signal.clone()); evRing.position.set(1.65, 1.5, 0.21); scene.add(evRing);
  const evM = cableMaterial(); evM.uniforms.uOffset.value = 0.5; mats2.push(evM);
  scene.add(cable([[0.8, 1.2, 0.15], [1.1, 1.0, 0.12], [1.4, 1.05, 0.12], [1.5, 1.2, 0.12]], evM, 0.03));
  const plug = cableMaterial(); mats2.push(plug); scene.add(cable([[1.65, 1.0, 0.15], [1.7, 0.4, 0.4], [1.4, 0.04, 1.1], [0.4, 0.04, 1.9]], plug, 0.04));
  return { update(t, a) { mats2.forEach((m) => { m.uniforms.uTime.value = t; m.uniforms.uOn.value = a; }); evRing.material.emissiveIntensity = 1 + 1.6 * a * (0.5 + 0.5 * Math.sin(t * 2)); } };
}

/* =====================================================================
   QUOTE BACKGROUND — light mode. A suburban grid in pale clay; the
   properties CGF has wired are linked by orange service runs, and the
   letters CGF are laid out in tiny blocks in the foreground.
   ===================================================================== */
function buildQuote(stage) {
  const { scene, camera, renderer } = stage;
  const BONE = 0xedebe6;
  scene.background = new THREE.Color(BONE);
  scene.fog = new THREE.Fog(BONE, 28, 115);
  renderer.toneMappingExposure = 0.95;
  scene.environmentIntensity = 0.25;
  const clay = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.92 });
  const clay2 = new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.95 });
  const road = new THREE.MeshStandardMaterial({ color: 0xc9c5bd, roughness: 1 });
  const lit = new THREE.MeshBasicMaterial({ color: PALETTE.signal });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0xdcd8d0, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const BLOCK = 9, ST = 2.2;          // block size, street width
  const boxes = [], litBoxes = [];
  for (let bx = -8; bx <= 8; bx++) for (let bz = -14; bz <= 0; bz++) {
    const cx = bx * (BLOCK + ST), cz = bz * (BLOCK + ST) - 6;
    // road slabs around each block
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(BLOCK + ST, 0.04, ST), road); r1.position.set(cx, 0.02, cz + (BLOCK + ST) / 2); r1.receiveShadow = true; scene.add(r1);
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(ST, 0.04, BLOCK + ST), road); r2.position.set(cx + (BLOCK + ST) / 2, 0.02, cz); r2.receiveShadow = true; scene.add(r2);
    const cbd = Math.hypot(bx - 2, bz + 11) < 3.2;    // a cluster of towers in the distance
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      if (rnd() < 0.12) continue;
      if (Math.abs(cx - BLOCK / 2 + 1.5 + i * 3 + 1) < 18 && (cz - BLOCK / 2 + 2.3 + j * 4.5) > -13) continue;
      const w = 2.0 + rnd() * 0.6, d = 3.0 + rnd() * 0.8;
      const h = cbd ? 4 + rnd() * 14 : 0.7 + rnd() * (rnd() < 0.2 ? 2.2 : 1.0);
      const x = cx - BLOCK / 2 + 1.5 + i * 3, z = cz - BLOCK / 2 + 2.3 + j * 4.5;
      const wired = !cbd && rnd() < 0.16;
      (wired ? litBoxes : boxes).push([x, h, z, w, d]);
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const inst = (list, mat) => { const m = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D();
    list.forEach(([x, h, z, w, d], i) => { o.position.set(x, 0, z); o.scale.set(w, h, d); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  inst(boxes, clay); inst(litBoxes, clay2);
  // roof markers on wired homes
  const markGeo = new THREE.BoxGeometry(1, 0.08, 1); const marks = new THREE.InstancedMesh(markGeo, lit, litBoxes.length); const o = new THREE.Object3D();
  litBoxes.forEach(([x, h, z, w, d], i) => { o.position.set(x, h + 0.04, z); o.scale.set(w * 0.9, 1, d * 0.9); o.updateMatrix(); marks.setMatrixAt(i, o.matrix); }); scene.add(marks);

  // orange service runs along streets, joining wired homes
  const runMats = [];
  const runs = [
    [[-48, 0.12, -1.6], [-4, 0.12, -1.6], [-4, 0.12, -45], [30, 0.12, -45], [30, 0.12, -100]],
    [[50, 0.12, -12.8], [7, 0.12, -12.8], [7, 0.12, -67], [-41, 0.12, -67], [-41, 0.12, -130]],
    [[-26, 0.12, 9.6], [-26, 0.12, -34], [18, 0.12, -34], [18, 0.12, -90]],
  ];
  runs.forEach((pts, i) => { const m = cableMaterial(); m.uniforms.uOffset.value = i * 0.3; m.uniforms.uSpeed.value = 0.25; runMats.push(m);
    const curve = new THREE.CurvePath(); for (let k = 0; k < pts.length - 1; k++) curve.add(new THREE.LineCurve3(new THREE.Vector3(...pts[k]), new THREE.Vector3(...pts[k + 1])));
    m.fragmentShader = m.fragmentShader.replace('vec3 col = base + uColor*(0.18*uOn + pulse*3.2*uOn);', 'vec3 col = uColor*(0.85 + pulse*1.6);'); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.2, 8, false), m); scene.add(tube); });

  // CGF in pixel blocks, foreground
  const F = { C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'], G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'], F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'] };
  const cell = 1.9, tiles = [];
  ['C', 'G', 'F'].forEach((L, li) => F[L].forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch !== '#') return;
    const x0 = (li * 6 + c - 8) * cell, z0 = -9 + r * cell;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) tiles.push([x0 + (a - 1) * cell / 3, 0.3 + rnd() * 0.9, z0 + (b - 1) * cell / 3, cell / 3 * 0.82, cell / 3 * 0.82]);
  })));
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xf7f6f3, roughness: 0.8 });
  inst(tiles, tileMat);
  const tileGlow = new THREE.InstancedMesh(markGeo, lit, tiles.length);
  tiles.forEach(([x, h, z, w, d], i) => { const on = rnd() < 0.38; o.position.set(x, h + 0.04, z); o.scale.set(on ? w : 0.0001, 1, on ? d : 0.0001); o.updateMatrix(); tileGlow.setMatrixAt(i, o.matrix); }); scene.add(tileGlow);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbdb8ae, 0.75));
  const sun = new THREE.DirectionalLight(0xfff4e8, 1.9); sun.position.set(-30, 40, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 160 }); sun.shadow.bias = -0.0005; sun.target.position.set(0, 0, -30); scene.add(sun, sun.target);

  camera.fov = 38; camera.updateProjectionMatrix();
  camera.position.set(8, 34, 30); camera.lookAt(-1, 0, -20);
  return { update(t, a) { runMats.forEach((m) => { m.uniforms.uTime.value = t; m.uniforms.uOn.value = 1; });  } };
}

const BUILDERS = { quote: buildQuote, hero: buildHero, cctv: buildCCTV, alarm: buildAlarm, access: buildAccess, power: buildPower };

export function mountScene(container, { scene: name = 'hero', still = false, armed = 1, t = 2, transparent = false } = {}) {
  const stage = makeStage(container, { transparent, bloom: name === 'hero' ? [1.05, 0.7, 0.62] : name === 'quote' ? [0.35, 0.4, 0.95] : [0.7, 0.5, 0.85] });
  const ctl = BUILDERS[name](stage);
  let armedTarget = armed, armedNow = armed, time = t;
  const frame = () => { ctl.update(time, armedNow); stage.composer.render(); };
  if (still) {
    for (let i = 0; i < 3; i++) frame();
    window.__ready = true;
  } else {
    const clock = new THREE.Clock();
    const loop = () => { time += clock.getDelta(); armedNow += (armedTarget - armedNow) * 0.06; frame(); requestAnimationFrame(loop); };
    loop(); window.__ready = true;
  }
  return {
    setArmed(v) { armedTarget = v; },
    get armed() { return armedNow; },
    stats: () => (ctl.stats ? ctl.stats(armedNow) : {}),
    renderAt(tt, aa) { time = tt; armedNow = aa; frame(); },
  };
}
