// SimShell: the frame every simulation lives in. Same controls in the same place on every page:
// play/pause · step · speed (when the sim has a player) · reset · share link · fullscreen.
import { useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { bn } from '@/chem/format';
import type { ClockController, StepsController } from './hooks';
import { Icon, cx } from './primitives';

export const SPEEDS = [0.5, 1, 1.5, 2] as const;

function SpeedSelect({ speed, setSpeed, id }: { speed: number; setSpeed: (s: number) => void; id: string }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted" htmlFor={id}>
      <Icon name="gauge" className="h-4 w-4" />
      <span className="sr-only">গতি</span>
      <select
        id={id}
        className="min-h-[36px] rounded-lg border border-line bg-raised px-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {bn(s)}×
          </option>
        ))}
      </select>
    </label>
  );
}

/** Prev · play/pause · next · progress · speed for a step-by-step animation. */
export function StepControls({
  steps,
  showSpeed = true,
  showHint = true,
}: {
  steps: StepsController;
  showSpeed?: boolean;
  showHint?: boolean;
}) {
  const { at, count, playing, done } = steps;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-icon" onClick={steps.prev} disabled={!count || at === 0} aria-label="আগের ধাপ">
          <Icon name="chevronLeft" />
        </button>
        <button type="button" className="btn-primary flex-1 sm:w-44 sm:flex-none" onClick={steps.toggle} disabled={!count}>
          <Icon name={playing ? 'pause' : done ? 'rotate' : 'play'} className="h-4 w-4" />
          {playing ? 'থামাও' : done ? 'আবার দেখো' : 'চালাও'}
        </button>
        <button type="button" className="btn-icon" onClick={steps.next} disabled={!count || done} aria-label="পরের ধাপ">
          <Icon name="chevronRight" />
        </button>
        <div className="ml-2 hidden h-1.5 flex-1 overflow-hidden rounded-full bg-line sm:block" aria-hidden="true">
          <div
            className="h-full rounded-full bg-linear-to-r from-brand to-gold transition-all duration-500"
            style={{ width: count ? `${((at + 1) / count) * 100}%` : '0%' }}
          />
        </div>
        {showSpeed && <SpeedSelect speed={steps.speed} setSpeed={steps.setSpeed} id="step-speed" />}
      </div>
      {showHint && <p className="mt-2 hidden text-xs text-muted sm:block">টিপস: কিবোর্ডের ← → দিয়েও ধাপ বদলানো যায়।</p>}
    </div>
  );
}

/** Play/pause · single step · speed for a continuous simulation. */
export function ClockControls({ clock }: { clock: ClockController }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn-primary min-h-[40px] px-3" onClick={clock.toggle} aria-pressed={clock.playing}>
        <Icon name={clock.playing ? 'pause' : 'play'} className="h-4 w-4" />
        {clock.playing ? 'থামাও' : 'চালাও'}
      </button>
      <button type="button" className="btn-icon min-h-[40px]" onClick={clock.step} disabled={clock.playing} aria-label="এক ধাপ এগোও">
        <Icon name="stepForward" className="h-4 w-4" />
      </button>
      <SpeedSelect speed={clock.speed} setSpeed={clock.setSpeed} id="clock-speed" />
    </div>
  );
}

function useFullscreen(target: RefObject<HTMLElement | null>) {
  const [isFull, setFull] = useState(false);
  const [pseudo, setPseudo] = useState(false);
  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === target.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [target]);
  useEffect(() => {
    if (!pseudo) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPseudo(false);
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [pseudo]);
  const toggle = async () => {
    const el = target.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (pseudo) setPseudo(false);
    else if (el.requestFullscreen) {
      try {
        await el.requestFullscreen();
      } catch {
        setPseudo(true);
      }
    } else setPseudo(true);
  };
  return { active: isFull || pseudo, pseudo, toggle };
}

export interface SimShellProps {
  /** Accessible name, e.g. the simulation title. */
  label: string;
  children: ReactNode;
  /** Player for continuous simulations (shown in the toolbar). */
  clock?: ClockController;
  /** Step player shown in the toolbar (alternatively place <StepControls> inside the stage). */
  steps?: StepsController;
  onReset?: () => void;
  /** Extra toolbar content on the left (mode switches, presets…). */
  toolbar?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export function SimShell({ label, children, clock, steps, onReset, toolbar, className, ref }: SimShellProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const fs = useFullscreen(rootRef);

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast('লিংক কপি হয়েছে!');
    } catch {
      setToast('লিংক: ' + url);
    }
  };

  const setRefs = (el: HTMLDivElement | null) => {
    rootRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <div
      ref={setRefs}
      className={cx('sim-shell relative', fs.active && 'p-3 sm:p-6', className)}
      data-sim-ready={ready ? 'true' : 'false'}
      data-pseudo-fullscreen={fs.pseudo ? 'true' : undefined}
      role="region"
      aria-label={label}
    >
      <div
        className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/80 p-2 sm:gap-3"
        role="toolbar"
        aria-label="সিমুলেশন নিয়ন্ত্রণ"
      >
        <span className="label-en hidden px-2 text-[10px] text-gold/80 md:inline">Simulation</span>
        {clock && <ClockControls clock={clock} />}
        {steps && <StepControls steps={steps} showHint={false} />}
        {toolbar}
        <div className="ms-auto flex items-center gap-1.5">
          {onReset && (
            <button type="button" className="btn-icon min-h-[40px] w-10" onClick={onReset} aria-label="শুরুর অবস্থায় ফেরো" title="রিসেট">
              <Icon name="rotate" className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            className="btn-icon min-h-[40px] w-10"
            onClick={share}
            aria-label="এই অবস্থার লিংক শেয়ার করো"
            title="শেয়ার"
          >
            <Icon name="link" className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-icon min-h-[40px] w-10"
            onClick={fs.toggle}
            aria-label={fs.active ? 'পূর্ণ পর্দা বন্ধ করো' : 'পূর্ণ পর্দায় দেখো'}
            aria-pressed={fs.active}
            title="পূর্ণ পর্দা"
          >
            <Icon name={fs.active ? 'minimize' : 'maximize'} className="h-4 w-4" />
          </button>
        </div>
      </div>
      {children}
      <p
        className={cx(
          'pointer-events-none fixed inset-x-0 bottom-6 z-[110] mx-auto w-fit max-w-[90vw] truncate rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-lg transition',
          toast ? 'opacity-100' : 'opacity-0',
        )}
        role="status"
        aria-live="polite"
      >
        {toast}
      </p>
    </div>
  );
}
