// Shared React building blocks. Every simulation imports from the UI kit so they look and behave alike.
import type { ReactNode } from 'react';
import { BLOCK_RULES, bn, type Analysis, type Block, type FilledOrbital } from '@/chem';
import { ICONS, type IconName } from './icons';

export const cx = (...parts: (string | false | null | undefined | 0)[]): string => parts.filter(Boolean).join(' ');

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
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

export interface BlockStyle {
  label: string;
  text: string;
  soft: string;
  border: string;
  ring: string;
  solid: string;
}

// Block colours: written out in full so Tailwind generates every class.
export const BLOCK: Record<Block, BlockStyle> = {
  s: {
    label: 's-ব্লক',
    text: 'text-block-s',
    soft: 'bg-block-s/10',
    border: 'border-block-s/50',
    ring: 'ring-block-s/60',
    solid: 'bg-block-s',
  },
  p: {
    label: 'p-ব্লক',
    text: 'text-block-p',
    soft: 'bg-block-p/10',
    border: 'border-block-p/50',
    ring: 'ring-block-p/60',
    solid: 'bg-block-p',
  },
  d: {
    label: 'd-ব্লক',
    text: 'text-block-d',
    soft: 'bg-block-d/10',
    border: 'border-block-d/50',
    ring: 'ring-block-d/60',
    solid: 'bg-block-d',
  },
  f: {
    label: 'f-ব্লক',
    text: 'text-block-f',
    soft: 'bg-block-f/10',
    border: 'border-block-f/50',
    ring: 'ring-block-f/60',
    solid: 'bg-block-f',
  },
};

export function BlockTag({ block, className }: { block: Block; className?: string }) {
  const b = BLOCK[block];
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold',
        b.border,
        b.soft,
        b.text,
        className,
      )}
    >
      {block}
    </span>
  );
}

/** One orbital with its electron count as a real superscript: 3d⁵ */
export function Orb({ id, e, className }: { id: string; e: number | string; className?: string }) {
  return (
    <span className={cx('orb-token', className)}>
      {id}
      <sup>{e}</sup>
    </span>
  );
}

/** Renders text that contains caret notation (3d^5) with proper superscripts. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\d[spdf]\^\d+)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^(\d[spdf])\^(\d+)$/);
        return m ? <Orb key={i} id={m[1]!} e={m[2]!} /> : part;
      })}
    </>
  );
}

/** A full configuration line; orbitals in `highlight` get the block colour. */
export function ConfigLine({
  list,
  highlight = [],
  block,
  className,
}: {
  list: FilledOrbital[];
  highlight?: string[];
  block?: Block;
  className?: string;
}) {
  const b = block ? BLOCK[block] : undefined;
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

/** Element square: Z, symbol, name, tinted by block. */
export function ElementTile({
  el,
  block,
  size = 'lg',
}: {
  el: { z: number; symbol: string; name: string };
  block: Block;
  size?: 'lg' | 'sm';
}) {
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
      <span className={cx('leading-none font-bold', b.text, big ? 'text-4xl sm:text-5xl' : 'text-2xl')}>{el.symbol}</span>
      {big && <span className="mt-1.5 text-sm font-medium text-ink/90">{el.name}</span>}
    </div>
  );
}

export function Stat({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="rounded-xl border border-line bg-raised/70 px-4 py-3 text-center">
      <div className={cx('text-2xl font-bold sm:text-3xl', className)}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-muted">{label}</div>
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

/** Segmented control (two or more mutually exclusive options). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
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
export function ZForm({
  value,
  onChange,
  onSubmit,
  max,
  buttonLabel,
  error,
  idPrefix = 'z',
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  max: number;
  buttonLabel: string;
  error?: string;
  idPrefix?: string;
}) {
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
        <p id={`${idPrefix}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/** Callout box for exceptions and notes. */
export function Callout({ tone = 'exception', title, children }: { tone?: 'exception' | 'info'; title?: string; children: ReactNode }) {
  const exc = tone === 'exception';
  return (
    <div className={cx('flex gap-3 rounded-xl border p-4', exc ? 'border-exc/40 bg-exc/10' : 'border-accent/30 bg-accent/10')}>
      <Icon name={exc ? 'alert' : 'info'} className={cx('mt-0.5 h-5 w-5 shrink-0', exc ? 'text-exc' : 'text-accent')} />
      <div className="text-sm leading-relaxed">
        {title && <p className={cx('mb-1 font-bold', exc ? 'text-exc' : 'text-ink')}>{title}</p>}
        <div className="text-ink/85">{children}</div>
      </div>
    </div>
  );
}

// ── Step-by-step "how do we get the period and group?" explanation ─────────
// Shared by the calculator and the blocks tool so both explain things the same way.

function Step({ n, title, block, children }: { n: number; title: string; block: Block; children: ReactNode }) {
  return (
    <li className="flex gap-3 sm:gap-4">
      <span
        className={cx(
          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-raised text-sm font-bold',
          BLOCK[block].border,
          BLOCK[block].text,
        )}
      >
        {bn(n)}
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <h3 className="font-semibold text-ink">{title}</h3>
        <div className="mt-1 text-[15px] leading-relaxed text-muted">{children}</div>
      </div>
    </li>
  );
}

function Calculation({ a }: { a: Analysis }) {
  const { calc } = a;
  if (calc.kind === 'he' || calc.kind === 'f') {
    return (
      <span>
        {calc.kind === 'f' ? 'f-ব্লক মৌল, তাই হিসাব ছাড়াই' : 'বিশেষ ক্ষেত্র, তাই'} গ্রুপ = {bn(a.group)}
      </span>
    );
  }
  const terms = calc.parts.map(([id, e]) => (
    <span key={id} className="inline-flex items-center">
      <Orb id={id} e={e} className={BLOCK[a.block].text} />
    </span>
  ));
  const numbers = calc.parts.map(([, e]) => bn(e));
  const sum = calc.kind === 'p' ? `১০ + (${numbers.join(' + ')})` : numbers.join(' + ');
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {calc.kind === 'p' && <span>১০ +</span>}
      {terms.flatMap((t, i) => (i ? [<span key={`plus-${i}`}>+</span>, t] : [t]))}
      <span aria-hidden="true">→</span>
      <span className="font-mono">
        {sum} = <strong className="text-ink">{bn(a.group)}</strong>
      </span>
    </span>
  );
}

export function GroupSteps({ a, showPeriod = true, showException = true }: { a: Analysis; showPeriod?: boolean; showException?: boolean }) {
  const b = BLOCK[a.block];
  const num = { period: 2, rule: showPeriod ? 3 : 2, calc: showPeriod ? 4 : 3 };
  return (
    <ol className="space-y-5">
      <Step n={1} title="ব্লক চিহ্নিত করো" block={a.block}>
        আউফবাউ নীতি অনুযায়ী শেষ ইলেকট্রনটি <span className={cx('orb-token font-semibold', b.text)}>{a.lastId}</span> অরবিটালে প্রবেশ করে,
        তাই এটি <strong className={b.text}>{b.label}ের</strong> মৌল।
        {showException && a.exception && (
          <span className="mt-2 block rounded-lg border border-exc/40 bg-exc/10 px-3 py-2 text-sm text-ink/85">
            <strong className="text-exc">ব্যতিক্রম: </strong>
            <Rich text={a.exception.note} />
          </span>
        )}
      </Step>
      {showPeriod && (
        <Step n={num.period} title="পর্যায় নির্ণয় করো" block={a.block}>
          সর্বোচ্চ প্রধান শক্তিস্তর n = <strong className="text-ink">{bn(a.period)}</strong>, তাই মৌলটি{' '}
          <strong className="text-ink">{bn(a.period)} নম্বর পর্যায়ে</strong>।
        </Step>
      )}
      <Step n={num.rule} title={a.calc.kind === 'he' ? 'বিশেষ ক্ষেত্র' : `${b.label}ের নিয়ম`} block={a.block}>
        <span className={cx('mt-1 block rounded-lg border-l-4 bg-raised px-3 py-2 text-ink/90', b.border)}>
          <Rich text={a.calc.kind === 'he' ? BLOCK_RULES.he : BLOCK_RULES[a.block]} />
        </span>
      </Step>
      <Step n={num.calc} title="গণনা" block={a.block}>
        <Calculation a={a} />
      </Step>
    </ol>
  );
}

/** Big closing line: “তাই আয়রন ৮ নম্বর গ্রুপের মৌল।” */
export function GroupResult({ a }: { a: Analysis }) {
  const b = BLOCK[a.block];
  return (
    <div className={cx('flex items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5', b.border, b.soft)}>
      <p className="text-base text-ink sm:text-lg">
        তাই <strong>{a.name}</strong> হলো <strong className={b.text}>{bn(a.group)} নম্বর গ্রুপের</strong> মৌল।
      </p>
      <div className="text-center">
        <div className={cx('text-4xl leading-none font-bold sm:text-5xl', b.text)}>{bn(a.group)}</div>
        <div className="mt-1 text-xs font-medium text-muted">গ্রুপ</div>
      </div>
    </div>
  );
}
