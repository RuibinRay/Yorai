import { BRAND, CHAPTERS } from '../data/content.js?v=4';
import * as settings from './settings.js?v=4';
import { renderMenu } from './menu.js?v=4';
import { renderCollection } from './collection.js?v=4';
import { renderStory } from './story.js?v=4';
import { renderOrigins } from './origins.js?v=4';
import { renderContact } from './contact.js?v=4';
import { closeDialog, staggerReveals } from './ui.js?v=4';
import { initLook } from './look.js?v=4';

const $ = (s, r = document) => r.querySelector(s);
const html = document.documentElement;

/* ------------------------------------------------------------------ */
/* Motion: calm state is the app's own, gated on the OS only in 'auto'  */
/* ------------------------------------------------------------------ */
const state = {
  calm: settings.isCalm(),
  tier: settings.explicitTier() || 'auto',
  tierReason: settings.explicitTier() ? 'explicit ?tier=' : 'auto',
  fps: null,
  gpu: null,
  jt: 0,
  chapter: 0,
  live: false,
  look: settings.look(),     // anime | pastel | manga | film
  detail: settings.detail(), // auto | high | balanced | light
};
const listeners = new Set();
export function onState(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn(state)); }

function applyCalm() {
  state.calm = settings.isCalm();
  html.classList.toggle('is-calm', state.calm);
  const btn = $('#motionToggle');
  btn.setAttribute('aria-pressed', String(!state.calm));
  btn.title = state.calm ? 'Motion is off. Turn it on.' : 'Motion is on. Turn it off.';
  const notice = $('#motionNotice');
  const showNotice = state.calm && settings.motionSetting() === 'auto' && !settings.get('noticeDismissed', false);
  notice.hidden = !showNotice;
  emit();
}
$('#motionToggle').addEventListener('click', () => {
  settings.set('motion', state.calm ? 'full' : 'calm');
  settings.set('noticeDismissed', true);
  applyCalm();
});
$('#motionOn').addEventListener('click', () => { settings.set('motion', 'full'); settings.set('noticeDismissed', true); applyCalm(); });
$('#motionKeep').addEventListener('click', () => { settings.set('noticeDismissed', true); applyCalm(); });
settings.reduceQuery.addEventListener?.('change', applyCalm);
applyCalm();

/* ------------------------------------------------------------------ */
/* Header: paper/dark by the section under it; current link            */
/* ------------------------------------------------------------------ */
const hdr = $('#hdr');
const navLinks = [...document.querySelectorAll('.hdr__nav a')];
/* The section under the header band is the first, in page order, of those touching it. Tracking the whole
 * set (not just the latest entry) keeps this right even when the page was laid out while hidden. */
const sections = [...document.querySelectorAll('main > section')];
const onBand = new Set();
const sectionObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) onBand.add(e.target); else onBand.delete(e.target); });
  const cur = sections.find((sec) => onBand.has(sec));
  if (!cur) return;
  hdr.classList.toggle('is-paper', cur.classList.contains('sec--paper'));
  navLinks.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + cur.id ? 'true' : 'false'));
}, { rootMargin: '-10% 0px -85% 0px' });
sections.forEach((sec) => sectionObs.observe(sec));

/* Mobile nav sheet */
const sheet = $('#navSheet');
$('#menuOpen').addEventListener('click', () => sheet.showModal());
$('#menuClose').addEventListener('click', () => closeDialog(sheet));
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeDialog(sheet); });
sheet.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => sheet.close()));


/* ------------------------------------------------------------------ */
/* Journey DOM: copy blocks in the pinned stage, spacers for length     */
/* ------------------------------------------------------------------ */
const copies = $('#copies');
const spaces = $('#spaces');
const rail = $('#rail');
const hero = $('#hero');
const jr = $('#journey');
const stage = $('#stage');
const stills = [...document.querySelectorAll('.jr__still-ch')];

CHAPTERS.forEach((c, i) => {
  if (i > 0) {
    const el = document.createElement('div');
    el.className = 'jr__copy';
    el.id = 'chapter-' + c.key;
    el.dataset.chapter = i;
    el.innerHTML = `<p class="kicker">${c.kicker}</p><h2>${c.title}</h2><p>${c.text}</p><span class="jr__note">${c.note}</span><div class="jr__rule" aria-hidden="true"></div>`;
    copies.appendChild(el);
  }
  const sp = document.createElement('div');
  sp.className = 'jr__space jr__space--' + c.key;
  sp.style.setProperty('--len', c.length);
  if (i === 0) sp.id = 'chapter-' + c.key;
  spaces.appendChild(sp);
  const a = document.createElement('a');
  a.href = '#chapter-' + c.key;
  a.style.setProperty('--i', i);
  a.innerHTML = `<i aria-hidden="true"></i><span>${c.kicker}</span>`;
  a.addEventListener('click', (e) => { e.preventDefault(); scrollToChapter(i); });
  rail.appendChild(a);
});
const copyEls = [hero, ...copies.children];
const railLinks = [...rail.children];
const spaceEls = [...spaces.children];

function chapterStart(i) { let y = 0; for (let k = 0; k < i; k++) y += spaceEls[k].offsetHeight; return jr.offsetTop + y; }
function scrollToChapter(i) {
  window.scrollTo({ top: chapterStart(i) + 8, behavior: state.calm ? 'instant' : 'smooth' });
}

/* The driver: one read of scrollY per frame, --jt on the stage, --pn on each copy block.
 * Scroll events are coalesced into one write per animation frame. */
export function jtFromY(y) {
  let jt = 0, acc = 0;
  for (let i = 0; i < spaceEls.length; i++) {
    const len = spaceEls[i].offsetHeight;
    if (y < acc + len) { jt = i + (y - acc) / len; break; }
    acc += len; jt = i + 1;
  }
  return Math.max(0, Math.min(spaceEls.length, jt));
}
let lastY = -1;
function drive() {
  const y = window.scrollY - jr.offsetTop;
  if (y === lastY) return;
  lastY = y;
  const jt = jtFromY(y);
  const chapter = Math.min(spaceEls.length - 1, Math.floor(jt));
  state.jt = jt;
  stage.style.setProperty('--jt', jt.toFixed(4));
  copyEls.forEach((el, i) => {
    const pn = Math.max(0, Math.min(1, jt - i));
    el.style.setProperty('--pn', pn.toFixed(4));
    const near = Math.abs(jt - i - 0.5) < 1.1;
    el.classList.toggle('is-near', near);
    el.classList.toggle('is-current', chapter === i);
  });
  if (chapter !== state.chapter) {
    state.chapter = chapter;
    railLinks.forEach((a, i) => { if (i === chapter) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    stills.forEach((s, i) => s.classList.toggle('is-on', i === chapter));
    stage.dataset.chapter = chapter;
    stage.style.setProperty('--accent', ACCENTS[chapter]);
  }
  emit();
}
const ACCENTS = ['#a7bdb8', '#e0564f', '#e2b15c', '#ff7a2f', '#c88a4e', '#e8c88a'];
stage.style.setProperty('--accent', ACCENTS[0]);
railLinks[0].setAttribute('aria-current', 'step');
stage.dataset.chapter = 0;
let driveQueued = false;
function requestDrive() { if (driveQueued) return; driveQueued = true; requestAnimationFrame(() => { driveQueued = false; drive(); }); }
window.addEventListener('scroll', requestDrive, { passive: true });
window.addEventListener('resize', () => { lastY = -1; requestDrive(); });
drive();

/* Is the stage on screen? The 3D scene only renders while it is. */
const stageObs = new IntersectionObserver((entries) => { state.live = entries[0].isIntersecting; emit(); }, { threshold: 0.01 });
stageObs.observe(stage);

/* ------------------------------------------------------------------ */
/* 3D: decide the tier, then load the scene after first paint           */
/* ------------------------------------------------------------------ */
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    state.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
    return true;
  } catch { return false; }
}
function decideTier() {
  if (state.tier !== 'auto') return state.tier;
  if (!webglAvailable()) { state.tierReason = 'no WebGL'; return 'still'; }
  const swgpu = /swiftshader|llvmpipe|software/i.test(state.gpu || '');
  // the device's screen, not the window: a small window on a desktop is cheap to render anyway
  const small = Math.min(screen.width || innerWidth, screen.height || innerHeight) < 500;
  const cores = navigator.hardwareConcurrency || 4;
  if (swgpu) { state.tierReason = 'software GPU'; return 'lite'; }
  if (small || cores <= 4 || (navigator.deviceMemory && navigator.deviceMemory <= 4)) { state.tierReason = 'small screen or low core count'; return 'lite'; }
  state.tierReason = 'auto';
  return 'full';
}
state.tier = decideTier();
if (state.tier === 'still' || state.tier === 'text') {
  jr.classList.add('jr--still');
  if (state.tier === 'text') jr.classList.add('jr--text');
} else {
  const start = () => import('./journey3d.js?v=4').then((m) => m.mount({ host: $('#canvasHost'), jr, stage, state, onState, emit, explicit: !!settings.explicitTier(), jtFromY })).catch((err) => {
    console.error('3D journey failed, falling back to still scenes', err);
    state.tier = 'still'; state.tierReason = 'scene failed: ' + (err && err.message);
    jr.classList.remove('jr--webgl'); jr.classList.add('jr--still');
    emit();
  });
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 }); else setTimeout(start, 300);
}
jr.classList.add('jr--live');

/* Pause control for the live scene */
const pauseBtn = $('#pause');
pauseBtn.addEventListener('click', () => {
  state.paused = !state.paused;
  pauseBtn.setAttribute('aria-pressed', String(state.paused));
  pauseBtn.textContent = state.paused ? 'Resume scene' : 'Pause scene';
  emit();
});
onState((s) => { pauseBtn.hidden = !(s.sceneReady && !s.calm); jr.classList.toggle('jr--calm', s.calm); });

/* Look and detail: the visitor's options for how the journey is drawn */
initLook({ state, emit, onState });

/* ------------------------------------------------------------------ */
/* ?why diagnostic                                                      */
/* ------------------------------------------------------------------ */
if (settings.params.has('why')) {
  const box = document.createElement('pre');
  box.className = 'why';
  document.body.appendChild(box);
  const upd = () => {
    box.textContent = [
      `tier: ${state.tier} (${state.tierReason})`,
      `calm: ${state.calm} (${settings.calmReason()})`,
      `motion setting: ${settings.motionSetting()}`,
      `gpu: ${state.gpu || '—'}`,
      `fps: ${state.fps == null ? '—' : state.fps.toFixed(0)}`,
      `scene: ${state.sceneReady ? 'ready' : 'not mounted'}${state.paused ? ', paused' : ''}`,
      `look: ${state.look}  detail: ${state.detail}`,
      `jt: ${state.jt.toFixed(2)}  chapter: ${state.chapter}`,
      `viewport: ${innerWidth}×${innerHeight} dpr ${devicePixelRatio}`,
    ].join('\n');
  };
  onState(upd); upd();
}

/* ------------------------------------------------------------------ */
/* Sections                                                             */
/* ------------------------------------------------------------------ */
renderMenu();
renderCollection();
renderStory();
renderOrigins();
renderContact();
/* Reveal on approach (after the sections exist); siblings stagger by --rv-i */
staggerReveals();
const rvObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); rvObs.unobserve(e.target); } });
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.rv').forEach((el) => rvObs.observe(el));
$('#ftrLinks').innerHTML = `<a href="mailto:${BRAND.email}">${BRAND.email}</a> · <a href="${BRAND.instagram}" rel="noopener">Instagram</a>`;

/* Hero intro (GSAP is justified here: a one-off timeline with staggered letters) */
if (!state.calm && window.gsap) {
  const h1 = hero.querySelector('h1');
  const em = h1.querySelector('em');
  // The wordmark is the LCP element: it is never removed or re-created, and it starts painted (opacity > 0).
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from(h1, { opacity: 0.3, y: 18, letterSpacing: '0.34em', duration: 1.4 }, 0.1)
    .from(em, { opacity: 0, y: 10, duration: 0.9 }, 0.7)
    .from(hero.querySelector('.kicker'), { opacity: 0, duration: 0.8 }, 0.4)
    .from('#scrollcue', { opacity: 0, duration: 0.8, clearProps: 'opacity' }, 1.2); // cleared, or the inline value would keep the cue on screen for the whole journey
}
