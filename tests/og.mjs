/* Renders assets/og.png (1200×630) from the live hero scene. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('python3', ['-m', 'http.server', '4179', '--bind', '127.0.0.1'], { cwd: 'site', stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:4179/index.html?tier=full', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.evaluate(() => { ['#hdr', '#rail', '#scrollcue', '#pause', '.jr__progress'].forEach((s) => document.querySelector(s)?.style.setProperty('display', 'none')); const Y = window.__yorai; Y.renderAt(0.12); const host = document.getElementById('canvasHost'); host.style.backgroundImage = `url(${Y.renderer.domElement.toDataURL('image/png')})`; host.style.backgroundSize = 'cover'; Y.renderer.domElement.style.visibility = 'hidden'; });
await page.screenshot({ path: 'site/assets/og.png' });
await browser.close(); server.kill();
