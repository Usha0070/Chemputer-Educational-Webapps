// Canvas helpers: a responsive, device-pixel-ratio aware canvas and theme colour lookup.
import { useEffect, useRef, useState } from 'react';

export interface CanvasSize {
  w: number;
  h: number;
  dpr: number;
}

/** Keeps a canvas sized to its container (CSS px) with a sharp backing store. Height = width × aspect, clamped. */
export function useResponsiveCanvas(aspect: number, opts: { minH?: number; maxH?: number } = {}) {
  const { minH = 220, maxH = 560 } = opts;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<CanvasSize>({ w: 640, h: Math.round(640 * aspect), dpr: 1 });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const measure = () => {
      const w = Math.max(240, Math.floor(wrap.clientWidth));
      const h = Math.max(minH, Math.min(maxH, Math.round(w * aspect)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      setSize((s) => (s.w === w && s.h === h && s.dpr === dpr ? s : { w, h, dpr }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [aspect, minH, maxH]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = Math.round(size.w * size.dpr);
    c.height = Math.round(size.h * size.dpr);
    c.style.width = `${size.w}px`;
    c.style.height = `${size.h}px`;
  }, [size]);

  /** 2D context with the DPR transform applied, or null before mount. */
  const getContext = () => {
    const ctx = canvasRef.current?.getContext('2d') ?? null;
    ctx?.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    return ctx;
  };

  return { wrapRef, canvasRef, size, getContext };
}

/** Reads design tokens (CSS variables) so canvas drawings follow the light/dark theme. */
export function themeColors<K extends string>(names: readonly K[]): Record<K, string> {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim() || '#888'])) as Record<K, string>;
}

export { makeRandom } from '@/chem/random';
