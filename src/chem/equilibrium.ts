// Chemical equilibrium for gas reactions: Kc(T) from the van 't Hoff equation and the equilibrium position
// after a change (concentration, pressure/volume, temperature). Used by the Le Chatelier simulation.
import { R_KJ } from './kinetics';

export interface Reaction {
  id: string;
  /** species formulas */
  species: string[];
  /** stoichiometric coefficients: negative = reactant, positive = product */
  nu: number[];
  /** enthalpy change, kJ/mol (negative = exothermic) */
  dH: number;
  /** Kc at T0 (concentration units, mol/L) */
  k0: number;
  t0: number;
  equation: string;
}

/** Haber process (teaching values: K chosen so shifts are visible in a small box). */
export const HABER: Reaction = {
  id: 'haber',
  species: ['N2', 'H2', 'NH3'],
  nu: [-1, -3, 2],
  dH: -92,
  k0: 0.5,
  t0: 700,
  equation: 'N2 + 3H2 <=> 2NH3',
};
/** Brown NO₂ ⇌ colourless N₂O₄ */
export const NO2_DIMER: Reaction = { id: 'no2', species: ['NO2', 'N2O4'], nu: [-2, 1], dH: -57, k0: 6, t0: 350, equation: '2NO2 <=> N2O4' };

/** Kc at temperature T: ln(K/K0) = −ΔH/R (1/T − 1/T0). */
export const kAt = (rx: Reaction, tempK: number): number => rx.k0 * Math.exp((-rx.dH / R_KJ) * (1 / tempK - 1 / rx.t0));

/** Reaction quotient Q from moles and volume. */
export function quotient(rx: Reaction, moles: number[], volume: number): number {
  return rx.nu.reduce((q, v, i) => q * (Math.max(moles[i]!, 1e-12) / volume) ** v, 1);
}

/** Moles at equilibrium starting from `moles`, at the given volume (L) and temperature (K). */
export function equilibrate(rx: Reaction, moles: number[], volume: number, tempK: number): number[] {
  const K = kAt(rx, tempK);
  // extent ξ: n_i = n_i0 + ν_i ξ, bounded so every amount stays ≥ 0
  let lo = -Infinity;
  let hi = Infinity;
  rx.nu.forEach((v, i) => {
    const lim = -moles[i]! / v;
    if (v > 0) lo = Math.max(lo, lim);
    else hi = Math.min(hi, lim);
  });
  const at = (xi: number) => moles.map((n, i) => n + rx.nu[i]! * xi);
  const f = (xi: number) => Math.log(quotient(rx, at(xi), volume)) - Math.log(K);
  let a = lo + 1e-12;
  let b = hi - 1e-12;
  for (let it = 0; it < 200; it++) {
    const mid = (a + b) / 2;
    if (f(mid) > 0) b = mid;
    else a = mid;
  }
  return at((a + b) / 2);
}

export type Shift = 'right' | 'left' | 'none';

/** Which way the position moved (more products = right). */
export function shiftDirection(rx: Reaction, before: number[], after: number[]): Shift {
  const productIndex = rx.nu.findIndex((v) => v > 0);
  const d = after[productIndex]! - before[productIndex]!;
  return Math.abs(d) < 1e-6 ? 'none' : d > 0 ? 'right' : 'left';
}

/** Total moles of gas on each side (for explaining the pressure effect). */
export const gasMoles = (rx: Reaction): { left: number; right: number } => ({
  left: -rx.nu.filter((v) => v < 0).reduce((s, v) => s + v, 0),
  right: rx.nu.filter((v) => v > 0).reduce((s, v) => s + v, 0),
});
