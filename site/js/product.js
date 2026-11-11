/* The detail panel: one dialog for a bag from the collection or a coffee from the menu. A larger picture
 * that tilts and floats, everything the data says about it, and the action that fits: a bag can be put in
 * the cart or reserved by email; a coffee from the menu is served in the tasting room, so it offers a
 * tasting enquiry and, where the same lot is sold in a bag, the way to that bag. */
import { COLLECTION, MENU, METHOD_NOTES } from '../data/content.js?v=7';
import { cart } from './cart.js?v=7';
import { isCalm } from './settings.js?v=7';
import { closeDialog, picture, SHAPE, tilt, money, capital, notesOf } from './ui.js?v=7';

const $ = (id) => document.getElementById(id);
const bagOf = (id) => COLLECTION.find((b) => b.id === id);
const cupOf = (id) => MENU.find((m) => m.id === id);
const hooks = { reserve: null };
/* collection.js lends its reservation form: reserve(bagId, focusBackTo). */
export function onReserve(fn) { hooks.reserve = fn; }

let dlg, art, body, pos, set = [], index = 0, opener = null, wired = false;

function wire() {
  if (wired) return; wired = true;
  dlg = $('productDlg'); art = $('pdArt'); body = $('pdBody'); pos = $('pdPos');
  tilt($('pdStage'), art);
  $('pdClose').addEventListener('click', () => closeDialog(dlg));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg); });
  dlg.addEventListener('close', () => {
    document.querySelectorAll('.is-viewing').forEach((el) => el.classList.remove('is-viewing'));
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  });
  $('pdPrev').addEventListener('click', () => step(-1));
  $('pdNext').addEventListener('click', () => step(1));
  dlg.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });
  body.addEventListener('click', onBodyClick);
  body.addEventListener('change', onBodyChange);
  body.addEventListener('submit', onBuy);
}

/* Open on one product. `ids` is the run the arrows walk through (the four bags, or the coffees on show). */
export function openProduct(kind, id, from, ids) {
  wire();
  set = (ids && ids.length ? ids : (kind === 'bag' ? COLLECTION : MENU).map((x) => x.id)).map((x) => ({ kind, id: x }));
  index = Math.max(0, set.findIndex((x) => x.id === id));
  opener = from || document.activeElement;
  render();
  if (!dlg.open) dlg.showModal();
}

function step(dir) {
  if (set.length < 2) return;
  index = (index + dir + set.length) % set.length;
  swap(dir);
}
/* Change what is shown: the picture and the text leave to one side, the new ones arrive from the other. */
function swap(dir) {
  if (isCalm()) { render(); return; }
  dlg.style.setProperty('--dir', dir);
  dlg.classList.add('is-leaving');
  setTimeout(() => {
    render();
    dlg.style.setProperty('--dir', -dir);
    dlg.classList.remove('is-leaving'); dlg.classList.add('is-arriving');
    void dlg.offsetWidth; // the arriving position is taken up before the transition back begins
    dlg.classList.remove('is-arriving');
  }, 190);
}

const chips = (notes) => `<ul class="pd__notes" aria-label="Tasting notes">${notesOf(notes).map((n) => `<li>${capital(n)}</li>`).join('')}</ul>`;
const facts = (rows) => `<dl class="pd__facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

function render() {
  const cur = set[index], isBag = cur.kind === 'bag', item = isBag ? bagOf(cur.id) : cupOf(cur.id);
  const shape = isBag ? SHAPE.bag : SHAPE.cup;
  art.style.setProperty('--ar', `${shape.w} / ${shape.h}`);
  art.innerHTML = `<div class="tilt__in"><div class="floaty">${picture(item.img, shape, { sizes: '(min-width: 800px) 28rem, 70vw', eager: true,
    alt: isBag ? `${item.name}: a bag of ${item.process.toLowerCase()} ${item.variety} from ${item.region}` : `${item.name} in the house cup, with ${item.notes.toLowerCase()} on the saucer` })}</div></div>`;
  pos.textContent = `${index + 1} / ${set.length}`;
  $('pdNav').hidden = set.length < 2;
  document.querySelectorAll('.is-viewing').forEach((el) => el.classList.remove('is-viewing'));
  document.querySelector(`[data-id="${cur.id}"].${isBag ? 'col__card' : 'cup__item'}`)?.classList.add('is-viewing');
  body.innerHTML = isBag ? bagBody(item) : cupBody(item);
  if (isBag) syncBuy();
}

function bagBody(b) {
  return `
    <p class="kicker">${b.process} · ${b.roast} roast</p>
    <h3 id="pdName">${b.name}</h3>
    <p class="pd__story">${b.story}</p>
    ${chips(b.notes)}
    ${facts([['Process', b.process], ['Variety', b.variety], ['Altitude', b.altitude], ['Region', b.region], ['Roast', b.roast]])}
    <form class="pd__buy" id="pdBuy" data-id="${b.id}" novalidate>
      <fieldset class="pd__set">
        <legend>Size</legend>
        <div class="pd__sizes">${b.sizes.map((s, i) => `<label class="pd__size${i ? '' : ' is-on'}"><input type="radio" name="size" value="${s.g}"${i ? '' : ' checked'}><span>${s.g} g</span><small>${s.price} USD</small></label>`).join('')}</div>
      </fieldset>
      <div class="pd__row">
        <div class="qty" role="group" aria-label="Bags">
          <button type="button" data-step="-1" aria-label="One fewer bag">−</button>
          <output id="pdQty" aria-live="polite">1</output>
          <button type="button" data-step="1" aria-label="One more bag">+</button>
        </div>
        <p class="pd__price"><b id="pdTotal"></b><span>USD</span></p>
      </div>
      <div class="pd__actions">
        <button class="btn" type="submit">Add to cart</button>
        <button class="btn btn--ghost" type="button" data-act="reserve">Reserve by email</button>
      </div>
      <p class="pd__status" id="pdStatus" role="status"></p>
    </form>`;
}
function cupBody(m) {
  const bag = m.bag && bagOf(m.bag);
  const lines = [METHOD_NOTES[m.method], bag && bag.story].filter(Boolean);
  return `
    <p class="kicker">${m.method} · Tasting room</p>
    <h3 id="pdName">${m.name}</h3>
    ${lines.length ? `<p class="pd__story">${lines.join(' ')}</p>` : ''}
    ${chips(m.notes)}
    ${facts([['Method', m.method], ['Process', m.process], ['Variety', m.variety], ['Altitude', `${m.altitude.toLocaleString('en-US')} m`]])}
    <p class="pd__price pd__price--cup"><b>${money(m.price)}</b><span>USD · in the tasting room</span></p>
    <div class="pd__actions">
      <button class="btn" type="button" data-act="taste" data-id="${m.id}">Book a tasting</button>
      ${bag ? `<button class="btn btn--ghost" type="button" data-act="bag" data-id="${bag.id}">Take it home · from ${bag.sizes[0].price} USD</button>` : ''}
    </div>
    <p class="pd__fine">Tastings are by appointment: this takes you to the contact form with the coffee named.</p>`;
}

/* The buy form: the size chosen, how many, and the total they come to. */
function syncBuy() {
  const form = $('pdBuy'); if (!form) return;
  const bag = bagOf(form.dataset.id), g = Number(form.elements.size.value), qty = Number($('pdQty').textContent);
  form.querySelectorAll('.pd__size').forEach((l) => l.classList.toggle('is-on', l.querySelector('input').checked));
  $('pdTotal').textContent = bag.sizes.find((s) => s.g === g).price * qty;
  form.querySelector('[data-step="-1"]').disabled = qty <= 1; form.querySelector('[data-step="1"]').disabled = qty >= cart.MAX;
}
function onBodyChange(e) { if (e.target.name === 'size') syncBuy(); }
function onBuy(e) {
  e.preventDefault();
  const form = e.target, bag = bagOf(form.dataset.id), g = Number(form.elements.size.value), qty = Number($('pdQty').textContent);
  cart.add(bag.id, g, qty);
  $('pdStatus').innerHTML = `Added: ${qty} × ${bag.name}, ${g} g. <button type="button" class="pd__link" data-act="cart">View cart</button>`;
}
function onBodyClick(e) {
  const btn = e.target.closest('button'); if (!btn) return;
  if (btn.dataset.step) { const q = $('pdQty'); q.textContent = Math.max(1, Math.min(cart.MAX, Number(q.textContent) + Number(btn.dataset.step))); syncBuy(); return; }
  const act = btn.dataset.act;
  if (act === 'cart') { const back = opener; opener = null; dlg.close(); cart.open(back); }
  else if (act === 'reserve') { const id = $('pdBuy').dataset.id, back = opener; opener = null; dlg.close(); hooks.reserve?.(id, back); }
  else if (act === 'bag') { set = COLLECTION.map((b) => ({ kind: 'bag', id: b.id })); index = set.findIndex((x) => x.id === btn.dataset.id); swap(1); }
  else if (act === 'taste') tasting(cupOf(btn.dataset.id));
}
/* A tasting enquiry: the contact form, with the visit chosen and the coffee named, left for the visitor to send. */
function tasting(m) {
  opener = null; dlg.close();
  const topic = $('cTopic'), msg = $('cMsg');
  topic.selectedIndex = 0;
  if (!msg.value.trim()) msg.value = `I’d like to taste ${m.name} (${m.method.toLowerCase()}).`;
  document.getElementById('contact').scrollIntoView({ behavior: isCalm() ? 'instant' : 'smooth' });
  $('cName').focus({ preventScroll: true });
}
