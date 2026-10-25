import { bezels, caseMaterials, defaults, dials, handColors, pricing, straps, type Option } from './config';

export type WatchConfig = typeof defaults;
export type OptionKey = Exclude<keyof WatchConfig, 'engraving'>;

export const groups: Record<OptionKey, { title: string; options: Option[] }> = {
  case: { title: 'Case', options: caseMaterials },
  dial: { title: 'Dial', options: dials },
  bezel: { title: 'Bezel', options: bezels },
  strap: { title: 'Strap', options: straps },
  hands: { title: 'Hands', options: handColors },
};
export const optionKeys = Object.keys(groups) as OptionKey[];

export const find = (key: OptionKey, id: string) => groups[key].options.find((o) => o.id === id)!;
export const strapKind = (id: string) => straps.find((s) => s.id === id)!.kind;

/** Allowed engraving characters: letters, digits, spaces and a few marks. */
export function cleanEngraving(s: string) {
  return s.replace(/[^\p{L}\p{N} .,&'\-♥]/gu, '').slice(0, pricing.engraving.maxLength);
}

export type Line = { key: string; label: string; detail: string; price: number };
export function breakdown(c: WatchConfig): { lines: Line[]; total: number } {
  const lines: Line[] = [{ key: 'base', label: 'Watch head', detail: 'Automatic movement', price: pricing.basePrice }];
  for (const k of optionKeys) {
    const o = find(k, c[k]);
    lines.push({ key: k, label: groups[k].title, detail: o.label, price: o.price });
  }
  if (c.engraving.trim()) lines.push({ key: 'engraving', label: 'Engraving', detail: `“${c.engraving.trim()}”`, price: pricing.engraving.price });
  return { lines, total: lines.reduce((s, l) => s + l.price, 0) };
}

const fmt = new Intl.NumberFormat(pricing.locale, { style: 'currency', currency: pricing.currency, maximumFractionDigits: 0 });
export const money = (n: number) => fmt.format(n);

/* ---------- URL query string <-> config ---------- */
export function fromSearch(search: string): WatchConfig {
  const p = new URLSearchParams(search);
  const c = { ...defaults };
  for (const k of optionKeys) {
    const v = p.get(k);
    if (v && groups[k].options.some((o) => o.id === v)) c[k] = v;
  }
  const e = p.get('engraving');
  if (e) c.engraving = cleanEngraving(e);
  return c;
}
export function toSearch(c: WatchConfig): string {
  const p = new URLSearchParams();
  for (const k of optionKeys) if (c[k] !== defaults[k]) p.set(k, c[k]);
  if (c.engraving.trim()) p.set('engraving', c.engraving.trim());
  const s = p.toString();
  return s ? `?${s}` : '';
}
/** Always-complete share URL (every option spelled out). */
export function shareUrl(c: WatchConfig, origin: string) {
  const p = new URLSearchParams();
  for (const k of optionKeys) p.set(k, c[k]);
  if (c.engraving.trim()) p.set('engraving', c.engraving.trim());
  return `${origin}/?${p.toString()}`;
}
