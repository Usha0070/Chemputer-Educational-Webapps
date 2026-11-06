// Equation balancing with exact rational arithmetic (no floating-point surprises).
// "Fe + O2 -> Fe2O3" → coefficients [4, 3, 2]. Charges count as an extra conserved quantity, so ionic equations work too.
import { parseFormula, type Counts } from './formula';

export interface Species {
  formula: string;
  side: 'left' | 'right';
}

export interface ParsedEquation {
  species: Species[];
  /** element (and "charge") rows used for conservation */
  elements: string[];
}

/** Splits "A + B -> C + D" (also =, →, ⇌, <=>). Leading coefficients typed by the student are ignored. */
export function parseEquation(text: string): ParsedEquation {
  const sides = text.split(/\s*(?:<=>|<->|->|=>|=|→|⇌)\s*/);
  if (sides.length !== 2) throw new Error('একটি তীর চিহ্ন (->) দিয়ে বিক্রিয়ক ও উৎপাদ আলাদা করো।');
  const species: Species[] = [];
  sides.forEach((side, i) => {
    const parts = side
      .split(/\s+\+\s+|\s*\+\s*(?=[A-Z0-9([])/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) throw new Error(i === 0 ? 'বিক্রিয়ক লেখো।' : 'উৎপাদ লেখো।');
    for (const p of parts) species.push({ formula: p.replace(/^\d+(?=[A-Z([])/, ''), side: i === 0 ? 'left' : 'right' });
  });
  const elements: string[] = [];
  let hasCharge = false;
  for (const s of species) {
    const { atoms, charge } = parseFormula(s.formula);
    for (const el of Object.keys(atoms)) if (!elements.includes(el)) elements.push(el);
    if (charge !== 0) hasCharge = true;
  }
  if (hasCharge) elements.push('charge');
  return { species, elements };
}

// ── tiny exact rationals ────────────────────────────────────────────────────
type Q = [bigint, bigint]; // numerator, denominator (> 0)
const babs = (a: bigint) => (a < 0n ? -a : a);
const bgcd = (a: bigint, b: bigint): bigint => (b === 0n ? babs(a) : bgcd(b, a % b));
const q = (n: bigint, d: bigint = 1n): Q => {
  if (d < 0n) [n, d] = [-n, -d];
  const g = bgcd(n, d) || 1n;
  return [n / g, d / g];
};
const sub = (a: Q, b: Q): Q => q(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const mul = (a: Q, b: Q): Q => q(a[0] * b[0], a[1] * b[1]);
const div = (a: Q, b: Q): Q => q(a[0] * b[1], a[1] * b[0]);
const isZero = (a: Q) => a[0] === 0n;

/** Conservation matrix: rows = elements (+ charge), columns = species; products negative. */
export function matrixOf(eq: ParsedEquation): number[][] {
  const parsed = eq.species.map((s) => parseFormula(s.formula));
  return eq.elements.map((el) =>
    eq.species.map((s, j) => {
      const sign = s.side === 'left' ? 1 : -1;
      const p = parsed[j]!;
      return sign * (el === 'charge' ? p.charge : (p.atoms[el] ?? 0));
    }),
  );
}

export type BalanceResult =
  { ok: true; coefficients: number[] } | { ok: false; reason: 'impossible' | 'ambiguous' | 'invalid'; message: string };

/** Smallest whole-number coefficients that conserve every element (and charge). */
export function balance(text: string): BalanceResult {
  let eq: ParsedEquation;
  try {
    eq = parseEquation(text);
  } catch (e) {
    return { ok: false, reason: 'invalid', message: (e as Error).message };
  }
  const m = matrixOf(eq).map((row) => row.map((v) => q(BigInt(v))));
  const cols = eq.species.length;
  // Reduced row-echelon form
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < cols && r < m.length; c++) {
    const pr = m.findIndex((row, i) => i >= r && !isZero(row[c]!));
    if (pr === -1) continue;
    [m[r], m[pr]] = [m[pr]!, m[r]!];
    const pv = m[r]![c]!;
    m[r] = m[r]!.map((v) => div(v, pv));
    for (let i = 0; i < m.length; i++) {
      if (i === r || isZero(m[i]![c]!)) continue;
      const f = m[i]![c]!;
      m[i] = m[i]!.map((v, j) => sub(v, mul(f, m[r]![j]!)));
    }
    pivots.push(c);
    r++;
  }
  const free = Array.from({ length: cols }, (_, c) => c).filter((c) => !pivots.includes(c));
  if (free.length === 0)
    return { ok: false, reason: 'impossible', message: 'এই সমীকরণ সমতা করা সম্ভব নয়: বিক্রিয়ক ও উৎপাদে মৌলগুলো মেলে না।' };
  if (free.length > 1)
    return { ok: false, reason: 'ambiguous', message: 'একাধিকভাবে সমতা করা যায়: এটি আসলে দুটি আলাদা বিক্রিয়ার যোগফল।' };
  const f = free[0]!;
  const x: Q[] = Array.from({ length: cols }, () => q(0n));
  x[f] = q(1n);
  pivots.forEach((pc, row) => {
    x[pc] = q(-m[row]![f]![0], m[row]![f]![1]);
  });
  const lcm = x.reduce((acc, v) => (acc * v[1]) / bgcd(acc, v[1]), 1n);
  let ints = x.map((v) => (v[0] * lcm) / v[1]);
  if (ints.every((v) => v <= 0n)) ints = ints.map((v) => -v);
  if (ints.some((v) => v <= 0n))
    return { ok: false, reason: 'impossible', message: 'ধনাত্মক সহগ দিয়ে সমতা করা যায় না। সংকেতগুলো আবার দেখো।' };
  const g = ints.reduce((a, b) => bgcd(a, b));
  return { ok: true, coefficients: ints.map((v) => Number(v / g)) };
}

/** Atom count of every element on each side for the given coefficients (for the live balance view). */
export function sideCounts(eq: ParsedEquation, coefficients: number[]): { element: string; left: number; right: number }[] {
  const parsed = eq.species.map((s) => parseFormula(s.formula));
  return eq.elements.map((el) => {
    let left = 0;
    let right = 0;
    eq.species.forEach((s, j) => {
      const p = parsed[j]!;
      const n = (el === 'charge' ? p.charge : (p.atoms[el] ?? 0)) * (coefficients[j] ?? 0);
      if (s.side === 'left') left += n;
      else right += n;
    });
    return { element: el, left, right };
  });
}

export const isBalanced = (eq: ParsedEquation, coefficients: number[]): boolean =>
  coefficients.every((c) => c > 0) && sideCounts(eq, coefficients).every((r) => r.left === r.right);

/** "4Fe + 3O2 -> 2Fe2O3" */
export function writeEquation(eq: ParsedEquation, coefficients: number[]): string {
  const side = (s: 'left' | 'right') =>
    eq.species
      .map((sp, j) => ({ sp, c: coefficients[j] ?? 1 }))
      .filter(({ sp }) => sp.side === s)
      .map(({ sp, c }) => (c === 1 ? '' : String(c)) + sp.formula)
      .join(' + ');
  return `${side('left')} -> ${side('right')}`;
}

export type { Counts };
