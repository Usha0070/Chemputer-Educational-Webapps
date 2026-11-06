// Electron configuration: Aufbau order, ground-state exceptions, and the SSC block → group rules.
// Every tool that shows a configuration, period or group uses these functions, so they always agree.
import { element, type ElementId } from './elements';

export type Sublevel = 's' | 'p' | 'd' | 'f';
export type Block = Sublevel;

export interface Orbital {
  /** "3d" */
  id: string;
  /** principal quantum number */
  n: number;
  l: Sublevel;
  /** maximum electrons */
  cap: number;
  /** n + l, the Aufbau energy rule value */
  nl: number;
}

export interface FilledOrbital extends Orbital {
  /** electrons in this orbital */
  e: number;
}

/** Occupancy map: { "1s": 2, "2s": 2, … } */
export type Occupancy = Record<string, number>;

export const CAPACITY: Record<Sublevel, number> = { s: 2, p: 6, d: 10, f: 14 };
const L_INDEX: Record<Sublevel, number> = { s: 0, p: 1, d: 2, f: 3 };

const AUFBAU_IDS = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p', '8s'];

function toOrbital(id: string): Orbital {
  const n = Number(id[0]);
  const l = id[1] as Sublevel;
  return { id, n, l, cap: CAPACITY[l], nl: n + L_INDEX[l] };
}

/** Orbitals in Aufbau (filling) order. 8s is never filled but completes the shortcut pattern. */
export const AUFBAU: readonly Orbital[] = AUFBAU_IDS.map(toOrbital);
export const ORBITAL: Readonly<Record<string, Orbital>> = Object.fromEntries(AUFBAU.map((o) => [o.id, o]));

/**
 * The "s s · ps ps · dps dps · fdps fdps" shortcut grid. Each row is written as two identical pairs;
 * reading the rows left to right, top to bottom gives exactly the Aufbau order.
 */
export const SHORTCUT_ROWS: readonly (readonly (readonly string[])[])[] = [
  [['1s'], ['2s']],
  [
    ['2p', '3s'],
    ['3p', '4s'],
  ],
  [
    ['3d', '4p', '5s'],
    ['4d', '5p', '6s'],
  ],
  [
    ['4f', '5d', '6p', '7s'],
    ['5f', '6d', '7p', '8s'],
  ],
];

/** Fills orbitals strictly by the Aufbau order. */
export function aufbauFill(z: number): FilledOrbital[] {
  const out: FilledOrbital[] = [];
  let left = z;
  for (const o of AUFBAU) {
    if (left <= 0) break;
    const e = Math.min(left, o.cap);
    out.push({ ...o, e });
    left -= e;
  }
  return out;
}

export interface ExceptionInfo {
  /** [from, to, electrons] moves applied after normal Aufbau filling */
  moves: readonly (readonly [string, string, number])[];
  /** Bangla explanation; caret notation (3d^5) is rendered as a superscript */
  note: string;
}

// Ground-state exceptions: electrons that move after the normal Aufbau filling.
export const EXCEPTIONS: Readonly<Record<number, ExceptionInfo>> = {
  24: { moves: [['4s', '3d', 1]], note: '3d অরবিটাল অর্ধপূর্ণ (3d^5) হলে বেশি স্থিতিশীল হয়, তাই 4s থেকে ১টি ইলেকট্রন 3d-তে চলে যায়।' },
  29: { moves: [['4s', '3d', 1]], note: '3d অরবিটাল পূর্ণ (3d^10) হলে বেশি স্থিতিশীল হয়, তাই 4s থেকে ১টি ইলেকট্রন 3d-তে চলে যায়।' },
  41: { moves: [['5s', '4d', 1]], note: '4d ও 5s অরবিটালের শক্তির পার্থক্য খুব কম হওয়ায় 5s থেকে ১টি ইলেকট্রন 4d-তে চলে যায়।' },
  42: { moves: [['5s', '4d', 1]], note: '4d অরবিটাল অর্ধপূর্ণ (4d^5) হওয়ার প্রবণতায় 5s থেকে ১টি ইলেকট্রন 4d-তে চলে যায়।' },
  44: { moves: [['5s', '4d', 1]], note: '4d ও 5s অরবিটালের শক্তির পার্থক্য খুব কম হওয়ায় 5s থেকে ১টি ইলেকট্রন 4d-তে চলে যায়।' },
  45: { moves: [['5s', '4d', 1]], note: '4d ও 5s অরবিটালের শক্তির পার্থক্য খুব কম হওয়ায় 5s থেকে ১টি ইলেকট্রন 4d-তে চলে যায়।' },
  46: { moves: [['5s', '4d', 2]], note: '4d অরবিটাল পূর্ণ (4d^10) হওয়ার প্রবল প্রবণতায় 5s-এর ২টি ইলেকট্রনই 4d-তে চলে যায়।' },
  47: { moves: [['5s', '4d', 1]], note: '4d অরবিটাল পূর্ণ (4d^10) হলে বেশি স্থিতিশীল হয়, তাই 5s থেকে ১টি ইলেকট্রন 4d-তে চলে যায়।' },
  57: { moves: [['4f', '5d', 1]], note: 'এখানে 5d-এর শক্তি 4f-এর চেয়ে সামান্য কম, তাই ইলেকট্রনটি 4f-এ না গিয়ে 5d-তে প্রবেশ করে।' },
  58: { moves: [['4f', '5d', 1]], note: 'f-ব্লকের শুরুতে 4f ও 5d-এর শক্তির পার্থক্য খুব কম, তাই ১টি ইলেকট্রন 5d-তে থাকে।' },
  64: { moves: [['4f', '5d', 1]], note: '4f অর্ধপূর্ণ (4f^7) অবস্থা বেশি স্থিতিশীল, তাই অষ্টম ইলেকট্রনটি 5d-তে যায়।' },
  78: { moves: [['6s', '5d', 1]], note: '5d ও 6s অরবিটালের শক্তির পার্থক্য খুব কম হওয়ায় 6s থেকে ১টি ইলেকট্রন 5d-তে চলে যায়।' },
  79: { moves: [['6s', '5d', 1]], note: '5d অরবিটাল পূর্ণ (5d^10) হলে বেশি স্থিতিশীল হয়, তাই 6s থেকে ১টি ইলেকট্রন 5d-তে চলে যায়।' },
  89: { moves: [['5f', '6d', 1]], note: 'এখানে 6d-এর শক্তি 5f-এর চেয়ে সামান্য কম, তাই ইলেকট্রনটি 5f-এ না গিয়ে 6d-তে প্রবেশ করে।' },
  90: { moves: [['5f', '6d', 2]], note: 'থোরিয়ামে 6d অরবিটাল বেশি স্থিতিশীল, তাই 5f-এর ২টি ইলেকট্রনই 6d-তে থাকে।' },
  91: { moves: [['5f', '6d', 1]], note: 'অ্যাক্টিনাইডে 5f ও 6d-এর শক্তি খুব কাছাকাছি, তাই ১টি ইলেকট্রন 6d-তে থাকে।' },
  92: { moves: [['5f', '6d', 1]], note: 'অ্যাক্টিনাইডে 5f ও 6d-এর শক্তি খুব কাছাকাছি, তাই ১টি ইলেকট্রন 6d-তে থাকে।' },
  93: { moves: [['5f', '6d', 1]], note: 'অ্যাক্টিনাইডে 5f ও 6d-এর শক্তি খুব কাছাকাছি, তাই ১টি ইলেকট্রন 6d-তে থাকে।' },
  96: { moves: [['5f', '6d', 1]], note: '5f অর্ধপূর্ণ (5f^7) অবস্থা বেশি স্থিতিশীল, তাই অষ্টম ইলেকট্রনটি 6d-তে যায়।' },
  103: { moves: [['6d', '7p', 1]], note: 'আপেক্ষিকতার প্রভাবে 7p অরবিটাল 6d-এর চেয়ে স্থিতিশীল হয়, তাই শেষ ইলেকট্রনটি 7p-তে যায়।' },
};

/** Actual ground-state occupancy (exceptions applied). */
export function groundState(z: number): Occupancy {
  const occ: Occupancy = Object.fromEntries(aufbauFill(z).map((o) => [o.id, o.e]));
  for (const [from, to, k] of EXCEPTIONS[z]?.moves ?? []) {
    occ[from] = (occ[from] ?? 0) - k;
    occ[to] = (occ[to] ?? 0) + k;
  }
  return occ;
}

/** Occupied orbitals as tokens. order: "aufbau" (filling) or "shell" (1s 2s 2p 3s 3p 3d 4s …). */
export function orbitalList(occ: Occupancy, order: 'aufbau' | 'shell' = 'shell'): FilledOrbital[] {
  const list = AUFBAU.filter((o) => (occ[o.id] ?? 0) > 0).map((o) => ({ ...o, e: occ[o.id] ?? 0 }));
  if (order === 'shell') list.sort((a, b) => a.n - b.n || L_INDEX[a.l] - L_INDEX[b.l]);
  return list;
}

/** Plain-text configuration in shell order: "1s2 2s2 2p6 3s2 3p6 3d5 4s1". */
export function configText(z: number, order: 'aufbau' | 'shell' = 'shell'): string {
  return orbitalList(groundState(z), order)
    .map((o) => `${o.id}${o.e}`)
    .join(' ');
}

/** Total electrons in an occupancy map. */
export const electronCount = (occ: Occupancy): number => Object.values(occ).reduce((s, e) => s + e, 0);

/** Electrons per principal shell (K, L, M, N…): 26 → [2, 8, 14, 2]. */
export function shellCounts(z: number): number[] {
  const occ = groundState(z);
  const shells: number[] = [];
  for (const o of AUFBAU) {
    const e = occ[o.id] ?? 0;
    if (e > 0) shells[o.n - 1] = (shells[o.n - 1] ?? 0) + e;
  }
  return Array.from(shells, (e) => e ?? 0);
}

// ── Period, block and group ─────────────────────────────────────────────────

export type GroupCalc = { kind: 'he' } | { kind: 'f' } | { kind: 's' | 'p' | 'd'; parts: [string, number][] };

export interface Analysis extends ElementId {
  occ: Occupancy;
  period: number;
  block: Block;
  group: number;
  /** orbitals used to work out the group */
  valence: string[];
  calc: GroupCalc;
  /** orbital that receives the last electron by Aufbau order */
  lastId: string;
  exception: ExceptionInfo | null;
}

/**
 * Everything the calculator and the blocks tool need for one element.
 * Rules follow the SSC textbook (s: ns, p: 10 + ns + np, d: (n−1)d + ns, f: group 3).
 * Valid for Z = 1–36 plus the f-block examples used in the tools.
 */
export function analyze(z: number): Analysis {
  const filled = aufbauFill(z);
  const last = filled[filled.length - 1];
  if (!last) throw new RangeError(`Cannot analyse Z = ${z}`);
  const occ = groundState(z);
  const period = Math.max(...filled.map((o) => o.n));
  const block = last.l;
  const sId = `${period}s`;
  const s = occ[sId] ?? 0;

  let group: number;
  let valence: string[];
  let calc: GroupCalc;
  if (z === 2) {
    group = 18;
    valence = ['1s'];
    calc = { kind: 'he' };
  } else if (block === 's') {
    group = s;
    valence = [sId];
    calc = { kind: 's', parts: [[sId, s]] };
  } else if (block === 'p') {
    const pId = `${period}p`;
    const p = occ[pId] ?? 0;
    group = 10 + s + p;
    valence = [sId, pId];
    calc = {
      kind: 'p',
      parts: [
        [sId, s],
        [pId, p],
      ],
    };
  } else if (block === 'd') {
    const dId = `${period - 1}d`;
    const d = occ[dId] ?? 0;
    group = d + s;
    valence = [dId, sId];
    calc = {
      kind: 'd',
      parts: [
        [dId, d],
        [sId, s],
      ],
    };
  } else {
    group = 3;
    valence = [last.id];
    calc = { kind: 'f' };
  }

  return { ...element(z), occ, period, block, group, valence, calc, lastId: last.id, exception: EXCEPTIONS[z] ?? null };
}

export const BLOCK_RULES: Record<Block | 'he', string> = {
  s: 'গ্রুপ নম্বর = সর্বশেষ শক্তিস্তরের s-অরবিটালের ইলেকট্রন সংখ্যা',
  p: 'গ্রুপ নম্বর = ১০ + সর্বশেষ শক্তিস্তরের (s + p) অরবিটালের ইলেকট্রন সংখ্যা',
  d: 'গ্রুপ নম্বর = (n−১)d অরবিটালের ইলেকট্রন + ns অরবিটালের ইলেকট্রন',
  f: 'ল্যান্থানাইড ও অ্যাক্টিনাইড সিরিজের সকল f-ব্লক মৌল গ্রুপ ৩-এ অবস্থিত',
  he: 'হিলিয়ামের বিন্যাস 1s^2 (s-ব্লক), তবে এর শক্তিস্তর পূর্ণ ও এটি নিষ্ক্রিয় গ্যাস, তাই একে গ্রুপ ১৮-তে রাখা হয়',
};
