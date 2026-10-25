import * as THREE from 'three';

const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
/** Lathe around +Z (profile given as [radius, z]). */
export function lathe(profile: [number, number][], segments = 128) {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => V2(r, z)), segments);
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

export const CASE_PROFILE: [number, number][] = [
  [1.62, -0.5], [1.86, -0.48], [1.98, -0.42], [2.05, -0.3], [2.075, -0.12], [2.075, 0.14], [2.04, 0.3], [1.98, 0.37], [1.76, 0.38],
];
const BEZEL_PROFILE: [number, number][] = [
  [1.62, 0.36], [1.99, 0.37], [2.02, 0.41], [2.0, 0.47], [1.9, 0.54], [1.76, 0.59], [1.66, 0.6], [1.62, 0.56],
];

export function bezelGeometry(style: string) {
  if (style === 'smooth') return lathe(BEZEL_PROFILE, 160);
  if (style === 'fluted') {
    const g = lathe(BEZEL_PROFILE.map(([r, z]) => [r, z + 0.02] as [number, number]), 720);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y);
      if (r < 1.72) continue;
      const a = Math.atan2(y, x), w = Math.min(1, (r - 1.72) / 0.12);
      const f = Math.pow(Math.abs(Math.cos(a * 24)), 0.7);
      const nr = r - 0.06 * w * (1 - f);
      p.setXY(i, (x / r) * nr, (y / r) * nr);
    }
    g.computeVertexNormals();
    return g;
  }
  // diver: lower outer ring with coin edge (insert is a separate mesh)
  const g = lathe([[1.62, 0.36], [2.04, 0.37], [2.06, 0.42], [2.04, 0.5], [1.94, 0.53], [1.62, 0.53]], 480);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, y);
    if (r < 2.0 || z > 0.51) continue;
    const a = Math.atan2(y, x), nr = r - 0.018 * (0.5 + 0.5 * Math.cos(a * 120));
    p.setXY(i, (x / r) * nr, (y / r) * nr);
  }
  g.computeVertexNormals();
  return g;
}

export function crownGeometry() {
  const g = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 96, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < 0.2) continue;
    const a = Math.atan2(z, x), nr = r - 0.02 * (0.5 + 0.5 * Math.cos(a * 32));
    p.setX(i, (x / r) * nr); p.setZ(i, (z / r) * nr);
  }
  g.computeVertexNormals();
  g.rotateZ(Math.PI / 2);
  return g;
}

/** Lug: a side-profile shape extruded across X. sign = +1 (12 o'clock) or -1 (6 o'clock). */
export function lugGeometry(sign: number) {
  const pts: [number, number][] = [[1.45, 0.3], [1.9, 0.27], [2.2, 0.15], [2.4, -0.05], [2.44, -0.26], [2.3, -0.38], [1.45, -0.42]];
  const s = new THREE.Shape(pts.map(([y, z]) => V2(y * sign, z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 5, curveSegments: 8 });
  g.translate(0, 0, -0.11);
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  // taper the lug towards its tip
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, (Math.abs(p.getY(i)) - 1.7) / 0.75));
    p.setX(i, p.getX(i) * (1 - 0.28 * t));
  }
  g.computeVertexNormals();
  return g;
}

export function handShape(len: number, w: number, tail: number) {
  const s = new THREE.Shape();
  s.moveTo(-w * 0.45, -tail); s.lineTo(-w * 0.5, len * 0.72); s.lineTo(0, len); s.lineTo(w * 0.5, len * 0.72); s.lineTo(w * 0.45, -tail);
  s.quadraticCurveTo(0, -tail - w * 0.6, -w * 0.45, -tail);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
  g.computeVertexNormals();
  return g;
}
export function lumeShape(len: number, w: number) {
  const s = new THREE.Shape();
  s.moveTo(-w * 0.22, len * 0.22); s.lineTo(-w * 0.26, len * 0.7); s.lineTo(0, len * 0.88); s.lineTo(w * 0.26, len * 0.7); s.lineTo(w * 0.22, len * 0.22); s.closePath();
  return new THREE.ShapeGeometry(s);
}

/* ---------- strap path & sweep ---------- */
export function strapCurve(sign: number) {
  const pts: [number, number][] = sign > 0
    ? [[2.2, -0.16], [2.75, -0.3], [3.2, -0.72], [3.45, -1.45], [3.42, -2.35], [3.05, -3.15], [2.4, -3.7]]
    : [[2.2, -0.16], [2.75, -0.3], [3.2, -0.72], [3.45, -1.45], [3.42, -2.3], [3.08, -3.05]];
  return new THREE.CatmullRomCurve3(pts.map(([y, z]) => new THREE.Vector3(0, y * sign, z)), false, 'centripetal');
}
const X = new THREE.Vector3(1, 0, 0);
/** Frame along a planar YZ curve: tangent T, outward normal N (perpendicular, in the YZ plane). */
export function frameAt(curve: THREE.Curve<THREE.Vector3>, t: number) {
  const P = curve.getPointAt(t), T = curve.getTangentAt(t);
  const N = new THREE.Vector3().crossVectors(T, X).normalize();
  const c = new THREE.Vector3(0, 0, -1.9);
  if (N.dot(P.clone().sub(c)) < 0) N.negate();
  return { P, T, N };
}

/** Sweep a rounded-rectangle cross-section along the curve. */
export function strapGeometry(curve: THREE.Curve<THREE.Vector3>, opts: { width: number; endWidth: number; thick: number; tip: boolean }) {
  const N_ALONG = 120, N_SEC = 28;
  const len = curve.getLength();
  const pos: number[] = [], uv: number[] = [], index: number[] = [];
  // rounded-rect section in (x, n) with unit half sizes
  const sec: [number, number, number][] = [];
  for (let i = 0; i < N_SEC; i++) {
    const a = (i / N_SEC) * Math.PI * 2;
    const cx = Math.cos(a), cy = Math.sin(a);
    // superellipse -> flat faces with soft edges
    const e = 0.18;
    const x = Math.sign(cx) * Math.pow(Math.abs(cx), e), y = Math.sign(cy) * Math.pow(Math.abs(cy), 0.45);
    sec.push([x, y, (x + 1) / 2]);
  }
  for (let j = 0; j <= N_ALONG; j++) {
    const t = j / N_ALONG;
    const { P, N } = frameAt(curve, t);
    let hw = (opts.width + (opts.endWidth - opts.width) * t) / 2;
    let ht = opts.thick / 2;
    if (opts.tip && t > 0.9) { const s = (t - 0.9) / 0.1; const k = Math.sqrt(Math.max(0.0001, 1 - s * s)); hw *= 0.25 + 0.75 * k; ht *= 0.6 + 0.4 * k; }
    for (const [x, y, u] of sec) {
      const p = P.clone().addScaledVector(X, x * hw).addScaledVector(N, y * ht);
      pos.push(p.x, p.y, p.z); uv.push(u, (t * len) / 1.6);
    }
  }
  for (let j = 0; j < N_ALONG; j++) for (let i = 0; i < N_SEC; i++) {
    const a = j * N_SEC + i, b = j * N_SEC + ((i + 1) % N_SEC), c = a + N_SEC, d = b + N_SEC;
    index.push(a, c, b, b, c, d);
  }
  // end caps (fans)
  for (const j of [0, N_ALONG]) {
    const { P } = frameAt(curve, j / N_ALONG);
    const ci = pos.length / 3; pos.push(P.x, P.y, P.z); uv.push(0.5, 0);
    for (let i = 0; i < N_SEC; i++) {
      const a = j * N_SEC + i, b = j * N_SEC + ((i + 1) % N_SEC);
      if (j === 0) index.push(ci, a, b); else index.push(ci, b, a);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
