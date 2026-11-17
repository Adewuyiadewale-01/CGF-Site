// Responsive WebP versions of the 3D stills at several widths, next to the originals.
// (At equal visual quality WebP came out smaller than AVIF for these dark renders.)
// Run after changing a render: node scripts/images.mjs
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
const dir = 'public/assets/3d';
const widths = [640, 960, 1440, 2160];
for (const f of (await readdir(dir)).filter((n) => /^[a-z0-9.-]+\.jpg$/.test(n) && !/-\d+\.jpg$/.test(n))) {
  const base = f.replace(/\.jpg$/, ''), src = sharp(`${dir}/${f}`);
  const { width } = await src.metadata();
  for (const w of widths.filter((x) => x <= width)) {
    await sharp(`${dir}/${f}`).resize(w).webp({ quality: 88 }).toFile(`${dir}/${base}-${w}.webp`);
  }
  console.log(f, width, '->', widths.filter((x) => x <= width).join(', '));
}
