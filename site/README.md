# CGF Security & Electrical — homepage (concept build)

Static site, no build step. Open with any static server:

    node ../serve.mjs 4173     # then http://localhost:4173

- `index.html` — all sections, SEO metadata, LocalBusiness + FAQPage structured data
- `styles.css` — dark theme, one accent (#FF5B2E); the quote section is the only light surface
- `main.js` — Lenis smooth scroll, GSAP ScrollTrigger (pinned "How it's wired"), unified nav dropdown, hold-to-arm hero, service-area map, 3-step quote form
- `scenes.js` — Three.js scenes built from primitives (hero, cctv, alarm, access, power, quote)
- `assets/3d` — still renders used as posters/fallbacks (reduced motion, no WebGL)
- `assets/team` — CGF's own photo shoot
- `assets/sydney-dots.svg` — dot map generated from NSW LGA boundaries (Geoscape / data.gov.au, CC BY 4.0)

Before launch: connect the quote form submit (see `TODO(build)` in main.js) to CGF's enquiry endpoint,
and swap paraphrased review text for the exact Google wording.
