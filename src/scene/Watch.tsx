import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { WatchConfig } from '../state';
import { strapKind } from '../state';
import { caseLooks, dialLooks, handLooks, strapLooks, type Look } from './looks';
import * as G from './geometry';
import * as TX from './textures';

type Mat = THREE.MeshPhysicalMaterial;
/** A group of materials that animate together towards a target look. */
class Role {
  mats: Mat[] = [];
  target = { color: new THREE.Color('#fff'), metalness: 1, roughness: 0.2, clearcoat: 0 };
  offset: { roughness: number }[] = [];
  make(params: THREE.MeshPhysicalMaterialParameters = {}, roughOffset = 0) {
    const m = new THREE.MeshPhysicalMaterial({ envMapIntensity: 1, ...params });
    this.mats.push(m); this.offset.push({ roughness: roughOffset });
    return m;
  }
  set(l: Look) { this.target.color.set(l.color); this.target.metalness = l.metalness; this.target.roughness = l.roughness; this.target.clearcoat = l.clearcoat ?? 0; }
  step(k: number) {
    this.mats.forEach((m, i) => {
      m.color.lerp(this.target.color, k);
      m.metalness += (this.target.metalness - m.metalness) * k;
      const r = Math.min(1, this.target.roughness + this.offset[i].roughness);
      m.roughness += (r - m.roughness) * k;
      // never exactly 0, so the clearcoat shader variant stays compiled (no recompiles mid-animation)
      m.clearcoat = Math.max(0.001, m.clearcoat + (this.target.clearcoat - m.clearcoat) * k);
    });
  }
  snap() { this.step(1); }
}

/** Cross-fades its children in or out (materials must not be shared with other faders). */
function Fade({ show, reduced, children, lift = 0 }: { show: boolean; reduced: boolean; children: React.ReactNode; lift?: number }) {
  const ref = useRef<THREE.Group>(null!);
  const p = useRef(show ? 1 : 0);
  const mats = useRef<THREE.Material[]>([]);
  useEffect(() => {
    const list: THREE.Material[] = [];
    ref.current.traverse((o) => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => list.includes(x) || list.push(x)); });
    mats.current = list;
  });
  useFrame((_, dt) => {
    const target = show ? 1 : 0;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 7);
    p.current += (target - p.current) * k;
    if (Math.abs(target - p.current) < 0.002) p.current = target;
    const v = p.current, g = ref.current;
    g.visible = v > 0.001;
    g.position.z = lift * (1 - v);
    const s = 0.97 + 0.03 * v; g.scale.setScalar(s);
    for (const m of mats.current) {
      const base = (m.userData.baseOpacity as number) ?? 1;
      const transparent = v < 0.999 || m.userData.alwaysTransparent;
      if (m.transparent !== transparent) { m.transparent = transparent; m.needsUpdate = true; }
      m.opacity = base * v;
      if (!m.userData.alwaysTransparent) m.depthWrite = v > 0.5;
    }
  });
  return <group ref={ref}>{children}</group>;
}

export function Watch({ config, reduced, intro }: { config: WatchConfig; reduced: boolean; intro: boolean }) {
  const roles = useMemo(() => ({ case: new Role(), hands: new Role(), dial: new Role(), print: new Role(), leather: new Role(), rubber: new Role(), bracelet: new Role() }), []);
  const tx = useMemo(() => ({ dialBase: TX.dialBase(), dialPrint: TX.dialPrint(), diver: TX.diverPrint(), leather: TX.leather(), rubber: TX.rubber() }), []);
  const geo = useMemo(() => {
    const top = G.strapCurve(1), bottom = G.strapCurve(-1);
    return {
      case: G.lathe(G.CASE_PROFILE, 160),
      bezel: { smooth: G.bezelGeometry('smooth'), fluted: G.bezelGeometry('fluted'), diver: G.bezelGeometry('diver') },
      crown: G.crownGeometry(),
      lugTop: G.lugGeometry(1), lugBottom: G.lugGeometry(-1),
      hour: G.handShape(1.08, 0.13, 0.22), minute: G.handShape(1.6, 0.095, 0.26),
      hourLume: G.lumeShape(1.08, 0.13), minuteLume: G.lumeShape(1.6, 0.095),
      index: new RoundedBoxGeometry(0.1, 0.36, 0.06, 2, 0.02),
      indexWide: new RoundedBoxGeometry(0.1, 0.42, 0.06, 2, 0.02),
      curves: [top, bottom] as const,
      leather: [G.strapGeometry(top, { width: 1.98, endWidth: 1.62, thick: 0.17, tip: true }), G.strapGeometry(bottom, { width: 1.98, endWidth: 1.66, thick: 0.17, tip: false })],
      rubber: [G.strapGeometry(top, { width: 1.98, endWidth: 1.7, thick: 0.22, tip: true }), G.strapGeometry(bottom, { width: 1.98, endWidth: 1.72, thick: 0.22, tip: false })],
      rehaut: G.lathe([[1.62, 0.4], [1.7, 0.32], [1.79, 0.19]], 128),
      linkCenter: new RoundedBoxGeometry(1, 0.31, 0.15, 3, 0.05),
      linkSide: new RoundedBoxGeometry(1, 0.335, 0.17, 3, 0.06),
    };
  }, []);

  /* ---------- materials ---------- */
  const M = useMemo(() => {
    const r = roles;
    const caseMat = () => r.case.make({ clearcoatRoughness: 0.1 });
    const m = {
      case: caseMat(), crown: caseMat(), lugs: caseMat(),
      bezel: { smooth: caseMat(), fluted: caseMat(), diver: caseMat() },
      rehaut: r.case.make({}, 0.1),
      back: r.case.make({ bumpScale: 2 }, 0.06),
      diverInsert: new THREE.MeshPhysicalMaterial({ color: '#0d1014', roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, map: tx.diver }),
      dial: r.dial.make({ map: tx.dialBase, clearcoatRoughness: 0.15 }),
      print: r.print.make({ map: tx.dialPrint, transparent: true, metalness: 0, roughness: 0.5, depthWrite: false }),
      hands: r.hands.make(), indices: r.hands.make(),
      lume: new THREE.MeshStandardMaterial({ color: '#f4f6ee', roughness: 0.6, emissive: '#cfe8d0', emissiveIntensity: 0.06 }),
      lumeIdx: new THREE.MeshStandardMaterial({ color: '#f4f6ee', roughness: 0.6, emissive: '#cfe8d0', emissiveIntensity: 0.06 }),
      seconds: new THREE.MeshPhysicalMaterial({ color: '#e2553d', metalness: 0.5, roughness: 0.3 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#000000', metalness: 0, roughness: 0.03, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1, ior: 1.77 }),
      springbar: new THREE.MeshStandardMaterial({ color: '#aab0b6', metalness: 1, roughness: 0.3 }),
      leather: r.leather.make({ map: tx.leather, bumpMap: tx.leather, bumpScale: 1.4, sheen: 0.4, sheenRoughness: 0.6 }),
      rubber: r.rubber.make({ bumpMap: tx.rubber, bumpScale: 3, clearcoat: 0.2 }),
      linkCenter: r.bracelet.make({ clearcoatRoughness: 0.1 }),
      linkSide: r.bracelet.make({}, 0.18),
    };
    tx.leather.repeat.set(1, 1); tx.rubber.repeat.set(1, 3);
    // start with a placeholder case-back texture so the final shader variant compiles during warm-up
    const placeholder = TX.caseBack('');
    m.back.map = placeholder.map; m.back.bumpMap = placeholder.bump; m.back.roughnessMap = placeholder.bump;
    m.print.userData.alwaysTransparent = true;
    m.glass.userData.alwaysTransparent = true;
    return m;
  }, [roles, tx]);

  // engraving texture (regenerated when the text changes)
  const fontsReady = useRef(false);
  useEffect(() => {
    let alive = true;
    const draw = () => {
      if (!alive) return;
      const { map, bump } = TX.caseBack(config.engraving);
      M.back.map?.dispose(); M.back.bumpMap?.dispose();
      M.back.map = map; M.back.bumpMap = bump; M.back.roughnessMap = bump;
    };
    if (fontsReady.current) { const t = setTimeout(draw, 60); return () => { alive = false; clearTimeout(t); }; }
    Promise.all([document.fonts.load('italic 500 64px "Fraunces Variable"'), document.fonts.load('600 40px "Inter Variable"')])
      .catch(() => {}).then(() => { fontsReady.current = true; draw(); tx.dialPrint.image && redrawPrint(); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.engraving]);
  function redrawPrint() { const t = TX.dialPrint(); M.print.map?.dispose(); M.print.map = t; }

  // targets
  const first = useRef(true);
  useEffect(() => {
    roles.case.set(caseLooks[config.case]);
    roles.bracelet.set(caseLooks[config.case]);
    roles.hands.set(handLooks[config.hands]);
    const d = dialLooks[config.dial];
    roles.dial.set(d);
    roles.print.set({ color: d.print, metalness: 0, roughness: 0.5 });
    const s = strapLooks[config.strap];
    if (s) (strapKind(config.strap) === 'rubber' ? roles.rubber : roles.leather).set(s);
    if (first.current) { Object.values(roles).forEach((r) => r.snap()); first.current = false; }
  }, [config, roles]);

  /* ---------- bracelet links (instanced) ---------- */
  const links = useMemo(() => {
    const center: THREE.Matrix4[] = [], side: THREE.Matrix4[] = [];
    for (const [ci, curve] of geo.curves.entries()) {
      const len = curve.getLength(), pitch = 0.36;
      const n = Math.floor((len - 0.1) / pitch);
      for (let i = 0; i < n; i++) {
        const t = (0.14 + i * pitch) / len;
        const { P, T, N } = G.frameAt(curve, t);
        const w = 1.96 - (ci === 0 ? 0.36 : 0.3) * t;
        const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), T, N);
        const mk = (x: number, sx: number, arr: THREE.Matrix4[]) => {
          arr.push(new THREE.Matrix4().makeTranslation(P.x, P.y, P.z).multiply(basis).multiply(new THREE.Matrix4().makeTranslation(x, 0, 0)).multiply(new THREE.Matrix4().makeScale(sx, 1, 1)));
        };
        const cw = w * 0.34, gap = 0.03, sw = (w - cw) / 2 - gap;
        mk(0, cw, center);
        mk(-(cw / 2 + gap + sw / 2), sw, side);
        mk(cw / 2 + gap + sw / 2, sw, side);
      }
    }
    return { center, side };
  }, [geo]);
  const centerRef = useRef<THREE.InstancedMesh>(null!), sideRef = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    links.center.forEach((m, i) => centerRef.current.setMatrixAt(i, m));
    links.side.forEach((m, i) => sideRef.current.setMatrixAt(i, m));
    centerRef.current.instanceMatrix.needsUpdate = true; sideRef.current.instanceMatrix.needsUpdate = true;
    centerRef.current.computeBoundingSphere(); sideRef.current.computeBoundingSphere();
  }, [links]);

  /* ---------- animation: materials, hands, intro ---------- */
  const hour = useRef<THREE.Group>(null!), minute = useRef<THREE.Group>(null!), second = useRef<THREE.Group>(null!);
  const root = useRef<THREE.Group>(null!);
  const introT = useRef(intro && !reduced ? 0 : 1);
  useFrame((_, dt) => {
    const k = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 5);
    Object.values(roles).forEach((r) => r.step(k));
    const now = new Date();
    const ms = now.getMilliseconds(), s = now.getSeconds() + (reduced ? 0 : ms / 1000), m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
    second.current.rotation.z = -(s / 60) * Math.PI * 2;
    minute.current.rotation.z = -(m / 60) * Math.PI * 2;
    hour.current.rotation.z = -(h / 12) * Math.PI * 2;
    if (introT.current < 1) {
      introT.current = Math.min(1, introT.current + dt / 2.2);
      const e = 1 - Math.pow(1 - introT.current, 3);
      root.current.rotation.y = -1.2 * (1 - e);
      root.current.rotation.x = 0.35 * (1 - e);
      root.current.position.y = -0.6 * (1 - e);
    }
  });

  const kind = strapKind(config.strap);
  const indexes = Array.from({ length: 12 }, (_, i) => i);
  return (
    <group ref={root}>
      {/* case, lugs, crown */}
      <mesh geometry={geo.case} material={M.case} />
      <mesh geometry={geo.lugTop} material={M.lugs} position={[1.18, 0, 0]} />
      <mesh geometry={geo.lugTop} material={M.lugs} position={[-1.18, 0, 0]} />
      <mesh geometry={geo.lugBottom} material={M.lugs} position={[1.18, 0, 0]} />
      <mesh geometry={geo.lugBottom} material={M.lugs} position={[-1.18, 0, 0]} />
      <mesh geometry={geo.crown} material={M.crown} position={[2.26, 0, -0.02]} />
      <mesh material={M.crown} position={[2.1, 0, -0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.12, 32]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} material={M.springbar} position={[0, 2.2 * s, -0.16]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 2.3, 16]} />
        </mesh>
      ))}

      {/* bezels */}
      <Fade show={config.bezel === 'smooth'} reduced={reduced} lift={0.08}><mesh geometry={geo.bezel.smooth} material={M.bezel.smooth} /></Fade>
      <Fade show={config.bezel === 'fluted'} reduced={reduced} lift={0.08}><mesh geometry={geo.bezel.fluted} material={M.bezel.fluted} /></Fade>
      <Fade show={config.bezel === 'diver'} reduced={reduced} lift={0.08}>
        <mesh geometry={geo.bezel.diver} material={M.bezel.diver} />
        <mesh material={M.diverInsert} position={[0, 0, 0.532]}><ringGeometry args={[1.64, 1.96, 128, 1]} /></mesh>
      </Fade>

      {/* dial */}
      <mesh material={M.dial} position={[0, 0, 0.2]}><circleGeometry args={[1.78, 128]} /></mesh>
      <mesh material={M.print} position={[0, 0, 0.202]} scale={1.78 * 2}><planeGeometry args={[1, 1]} /></mesh>
      {/* chapter ring between dial and bezel */}
      <mesh geometry={geo.rehaut} material={M.rehaut} />
      {indexes.map((i) => {
        const a = (i / 12) * Math.PI * 2, r = 1.38, x = Math.sin(a) * r, y = Math.cos(a) * r;
        const double = i === 0, wide = i % 3 === 0;
        return (
          <group key={i} position={[x, y, 0.24]} rotation={[0, 0, -a]}>
            {(double ? [-0.08, 0.08] : [0]).map((dx) => (
              <group key={dx} position={[dx, 0, 0]}>
                <mesh geometry={wide ? geo.indexWide : geo.index} material={M.indices} />
                <mesh material={M.lumeIdx} position={[0, 0, 0.031]}><planeGeometry args={[0.045, wide ? 0.32 : 0.26]} /></mesh>
              </group>
            ))}
          </group>
        );
      })}
      {/* hands */}
      <group ref={hour} position={[0, 0, 0.3]}>
        <mesh geometry={geo.hour} material={M.hands} />
        <mesh geometry={geo.hourLume} material={M.lume} position={[0, 0, 0.04]} />
      </group>
      <group ref={minute} position={[0, 0, 0.35]}>
        <mesh geometry={geo.minute} material={M.hands} />
        <mesh geometry={geo.minuteLume} material={M.lume} position={[0, 0, 0.04]} />
      </group>
      <group ref={second} position={[0, 0, 0.41]}>
        <mesh material={M.seconds} position={[0, 0.6, 0]}><boxGeometry args={[0.022, 1.7, 0.012]} /></mesh>
        <mesh material={M.seconds} position={[0, -0.32, 0]}><cylinderGeometry args={[0.055, 0.055, 0.02, 24]} /></mesh>
        <mesh material={M.seconds} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 0.04, 24]} /></mesh>
      </group>
      <mesh material={M.hands} position={[0, 0, 0.36]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.075, 0.12, 24]} /></mesh>

      {/* sapphire crystal: additive reflections only */}
      <mesh material={M.glass} position={[0, 0, 0.64 - 18.53]} rotation={[Math.PI / 2, 0, 0]} renderOrder={10}>
        <sphereGeometry args={[18.53, 96, 4, 0, Math.PI * 2, 0, 0.0935]} />
      </mesh>

      {/* case back with engraving */}
      <mesh material={M.back} position={[0, 0, -0.52]} rotation={[0, Math.PI, 0]}><circleGeometry args={[1.66, 128]} /></mesh>

      {/* straps */}
      <Fade show={kind === 'leather'} reduced={reduced}>
        {geo.leather.map((g, i) => <mesh key={i} geometry={g} material={M.leather} />)}
      </Fade>
      <Fade show={kind === 'rubber'} reduced={reduced}>
        {geo.rubber.map((g, i) => <mesh key={i} geometry={g} material={M.rubber} />)}
      </Fade>
      <Fade show={kind === 'bracelet'} reduced={reduced}>
        <instancedMesh ref={centerRef} args={[geo.linkCenter, M.linkCenter, links.center.length]} />
        <instancedMesh ref={sideRef} args={[geo.linkSide, M.linkSide, links.side.length]} />
      </Fade>
    </group>
  );
}
