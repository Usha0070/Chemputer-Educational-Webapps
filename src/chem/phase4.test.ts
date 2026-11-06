import { describe, expect, it } from 'vitest';
import { INDICATORS, acidConcentration, dilute, equivalenceVolume, natureOf, phStrongAcid, phStrongBase, titrationPh } from './acids';
import { balance } from './balance';
import {
  SUBSTANCES,
  gasPressure,
  grahamRatio,
  heatingState,
  kineticEnergy,
  meanSpeed,
  meetingPoint,
  phaseAt,
  stageEnergies,
} from './matter';
import { METHOD_TEXT, REACTIVITY, displaces, reactsWithAcid } from './metals';
import {
  ALKANE_ISOMERS,
  CONVERSIONS,
  FRACTIONS,
  fractionAtTemperature,
  fractionForCarbons,
  hydrocarbonFormula,
  hydrocarbonName,
  isValid,
  routeBetween,
} from './organic';

describe('kinetic particle theory', () => {
  const water = SUBSTANCES.find((s) => s.id === 'water')!;
  it('knows the state of water', () => {
    expect(phaseAt(water, 260)).toBe('solid');
    expect(phaseAt(water, 300)).toBe('liquid');
    expect(phaseAt(water, 400)).toBe('gas');
  });
  it('doubling the kelvin temperature doubles KE and multiplies speed by √2', () => {
    expect(kineticEnergy(600) / kineticEnergy(300)).toBeCloseTo(2, 10);
    expect(meanSpeed(600, 32) / meanSpeed(300, 32)).toBeCloseTo(Math.SQRT2, 10);
    expect(meanSpeed(298, 28)).toBeCloseTo(475, -1);
  });
  it('one mole at 273 K in 22.4 L is about 1 atm', () => {
    expect(gasPressure(1, 273.15, 22.4)).toBeCloseTo(101.4, 0);
    expect(gasPressure(1, 273.15, 11.2)).toBeCloseTo(2 * gasPressure(1, 273.15, 22.4), 6);
  });
});

describe("Graham's law", () => {
  it('NH3 diffuses 1.46 times faster than HCl and the ring forms ~59 % of the way from the NH3 end', () => {
    expect(grahamRatio(17, 36.5)).toBeCloseTo(1.465, 3);
    expect(meetingPoint(17, 36.5)).toBeCloseTo(0.594, 3);
  });
  it('equal gases meet in the middle', () => {
    expect(meetingPoint(28, 28)).toBe(0.5);
  });
});

describe('heating curve of water', () => {
  it('needs 3340 J to melt 10 g of ice and 22 600 J to boil 10 g of water', () => {
    const e = stageEnergies(10);
    expect(e.melt).toBe(3340);
    expect(e.boil).toBe(22600);
    expect(e.cumulative[3] + 10 * 2.01 * 20).toBeCloseTo(30940, 6);
  });
  it('stays at 0 °C while melting and 100 °C while boiling', () => {
    const e = stageEnergies(10);
    expect(heatingState(10, e.toZero + 1000)).toMatchObject({ tempC: 0, stage: 'melting' });
    expect(heatingState(10, e.cumulative[2] + 5000)).toMatchObject({ tempC: 100, stage: 'boiling' });
    expect(heatingState(10, 0).tempC).toBe(-20);
    expect(heatingState(10, e.cumulative[1] + 4180).tempC).toBeCloseTo(100, 6);
  });
});

describe('pH and indicators', () => {
  it('computes pH of strong acids and bases', () => {
    expect(phStrongAcid(0.01)).toBeCloseTo(2, 10);
    expect(phStrongAcid(0.05, 2)).toBeCloseTo(1, 10);
    expect(phStrongBase(0.001)).toBeCloseTo(11, 10);
    expect(dilute(2, 10)).toBeCloseTo(3, 10);
    expect(dilute(12, 100)).toBeCloseTo(10, 10);
    expect(dilute(6.5, 1000)).toBe(7);
    expect(natureOf(7)).toBe('neutral');
  });
  it('gives the textbook indicator colours', () => {
    expect(INDICATORS.litmus(2).nameBn).toBe('লাল');
    expect(INDICATORS.litmus(12).nameBn).toBe('নীল');
    expect(INDICATORS.phenolphthalein(7).nameBn).toBe('বর্ণহীন');
    expect(INDICATORS.phenolphthalein(10).nameBn).toBe('গোলাপি');
    expect(INDICATORS.methylOrange(2).nameBn).toBe('লাল');
    expect(INDICATORS.methylOrange(7).nameBn).toBe('হলুদ');
    expect(INDICATORS.universal(7).nameBn).toBe('সবুজ');
  });
});

describe('titration', () => {
  const s = { acidM: 0.1, acidMl: 25, acidProtons: 1, baseM: 0.1 };
  it('follows the strong acid–strong base curve', () => {
    expect(titrationPh(s, 0)).toBeCloseTo(1, 6);
    expect(titrationPh(s, 24.9)).toBeCloseTo(3.7, 1);
    expect(titrationPh(s, 25)).toBeCloseTo(7, 6);
    expect(titrationPh(s, 26)).toBeCloseTo(11.29, 1);
    expect(equivalenceVolume(s)).toBe(25);
  });
  it('handles a diprotic acid and back-calculates concentration', () => {
    expect(equivalenceVolume({ acidM: 0.05, acidMl: 20, acidProtons: 2, baseM: 0.1 })).toBe(20);
    expect(acidConcentration(0.1, 20, 25)).toBeCloseTo(0.08, 10);
    expect(acidConcentration(0.1, 20, 20, 2)).toBeCloseTo(0.05, 10);
  });
});

describe('reactivity series and extraction', () => {
  it('extracts metals by the textbook method', () => {
    const m = (s: string) => REACTIVITY.find((x) => x.symbol === s)!.method;
    expect(m('Al')).toBe('electrolysis');
    expect(m('Na')).toBe('electrolysis');
    expect(m('Fe')).toBe('carbon');
    expect(m('Zn')).toBe('carbon');
    expect(m('Au')).toBe('native');
    expect(Object.keys(METHOD_TEXT)).toHaveLength(4);
  });
  it('predicts displacement and reaction with acids', () => {
    expect(displaces('Zn', 'Cu')).toBe(true);
    expect(displaces('Fe', 'Cu')).toBe(true);
    expect(displaces('Cu', 'Zn')).toBe(false);
    expect(displaces('Cu', 'Ag')).toBe(true);
    expect(reactsWithAcid('Mg')).toBe(true);
    expect(reactsWithAcid('Cu')).toBe(false);
  });
  it('writes balanced extraction equations', () => {
    for (const metal of REACTIVITY.filter((x) => x.equation.includes('->') && !x.equation.includes('e^-'))) {
      const r = balance(metal.equation.replace(/-\[[^\]]*\]->/, '->'));
      expect(r.ok, metal.symbol).toBe(true);
    }
  });
});

describe('fractional distillation', () => {
  it('sorts molecules into fractions by size and boiling point', () => {
    expect(fractionForCarbons(3).id).toBe('gas');
    expect(fractionForCarbons(8).id).toBe('petrol');
    expect(fractionForCarbons(14).id).toBe('kerosene');
    expect(fractionForCarbons(18).id).toBe('diesel');
    expect(fractionForCarbons(60).id).toBe('bitumen');
    expect(fractionAtTemperature(200).id).toBe('kerosene');
  });
  it('has ranges in order with no gaps', () => {
    for (let i = 1; i < FRACTIONS.length; i++) {
      expect(FRACTIONS[i]!.carbons[0]).toBe(FRACTIONS[i - 1]!.carbons[1] + 1);
      expect(FRACTIONS[i]!.boiling[0]).toBe(FRACTIONS[i - 1]!.boiling[1]);
    }
  });
});

describe('hydrocarbons', () => {
  const h = (n: number, family: 'alkane' | 'alkene' | 'alkyne' = 'alkane', position = 1, methyls: number[] = []) => ({
    n,
    family,
    position,
    methyls,
  });
  it('writes formulas for each family', () => {
    expect(hydrocarbonFormula(h(1))).toBe('CH4');
    expect(hydrocarbonFormula(h(4))).toBe('C4H10');
    expect(hydrocarbonFormula(h(2, 'alkene'))).toBe('C2H4');
    expect(hydrocarbonFormula(h(2, 'alkyne'))).toBe('C2H2');
    expect(hydrocarbonFormula(h(3, 'alkane', 1, [2]))).toBe('C4H10');
  });
  it('names with the lowest locants', () => {
    expect(hydrocarbonName(h(1)).en).toBe('methane');
    expect(hydrocarbonName(h(2, 'alkene')).en).toBe('ethene');
    expect(hydrocarbonName(h(2, 'alkene')).bn).toBe('ইথিন');
    expect(hydrocarbonName(h(2, 'alkyne')).bn).toBe('ইথাইন');
    expect(hydrocarbonName(h(4, 'alkene', 3)).en).toBe('but-1-ene');
    expect(hydrocarbonName(h(4, 'alkene', 2)).en).toBe('but-2-ene');
    expect(hydrocarbonName(h(5, 'alkyne', 2)).bn).toBe('পেন্ট-২-আইন');
    expect(hydrocarbonName(h(3, 'alkane', 1, [2])).en).toBe('2-methylpropane');
    expect(hydrocarbonName(h(4, 'alkane', 1, [3])).en).toBe('2-methylbutane');
    expect(hydrocarbonName(h(3, 'alkane', 1, [2, 2])).en).toBe('2,2-dimethylpropane');
    expect(hydrocarbonName(h(5, 'alkane', 1, [4, 3])).en).toBe('2,3-dimethylpentane');
    expect(hydrocarbonName(h(4)).bn).toBe('বিউটেন');
  });
  it('rejects structures that cannot exist as drawn', () => {
    expect(isValid(h(1, 'alkene'))).toBe(false);
    expect(isValid(h(4, 'alkane', 1, [1]))).toBe(false);
    expect(isValid(h(3, 'alkane', 1, [2, 2, 2]))).toBe(false);
    expect(isValid(h(5, 'alkene', 4))).toBe(true);
  });
  it('knows the isomer counts C4–C8', () => {
    expect([4, 5, 6, 7, 8].map((n) => ALKANE_ISOMERS[n])).toEqual([2, 3, 5, 9, 18]);
  });
});

describe('organic conversion map', () => {
  it('every equation (except polymerisation) balances', () => {
    for (const c of CONVERSIONS.filter((x) => !x.equation.includes('n'))) {
      const r = balance(c.equation);
      expect(r.ok, c.equation).toBe(true);
      if (r.ok)
        expect(
          r.coefficients.every((k) => k === 1),
          c.equation,
        ).toBe(true);
    }
  });
  it('finds the route from ethene to ethanoic acid', () => {
    expect(routeBetween('ethene', 'ethanoic')?.map((c) => c.to)).toEqual(['ethanol', 'ethanal', 'ethanoic']);
    expect(routeBetween('ethanoic', 'methane')).toBeNull();
  });
});

describe('molecule builder', () => {
  it('builds the right number of atoms and bonds', async () => {
    const { buildMolecule, hydrocarbonCounts } = await import('./organic');
    const cases = [
      { n: 1, family: 'alkane' as const, position: 1, methyls: [] },
      { n: 4, family: 'alkene' as const, position: 2, methyls: [] },
      { n: 3, family: 'alkyne' as const, position: 1, methyls: [] },
      { n: 4, family: 'alkane' as const, position: 1, methyls: [2, 3] },
    ];
    for (const h of cases) {
      const m = buildMolecule(h);
      const { C, H } = hydrocarbonCounts(h);
      expect(m.atoms.filter((a) => a.el === 'C')).toHaveLength(C);
      expect(m.atoms.filter((a) => a.el === 'H')).toHaveLength(H);
      // every carbon has four bonds' worth of valence
      for (let c = 0; c < m.atoms.length; c++) {
        if (m.atoms[c]!.el !== 'C') continue;
        expect(m.bonds.filter((b) => b.a === c || b.b === c).reduce((s, b) => s + b.order, 0)).toBe(4);
      }
    }
  });
});
