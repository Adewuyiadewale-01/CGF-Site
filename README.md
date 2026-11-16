# CGF Security & Electrical — homepage redesign (concept)

A redesign of the cgfsecurityandelectrical.com.au homepage: dark, one accent colour, real-time 3D built from code (no stock models, no AI imagery), and copy written for Sydney search intent.

## Run it

```bash
node serve.mjs 4173
```

Then open http://localhost:4173. The site is static: no build step.

## What's here

| Folder | What it is |
| --- | --- |
| `site/` | The website: `index.html`, `styles.css`, `main.js`, `scenes.js`, `assets/` |
| `cgf-3d/` | 3D scene workbench: render any scene to a still with Playwright (`node render.mjs hero:1:2.2:1440:900`) |
| `map/` | `build_map.py` turns NSW council boundaries into the dotted Sydney map (`site/assets/sydney-dots.svg`) |
| `serve.mjs` | Tiny static server for local preview |

## Highlights

- **Hero:** live Three.js house; press and hold to arm it (power pulses, cameras sweep, counters climb).
- **How it's wired:** one continuous 3D scene pinned on scroll; the camera flies between five stations that assemble as it arrives.
- **Unified nav:** one dropdown panel that morphs between Security, Electrical and Company; full-screen accordion on phones.
- **Service areas:** real dotted map; hover a region or row to highlight it.
- **Who we work with:** hover a property type to see a real CGF job photo; phones get inline thumbnails.
- **Reviews:** ten real Google reviews (verbatim excerpts) in two columns drifting in opposite directions; pauses on hover.
- **Get a quote:** the only light section, sliding over the map, on a light 3D city scene; 3-step form with validation.
- Reduced-motion and no-WebGL visitors get rendered stills instead of live 3D.

## Before launch

- Connect the quote form (`TODO(build)` in `site/main.js`) to CGF's enquiry endpoint.
- Confirm CGF is happy to show the client reviews and team/job photos on the new site.

## Credits

- Map data: NSW LGA boundaries, Geoscape Administrative Boundaries via data.gov.au (CC BY 4.0). Rebuild with the GeoJSON from `https://ahdap-public-data.s3.ap-southeast-2.amazonaws.com/CityData/LGAs_Sydney_and_surrounds.json` saved as `map/lgas.json`.
- Team and job photos: CGF Security & Electrical's own photos (from their current site).
- Brand logos (Dahua, Ajax, Bosch, Vimar, Akuvox, Inner Range): trademarks of their owners, taken from each brand's own site or Wikimedia Commons and shown in mono.
- Libraries (CDN): three.js r170, GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.18.
