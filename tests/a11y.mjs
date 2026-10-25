// axe-core audit (WCAG 2.0/2.1/2.2 A+AA + best practices) on desktop and mobile, incl. dialog and expanded sheet.
import { chromium } from '/workspace/booking-demo/node_modules/playwright-core/index.mjs';
import { readFileSync } from 'node:fs';
const AXE = readFileSync('/workspace/cms-demo/scripts/node_modules/axe-core/axe.min.js', 'utf8');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8797';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let total = 0;
async function audit(page, label) {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }));
  total += r.violations.length;
  console.log(`${label}: ${r.violations.length} violations, ${r.passes.length} rules passed, ${r.incomplete.length} need review`);
  for (const v of r.violations) console.log(`  - ${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`);
}
const ready = (p) => p.waitForFunction(() => document.querySelector('[data-testid=canvas-wrap]')?.classList.contains('opacity-100'), null, { timeout: 60000 });
for (const [name, vp] of [['desktop 1440x900', { width: 1440, height: 900 }], ['mobile 390x844', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
  await page.goto(BASE + '/?engraving=Hello');
  await ready(page); await page.waitForTimeout(1500);
  await audit(page, `${name} — configurator`);
  if (vp.isMobile) { await page.click('button[aria-controls=options]'); await page.waitForTimeout(600); await audit(page, `${name} — options sheet expanded`); }
  await page.click('[data-testid=open-summary]'); await page.waitForTimeout(600);
  await page.click('[data-testid=reserve-submit]'); await page.waitForTimeout(300);
  await audit(page, `${name} — summary dialog + demo form`);
  await page.close();
  const fb = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await fb.goto(BASE + '/#nowebgl'); await fb.waitForSelector('[data-testid=fallback]');
  await audit(fb, `${name} — no-WebGL fallback`);
  await fb.close();
}
await browser.close();
console.log(`\nTotal axe violations: ${total}`);
process.exit(total ? 1 : 0);
