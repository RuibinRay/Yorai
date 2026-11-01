/* Quick chapter shots at one size: node tests/shots.mjs [width] [height] [tier] [label] [wait] */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const [w = 1440, h = 900, tier = 'full', label = 'shot', wait = 3200] = process.argv.slice(2);
const server = spawn('python3', ['-m', 'http.server', '4175', '--bind', '127.0.0.1'], { cwd: new URL('../site', import.meta.url).pathname, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`http://127.0.0.1:4175/index.html?tier=${tier}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const lens = await page.evaluate(() => [...document.querySelectorAll('.jr__space')].map((s) => s.offsetHeight));
const fr = (process.env.FRACS || '0.45').split(',').map(Number);
for (let i = 0; i < lens.length; i++) for (const f of fr) {
  const y = lens.slice(0, i).reduce((a, b) => a + b, 0) + (i === 0 && f === 0.45 ? 10 : Math.round(lens[i] * f));
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
  await page.waitForTimeout(+wait);
  await snap(page, `tests/out/${label}-ch${i}-${f}.png`);
}
await browser.close(); server.kill();

/* SwiftShader presents frames late, so a plain screenshot shows a stale canvas. Render synchronously,
 * paint the result into the canvas host as an image, screenshot, restore. */
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
