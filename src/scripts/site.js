// CGF site — shared interaction layer (smooth scroll, nav, mobile menu). Runs on every page.
// Three.js scenes (scenes.js) + GSAP ScrollTrigger + Lenis. Everything degrades to the
// rendered stills when WebGL is unavailable or the visitor prefers reduced motion.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => matchMedia('(max-width: 860px)').matches;
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const live3D = hasGL && !reduce;
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
gsap.registerPlugin(ScrollTrigger);

/* ---------- smooth scroll ---------- */
let lenis = null;
// Smooth scrolling is for mouse wheels only; touch devices keep native scrolling (and momentum).
if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToHash = (hash) => { const el = hash && hash.length > 1 && document.getElementById(hash.slice(1)); if (!el) return false; lenis ? lenis.scrollTo(el, { offset: -70 }) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return true; };
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"], a[href^="/#"]'); if (!a) return;
  const href = a.getAttribute('href');
  if (href.startsWith('/#') && location.pathname !== '/') return; // another page: let the browser go to the homepage section
  if (scrollToHash(href.replace(/^\//, ''))) { e.preventDefault(); closeDrop(); closeMobile(); }
});

/* ---------- nav: one shared dropdown ---------- */
const nav = $('#nav'), drop = $('#drop'), stage = $('.drop__stage', drop);
const triggers = $$('.links__btn[data-menu]');
let openKey = null, hoverT = null, leaveT = null;
function placeDrop(key) {
  const btn = triggers.find((b) => b.dataset.menu === key), menu = $(`.drop__menu[data-menu="${key}"]`);
  $$('.drop__menu', drop).forEach((m) => m.classList.toggle('is-on', m === menu));
  const w = menu.offsetWidth, h = menu.offsetHeight;
  const navBox = nav.querySelector('.nav__in').getBoundingClientRect(), b = btn.getBoundingClientRect();
  const left = Math.max(16, Math.min(window.innerWidth - w - 16, b.left + b.width / 2 - 200));
  drop.style.width = w + 'px'; drop.style.height = h + 'px'; drop.style.left = left + 'px';
  drop.style.top = (navBox.bottom + 10) + 'px'; drop.style.position = 'fixed';
}
function openDrop(key) {
  clearTimeout(leaveT);
  if (openKey === key) return;
  const wasOpen = !!openKey;
  openKey = key;
  triggers.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.menu === key)));
  if (!wasOpen) { drop.style.transition = 'none'; placeDrop(key); drop.offsetHeight; drop.style.transition = ''; drop.hidden = false; }
  else placeDrop(key);
  nav.classList.remove('is-hidden');
}
function closeDrop() { clearTimeout(hoverT); if (!openKey) return; openKey = null; drop.hidden = true; triggers.forEach((b) => b.setAttribute('aria-expanded', 'false')); }
triggers.forEach((btn) => {
  btn.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; clearTimeout(hoverT); hoverT = setTimeout(() => openDrop(btn.dataset.menu), openKey ? 0 : 120); });
  btn.addEventListener('pointerleave', () => { clearTimeout(hoverT); leaveT = setTimeout(closeDrop, 220); });
  btn.addEventListener('click', () => (openKey === btn.dataset.menu ? closeDrop() : openDrop(btn.dataset.menu)));
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); openDrop(btn.dataset.menu); $(`.drop__menu[data-menu="${btn.dataset.menu}"] a`)?.focus(); } });
});
drop.addEventListener('pointerenter', () => clearTimeout(leaveT));
drop.addEventListener('pointerleave', () => { leaveT = setTimeout(closeDrop, 220); });
drop.addEventListener('keydown', (e) => {
  const items = $$('.drop__menu.is-on a', drop), i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openKey) { const k = openKey; closeDrop(); triggers.find((b) => b.dataset.menu === k)?.focus(); } });
document.addEventListener('pointerdown', (e) => { if (openKey && !e.target.closest('.drop, .links')) closeDrop(); });
window.addEventListener('resize', () => openKey && placeDrop(openKey));

// solid after the hero; hide on scroll down, show on scroll up
let lastY = 0;
const onScroll = (y) => {
  const heroH = $('.hero')?.offsetHeight ?? 160;
  nav.dataset.state = y > Math.min(heroH * 0.5, 420) ? 'solid' : 'top';
  if (!openKey && !document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > heroH && y > lastY + 2);
  if (y < lastY - 2) nav.classList.remove('is-hidden');
  lastY = y;
  if (openKey) placeDrop(openKey);
};
lenis ? lenis.on('scroll', ({ scroll }) => onScroll(scroll)) : window.addEventListener('scroll', () => onScroll(scrollY), { passive: true });

/* ---------- mobile menu ---------- */
const mm = $('#mobile-menu'), burger = $('.nav__burger');
function openMobile() { mm.hidden = false; burger.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); lenis?.stop(); $('.mmenu__x', mm).focus(); }
function closeMobile() { if (mm.hidden) return; mm.hidden = true; burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); lenis?.start(); }
burger.addEventListener('click', openMobile);
$('.mmenu__x', mm).addEventListener('click', () => { closeMobile(); burger.focus(); });
mm.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMobile(); burger.focus(); } });


export { $, $$, reduce, mobile, hasGL, live3D, gsap, ScrollTrigger, lenis, closeDrop, closeMobile, scrollToHash };
