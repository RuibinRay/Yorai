import { COLLECTION, BRAND, GIFT, ART } from '../data/content.js?v=7';
import { validate, isEmail, mailto, copyText } from './forms.js?v=7';
import { closeDialog, picture, SHAPE, tilt } from './ui.js?v=7';
import { cart } from './cart.js?v=7';
import { openProduct, onReserve } from './product.js?v=7';

const bagOf = (id) => COLLECTION.find((b) => b.id === id);

export function renderCollection() {
  const row = document.getElementById('colRow');
  /* The four bags. The name is the way into the detail panel and its hit area covers the whole card;
   * the two buttons below sit above that area. */
  row.innerHTML = COLLECTION.map((b, i) => `
    <article class="col__card rv" data-id="${b.id}" style="--i:${i}">
      <div class="col__bag tilt"><div class="tilt__in"><div class="floaty">${picture(b.img, SHAPE.bag, { sizes: '(min-width: 1100px) 22vw, 45vw', alt: `${b.name}: a bag of ${b.process.toLowerCase()} ${b.variety} from ${b.region}` })}</div></div></div>
      <div>
        <h3 class="col__name"><button type="button" class="col__open" data-open="${b.id}">${b.name}</button></h3>
        <p class="col__sub">${b.process} · ${b.variety} · ${b.altitude}</p>
      </div>
      <p class="col__notes">${b.notes}</p>
      <p class="col__from">From ${b.sizes[0].price} USD · ${b.sizes.map((s) => s.g + ' g').join(', ')}</p>
      <div class="col__cta">
        <button class="btn" type="button" data-add="${b.id}">Add to cart</button>
        <button class="btn btn--ghost" type="button" data-reserve="${b.id}">Reserve</button>
      </div>
      <p class="col__added" role="status"></p>
    </article>`).join('');
  row.querySelectorAll('.col__card').forEach((card) => tilt(card, card.querySelector('.tilt')));
  row.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]'), add = e.target.closest('[data-add]');
    if (open) openProduct('bag', open.dataset.open, open);
    if (add) {
      const b = bagOf(add.dataset.add), note = add.closest('.col__card').querySelector('.col__added');
      cart.add(b.id, b.sizes[0].g, 1);
      note.textContent = `Added: ${b.sizes[0].g} g.`;
      clearTimeout(note.timer); note.timer = setTimeout(() => { note.textContent = ''; }, 2600);
    }
  });

  renderGiftBox();

  /* Reserve dialog */
  const dlg = document.getElementById('reserveDlg');
  const title = document.getElementById('reserveTitle');
  const sizes = document.getElementById('reserveSizes');
  const form = document.getElementById('reserveForm');
  const status = document.getElementById('reserveStatus');
  let current = null, opener = null;

  function reserve(id, from) {
    current = bagOf(id);
    opener = from;
    title.textContent = current.name;
    sizes.innerHTML = current.sizes.map((s, i) => `
      <label><input type="radio" name="size" value="${s.g}" ${i === 0 ? 'checked' : ''}> ${s.g} g · ${s.price} USD</label>`).join('');
    status.textContent = ''; status.className = 'frm__status';
    form.reset();
    sizes.querySelector('input').checked = true;
    row.querySelector(`.col__card[data-id="${id}"]`)?.classList.add('is-open');
    dlg.showModal();
  }
  row.querySelectorAll('[data-reserve]').forEach((btn) => btn.addEventListener('click', () => reserve(btn.dataset.reserve, btn)));
  onReserve(reserve); // the detail panel's "Reserve by email" comes here too
  document.getElementById('reserveClose').addEventListener('click', () => closeDialog(dlg));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg); });
  dlg.addEventListener('close', () => { row.querySelectorAll('.is-open').forEach((c) => c.classList.remove('is-open')); opener?.focus(); });

  function summary() {
    const g = form.size.value;
    const size = current.sizes.find((s) => String(s.g) === g);
    const qty = Number(form.qty.value);
    return [
      `Reservation — ${current.name} (${current.process}, ${current.variety}, ${current.altitude})`,
      `Size: ${size.g} g at ${size.price} USD`,
      `Bags: ${qty}`,
      `Total to confirm: ${size.price * qty} USD`,
      `Name: ${form.name.value.trim()}`,
      `Email: ${form.email.value.trim()}`,
    ].join('\n');
  }
  const fields = () => [
    { input: form.name, err: document.getElementById('rNameErr'), test: (v) => v.length >= 2, message: 'Please give us a name.' },
    { input: form.email, err: document.getElementById('rEmailErr'), test: isEmail, message: 'That email address doesn’t look complete.' },
    { input: form.qty, err: document.getElementById('rQtyErr'), test: (v) => /^\d+$/.test(v) && +v >= 1 && +v <= 12, message: 'Between 1 and 12 bags, please.' },
  ];
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate(fields())) return;
    const text = summary();
    location.href = mailto(BRAND.email, `Reservation: ${current.name}`, text);
    status.textContent = 'Your email app should open with the reservation. If it doesn’t, use “Copy summary” and send it to ' + BRAND.email + '.';
    status.className = 'frm__status frm__status--ok';
  });
  document.getElementById('reserveCopy').addEventListener('click', async () => {
    if (!validate(fields())) return;
    const ok = await copyText(summary());
    status.textContent = ok ? 'Summary copied. Paste it into an email to ' + BRAND.email + '.' : 'Copying isn’t available here; the summary is: ' + summary().replaceAll('\n', ' · ');
    status.className = 'frm__status' + (ok ? ' frm__status--ok' : '');
  });
}

/* The gift box: closed on an empty box, opened on the four bags inside it. The box has no price of its own
 * in the data, so the offer is the four bags at their smallest size, and an enquiry about the box. */
function renderGiftBox() {
  const host = document.getElementById('giftBox');
  const bags = GIFT.includes.map(bagOf), sum = bags.reduce((n, b) => n + b.sizes[0].price, 0);
  const bean = (n) => `<span class="box__bean box__bean--${n}" aria-hidden="true">${picture(ART.bean, SHAPE.bean, { sizes: '5rem', alt: '' })}</span>`;
  host.innerHTML = `
    <div class="box__stage">
      <button class="box__lid" type="button" id="boxToggle" aria-expanded="false" aria-controls="boxContents">
        ${picture(GIFT.empty, SHAPE.box, { sizes: '(min-width: 900px) 52vw, 92vw', cls: 'box__img box__img--empty', alt: `The ${GIFT.name} gift box, open and empty` })}
        ${picture(GIFT.full, SHAPE.box, { sizes: '(min-width: 900px) 52vw, 92vw', cls: 'box__img box__img--full', alt: '' })}
        <span class="box__hint" id="boxHint">Open the box</span>
      </button>
      ${bean(1)}${bean(2)}${bean(3)}
    </div>
    <div class="box__text">
      <p class="kicker">The gift box</p>
      <h3>${GIFT.name}</h3>
      <p class="box__lede">Four bags, each from one slope, in one box.</p>
      <ul class="box__list" id="boxContents" hidden>
        ${bags.map((b, i) => `<li style="--i:${i}"><button type="button" class="box__item" data-open="${b.id}"><span class="box__thumb">${picture(b.img, SHAPE.bag, { sizes: '3rem', alt: '' })}</span><span><b>${b.name}</b><small>${b.notes}</small></span></button></li>`).join('')}
      </ul>
      <div class="box__actions">
        <button class="btn" type="button" id="boxAdd">Add the four to cart · ${sum} USD</button>
        <a class="btn btn--ghost" href="${mailto(BRAND.email, `Gift box: ${GIFT.name}`, `I’d like to ask about the ${GIFT.name} gift box.`)}">Ask about the box</a>
      </div>
      <p class="box__fine" id="boxFine" role="status">One of each coffee, at its smallest size.</p>
    </div>`;
  const toggle = host.querySelector('#boxToggle'), list = host.querySelector('#boxContents'), hint = host.querySelector('#boxHint');
  const full = host.querySelector('.box__img--full'), emptyImg = host.querySelector('.box__img--empty');
  tilt(host.querySelector('.box__stage'), host.querySelector('.box__stage'));
  toggle.addEventListener('click', () => {
    const open = !host.classList.contains('is-open');
    host.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    hint.textContent = open ? 'Close the box' : 'Open the box';
    list.hidden = !open;
    // the picture that is showing is the one that speaks
    full.alt = open ? `The ${GIFT.name} gift box with its four bags: ${bags.map((b) => b.name).join(', ')}` : '';
    emptyImg.alt = open ? '' : `The ${GIFT.name} gift box, open and empty`;
  });
  list.addEventListener('click', (e) => { const btn = e.target.closest('[data-open]'); if (btn) openProduct('bag', btn.dataset.open, btn); });
  host.querySelector('#boxAdd').addEventListener('click', () => {
    bags.forEach((b) => cart.add(b.id, b.sizes[0].g, 1));
    host.querySelector('#boxFine').textContent = 'Added: one of each coffee, at its smallest size.';
  });
}
