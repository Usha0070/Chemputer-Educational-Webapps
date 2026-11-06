import { describe, expect, it } from 'vitest';
import { balance, isBalanced, parseEquation, sideCounts, writeEquation } from './balance';
import { atomTotal, molarMass, parseFormula, percentComposition } from './formula';
import { ANIONS, CATIONS, combine, findIon } from './ions';
import { AVOGADRO, empiricalFormula, molecularFormula, moleConvert, sciParts } from './stoichiometry';

const ionPair = (c: string, a: string) => combine(findIon(c)!, findIon(a)!);

describe('formula parsing', () => {
  it('counts atoms with brackets and hydrates', () => {
    expect(parseFormula('H2SO4').atoms).toEqual({ H: 2, S: 1, O: 4 });
    expect(parseFormula('Al2(SO4)3').atoms).toEqual({ Al: 2, S: 3, O: 12 });
    expect(parseFormula('Ca(OH)2').atoms).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(parseFormula('CuSO4·5H2O').atoms).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    expect(parseFormula('[Cu(NH3)4]SO4').atoms).toEqual({ Cu: 1, N: 4, H: 12, S: 1, O: 4 });
    expect(parseFormula('Co').atoms).toEqual({ Co: 1 });
    expect(parseFormula('CO').atoms).toEqual({ C: 1, O: 1 });
  });

  it('reads charges', () => {
    expect(parseFormula('SO4^2-')).toEqual({ atoms: { S: 1, O: 4 }, charge: -2 });
    expect(parseFormula('NH4^+').charge).toBe(1);
    expect(parseFormula('Fe^3+').charge).toBe(3);
  });

  it('rejects nonsense with a Bangla message', () => {
    expect(() => parseFormula('Xy2')).toThrow(/প্রতীক নয়/);
    expect(() => parseFormula('Ca(OH2')).toThrow(/বন্ধনী/);
    expect(() => parseFormula('')).toThrow();
  });

  it('computes molar masses (textbook rounding and IUPAC)', () => {
    expect(molarMass('H2O', 'ssc')).toBe(18);
    expect(molarMass('NaCl', 'ssc')).toBe(58.5);
    expect(molarMass('CO2', 'ssc')).toBe(44);
    expect(molarMass('H2SO4', 'ssc')).toBe(98);
    expect(molarMass('CaCO3', 'ssc')).toBe(100);
    expect(molarMass('CuSO4·5H2O', 'ssc')).toBe(249.5);
    expect(molarMass('C6H12O6', 'ssc')).toBe(180);
    expect(molarMass('H2O')).toBeCloseTo(18.015, 3);
    expect(atomTotal('H2SO4')).toBe(7);
  });

  it('gives percentage composition', () => {
    const water = percentComposition('H2O', 'ssc');
    expect(water.find((r) => r.symbol === 'O')!.percent).toBeCloseTo(88.89, 2);
    const total = percentComposition('CaCO3', 'ssc').reduce((s, r) => s + r.percent, 0);
    expect(total).toBeCloseTo(100, 6);
  });
});

describe('formula writing (criss-cross)', () => {
  it('writes the textbook examples', () => {
    expect(ionPair('Al', 'SO4').formula).toBe('Al2(SO4)3');
    expect(ionPair('Na', 'Cl').formula).toBe('NaCl');
    expect(ionPair('Ca', 'O').formula).toBe('CaO');
    expect(ionPair('Fe3', 'OH').formula).toBe('Fe(OH)3');
    expect(ionPair('Na', 'CO3').formula).toBe('Na2CO3');
    expect(ionPair('NH4', 'Cl').formula).toBe('NH4Cl');
    expect(ionPair('NH4', 'SO4').formula).toBe('(NH4)2SO4');
    expect(ionPair('Ca', 'PO4').formula).toBe('Ca3(PO4)2');
    expect(ionPair('Mg', 'N').formula).toBe('Mg3N2');
    expect(ionPair('Al', 'O').formula).toBe('Al2O3');
  });

  it('simplifies by the common factor and names the compound', () => {
    const mgo = ionPair('Mg', 'O');
    expect(mgo.raw).toEqual({ cation: 2, anion: 2 });
    expect(mgo.divisor).toBe(2);
    expect(mgo.formula).toBe('MgO');
    expect(ionPair('Fe2', 'SO4').nameBn).toBe('ফেরাস সালফেট');
    expect(ionPair('Cu2', 'SO4').nameEn).toBe('copper(II) sulfate');
  });

  it('makes neutral compounds for every pair', () => {
    for (const c of CATIONS)
      for (const a of ANIONS) {
        const k = combine(c, a);
        expect(c.charge * k.cationCount + a.charge * k.anionCount, k.formula).toBe(0);
        const parsed = parseFormula(k.formula);
        expect(Object.keys(parsed.atoms).length).toBeGreaterThan(0);
      }
  });
});

describe('equation balancing', () => {
  const cases: [string, number[]][] = [
    ['H2 + O2 -> H2O', [2, 1, 2]],
    ['Fe + O2 -> Fe2O3', [4, 3, 2]],
    ['C3H8 + O2 -> CO2 + H2O', [1, 5, 3, 4]],
    ['Al + H2SO4 -> Al2(SO4)3 + H2', [2, 3, 1, 3]],
    ['N2 + H2 -> NH3', [1, 3, 2]],
    ['KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O', [2, 16, 2, 2, 5, 8]],
    ['CH4 + O2 -> CO2 + H2O', [1, 2, 1, 2]],
    ['Na + H2O -> NaOH + H2', [2, 2, 2, 1]],
    ['CaCO3 + HCl -> CaCl2 + H2O + CO2', [1, 2, 1, 1, 1]],
    ['Cu + HNO3 -> Cu(NO3)2 + NO2 + H2O', [1, 4, 1, 2, 2]],
    ['Fe^3+ + e^- -> Fe^2+', [1, 1, 1]],
    ['CuSO4·5H2O -> CuSO4 + H2O', [1, 1, 5]],
  ];
  it.each(cases)('%s', (text, coefficients) => {
    const r = balance(text);
    expect(r).toEqual({ ok: true, coefficients });
    if (r.ok) expect(isBalanced(parseEquation(text), r.coefficients)).toBe(true);
  });

  it('ignores coefficients the student already typed', () => {
    expect(balance('2H2 + O2 = 2H2O')).toEqual({ ok: true, coefficients: [2, 1, 2] });
  });

  it('reports impossible and invalid equations', () => {
    expect(balance('H2 + O2 -> NaCl').ok).toBe(false);
    expect(balance('H2 + O2').ok).toBe(false);
    expect(balance('Qq -> H2').ok).toBe(false);
  });

  it('counts atoms on each side', () => {
    const eq = parseEquation('Fe + O2 -> Fe2O3');
    expect(sideCounts(eq, [1, 1, 1])).toEqual([
      { element: 'Fe', left: 1, right: 2 },
      { element: 'O', left: 2, right: 3 },
    ]);
    expect(writeEquation(eq, [4, 3, 2])).toBe('4Fe + 3O2 -> 2Fe2O3');
  });
});

describe('mole calculations', () => {
  it('converts mass ↔ moles ↔ particles ↔ volume', () => {
    const water = moleConvert('H2O', { kind: 'mass', grams: 36 });
    expect(water.moles).toBe(2);
    expect(water.particles).toBeCloseTo(1.2044e24, -20);
    expect(water.atoms).toBeCloseTo(3 * 1.2044e24, -20);
    const co2 = moleConvert('CO2', { kind: 'mass', grams: 44 });
    expect(co2.litres).toBeCloseTo(22.4, 10);
    const n = moleConvert('NaCl', { kind: 'particles', count: AVOGADRO / 2 });
    expect(n.grams).toBeCloseTo(29.25, 10);
    expect(moleConvert('O2', { kind: 'volume', litres: 11.2 }).grams).toBeCloseTo(16, 10);
  });

  it('writes scientific notation parts', () => {
    expect(sciParts(6.022e23).e).toBe(23);
    expect(sciParts(6.022e23).m).toBeCloseTo(6.022, 10);
    expect(sciParts(0.0025)).toEqual({ m: 2.5, e: -3 });
  });
});

describe('empirical and molecular formula', () => {
  it('finds CH2O and glucose', () => {
    const r = empiricalFormula([
      { symbol: 'C', percent: 40 },
      { symbol: 'H', percent: 6.67 },
      { symbol: 'O', percent: 53.33 },
    ]);
    expect(r.formula).toBe('CH2O');
    expect(r.empiricalMass).toBe(30);
    expect(molecularFormula(r, 180)).toMatchObject({ n: 6, formula: 'C6H12O6' });
  });

  it('multiplies fractional ratios (Fe 70 %, O 30 % → Fe2O3)', () => {
    const r = empiricalFormula([
      { symbol: 'Fe', percent: 70 },
      { symbol: 'O', percent: 30 },
    ]);
    expect(r.multiplier).toBe(2);
    expect(r.formula).toBe('Fe2O3');
  });

  it('handles other textbook-style cases', () => {
    expect(
      empiricalFormula([
        { symbol: 'C', percent: 85.7 },
        { symbol: 'H', percent: 14.3 },
      ]).formula,
    ).toBe('CH2');
    expect(
      empiricalFormula([
        { symbol: 'N', percent: 30.43 },
        { symbol: 'O', percent: 69.57 },
      ]).formula,
    ).toBe('NO2');
    expect(
      empiricalFormula([
        { symbol: 'C', percent: 92.3 },
        { symbol: 'H', percent: 7.7 },
      ]).formula,
    ).toBe('CH');
    const benzene = empiricalFormula([
      { symbol: 'C', percent: 92.3 },
      { symbol: 'H', percent: 7.7 },
    ]);
    expect(molecularFormula(benzene, 78).formula).toBe('C6H6');
    expect(
      empiricalFormula([
        { symbol: 'Mg', percent: 60 },
        { symbol: 'O', percent: 40 },
      ]).formula,
    ).toBe('MgO');
  });
});

describe('ionic bonding', async () => {
  const { ionicPlan, ionShells } = await import('./bonding');
  it.each([
    [11, 17, 'NaCl', 1],
    [12, 8, 'MgO', 2],
    [20, 17, 'CaCl2', 2],
    [11, 8, 'Na2O', 2],
    [13, 8, 'Al2O3', 6],
    [12, 7, 'Mg3N2', 6],
    [13, 17, 'AlCl3', 3],
  ])('Z %i + Z %i → %s with %i electrons moving', (metal, nonmetal, formula, electrons) => {
    const plan = ionicPlan(metal, nonmetal);
    expect(plan.formula).toBe(formula);
    expect(plan.transfers).toHaveLength(electrons);
    // every non-metal atom ends with a full outer shell
    const received = Array.from({ length: plan.nonmetalCount }, (_, j) => plan.transfers.filter(([, t]) => t === j).length);
    expect(received.every((r) => r === plan.take)).toBe(true);
  });

  it('gives noble-gas shells to both ions', () => {
    expect(ionShells(11, 1)).toEqual([2, 8]);
    expect(ionShells(17, -1)).toEqual([2, 8, 8]);
    expect(ionShells(12, 2)).toEqual([2, 8]);
    expect(ionShells(8, -2)).toEqual([2, 8]);
  });

  it('refuses two metals', () => {
    expect(() => ionicPlan(11, 12)).toThrow();
  });
});

describe('covalent bonding', async () => {
  const { MOLECULES, checkMolecule, maxBonds } = await import('./bonding');
  it('accepts the correct structure of every molecule and nothing less', () => {
    for (const m of MOLECULES) {
      const ok = checkMolecule(m, m.answer);
      expect(ok.complete, m.id).toBe(true);
      const fewer = m.answer.map((o, i) => (i === 0 ? o - 1 : o));
      expect(checkMolecule(m, fewer).complete, `${m.id} with a bond missing`).toBe(false);
    }
  });

  it('counts bonds and lone pairs', () => {
    const get = (id: string) => MOLECULES.find((m) => m.id === id)!;
    expect(checkMolecule(get('N2'), [3])).toMatchObject({ bondCount: 3, lonePairs: 2 });
    expect(checkMolecule(get('H2O'), [1, 1]).atoms[0]).toMatchObject({ lonePairs: 2, around: 8 });
    expect(checkMolecule(get('NH3'), [1, 1, 1]).atoms[0]).toMatchObject({ lonePairs: 1 });
    expect(checkMolecule(get('CO2'), [2, 2])).toMatchObject({ bondCount: 4, lonePairs: 4 });
    expect(checkMolecule(get('O2'), [0]).atoms[0]).toMatchObject({ unpaired: 0, lonePairs: 3, around: 6 });
  });

  it('limits bonds by the electrons each atom needs', () => {
    const n2 = MOLECULES.find((m) => m.id === 'N2')!;
    expect(maxBonds(n2.atoms[0]!)).toBe(3);
    expect(maxBonds(MOLECULES[0]!.atoms[0]!)).toBe(1);
  });
});
