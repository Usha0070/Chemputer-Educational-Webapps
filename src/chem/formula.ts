// Chemical formulas: parsing ("Al2(SO4)3", "CuSO4·5H2O", "SO4^2-"), atom counts, molar mass and % composition.
import { ALL_SYMBOLS } from './elements';
import { atomicMass } from './element-data';

export type Counts = Record<string, number>;

export interface ParsedFormula {
  /** atoms per formula unit, in order of first appearance */
  atoms: Counts;
  /** ionic charge from "^2-" notation (0 if none) */
  charge: number;
}

const SYMBOL_SET = new Set(ALL_SYMBOLS);

function addInto(target: Counts, source: Counts, k = 1) {
  for (const [el, n] of Object.entries(source)) target[el] = (target[el] ?? 0) + n * k;
}

/**
 * Parses a formula. Supports nested () and [], hydrate dots ("·", "." or "*") with a leading count (5H2O),
 * an overall leading coefficient (2H2O counts as 2 units), charges written as ^2- / ^+ and state symbols.
 * Throws an Error with a Bangla message for anything it cannot read.
 */
export function parseFormula(input: string): ParsedFormula {
  let text = input.replace(/\s+/g, '').replace(/\((s|l|g|aq)\)$/, '');
  let charge = 0;
  const chargeMatch = /\^(\d*)([+-−])$/.exec(text);
  if (chargeMatch) {
    const size = chargeMatch[1] ? Number(chargeMatch[1]) : 1;
    charge = chargeMatch[2] === '+' ? size : -size;
    text = text.slice(0, chargeMatch.index);
  }
  if (!text) throw new Error('সংকেত খালি।');
  if (text === 'e') return { atoms: {}, charge: charge || -1 }; // the electron, e^-

  const atoms: Counts = {};
  for (const part of text.split(/[·.*]/)) {
    if (!part) throw new Error('কেলাস পানির অংশ (·) এর আগে বা পরে কিছু নেই।');
    const lead = /^(\d+)/.exec(part);
    const k = lead ? Number(lead[1]) : 1;
    addInto(atoms, parseGroup(lead ? part.slice(lead[1]!.length) : part), k);
  }
  return { atoms, charge };
}

function parseGroup(s: string): Counts {
  const stack: Counts[] = [{}];
  const closers: string[] = [];
  let i = 0;
  const readNumber = () => {
    const m = /^\d+/.exec(s.slice(i));
    if (!m) return 1;
    i += m[0].length;
    return Number(m[0]);
  };
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === '(' || ch === '[') {
      stack.push({});
      closers.push(ch === '(' ? ')' : ']');
      i++;
    } else if (ch === ')' || ch === ']') {
      if (closers.pop() !== ch || stack.length < 2) throw new Error('বন্ধনী মেলেনি।');
      i++;
      const group = stack.pop()!;
      addInto(stack[stack.length - 1]!, group, readNumber());
    } else if (/[A-Z]/.test(ch)) {
      const m = /^[A-Z][a-z]?/.exec(s.slice(i))!;
      let sym = m[0];
      // "Co" vs "C"+"o": prefer a real two-letter symbol, otherwise fall back to one letter.
      if (!SYMBOL_SET.has(sym)) sym = ch;
      if (!SYMBOL_SET.has(sym)) throw new Error(`“${m[0]}” কোনো মৌলের প্রতীক নয়।`);
      i += sym.length;
      const top = stack[stack.length - 1]!;
      top[sym] = (top[sym] ?? 0) + readNumber();
    } else {
      throw new Error(`“${ch}” চিহ্নটি সংকেতে বোঝা যায়নি।`);
    }
  }
  if (stack.length !== 1) throw new Error('বন্ধনী বন্ধ হয়নি।');
  const out = stack[0]!;
  if (Object.keys(out).length === 0) throw new Error('সংকেতে কোনো মৌল নেই।');
  return out;
}

export type MassMode = 'precise' | 'ssc';

/** Molar mass (g/mol) from the atom counts. */
export function molarMass(formula: string, mode: MassMode = 'precise'): number {
  const { atoms } = parseFormula(formula);
  return Object.entries(atoms).reduce((sum, [el, n]) => sum + atomicMass(el, mode) * n, 0);
}

/** Total atoms in one formula unit: H2SO4 → 7 */
export const atomTotal = (formula: string): number => Object.values(parseFormula(formula).atoms).reduce((a, b) => a + b, 0);

export interface CompositionRow {
  symbol: string;
  count: number;
  mass: number;
  percent: number;
}

/** Mass percentage of each element: H2O → H 11.19 %, O 88.81 %. */
export function percentComposition(formula: string, mode: MassMode = 'precise'): CompositionRow[] {
  const { atoms } = parseFormula(formula);
  const total = molarMass(formula, mode);
  return Object.entries(atoms).map(([symbol, count]) => {
    const mass = atomicMass(symbol, mode) * count;
    return { symbol, count, mass, percent: (mass / total) * 100 };
  });
}

/** Writes counts back as a formula in the given order: {C:1,H:2,O:1} → "CH2O". */
export function formulaFromCounts(counts: Counts, order: string[] = Object.keys(counts)): string {
  return order
    .filter((el) => (counts[el] ?? 0) > 0)
    .map((el) => el + (counts[el] === 1 ? '' : String(counts[el])))
    .join('');
}
