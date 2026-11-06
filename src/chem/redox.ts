// Oxidation numbers (with the rules shown step by step) and redox analysis of an equation.
import { balance, parseEquation } from './balance';
import { parseFormula } from './formula';

const GROUP1 = ['Li', 'Na', 'K', 'Rb', 'Cs'];
const GROUP2 = ['Be', 'Mg', 'Ca', 'Sr', 'Ba'];
const PEROXIDES = ['H2O2', 'Na2O2', 'K2O2', 'BaO2'];
const NONMETALS = ['H', 'B', 'C', 'N', 'O', 'F', 'Si', 'P', 'S', 'Cl', 'As', 'Se', 'Br', 'Te', 'I'];
/** Common radicals: central atom, oxygen count and charge. */
const RADICALS: { name: string; centre: string; o: number; charge: number }[] = [
  { name: 'SO4', centre: 'S', o: 4, charge: -2 },
  { name: 'SO3', centre: 'S', o: 3, charge: -2 },
  { name: 'NO3', centre: 'N', o: 3, charge: -1 },
  { name: 'NO2', centre: 'N', o: 2, charge: -1 },
  { name: 'CO3', centre: 'C', o: 3, charge: -2 },
  { name: 'PO4', centre: 'P', o: 4, charge: -3 },
  { name: 'ClO3', centre: 'Cl', o: 3, charge: -1 },
  { name: 'MnO4', centre: 'Mn', o: 4, charge: -1 },
];

export interface OxStep {
  element: string;
  value: number;
  rule: string;
}

export interface OxResult {
  ok: boolean;
  /** element → oxidation number (may be fractional, e.g. Fe in Fe3O4 = 8/3) */
  numbers: Record<string, number>;
  steps: OxStep[];
  charge: number;
  message?: string;
}

/** Oxidation number of every element in a formula or ion, using the SSC rules in order. */
export function oxidationNumbers(formula: string): OxResult {
  const { atoms, charge } = parseFormula(formula);
  const els = Object.keys(atoms);
  const numbers: Record<string, number> = {};
  const steps: OxStep[] = [];
  const set = (el: string, value: number, rule: string) => {
    numbers[el] = value;
    steps.push({ element: el, value, rule });
  };

  if (els.length === 1) {
    const el = els[0]!;
    if (charge === 0) set(el, 0, 'মুক্ত অবস্থায় (মৌলিক পদার্থে) জারণ সংখ্যা শূন্য');
    else set(el, charge / atoms[el]!, 'একপরমাণুক আয়নের জারণ সংখ্যা তার আধানের সমান');
    return { ok: true, numbers, steps, charge };
  }

  const clean = formula.replace(/\^.*$/, '').replace(/\s+/g, '');
  const hasMetalHydride = els.includes('H') && els.every((e) => e === 'H' || GROUP1.includes(e) || GROUP2.includes(e));
  for (const el of els) {
    if (el === 'F') set(el, -1, 'ফ্লোরিনের জারণ সংখ্যা সবসময় −১');
    else if (GROUP1.includes(el)) set(el, 1, 'গ্রুপ ১-এর ধাতুর জারণ সংখ্যা যৌগে +১');
    else if (GROUP2.includes(el)) set(el, 2, 'গ্রুপ ২-এর ধাতুর জারণ সংখ্যা যৌগে +২');
    else if (el === 'Al') set(el, 3, 'অ্যালুমিনিয়ামের জারণ সংখ্যা যৌগে +৩');
  }
  if (els.includes('H') && numbers.H === undefined) {
    if (hasMetalHydride) set('H', -1, 'ধাতব হাইড্রাইডে হাইড্রোজেনের জারণ সংখ্যা −১');
    else set('H', 1, 'যৌগে হাইড্রোজেনের জারণ সংখ্যা সাধারণত +১');
  }
  if (els.includes('O') && numbers.O === undefined) {
    if (PEROXIDES.includes(clean)) set('O', -1, 'পারঅক্সাইডে অক্সিজেনের জারণ সংখ্যা −১');
    else if (!els.includes('F')) set('O', -2, 'যৌগে অক্সিজেনের জারণ সংখ্যা সাধারণত −২');
  }
  for (const hal of ['Cl', 'Br', 'I']) {
    if (
      els.includes(hal) &&
      numbers[hal] === undefined &&
      !els.includes('O') &&
      !els.includes('F') &&
      els.filter((e) => numbers[e] === undefined).length > 1
    )
      set(hal, -1, 'অক্সিজেন বা ফ্লোরিন না থাকলে হ্যালোজেনের জারণ সংখ্যা −১');
  }

  let unknown = els.filter((e) => numbers[e] === undefined);
  // A metal with a radical, e.g. ZnSO4 or Fe2(SO4)3: the radical's charge fixes the metal first.
  if (unknown.length === 2) {
    const metal = unknown.find((e) => !NONMETALS.includes(e));
    const centre = unknown.find((e) => e !== metal);
    const rad = RADICALS.find((r) => r.centre === centre && (atoms.O ?? 0) === r.o * (atoms[r.centre] ?? 0));
    if (metal && centre && rad && els.length === 3 + (els.includes('H') ? 1 : 0)) {
      const knownOther = els.filter((e) => e !== metal && e !== centre && e !== 'O').reduce((s, e) => s + numbers[e]! * atoms[e]!, 0);
      const radicals = atoms[centre]!;
      set(
        metal,
        (charge - knownOther - radicals * rad.charge) / atoms[metal]!,
        `যৌগমূলক ${rad.name}-এর আধান ${rad.charge} ধরে ধাতুর জারণ সংখ্যা`,
      );
      unknown = [centre];
    }
  }
  if (unknown.length === 1) {
    const el = unknown[0]!;
    const known = els.filter((e) => e !== el).reduce((s, e) => s + numbers[e]! * atoms[e]!, 0);
    set(
      el,
      (charge - known) / atoms[el]!,
      `সব জারণ সংখ্যার যোগফল = ${charge === 0 ? 'শূন্য (নিরপেক্ষ যৌগ)' : 'আয়নের আধান'}, তাই বাকিটি হিসাব করে`,
    );
    return { ok: true, numbers, steps, charge };
  }
  if (unknown.length === 0) return { ok: true, numbers, steps, charge };
  return { ok: false, numbers, steps, charge, message: 'একাধিক মৌলের জারণ সংখ্যা অজানা থেকে গেল; এই নিয়মগুলো দিয়ে নির্ণয় করা যায় না।' };
}

export interface RedoxChange {
  element: string;
  from: number;
  to: number;
  /** electrons lost (positive) or gained (negative) across the balanced equation */
  electrons: number;
  species: { from: string; to: string };
}

export interface RedoxAnalysis {
  ok: boolean;
  coefficients: number[];
  oxidised: RedoxChange[];
  reduced: RedoxChange[];
  /** electrons transferred in the balanced equation */
  electrons: number;
  oxidisingAgent: string | null;
  reducingAgent: string | null;
  message?: string;
}

/** Which element is oxidised and which reduced, the agents, and how many electrons move (balanced equation). */
export function analyzeRedox(text: string): RedoxAnalysis {
  const bal = balance(text);
  if (!bal.ok)
    return {
      ok: false,
      coefficients: [],
      oxidised: [],
      reduced: [],
      electrons: 0,
      oxidisingAgent: null,
      reducingAgent: null,
      message: bal.message,
    };
  const eq = parseEquation(text);
  const ox = eq.species.map((s) => oxidationNumbers(s.formula));
  const changes: RedoxChange[] = [];
  eq.species.forEach((s, i) => {
    if (s.side !== 'left') return;
    for (const [el, from] of Object.entries(ox[i]!.numbers)) {
      eq.species.forEach((t, j) => {
        if (t.side !== 'right') return;
        const to = ox[j]!.numbers[el];
        if (to === undefined || Math.abs(to - from) < 1e-9) return;
        if (changes.some((c) => c.element === el)) return;
        const count = (parseFormula(s.formula).atoms[el] ?? 0) * bal.coefficients[i]!;
        changes.push({
          element: el,
          from,
          to,
          electrons: Math.round((to - from) * count * 1000) / 1000,
          species: { from: s.formula, to: t.formula },
        });
      });
    }
  });
  const oxidised = changes.filter((c) => c.to > c.from);
  const reduced = changes.filter((c) => c.to < c.from);
  return {
    ok: true,
    coefficients: bal.coefficients,
    oxidised,
    reduced,
    electrons: oxidised.reduce((s, c) => s + c.electrons, 0),
    reducingAgent: oxidised[0]?.species.from ?? null,
    oxidisingAgent: reduced[0]?.species.from ?? null,
  };
}
