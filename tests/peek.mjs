// Quick visual check: node tests/peek.mjs [query] [out.png] [view] [w] [h]
import { chromium } from '/workspace/booking-demo/node_modules/playwright-core/index.mjs';
const [q = '', out = '/tmp/wc-peek.png', view = '', w = '1440', h = '900'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.log('console:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://127.0.0.1:8797/' + q);
await page.waitForFunction(() => document.querySelector('[data-testid=canvas-wrap]')?.classList.contains('opacity-100'), null, { timeout: 60000 });
await page.waitForTimeout(3500);
if (view) { await page.click(`[data-testid=view-${view}]`); await page.waitForTimeout(2500); }
await page.screenshot({ path: out });
await browser.close();
