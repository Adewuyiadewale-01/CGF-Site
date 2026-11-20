// Place the rendered Vyre One into the dusk living-room photo: glow, contact shadow, router, bloom.
// usage: node scripts/router-composite.mjs  -> concepts/router/assets/photos/living-dusk-vyre.jpg
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const dir = new URL('../concepts/router/assets/', import.meta.url).pathname;
const SRC = dir + 'photos/living-dusk.png', OUT = dir + 'photos/living-dusk-vyre.jpg';
const UP = 2;                          // work at 2x so the router edge stays clean, then keep 2x for retina
const cx = 470 * UP, base = 443 * UP, h = 60 * UP;
const meta = await sharp(SRC).metadata(), W = meta.width * UP, H = meta.height * UP;
const photo = await sharp(SRC).resize(W, H, { kernel: 'lanczos3' }).toBuffer();
const router = await sharp(dir + 'place.png').resize({ height: h }).blur(0.6).toBuffer();
const rm = await sharp(router).metadata(), rw = rm.width;
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`);
const glow = svg(`<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#4A46FF" stop-opacity=".55"/><stop offset=".45" stop-color="#3D38FF" stop-opacity=".18"/><stop offset="1" stop-color="#3D38FF" stop-opacity="0"/></radialGradient>
  <radialGradient id="p" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#5A57FF" stop-opacity=".7"/><stop offset="1" stop-color="#3D38FF" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="${cx}" cy="${base - h * 0.55}" rx="${150 * UP}" ry="${120 * UP}" fill="url(#g)"/>
  <ellipse cx="${cx}" cy="${base + 2 * UP}" rx="${44 * UP}" ry="${9 * UP}" fill="url(#p)"/>`);
const shadow = svg(`<defs><filter id="b"><feGaussianBlur stdDeviation="${2.2 * UP}"/></filter></defs><ellipse cx="${cx + 2 * UP}" cy="${base}" rx="${rw / 2 + 3 * UP}" ry="${3 * UP}" fill="#000" opacity=".75" filter="url(#b)"/>`);
// a narrow vertical bloom along the light line (the line sits right of centre on the render)
const slitX = cx - rw / 2 + rw * 0.66;
const bloom = svg(`<defs><filter id="f"><feGaussianBlur stdDeviation="${3 * UP}"/></filter></defs><rect x="${slitX - 2 * UP}" y="${base - h * 0.86}" width="${4 * UP}" height="${h * 0.7}" fill="#6F6CFF" opacity=".75" filter="url(#f)"/>`);
// fine grain over the router so it shares the photo's texture
const grain = Buffer.alloc(rw * h * 4); for (let i = 0; i < rw * h; i++) { const v = 128 + (Math.random() - 0.5) * 26; grain[i * 4] = grain[i * 4 + 1] = grain[i * 4 + 2] = v; grain[i * 4 + 3] = 40; }
const grained = await sharp(router).composite([{ input: grain, raw: { width: rw, height: h, channels: 4 }, blend: 'soft-light' }, { input: router, blend: 'dest-in' }]).png().toBuffer();
await sharp(photo).composite([
  { input: glow, blend: 'screen' },
  { input: shadow, blend: 'multiply' },
  { input: grained, left: Math.round(cx - rw / 2), top: Math.round(base - h) },
  { input: bloom, blend: 'screen' },
]).jpeg({ quality: 90, mozjpeg: true }).toFile(OUT);
console.log('wrote', OUT, W, H);
