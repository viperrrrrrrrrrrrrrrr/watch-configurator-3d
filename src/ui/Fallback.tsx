import { useEffect, useState } from 'react';
import type { WatchConfig } from '../state';
import { find, strapKind } from '../state';

/** 2D SVG preview used when WebGL is unavailable (or while 3D fails). */
export function Fallback({ config }: { config: WatchConfig }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const c = find('case', config.case), d = find('dial', config.dial), h = find('hands', config.hands), s = find('strap', config.strap);
  const sec = now.getSeconds(), min = now.getMinutes() + sec / 60, hr = (now.getHours() % 12) + min / 60;
  const kind = strapKind(config.strap);
  const strapFill = kind === 'bracelet' ? 'url(#metal)' : s.swatch;
  return (
    <svg viewBox="0 0 300 420" className="h-full max-h-[80%] w-auto" role="img" aria-label="2D preview of your watch">
      <defs>
        <linearGradient id="metal" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={c.swatch} /><stop offset="0.55" stopColor={c.swatch2} /><stop offset="1" stopColor={c.swatch} /></linearGradient>
        <radialGradient id="dial" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stopColor={d.swatch} /><stop offset="1" stopColor={d.swatch2} /></radialGradient>
      </defs>
      <rect x="110" y="0" width="80" height="150" rx="10" fill={strapFill} />
      <rect x="110" y="270" width="80" height="150" rx="10" fill={strapFill} />
      {kind === 'bracelet' && [20, 50, 80, 110, 300, 330, 360, 390].map((y) => <line key={y} x1="110" x2="190" y1={y} y2={y} stroke="#0006" />)}
      <circle cx="150" cy="210" r="96" fill="url(#metal)" />
      <circle cx="150" cy="210" r="84" fill="none" stroke={config.bezel === 'diver' ? '#111' : '#0003'} strokeWidth={config.bezel === 'diver' ? 12 : 2} strokeDasharray={config.bezel === 'fluted' ? '3 3' : undefined} />
      <circle cx="150" cy="210" r="76" fill="url(#dial)" />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x="148" y="140" width="4" height="14" fill={h.swatch} transform={`rotate(${i * 30} 150 210)`} />)}
      <rect x="146.5" y="160" width="7" height="54" rx="3" fill={h.swatch} transform={`rotate(${hr * 30} 150 210)`} />
      <rect x="147.5" y="144" width="5" height="70" rx="2" fill={h.swatch} transform={`rotate(${min * 6} 150 210)`} />
      <rect x="149.3" y="140" width="1.4" height="82" fill="#e2553d" transform={`rotate(${sec * 6} 150 210)`} />
      <circle cx="150" cy="210" r="4" fill={h.swatch} />
      <rect x="244" y="200" width="14" height="20" rx="3" fill="url(#metal)" />
    </svg>
  );
}
