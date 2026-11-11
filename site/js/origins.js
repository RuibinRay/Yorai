import { REGIONS } from '../data/content.js?v=6';

/* A simplified outline of Costa Rica (lon, lat), clockwise from the north-west.
 * Hand-traced at roughly 15–30 km fidelity; for an atlas-grade coast, replace with
 * a Natural Earth 10 m polygon (public domain). */
const OUTLINE = [
  [-85.92, 11.03], [-85.72, 11.21], [-85.60, 11.12], [-85.20, 11.06], [-84.90, 11.08], [-84.72, 11.03], [-84.50, 10.97],
  [-84.20, 10.80], [-83.92, 10.72], [-83.67, 10.93],
  [-83.50, 10.60], [-83.38, 10.40], [-83.10, 10.10], [-83.03, 9.99], [-82.85, 9.78], [-82.65, 9.63], [-82.56, 9.57],
  [-82.70, 9.45], [-82.88, 9.20], [-82.92, 8.90], [-82.80, 8.60], [-82.85, 8.35], [-82.88, 8.05],
  [-83.05, 8.35], [-83.17, 8.55], [-83.33, 8.72], [-83.31, 8.53], [-83.29, 8.38], [-83.50, 8.44], [-83.73, 8.58], [-83.65, 8.70],
  [-83.70, 8.85], [-83.85, 9.15], [-84.00, 9.30], [-84.16, 9.43], [-84.30, 9.55], [-84.63, 9.62], [-84.72, 9.80], [-84.83, 9.98],
  [-84.90, 10.15], [-85.05, 10.05], [-85.10, 9.85], [-85.12, 9.55], [-85.35, 9.70], [-85.53, 9.88], [-85.66, 9.98], [-85.84, 10.30],
  [-85.70, 10.56], [-85.80, 10.80],
];
const LON0 = -86.1, LON1 = -82.3, LAT0 = 11.4, LAT1 = 7.8;
const W = 380, H = 360;
const px = (lon) => ((lon - LON0) / (LON1 - LON0)) * W;
const py = (lat) => ((LAT0 - lat) / (LAT0 - LAT1)) * H;

/* Volcano peaks for orientation (lon, lat) */
const PEAKS = [
  { n: 'Poás', lon: -84.23, lat: 10.20 }, { n: 'Irazú', lon: -83.85, lat: 9.98 }, { n: 'Arenal', lon: -84.70, lat: 10.46 }, { n: 'Chirripó', lon: -83.49, lat: 9.48 },
];

export function renderOrigins() {
  const host = document.getElementById('orgMap');
  const panel = document.getElementById('orgPanel');
  const list = document.getElementById('orgList');

  const path = OUTLINE.map(([lo, la], i) => `${i ? 'L' : 'M'}${px(lo).toFixed(1)} ${py(la).toFixed(1)}`).join(' ') + ' Z';
  const grat = [];
  for (let lon = -86; lon <= -82; lon += 1) grat.push(`<line class="org__grat" x1="${px(lon)}" y1="0" x2="${px(lon)}" y2="${H}"/>`);
  for (let lat = 8; lat <= 11; lat += 1) grat.push(`<line class="org__grat" x1="0" y1="${py(lat)}" x2="${W}" y2="${py(lat)}"/>`);

  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
      <rect class="org__sea" width="${W}" height="${H}"/>
      ${grat.join('')}
      <path class="org__land" d="${path}"/>
      <g class="org__peaks">${PEAKS.map((p) => `<path d="M${px(p.lon) - 4} ${py(p.lat) + 3} l4 -7 l4 7 z" fill="#5d6f69"/><text class="org__label" x="${px(p.lon) + 6}" y="${py(p.lat) + 3}">${p.n}</text>`).join('')}</g>
      <text class="org__label" x="${px(-85.9)}" y="${py(11.25)}">Nicaragua</text>
      <text class="org__label" x="${px(-82.9)}" y="${py(8.65)}">Panamá</text>
      <text class="org__label" x="${px(-85.2)}" y="${py(8.4)}">Pacific Ocean</text>
      <text class="org__label" x="${px(-83.3)}" y="${py(10.45)}">Caribbean Sea</text>
    </svg>
    <div class="org__pins"></div>`;
  const pins = host.querySelector('.org__pins');
  pins.style.cssText = 'position:absolute;inset:0;';
  pins.innerHTML = REGIONS.map((r, i) => `
    <button type="button" class="org__pin${r.home ? ' is-home' : ''}" data-id="${r.id}" style="--i:${i};left:${((px(r.lon) + (r.nudge?.[0] || 0)) / W * 100).toFixed(2)}%;top:${((py(r.lat) + (r.nudge?.[1] || 0)) / H * 100).toFixed(2)}%" aria-pressed="false">
      <span class="org__pin-ring" aria-hidden="true"></span><span class="org__pin-label">${r.name}</span>
    </button>`).join('');
  list.innerHTML = REGIONS.map((r) => `<li><button type="button" data-id="${r.id}" aria-pressed="false">${r.name}</button></li>`).join('');

  const pinEls = [...host.querySelectorAll('.org__pin')];
  const small = window.matchMedia('(max-width: 900px)');
  const setPinMode = () => pinEls.forEach((b) => { b.tabIndex = small.matches ? -1 : 0; b.setAttribute('aria-hidden', String(small.matches)); });
  small.addEventListener?.('change', setPinMode); setPinMode();
  const buttons = [...pinEls, ...list.querySelectorAll('button')];
  let currentId = null;
  function select(id) {
    if (id === currentId) return;
    currentId = id;
    const r = REGIONS.find((x) => x.id === id);
    buttons.forEach((b) => { const on = b.dataset.id === id; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on); });
    // the content changes at once (the live region announces it); its lines rise in, see .org__panel > * in site.css
    panel.innerHTML = `
      ${r.home ? '<span class="org__home">Home of YORAI</span>' : ''}
      <h3>${r.name}</h3>
      <p>${r.text}</p>
      <dl>
        <dt>Elevation</dt><dd>${r.elevation}</dd>
        <dt>Harvest</dt><dd>${r.harvest}</dd>
        <dt>In the cup</dt><dd>${r.profile}</dd>
      </dl>`;
  }
  buttons.forEach((b) => b.addEventListener('click', () => select(b.dataset.id)));
  select('tarrazu');
}
