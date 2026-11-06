// Acids and bases: pH, indicator colours, household substances and strong acid–strong base titration curves.

export const KW = 1e-14;

/** pH of a strong acid of molar concentration c releasing `protons` H⁺ per formula (HCl 1, H2SO4 2). */
export const phStrongAcid = (c: number, protons = 1): number => -Math.log10(c * protons);
/** pH of a strong base (NaOH 1, Ca(OH)2 2). */
export const phStrongBase = (c: number, hydroxides = 1): number => 14 + Math.log10(c * hydroxides);
export const hFromPh = (ph: number): number => 10 ** -ph;

/** pH after diluting by a factor (strong acids/bases; never crosses 7). */
export function dilute(ph: number, factor: number): number {
  if (ph < 7) return Math.min(7, ph + Math.log10(factor));
  if (ph > 7) return Math.max(7, ph - Math.log10(factor));
  return 7;
}

export type Nature = 'acidic' | 'neutral' | 'basic';
export const natureOf = (ph: number): Nature => (ph < 6.95 ? 'acidic' : ph > 7.05 ? 'basic' : 'neutral');

// ── Indicators ──────────────────────────────────────────────────────────────

export interface IndicatorColour {
  colour: string;
  nameBn: string;
}

export const INDICATORS = {
  litmus: (ph: number): IndicatorColour =>
    ph < 5 ? { colour: '#dc2626', nameBn: 'লাল' } : ph > 8 ? { colour: '#2563eb', nameBn: 'নীল' } : { colour: '#7c3aed', nameBn: 'বেগুনি' },
  phenolphthalein: (ph: number): IndicatorColour =>
    ph < 8.2 ? { colour: 'transparent', nameBn: 'বর্ণহীন' } : { colour: '#ec4899', nameBn: 'গোলাপি' },
  methylOrange: (ph: number): IndicatorColour =>
    ph < 3.1
      ? { colour: '#dc2626', nameBn: 'লাল' }
      : ph <= 4.4
        ? { colour: '#f97316', nameBn: 'কমলা' }
        : { colour: '#facc15', nameBn: 'হলুদ' },
  universal: (ph: number): IndicatorColour => {
    const stops = [
      '#dc2626',
      '#e11d48',
      '#ea580c',
      '#f97316',
      '#f59e0b',
      '#eab308',
      '#a3e635',
      '#22c55e',
      '#14b8a6',
      '#06b6d4',
      '#3b82f6',
      '#4f46e5',
      '#6d28d9',
      '#7c3aed',
      '#581c87',
    ];
    const names = [
      'লাল',
      'লাল',
      'কমলা-লাল',
      'কমলা',
      'হলুদ-কমলা',
      'হলুদ',
      'হলুদ-সবুজ',
      'সবুজ',
      'নীলাভ সবুজ',
      'সবুজাভ নীল',
      'নীল',
      'গাঢ় নীল',
      'বেগুনি-নীল',
      'বেগুনি',
      'গাঢ় বেগুনি',
    ];
    const i = Math.max(0, Math.min(14, Math.round(ph)));
    return { colour: stops[i]!, nameBn: names[i]! };
  },
} as const;
export type IndicatorId = keyof typeof INDICATORS;

export interface Household {
  id: string;
  nameBn: string;
  ph: number;
}

/** Typical pH of everyday substances (approximate). */
export const HOUSEHOLD: readonly Household[] = [
  { id: 'gastric', nameBn: 'পাকস্থলীর রস', ph: 1.5 },
  { id: 'lemon', nameBn: 'লেবুর রস', ph: 2.2 },
  { id: 'vinegar', nameBn: 'সিরকা', ph: 2.9 },
  { id: 'cola', nameBn: 'কোমল পানীয়', ph: 3 },
  { id: 'tomato', nameBn: 'টমেটোর রস', ph: 4.3 },
  { id: 'rain', nameBn: 'বৃষ্টির পানি', ph: 5.6 },
  { id: 'milk', nameBn: 'দুধ', ph: 6.6 },
  { id: 'water', nameBn: 'বিশুদ্ধ পানি', ph: 7 },
  { id: 'blood', nameBn: 'রক্ত', ph: 7.4 },
  { id: 'baking-soda', nameBn: 'খাবার সোডার দ্রবণ', ph: 8.3 },
  { id: 'toothpaste', nameBn: 'টুথপেস্ট', ph: 9 },
  { id: 'soap', nameBn: 'সাবান পানি', ph: 10 },
  { id: 'ammonia', nameBn: 'অ্যামোনিয়া দ্রবণ', ph: 11.5 },
  { id: 'lime', nameBn: 'চুনের পানি', ph: 12.4 },
  { id: 'caustic', nameBn: 'কস্টিক সোডা দ্রবণ', ph: 13.5 },
];

// ── Titration (strong acid with strong base) ────────────────────────────────

export interface TitrationSetup {
  /** acid in the flask */
  acidM: number;
  acidMl: number;
  /** H⁺ per formula: HCl 1, H2SO4 2 */
  acidProtons: number;
  /** base in the burette */
  baseM: number;
}

/** pH in the flask after adding `baseMl` of base. Uses [H⁺] − [OH⁻] = excess, with Kw, so the curve is smooth at equivalence. */
export function titrationPh(s: TitrationSetup, baseMl: number): number {
  const h = s.acidM * s.acidProtons * s.acidMl; // mmol H⁺
  const oh = s.baseM * baseMl; // mmol OH⁻
  const excess = (h - oh) / (s.acidMl + baseMl); // mol/L of excess H⁺ (negative = excess OH⁻)
  const H = (excess + Math.sqrt(excess * excess + 4 * KW)) / 2;
  return -Math.log10(H);
}

/** Volume of base (mL) at the equivalence point. */
export const equivalenceVolume = (s: TitrationSetup): number => (s.acidM * s.acidProtons * s.acidMl) / s.baseM;

/** Concentration of the acid from a titre: M_acid = M_base × V_base ÷ (V_acid × protons). */
export const acidConcentration = (baseM: number, baseMl: number, acidMl: number, protons = 1): number =>
  (baseM * baseMl) / (acidMl * protons);
