import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, Component, type ReactNode } from 'react';
import { brand, pricing, straps } from './config';
import { breakdown, cleanEngraving, find, fromSearch, groups, money, optionKeys, shareUrl, toSearch, type OptionKey, type WatchConfig } from './state';
import { defaults } from './config';
import type { SceneHandle, View } from './scene/Scene';
import { Fallback } from './ui/Fallback';
import { Summary } from './ui/Summary';
import * as I from './ui/icons';

const Scene = lazy(() => import('./scene/Scene'));

function hasWebGL() {
  if (typeof window === 'undefined') return true;
  if (location.hash.includes('nowebgl')) return false;
  // cheap feature check only; if context creation still fails, the error boundary shows the 2D fallback
  return 'WebGLRenderingContext' in window;
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Animated number (count-up); the final value is exposed in data-value for tests. */
function Price({ value, reduced, className, testid }: { value: number; reduced: boolean; className?: string; testid?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced) { setShown(value); from.current = value; return; }
    const start = performance.now(), a = from.current, b = value;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 450), e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(a + (b - a) * e); setShown(v); from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return <span className={className} data-testid={testid} data-value={value}>{money(shown)}</span>;
}

function OptionGroup({ k, value, onChange }: { k: OptionKey; value: string; onChange: (v: string) => void }) {
  const g = groups[k];
  const sel = find(k, value);
  const leather = k === 'strap';
  return (
    <fieldset className="border-t border-line px-5 py-5 lg:px-6">
      <legend className="sr-only">{g.title}</legend>
      <div className="mb-3 flex items-baseline justify-between gap-3" aria-hidden="true">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{g.title}</span>
        <span className="truncate text-sm text-text">{sel.label}</span>
      </div>
      <div className={`grid gap-2 grid-cols-2`}>
        {g.options.map((o) => {
          const id = `opt-${k}-${o.id}`;
          const kind = leather ? straps.find((s) => s.id === o.id)!.kind : null;
          return (
            <label key={o.id} htmlFor={id}
              className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-panel2 px-3 py-2.5 transition hover:border-[#4a4e59] has-[:checked]:border-gold has-[:checked]:bg-[#221f19] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold2">
              <input id={id} type="radio" className="peer sr-only" checked={value === o.id} onChange={() => onChange(o.id)} data-testid={id}
                aria-describedby={`${id}-price`} />
              <span aria-hidden="true" className="relative size-7 shrink-0 rounded-full ring-1 ring-white/15 shadow-inner"
                style={{ background: o.swatch2 ? `linear-gradient(135deg, ${o.swatch} 0%, ${o.swatch2} 100%)` : o.swatch }}>
                {kind === 'bracelet' && <span className="absolute inset-1.5 rounded-full border border-black/40" />}
                {kind === 'rubber' && <span className="absolute inset-x-1.5 top-1/2 h-px bg-white/30" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm leading-tight text-text">{o.label}</span>
                <span id={`${id}-price`} className="block text-xs text-muted">{o.price ? `+${money(o.price)}` : 'Included'}</span>
              </span>
              <span aria-hidden="true" className="absolute right-2 top-2 hidden text-gold peer-checked:block"><I.IconCheck /></span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function App() {
  const [config, setConfig] = useState<WatchConfig>(() => (typeof window === 'undefined' ? defaults : fromSearch(location.search)));
  const [reduced, setReduced] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [view, setView] = useState<{ name: View; n: number }>({ name: 'hero', n: 0 });
  const [load3d, setLoad3d] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [summary, setSummary] = useState<{ open: boolean; shot: string | null }>({ open: false, shot: null });
  const [stageVisible, setStageVisible] = useState(true);
  const sceneRef = useRef<SceneHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { lines, total } = useMemo(() => breakdown(config), [config]);

  // reduced motion: system setting, overridable and remembered locally
  useEffect(() => {
    const saved = localStorage.getItem('wc-reduced-motion');
    setReduced(saved ? saved === '1' : matchMedia('(prefers-reduced-motion: reduce)').matches);
    // check WebGL and load the 3D scene only after the shell has painted
    const go = () => { const ok = hasWebGL(); setWebgl(ok); if (ok) setLoad3d(true); };
    const idle = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: object) => number);
    if (document.readyState === 'complete') idle ? idle(go, { timeout: 600 }) : setTimeout(go, 50);
    else addEventListener('load', () => (idle ? idle(go, { timeout: 600 }) : setTimeout(go, 50)), { once: true });
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('reduce', reduced); }, [reduced]);
  const toggleReduced = () => setReduced((r) => { localStorage.setItem('wc-reduced-motion', r ? '0' : '1'); return !r; });

  // keep the URL query string in sync (shareable config)
  useEffect(() => {
    const t = setTimeout(() => history.replaceState(null, '', location.pathname + toSearch(config) + location.hash), 200);
    return () => clearTimeout(t);
  }, [config]);

  // pause rendering when the stage is off-screen
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setStageVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el); return () => io.disconnect();
  }, []);

  const set = useCallback((k: keyof WatchConfig, v: string) => setConfig((c) => ({ ...c, [k]: v })), []);
  const goView = (name: View) => setView((v) => ({ name, n: v.n + 1 }));
  const openSummary = () => setSummary({ open: true, shot: sceneRef.current?.capture() ?? null });

  const description = `${find('case', config.case).label} case, ${find('dial', config.dial).label.toLowerCase()} dial, ${find('bezel', config.bezel).label.toLowerCase()} bezel, ${find('strap', config.strap).label.toLowerCase()}, ${find('hands', config.hands).label.toLowerCase()} hands${config.engraving ? `, engraved “${config.engraving}”` : ''}`;
  const show3d = webgl && load3d;

  return (
    <div className="flex h-full flex-col">
      <header className="contents">
      <div className="relative z-20 flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 lg:px-6">
        <a href="/" className="flex items-baseline gap-2 rounded">
          <span className="font-serif text-xl font-semibold tracking-[0.28em] text-text">VESPRYN</span>
          <span className="hidden text-[11px] uppercase tracking-[0.2em] text-muted sm:inline">Atelier</span>
        </a>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleReduced} aria-pressed={reduced}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-text hover:border-gold">
            Reduce motion: {reduced ? 'on' : 'off'}
          </button>
        </div>
      </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ---------------- 3D stage ---------------- */}
        <section ref={stageRef} aria-label="3D preview" className="stage-bg relative h-[54svh] shrink-0 overflow-hidden lg:h-auto lg:flex-1">
          <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[70%] lg:left-8 lg:top-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold2">Build your own</p>
            <h1 className="mt-1 font-serif text-3xl font-medium leading-none text-text lg:text-5xl">{brand.model}</h1>
            <p className="mt-2 hidden text-sm text-muted lg:block">40 mm automatic · hands show your local time</p>
          </div>

          <div className="absolute inset-0" role="img" aria-label={`Your watch: ${description}`} data-testid="stage">
            {!webgl ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 pt-16" data-testid="fallback">
                <Fallback config={config} />
                <p className="max-w-sm text-center text-sm text-muted">3D preview is unavailable (WebGL is off or unsupported). Every option and price still works.</p>
              </div>
            ) : (
              <>
                <div aria-hidden="true" className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}>
                  <img src="/poster.webp" alt="" width="640" height="640" fetchPriority="high" className="h-full w-auto max-w-none object-contain" />
                  <span className="sweep absolute inset-0" />
                  <span className="absolute bottom-20 rounded-full bg-black/50 px-3 py-1 text-xs text-text">Loading 3D…</span>
                </div>
                {show3d && (
                  <Boundary fallback={<div className="flex h-full items-center justify-center"><Fallback config={config} /></div>}>
                    <Suspense fallback={null}>
                      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} data-testid="canvas-wrap">
                        <Scene ref={sceneRef} config={config} view={view} reduced={reduced} autoRotate={autoRotate && !summary.open}
                          active={stageVisible && !summary.open} onReady={() => setReady(true)} onUserMove={() => {}} />
                      </div>
                    </Suspense>
                  </Boundary>
                )}
              </>
            )}
          </div>

          {/* camera controls */}
          <div className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2 px-3 lg:bottom-6">
            <p className="hidden text-xs text-muted sm:block" aria-hidden="true">Drag to rotate · scroll or pinch to zoom</p>
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/55 p-1 backdrop-blur" role="toolbar" aria-label="Camera">
              {webgl && <button type="button" className="grid size-9 place-items-center rounded-full text-text hover:bg-white/10" onClick={() => sceneRef.current?.nudge(-Math.PI / 6)} aria-label="Rotate left"><I.IconRotL /></button>}
              {(['front', 'side', 'back'] as View[]).map((v) => (
                <button key={v} type="button" onClick={() => goView(v)} disabled={!webgl} data-testid={`view-${v}`}
                  aria-pressed={view.name === v}
                  className="rounded-full px-3 py-1.5 text-sm capitalize text-text hover:bg-white/10 aria-pressed:bg-text aria-pressed:text-ink disabled:opacity-50">{v}</button>
              ))}
              {webgl && <>
                <button type="button" className="grid size-9 place-items-center rounded-full text-text hover:bg-white/10" onClick={() => sceneRef.current?.nudge(Math.PI / 6)} aria-label="Rotate right"><I.IconRotR /></button>
                <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden="true" />
                <button type="button" className="hidden size-9 place-items-center rounded-full text-text hover:bg-white/10 sm:grid" onClick={() => sceneRef.current?.nudge(0, 1.5)} aria-label="Zoom in"><I.IconPlus /></button>
                <button type="button" className="hidden size-9 place-items-center rounded-full text-text hover:bg-white/10 sm:grid" onClick={() => sceneRef.current?.nudge(0, -1.5)} aria-label="Zoom out"><I.IconMinus /></button>
                <button type="button" className="grid size-9 place-items-center rounded-full text-text hover:bg-white/10 disabled:opacity-50" onClick={() => setAutoRotate((a) => !a)}
                  aria-pressed={autoRotate && !reduced} disabled={reduced} aria-label="Idle auto-rotate" title={reduced ? 'Off while reduce motion is on' : 'Idle auto-rotate'}>
                  {autoRotate && !reduced ? <I.IconPause /> : <I.IconPlay />}
                </button>
              </>}
            </div>
          </div>
        </section>

        {/* ---------------- options: right panel (desktop) / bottom sheet (mobile) ---------------- */}
        <aside aria-label="Configure your watch"
          className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl border-t border-line bg-panel shadow-[0_-20px_60px_rgba(0,0,0,.5)] transition-[top] duration-500 lg:static lg:w-[440px] lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none ${sheet ? 'top-[12svh]' : 'top-[calc(54svh-1.25rem)]'} lg:top-auto`}>
          <button type="button" onClick={() => setSheet((s) => !s)} aria-expanded={sheet} aria-controls="options"
            className="flex w-full flex-col items-center gap-1 rounded-t-3xl pb-1 pt-2 text-xs text-muted lg:hidden">
            <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
            <span className="flex items-center gap-1">{sheet ? 'Show watch' : 'Expand options'} <I.IconChevron up={!sheet} /></span>
          </button>
          <div id="options" className="thin-scroll min-h-0 flex-1 overflow-y-auto">
            <div className="px-5 pb-4 pt-2 lg:px-6 lg:pt-6">
              <h2 className="font-serif text-2xl text-text">Configure</h2>
              <p className="mt-1 text-sm text-muted">Every change animates on the 3D model. Prices are sample prices.</p>
            </div>
            {optionKeys.map((k) => <OptionGroup key={k} k={k} value={config[k]} onChange={(v) => set(k, v)} />)}

            <div className="border-t border-line px-5 py-5 lg:px-6">
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="engraving" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Case-back engraving</label>
                <span className="text-xs text-muted">+{money(pricing.engraving.price)} if added</span>
              </div>
              <div className="flex gap-2">
                <input id="engraving" type="text" value={config.engraving} maxLength={pricing.engraving.maxLength} autoComplete="off" spellCheck={false}
                  placeholder="e.g. For the long road" aria-describedby="engraving-help"
                  onFocus={() => goView('engraving')}
                  onChange={(e) => set('engraving', cleanEngraving(e.target.value))}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-panel2 px-3 py-2.5 font-serif italic text-text placeholder:text-[#8d8a83] focus:border-gold" />
                <button type="button" onClick={() => goView('engraving')} className="shrink-0 rounded-xl border border-line px-3 text-sm text-text hover:border-gold">View back</button>
              </div>
              <p id="engraving-help" className="mt-2 text-xs text-muted">{config.engraving.length}/{pricing.engraving.maxLength} characters · letters, numbers and . , & ' - ♥</p>
            </div>

            <div className="border-t border-line px-5 py-5 lg:px-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Price breakdown</h2>
              <dl className="mt-3 space-y-2 text-sm" data-testid="breakdown">
                {lines.map((l) => (
                  <div key={l.key} className="flex justify-between gap-4" data-line={l.key} data-price={l.price}>
                    <dt className="min-w-0"><span className="text-text">{l.label}</span> <span className="text-muted">· {l.detail}</span></dt>
                    <dd className="shrink-0 tabular-nums text-text">{l.key === 'base' ? money(l.price) : l.price ? `+${money(l.price)}` : 'Included'}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold2" data-testid="sample-note">
                Sample prices ({pricing.currency}). Not a real offer — nothing can be bought here.
              </p>
            </div>

            <footer className="border-t border-line px-5 py-6 text-xs text-muted lg:px-6">
              <p data-testid="footer-credit">{brand.credit}</p>
              <p className="mt-1">“{brand.name}” is not a real company. 3D model built in code with three.js. Contact: <a className="underline hover:text-text" href={`mailto:${brand.email}`}>{brand.email}</a></p>
            </footer>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line bg-panel px-5 py-3 lg:px-6 lg:py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Sample total</p>
              <Price value={total} reduced={reduced} testid="total" className="font-serif text-2xl tabular-nums text-text" />
              <span className="sr-only" aria-live="polite">Sample total {money(total)}</span>
            </div>
            <button type="button" onClick={openSummary} data-testid="open-summary"
              className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink shadow-[0_8px_30px_rgba(217,179,108,.25)] hover:bg-gold2">
              Review your watch
            </button>
          </div>
        </aside>
      </main>

      <Summary open={summary.open} shot={summary.shot} config={config} lines={lines} total={total} description={description}
        onClose={() => setSummary({ open: false, shot: null })}
        link={typeof window === 'undefined' ? '' : shareUrl(config, location.origin)} />
    </div>
  );
}
