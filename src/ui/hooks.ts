// Shared simulation hooks: step player, URL state, visibility and the animation clock.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

// ── URL state ───────────────────────────────────────────────────────────────

/** Reads one query parameter (browser only). */
export function readParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

/** Writes query parameters without adding history entries. null/undefined/'' removes a key. */
export function writeParams(params: Record<string, string | number | null | undefined>): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, String(v));
  }
  window.history.replaceState(window.history.state, '', url);
}

/** Runs once after hydration with the page's query parameters. Keeps server and first client render identical. */
export function useUrlInit(init: (params: URLSearchParams) => void): void {
  const ref = useRef(init);
  useEffect(() => {
    ref.current(new URLSearchParams(window.location.search));
  }, []);
}

export interface UrlCodec<T> {
  parse: (raw: string) => T | undefined;
  /** Return null to drop the parameter (e.g. for the default value). */
  format: (value: T) => string | null;
}

/**
 * State mirrored in a query parameter, so a simulation can be shared as a link (?z=24).
 * The first render uses `fallback` (same as the static HTML); the URL value is applied after hydration.
 */
export function useUrlState<T>(key: string, fallback: T, codec: UrlCodec<T>): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(fallback);
  const codecRef = useRef(codec);
  useEffect(() => {
    const raw = readParam(key);
    if (raw === null) return;
    const parsed = codecRef.current.parse(raw);
    if (parsed !== undefined) setValue(parsed);
  }, [key]);
  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeParams({ [key]: codecRef.current.format(next) });
    },
    [key],
  );
  return [value, set];
}

// ── Environment ─────────────────────────────────────────────────────────────

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** True while the element is on screen and the tab is visible. Animations should pause otherwise. */
export function useActive(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return inView && visible;
}

// ── Step player ─────────────────────────────────────────────────────────────

export interface StepsController {
  at: number;
  count: number;
  playing: boolean;
  done: boolean;
  speed: number;
  setSpeed: (s: number) => void;
  play: () => void;
  pause: () => void;
  /** Play/pause; when finished it replays from the first step. */
  toggle: () => void;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  /** Back to step 0, optionally starting playback. */
  restart: (autoplay?: boolean) => void;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

/**
 * Generalised "ধাপে ধাপে" player: play/pause, ← → stepping, speed, and auto-advance that
 * waits while the simulation is off-screen (`active` false).
 */
export function useSteps(count: number, opts: { intervalMs?: number; active?: boolean; keyboard?: boolean } = {}): StepsController {
  const { intervalMs = 1100, active = true, keyboard = true } = opts;
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const last = count - 1;
  const done = count > 0 && at >= last;

  useEffect(() => {
    if (!playing || !active) return undefined;
    if (at >= last) {
      setPlaying(false);
      return undefined;
    }
    const t = window.setTimeout(() => setAt((i) => Math.min(i + 1, last)), intervalMs / speed);
    return () => window.clearTimeout(t);
  }, [playing, active, at, last, intervalMs, speed]);

  const next = useCallback(() => {
    setPlaying(false);
    setAt((i) => Math.min(i + 1, Math.max(last, 0)));
  }, [last]);
  const prev = useCallback(() => {
    setPlaying(false);
    setAt((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    if (!keyboard || count === 0) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboard, count, next, prev]);

  return {
    at,
    count,
    playing,
    done,
    speed,
    setSpeed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => {
      if (playing) setPlaying(false);
      else {
        if (done) setAt(0);
        setPlaying(true);
      }
    },
    next,
    prev,
    goTo: (i) => {
      setPlaying(false);
      setAt(Math.max(0, Math.min(i, last)));
    },
    restart: (autoplay = false) => {
      setAt(0);
      setPlaying(autoplay);
    },
  };
}

// ── Continuous clock (particles, physics) ───────────────────────────────────

export interface ClockController {
  playing: boolean;
  speed: number;
  setSpeed: (s: number) => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  /** Advance one fixed tick while paused. */
  step: () => void;
}

/**
 * One shared requestAnimationFrame loop. `onTick(dt)` receives simulated seconds (already × speed,
 * clamped so a background tab never produces a giant jump). Stops while `active` is false.
 */
export function useSimClock(
  onTick: (dt: number) => void,
  opts: { active?: boolean; autoplay?: boolean; stepSeconds?: number } = {},
): ClockController {
  const { active = true, autoplay = true, stepSeconds = 1 / 30 } = opts;
  const [playing, setPlaying] = useState(autoplay);
  const [speed, setSpeed] = useState(1);
  const tickRef = useRef(onTick);
  tickRef.current = onTick;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    if (!playing || !active) return undefined;
    let raf = 0;
    let lastT = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.05) * speedRef.current;
      lastT = t;
      tickRef.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, active]);

  return {
    playing,
    speed,
    setSpeed,
    toggle: () => setPlaying((p) => !p),
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    step: () => tickRef.current(stepSeconds * speedRef.current),
  };
}
