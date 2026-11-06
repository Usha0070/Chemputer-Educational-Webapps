// Build-an-atom engine: protons, neutrons and electrons → element, mass number, charge, ion type,
// isotope stability and Bohr shell arrangement (for the SSC range Z ≤ 20).
import { element, type ElementId } from './elements';

/** Naturally occurring stable isotopes (mass numbers) for Z = 1–20. ⁴⁰K is listed as radioactive (very long half-life). */
export const STABLE_ISOTOPES: Readonly<Record<number, readonly number[]>> = {
  1: [1, 2],
  2: [3, 4],
  3: [6, 7],
  4: [9],
  5: [10, 11],
  6: [12, 13],
  7: [14, 15],
  8: [16, 17, 18],
  9: [19],
  10: [20, 21, 22],
  11: [23],
  12: [24, 25, 26],
  13: [27],
  14: [28, 29, 30],
  15: [31],
  16: [32, 33, 34, 36],
  17: [35, 37],
  18: [36, 38, 40],
  19: [39, 41],
  20: [40, 42, 43, 44, 46, 48],
};

/** Well-known radioactive isotopes students meet in the book, with a short Bangla note. */
export const NOTABLE_RADIOISOTOPES: Readonly<Record<string, string>> = {
  '1-3': 'ট্রিটিয়াম: হাইড্রোজেনের তেজস্ক্রিয় আইসোটোপ',
  '6-14': 'কার্বন-১৪: জীবাশ্ম ও প্রাচীন বস্তুর বয়স নির্ণয়ে ব্যবহৃত হয়',
  '15-32': 'ফসফরাস-৩২: কৃষি গবেষণা ও চিকিৎসায় ব্যবহৃত হয়',
  '11-24': 'সোডিয়াম-২৪: রক্তপ্রবাহে বাধা শনাক্তে ব্যবহৃত হয়',
  '19-40': 'পটাসিয়াম-৪০: প্রাকৃতিক তেজস্ক্রিয় আইসোটোপ, খুব দীর্ঘ অর্ধায়ু',
};

export const MAX_BUILD_Z = 20;

/** Mass number of the most abundant natural isotope, Z = 1–20. */
// prettier-ignore
export const MOST_ABUNDANT_A = [1, 4, 7, 9, 11, 12, 14, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 40, 39, 40];

/** The everyday (most abundant) neutral atom of element Z ≤ 20. */
export const typicalAtom = (z: number): { protons: number; neutrons: number; electrons: number } => ({
  protons: z,
  neutrons: (MOST_ABUNDANT_A[z - 1] ?? 2 * z) - z,
  electrons: z,
});

export type Stability = 'stable' | 'radioactive' | 'none';
export type Kind = 'empty' | 'nucleus-only' | 'neutral' | 'cation' | 'anion';

export interface AtomState {
  protons: number;
  neutrons: number;
  electrons: number;
}

export interface AtomReport {
  element: ElementId | null;
  /** mass number A = p + n */
  massNumber: number;
  /** p − e */
  charge: number;
  kind: Kind;
  stability: Stability;
  /** Bohr shells K, L, M, N… for the electrons present */
  shells: number[];
  /** "²³₁₁Na⁺" as plain parts for rendering */
  notation: { mass: number; z: number; symbol: string; charge: string } | null;
  note: string | null;
}

/** Bohr–Bury filling used in the SSC book for Z ≤ 20: K = 2, L = 8, M = 8, then N. */
export function bohrShells(electrons: number): number[] {
  const caps = [2, 8, 8, 18];
  const shells: number[] = [];
  let left = electrons;
  for (const cap of caps) {
    if (left <= 0) break;
    const e = Math.min(left, cap);
    shells.push(e);
    left -= e;
  }
  return shells;
}

/** "2+", "−", "3−", "" for neutral. Uses a real minus sign. */
export function chargeLabel(charge: number): string {
  if (charge === 0) return '';
  const size = Math.abs(charge) === 1 ? '' : String(Math.abs(charge));
  return size + (charge > 0 ? '+' : '−');
}

export function analyzeAtom({ protons, neutrons, electrons }: AtomState): AtomReport {
  const massNumber = protons + neutrons;
  const charge = protons - electrons;
  const shells = bohrShells(electrons);
  if (protons === 0) {
    return {
      element: null,
      massNumber,
      charge,
      kind: protons + neutrons + electrons === 0 ? 'empty' : 'nucleus-only',
      stability: 'none',
      shells,
      notation: null,
      note: neutrons > 0 ? 'প্রোটন ছাড়া কোনো মৌল হয় না। প্রোটনের সংখ্যাই ঠিক করে এটি কোন মৌল।' : null,
    };
  }
  const el = element(protons);
  const stable = STABLE_ISOTOPES[protons]?.includes(massNumber) ?? false;
  const key = `${protons}-${massNumber}`;
  const kind: Kind = electrons === 0 && charge === protons ? 'nucleus-only' : charge === 0 ? 'neutral' : charge > 0 ? 'cation' : 'anion';
  return {
    element: el,
    massNumber,
    charge,
    kind,
    stability: stable ? 'stable' : 'radioactive',
    shells,
    notation: { mass: massNumber, z: protons, symbol: el.symbol, charge: chargeLabel(charge) },
    note: NOTABLE_RADIOISOTOPES[key] ?? null,
  };
}

/** Same element, different neutron count. */
export const areIsotopes = (a: AtomState, b: AtomState): boolean => a.protons === b.protons && a.protons > 0 && a.neutrons !== b.neutrons;

/** The ion a main-group atom (Z ≤ 20) most often forms by reaching a noble-gas shell, e.g. Mg → 2+, Cl → 1−. 0 for noble gases and C/Si. */
export function commonIonCharge(z: number): number {
  const outer = bohrShells(z).at(-1) ?? 0;
  const full = z <= 2 ? 2 : 8;
  if (outer === full) return 0;
  if (outer <= 3) return outer;
  if (outer >= 5) return outer - 8;
  return 0;
}
