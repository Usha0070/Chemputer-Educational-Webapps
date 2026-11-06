// States of matter: kinetic particle theory, Graham's law of diffusion, and the heating curve of water.

export const R_J = 8.314; // J mol⁻¹ K⁻¹

// ── Kinetic particle theory ─────────────────────────────────────────────────

export type Phase = 'solid' | 'liquid' | 'gas';

export interface Substance {
  id: string;
  nameBn: string;
  formula: string;
  /** molar mass, g/mol */
  M: number;
  /** melting and boiling points at 1 atm, K */
  mp: number;
  bp: number;
}

export const SUBSTANCES: readonly Substance[] = [
  { id: 'water', nameBn: 'পানি', formula: 'H2O', M: 18, mp: 273.15, bp: 373.15 },
  { id: 'ethanol', nameBn: 'ইথানল', formula: 'C2H5OH', M: 46, mp: 159, bp: 351.5 },
  { id: 'bromine', nameBn: 'ব্রোমিন', formula: 'Br2', M: 160, mp: 266, bp: 332 },
];

export function phaseAt(s: Substance, tempK: number): Phase {
  if (tempK < s.mp) return 'solid';
  if (tempK < s.bp) return 'liquid';
  return 'gas';
}

/** Mean speed of gas molecules, m/s: √(8RT / πM). */
export const meanSpeed = (tempK: number, molarMassG: number): number => Math.sqrt((8 * R_J * tempK) / (Math.PI * (molarMassG / 1000)));

/** Average kinetic energy per mole of gas, J: (3/2)RT */
export const kineticEnergy = (tempK: number): number => 1.5 * R_J * tempK;

/** Ideal-gas pressure in kPa: p = nRT / V (V in litres). */
export const gasPressure = (moles: number, tempK: number, litres: number): number => (moles * R_J * tempK) / litres;

// ── Diffusion (Graham's law) ────────────────────────────────────────────────

/** Rate of diffusion of gas 1 relative to gas 2: r₁/r₂ = √(M₂/M₁). */
export const grahamRatio = (m1: number, m2: number): number => Math.sqrt(m2 / m1);

/** Where two gases released at opposite ends of a tube meet, as a fraction of the length from gas 1's end. */
export const meetingPoint = (m1: number, m2: number): number => 1 / (1 + Math.sqrt(m1 / m2));

/** Relative time to meet: ∝ √(M/T); temperature speeds both up equally, so the meeting point does not move. */
export const meetingTime = (lengthCm: number, m1: number, m2: number, tempK: number): number => {
  const v1 = meanSpeed(tempK, m1);
  const v2 = meanSpeed(tempK, m2);
  return lengthCm / ((v1 + v2) * 0.05); // teaching scale (diffusion is far slower than molecular speed)
};

// ── Heating curve of water ──────────────────────────────────────────────────

export const HEAT = {
  cIce: 2.09, // J g⁻¹ K⁻¹
  cWater: 4.18,
  cSteam: 2.01,
  fusion: 334, // J/g
  vaporisation: 2260, // J/g
};

export type HeatingStage = 'ice' | 'melting' | 'water' | 'boiling' | 'steam';

export interface HeatingPoint {
  tempC: number;
  stage: HeatingStage;
  /** fraction melted or boiled during a plateau, else 0 or 1 */
  fraction: number;
}

/** Energy (J) needed to take m grams of ice at startC up to each stage boundary. */
export function stageEnergies(m: number, startC = -20) {
  const toZero = m * HEAT.cIce * (0 - startC);
  const melt = m * HEAT.fusion;
  const toHundred = m * HEAT.cWater * 100;
  const boil = m * HEAT.vaporisation;
  return {
    toZero,
    melt,
    toHundred,
    boil,
    cumulative: [toZero, toZero + melt, toZero + melt + toHundred, toZero + melt + toHundred + boil] as const,
  };
}

/** Temperature and state of m grams of water (starting as ice at startC) after q joules have been added. */
export function heatingState(m: number, q: number, startC = -20): HeatingPoint {
  const e = stageEnergies(m, startC);
  const [a, b, c, d] = e.cumulative;
  if (q <= a) return { tempC: startC + q / (m * HEAT.cIce), stage: 'ice', fraction: 0 };
  if (q <= b) return { tempC: 0, stage: 'melting', fraction: (q - a) / e.melt };
  if (q <= c) return { tempC: (q - b) / (m * HEAT.cWater), stage: 'water', fraction: 1 };
  if (q <= d) return { tempC: 100, stage: 'boiling', fraction: (q - c) / e.boil };
  return { tempC: 100 + (q - d) / (m * HEAT.cSteam), stage: 'steam', fraction: 1 };
}
