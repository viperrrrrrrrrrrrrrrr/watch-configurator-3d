import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { WatchConfig } from '../state';
import { strapKind } from '../state';
import { Watch } from './Watch';

export type View = 'front' | 'side' | 'back' | 'engraving' | 'hero';
export type SceneHandle = { capture: () => string | null; nudge: (az: number, zoom?: number) => void };
type Props = { config: WatchConfig; view: { name: View; n: number }; reduced: boolean; autoRotate: boolean; active: boolean; onReady?: () => void; onUserMove?: () => void };

const TARGET = new THREE.Vector3(0, 0.15, -0.4);
const VIEWS: Record<View, [number, number, number]> = {
  // [azimuth, polar, distance]
  hero: [-0.5, 1.38, 19],
  front: [0, Math.PI / 2 - 0.08, 15.5],
  side: [Math.PI / 2 - 0.12, Math.PI / 2 - 0.1, 15],
  back: [Math.PI, Math.PI / 2 - 0.08, 15],
  engraving: [Math.PI + 0.22, Math.PI / 2 - 0.06, 10.5],
};

/** Local studio environment: emissive soft-boxes rendered into a PMREM cube (no HDR download). */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#0c0d10');
    const box = (w: number, h: number, pos: [number, number, number], intensity: number, color = '#ffffff') => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide, toneMapped: false }));
      m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
    };
    box(14, 5, [0, 9, 3], 3.2);            // overhead softbox
    box(3, 14, [-9, 1, 4], 2.2);           // left strip
    box(3, 14, [9, 1, 2], 1.6);            // right strip
    box(12, 4, [0, 2, 10], 1.1, '#f3ece2'); // front fill (warm)
    box(10, 3, [0, -1, -10], 1.4, '#dfe8ff'); // back rim (cool)
    box(4, 4, [6, -6, 6], 0.5, '#ffe2c0');  // low warm bounce
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: '#202226' }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -8; env.add(floor);
    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(env, 0.02, 0.1, 100);
    scene.environment = rt.texture;
    return () => { scene.environment = null; rt.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

const Rig = forwardRef<SceneHandle, Props>(function Rig({ view, reduced, autoRotate, onReady, onUserMove }, ref) {
  const cc = useRef<CameraControls>(null!);
  const { gl, scene, camera } = useThree();
  const idleSince = useRef(performance.now());
  const busy = useRef(false);
  const ready = useRef(false);

  const go = (name: View, smooth: boolean) => {
    const [az, po, d] = VIEWS[name];
    const c = cc.current; if (!c) return;
    // shortest way round for azimuth
    const cur = c.azimuthAngle, twoPi = Math.PI * 2;
    let a = az + Math.round((cur - az) / twoPi) * twoPi;
    if (a - cur > Math.PI) a -= twoPi; if (cur - a > Math.PI) a += twoPi;
    busy.current = true;
    Promise.all([c.rotateTo(a, po, smooth), c.dollyTo(d, smooth), c.setTarget(TARGET.x, TARGET.y, TARGET.z, smooth)]).then(() => { busy.current = false; idleSince.current = performance.now(); });
  };

  useImperativeHandle(ref, () => ({
    capture: () => { try { gl.render(scene, camera); return gl.domElement.toDataURL('image/webp', 0.9); } catch { return null; } },
    nudge: (az, zoom = 0) => { const c = cc.current; idleSince.current = performance.now(); if (az) c.rotate(az, 0, !reduced); if (zoom) c.dolly(zoom, !reduced); onUserMove?.(); },
  }));

  // intro: start far & low, fly into the hero view
  useEffect(() => {
    const c = cc.current;
    if (reduced) { go(view.name, false); } else {
      c.rotateTo(-1.6, 1.62, false); c.dollyTo(30, false); c.setTarget(TARGET.x, TARGET.y - 0.8, TARGET.z, false);
      c.smoothTime = 0.9;
      requestAnimationFrame(() => { go(view.name, true); setTimeout(() => { if (cc.current) cc.current.smoothTime = 0.45; }, 1600); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const firstView = useRef(true);
  useEffect(() => { if (firstView.current) { firstView.current = false; return; } go(view.name, !reduced); }, [view.n]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    if (!ready.current) { ready.current = true; requestAnimationFrame(() => onReady?.()); }
    if (autoRotate && !reduced && !busy.current && performance.now() - idleSince.current > 5000) cc.current.rotate(dt * 0.16, 0, false);
  });

  return (
    <CameraControls
      ref={cc}
      makeDefault
      minDistance={6}
      maxDistance={22}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI / 2 + 0.25}
      smoothTime={0.45}
      draggingSmoothTime={0.12}
      truckSpeed={0}
      mouseButtons={{ left: 1, middle: 16, right: 0, wheel: 16 }}
      touches={{ one: 64, two: 32768, three: 0 }}
      onStart={() => { idleSince.current = performance.now(); busy.current = false; onUserMove?.(); }}
      onEnd={() => { idleSince.current = performance.now(); }}
    />
  );
});

/** Software WebGL (no GPU): SwiftShader, llvmpipe, Microsoft Basic Render… */
function isSoftwareRenderer(gl: THREE.WebGLRenderer) {
  try {
    const ctx = gl.getContext();
    const ext = ctx.getExtension('WEBGL_debug_renderer_info');
    const name = String(ctx.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : ctx.RENDERER));
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch { return false; }
}

/** Economy mode: render on demand only — for a burst after each change, once a second for the hands. */
function Pump({ config, view }: Pick<Props, 'config' | 'view'>) {
  const invalidate = useThree((s) => s.invalidate);
  const until = useRef(0);
  useEffect(() => {
    until.current = performance.now() + 1500;
    let raf = 0;
    const loop = () => { invalidate(); if (performance.now() < until.current) raf = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [config, view.n, invalidate]);
  useEffect(() => { const t = setInterval(() => invalidate(), 1000); return () => clearInterval(t); }, [invalidate]);
  return null;
}

/**
 * Compile every shader up front without blocking the main thread (KHR_parallel_shader_compile where
 * available), give the GPU process a moment, then start rendering. Keeps the first frame from
 * freezing the page while dozens of PBR shader variants link.
 */
function Warmup({ onWarm }: { onWarm: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      await gl.compileAsync(scene, camera).catch(() => undefined);
      await new Promise((r) => setTimeout(r, 30));
      if (!cancelled) onWarm();
    }, 30);
    return () => { cancelled = true; clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const Scene = forwardRef<SceneHandle, Props>(function Scene(props, ref) {
  const [warm, setWarm] = useState(false);
  const [kindKey, setKindKey] = useState(0);
  const [eco, setEco] = useState(false);
  const kind = strapKind(props.config.strap);
  useEffect(() => setKindKey((k) => k + 1), [kind, props.config.case]);
  const calm = props.reduced || eco;
  return (
    <Canvas
      dpr={eco ? 1 : [1, 1.75]}
      frameloop={!props.active || !warm ? 'never' : eco ? 'demand' : 'always'}
      onCreated={({ gl }) => { if (import.meta.env.PROD) gl.debug.checkShaderErrors = false; if (!location.hash.includes('hq') && isSoftwareRenderer(gl)) setEco(true); }}
      data-eco={eco ? '1' : '0'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: 30, near: 0.5, far: 80, position: [0, 0, 12] }}
      aria-hidden="true"
    >
      <StudioEnvironment />
      <directionalLight position={[3, 6, 8]} intensity={0.6} />
      <Watch config={props.config} reduced={calm} intro={!calm} />
      <ContactShadows key={kindKey} position={[0, -3.62, -1.6]} scale={12} blur={2.6} far={6} opacity={0.55} resolution={512} frames={calm ? 1 : 50} color="#000000" />
      <Rig ref={ref} {...props} reduced={calm} autoRotate={props.autoRotate && !eco} />
      {!warm && <Warmup onWarm={() => setWarm(true)} />}
      {eco && warm && <Pump config={props.config} view={props.view} />}
    </Canvas>
  );
});
export default Scene;
