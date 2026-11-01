/* Contrast test over the token file: every text/background pair that the stylesheet uses. */
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../site/css/tokens.css', import.meta.url), 'utf8');
const tok = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
const pairs = [
  ['ink', 'paper', 4.5], ['ink-muted', 'paper', 4.5], ['brass-ink', 'paper', 4.5], ['cherry-ink', 'paper', 4.5], ['ink', 'paper-2', 4.5], ['ink-muted', 'paper-2', 4.5],
  ['cream', 'espresso', 4.5], ['cream-muted', 'espresso', 4.5], ['crema', 'espresso', 4.5], ['brass', 'espresso', 3], ['cream', 'espresso-2', 4.5], ['cream-muted', 'espresso-2', 4.5],
  ['cherry', 'espresso', 3], ['mist', 'espresso', 4.5],
];
let fail = 0;
for (const [fg, bg, min] of pairs) { const r = ratio(tok[fg], tok[bg]); const ok = r >= min; if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${fg} on ${bg}: ${r.toFixed(2)}:1 (min ${min})`); }
// journey accents as kicker text on the darkest stage colour
for (const [name, hex] of Object.entries({ plantation: '#a7bdb8', harvest: '#e0564f', mill: '#e2b15c', roast: '#ff7a2f', brew: '#c88a4e', cup: '#e8c88a' })) { const r = ratio(hex, '#0a0806'); const ok = r >= 4.5; if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  accent ${name} on stage scrim: ${r.toFixed(2)}:1`); }
process.exit(fail ? 1 : 0);
