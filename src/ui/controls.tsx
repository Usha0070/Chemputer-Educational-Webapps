// Shared controls: Stepper (− n +), labelled Slider, and the in-simulation challenge list.
import { useId, type ReactNode } from 'react';
import { bn } from '@/chem/format';
import { Icon, cx } from './primitives';

export function Stepper({
  label,
  value,
  min = 0,
  max,
  onChange,
  swatch,
  hint,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  /** CSS colour for the little dot next to the label */
  swatch?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-raised/60 px-3 py-2">
      <div className="min-w-0">
        <p id={id} className="flex items-center gap-2 text-sm font-semibold text-ink">
          {swatch && <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: swatch }} aria-hidden="true" />}
          {label}
        </p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="flex items-center gap-1.5" role="group" aria-labelledby={id}>
        <button
          type="button"
          className="btn-icon min-h-[40px] w-10"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`${label} কমাও`}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            −
          </span>
        </button>
        <output className="w-9 text-center font-mono text-lg font-bold text-ink" aria-live="polite">
          {bn(value)}
        </output>
        <button
          type="button"
          className="btn-icon min-h-[40px] w-10"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`${label} বাড়াও`}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
        </button>
      </div>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => bn(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="label">
          {label}
        </label>
        <span className="font-mono text-sm font-semibold text-ink">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer accent-[var(--brand)]"
      />
    </div>
  );
}

export interface Challenge {
  label: ReactNode;
  done: boolean;
}

/** "নিজে চেষ্টা করো" targets inside the simulation; each ticks itself when the student gets there. Not a quiz. */
export function ChallengeList({ items, title = 'নিজে চেষ্টা করো' }: { items: Challenge[]; title?: string }) {
  const done = items.filter((c) => c.done).length;
  return (
    <section className="panel panel-pad" aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Icon name="target" className="h-5 w-5 text-gold" /> {title}
        </h2>
        <span className="font-mono text-xs text-muted">
          {bn(done)}/{bn(items.length)}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((c, i) => (
          <li key={i} className={cx('flex items-start gap-2 text-sm leading-relaxed', c.done ? 'text-ink' : 'text-muted')}>
            <span
              className={cx(
                'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border',
                c.done ? 'border-block-p bg-block-p/20 text-block-p' : 'border-line',
              )}
              aria-hidden="true"
            >
              {c.done && <Icon name="check" className="h-3.5 w-3.5" />}
            </span>
            <span>
              {c.label}
              <span className="sr-only">{c.done ? ' (সম্পন্ন)' : ''}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
