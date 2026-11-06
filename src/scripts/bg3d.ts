// 3D molecular background (the scene itself: src/scripts/bg3d-scene.ts).
// Where the browser allows, the canvas is handed to a Web Worker (OffscreenCanvas), so the animation never runs on
// the page's main thread: taps, scrolling and simulations stay as responsive as without it. Otherwise it draws here.
// Starts after the page has loaded and gone idle. A single still frame with prefers-reduced-motion or Data Saver;
// paused while the tab is hidden or a simulation is fullscreen; dimmed on simulation pages; steps its quality down
// by itself on slow devices.
import { createScene, type Colours, type SceneInit, type SceneMessage } from './bg3d-scene';

const canvas = document.querySelector<HTMLCanvasElement>('[data-bg3d]');

if (canvas) {
  const root = document.documentElement;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowEnd = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;

  const hex = (v: string, fallback: string) => {
    const t = v.trim();
    return /^#[0-9a-f]{6}$/i.test(t) ? t : fallback;
  };
  const theme = (): { colours: Colours; light: boolean } => {
    const css = getComputedStyle(root);
    const light = root.dataset.theme === 'light';
    return {
      light,
      colours: {
        glow: hex(css.getPropertyValue('--glow'), '#de7e72'),
        gold: hex(css.getPropertyValue('--gold'), '#fcde56'),
        // hydrogens: white on dark, a soft rose on light (dark ink dots would look like smudges there)
        ink: hex(css.getPropertyValue(light ? '--line-strong' : '--ink'), '#f6f6f6'),
        motif: hex(css.getPropertyValue('--motif'), '#de7e72'),
      },
    };
  };
  const wantAnimated = () => !still.matches && !saveData;
  const paused = () => document.hidden || !!document.fullscreenElement;
  const size = () => ({ width: canvas.clientWidth, height: canvas.clientHeight, dpr: window.devicePixelRatio || 1 });
  const setMode = (mode: string) => (canvas.dataset.mode = mode);

  const boot = () => {
    const init: SceneInit = { ...size(), ...theme(), dim: root.dataset.bg === 'dim', animated: wantAnimated(), tier: lowEnd ? 1 : 0 };
    let send: (msg: SceneMessage) => void;
    if ('transferControlToOffscreen' in canvas && typeof Worker === 'function') {
      const offscreen = canvas.transferControlToOffscreen();
      const worker = new Worker(new URL('./bg3d.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<{ type: string; mode: string }>) => {
        if (e.data.type === 'mode') setMode(e.data.mode);
      };
      worker.postMessage({ type: 'init', canvas: offscreen, ...init }, [offscreen]);
      send = (msg) => worker.postMessage(msg);
      canvas.dataset.renderer = 'worker';
    } else {
      send = createScene(canvas, (s) => Object.assign(document.createElement('canvas'), { width: s, height: s }), setMode, init);
      canvas.dataset.renderer = 'page';
    }
    setMode(init.animated ? 'animated' : 'static');
    canvas.dataset.live = 'true';
    if (paused()) send({ type: 'paused', value: true });

    new ResizeObserver(() => send({ type: 'size', ...size() })).observe(canvas);
    new MutationObserver(() => send({ type: 'theme', ...theme() })).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    const onPause = () => send({ type: 'paused', value: paused() });
    document.addEventListener('visibilitychange', onPause);
    document.addEventListener('fullscreenchange', onPause);
    still.addEventListener('change', () => send({ type: 'animated', value: wantAnimated() }));
    let pointerQueued = false;
    window.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse' || pointerQueued) return;
        pointerQueued = true;
        requestAnimationFrame(() => {
          pointerQueued = false;
          send({
            type: 'pointer',
            tx: (e.clientX / Math.max(1, canvas.clientWidth) - 0.5) * 0.35,
            tp: (e.clientY / Math.max(1, canvas.clientHeight) - 0.5) * 0.22,
          });
        });
      },
      { passive: true },
    );
    let scrollQueued = false;
    window.addEventListener(
      'scroll',
      () => {
        if (scrollQueued) return;
        scrollQueued = true;
        requestAnimationFrame(() => {
          scrollQueued = false;
          send({ type: 'scroll', y: window.scrollY });
        });
      },
      { passive: true },
    );
  };

  // Start once the page has loaded and is idle, so the background never competes with the content or a simulation.
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  const later = () => (idle ? idle(boot, { timeout: 3000 }) : window.setTimeout(boot, 600));
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
}
