/* axe-core at every chapter, every section, and with every dialog and panel open: reserve, nav sheet, look,
 * the product detail (a bag and a coffee), the cart and its checkout, compare, and the opened gift box. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const server = spawn('python3', ['-m', 'http.server', '4177', '--bind', '127.0.0.1'], { cwd: 'site', stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();
let total = 0;
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://127.0.0.1:4177/index.html?tier=still', { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: axe });
  const run = async (label) => {
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'] } }));
    const v = r.violations.filter((x) => x.impact !== 'minor');
    total += v.length;
    console.log(`${w}px ${label}: ${v.length} violations`);
    v.forEach((x) => console.log(`   - ${x.id} (${x.impact}): ${x.help} → ${x.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`));
  };
  const lens = await page.evaluate(() => [...document.querySelectorAll('.jr__space')].map((s) => s.offsetHeight));
  for (let i = 0; i < 6; i++) { await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), lens.slice(0, i).reduce((a, b) => a + b, 0) + lens[i] * 0.45); await page.waitForTimeout(300); await run('chapter ' + i); }
  for (const id of ['menu', 'collection', 'story', 'origins', 'contact']) { await page.evaluate((id) => document.getElementById(id).scrollIntoView({ behavior: 'instant' }), id); await page.waitForTimeout(1300); await run(id); }
  await page.click('[data-reserve="neblina"]'); await page.waitForTimeout(200); await run('reserve dialog open'); await page.keyboard.press('Escape');
  if (w < 900) { await page.click('#menuOpen'); await page.waitForTimeout(200); await run('nav sheet open'); await page.keyboard.press('Escape'); }
  // the shop's states
  const at = async (sel) => { await page.evaluate((s) => document.querySelector(s).scrollIntoView({ behavior: 'instant', block: 'center' }), sel); await page.waitForTimeout(1300); };
  await at('#colRow'); await page.click('#colRow [data-open="neblina"]'); await page.waitForTimeout(700); await run('bag detail open');
  await page.click('#pdBuy button[type=submit]'); await page.click('.pd__link'); await page.waitForTimeout(700); await run('cart open');
  await page.click('#cartCheckout'); await page.click('#checkoutForm button[type=submit]'); await page.waitForTimeout(400); await run('checkout with errors');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await at('#giftBox'); await page.click('#boxToggle'); await page.waitForTimeout(1200); await run('gift box open');
  await at('#cupList'); await page.click('#cupList [data-open="geisha-de-altura"]'); await page.waitForTimeout(700); await run('coffee detail open');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.click('[data-compare="aurora"]'); await page.click('[data-compare="cortado"]'); await run('compare bar shown');
  await page.click('#cmpOpen'); await page.waitForTimeout(600); await run('compare open');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  // the look panel belongs to the live scene; on this still tier it is shown by hand so its markup and contrast are checked
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(400);
  await page.evaluate(() => { const b = document.getElementById('lookBtn'); b.hidden = false; b.click(); }); await page.waitForTimeout(400); await run('look panel open');
  await page.close();
}
await browser.close(); server.kill();
console.log('total violations:', total);
process.exit(total ? 1 : 0);
