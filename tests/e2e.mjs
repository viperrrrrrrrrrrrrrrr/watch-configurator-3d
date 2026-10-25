// End-to-end checks against the built site (npm run build && npm run preview).
// Prices are computed here straight from src/config.ts, independently of the app code.
import { chromium } from '/workspace/booking-demo/node_modules/playwright-core/index.mjs';
import * as cfg from '../src/config.ts';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8797';
const ARGS = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const lists = { case: cfg.caseMaterials, dial: cfg.dials, bezel: cfg.bezels, strap: cfg.straps, hands: cfg.handColors };
const expected = (c) => cfg.pricing.basePrice + Object.keys(lists).reduce((s, k) => s + lists[k].find((o) => o.id === c[k]).price, 0) + (c.engraving ? cfg.pricing.engraving.price : 0);

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ARGS });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [], external = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });

const ready = () => page.waitForFunction(() => document.querySelector('[data-testid=canvas-wrap]')?.classList.contains('opacity-100'), null, { timeout: 60000 });
const total = async () => Number(await page.getAttribute('[data-testid=total]', 'data-value'));
const pick = async (k, id) => { await page.click(`label[for="opt-${k}-${id}"]`); };

await page.goto(BASE + '/');
check('demo banner shows the credit', (await page.textContent('[data-testid=demo-banner]')).includes('Demo website by Ivan Litvin · fictional brand, sample prices'));
check('footer shows the credit', (await page.textContent('[data-testid=footer-credit]')).includes('Demo website by Ivan Litvin · fictional brand, sample prices'));
check('sample-price note visible', await page.isVisible('[data-testid=sample-note]'));
check('prerendered shell has the h1 before JS', (await (await fetch(BASE + '/')).text()).includes('V-40 Meridian</h1>'));
await ready();
await page.waitForTimeout(2500);

// non-blank canvas: analyse a capture of the WebGL canvas
await page.click('[data-testid=open-summary]');
const stats = await page.evaluate(async () => {
  const img = document.querySelector('[data-testid=summary] img');
  await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let opaque = 0; const colors = new Set();
  for (let i = 0; i < d.length; i += 16) { if (d[i + 3] > 200) { opaque++; colors.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | d[i + 2] >> 3); } }
  return { w: c.width, h: c.height, opaqueShare: opaque / (d.length / 16), colors: colors.size };
});
check('3D canvas renders a non-blank watch', stats.opaqueShare > 0.08 && stats.colors > 300, JSON.stringify(stats));
await page.keyboard.press('Escape');

// prices follow the config
let c = { ...cfg.defaults };
check('default total = base price', (await total()) === expected(c), `${await total()} vs ${expected(c)}`);
const combos = [
  { case: 'gold', dial: 'ivory', bezel: 'fluted', strap: 'bracelet', hands: 'blued' },
  { case: 'black', dial: 'onyx', bezel: 'diver', strap: 'rubber', hands: 'gold' },
  { case: 'titanium', dial: 'salmon', bezel: 'smooth', strap: 'leather-olive', hands: 'black' },
];
for (const combo of combos) {
  for (const [k, id] of Object.entries(combo)) await pick(k, id);
  c = { ...c, ...combo };
  await page.waitForTimeout(100);
  const t = await total();
  const lines = await page.$$eval('[data-testid=breakdown] [data-line]', (els) => els.map((e) => [e.dataset.line, Number(e.dataset.price)]));
  const lineSum = lines.reduce((s, [, p]) => s + p, 0);
  const caseLine = lines.find(([k]) => k === 'case')?.[1];
  check(`total for ${Object.values(combo).join('/')}`, t === expected(c) && lineSum === t && caseLine === cfg.caseMaterials.find((o) => o.id === combo.case).price, `${t} vs ${expected(c)}, lines ${lineSum}`);
}
await page.fill('#engraving', 'For the long road');
c.engraving = 'For the long road';
await page.waitForTimeout(150);
check('engraving adds its config price', (await total()) === expected(c) && (await page.$('[data-testid=breakdown] [data-line=engraving]')) !== null);
await page.fill('#engraving', 'x'.repeat(40));
check(`engraving is limited to ${cfg.pricing.engraving.maxLength} characters`, (await page.inputValue('#engraving')).length === cfg.pricing.engraving.maxLength);
await page.fill('#engraving', 'For the long road');

// URL round-trip
await page.waitForTimeout(500);
const search = await page.evaluate(() => location.search);
const params = Object.fromEntries(new URLSearchParams(search));
check('URL query reflects the configuration', Object.keys(lists).every((k) => (params[k] ?? cfg.defaults[k]) === c[k]) && params.engraving === c.engraving, search);
const p2 = await ctx.newPage();
await p2.goto(BASE + '/' + search);
const checkedOk = await Promise.all(Object.keys(lists).map((k) => p2.isChecked(`#opt-${k}-${c[k]}`)));
check('opening the shared URL restores every option', checkedOk.every(Boolean) && (await p2.inputValue('#engraving')) === c.engraving);
check('restored page has the same total', Number(await p2.getAttribute('[data-testid=total]', 'data-value')) === expected(c));
await p2.goto(BASE + '/?case=unobtainium&dial=ivory&strap=%3Cscript%3E');
check('invalid URL values fall back to defaults', (await p2.isChecked('#opt-case-steel')) && (await p2.isChecked('#opt-dial-ivory')) && (await p2.isChecked(`#opt-strap-${cfg.defaults.strap}`)));
await p2.close();

// summary + share link + demo reserve form
await page.click('[data-testid=open-summary]');
check('summary dialog opens', await page.isVisible('[data-testid=summary]'));
check('summary total matches', Number(await page.getAttribute('[data-testid=summary-total]', 'data-value')) === expected(c));
const link = await page.inputValue('[data-testid=share-link]');
const lp = new URL(link).searchParams;
check('share link encodes the full configuration', Object.keys(lists).every((k) => lp.get(k) === c[k]) && lp.get('engraving') === c.engraving, link);
const form = await page.$('[data-testid=reserve-form]');
check('form has no action and no named fields', (await form.getAttribute('action')) === null && (await page.$$('[data-testid=reserve-form] [name]')).length === 0);
await page.fill('#r-name', 'Test Person');
await page.fill('#r-email', 'test@example.com');
const before = page.url();
const reqs = [];
const onReq = (r) => { if (!r.url().startsWith('data:')) reqs.push(r.method() + ' ' + r.url()); };
page.on('request', onReq);
await page.click('[data-testid=reserve-submit]');
await page.waitForTimeout(1500);
page.off('request', onReq);
check('reserve submit makes no network requests', reqs.length === 0, reqs.join(', '));
check('reserve shows the "demo — not sent" message', (await page.textContent('[data-testid=reserve-status]')).includes('not sent'));
check('page did not navigate', page.url() === before);
await page.keyboard.press('Escape');
check('summary closes with Escape', !(await page.isVisible('[data-testid=summary]')));

// keyboard
await page.focus('#opt-case-steel');
await page.keyboard.press('ArrowRight');
check('arrow keys move between radio options', await page.isChecked('#opt-case-black'));
// camera presets don't throw
for (const v of ['side', 'back', 'front']) await page.click(`[data-testid=view-${v}]`);
await page.click('button[aria-pressed]:has-text("Reduce motion")');
check('reduce-motion toggle applies', await page.evaluate(() => document.documentElement.classList.contains('reduce')));

// WebGL fallback
const p3 = await ctx.newPage();
await p3.goto(BASE + '/#nowebgl');
await p3.waitForSelector('[data-testid=fallback]');
await p3.click('label[for="opt-case-gold"]');
check('no-WebGL fallback shows 2D preview and prices still work', (await p3.isVisible('[data-testid=fallback] svg')) && Number(await p3.getAttribute('[data-testid=total]', 'data-value')) === expected({ ...cfg.defaults, case: 'gold' }));
await p3.close();

// mobile bottom sheet
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await m.goto(BASE + '/');
const sheetBtn = m.locator('button[aria-controls=options]');
check('mobile: options sheet toggle exists', await sheetBtn.isVisible());
await sheetBtn.click();
check('mobile: sheet expands', (await sheetBtn.getAttribute('aria-expanded')) === 'true');
await m.close();

check('no console errors', errors.length === 0, errors.join(' | '));
check('no requests to other origins', external.length === 0, external.join(', '));
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
