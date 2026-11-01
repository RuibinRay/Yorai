/* Shared form helpers: validation in text next to the field, mailto composition. */
export function validate(fields) {
  let ok = true, first = null;
  fields.forEach(({ input, err, test, message }) => {
    const bad = !test(input.value.trim());
    input.setAttribute('aria-invalid', String(bad));
    err.textContent = bad ? message : '';
    if (bad) { ok = false; first ??= input; }
  });
  if (first) first.focus();
  return ok;
}
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export function mailto(to, subject, body) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
