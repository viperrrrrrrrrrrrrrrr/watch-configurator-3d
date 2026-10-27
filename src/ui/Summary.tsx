import { useEffect, useRef, useState } from 'react';
import { brand, pricing } from '../config';
import { find, groups, money, optionKeys, type Line, type WatchConfig } from '../state';
import * as I from './icons';

type Props = { open: boolean; shot: string | null; config: WatchConfig; lines: Line[]; total: number; description: string; link: string; onClose: () => void };

export function Summary({ open, shot, config, lines, total, description, link, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) { d.showModal(); setSent(false); setCopied(''); }
    if (!open && d.open) d.close();
  }, [open]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied('Link copied to clipboard.'); }
    catch { (document.getElementById('share-link') as HTMLInputElement)?.select(); setCopied('Press Ctrl+C / ⌘C to copy the selected link.'); }
  };

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="summary-title" data-testid="summary"
      className="m-auto max-h-[92svh] w-[min(980px,94vw)] overflow-y-auto rounded-3xl border border-line bg-panel p-0 text-text shadow-2xl thin-scroll">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel/95 px-5 py-4 backdrop-blur lg:px-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-gold2">{brand.name} {brand.model}</p>
          <h2 id="summary-title" className="font-serif text-2xl">Your watch</h2>
        </div>
        <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border border-line hover:border-gold" aria-label="Close summary"><I.IconX /></button>
      </div>

      <div className="grid gap-8 px-5 py-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div>
          <div className="stage-bg grid aspect-square place-items-center overflow-hidden rounded-2xl">
            {shot ? <img src={shot} alt={`Rendered preview: ${description}`} className="h-full w-full object-cover" />
              : <p className="px-6 text-center text-sm text-muted">{description}</p>}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {optionKeys.map((k) => (
              <div key={k}><dt className="text-xs uppercase tracking-[0.16em] text-muted">{groups[k].title}</dt><dd>{find(k, config[k]).label}</dd></div>
            ))}
            <div><dt className="text-xs uppercase tracking-[0.16em] text-muted">Engraving</dt><dd className="font-serif italic">{config.engraving ? `“${config.engraving}”` : 'None'}</dd></div>
          </dl>
        </div>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="sum-price">
            <h3 id="sum-price" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Itemized sample price</h3>
            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">Price breakdown</caption>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key} className="border-b border-line/70">
                    <th scope="row" className="py-2 text-left font-normal">{l.label} <span className="text-muted">· {l.detail}</span></th>
                    <td className="py-2 text-right tabular-nums">{l.key === 'base' ? money(l.price) : l.price ? `+${money(l.price)}` : 'Included'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th scope="row" className="pt-3 text-left font-serif text-lg font-normal">Sample total</th><td className="pt-3 text-right font-serif text-2xl tabular-nums" data-testid="summary-total" data-value={total}>{money(total)}</td></tr>
              </tfoot>
            </table>
            <p className="mt-2 text-xs text-gold2">Sample prices in {pricing.currency} for a fictional brand. Not a real offer.</p>
          </section>

          <section aria-labelledby="sum-share">
            <h3 id="sum-share" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Share this configuration</h3>
            <div className="mt-2 flex gap-2">
              <label htmlFor="share-link" className="sr-only">Shareable link</label>
              <input id="share-link" readOnly value={link} data-testid="share-link" onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 rounded-xl border border-line bg-panel2 px-3 py-2 text-xs text-text" />
              <button type="button" onClick={copy} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-sm hover:border-gold"><I.IconLink /> Copy</button>
            </div>
            <p className="mt-1 min-h-4 text-xs text-muted" role="status">{copied}</p>
          </section>

          <section aria-labelledby="sum-reserve" className="rounded-2xl border border-line bg-panel2 p-4">
            <h3 id="sum-reserve" className="font-serif text-xl">Reserve <span className="text-sm text-muted">(demo)</span></h3>
            <p className="mt-1 text-xs text-muted">This is a demo form. It has no backend and sends nothing — your input never leaves this page.</p>
            {/* No action, no method, no name attributes: nothing can be submitted anywhere. */}
            <form className="mt-4 grid gap-3" data-testid="reserve-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="r-name" className="mb-1 block text-xs text-muted">Name</label>
                  <input id="r-name" type="text" required autoComplete="off" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm focus:border-gold" />
                </div>
                <div>
                  <label htmlFor="r-email" className="mb-1 block text-xs text-muted">Email</label>
                  <input id="r-email" type="email" required autoComplete="off" placeholder="you@example.com" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm placeholder:text-[#8d8a83] focus:border-gold" />
                </div>
              </div>
              <div>
                <label htmlFor="r-wrist" className="mb-1 block text-xs text-muted">Wrist size</label>
                <select id="r-wrist" defaultValue="17" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm focus:border-gold">
                  {[15, 16, 17, 18, 19, 20].map((n) => <option key={n} value={n}>{n} cm</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="r-note" className="mb-1 block text-xs text-muted">Note (optional)</label>
                <textarea id="r-note" rows={2} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm focus:border-gold" />
              </div>
              <button type="submit" data-testid="reserve-submit" className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink hover:bg-gold2">
                Reserve for {money(total)} (demo)
              </button>
              <p role="status" data-testid="reserve-status" className={sent ? 'rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold2' : 'sr-only'}>
                {sent ? 'Demo — reservation not sent. This portfolio demo has no backend, so nothing left your browser.' : ''}
              </p>
            </form>
          </section>
        </div>
      </div>
      <p className="border-t border-line px-5 py-4 text-xs text-muted lg:px-8">{brand.credit}</p>
    </dialog>
  );
}
