// Dev helper: list long tasks during load with 4x CPU throttling (approximates Lighthouse mobile TBT).
import { chromium } from '/workspace/booking-demo/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 412, height: 823 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.argv[2] || 4) });
await page.addInitScript(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }); });
await page.goto('http://127.0.0.1:8797/');
await page.waitForTimeout(12000);
const lt = await page.evaluate(() => window.__lt);
const tbt = lt.reduce((s, [, d]) => s + Math.max(0, d - 50), 0);
console.log(JSON.stringify(lt), 'TBT~', tbt, 'eco', await page.getAttribute('canvas', 'data-eco').catch(() => '?'));
await browser.close();
