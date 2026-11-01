/* Visitor settings persisted under one storage prefix, all reads/writes wrapped. */
const PREFIX = 'yorai:';

export function get(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v === null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
export function set(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* private mode etc. */ }
}

export const params = new URLSearchParams(location.search);

/* Motion state. `motion`: 'auto' (follow the OS) | 'calm' | 'full'. */
export const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export function motionSetting() { return get('motion', 'auto'); }
export function isCalm() {
  const m = motionSetting();
  if (m === 'calm') return true;
  if (m === 'full') return false;
  return reduceQuery.matches;
}
export function calmReason() {
  const m = motionSetting();
  if (m === 'calm') return 'visitor setting';
  if (m === 'auto' && reduceQuery.matches) return 'OS prefers-reduced-motion';
  return 'none';
}

/* Quality tier. An explicit ?tier= is a contract and is never demoted. */
export const TIERS = ['full', 'lite', 'still', 'text'];
export function explicitTier() {
  const t = params.get('tier');
  return TIERS.includes(t) ? t : null;
}
