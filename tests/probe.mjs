/* Headless sweep: console errors, overflow, screenshots per chapter and section at three widths,
 * interaction checks (menu filter, map pins, reserve dialog, contact validation, motion toggle).
 * Run: node tests/probe.mjs  (serves ./site on :4173)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = 4173;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: new URL('../site', import.meta.url).pathname, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const OUT = new URL('../tests/out/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${PORT}/index.html`;
const report = { errors: [], warnings: [], checks: [] };
const check = (name, ok, info = '') => { report.checks.push({ name, ok, info }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ' — ' + info : ''}`); };

async function snap(page, path) {
  const swapped = await page.evaluate(() => {
    const Y = window.__yorai; if (!Y) return false;
    Y.renderAt(Y.state.jt);
    const host = document.getElementById('canvasHost');
    host.style.backgroundImage = `url(${Y.renderer.domElement.toDataURL('image/png')})`;
    host.style.backgroundSize = 'cover'; Y.renderer.domElement.style.visibility = 'hidden'; return true;
  });
  await page.screenshot({ path });
  if (swapped) await page.evaluate(() => { const host = document.getElementById('canvasHost'); host.style.backgroundImage = ''; window.__yorai.renderer.domElement.style.visibility = ''; });
}
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function sweep(width, height, tier, label) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(`[${label}] ${m.text()}`); if (m.type() === 'warning') report.warnings.push(`[${label}] ${m.text()}`); });
  page.on('pageerror', (e) => report.errors.push(`[${label}] pageerror ${e.message}`));
  await page.goto(`${base}?tier=${tier}&why`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const ready = await page.evaluate(() => document.querySelector('#journey').className);
  check(`${label}: journey classes`, true, ready);
  // overflow
  const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(`${label}: no horizontal overflow`, ov.sw <= ov.cw + 1, `${ov.sw} vs ${ov.cw}`);
  // chapters
  const lens = await page.evaluate(() => [...document.querySelectorAll('.jr__space')].map((s) => s.offsetHeight));
  const jrTop = await page.evaluate(() => document.getElementById('journey').offsetTop);
  for (let i = 0; i < lens.length; i++) {
    const y = jrTop + lens.slice(0, i).reduce((a, b) => a + b, 0) + (i === 0 ? 10 : Math.round(lens[i] * 0.45));
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
    // wait until the driver has processed the scroll (the lab's software GPU can block the main thread)
    await page.waitForFunction((i) => Number(document.querySelector('#stage').dataset.chapter) === i, i, { timeout: 30000 }).catch(() => {}); // a first visit to a chapter builds its scene and compiles its shaders, which takes the software GPU many seconds
    await page.waitForTimeout(tier === 'still' ? 500 : 900);
    const st = await page.evaluate(() => ({ y: scrollY, chapter: document.querySelector('#stage').dataset.chapter, jt: getComputedStyle(document.querySelector('#stage')).getPropertyValue('--jt') }));
    await snap(page, `${OUT}${label}-ch${i}.png`);
    if (i > 0) {
      const vis = await page.evaluate((i) => { const el = document.querySelectorAll('.jr__copy')[i - 1]; const r = el.getBoundingClientRect(); return { op: parseFloat(getComputedStyle(el).opacity), vis: getComputedStyle(el).visibility, inView: r.top >= 0 && r.bottom <= innerHeight + 2, w: r.width, text: el.textContent.slice(0, 30) }; }, i);
      check(`${label}: chapter ${i} copy visible mid-chapter`, vis.op > 0.9 && vis.vis === 'visible' && vis.inView, JSON.stringify(vis));
    }
    check(`${label}: chapter ${i} driver state`, String(st.chapter) === String(i), JSON.stringify(st));
  }
  // sections
  for (const id of ['menu', 'collection', 'story', 'origins', 'contact']) {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView({ behavior: 'instant', block: 'start' }), id);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}${label}-${id}.png` });
  }
  const why = await page.evaluate(() => document.querySelector('.why')?.textContent);
  console.log(`[${label}] ?why →\n${why}`);
  await ctx.close();
}

await sweep(1440, 900, 'full', 'desktop');
await sweep(390, 844, 'lite', 'phone');
await sweep(820, 1180, 'still', 'tablet-still');

/* Interactions at desktop */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`${base}?tier=still`, { waitUntil: 'networkidle' });
  // menu filter
  await page.click('#cupFilters button:has-text("Natural")');
  const shown = await page.evaluate(() => [...document.querySelectorAll('.cup__item')].filter((li) => !li.hidden).length);
  check('menu filter Natural shows 2', shown === 2, String(shown));
  check('menu count text', (await page.textContent('#cupCount')).includes('2 of 8'), await page.textContent('#cupCount'));
  // map pins
  await page.click('#orgList button:has-text("Brunca")');
  check('map list selects Brunca', (await page.textContent('#orgPanel h3')) === 'Brunca');
  const pinOn = await page.evaluate(() => document.querySelector('.org__pin.is-on')?.dataset.id);
  check('map pin follows list', pinOn === 'brunca', String(pinOn));
  // click a pin by elementFromPoint at its centre
  const hit = await page.evaluate(() => { const pin = document.querySelector('.org__pin[data-id="guanacaste"]'); pin.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = pin.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return pin.contains(el); });
  check('map pin is hit-testable at its centre', hit);
  await page.click('.org__pin[data-id="guanacaste"]');
  check('map pin click selects Guanacaste', (await page.textContent('#orgPanel h3')) === 'Guanacaste');
  // reserve dialog
  await page.evaluate(() => document.querySelector('[data-reserve="cerro-alto"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  // let the cards' staggered reveal finish, or Playwright's own scroll-into-view may nudge the page by a pixel mid-transition
  await page.waitForFunction(() => [...document.querySelectorAll('.col__card')].every((c) => c.classList.contains('is-in')), null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(900);
  const before = await page.evaluate(() => scrollY);
  await page.click('[data-reserve="cerro-alto"]');
  await page.waitForTimeout(200);
  const open = await page.evaluate(() => document.getElementById('reserveDlg').open);
  check('reserve dialog opens', open);
  check('reserve dialog does not scroll the page', Math.abs((await page.evaluate(() => scrollY)) - before) < 2);
  await page.click('#reserveForm button[type=submit]');
  const err = await page.textContent('#rNameErr');
  check('reserve validation shows an error', err.length > 0, err);
  await page.fill('#rName', 'Ray'); await page.fill('#rEmail', 'ray@example.com');
  await page.click('#reserveCopy');
  await page.waitForTimeout(200);
  const status = await page.textContent('#reserveStatus');
  check('reserve copy summary gives feedback', status.length > 0, status);
  await page.keyboard.press('Escape');
  check('Escape closes dialog', !(await page.evaluate(() => document.getElementById('reserveDlg').open)));
  check('focus returns to opener', await page.evaluate(() => document.activeElement?.dataset.reserve === 'cerro-alto'));
  // contact validation
  await page.click('#ctcForm button[type=submit]');
  check('contact validation shows an error', (await page.textContent('#cNameErr')).length > 0);
  // motion toggle persists
  await page.click('#motionToggle');
  check('motion toggle sets calm', await page.evaluate(() => document.documentElement.classList.contains('is-calm')));
  await page.reload({ waitUntil: 'networkidle' });
  check('calm persists across reload', await page.evaluate(() => document.documentElement.classList.contains('is-calm')));
  await page.click('#motionToggle');
  check('motion toggle restores', !(await page.evaluate(() => document.documentElement.classList.contains('is-calm'))));
  // keyboard: tab reaches the rail and header links
  await page.goto(`${base}?tier=still`, { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement.className);
  check('first Tab lands on the skip link', first === 'skip', first);
  check('no errors during interactions', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* Reduced-motion session: the notice appears and the override works */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${base}?tier=full`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  check('reduced motion → calm', await page.evaluate(() => document.documentElement.classList.contains('is-calm')));
  check('reduced motion → notice shown', await page.evaluate(() => !document.getElementById('motionNotice').hidden));
  await page.click('#motionOn');
  check('notice override turns motion on', !(await page.evaluate(() => document.documentElement.classList.contains('is-calm'))));
  await ctx.close();
}

/* The look panel: opens, switches look and detail live, remembers them, closes on Escape */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${base}?tier=lite`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__yorai && !document.getElementById('lookBtn').hidden, null, { timeout: 30000 }).catch(() => {});
  check('look button appears once the scene is ready', await page.evaluate(() => !document.getElementById('lookBtn').hidden));
  await page.click('#lookBtn');
  check('look panel opens with focus on the current style', await page.evaluate(() => !document.getElementById('lookPanel').hidden && document.activeElement?.value === 'anime'));
  await page.keyboard.press('ArrowRight');
  check('arrow key moves to the next style and applies it', await page.evaluate(() => window.__yorai.state.look === 'pastel'));
  await page.click('#lookStyles label:has-text("Manga")');
  check('choosing Manga sets and stores the look', await page.evaluate(() => window.__yorai.state.look === 'manga' && localStorage.getItem('yorai:look') === '"manga"'));
  await page.click('#lookDetails label:has-text("Light")');
  check('choosing Light sets the detail', await page.evaluate(() => window.__yorai.state.detail === 'light'));
  check('the panel never scrolls the page', (await page.evaluate(() => scrollY)) === 0);
  await page.keyboard.press('Escape');
  check('Escape closes the look panel and returns focus', await page.evaluate(() => document.getElementById('lookPanel').hidden && document.activeElement?.id === 'lookBtn'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__yorai, null, { timeout: 30000 }).catch(() => {});
  check('look and detail persist across reload', await page.evaluate(() => window.__yorai.state.look === 'manga' && window.__yorai.state.detail === 'light'));
  check('no errors with the look panel', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await browser.close();
server.kill();
writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 2));
console.log(`\nerrors: ${report.errors.length}`); report.errors.forEach((e) => console.log('  ' + e));
console.log(`warnings: ${report.warnings.length}`); report.warnings.slice(0, 10).forEach((e) => console.log('  ' + e));
const fails = report.checks.filter((c) => !c.ok).length;
console.log(`checks: ${report.checks.length - fails}/${report.checks.length} passed`);
process.exit(fails || report.errors.length ? 1 : 0);
