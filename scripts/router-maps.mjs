// Draw Vyre's home maps for Figma and the site's fallbacks: light map with a route, dark map,
// and the dark map with the coverage field. usage: node scripts/router-maps.mjs
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mapSVG, LIGHT, DARK, routeFor, fieldFor, paintField, AP, W, H } from '../concepts/router/map.js';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const out = new URL('../concepts/router/assets/map/', import.meta.url).pathname;
import { mkdirSync } from 'node:fs'; mkdirSync(out, { recursive: true });

const light = mapSVG(LIGHT, { route: routeFor('mac') }), lightBare = mapSVG(LIGHT, { marina: false }), dark = mapSVG(DARK);
writeFileSync(out + 'map-light.svg', lightBare); writeFileSync(out + 'map-light-route.svg', light); writeFileSync(out + 'map-dark.svg', dark);
await sharp(Buffer.from(light), { density: 144 }).jpeg({ quality: 90 }).toFile(out + 'map-light.jpg');

const gw = 200, gh = 125;
const a = fieldFor(AP.router, { gw, gh }), b = fieldFor(AP.mini, { gw, gh, power: 0.8 });
for (const [m, name] of [[1, 'heat-on'], [0, 'heat-off']]) {
  const rgba = paintField(a, b, m, new Uint8ClampedArray(gw * gh * 4), { gw, gh });
  const heat = await sharp(Buffer.from(rgba), { raw: { width: gw, height: gh, channels: 4 } }).resize(W * 2, H * 2, { kernel: 'cubic' }).blur(10).png().toBuffer();
  writeFileSync(out + name + '.png', heat);
  await sharp(Buffer.from(dark), { density: 144 }).composite([{ input: heat, blend: 'screen' }]).jpeg({ quality: 90 }).toFile(out + 'map-dark-' + name + '.jpg');
}
console.log('ok');
