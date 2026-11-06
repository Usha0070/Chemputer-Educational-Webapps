// Chemical typography: <Formula>H2SO4</Formula> → H₂SO₄, <Equation>2H2 + O2 -> 2H2O</Equation>.
import { Fragment } from 'react';
import { formulaToUnicode, tokenizeEquation, tokenizeFormula } from '@/chem/notation';
import { bn } from '@/chem/format';
import { cx } from './primitives';

export function Formula({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cx('font-mono whitespace-nowrap', className)} aria-label={formulaToUnicode(children)}>
      <span aria-hidden="true">
        {tokenizeFormula(children).map((s, i) => {
          if (s.kind === 'sub') return <sub key={i}>{s.value}</sub>;
          if (s.kind === 'sup') return <sup key={i}>{s.value}</sup>;
          if (s.kind === 'state')
            return (
              <span key={i} className="ms-px text-[0.75em] text-muted">
                {s.value}
              </span>
            );
          return <Fragment key={i}>{s.value}</Fragment>;
        })}
      </span>
    </span>
  );
}

export function Equation({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cx('inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-mono', className)}>
      {tokenizeEquation(children).map((p, i) => {
        if (p.kind === 'species') return <Formula key={i}>{p.formula}</Formula>;
        if (p.kind === 'plus') return <span key={i}>+</span>;
        if (!p.over && !p.under)
          return (
            <span key={i} className="text-gold">
              {p.arrow}
            </span>
          );
        return (
          <span key={i} className="inline-flex flex-col items-center px-1 leading-none">
            <span className="text-[0.65em] text-muted">{p.over ? <Formula>{p.over}</Formula> : ' '}</span>
            <span className="text-gold">{p.arrow === '⇌' ? '⇌' : '⟶'}</span>
            <span className="text-[0.65em] text-muted">{p.under ? <Formula>{p.under}</Formula> : ' '}</span>
          </span>
        );
      })}
    </span>
  );
}

/** Scientific notation with Bangla digits: 1.2044e24 → ১.২০ × ১০²⁴ (exponent as a real superscript). */
export function Sci({ value, digits = 3, className }: { value: number; digits?: number; className?: string }) {
  if (!Number.isFinite(value)) return <span className={className}>—</span>;
  const abs = Math.abs(value);
  if (abs === 0 || (abs >= 0.01 && abs < 10000)) {
    const fixed = Number(value.toPrecision(digits + 1));
    return <span className={cx('font-mono', className)}>{bn(String(fixed))}</span>;
  }
  const e = Math.floor(Math.log10(abs));
  const m = value / 10 ** e;
  return (
    <span className={cx('font-mono whitespace-nowrap', className)} aria-label={`${m.toFixed(digits)} গুণ ১০-এর ঘাত ${e}`}>
      {bn(m.toFixed(digits).replace(/\.?0+$/, ''))} × ১০<sup>{bn(e)}</sup>
    </span>
  );
}
