/* The cart: bags from the collection, kept on the visitor's device, and a checkout that sends the order
 * the way a reservation is sent — written out in the visitor's email app, or copied. No payment is taken
 * on this page; the farm confirms by email before anything is charged. */
import { COLLECTION, BRAND, ART } from '../data/content.js?v=7';
import * as settings from './settings.js?v=7';
import { validate, isEmail, mailto, copyText } from './forms.js?v=7';
import { closeDialog, picture, SHAPE } from './ui.js?v=7';

const MAX = 12; // the most of one bag in an order, as in the reservation form
const bagOf = (id) => COLLECTION.find((b) => b.id === id);
const sizeOf = (bag, g) => bag && bag.sizes.find((s) => s.g === g);
const clean = (raw) => (Array.isArray(raw) ? raw : [])
  .filter((it) => it && sizeOf(bagOf(it.id), it.g) && Number.isInteger(it.qty) && it.qty >= 1)
  .map((it) => ({ id: it.id, g: it.g, qty: Math.min(MAX, it.qty) }));

let items = clean(settings.get('cart', []));
const subs = new Set();
const changed = () => { settings.set('cart', items); subs.forEach((fn) => fn()); };

export const cart = {
  MAX,
  add(id, g, qty = 1) {
    if (!sizeOf(bagOf(id), g)) return;
    const it = items.find((x) => x.id === id && x.g === g);
    if (it) it.qty = Math.min(MAX, it.qty + qty); else items.push({ id, g, qty: Math.min(MAX, qty) });
    changed();
  },
  setQty(id, g, qty) {
    const it = items.find((x) => x.id === id && x.g === g);
    if (!it) return;
    if (qty < 1) { cart.remove(id, g); return; }
    it.qty = Math.min(MAX, qty); changed();
  },
  remove(id, g) { items = items.filter((x) => !(x.id === id && x.g === g)); changed(); },
  lines() { return items.map((it) => { const bag = bagOf(it.id), price = sizeOf(bag, it.g).price; return { ...it, bag, price, total: price * it.qty }; }); },
  count() { return items.reduce((n, it) => n + it.qty, 0); },
  total() { return cart.lines().reduce((n, l) => n + l.total, 0); },
  onChange(fn) { subs.add(fn); },
  open() {}, // replaced by initCart
};

export function initCart() {
  const $ = (id) => document.getElementById(id);
  const dlg = $('cartDlg'), list = $('cartList'), empty = $('cartEmpty'), foot = $('cartFoot'), totalEl = $('cartTotal');
  const openBtn = $('cartOpen'), countEl = $('cartCount'), countWord = $('cartCountWord'), title = $('cartTitle');
  const itemsView = $('cartItemsView'), form = $('checkoutForm'), summaryEl = $('checkoutSummary'), status = $('checkoutStatus');
  const nameIn = $('oName'), emailIn = $('oEmail'), noteIn = $('oNote');
  let opener = null, lastCount = cart.count();

  $('cartEmptyArt').innerHTML = picture(ART.togo, SHAPE.cup, { sizes: '11rem', alt: '' });

  function renderBadge() {
    const n = cart.count();
    countEl.textContent = n; countWord.textContent = n === 1 ? ' item' : ' items';
    openBtn.classList.toggle('has-items', n > 0);
    if (n > lastCount) { openBtn.classList.remove('is-bump'); void openBtn.offsetWidth; openBtn.classList.add('is-bump'); } // the count grew: a small nudge
    lastCount = n;
  }
  function renderList() {
    const lines = cart.lines(), held = document.activeElement && list.contains(document.activeElement) ? document.activeElement.dataset.ref : null;
    list.innerHTML = lines.map((l) => {
      const key = `${l.id}|${l.g}`, label = `${l.bag.name}, ${l.g} g`;
      return `
      <li class="cart__item" data-key="${key}">
        <div class="cart__thumb">${picture(l.bag.img, SHAPE.bag, { sizes: '4.5rem', alt: '' })}</div>
        <div class="cart__what">
          <p class="cart__name">${l.bag.name}</p>
          <p class="cart__sub">${l.g} g · ${l.price} USD each</p>
          <div class="qty" role="group" aria-label="Bags of ${label}">
            <button type="button" data-ref="${key}|dec" data-step="-1" aria-label="One fewer: ${label}">−</button>
            <output aria-live="polite">${l.qty}</output>
            <button type="button" data-ref="${key}|inc" data-step="1" aria-label="One more: ${label}"${l.qty >= MAX ? ' disabled' : ''}>+</button>
          </div>
        </div>
        <p class="cart__line">${l.total} USD</p>
        <button type="button" class="cart__remove" data-ref="${key}|rm" data-remove aria-label="Remove ${label}">Remove</button>
      </li>`;
    }).join('');
    list.hidden = lines.length === 0; foot.hidden = lines.length === 0; empty.hidden = lines.length > 0;
    totalEl.textContent = `${cart.total()} USD`;
    if (held) (list.querySelector(`[data-ref="${held}"]:not([disabled])`) || list.querySelector('button') || $('cartClose')).focus({ preventScroll: true });
  }
  function renderSummary() {
    summaryEl.innerHTML = cart.lines().map((l) => `<li><span>${l.qty} × ${l.bag.name}, ${l.g} g</span><b>${l.total} USD</b></li>`).join('')
      + `<li class="cart__sum-total"><span>Total to confirm</span><b>${cart.total()} USD</b></li>`;
  }
  function show(view) {
    const checkout = view === 'checkout';
    itemsView.hidden = checkout; form.hidden = !checkout;
    title.textContent = checkout ? 'Checkout' : 'Cart';
    if (checkout) { renderSummary(); status.textContent = ''; status.className = 'frm__status'; nameIn.focus({ preventScroll: true }); }
  }

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const [id, g] = btn.closest('.cart__item').dataset.key.split('|');
    if (btn.hasAttribute('data-remove')) cart.remove(id, +g);
    else { const line = cart.lines().find((l) => l.id === id && l.g === +g); cart.setQty(id, +g, line.qty + Number(btn.dataset.step)); }
  });
  cart.onChange(() => { renderBadge(); renderList(); if (!form.hidden) { if (cart.count()) renderSummary(); else show('items'); } });

  cart.open = (from) => {
    opener = from || document.activeElement;
    show('items'); renderList();
    if (!dlg.open) dlg.showModal();
  };
  openBtn.addEventListener('click', () => cart.open(openBtn));
  $('cartClose').addEventListener('click', () => closeDialog(dlg));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg); });
  dlg.addEventListener('close', () => { if (opener && opener.isConnected) opener.focus({ preventScroll: true }); });
  $('cartBrowse').addEventListener('click', () => { opener = null; dlg.close(); document.getElementById('collection').scrollIntoView({ behavior: settings.isCalm() ? 'instant' : 'smooth' }); });
  $('cartCheckout').addEventListener('click', () => show('checkout'));
  $('checkoutBack').addEventListener('click', () => { show('items'); $('cartCheckout').focus({ preventScroll: true }); });

  /* The order, written out as it will be sent. */
  function orderText() {
    const note = noteIn.value.trim();
    return [
      'Order — YORAI',
      ...cart.lines().map((l) => `${l.qty} × ${l.bag.name} (${l.bag.process}, ${l.bag.variety}, ${l.bag.altitude}), ${l.g} g at ${l.price} USD = ${l.total} USD`),
      `Total to confirm: ${cart.total()} USD`,
      `Name: ${nameIn.value.trim()}`,
      `Email: ${emailIn.value.trim()}`,
      ...(note ? [`Note: ${note}`] : []),
    ].join('\n');
  }
  const fields = () => [
    { input: nameIn, err: $('oNameErr'), test: (v) => v.length >= 2, message: 'Please give us a name.' },
    { input: emailIn, err: $('oEmailErr'), test: isEmail, message: 'That email address doesn’t look complete.' },
  ];
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!cart.count() || !validate(fields())) return;
    const n = cart.count();
    location.href = mailto(BRAND.email, `Order: ${n} ${n === 1 ? 'bag' : 'bags'}`, orderText());
    status.textContent = `Your email app should open with the order. If it doesn’t, use “Copy summary” and send it to ${BRAND.email}.`;
    status.className = 'frm__status frm__status--ok';
  });
  $('checkoutCopy').addEventListener('click', async () => {
    if (!cart.count() || !validate(fields())) return;
    const ok = await copyText(orderText());
    status.textContent = ok ? `Summary copied. Paste it into an email to ${BRAND.email}.` : `Copying isn’t available here; the summary is: ${orderText().replaceAll('\n', ' · ')}`;
    status.className = 'frm__status' + (ok ? ' frm__status--ok' : '');
  });

  renderBadge(); renderList();
}
