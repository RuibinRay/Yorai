/* The visitor's choice of look and detail for the journey: a small panel beside the pause button.
 * It only sets state.look / state.detail and remembers them; journey3d.js applies them live. */
import * as settings from './settings.js?v=7';

export const LOOKS = [
  { id: 'anime', label: 'Anime', hint: 'Cel shading, ink lines and painted skies.' },
  { id: 'pastel', label: 'Pastel', hint: 'Softer light, gentler colour, lighter lines.' },
  { id: 'manga', label: 'Manga', hint: 'Ink and screentone on paper. The reds stay.' },
  { id: 'film', label: 'Film', hint: 'Soft shading, filmic contrast and grain.' },
];
export const DETAILS = [
  { id: 'auto', label: 'Auto', hint: 'Adjusts to this device as you scroll.' },
  { id: 'high', label: 'High', hint: 'Full resolution and every effect.' },
  { id: 'balanced', label: 'Balanced', hint: 'Lower resolution, no light shafts.' },
  { id: 'light', label: 'Light', hint: 'Lowest resolution, lines and colour only.' },
];

export function initLook({ state, emit, onState }) {
  const btn = document.getElementById('lookBtn');
  const panel = document.getElementById('lookPanel');
  const groups = [
    { key: 'look', list: LOOKS, host: document.getElementById('lookStyles'), hint: document.getElementById('lookStyleHint') },
    { key: 'detail', list: DETAILS, host: document.getElementById('lookDetails'), hint: document.getElementById('lookDetailHint') },
  ];

  groups.forEach((g) => {
    g.host.innerHTML = g.list.map((o) => `<label class="look__opt"><input type="radio" name="${g.key}" value="${o.id}"><span>${o.label}</span></label>`).join('');
    g.inputs = [...g.host.querySelectorAll('input')];
    g.sync = () => {
      g.inputs.forEach((i) => { i.checked = i.value === state[g.key]; i.parentElement.classList.toggle('is-on', i.checked); });
      g.hint.textContent = g.list.find((o) => o.id === state[g.key]).hint;
    };
    g.host.addEventListener('change', (e) => {
      state[g.key] = e.target.value;
      settings.set(g.key, e.target.value);
      g.sync();
      emit();
    });
    g.sync();
  });

  const isOpen = () => !panel.hidden;
  function open() {
    panel.hidden = false; btn.setAttribute('aria-expanded', 'true');
    groups[0].inputs.find((i) => i.checked)?.focus({ preventScroll: true }); // the stage is pinned: focusing must never move the page
  }
  function close(returnFocus) {
    if (!isOpen()) return;
    panel.hidden = true; btn.setAttribute('aria-expanded', 'false');
    if (returnFocus) btn.focus({ preventScroll: true });
  }
  btn.addEventListener('click', () => (isOpen() ? close(true) : open()));
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true); } });
  // a press anywhere else, or focus moving on, puts the panel away without taking focus back
  document.addEventListener('pointerdown', (e) => { if (isOpen() && !panel.contains(e.target) && !btn.contains(e.target)) close(false); });
  panel.addEventListener('focusout', (e) => { if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== btn) close(false); });

  // the looks belong to the live scene: no control on the still and text tiers
  onState((s) => { btn.hidden = !s.sceneReady; if (btn.hidden) close(false); });
}
