// Shared React UI building blocks. Every tool imports from here so they look alike.
import { createRoot } from 'react-dom/client';
import { ICONS } from './icons.js';
import { bn } from '../lib/chem.js';

/** Mounts a tool into the page's #app container. */
export function mount(App) {
  createRoot(document.getElementById('app')).render(<App />);
}

export function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

export const cx = (...parts) => parts.filter(Boolean).join(' ');

// Block colours: written out in full so Tailwind generates every class.
export const BLOCK = {
  s: { label: 's-ব্লক', text: 'text-block-s', soft: 'bg-block-s/10', border: 'border-block-s/40', ring: 'ring-block-s/60', solid: 'bg-block-s' },
  p: { label: 'p-ব্লক', text: 'text-block-p', soft: 'bg-block-p/10', border: 'border-block-p/40', ring: 'ring-block-p/60', solid: 'bg-block-p' },
  d: { label: 'd-ব্লক', text: 'text-block-d', soft: 'bg-block-d/10', border: 'border-block-d/40', ring: 'ring-block-d/60', solid: 'bg-block-d' },
  f: { label: 'f-ব্লক', text: 'text-block-f', soft: 'bg-block-f/10', border: 'border-block-f/40', ring: 'ring-block-f/60', solid: 'bg-block-f' },
};

export function BlockTag({ block, className }) {
  const b = BLOCK[block];
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold', b.border, b.soft, b.text, className)}>
      {block}
    </span>
  );
}

/** One orbital with its electron count as a real superscript: 3d⁵ */
export function Orb({ id, e, className }) {
  return (
    <span className={cx('orb-token', className)}>
      {id}
      <sup>{e}</sup>
    </span>
  );
}

/** Renders text that contains caret notation (3d^5) with proper superscripts. */
export function Rich({ text }) {
  const parts = text.split(/(\d[spdf]\^\d+)/g);
  return parts.map((part, i) => {
    const m = part.match(/^(\d[spdf])\^(\d+)$/);
    return m ? <Orb key={i} id={m[1]} e={m[2]} /> : part;
  });
}

/** A full configuration line; orbitals in `highlight` get the block colour. */
export function ConfigLine({ list, highlight = [], block, className }) {
  const b = block && BLOCK[block];
  return (
    <p className={cx('flex flex-wrap items-center gap-x-2 gap-y-2 font-mono leading-relaxed', className)}>
      {list.map((o) => (
        <Orb
          key={o.id}
          id={o.id}
          e={o.e}
          className={highlight.includes(o.id) ? cx('rounded-md px-1.5 py-0.5 font-semibold', b?.soft, b?.text) : 'text-ink/90'}
        />
      ))}
    </p>
  );
}

/** Element square: Z, symbol, name — tinted by block. */
export function ElementTile({ el, block, size = 'lg' }) {
  const b = BLOCK[block];
  const big = size === 'lg';
  return (
    <div
      className={cx(
        'flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 text-center',
        b.border,
        b.soft,
        big ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-16 w-16',
      )}
    >
      <span className={cx('font-mono text-muted', big ? 'text-sm' : 'text-[10px]')}>{bn(el.z)}</span>
      <span className={cx('font-bold leading-none', b.text, big ? 'text-4xl sm:text-5xl' : 'text-2xl')}>{el.symbol}</span>
      {big && <span className="mt-1.5 text-sm font-medium text-ink/90">{el.name}</span>}
    </div>
  );
}

export function Stat({ label, value, className }) {
  return (
    <div className="rounded-xl border border-line bg-raised/70 px-4 py-3 text-center">
      <div className={cx('text-2xl font-bold sm:text-3xl', className)}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-muted">{label}</div>
    </div>
  );
}

/** Segmented control (two or more mutually exclusive options). */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="seg-btn" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} className="h-4 w-4" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Atomic-number input that also accepts Bangla digits (২৬). */
export function ZForm({ value, onChange, onSubmit, max, buttonLabel, error, idPrefix = 'z' }) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor={`${idPrefix}-input`} className="label">
        পারমাণবিক সংখ্যা (১–{bn(max)})
      </label>
      <div className="flex gap-2">
        <input
          id={`${idPrefix}-input`}
          className="input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={`যেমন: ${bn(26)}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${idPrefix}-error` : undefined}
        />
        <button type="submit" className="btn-primary shrink-0 px-5">
          {buttonLabel}
          <Icon name="arrowRight" className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p id={`${idPrefix}-error`} role="alert" className="text-sm font-medium text-warn">
          {error}
        </p>
      )}
    </form>
  );
}

/** Callout box for exceptions and notes. */
export function Callout({ tone = 'warn', title, children }) {
  const warn = tone === 'warn';
  return (
    <div className={cx('flex gap-3 rounded-xl border p-4', warn ? 'border-warn/30 bg-warn/10' : 'border-accent/30 bg-accent/10')}>
      <Icon name={warn ? 'alert' : 'info'} className={cx('mt-0.5 h-5 w-5 shrink-0', warn ? 'text-warn' : 'text-accent')} />
      <div className="text-sm leading-relaxed">
        {title && <p className={cx('mb-1 font-bold', warn ? 'text-warn' : 'text-ink')}>{title}</p>}
        <div className="text-ink/85">{children}</div>
      </div>
    </div>
  );
}

// URL helpers so a result can be shared as a link (e.g. ?z=24).
export function readParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
export function writeParams(params) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  window.history.replaceState(null, '', url);
}
