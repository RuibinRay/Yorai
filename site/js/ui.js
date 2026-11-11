/* Small shared UI helpers: animated dialog close, reveal stagger indices. */
import { isCalm } from './settings.js?v=7';

/* Close a native <dialog> after its leave animation (the `.is-closing` keyframes in site.css).
 * Under calm motion, or if the animation never ends (e.g. display: none), it closes at once. */
export function closeDialog(dlg) {
  if (!dlg.open || dlg.classList.contains('is-closing')) return;
  if (isCalm()) { dlg.close(); return; }
  let done = false;
  const finish = () => { if (done) return; done = true; dlg.classList.remove('is-closing'); dlg.close(); };
  dlg.addEventListener('animationend', finish, { once: true });
  dlg.classList.add('is-closing');
  setTimeout(finish, 320);
}

/* Give every revealed element its place among its revealed siblings (0, 1, 2 …), so a group
 * staggers while a lone element still arrives at once. Capped so long lists never crawl. */
export function staggerReveals(selector = '.rv', cap = 7) {
  const seen = new Map();
  document.querySelectorAll(selector).forEach((el) => {
    const parent = el.parentElement;
    const n = seen.get(parent) || 0;
    el.style.setProperty('--rv-i', Math.min(cap, n));
    seen.set(parent, n + 1);
  });
}

/* ---- product pictures ---- */
export const money = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(2));
export const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const notesOf = (text) => text.split(',').map((n) => n.trim()).filter(Boolean);

/* Each supplied picture is kept as it came (`name.webp`) beside a smaller copy (`name-640.webp` and so on).
 * The browser takes the small one for grids and the original where the picture is shown large or dense. */
export const SHAPE = {
  bag: { w: 1086, h: 1448, small: 640 },
  cup: { w: 1254, h: 1254, small: 640 },
  box: { w: 1448, h: 1086, small: 800 },
  bean: { w: 1254, h: 1254, small: 256 },
};
export function picture(base, shape, { sizes, alt = '', cls = '', eager = false }) {
  return `<img${cls ? ` class="${cls}"` : ''} src="${base}-${shape.small}.webp" srcset="${base}-${shape.small}.webp ${shape.small}w, ${base}.webp ${shape.w}w" sizes="${sizes}" width="${shape.w}" height="${shape.h}" alt="${alt}"${eager ? '' : ' loading="lazy"'} decoding="async" draggable="false">`;
}

/* A 3D tilt that follows a fine pointer. `area` is what the pointer is over; `target` (a `.tilt` element)
 * carries --tx and --ty (−0.5 … 0.5) for the turn and --mx, --my for the highlight, and the stylesheet
 * does the rest. Nothing happens on touch or under calm motion. */
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
export function tilt(area, target = area) {
  let raf = 0, x = 0.5, y = 0.5;
  const unit = (v) => Math.max(0, Math.min(1, v));
  area.addEventListener('pointermove', (e) => {
    if (!finePointer.matches || e.pointerType === 'touch' || isCalm()) return;
    const r = target.getBoundingClientRect();
    x = unit((e.clientX - r.left) / r.width); y = unit((e.clientY - r.top) / r.height);
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      target.style.setProperty('--tx', (x - 0.5).toFixed(3)); target.style.setProperty('--ty', (y - 0.5).toFixed(3));
      target.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); target.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      target.classList.add('is-tilting');
    });
  });
  area.addEventListener('pointerleave', () => {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    target.classList.remove('is-tilting'); target.style.setProperty('--tx', '0'); target.style.setProperty('--ty', '0');
  });
}

