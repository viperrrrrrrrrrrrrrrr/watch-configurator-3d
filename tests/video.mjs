// Deterministic frame capture for the portfolio video: node tests/video.mjs [frames]
// Fakes the page clock (rAF/timers/Date) and steps it 1/30 s per frame, so software GL speed doesn't matter.
import { chromium } from '/workspace/booking-demo/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const OUT = '/tmp/wcv'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
const FPS = 30, MAX = +(process.argv[2] || 1e9);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.clock.install({ time: new Date(2026, 9, 24, 10, 9, 30) });
await page.goto('http://127.0.0.1:8797/?dial=midnight#hq');
for (let i = 0; i < 600; i++) {
  await page.clock.runFor(100);
  if (await page.evaluate(() => document.querySelector('[data-testid=canvas-wrap]')?.classList.contains('opacity-100'))) break;
  await page.waitForTimeout(50);
}
await page.clock.pauseAt(new Date(2026, 9, 24, 10, 10, 0)); // stop free-running; we step it manually
console.log('ready');
const cdp = await page.context().newCDPSession(page);
let f = 0;
const box = await page.locator('[data-testid=stage]').boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height * 0.55;
const frame = async () => { const t0 = Date.now(); await page.clock.runFor(1000 / FPS); const t1 = Date.now(); const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/f${String(f).padStart(4, '0')}.png`, Buffer.from(data, 'base64')); f++; if (process.env.T) console.log(t1 - t0, Date.now() - t1); if (f >= MAX) { await browser.close(); process.exit(0); } };
const hold = async (n) => { for (let i = 0; i < n; i++) await frame(); };
const drag = async (n, dx) => { await page.mouse.move(cx, cy); await page.mouse.down(); for (let i = 1; i <= n; i++) { await page.mouse.move(cx + dx * i / n, cy); await frame(); } await page.mouse.up(); };
const pick = async (k, id, n = 30) => { await page.click(`label[for="opt-${k}-${id}"]`); await hold(n); };
await hold(60);                  // intro dolly settles
await drag(75, -440);            // spin the watch by hand
await hold(15);
await pick('case', 'gold', 35);
await pick('dial', 'emerald', 30);
await pick('bezel', 'fluted', 30);
await pick('strap', 'bracelet', 40);
await pick('hands', 'silver', 20);
await drag(45, 260);
await hold(10);
await page.fill('#engraving', 'For the long road');
await hold(70);                  // fly-to the case back
await page.click('[data-testid=view-front]');
await hold(50);
console.log('frames', f);
await browser.close();
