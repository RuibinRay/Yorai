/* Small shared UI helpers: animated dialog close, reveal stagger indices. */
import { isCalm } from './settings.js?v=4';

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
