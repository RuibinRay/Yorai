import { MENU, PROCESSES } from '../data/content.js?v=5';

const money = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(2));

export function renderMenu() {
  const filters = document.getElementById('cupFilters');
  const list = document.getElementById('cupList');
  const count = document.getElementById('cupCount');
  const empty = document.getElementById('cupEmpty');
  let active = 'All';

  PROCESSES.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = p;
    b.setAttribute('aria-pressed', String(p === active));
    b.addEventListener('click', () => { active = p; update(); });
    filters.appendChild(b);
  });

  list.innerHTML = MENU.map((m) => `
    <li class="cup__item rv" data-process="${m.process}">
      <p class="cup__name">${m.name} <span class="cup__method">${m.method}</span></p>
      <p class="cup__meta"><span><b>${m.process}</b></span><span>${m.variety}</span><span>${m.altitude.toLocaleString('en-US')} m</span></p>
      <p class="cup__notes">${m.notes}</p>
      <p class="cup__price">${money(m.price)}<small>USD</small></p>
    </li>`).join('');
  const items = [...list.children];

  function update() {
    filters.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === active)));
    let n = 0;
    items.forEach((li) => { const on = active === 'All' || li.dataset.process === active; li.hidden = !on; if (on) n++; });
    count.textContent = n === MENU.length ? `${n} coffees` : `${n} of ${MENU.length}`;
    empty.hidden = n > 0;
  }
  update();
}
