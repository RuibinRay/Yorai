import { COLLECTION, BRAND } from '../data/content.js?v=5';
import { validate, isEmail, mailto, copyText } from './forms.js?v=5';
import { closeDialog } from './ui.js?v=5';

/* A bag drawn in code, in the journey's cel style: one flat colour, one hard shade, one hard light, an ink line. */
function bagSVG(b) {
  const body = 'M36 70 Q36 52 54 50 L246 50 Q264 52 264 70 L270 390 Q270 406 254 406 L46 406 Q30 406 30 390 Z';
  return `
  <svg viewBox="0 0 300 420" role="img" aria-label="${b.name} bag, ${b.process} process">
    <defs><clipPath id="clip-${b.id}"><path d="${body}"/></clipPath></defs>
    <path d="${body}" fill="${b.hue}"/>
    <g clip-path="url(#clip-${b.id})">
      <path d="M208 40 C198 150 206 290 216 420 L300 420 L300 40 Z" fill="${b.ink}" opacity="0.2"/>
      <path d="M30 374 Q150 394 270 374 L270 420 L30 420 Z" fill="${b.ink}" opacity="0.14"/>
      <path d="M45 68 C41 160 39 280 41 394 L55 394 C52 280 54 160 59 68 Z" fill="#fff" opacity="0.34"/>
    </g>
    <path d="M54 50 L246 50 L240 34 Q150 22 60 34 Z" fill="${b.hue}"/>
    <path d="M150 27 Q196 28 240 34 L246 50 L150 50 Z" fill="${b.ink}" opacity="0.16"/>
    <path d="${body}" fill="none" stroke="${b.ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M54 50 L60 34 Q150 22 240 34 L246 50" fill="none" stroke="${b.ink}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="128" y="23" width="44" height="7" rx="3.5" fill="#c4985a" stroke="${b.ink}" stroke-width="2"/>
    <g fill="${b.ink}" font-family="Hanken Grotesk Variable, Arial, sans-serif">
      <text x="150" y="128" text-anchor="middle" font-family="Newsreader Display, Georgia, serif" font-size="44" letter-spacing="10" font-weight="500">YORAI</text>
      <text x="150" y="150" text-anchor="middle" font-size="11" letter-spacing="3.5">CAFÉ DE ALTURA · TARRAZÚ</text>
      <line x1="90" y1="178" x2="210" y2="178" stroke="${b.ink}" stroke-width="1" opacity="0.5"/>
      <text x="150" y="226" text-anchor="middle" font-family="Newsreader Display, Georgia, serif" font-size="30" font-style="italic">${b.name}</text>
      <text x="150" y="252" text-anchor="middle" font-size="12" letter-spacing="3">${b.process.toUpperCase()} · ${b.variety.toUpperCase()}</text>
      <text x="150" y="272" text-anchor="middle" font-size="12" letter-spacing="2" opacity="0.8">${b.altitude}</text>
      <line x1="90" y1="300" x2="210" y2="300" stroke="${b.ink}" stroke-width="1" opacity="0.5"/>
      <text x="150" y="332" text-anchor="middle" font-size="13" font-style="italic" font-family="Newsreader Display, Georgia, serif">${b.notes}</text>
      <text x="150" y="376" text-anchor="middle" font-size="10" letter-spacing="2.5" opacity="0.75">${b.sizes[0].g} G · ROAST: ${b.roast.toUpperCase()}</text>
    </g>
  </svg>`;
}

export function renderCollection() {
  const row = document.getElementById('colRow');
  row.innerHTML = COLLECTION.map((b) => `
    <article class="col__card rv" data-id="${b.id}">
      <div class="col__bag">${bagSVG(b)}</div>
      <div>
        <h3 class="col__name">${b.name}</h3>
        <p class="col__sub">${b.process} · ${b.variety} · ${b.altitude}</p>
      </div>
      <p class="col__notes">${b.notes}</p>
      <p class="col__from">From ${b.sizes[0].price} USD · ${b.sizes.map((s) => s.g + ' g').join(', ')}</p>
      <div class="col__cta"><button class="btn btn--ghost" type="button" data-reserve="${b.id}">Reserve</button></div>
    </article>`).join('');

  /* Reserve dialog */
  const dlg = document.getElementById('reserveDlg');
  const title = document.getElementById('reserveTitle');
  const sizes = document.getElementById('reserveSizes');
  const form = document.getElementById('reserveForm');
  const status = document.getElementById('reserveStatus');
  let current = null, opener = null;

  row.querySelectorAll('[data-reserve]').forEach((btn) => btn.addEventListener('click', () => {
    current = COLLECTION.find((b) => b.id === btn.dataset.reserve);
    opener = btn;
    title.textContent = current.name;
    sizes.innerHTML = current.sizes.map((s, i) => `
      <label><input type="radio" name="size" value="${s.g}" ${i === 0 ? 'checked' : ''}> ${s.g} g · ${s.price} USD</label>`).join('');
    status.textContent = ''; status.className = 'frm__status';
    form.reset();
    sizes.querySelector('input').checked = true;
    btn.closest('.col__card')?.classList.add('is-open');
    dlg.showModal();
  }));
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
