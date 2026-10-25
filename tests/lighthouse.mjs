// Lighthouse (mobile + desktop) using the Lighthouse install in /workspace/cms-demo/scripts.
// Usage: node tests/lighthouse.mjs [baseUrl]
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8797/';
const LH = '/workspace/cms-demo/scripts/node_modules/lighthouse/cli/index.js';
const out = new URL('../reports/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
for (const mode of ['mobile', 'desktop']) {
  const args = [LH, BASE, '--quiet', '--output=json', '--output=html', `--output-path=${out}lighthouse-${mode}`,
    '--chrome-flags=--headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist', '--only-categories=performance,accessibility,best-practices,seo'];
  if (mode === 'desktop') args.push('--preset=desktop');
  execFileSync(process.execPath, args, { env: { ...process.env, CHROME_PATH: '/usr/bin/google-chrome' }, stdio: 'inherit' });
  const r = JSON.parse(readFileSync(`${out}lighthouse-${mode}.report.json`, 'utf8'));
  const sc = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const m = (id) => r.audits[id]?.displayValue;
  console.log(mode, sc, `FCP ${m('first-contentful-paint')} · LCP ${m('largest-contentful-paint')} · TBT ${m('total-blocking-time')} · CLS ${m('cumulative-layout-shift')}`);
  for (const [k, v] of Object.entries(r.categories)) for (const ref of v.auditRefs) { const a = r.audits[ref.id]; if (ref.weight > 0 && a.score !== null && a.score < 0.9) console.log('   ', k, ref.id, a.score, a.displayValue || ''); }
}
