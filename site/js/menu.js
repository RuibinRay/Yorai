import { MENU, PROCESSES, METHODS, FLAVOURS, ART } from '../data/content.js?v=7';
import { closeDialog, picture, SHAPE, tilt, money, capital, notesOf } from './ui.js?v=7';
import { openProduct } from './product.js?v=7';

const MOST = 3; // coffees side by side
const cupOf = (id) => MENU.find((m) => m.id === id);
const familyOf = (note) => Object.keys(FLAVOURS).find((f) => FLAVOURS[f].includes(note.toLowerCase())) || 'Other';

export function renderMenu() {
  const $ = (id) => document.getElementById(id);
  const filters = $('cupFilters'), methods = $('cupMethods'), list = $('cupList'), count = $('cupCount'), empty = $('cupEmpty');
  let process = 'All', method = 'All';
  const chosen = []; // ids picked for comparison, in the order they were picked

  $('cupHero').innerHTML = picture(ART.cup, SHAPE.cup, { sizes: '22rem', alt: '' });

  /* Two sets of chips; a coffee is shown when it passes both. */
  const chipRow = (host, values, get, set) => values.forEach((v) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = v;
    b.setAttribute('aria-pressed', String(v === get()));
    b.addEventListener('click', () => { set(v); update(); });
    host.appendChild(b);
  });
  chipRow(methods, METHODS, () => method, (v) => { method = v; });
  chipRow(filters, PROCESSES, () => process, (v) => { process = v; });

  /* A card per coffee. The name opens the detail panel and its hit area covers the card; Compare sits above it. */
  list.innerHTML = MENU.map((m, i) => `
    <li class="cup__item rv" data-id="${m.id}" data-process="${m.process}" data-method="${m.method}" style="--i:${i}">
      <div class="cup__art tilt"><div class="tilt__in"><div class="floaty">${picture(m.img, SHAPE.cup, { sizes: '(min-width: 900px) 18rem, (min-width: 600px) 40vw, 8rem', alt: `${m.name} in the house cup, with ${m.notes.toLowerCase()} on the saucer` })}</div></div></div>
      <div class="cup__body">
        <p class="cup__name"><button type="button" class="cup__open" data-open="${m.id}">${m.name}</button> <span class="cup__method">${m.method}</span></p>
        <p class="cup__meta"><span><b>${m.process}</b></span><span>${m.variety}</span><span>${m.altitude.toLocaleString('en-US')} m</span></p>
        <p class="cup__notes">${m.notes}</p>
        <div class="cup__row">
          <p class="cup__price">${money(m.price)}<small>USD</small></p>
          <button type="button" class="chip cup__cmp" data-compare="${m.id}" aria-pressed="false" aria-label="Compare ${m.name}">Compare</button>
        </div>
      </div>
    </li>`).join('');
  const items = [...list.children];
  items.forEach((li) => tilt(li, li.querySelector('.tilt')));
  const shown = () => items.filter((li) => !li.hidden).map((li) => li.dataset.id);

  list.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]'), cmp = e.target.closest('[data-compare]');
    if (open) openProduct('cup', open.dataset.open, open, shown());
    if (cmp) toggleCompare(cmp.dataset.compare);
  });

  function update() {
    filters.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === process)));
    methods.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === method)));
    let n = 0;
    items.forEach((li) => {
      const on = (process === 'All' || li.dataset.process === process) && (method === 'All' || li.dataset.method === method);
      li.hidden = !on; if (on) n++;
    });
    count.textContent = n === MENU.length ? `${n} coffees` : `${n} of ${MENU.length}`;
    empty.hidden = n > 0;
  }

  /* ---- compare: up to three coffees, their notes set out by family ---- */
  const bar = $('cmpBar'), barText = $('cmpText'), openBtn = $('cmpOpen'), dlg = $('cmpDlg'), grid = $('cmpGrid');
  function toggleCompare(id) {
    const at = chosen.indexOf(id);
    if (at >= 0) chosen.splice(at, 1);
    else if (chosen.length < MOST) chosen.push(id);
    else { barText.textContent = `Three at most. Take one off to add ${cupOf(id).name}.`; return; }
    syncCompare();
  }
  function syncCompare() {
    items.forEach((li) => {
      const on = chosen.includes(li.dataset.id);
      li.classList.toggle('is-compared', on);
      li.querySelector('.cup__cmp').setAttribute('aria-pressed', String(on));
    });
    bar.hidden = chosen.length === 0;
    openBtn.disabled = chosen.length < 2;
    barText.textContent = chosen.length === 1 ? `${cupOf(chosen[0]).name} chosen. Pick one more to compare.` : `${chosen.length} coffees chosen.`;
  }
  function renderCompare() {
    const cups = chosen.map(cupOf);
    const byFamily = cups.map((m) => { const o = {}; notesOf(m.notes).forEach((n) => { (o[familyOf(n)] ||= []).push(capital(n)); }); return o; });
    const families = [...Object.keys(FLAVOURS), 'Other'].filter((f) => byFamily.some((o) => o[f]));
    const row = (label, cell, cls = '') => `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${label}</th>${cups.map((m, i) => `<td>${cell(m, i)}</td>`).join('')}</tr>`;
    grid.innerHTML = `
      <table class="cmp__table" style="--cols:${cups.length}">
        <caption class="vh">Tasting notes by family, then method, process, variety, altitude and price, for ${cups.map((m) => m.name).join(', ')}</caption>
        <thead><tr><td></td>${cups.map((m) => `<th scope="col"><span class="cmp__art">${picture(m.img, SHAPE.cup, { sizes: '9rem', alt: '' })}</span><span class="cmp__name">${m.name}</span></th>`).join('')}</tr></thead>
        <tbody>
          ${families.map((f) => row(f, (m, i) => (byFamily[i][f] ? byFamily[i][f].map((n) => `<span class="cmp__note">${n}</span>`).join('') : '<span class="cmp__none" aria-label="none">·</span>'), 'cmp__flavour')).join('')}
          ${row('Method', (m) => m.method)}
          ${row('Process', (m) => m.process)}
          ${row('Variety', (m) => m.variety)}
          ${row('Altitude', (m) => `${m.altitude.toLocaleString('en-US')} m`)}
          ${row('Price', (m) => `${money(m.price)} USD`)}
        </tbody>
      </table>`;
  }
  openBtn.addEventListener('click', () => { renderCompare(); dlg.showModal(); });
  $('cmpClear').addEventListener('click', () => { chosen.length = 0; syncCompare(); });
  $('cmpClose').addEventListener('click', () => closeDialog(dlg));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg); });
  dlg.addEventListener('close', () => openBtn.focus({ preventScroll: true }));

  update(); syncCompare();
}
