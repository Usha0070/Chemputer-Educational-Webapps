// Ions and radicals (যৌগমূলক) used in SSC formula writing, and the valency criss-cross that combines them.

export interface Ion {
  id: string;
  /** formula without charge, e.g. "SO4" */
  formula: string;
  charge: number;
  nameBn: string;
  nameEn: string;
  /** more than one atom: needs brackets when more than one is used */
  polyatomic: boolean;
}

const ion = (id: string, formula: string, charge: number, nameBn: string, nameEn: string): Ion => ({
  id,
  formula,
  charge,
  nameBn,
  nameEn,
  polyatomic: (formula.match(/[A-Z]/g) ?? []).length > 1 || /\d/.test(formula),
});

export const CATIONS: readonly Ion[] = [
  ion('H', 'H', 1, 'হাইড্রোজেন', 'hydrogen'),
  ion('Na', 'Na', 1, 'সোডিয়াম', 'sodium'),
  ion('K', 'K', 1, 'পটাসিয়াম', 'potassium'),
  ion('Ag', 'Ag', 1, 'সিলভার', 'silver'),
  ion('NH4', 'NH4', 1, 'অ্যামোনিয়াম', 'ammonium'),
  ion('Cu1', 'Cu', 1, 'কিউপ্রাস', 'copper(I)'),
  ion('Mg', 'Mg', 2, 'ম্যাগনেসিয়াম', 'magnesium'),
  ion('Ca', 'Ca', 2, 'ক্যালসিয়াম', 'calcium'),
  ion('Ba', 'Ba', 2, 'বেরিয়াম', 'barium'),
  ion('Zn', 'Zn', 2, 'জিংক', 'zinc'),
  ion('Fe2', 'Fe', 2, 'ফেরাস', 'iron(II)'),
  ion('Cu2', 'Cu', 2, 'কিউপ্রিক', 'copper(II)'),
  ion('Pb', 'Pb', 2, 'লেড', 'lead(II)'),
  ion('Al', 'Al', 3, 'অ্যালুমিনিয়াম', 'aluminium'),
  ion('Fe3', 'Fe', 3, 'ফেরিক', 'iron(III)'),
];

export const ANIONS: readonly Ion[] = [
  ion('Cl', 'Cl', -1, 'ক্লোরাইড', 'chloride'),
  ion('Br', 'Br', -1, 'ব্রোমাইড', 'bromide'),
  ion('I', 'I', -1, 'আয়োডাইড', 'iodide'),
  ion('F', 'F', -1, 'ফ্লোরাইড', 'fluoride'),
  ion('OH', 'OH', -1, 'হাইড্রক্সাইড', 'hydroxide'),
  ion('NO3', 'NO3', -1, 'নাইট্রেট', 'nitrate'),
  ion('HCO3', 'HCO3', -1, 'বাইকার্বনেট', 'hydrogencarbonate'),
  ion('O', 'O', -2, 'অক্সাইড', 'oxide'),
  ion('S', 'S', -2, 'সালফাইড', 'sulfide'),
  ion('SO4', 'SO4', -2, 'সালফেট', 'sulfate'),
  ion('SO3', 'SO3', -2, 'সালফাইট', 'sulfite'),
  ion('CO3', 'CO3', -2, 'কার্বনেট', 'carbonate'),
  ion('N', 'N', -3, 'নাইট্রাইড', 'nitride'),
  ion('PO4', 'PO4', -3, 'ফসফেট', 'phosphate'),
];

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

export interface Combination {
  cation: Ion;
  anion: Ion;
  /** criss-cross before simplifying */
  raw: { cation: number; anion: number };
  /** after dividing by the common factor */
  cationCount: number;
  anionCount: number;
  divisor: number;
  /** "Al2(SO4)3" */
  formula: string;
  nameBn: string;
  nameEn: string;
}

const part = (i: Ion, n: number) => (n === 1 ? i.formula : i.polyatomic ? `(${i.formula})${n}` : `${i.formula}${n}`);

/** Criss-cross the valencies: Al³⁺ + SO₄²⁻ → Al₂(SO₄)₃. */
export function combine(cation: Ion, anion: Ion): Combination {
  const raw = { cation: Math.abs(anion.charge), anion: cation.charge };
  const divisor = gcd(raw.cation, raw.anion);
  const cationCount = raw.cation / divisor;
  const anionCount = raw.anion / divisor;
  const special = cation.id === 'H' && anion.id === 'O' ? 'পানি' : null;
  return {
    cation,
    anion,
    raw,
    cationCount,
    anionCount,
    divisor,
    formula: part(cation, cationCount) + part(anion, anionCount),
    nameBn: special ?? `${cation.nameBn} ${anion.nameBn}`,
    nameEn: `${cation.nameEn} ${anion.nameEn}`,
  };
}

export const findIon = (id: string): Ion | undefined => [...CATIONS, ...ANIONS].find((i) => i.id === id);
