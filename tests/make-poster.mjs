// Renders the default configuration and saves the raw canvas capture for public/poster.webp
import { chromium } from '/workspace/booking-demo/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.addInitScript(() => localStorage.setItem('wc-reduced-motion', '1'));
await page.goto('http://127.0.0.1:8797/');
await page.waitForFunction(() => document.querySelector('[data-testid=canvas-wrap]')?.classList.contains('opacity-100'), null, { timeout: 60000 });
await page.waitForTimeout(3000);
await page.click('[data-testid=open-summary]');
const src = await page.getAttribute('[data-testid=summary] img', 'src');
writeFileSync('/tmp/wc-capture.webp', Buffer.from(src.split(',')[1], 'base64'));
await browser.close();
