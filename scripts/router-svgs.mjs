// Draw Vyre's flat assets in code: a topographic texture (marching squares over value noise),
// the logo mark and a few partner wordmarks. usage: node scripts/router-svgs.mjs
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const out = new URL('../concepts/router/assets/svg/', import.meta.url).pathname;

// value noise
let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const G = 64, grid = Array.from({ length: G * G }, rnd);
const sm = (t) => t * t * (3 - 2 * t);
const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi); const g = (a, b) => grid[((b % G + G) % G) * G + ((a % G + G) % G)];
  return g(xi, yi) * (1 - xf) * (1 - yf) + g(xi + 1, yi) * xf * (1 - yf) + g(xi, yi + 1) * (1 - xf) * yf + g(xi + 1, yi + 1) * xf * yf; };
const fbm = (x, y) => vn(x, y) * 0.55 + vn(x * 2.1, y * 2.1) * 0.28 + vn(x * 4.3, y * 4.3) * 0.17;

function topo(W, H, step, levels, stroke, opacity, scale) {
  const nx = Math.ceil(W / step) + 1, ny = Math.ceil(H / step) + 1, f = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f.push(fbm(i * step / scale, j * step / scale));
  const paths = [];
  for (let L = 0; L < levels; L++) {
    const iso = 0.2 + (L / levels) * 0.6; let d = '';
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = f[j * nx + i], b = f[j * nx + i + 1], c = f[(j + 1) * nx + i + 1], e = f[(j + 1) * nx + i];
      const x = i * step, y = j * step, pts = [];
      const lerp = (p, q, t) => p + (q - p) * t;
      if ((a < iso) !== (b < iso)) pts.push([lerp(x, x + step, (iso - a) / (b - a)), y]);
      if ((b < iso) !== (c < iso)) pts.push([x + step, lerp(y, y + step, (iso - b) / (c - b))]);
      if ((e < iso) !== (c < iso)) pts.push([lerp(x, x + step, (iso - e) / (c - e)), y + step]);
      if ((a < iso) !== (e < iso)) pts.push([x, lerp(y, y + step, (iso - a) / (e - a))]);
      if (pts.length >= 2) d += `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}L${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)}`;
      if (pts.length === 4) d += `M${pts[2][0].toFixed(1)} ${pts[2][1].toFixed(1)}L${pts[3][0].toFixed(1)} ${pts[3][1].toFixed(1)}`;
    }
    paths.push(`<path d="${d}" stroke-width="${L % 4 === 0 ? 1.4 : 0.8}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-linecap="round">${paths.join('')}</g></svg>`;
}
const topoLight = topo(1400, 900, 6, 22, '#8C7F6A', 0.42, 260);
const topoDark = topo(1400, 900, 6, 22, '#7C7BFF', 0.28, 260);
writeFileSync(out + 'topo-light.svg', topoLight); writeFileSync(out + 'topo-dark.svg', topoDark);
await sharp(Buffer.from(topoLight)).png().toFile(out + 'topo-light.png');
await sharp(Buffer.from(topoDark)).png().toFile(out + 'topo-dark.png');

// logo mark: the top of the router seen from above, the light line crossing it
const mark = (c = '#0B0A10', a = '#3D38FF') => `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="11.5" fill="none" stroke="${c}" stroke-width="2.4"/><circle cx="14" cy="14" r="6.2" fill="none" stroke="${a}" stroke-width="2"/><rect x="12.9" y="1" width="2.2" height="26" rx="1.1" fill="${c}"/></svg>`;
writeFileSync(out + 'mark.svg', mark()); writeFileSync(out + 'mark-light.svg', mark('#FFFFFF', '#7C7BFF'));
console.log('ok');
