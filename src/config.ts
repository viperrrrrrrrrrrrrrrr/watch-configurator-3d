/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ONE CONFIG FILE — every option and every SAMPLE price lives here.
 *  "Vespryn" is a FICTIONAL brand made for a portfolio demo. Prices are SAMPLE
 *  values only: nothing is for sale and no order is ever sent anywhere.
 *
 *  Price formula (also used by tests/e2e.mjs):
 *    total = basePrice
 *          + caseMaterial.price + dial.price + bezel.price
 *          + strap.price + hands.price
 *          + (engraving text not empty ? engraving.price : 0)
 *
 *  Edit the numbers, rebuild, and the breakdown, the summary and the
 *  "Sample prices" note all update automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const brand = {
  name: 'Vespryn',
  model: 'V-40 Meridian',
  tagline: 'Build your own automatic watch',
  /** Only email used anywhere on the site. */
  email: 'hello@example.com',
  credit: 'Demo website by Ivan Litvin · fictional brand, sample prices',
};

export const pricing = {
  currency: 'USD',
  locale: 'en-US',
  /** Watch head with automatic movement, polished steel case and smooth bezel. */
  basePrice: 2400,
  engraving: { price: 120, maxLength: 24, label: 'Case-back engraving' },
};

export type Option = {
  id: string;
  label: string;
  /** Short extra description for screen readers and the summary. */
  note?: string;
  /** SAMPLE price added to the base price (0 = included). */
  price: number;
  /** Swatch color(s) shown in the UI. */
  swatch: string;
  swatch2?: string;
};

export const caseMaterials: Option[] = [
  { id: 'steel', label: 'Polished steel', note: '316L-style steel, mirror polish', price: 0, swatch: '#d9dde2', swatch2: '#8e959d' },
  { id: 'black', label: 'Black DLC', note: 'Black diamond-like coating over steel', price: 450, swatch: '#3a3b40', swatch2: '#121316' },
  { id: 'titanium', label: 'Brushed titanium', note: 'Light grade-5-style titanium, satin finish', price: 690, swatch: '#b9b4aa', swatch2: '#7d786f' },
  { id: 'gold', label: '18k yellow gold', note: 'Solid yellow gold case', price: 6800, swatch: '#f1d08a', swatch2: '#b8893c' },
];

export const dials: Option[] = [
  { id: 'midnight', label: 'Midnight blue', note: 'Sunburst finish', price: 0, swatch: '#1c2f5c', swatch2: '#0b1530' },
  { id: 'ivory', label: 'Ivory', note: 'Grained opaline finish', price: 0, swatch: '#efe8d8', swatch2: '#cfc6b0' },
  { id: 'emerald', label: 'Emerald green', note: 'Sunburst finish', price: 150, swatch: '#165a45', swatch2: '#07261c' },
  { id: 'onyx', label: 'Onyx black', note: 'Lacquered finish', price: 150, swatch: '#141416', swatch2: '#000000' },
  { id: 'salmon', label: 'Salmon', note: 'Sunburst finish', price: 220, swatch: '#e59a7c', swatch2: '#a85b42' },
];

export const bezels: Option[] = [
  { id: 'smooth', label: 'Smooth', note: 'Slim polished bezel', price: 0, swatch: '#cfd3d8' },
  { id: 'fluted', label: 'Fluted', note: 'Hand-finished fluting', price: 380, swatch: '#cfd3d8', swatch2: '#7f868e' },
  { id: 'diver', label: 'Diver ceramic', note: '60-minute ceramic insert', price: 520, swatch: '#11151c', swatch2: '#c9ced6' },
];

export type StrapKind = 'leather' | 'rubber' | 'bracelet';
export type StrapOption = Option & { kind: StrapKind };

export const straps: StrapOption[] = [
  { id: 'leather-cognac', kind: 'leather', label: 'Cognac leather', note: 'Calf leather, contrast stitching', price: 0, swatch: '#8a4b22' },
  { id: 'leather-black', kind: 'leather', label: 'Black leather', note: 'Calf leather, tone-on-tone stitching', price: 0, swatch: '#1b1a19' },
  { id: 'leather-navy', kind: 'leather', label: 'Navy leather', note: 'Calf leather, contrast stitching', price: 40, swatch: '#1d2a44' },
  { id: 'leather-olive', kind: 'leather', label: 'Olive suede', note: 'Suede, tone-on-tone stitching', price: 60, swatch: '#5d6138' },
  { id: 'rubber', kind: 'rubber', label: 'Black rubber', note: 'Vulcanised rubber, ribbed', price: 90, swatch: '#18191b', swatch2: '#2c2e31' },
  { id: 'bracelet', kind: 'bracelet', label: 'Metal bracelet', note: 'Three-link bracelet, matches the case', price: 650, swatch: '#c9ced4', swatch2: '#80878f' },
];

export const handColors: Option[] = [
  { id: 'silver', label: 'Rhodium silver', price: 0, swatch: '#e4e7ea' },
  { id: 'gold', label: 'Gilt', price: 90, swatch: '#e4bd6a' },
  { id: 'black', label: 'Black', price: 0, swatch: '#1c1d20' },
  { id: 'blued', label: 'Heat-blued', note: 'Blued-steel look', price: 140, swatch: '#2747a8' },
];

/** Default configuration (also the configuration of a URL without a query string). */
export const defaults = {
  case: 'steel',
  dial: 'midnight',
  bezel: 'smooth',
  strap: 'leather-cognac',
  hands: 'silver',
  engraving: '',
};
