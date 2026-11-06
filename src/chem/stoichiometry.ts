// Mole calculations and the empirical / molecular formula solver.
import { atomicMass } from './element-data';
import { atomTotal, formulaFromCounts, molarMass, type MassMode } from './formula';

export const AVOGADRO = 6.022e23;
/** Molar volume of an ideal gas at STP (0 °C, 1 atm), as used in the SSC book */
export const MOLAR_VOLUME_STP = 22.4;

export type MoleInput =
  | { kind: 'mass'; grams: number }
  | { kind: 'moles'; moles: number }
  | { kind: 'particles'; count: number }
  | { kind: 'volume'; litres: number };

export interface MoleResult {
  molarMass: number;
  grams: number;
  moles: number;
  /** molecules / formula units */
  particles: number;
  /** total atoms */
  atoms: number;
  /** gas volume at STP (only meaningful for gases) */
  litres: number;
}

/** Converts any one of mass, moles, particles or gas volume into all the others. */
export function moleConvert(formula: string, input: MoleInput, mode: MassMode = 'ssc'): MoleResult {
  const M = molarMass(formula, mode);
  const moles =
    input.kind === 'mass'
      ? input.grams / M
      : input.kind === 'moles'
        ? input.moles
        : input.kind === 'particles'
          ? input.count / AVOGADRO
          : input.litres / MOLAR_VOLUME_STP;
  const particles = moles * AVOGADRO;
  return { molarMass: M, grams: moles * M, moles, particles, atoms: particles * atomTotal(formula), litres: moles * MOLAR_VOLUME_STP };
}

/** Splits a number into mantissa and power of ten: 1.2044e24 → { m: 1.2044, e: 24 }. */
export function sciParts(v: number): { m: number; e: number } {
  if (v === 0 || !Number.isFinite(v)) return { m: v, e: 0 };
  const e = Math.floor(Math.log10(Math.abs(v)));
  return { m: v / 10 ** e, e };
}

// ── Empirical and molecular formula ────────────────────────────────────────

export interface EmpiricalStep {
  symbol: string;
  percent: number;
  atomicMass: number;
  /** percent ÷ atomic mass */
  moles: number;
  /** moles ÷ smallest */
  ratio: number;
  /** ratio × multiplier */
  scaled: number;
  whole: number;
}

export interface EmpiricalResult {
  steps: EmpiricalStep[];
  multiplier: number;
  formula: string;
  counts: Record<string, number>;
  empiricalMass: number;
  /** sum of the given percentages */
  total: number;
}

/**
 * Percent (or mass) composition → empirical formula, the textbook way:
 * divide by atomic mass, divide by the smallest, then multiply by 2, 3 … until every ratio is a whole number.
 */
export function empiricalFormula(parts: { symbol: string; percent: number }[], mode: MassMode = 'ssc', tolerance = 0.1): EmpiricalResult {
  const valid = parts.filter((p) => p.percent > 0);
  if (valid.length === 0) throw new Error('অন্তত একটি মৌলের শতকরা পরিমাণ দাও।');
  const withMoles = valid.map((p) => {
    const A = atomicMass(p.symbol, mode);
    return { symbol: p.symbol, percent: p.percent, atomicMass: A, moles: p.percent / A };
  });
  const smallest = Math.min(...withMoles.map((p) => p.moles));
  const ratios = withMoles.map((p) => ({ ...p, ratio: p.moles / smallest }));
  let multiplier = 1;
  for (let k = 1; k <= 8; k++) {
    if (ratios.every((p) => Math.abs(p.ratio * k - Math.round(p.ratio * k)) <= tolerance * Math.max(1, k / 2))) {
      multiplier = k;
      break;
    }
    multiplier = k;
  }
  const steps = ratios.map((p) => ({ ...p, scaled: p.ratio * multiplier, whole: Math.max(1, Math.round(p.ratio * multiplier)) }));
  const counts = Object.fromEntries(steps.map((s) => [s.symbol, s.whole]));
  const formula = formulaFromCounts(
    counts,
    steps.map((s) => s.symbol),
  );
  return { steps, multiplier, formula, counts, empiricalMass: molarMass(formula, mode), total: valid.reduce((s, p) => s + p.percent, 0) };
}

/** Molecular formula from an empirical formula and the molar mass: n = M ÷ empirical mass. */
export function molecularFormula(empirical: EmpiricalResult, molar: number): { n: number; exact: number; formula: string } {
  const exact = molar / empirical.empiricalMass;
  const n = Math.max(1, Math.round(exact));
  const counts = Object.fromEntries(Object.entries(empirical.counts).map(([k, v]) => [k, v * n]));
  return { n, exact, formula: formulaFromCounts(counts, Object.keys(empirical.counts)) };
}
