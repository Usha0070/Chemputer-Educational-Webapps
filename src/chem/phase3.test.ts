import { describe, expect, it } from 'vitest';
import { ELECTROLYTES, STANDARD_POTENTIALS, electrolysis, electrolysisAmounts, galvanicCell } from './electrochem';
import { HABER, NO2_DIMER, equilibrate, gasMoles, kAt, quotient, shiftDirection } from './equilibrium';
import { createBox, fractionAbove, rateRatio, reactProbability, recentRate, stepBox, type BoxParams } from './kinetics';
import { makeRandom } from './random';
import { analyzeRedox, oxidationNumbers } from './redox';
import { BOND_REACTIONS, EXPERIMENTS, bondEnthalpy, heat, temperatureChange } from './thermo';

describe('reaction rate', () => {
  it('follows the Arrhenius rule of thumb (rate doubles for +10 °C when Ea ≈ 53 kJ/mol)', () => {
    expect(rateRatio(53, 300, 310)).toBeCloseTo(2, 0);
    expect(fractionAbove(50, 400)).toBeGreaterThan(fractionAbove(50, 300));
    expect(reactProbability({ ea: 50, catalyst: true, temperature: 300 })).toBeGreaterThan(
      reactProbability({ ea: 50, catalyst: false, temperature: 300 }),
    );
  });

  const base: BoxParams = { width: 400, height: 260, temperature: 300, ea: 50, catalyst: false, radius: 5, powder: true };
  const run = (p: BoxParams, nA = 40, nB = 40, seconds = 12) => {
    const rand = makeRandom(42);
    const box = createBox(p, nA, nB, rand);
    for (let t = 0; t < seconds; t += 1 / 30) stepBox(box, p, 1 / 30, rand);
    return box;
  };

  it('conserves particles', () => {
    const box = run(base);
    const a = box.particles.filter((q) => q.kind === 'A').length;
    const products = box.particles.filter((q) => q.kind === 'P').length / 2;
    expect(a + products).toBe(40);
    expect(products).toBe(box.reactions);
  });

  it('reacts faster when hotter, more concentrated, catalysed or powdered', () => {
    const slow = run(base).reactions;
    expect(run({ ...base, temperature: 360 }).reactions).toBeGreaterThan(slow);
    expect(run(base, 80, 80).reactions).toBeGreaterThan(slow);
    expect(run({ ...base, catalyst: true }).reactions).toBeGreaterThan(slow);
    expect(run({ ...base, powder: true }).reactions).toBeGreaterThan(run({ ...base, powder: false }).reactions);
  });

  it('reports a recent rate', () => {
    const box = run({ ...base, temperature: 360 });
    expect(recentRate(box)).toBeGreaterThanOrEqual(0);
  });
});

describe('oxidation numbers', () => {
  it.each([
    ['KMnO4', 'Mn', 7],
    ['K2Cr2O7', 'Cr', 6],
    ['H2SO4', 'S', 6],
    ['SO4^2-', 'S', 6],
    ['NO3^-', 'N', 5],
    ['NH4^+', 'N', -3],
    ['NH3', 'N', -3],
    ['H2O2', 'O', -1],
    ['NaH', 'H', -1],
    ['CO2', 'C', 4],
    ['CH4', 'C', -4],
    ['MnO2', 'Mn', 4],
    ['HClO4', 'Cl', 7],
    ['NaCl', 'Cl', -1],
    ['Cl2', 'Cl', 0],
    ['Fe^3+', 'Fe', 3],
    ['OF2', 'O', 2],
    ['FeCl3', 'Fe', 3],
  ] as const)('%s: %s = %i', (formula, el, value) => {
    const r = oxidationNumbers(formula);
    expect(r.ok).toBe(true);
    expect(r.numbers[el]).toBeCloseTo(value, 9);
  });

  it('allows average (fractional) values: Fe in Fe3O4 = 8/3', () => {
    expect(oxidationNumbers('Fe3O4').numbers.Fe).toBeCloseTo(8 / 3, 9);
  });

  it('explains each rule', () => {
    expect(oxidationNumbers('KMnO4').steps.map((s) => s.element)).toEqual(['K', 'O', 'Mn']);
  });
});

describe('redox analysis', () => {
  it('Zn + CuSO4: zinc is oxidised, copper reduced, 2 electrons', () => {
    const r = analyzeRedox('Zn + CuSO4 -> ZnSO4 + Cu');
    expect(r.oxidised.map((c) => c.element)).toEqual(['Zn']);
    expect(r.reduced.map((c) => c.element)).toEqual(['Cu']);
    expect(r.electrons).toBe(2);
    expect(r.reducingAgent).toBe('Zn');
    expect(r.oxidisingAgent).toBe('CuSO4');
  });

  it('2Mg + O2 → 2MgO moves 4 electrons', () => {
    const r = analyzeRedox('Mg + O2 -> MgO');
    expect(r.coefficients).toEqual([2, 1, 2]);
    expect(r.electrons).toBe(4);
    expect(r.oxidisingAgent).toBe('O2');
  });

  it('finds no redox in a neutralisation', () => {
    const r = analyzeRedox('HCl + NaOH -> NaCl + H2O');
    expect(r.oxidised).toHaveLength(0);
    expect(r.reduced).toHaveLength(0);
  });
});

describe('equilibrium (Le Chatelier)', () => {
  const eq = equilibrate(HABER, [1, 3, 0], 2, 700);

  it('reaches Q = K', () => {
    expect(quotient(HABER, eq, 2) / kAt(HABER, 700)).toBeCloseTo(1, 6);
    expect(eq.every((n) => n >= 0)).toBe(true);
  });

  it('shifts right when N2 is added or the pressure is raised', () => {
    const more = equilibrate(HABER, [eq[0]! + 0.5, eq[1]!, eq[2]!], 2, 700);
    expect(shiftDirection(HABER, eq, more)).toBe('right');
    const squeezed = equilibrate(HABER, eq, 1, 700);
    expect(squeezed[2]).toBeGreaterThan(eq[2]!);
    expect(gasMoles(HABER)).toEqual({ left: 4, right: 2 });
  });

  it('shifts left when heated (exothermic forward reaction) and right when NH3 is removed', () => {
    const hot = equilibrate(HABER, eq, 2, 800);
    expect(shiftDirection(HABER, eq, hot)).toBe('left');
    expect(kAt(HABER, 800)).toBeLessThan(kAt(HABER, 700));
    const removed = equilibrate(HABER, [eq[0]!, eq[1]!, eq[2]! / 2], 2, 700);
    expect(removed[2]).toBeGreaterThan(eq[2]! / 2);
  });

  it('NO2/N2O4 turns browner when heated', () => {
    const cold = equilibrate(NO2_DIMER, [1, 0], 1, 300);
    const hot = equilibrate(NO2_DIMER, cold, 1, 380);
    expect(hot[0]).toBeGreaterThan(cold[0]!);
  });
});

describe('electrolysis', () => {
  const get = (id: string) => ELECTROLYTES.find((e) => e.id === id)!;
  it('molten NaCl gives sodium and chlorine', () => {
    const r = electrolysis(get('molten-nacl'), 'inert');
    expect([r.cathode.product, r.anode.product]).toEqual(['Na', 'Cl2']);
    const a = electrolysisAmounts(r, 2);
    expect(a.cathode / a.anode).toBe(2);
  });
  it('brine gives hydrogen and chlorine (NaOH remains)', () => {
    const r = electrolysis(get('brine'), 'inert');
    expect([r.cathode.product, r.anode.product]).toEqual(['H2', 'Cl2']);
    expect(r.remains).toContain('NaOH');
  });
  it('acidified water gives H2 and O2 in a 2 : 1 volume ratio', () => {
    const r = electrolysis(get('acid-water'), 'inert');
    expect([r.cathode.product, r.anode.product]).toEqual(['H2', 'O2']);
    const a = electrolysisAmounts(r, 4);
    expect(a.cathode / a.anode).toBe(2);
  });
  it('CuSO4: copper plates the cathode; a copper anode dissolves, an inert one gives O2', () => {
    expect(electrolysis(get('cuso4'), 'inert').anode.product).toBe('O2');
    const plating = electrolysis(get('cuso4'), 'copper');
    expect(plating.cathode.product).toBe('Cu');
    expect(plating.anode.state).toBe('dissolves');
    const a = electrolysisAmounts(plating, 2);
    expect(a.cathode).toBe(a.anode);
  });
});

describe('galvanic cells', () => {
  it.each([
    ['Zn', 'Cu', 1.1],
    ['Mg', 'Cu', 2.71],
    ['Cu', 'Ag', 0.46],
    ['Zn', 'Ag', 1.56],
    ['Fe', 'Cu', 0.78],
  ] as const)('%s | %s = %f V', (a, b, v) => {
    expect(galvanicCell(a, b).voltage).toBeCloseTo(v, 2);
    expect(galvanicCell(b, a).voltage).toBeCloseTo(v, 2);
  });
  it('makes the more reactive metal the anode', () => {
    const c = galvanicCell('Cu', 'Zn');
    expect(c.anode).toBe('Zn');
    expect(c.anodeHalf).toBe('Zn -> Zn^2+ + 2e^-');
    expect(c.cathodeHalf).toBe('Cu^2+ + 2e^- -> Cu');
    expect(galvanicCell('Cu', 'Cu').voltage).toBe(0);
    expect(Object.keys(STANDARD_POTENTIALS)).toContain('Ag');
  });
});

describe('energy changes', () => {
  it('q = mcΔT', () => {
    expect(heat(100, 5)).toBeCloseTo(2090, 9);
  });
  it('dissolving NaOH warms the water; NH4Cl cools it', () => {
    const naoh = temperatureChange(
      EXPERIMENTS.find((e) => e.id === 'naoh')!,
      4,
      100,
    );
    expect(naoh.moles).toBe(0.1);
    expect(naoh.deltaT).toBeCloseTo(10.65, 1);
    const nh4cl = temperatureChange(
      EXPERIMENTS.find((e) => e.id === 'nh4cl')!,
      5.35,
      100,
    );
    expect(nh4cl.deltaT).toBeCloseTo(-3.54, 1);
  });
  it.each([
    ['hcl', -184],
    ['h2o', -482],
    ['ch4', -802],
    ['nh3', -93],
  ] as const)('bond energies give ΔH for %s ≈ %i kJ', (id, dH) => {
    expect(bondEnthalpy(BOND_REACTIONS.find((r) => r.id === id)!).dH).toBe(dH);
  });
});

describe('oxidation numbers in salts of radicals', () => {
  it.each([
    ['ZnSO4', 'Zn', 2, 'S', 6],
    ['CuSO4', 'Cu', 2, 'S', 6],
    ['Fe2(SO4)3', 'Fe', 3, 'S', 6],
    ['AgNO3', 'Ag', 1, 'N', 5],
    ['Cu(NO3)2', 'Cu', 2, 'N', 5],
    ['FePO4', 'Fe', 3, 'P', 5],
  ] as const)('%s', (f, m, mv, c, cv) => {
    const r = oxidationNumbers(f);
    expect(r.numbers[m]).toBeCloseTo(mv, 9);
    expect(r.numbers[c]).toBeCloseTo(cv, 9);
  });
});
