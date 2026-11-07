import { describe, expect, it } from 'vitest';
import { molarMass } from './formula';
import { balance } from './balance';
import { RAISING_EQUATIONS, SAPONIFICATION, hardnessLabel, latherTest, raise, saponify } from './household';
import {
  HAZARDS,
  LAB_CHEMICALS,
  LAB_RULES,
  STANDARD,
  dissolveTime,
  hasHazard,
  measuredTime,
  supports,
  trend,
  uncontrolled,
  type Trial,
} from './science';

const at = (temp: number, extra: Partial<Trial> = {}): Trial => ({ temp, ...STANDARD, ...extra });

describe('scientific investigation (fair test)', () => {
  it('model: a minute at 20 °C, halving every 20 °C', () => {
    expect(dissolveTime(at(20))).toBeCloseTo(60, 10);
    expect(dissolveTime(at(40))).toBeCloseTo(30, 10);
    expect(dissolveTime(at(60))).toBeCloseTo(15, 10);
  });
  it('unstirred is 3× and a cube 2.5× slower; double sugar takes twice as long', () => {
    expect(dissolveTime(at(20, { stirred: false }))).toBeCloseTo(180, 10);
    expect(dissolveTime(at(20, { form: 'cube' }))).toBeCloseTo(150, 10);
    expect(dissolveTime(at(20, { sugar: 10 }))).toBeCloseTo(120, 10);
  });
  it('stopwatch readings scatter by at most 4 % and repeat per trial number', () => {
    for (let i = 1; i < 20; i++) {
      const m = measuredTime(at(30), i);
      expect(Math.abs(m / dissolveTime(at(30)) - 1)).toBeLessThanOrEqual(0.045);
      expect(measuredTime(at(30), i)).toBe(m);
    }
  });
  it('finds the variables that were not controlled', () => {
    expect(uncontrolled([at(20), at(40), at(60)])).toEqual([]);
    expect(uncontrolled([at(20), at(40, { stirred: false })])).toEqual(['stirred']);
    expect(uncontrolled([at(20), at(40, { sugar: 10, water: 200 })])).toEqual(['sugar', 'water']);
  });
  it('needs three fair temperatures before concluding, then sees "faster when hotter"', () => {
    const res = (ts: number[]) => ts.map((t, i) => ({ trial: at(t), time: measuredTime(at(t), i + 1) }));
    expect(trend(res([20, 40]))).toBe('not-enough-data');
    expect(trend(res([20, 40, 60]))).toBe('faster-when-hotter');
    expect(trend(res([10, 30, 50, 70, 80]))).toBe('faster-when-hotter');
    const unfair = [...res([20, 40]), { trial: at(60, { stirred: false }), time: 50 }];
    expect(trend(unfair)).toBe('unfair');
  });
  it('judges the hypothesis only on fair evidence', () => {
    expect(supports('faster', 'faster-when-hotter')).toBe(true);
    expect(supports('slower', 'faster-when-hotter')).toBe(false);
    expect(supports('faster', 'unfair')).toBeNull();
  });
});

describe('laboratory safety', () => {
  it('has the nine hazard pictograms and every chemical uses known ones', () => {
    expect(new Set(HAZARDS.map((h) => h.id)).size).toBe(9);
    const ids = new Set(HAZARDS.map((h) => h.id));
    for (const c of LAB_CHEMICALS) for (const h of c.hazards) expect(ids.has(h)).toBe(true);
  });
  it('labels the classic examples', () => {
    const c = (id: string) => LAB_CHEMICALS.find((x) => x.id === id)!;
    expect(hasHazard(c('h2so4'), 'corrosive')).toBe(true);
    expect(hasHazard(c('ethanol'), 'flammable')).toBe(true);
    expect(hasHazard(c('mercury'), 'toxic')).toBe(true);
    expect(hasHazard(c('kmno4'), 'oxidising')).toBe(true);
    expect(hasHazard(c('lpg'), 'gas')).toBe(true);
  });
  it('mixes safe and unsafe habits, with acid-into-water as the rule', () => {
    expect(LAB_RULES.some((r) => r.safe)).toBe(true);
    expect(LAB_RULES.some((r) => !r.safe)).toBe(true);
    expect(LAB_RULES.find((r) => r.text.includes('এসিডের মধ্যে পানি'))!.safe).toBe(false);
  });
});

describe('soap', () => {
  it('saponification is balanced', () => {
    expect(balance(SAPONIFICATION.replace(/\b\d(?=[A-Z])/g, '')).ok).toBe(true);
  });
  it('890 g of fat needs 120 g NaOH and gives 918 g soap and 92 g glycerol (mass conserved)', () => {
    const s = saponify(890);
    expect(molarMass('C57H110O6', 'ssc')).toBe(890);
    expect(s.fatMol).toBeCloseTo(1, 10);
    expect(s.naohG).toBeCloseTo(120, 10);
    expect(s.soapG).toBeCloseTo(918, 10);
    expect(s.glycerolG).toBeCloseTo(92, 10);
    expect(890 + s.naohG).toBeCloseTo(s.soapG + s.glycerolG, 10);
  });
  it('soft water lathers with the first drop; hard water only after its Ca²⁺ is used up as scum', () => {
    expect(latherTest(0, 1).lather).toBe(true);
    expect(latherTest(300, 1).dropsNeeded).toBe(13); // 0.03 mmol Ca²⁺ × 2 = 0.06 mmol soap = 12 drops, then 1 more
    expect(latherTest(300, 12).lather).toBe(false);
    expect(latherTest(300, 6).scum).toBeCloseTo(0.5, 10);
    expect(latherTest(300, 13).lather).toBe(true);
    expect(latherTest(300, 1, 'detergent').lather).toBe(true);
    expect(hardnessLabel(30)).toBe('মৃদু পানি');
    expect(hardnessLabel(250)).toBe('অত্যন্ত খর পানি');
  });
});

describe('baking soda and baking powder', () => {
  it('the raising equations are balanced', () => {
    for (const eq of Object.values(RAISING_EQUATIONS)) expect(balance(eq.replace(/\b\d(?=[A-Z])/g, '')).ok).toBe(true);
  });
  it('8.4 g soda with plenty of acid gives 0.1 mol = 2.24 L CO₂', () => {
    const r = raise(8.4, 'vinegar', 240);
    expect(r.sodaMol).toBeCloseTo(0.1, 10);
    expect(r.co2L).toBeCloseTo(2.24, 10);
    expect(r.limiting).toBe('soda');
  });
  it('with too little vinegar the acid limits the gas', () => {
    const r = raise(8.4, 'vinegar', 60); // 3 g acid = 0.05 mol
    expect(r.acidMol).toBeCloseTo(0.05, 10);
    expect(r.limiting).toBe('acid');
    expect(r.co2L).toBeCloseTo(1.12, 10);
    expect(r.sodaLeftG).toBeCloseTo(4.2, 10);
    expect(raise(8.4, 'vinegar', 120).limiting).toBe('soda'); // exactly enough
  });
  it('heat alone gives half the CO₂ and leaves 5.3 g of bitter Na₂CO₃; baking powder gives it all', () => {
    const heat = raise(8.4, 'heat');
    expect(heat.co2L).toBeCloseTo(1.12, 10);
    expect(heat.carbonateG).toBeCloseTo(5.3, 10);
    expect(raise(8.4, 'powder').co2L).toBeCloseTo(2.24, 10);
  });
});
