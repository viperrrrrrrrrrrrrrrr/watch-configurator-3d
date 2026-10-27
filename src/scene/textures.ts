import * as THREE from 'three';

const SERIF = '"Fraunces Variable", Georgia, serif';
const SANS = '"Inter Variable", system-ui, sans-serif';

function canvas(w: number, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
}
function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function arcText(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, start: number, spacing: number, inward = true) {
  let a = start - ((text.length - 1) * spacing) / 2;
  for (const ch of text) {
    g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.rotate(a + (inward ? Math.PI / 2 : -Math.PI / 2));
    g.fillText(ch, 0, 0); g.restore(); a += spacing;
  }
}

/** Sunburst dial base (grayscale, multiplied by the dial colour). */
export function dialBase() {
  const S = 1024, [c, g] = canvas(S);
  const cx = S / 2;
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  // radial rays
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * Math.PI * 2, v = 200 + Math.random() * 55;
    g.strokeStyle = `rgba(${v},${v},${v},0.55)`; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, cx); g.lineTo(cx + Math.cos(a) * S, cx + Math.sin(a) * S); g.stroke();
  }
  // soft vignette towards the rim (gives depth)
  const rg = g.createRadialGradient(cx, cx, S * 0.05, cx, cx, S * 0.5);
  rg.addColorStop(0, 'rgba(255,255,255,0.35)'); rg.addColorStop(0.7, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  return tex(c);
}

/** Dial printing: minute track, brand, model. White on transparent; tinted by material colour. */
export function dialPrint() {
  const S = 1024, [c, g] = canvas(S);
  const cx = S / 2, R = S / 2; // texture radius == dial radius
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, five = i % 5 === 0;
    g.lineWidth = five ? 5 : 2.5;
    const r1 = R * 0.955, r2 = R * (five ? 0.9 : 0.925);
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cx + Math.sin(a) * r2); g.stroke();
  }
  g.lineWidth = 2; g.beginPath(); g.arc(cx, cx, R * 0.962, 0, Math.PI * 2); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `600 64px ${SERIF}`; g.fillText('V E S P R Y N', cx, cx - R * 0.42);
  g.font = `500 22px ${SANS}`; g.fillText('A T E L I E R', cx, cx - R * 0.33);
  g.font = `600 26px ${SANS}`; g.fillText('AUTOMATIC', cx, cx + R * 0.36);
  g.font = `italic 400 30px ${SERIF}`; g.fillText('Meridian', cx, cx + R * 0.45);
  return tex(c);
}

/** Ceramic diver insert print (minute scale + numerals). */
export function diverPrint() {
  const S = 1024, [c, g] = canvas(S);
  const cx = S / 2, R = S / 2;
  g.fillStyle = '#e9edf2'; g.strokeStyle = '#e9edf2'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    if (i % 10 === 0 && i) continue;
    if (i === 0) continue;
    const big = i % 5 === 0, r1 = R * 0.975, r2 = R * (big ? 0.9 : (i < 15 ? 0.93 : 0.95));
    g.lineWidth = big ? 9 : 5;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cx + Math.sin(a) * r2); g.stroke();
  }
  g.font = `600 64px ${SANS}`;
  for (let n = 10; n < 60; n += 10) {
    const a = (n / 60) * Math.PI * 2 - Math.PI / 2, r = R * 0.92;
    g.save(); g.translate(cx + Math.cos(a) * r, cx + Math.sin(a) * r); g.rotate(a + Math.PI / 2); g.fillText(String(n), 0, 0); g.restore();
  }
  // 12 o'clock triangle
  g.beginPath(); g.moveTo(cx, cx - R * 0.86); g.lineTo(cx - 34, cx - R * 0.985); g.lineTo(cx + 34, cx - R * 0.985); g.closePath(); g.fill();
  return tex(c);
}

/** Case-back engraving: returns {map, bump} canvases (engraved areas darker / lower). */
export function caseBack(text: string) {
  const S = 1024, [c, g] = canvas(S);
  const cx = S / 2, R = S / 2;
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  // fine circular graining
  for (let r = 8; r < R; r += 3) {
    const v = 225 + Math.random() * 30;
    g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cx, r, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = '#5a5a5a'; g.strokeStyle = '#5a5a5a';
  g.lineWidth = 4; g.beginPath(); g.arc(cx, cx, R * 0.93, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(cx, cx, R * 0.74, 0, Math.PI * 2); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `600 40px ${SANS}`;
  arcText(g, 'VESPRYN · V-40 MERIDIAN · AUTOMATIC', cx, cx, R * 0.835, -Math.PI / 2, 0.072);
  g.font = `500 32px ${SANS}`;
  arcText(g, 'DEMO PIECE · FICTIONAL BRAND', cx, cx, R * 0.835, Math.PI / 2, -0.07, false);
  const t = text.trim();
  if (t) {
    g.fillStyle = '#3c3c3c';
    const words = t.split(/\s+/); const lines: string[] = [];
    let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > 13 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    lines.push(cur);
    const size = lines.length > 1 ? 92 : t.length > 9 ? 100 : 128;
    g.font = `italic 500 ${size}px ${SERIF}`;
    lines.slice(0, 2).forEach((l, i, a) => g.fillText(l, cx, cx + (i - (a.length - 1) / 2) * size * 1.1));
  } else {
    g.font = `italic 400 70px ${SERIF}`; g.fillStyle = '#9a9a9a'; g.fillText('V', cx, cx);
  }
  const map = tex(c);
  const bump = tex(c, false);
  return { map, bump };
}

/** Leather grain + stitching (u across the strap, v along it; repeats along v). */
export function leather() {
  const W = 256, H = 512, [c, g] = canvas(W, H);
  g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { const v = 170 + Math.random() * 85; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  g.fillStyle = '#ffffff';
  for (const x of [W * 0.07, W * 0.93]) for (let y = 4; y < H; y += 32) {
    g.save(); g.translate(x, y + 10); g.rotate(-0.25); g.fillRect(-3, -11, 6, 22); g.restore();
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Rubber ribs bump map. */
export function rubber() {
  const W = 64, H = 256, [c, g] = canvas(W, H);
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#777';
  for (let y = 0; y < H; y += 32) g.fillRect(W * 0.18, y, W * 0.64, 12);
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
