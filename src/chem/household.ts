// Chapter 12 (আমাদের জীবনে রসায়ন): soap (saponification, micelles, hard water) and baking soda / baking powder.
import { molarMass } from './formula';
import { MOLAR_VOLUME_STP } from './stoichiometry';

// ── Soap ────────────────────────────────────────────────────────────────────

/** Fat (glyceryl tristearate) + 3 NaOH → glycerol + 3 sodium stearate (soap). SSC molar masses. */
export const SOAP_FORMULAS = { fat: 'C57H110O6', alkali: 'NaOH', glycerol: 'C3H8O3', soap: 'C17H35COONa' } as const;
export const SAPONIFICATION = 'C57H110O6 + 3NaOH -> C3H8O3 + 3C17H35COONa';

export interface Saponification {
  fatMol: number;
  naohG: number;
  soapG: number;
  glycerolG: number;
}

/** Masses for saponifying `fatG` grams of fat completely. */
export function saponify(fatG: number): Saponification {
  const m = (f: string) => molarMass(f, 'ssc');
  const fatMol = fatG / m(SOAP_FORMULAS.fat);
  return {
    fatMol,
    naohG: 3 * fatMol * m(SOAP_FORMULAS.alkali),
    soapG: 3 * fatMol * m(SOAP_FORMULAS.soap),
    glycerolG: fatMol * m(SOAP_FORMULAS.glycerol),
  };
}

export type Cleaner = 'soap' | 'detergent';

export interface LatherResult {
  /** fraction of the water's Ca²⁺/Mg²⁺ already precipitated as scum (0–1) */
  scum: number;
  lather: boolean;
  /** drops needed before a lasting lather forms */
  dropsNeeded: number;
}

/** Ca²⁺ in mmol for a 10 mL sample of water whose hardness is given as mg/L CaCO₃. */
const calciumMmol = (hardnessMgL: number) => (hardnessMgL * 0.01) / 100;
/** One drop of the soap solution, mmol of soap anions. */
export const SOAP_PER_DROP = 0.005;

/**
 * Shake 10 mL of water with soap solution drop by drop. In hard water soap first reacts with Ca²⁺/Mg²⁺
 * (Ca²⁺ + 2 C₁₇H₃₅COO⁻ → (C₁₇H₃₅COO)₂Ca, the scum) and only the drops after that make lather.
 * Detergents form no scum, so they lather at once in any water.
 */
export function latherTest(hardnessMgL: number, drops: number, cleaner: Cleaner = 'soap'): LatherResult {
  if (cleaner === 'detergent') return { scum: 0, lather: drops >= 1, dropsNeeded: 1 };
  const needForScum = 2 * calciumMmol(hardnessMgL);
  const dropsForScum = Math.ceil(needForScum / SOAP_PER_DROP - 1e-9);
  const dropsNeeded = dropsForScum + 1;
  const used = drops * SOAP_PER_DROP;
  return {
    scum: needForScum === 0 ? 0 : Math.min(1, used / needForScum),
    lather: drops >= dropsNeeded,
    dropsNeeded,
  };
}

/** Water hardness labels (mg/L as CaCO₃), as usually quoted. */
export function hardnessLabel(mgL: number): string {
  if (mgL < 60) return 'মৃদু পানি';
  if (mgL < 120) return 'মাঝারি খর পানি';
  if (mgL < 180) return 'খর পানি';
  return 'অত্যন্ত খর পানি';
}

// ── Baking soda and baking powder ───────────────────────────────────────────

export type RaisingMode = 'vinegar' | 'heat' | 'powder';

export const RAISING_EQUATIONS: Record<RaisingMode, string> = {
  vinegar: 'NaHCO3 + CH3COOH -> CH3COONa + H2O + CO2',
  heat: '2NaHCO3 -> Na2CO3 + H2O + CO2',
  powder: 'NaHCO3 + KHC4H4O6 -> KNaC4H4O6 + H2O + CO2',
};

/** Acetic acid in household vinegar: about 5 % w/v, i.e. 0.05 g per mL. */
export const VINEGAR_ACID_G_PER_ML = 0.05;

export interface RaisingResult {
  sodaMol: number;
  acidMol: number;
  co2Mol: number;
  /** CO₂ volume at STP, L */
  co2L: number;
  /** which reactant runs out first (acid modes) */
  limiting: 'soda' | 'acid' | null;
  /** soda left unreacted, g */
  sodaLeftG: number;
  /** washing soda (Na₂CO₃) left in the food when soda is heated alone, g: tastes bitter and soapy */
  carbonateG: number;
}

/**
 * CO₂ from `sodaG` grams of baking soda.
 *  vinegar: 1 NaHCO₃ + 1 CH₃COOH → 1 CO₂, limited by whichever runs out (vinegarMl of 5 % vinegar).
 *  heat:    2 NaHCO₃ → 1 CO₂ (+ Na₂CO₃): only half the soda's carbon becomes gas, and the rest leaves a bitter taste.
 *  powder:  baking powder already holds the right amount of a dry acid (cream of tartar), so all the soda reacts.
 */
export function raise(sodaG: number, mode: RaisingMode, vinegarMl = 0): RaisingResult {
  const soda = molarMass('NaHCO3', 'ssc');
  const sodaMol = sodaG / soda;
  if (mode === 'heat') {
    const co2Mol = sodaMol / 2;
    return {
      sodaMol,
      acidMol: 0,
      co2Mol,
      co2L: co2Mol * MOLAR_VOLUME_STP,
      limiting: null,
      sodaLeftG: 0,
      carbonateG: co2Mol * molarMass('Na2CO3', 'ssc'),
    };
  }
  const acidMol = mode === 'powder' ? sodaMol : (vinegarMl * VINEGAR_ACID_G_PER_ML) / molarMass('CH3COOH', 'ssc');
  const co2Mol = Math.min(sodaMol, acidMol);
  return {
    sodaMol,
    acidMol,
    co2Mol,
    co2L: co2Mol * MOLAR_VOLUME_STP,
    limiting: mode === 'powder' ? null : acidMol < sodaMol - 1e-12 ? 'acid' : 'soda',
    sodaLeftG: (sodaMol - co2Mol) * soda,
    carbonateG: 0,
  };
}
