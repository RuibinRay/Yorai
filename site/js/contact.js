import { BRAND } from '../data/content.js?v=7';
import { validate, isEmail, mailto } from './forms.js?v=7';

export function renderContact() {
  document.getElementById('ctcDetails').innerHTML = `
    <dl>
      <div><dt>Tasting room</dt><dd>${BRAND.address}</dd></div>
      <div><dt>Hours</dt><dd>${BRAND.hours}</dd></div>
      <div><dt>Email</dt><dd><a href="mailto:${BRAND.email}">${BRAND.email}</a></dd></div>
      <div><dt>Phone</dt><dd><a href="tel:${BRAND.phone.replace(/\s/g, '')}">${BRAND.phone}</a></dd></div>
    </dl>
    <p>Visits are by appointment so that someone from the family can walk you through the rows and the mill. Write to us with a date and we’ll reply within two days.</p>`;

  const form = document.getElementById('ctcForm');
  const status = document.getElementById('ctcStatus');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = validate([
      { input: form.name, err: document.getElementById('cNameErr'), test: (v) => v.length >= 2, message: 'Please give us a name.' },
      { input: form.email, err: document.getElementById('cEmailErr'), test: isEmail, message: 'That email address doesn’t look complete.' },
      { input: form.message, err: document.getElementById('cMsgErr'), test: (v) => v.length >= 10, message: 'A sentence or two helps us answer well.' },
    ]);
    if (!ok) return;
    const body = `${form.message.value.trim()}\n\n— ${form.name.value.trim()} (${form.email.value.trim()})`;
    location.href = mailto(BRAND.email, `${form.topic.value} — YORAI website`, body);
    status.textContent = 'Your email app should open with the message. If it doesn’t, write to ' + BRAND.email + ' directly.';
    status.className = 'frm__status frm__status--ok';
  });
}
