// Electrochemistry: electrolysis (discharge rules and products) and galvanic cells (standard potentials).

// ── Electrolysis ────────────────────────────────────────────────────────────

export type Electrode = 'inert' | 'copper';

export interface Electrolyte {
  id: string;
  nameBn: string;
  cation: string;
  anion: string;
  molten: boolean;
  /** concentrated halide solutions discharge the halogen; dilute ones give oxygen */
  concentrated: boolean;
  /** colour of the solution (CSS) */
  colour: string;
}

export const ELECTROLYTES: readonly Electrolyte[] = [
  { id: 'molten-nacl', nameBn: 'গলিত সোডিয়াম ক্লোরাইড', cation: 'Na', anion: 'Cl', molten: true, concentrated: true, colour: '#f5e6c8' },
  { id: 'brine', nameBn: 'গাঢ় NaCl দ্রবণ (ব্রাইন)', cation: 'Na', anion: 'Cl', molten: false, concentrated: true, colour: '#dbeafe' },
  {
    id: 'acid-water',
    nameBn: 'অম্লীয় পানি (লঘু H₂SO₄)',
    cation: 'H',
    anion: 'SO4',
    molten: false,
    concentrated: false,
    colour: '#e0f2fe',
  },
  { id: 'cuso4', nameBn: 'কপার সালফেট দ্রবণ', cation: 'Cu', anion: 'SO4', molten: false, concentrated: false, colour: '#3b82f6' },
];

/** Metals that never discharge from water (they sit above hydrogen in the series). */
const ABOVE_H = ['K', 'Na', 'Ca', 'Mg', 'Al'];

export interface HalfReaction {
  equation: string;
  product: string;
  /** moles of product per mole of electrons */
  perElectron: number;
  state: 'gas' | 'metal' | 'dissolves' | 'liquid-metal';
  observation: string;
}

export interface ElectrolysisResult {
  cathode: HalfReaction;
  anode: HalfReaction;
  /** ions in the cell, with the electrode they move to */
  ions: { ion: string; charge: number; to: 'cathode' | 'anode' }[];
  remains?: string;
}

export function electrolysis(e: Electrolyte, electrode: Electrode): ElectrolysisResult {
  const ions: ElectrolysisResult['ions'] = [];
  const cationCharge = e.cation === 'Na' || e.cation === 'H' ? 1 : 2;
  ions.push({ ion: e.cation, charge: cationCharge, to: 'cathode' });
  ions.push({ ion: e.anion, charge: e.anion === 'Cl' ? -1 : -2, to: 'anode' });
  if (!e.molten) {
    if (e.cation !== 'H') ions.push({ ion: 'H', charge: 1, to: 'cathode' });
    ions.push({ ion: 'OH', charge: -1, to: 'anode' });
  }

  let cathode: HalfReaction;
  if (e.molten)
    cathode = {
      equation: 'Na^+ + e^- -> Na',
      product: 'Na',
      perElectron: 1,
      state: 'liquid-metal',
      observation: 'ক্যাথোডে গলিত সোডিয়াম ধাতু জমা হয়',
    };
  else if (e.cation === 'H' || ABOVE_H.includes(e.cation))
    cathode = {
      equation: '2H^+ + 2e^- -> H2',
      product: 'H2',
      perElectron: 0.5,
      state: 'gas',
      observation: 'ক্যাথোডে হাইড্রোজেন গ্যাসের বুদবুদ',
    };
  else
    cathode = {
      equation: 'Cu^2+ + 2e^- -> Cu',
      product: 'Cu',
      perElectron: 0.5,
      state: 'metal',
      observation: 'ক্যাথোডে লালচে কপারের প্রলেপ পড়ে',
    };

  let anode: HalfReaction;
  if (electrode === 'copper')
    anode = {
      equation: 'Cu -> Cu^2+ + 2e^-',
      product: 'Cu',
      perElectron: 0.5,
      state: 'dissolves',
      observation: 'কপার অ্যানোড ক্ষয় হয়ে দ্রবণে যায়',
    };
  else if (e.anion === 'Cl' && (e.molten || e.concentrated))
    anode = {
      equation: '2Cl^- -> Cl2 + 2e^-',
      product: 'Cl2',
      perElectron: 0.5,
      state: 'gas',
      observation: 'অ্যানোডে হালকা সবুজাভ-হলুদ ক্লোরিন গ্যাস',
    };
  else
    anode = {
      equation: '4OH^- -> 2H2O + O2 + 4e^-',
      product: 'O2',
      perElectron: 0.25,
      state: 'gas',
      observation: 'অ্যানোডে অক্সিজেন গ্যাসের বুদবুদ',
    };

  const remains =
    e.id === 'brine'
      ? 'দ্রবণে সোডিয়াম হাইড্রক্সাইড (NaOH) থেকে যায়'
      : e.id === 'cuso4' && electrode === 'inert'
        ? 'নীল রং ধীরে ধীরে ফিকে হয়, দ্রবণ অম্লীয় হয়'
        : undefined;
  return { cathode, anode, ions, ...(remains ? { remains } : {}) };
}

/** Moles of each product for `faradays` moles of electrons. */
export function electrolysisAmounts(r: ElectrolysisResult, faradays: number): { cathode: number; anode: number } {
  return { cathode: r.cathode.perElectron * faradays, anode: r.anode.perElectron * faradays };
}

export const FARADAY = 96485;

// ── Galvanic cells ──────────────────────────────────────────────────────────

/** Standard reduction potentials (V) for Mⁿ⁺ + ne⁻ → M at 25 °C. */
export const STANDARD_POTENTIALS: Readonly<Record<string, { e0: number; charge: number; ion: string; nameBn: string; colour: string }>> = {
  Mg: { e0: -2.37, charge: 2, ion: 'Mg^2+', nameBn: 'ম্যাগনেসিয়াম', colour: '#e5e7eb' },
  Al: { e0: -1.66, charge: 3, ion: 'Al^3+', nameBn: 'অ্যালুমিনিয়াম', colour: '#e5e7eb' },
  Zn: { e0: -0.76, charge: 2, ion: 'Zn^2+', nameBn: 'জিংক', colour: '#e5e7eb' },
  Fe: { e0: -0.44, charge: 2, ion: 'Fe^2+', nameBn: 'আয়রন', colour: '#d9f99d' },
  Ni: { e0: -0.25, charge: 2, ion: 'Ni^2+', nameBn: 'নিকেল', colour: '#86efac' },
  Pb: { e0: -0.13, charge: 2, ion: 'Pb^2+', nameBn: 'লেড', colour: '#e5e7eb' },
  Cu: { e0: 0.34, charge: 2, ion: 'Cu^2+', nameBn: 'কপার', colour: '#60a5fa' },
  Ag: { e0: 0.8, charge: 1, ion: 'Ag^+', nameBn: 'সিলভার', colour: '#e5e7eb' },
};

export interface Cell {
  anode: string;
  cathode: string;
  voltage: number;
  anodeHalf: string;
  cathodeHalf: string;
  electrons: number;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

/** The cell made from two metals in their own salt solutions: the more negative E° is the anode. */
export function galvanicCell(m1: string, m2: string): Cell {
  const a = STANDARD_POTENTIALS[m1];
  const b = STANDARD_POTENTIALS[m2];
  if (!a || !b) throw new Error('অজানা ধাতু');
  const [anode, cathode] = a.e0 <= b.e0 ? [m1, m2] : [m2, m1];
  const an = STANDARD_POTENTIALS[anode]!;
  const ca = STANDARD_POTENTIALS[cathode]!;
  const n = lcm(an.charge, ca.charge);
  const e = (k: number) => (k === 1 ? 'e^-' : `${k}e^-`);
  return {
    anode,
    cathode,
    voltage: Math.round((ca.e0 - an.e0) * 100) / 100,
    anodeHalf: `${anode} -> ${an.ion} + ${e(an.charge)}`,
    cathodeHalf: `${ca.ion} + ${e(ca.charge)} -> ${cathode}`,
    electrons: n,
  };
}
