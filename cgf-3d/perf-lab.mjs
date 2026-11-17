// Lab check modelled on PageSpeed mobile: 412x823, 4x CPU throttle, slow 4G (1.6 Mbps, 150 ms RTT),
// software WebGL, no interaction.
// Usage: node perf-lab.mjs [url] [runs]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4190/'; const runs = +(process.argv[3] || 3);
const out = [];
for (let i = 0; i < runs; i++) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await p.addInitScript(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ type: 'longtask', buffered: true });
    window.__lcp = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__lcp = e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true }); });
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(8000);
  out.push(await p.evaluate(() => ({ tbt: Math.round(window.__lt.reduce((a, d) => a + Math.max(0, d - 50), 0)), longest: Math.round(Math.max(0, ...window.__lt)), lcp: Math.round(window.__lcp), canvases: document.querySelectorAll('canvas').length,
    js: Math.round(performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.js')).reduce((a, e) => a + e.transferSize, 0) / 1024) + 'KB',
    img: Math.round(performance.getEntriesByType('resource').filter((e) => /\.(jpg|webp|png|svg)/.test(e.name)).reduce((a, e) => a + e.transferSize, 0) / 1024) + 'KB' })));
  await b.close();
}
const med = (k) => out.map((o) => o[k]).sort((a, b) => a - b)[Math.floor(out.length / 2)];
console.log(JSON.stringify(out)); console.log('median TBT', med('tbt'), 'ms · median LCP', med('lcp'), 'ms');
