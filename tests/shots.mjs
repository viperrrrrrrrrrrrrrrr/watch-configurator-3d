// Portfolio stills: node tests/shots.mjs  (needs `npm run preview` on :8797). Uses #hq for full quality.
import { chromium } from '/workspace/booking-demo/node_modules/playwright-core/index.mjs';
const OUT = '/workspace/watch-configurator-shots/raw';
const BASE = 'http://127.0.0.1:8797/';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const shots = [
  ['01-hero', ''],
  ['02-gold-bracelet', '?case=gold&dial=midnight&bezel=fluted&strap=bracelet&hands=gold'],
  ['03-titanium-diver', '?case=titanium&dial=emerald&bezel=diver&strap=rubber&hands=silver'],
  ['04-black-salmon', '?case=black&dial=salmon&bezel=smooth&strap=leather-black&hands=black'],
  ['05-engraving-back', '?case=steel&dial=midnight&bezel=fluted&strap=leather-navy&hands=blued&engraving=For+the+long+road', 'engraving'],
  ['06-side', '?case=gold&dial=ivory&bezel=smooth&strap=leather-cognac&hands=blued', 'side'],
];
const sizes = [[1280, 769], [1024, 768]];
async function shoot(name, q, view, w, h, dpr = 2, mobileSheet = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: 'reduce', isMobile: w < 600, hasTouch: w < 600 });
  const page = await ctx.newPage();
  // Classic 10:10 pose for the hands: shift Date only (rAF/performance untouched).
  await page.addInitScript(() => { const R = Date; const off = new R(2026, 9, 24, 10, 9, 36).getTime() - R.now();
    class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } }
    window.Date = D; });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto(BASE + q + '#hq');
  await page.waitForFunction(() => document.querySelector('[data-testid=canvas-wrap]')?.classList.contains('opacity-100'), null, { timeout: 90000 });
  await page.waitForTimeout(2500);
  if (view) { await page.click(view === 'engraving' ? 'button:has-text("View back")' : `[data-testid=view-${view}]`); await page.waitForTimeout(2500); }
  if (mobileSheet) { await page.evaluate(() => document.querySelector('aside')?.scrollTo(0, 0)); }
  // Captured with reduced motion for a still camera; flip the toggle back so the UI reads "off".
  await page.click('button:has-text("Reduce motion")'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
  console.log('ok', name);
}
const only = process.argv[2];
for (const [w, h] of sizes) for (const [name, q, view] of shots) if (!only || name.includes(only)) await shoot(`${name}-${w}x${h}`, q, view, w, h);
if (!only) await shoot('mobile-hero', '?case=gold&dial=midnight&bezel=fluted&strap=bracelet&hands=gold', '', 390, 844, 3);
if (!only) await shoot('mobile-titanium', '?case=titanium&dial=emerald&bezel=diver&strap=rubber&hands=silver', '', 390, 844, 3);
await browser.close();
