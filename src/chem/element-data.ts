// Reference data for all 118 elements: English names, standard atomic weights, categories, layout position,
// state at room temperature, Pauling electronegativity and first ionisation energy.
// Sources: IUPAC standard atomic weights (abridged, 2021; [n] = mass number of the longest-lived isotope),
// NIST Atomic Spectra Database (ionisation energies), CRC Handbook (Pauling electronegativities).
import { MAX_Z, element } from './elements';

// prettier-ignore
const NAMES_EN = [
  'Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen', 'Oxygen', 'Fluorine', 'Neon',
  'Sodium', 'Magnesium', 'Aluminium', 'Silicon', 'Phosphorus', 'Sulfur', 'Chlorine', 'Argon', 'Potassium', 'Calcium',
  'Scandium', 'Titanium', 'Vanadium', 'Chromium', 'Manganese', 'Iron', 'Cobalt', 'Nickel', 'Copper', 'Zinc',
  'Gallium', 'Germanium', 'Arsenic', 'Selenium', 'Bromine', 'Krypton', 'Rubidium', 'Strontium', 'Yttrium', 'Zirconium',
  'Niobium', 'Molybdenum', 'Technetium', 'Ruthenium', 'Rhodium', 'Palladium', 'Silver', 'Cadmium', 'Indium', 'Tin',
  'Antimony', 'Tellurium', 'Iodine', 'Xenon', 'Caesium', 'Barium', 'Lanthanum', 'Cerium', 'Praseodymium', 'Neodymium',
  'Promethium', 'Samarium', 'Europium', 'Gadolinium', 'Terbium', 'Dysprosium', 'Holmium', 'Erbium', 'Thulium', 'Ytterbium',
  'Lutetium', 'Hafnium', 'Tantalum', 'Tungsten', 'Rhenium', 'Osmium', 'Iridium', 'Platinum', 'Gold', 'Mercury',
  'Thallium', 'Lead', 'Bismuth', 'Polonium', 'Astatine', 'Radon', 'Francium', 'Radium', 'Actinium', 'Thorium',
  'Protactinium', 'Uranium', 'Neptunium', 'Plutonium', 'Americium', 'Curium', 'Berkelium', 'Californium', 'Einsteinium', 'Fermium',
  'Mendelevium', 'Nobelium', 'Lawrencium', 'Rutherfordium', 'Dubnium', 'Seaborgium', 'Bohrium', 'Hassium', 'Meitnerium', 'Darmstadtium',
  'Roentgenium', 'Copernicium', 'Nihonium', 'Flerovium', 'Moscovium', 'Livermorium', 'Tennessine', 'Oganesson',
];

// Standard atomic weights. Negative numbers mark a mass number in brackets (no stable isotope): -98 → [98].
// prettier-ignore
const MASS = [
  1.008, 4.0026, 6.94, 9.0122, 10.81, 12.011, 14.007, 15.999, 18.998, 20.18,
  22.99, 24.305, 26.982, 28.085, 30.974, 32.06, 35.45, 39.95, 39.098, 40.078,
  44.956, 47.867, 50.942, 51.996, 54.938, 55.845, 58.933, 58.693, 63.546, 65.38,
  69.723, 72.63, 74.922, 78.971, 79.904, 83.798, 85.468, 87.62, 88.906, 91.224,
  92.906, 95.95, -98, 101.07, 102.91, 106.42, 107.87, 112.41, 114.82, 118.71,
  121.76, 127.6, 126.9, 131.29, 132.91, 137.33, 138.91, 140.12, 140.91, 144.24,
  -145, 150.36, 151.96, 157.25, 158.93, 162.5, 164.93, 167.26, 168.93, 173.05,
  174.97, 178.49, 180.95, 183.84, 186.21, 190.23, 192.22, 195.08, 196.97, 200.59,
  204.38, 207.2, 208.98, -209, -210, -222, -223, -226, -227, 232.04,
  231.04, 238.03, -237, -244, -243, -247, -247, -251, -252, -257,
  -258, -259, -266, -267, -268, -269, -270, -269, -278, -281,
  -282, -285, -286, -289, -290, -293, -294, -294,
];

// Pauling electronegativity; null = not defined (noble gases) or not measured.
// prettier-ignore
const EN: (number | null)[] = [
  2.2, null, 0.98, 1.57, 2.04, 2.55, 3.04, 3.44, 3.98, null,
  0.93, 1.31, 1.61, 1.9, 2.19, 2.58, 3.16, null, 0.82, 1.0,
  1.36, 1.54, 1.63, 1.66, 1.55, 1.83, 1.88, 1.91, 1.9, 1.65,
  1.81, 2.01, 2.18, 2.55, 2.96, null, 0.82, 0.95, 1.22, 1.33,
  1.6, 2.16, 1.9, 2.2, 2.28, 2.2, 1.93, 1.69, 1.78, 1.96,
  2.05, 2.1, 2.66, null, 0.79, 0.89, 1.1, 1.12, 1.13, 1.14,
  1.13, 1.17, 1.2, 1.2, 1.1, 1.22, 1.23, 1.24, 1.25, 1.1,
  1.27, 1.3, 1.5, 2.36, 1.9, 2.2, 2.2, 2.28, 2.54, 2.0,
  1.62, 2.33, 2.02, 2.0, 2.2, null, 0.7, 0.9, 1.1, 1.3,
  1.5, 1.38, 1.36, 1.28, 1.13, 1.28, 1.3, 1.3, 1.3, 1.3,
  1.3, 1.3, 1.3, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
];

// First ionisation energy, kJ/mol; null = not measured.
// prettier-ignore
const IE1: (number | null)[] = [
  1312, 2372, 520, 900, 801, 1086, 1402, 1314, 1681, 2081,
  496, 738, 578, 787, 1012, 1000, 1251, 1521, 419, 590,
  633, 659, 651, 653, 717, 762, 760, 737, 745, 906,
  579, 762, 947, 941, 1140, 1351, 403, 550, 600, 640,
  652, 684, 702, 710, 720, 804, 731, 868, 558, 709,
  834, 869, 1008, 1170, 376, 503, 538, 534, 527, 533,
  540, 545, 547, 593, 566, 573, 581, 589, 597, 603,
  524, 659, 761, 770, 760, 840, 880, 870, 890, 1007,
  589, 716, 703, 812, 899, 1037, 393, 509, 499, 587,
  568, 598, 605, 585, 578, 581, 601, 608, 619, 627,
  635, 642, 479, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
];

export type Category =
  | 'alkali'
  | 'alkaline-earth'
  | 'transition'
  | 'lanthanide'
  | 'actinide'
  | 'post-transition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas';

export const CATEGORY_LABEL: Record<Category, { bn: string; en: string }> = {
  alkali: { bn: 'ক্ষার ধাতু', en: 'Alkali metal' },
  'alkaline-earth': { bn: 'মৃৎক্ষার ধাতু', en: 'Alkaline-earth metal' },
  transition: { bn: 'অবস্থান্তর মৌল', en: 'Transition metal' },
  lanthanide: { bn: 'ল্যান্থানাইড', en: 'Lanthanide' },
  actinide: { bn: 'অ্যাক্টিনাইড', en: 'Actinide' },
  'post-transition': { bn: 'অন্যান্য ধাতু', en: 'Post-transition metal' },
  metalloid: { bn: 'অর্ধধাতু', en: 'Metalloid' },
  nonmetal: { bn: 'অধাতু', en: 'Non-metal' },
  halogen: { bn: 'হ্যালোজেন', en: 'Halogen' },
  'noble-gas': { bn: 'নিষ্ক্রিয় গ্যাস', en: 'Noble gas' },
};

const ALKALI = [3, 11, 19, 37, 55, 87];
const ALKALINE_EARTH = [4, 12, 20, 38, 56, 88];
const HALOGEN = [9, 17, 35, 53, 85, 117];
const NOBLE = [2, 10, 18, 36, 54, 86, 118];
const METALLOID = [5, 14, 32, 33, 51, 52];
const NONMETAL = [1, 6, 7, 8, 15, 16, 34];
const POST_TRANSITION = [13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116];

export function category(z: number): Category {
  if (ALKALI.includes(z)) return 'alkali';
  if (ALKALINE_EARTH.includes(z)) return 'alkaline-earth';
  if (HALOGEN.includes(z)) return 'halogen';
  if (NOBLE.includes(z)) return 'noble-gas';
  if (METALLOID.includes(z)) return 'metalloid';
  if (NONMETAL.includes(z)) return 'nonmetal';
  if (POST_TRANSITION.includes(z)) return 'post-transition';
  if (z >= 57 && z <= 71) return 'lanthanide';
  if (z >= 89 && z <= 103) return 'actinide';
  return 'transition';
}

export type State = 'solid' | 'liquid' | 'gas' | 'unknown';
export const STATE_LABEL: Record<State, string> = { solid: 'কঠিন', liquid: 'তরল', gas: 'গ্যাস', unknown: 'অজানা' };
const GASES = [1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86];
const LIQUIDS = [35, 80];

/** Physical state at 25 °C and 1 atm. Elements from Z = 100 on have never been made in bulk. */
export function stateAtRoomTemp(z: number): State {
  if (GASES.includes(z)) return 'gas';
  if (LIQUIDS.includes(z)) return 'liquid';
  return z >= 100 ? 'unknown' : 'solid';
}

/** Made in laboratories/reactors rather than mined in useful amounts. */
export const isSynthetic = (z: number): boolean => z === 43 || z === 61 || z >= 93;

const PERIOD_START = [1, 3, 11, 19, 37, 55, 87, 119];

export interface Position {
  period: number;
  /** IUPAC group 1–18; lanthanides and actinides are counted in group 3 */
  group: number;
  /** grid row (1–7 main table, 9 lanthanides, 10 actinides) and column (1–18) for drawing */
  row: number;
  col: number;
}

/** Where an element sits in the standard 18-column table with the f-block shown below it. */
export function position(z: number): Position {
  const period = PERIOD_START.findIndex((start, i) => z >= start && z < PERIOD_START[i + 1]!) + 1;
  const offset = z - PERIOD_START[period - 1]!;
  if (period === 1) return { period, group: z === 1 ? 1 : 18, row: 1, col: z === 1 ? 1 : 18 };
  if (period <= 3) {
    const group = offset < 2 ? offset + 1 : offset + 11;
    return { period, group, row: period, col: group };
  }
  if (period <= 5) return { period, group: offset + 1, row: period, col: offset + 1 };
  if (offset < 2) return { period, group: offset + 1, row: period, col: offset + 1 };
  if (offset <= 16) return { period, group: 3, row: period === 6 ? 9 : 10, col: offset + 1 };
  const group = offset - 13;
  return { period, group, row: period, col: group };
}

export interface ElementInfo {
  z: number;
  symbol: string;
  name: string;
  nameEn: string;
  /** standard atomic weight, or mass number of the longest-lived isotope when `massIsApprox` */
  mass: number;
  massIsApprox: boolean;
  category: Category;
  state: State;
  synthetic: boolean;
  en: number | null;
  ie1: number | null;
  position: Position;
}

export function elementInfo(z: number): ElementInfo {
  const id = element(z);
  const m = MASS[z - 1]!;
  return {
    ...id,
    nameEn: NAMES_EN[z - 1]!,
    mass: Math.abs(m),
    massIsApprox: m < 0,
    category: category(z),
    state: stateAtRoomTemp(z),
    synthetic: isSynthetic(z),
    en: EN[z - 1] ?? null,
    ie1: IE1[z - 1] ?? null,
    position: position(z),
  };
}

export const ALL_ELEMENTS: readonly ElementInfo[] = Array.from({ length: MAX_Z }, (_, i) => elementInfo(i + 1));

/** Atomic mass used in SSC calculations (book values are rounded: H = 1, C = 12, O = 16, Na = 23, Cl = 35.5 …). */
const SSC_MASS: Record<string, number> = {
  H: 1, He: 4, Li: 7, Be: 9, B: 11, C: 12, N: 14, O: 16, F: 19, Ne: 20, Na: 23, Mg: 24, Al: 27, Si: 28, P: 31, S: 32,
  Cl: 35.5, Ar: 40, K: 39, Ca: 40, Cr: 52, Mn: 55, Fe: 56, Co: 59, Ni: 59, Cu: 63.5, Zn: 65, Br: 80, Ag: 108, Sn: 119,
  I: 127, Ba: 137, Pt: 195, Au: 197, Hg: 201, Pb: 207,
}; // prettier-ignore

/** Atomic mass by symbol: "precise" (IUPAC) or "ssc" (rounded textbook value where the book uses one). */
export function atomicMass(symbol: string, mode: 'precise' | 'ssc' = 'precise'): number {
  if (mode === 'ssc' && SSC_MASS[symbol] !== undefined) return SSC_MASS[symbol]!;
  const info = ALL_ELEMENTS.find((e) => e.symbol === symbol);
  if (!info) throw new Error(`Unknown element symbol: ${symbol}`);
  return info.mass;
}
