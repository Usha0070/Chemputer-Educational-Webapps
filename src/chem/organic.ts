// Organic chemistry: petroleum fractions, hydrocarbon naming and isomers, and the conversion map
// hydrocarbon → alcohol → aldehyde → carboxylic acid.
import { bn } from './format';

// ── Fractional distillation ─────────────────────────────────────────────────

export interface Fraction {
  id: string;
  nameBn: string;
  nameEn: string;
  /** carbon atoms per molecule (inclusive) */
  carbons: [number, number];
  /** boiling range, °C (approximate; values vary a little between sources) */
  boiling: [number, number];
  usesBn: string;
}

/** Top of the column first (coolest, smallest molecules). */
export const FRACTIONS: readonly Fraction[] = [
  {
    id: 'gas',
    nameBn: 'শোধনাগার গ্যাস (LPG)',
    nameEn: 'Refinery gas',
    carbons: [1, 4],
    boiling: [-160, 40],
    usesBn: 'রান্নার গ্যাস (এলপিজি), জ্বালানি',
  },
  { id: 'petrol', nameBn: 'পেট্রোল (গ্যাসোলিন)', nameEn: 'Petrol', carbons: [5, 8], boiling: [40, 120], usesBn: 'গাড়ির জ্বালানি' },
  {
    id: 'naphtha',
    nameBn: 'ন্যাপথা',
    nameEn: 'Naphtha',
    carbons: [9, 10],
    boiling: [120, 170],
    usesBn: 'প্লাস্টিক ও রাসায়নিক দ্রব্য তৈরির কাঁচামাল',
  },
  {
    id: 'kerosene',
    nameBn: 'কেরোসিন',
    nameEn: 'Kerosene',
    carbons: [11, 16],
    boiling: [170, 250],
    usesBn: 'বিমানের জ্বালানি, কুপি ও স্টোভ',
  },
  {
    id: 'diesel',
    nameBn: 'ডিজেল',
    nameEn: 'Diesel',
    carbons: [17, 20],
    boiling: [250, 340],
    usesBn: 'বাস, ট্রাক, ট্রেন ও জেনারেটরের জ্বালানি',
  },
  {
    id: 'lubricant',
    nameBn: 'লুব্রিকেটিং তেল ও ফার্নেস তেল',
    nameEn: 'Lubricating and fuel oil',
    carbons: [21, 40],
    boiling: [340, 400],
    usesBn: 'যন্ত্রাংশ পিচ্ছিল রাখা, জাহাজ ও কারখানার জ্বালানি',
  },
  {
    id: 'bitumen',
    nameBn: 'বিটুমেন (পিচ)',
    nameEn: 'Bitumen',
    carbons: [41, 80],
    boiling: [400, 600],
    usesBn: 'রাস্তা তৈরি ও ছাদ জলরোধী করা',
  },
];

/** Which fraction a straight-chain hydrocarbon with n carbons ends up in. */
export const fractionForCarbons = (n: number): Fraction =>
  FRACTIONS.find((f) => n >= f.carbons[0] && n <= f.carbons[1]) ?? FRACTIONS[FRACTIONS.length - 1]!;
/** Which fraction condenses at a tray of temperature t (°C). */
export const fractionAtTemperature = (t: number): Fraction =>
  FRACTIONS.find((f) => t >= f.boiling[0] && t < f.boiling[1]) ?? FRACTIONS[FRACTIONS.length - 1]!;

// ── Hydrocarbons ────────────────────────────────────────────────────────────

const PREFIX_EN = ['meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct'];
const PREFIX_BN = ['মিথ', 'ইথ', 'প্রোপ', 'বিউট', 'পেন্ট', 'হেক্স', 'হেপ্ট', 'অক্ট'];

export type Family = 'alkane' | 'alkene' | 'alkyne';

export interface Hydrocarbon {
  /** main-chain length */
  n: number;
  family: Family;
  /** position of the C=C or C≡C (1-based, from the end that gives the lowest number) */
  position: number;
  /** methyl branch positions on the main chain (alkanes only) */
  methyls: number[];
}

export const GENERAL_FORMULA: Record<Family, string> = { alkane: 'CnH2n+2', alkene: 'CnH2n', alkyne: 'CnH2n-2' };

/** Molecular formula counts. */
export function hydrocarbonCounts(h: Hydrocarbon): { C: number; H: number } {
  const C = h.n + h.methyls.length;
  const H = 2 * C + 2 - (h.family === 'alkene' ? 2 : h.family === 'alkyne' ? 4 : 0);
  return { C, H };
}

export const hydrocarbonFormula = (h: Hydrocarbon): string => {
  const { C, H } = hydrocarbonCounts(h);
  return `C${C === 1 ? '' : C}H${H}`;
};

/** Is the requested structure possible as drawn? (multiple bond needs 2+ carbons; branches only on inner carbons) */
export function isValid(h: Hydrocarbon): boolean {
  if (h.n < 1 || h.n > 8) return false;
  if (h.family !== 'alkane' && (h.n < 2 || h.position < 1 || h.position > h.n - 1)) return false;
  if (h.methyls.length && h.family !== 'alkane') return false;
  // a methyl on carbon 1 or n just makes a longer chain; and each inner carbon holds at most two methyls
  return h.methyls.every((p) => p >= 2 && p <= h.n - 1) && h.methyls.every((p) => h.methyls.filter((q) => q === p).length <= 2);
}

const MULT = ['', '', 'di', 'tri', 'tetra'];
const MULT_BN = ['', '', 'ডাই', 'ট্রাই', 'টেট্রা'];

/**
 * IUPAC name with lowest locants, e.g. but-2-ene, 2-methylpropane, 2,2-dimethylbutane.
 * The main chain given is assumed to be the longest chain (isValid guarantees branches never extend it).
 */
export function hydrocarbonName(h: Hydrocarbon): { en: string; bn: string } {
  const stem = PREFIX_EN[h.n - 1]!;
  const stemBn = PREFIX_BN[h.n - 1]!;
  if (h.family !== 'alkane') {
    const pos = Math.min(h.position, h.n - h.position);
    const suffix = h.family === 'alkene' ? 'ene' : 'yne';
    // Bangla: ইথিন, প্রোপিন, ইথাইন; after a locant the vowel stands alone: বিউট-১-ইন, বিউট-২-আইন
    if (h.n <= 3) return { en: `${stem}${suffix}`, bn: `${stemBn}${h.family === 'alkene' ? 'িন' : 'াইন'}` };
    return { en: `${stem}-${pos}-${suffix}`, bn: `${stemBn}-${bn(pos)}-${h.family === 'alkene' ? 'ইন' : 'আইন'}` };
  }
  if (h.methyls.length === 0) return { en: `${stem}ane`, bn: `${stemBn}েন` };
  const forward = [...h.methyls].sort((a, b) => a - b);
  const backward = h.methyls.map((p) => h.n + 1 - p).sort((a, b) => a - b);
  const pick = compareLocants(forward, backward) <= 0 ? forward : backward;
  const k = pick.length;
  const loc = pick.join(',');
  return { en: `${loc}-${MULT[k]}methyl${stem}ane`, bn: `${bn(loc)}-${MULT_BN[k]}মিথাইল${stemBn}েন` };
}

function compareLocants(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

/** Number of structural isomers of the alkane CnH2n+2 (well-known values). */
export const ALKANE_ISOMERS: Readonly<Record<number, number>> = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 5, 7: 9, 8: 18 };

/** Name the main straight-chain members. */
export const STRAIGHT_NAMES_BN: Readonly<Record<string, string>> = {
  CH4: 'মিথেন',
  C2H6: 'ইথেন',
  C2H4: 'ইথিন',
  C2H2: 'ইথাইন',
  C3H8: 'প্রোপেন',
  C3H6: 'প্রোপিন',
  C4H10: 'বিউটেন',
};

// ── Organic conversion map ──────────────────────────────────────────────────

export interface Compound {
  id: string;
  formula: string;
  nameBn: string;
  family: string;
}

export interface Conversion {
  from: string;
  to: string;
  equation: string;
  reagentBn: string;
  conditionBn: string;
  typeBn: string;
}

export const COMPOUNDS: readonly Compound[] = [
  { id: 'methane', formula: 'CH4', nameBn: 'মিথেন', family: 'অ্যালকেন' },
  { id: 'chloromethane', formula: 'CH3Cl', nameBn: 'ক্লোরোমিথেন', family: 'হ্যালোঅ্যালকেন' },
  { id: 'ethane', formula: 'C2H6', nameBn: 'ইথেন', family: 'অ্যালকেন' },
  { id: 'ethene', formula: 'C2H4', nameBn: 'ইথিন', family: 'অ্যালকিন' },
  { id: 'ethyne', formula: 'C2H2', nameBn: 'ইথাইন', family: 'অ্যালকাইন' },
  { id: 'dibromoethane', formula: 'C2H4Br2', nameBn: '১,২-ডাইব্রোমোইথেন', family: 'হ্যালোঅ্যালকেন' },
  { id: 'ethanol', formula: 'C2H5OH', nameBn: 'ইথানল', family: 'অ্যালকোহল' },
  { id: 'ethanal', formula: 'CH3CHO', nameBn: 'ইথান্যাল', family: 'অ্যালডিহাইড' },
  { id: 'ethanoic', formula: 'CH3COOH', nameBn: 'ইথানয়িক এসিড', family: 'কার্বক্সিলিক এসিড' },
  { id: 'ester', formula: 'CH3COOC2H5', nameBn: 'ইথাইল ইথানয়েট', family: 'এস্টার' },
  { id: 'polythene', formula: '(C2H4)n', nameBn: 'পলিথিন', family: 'পলিমার' },
];

export const CONVERSIONS: readonly Conversion[] = [
  {
    from: 'methane',
    to: 'chloromethane',
    equation: 'CH4 + Cl2 -> CH3Cl + HCl',
    reagentBn: 'ক্লোরিন',
    conditionBn: 'সূর্যালোক বা অতিবেগুনি রশ্মি',
    typeBn: 'প্রতিস্থাপন',
  },
  {
    from: 'ethene',
    to: 'ethane',
    equation: 'C2H4 + H2 -> C2H6',
    reagentBn: 'হাইড্রোজেন',
    conditionBn: 'Ni প্রভাবক, ১৫০–৩০০ °সে',
    typeBn: 'যুত (হাইড্রোজিনেশন)',
  },
  {
    from: 'ethyne',
    to: 'ethene',
    equation: 'C2H2 + H2 -> C2H4',
    reagentBn: 'হাইড্রোজেন',
    conditionBn: 'Pd প্রভাবক (নিয়ন্ত্রিত)',
    typeBn: 'যুত',
  },
  {
    from: 'ethene',
    to: 'dibromoethane',
    equation: 'C2H4 + Br2 -> C2H4Br2',
    reagentBn: 'ব্রোমিন পানি',
    conditionBn: 'সাধারণ তাপমাত্রা; লালচে-বাদামি রং মুছে যায়',
    typeBn: 'যুত (অসম্পৃক্ততার পরীক্ষা)',
  },
  {
    from: 'ethene',
    to: 'ethanol',
    equation: 'C2H4 + H2O -> C2H5OH',
    reagentBn: 'জলীয় বাষ্প',
    conditionBn: 'H₃PO₄ প্রভাবক, ৩০০ °সে, ৬০–৭০ atm',
    typeBn: 'যুত (হাইড্রেশন)',
  },
  {
    from: 'ethanol',
    to: 'ethene',
    equation: 'C2H5OH -> C2H4 + H2O',
    reagentBn: 'গাঢ় H₂SO₄',
    conditionBn: '১৭০ °সে',
    typeBn: 'অপসারণ (নিরুদন)',
  },
  {
    from: 'ethanol',
    to: 'ethanal',
    equation: 'C2H5OH + O -> CH3CHO + H2O',
    reagentBn: 'অম্লীয় K₂Cr₂O₇ ([O])',
    conditionBn: 'মৃদু তাপে, উৎপন্ন হওয়া মাত্র পাতিত করে',
    typeBn: 'জারণ',
  },
  {
    from: 'ethanal',
    to: 'ethanoic',
    equation: 'CH3CHO + O -> CH3COOH',
    reagentBn: 'অম্লীয় K₂Cr₂O₇ ([O])',
    conditionBn: 'তাপ দিয়ে (রিফ্লাক্স)',
    typeBn: 'জারণ',
  },
  {
    from: 'ethanol',
    to: 'ester',
    equation: 'CH3COOH + C2H5OH -> CH3COOC2H5 + H2O',
    reagentBn: 'ইথানয়িক এসিড',
    conditionBn: 'গাঢ় H₂SO₄ প্রভাবক, তাপ',
    typeBn: 'এস্টারীকরণ',
  },
  {
    from: 'ethene',
    to: 'polythene',
    equation: 'nC2H4 -> (C2H4)n',
    reagentBn: 'অনেকগুলো ইথিন অণু',
    conditionBn: 'উচ্চ চাপ ও তাপ, প্রভাবক',
    typeBn: 'পলিমারকরণ (যুত)',
  },
];

/** Shortest route between two compounds on the map (breadth-first search), as a list of conversions. */
export function routeBetween(from: string, to: string): Conversion[] | null {
  const prev = new Map<string, Conversion>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const c of CONVERSIONS.filter((x) => x.from === cur)) {
      if (seen.has(c.to)) continue;
      seen.add(c.to);
      prev.set(c.to, c);
      queue.push(c.to);
    }
  }
  if (!seen.has(to)) return null;
  const path: Conversion[] = [];
  for (let at = to; at !== from;) {
    const c = prev.get(at)!;
    path.unshift(c);
    at = c.from;
  }
  return path;
}

// ── Molecule graph with 3D coordinates (ball-and-stick view) ────────────────

export interface Atom3D {
  el: 'C' | 'H';
  x: number;
  y: number;
  z: number;
}
export interface Bond3D {
  a: number;
  b: number;
  order: number;
}

const CANDIDATES: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) out.push([x, y, z]);
  return out.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l] as [number, number, number];
  });
})();

/** Atoms and bonds of the hydrocarbon, with rough 3D geometry (zig-zag chain, hydrogens spread to fill each carbon's valence). */
export function buildMolecule(h: Hydrocarbon): { atoms: Atom3D[]; bonds: Bond3D[] } {
  const atoms: Atom3D[] = [];
  const bonds: Bond3D[] = [];
  const CC = 1.5;
  const CH = 1.05;
  for (let i = 0; i < h.n; i++) atoms.push({ el: 'C', x: i * CC * 0.85, y: i % 2 ? 0.75 : 0, z: 0 });
  // the multiple bond sits between carbon (p−1) and p counted from the end that gives the lowest locant
  const p = Math.min(h.position, h.n - h.position);
  for (let i = 0; i + 1 < h.n; i++)
    bonds.push({ a: i, b: i + 1, order: h.family !== 'alkane' && i === p - 1 ? (h.family === 'alkene' ? 2 : 3) : 1 });
  const neighbours = (idx: number) => bonds.filter((b) => b.a === idx || b.b === idx).map((b) => (b.a === idx ? b.b : b.a));
  const dirTo = (from: number, to: number): [number, number, number] => {
    const A = atoms[from]!;
    const B = atoms[to]!;
    const l = Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z) || 1;
    return [(B.x - A.x) / l, (B.y - A.y) / l, (B.z - A.z) / l];
  };
  const pickDirection = (idx: number): [number, number, number] => {
    const used = neighbours(idx).map((n) => dirTo(idx, n));
    let best = CANDIDATES[0]!;
    let bestScore = -Infinity;
    for (const c of CANDIDATES) {
      const score = used.length
        ? Math.min(...used.map((u) => Math.acos(Math.max(-1, Math.min(1, u[0] * c[0] + u[1] * c[1] + u[2] * c[2])))))
        : 1;
      if (score > bestScore + 1e-9) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  };
  // methyl branches
  for (const pos of h.methyls) {
    const parent = pos - 1;
    const d = pickDirection(parent);
    const A = atoms[parent]!;
    atoms.push({ el: 'C', x: A.x + d[0] * CC, y: A.y + d[1] * CC, z: A.z + d[2] * CC });
    bonds.push({ a: parent, b: atoms.length - 1, order: 1 });
  }
  // hydrogens fill every carbon's remaining valence
  const carbons = atoms.length;
  for (let c = 0; c < carbons; c++) {
    const valence = bonds.filter((b) => b.a === c || b.b === c).reduce((s, b) => s + b.order, 0);
    for (let k = 0; k < 4 - valence; k++) {
      const d = pickDirection(c);
      const A = atoms[c]!;
      atoms.push({ el: 'H', x: A.x + d[0] * CH, y: A.y + d[1] * CH, z: A.z + d[2] * CH });
      bonds.push({ a: c, b: atoms.length - 1, order: 1 });
    }
  }
  return { atoms, bonds };
}
