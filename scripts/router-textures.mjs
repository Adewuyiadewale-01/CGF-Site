// Vyre's background textures, drawn in code: wood grain, dark sawtooth, brush strokes, sand waves.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const out = new URL('../concepts/router/assets/tex/', import.meta.url).pathname;
import { mkdirSync } from 'node:fs'; mkdirSync(out, { recursive: true });

let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const G = 256, grid = Array.from({ length: G * G }, rnd), sm = (t) => t * t * (3 - 2 * t);
const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi), g = (a, b) => grid[((b % G + G) % G) * G + ((a % G + G) % G)];
  return g(xi, yi) * (1 - xf) * (1 - yf) + g(xi + 1, yi) * xf * (1 - yf) + g(xi, yi + 1) * (1 - xf) * yf + g(xi + 1, yi + 1) * xf * yf; };
const fbm = (x, y, o = 5) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { v += a * vn(x * f, y * f); f *= 2.03; a *= 0.5; } return v; };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
async function make(name, w, h, fn) {
  const buf = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y); const k = (y * w + x) * 3; buf[k] = c[0]; buf[k + 1] = c[1]; buf[k + 2] = c[2]; }
  await sharp(buf, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 88, mozjpeg: true }).toFile(out + name + '.jpg');
  console.log('wrote', name);
}
// 1. wood grain: warped bands, cream to apricot, a little grain
{ const A = hex('#F6EBDD'), B = hex('#F0D3AE'), C = hex('#EBC596');
  await make('wood', 1400, 560, (x, y) => { const u = x / 420, v = y / 420; const w = fbm(u * 0.9, v * 0.9) * 6 + fbm(u * 3, v * 3) * 0.8; const band = 0.5 + 0.5 * Math.sin((v * 7 + w * 2.2 + u * 0.6) * Math.PI);
    const line = Math.pow(band, 9), soft = Math.pow(band, 2.4); let c = mix(A, B, soft * 0.75); c = mix(c, C, line * 0.55); const n = (rnd() - 0.5) * 6; return c.map((q) => q + n); }); }
// 2. dark sawtooth: stepped diagonal strokes fading to the right
{ const A = hex('#262322'), B = hex('#3B3633');
  await make('saw', 1400, 600, (x, y) => { const k = (x + y * 0.55) / 34, f = k - Math.floor(k), step = Math.floor((y + Math.floor(k) * 9) / 26) % 2; const on = f < 0.42 + 0.12 * step ? 1 : 0;
    const fade = Math.max(0, 1 - x / 1000) * (0.35 + 0.65 * fbm(x / 220, y / 220)); const n = (rnd() - 0.5) * 4; return mix(A, B, on * fade).map((q) => q + n); }); }
// 3. brush strokes: big soft swirls of grey on off-white
{ const A = hex('#F3F3EF'), B = hex('#E3E2DC');
  await make('brush', 1400, 1000, (x, y) => { const u = x / 700, v = y / 700; const w = fbm(u * 0.8 + 3, v * 0.8, 4) * 3; const s = 0.5 + 0.5 * Math.sin((u * 1.2 - v * 1.6 + w) * Math.PI * 1.4);
    const fibre = 0.5 + 0.5 * Math.sin((u * 1.2 - v * 1.6 + w) * Math.PI * 60 + fbm(u * 8, v * 8) * 6); const t = Math.pow(s, 3) * (0.5 + 0.5 * fibre) * 0.9; const n = (rnd() - 0.5) * 3; return mix(A, B, t).map((q) => q + n); }); }
// 4. sand waves: fine wavy lines on beige, like raked sand
{ const A = hex('#EEE9DD'), B = hex('#DCD3BF');
  await make('sand', 1400, 700, (x, y) => { const u = x / 500, v = y / 500; const w = fbm(u * 1.2, v * 1.2, 4) * 2.2; const l = 0.5 + 0.5 * Math.sin((v * 140 + w * 22 + Math.sin(u * 3) * 4)); const t = Math.pow(l, 6) * (0.45 + 0.55 * fbm(u * 2, v * 2)); const n = (rnd() - 0.5) * 4; return mix(A, B, t).map((q) => q + n); }); }
