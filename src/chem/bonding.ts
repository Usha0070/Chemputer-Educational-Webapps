// Chemical bonding: ionic electron transfer between main-group atoms, and covalent (dot-and-cross) octet checks.
import { bohrShells, commonIonCharge } from './atom';
import { element } from './elements';

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

export interface IonicPlan {
  metal: number;
  nonmetal: number;
  metalCount: number;
  nonmetalCount: number;
  /** electrons each metal atom gives / each non-metal atom takes */
  give: number;
  take: number;
  /** [metal index, non-metal index] for every electron, in order */
  transfers: [number, number][];
  formula: string;
}

/** How electrons move when a metal (Z ≤ 20) bonds with a non-metal: Mg + O → MgO, 2 electrons; Al + O → Al₂O₃, 6. */
export function ionicPlan(metal: number, nonmetal: number): IonicPlan {
  const give = commonIonCharge(metal);
  const take = -commonIonCharge(nonmetal);
  if (give <= 0 || take <= 0) throw new Error('একটি ধাতু ও একটি অধাতু বেছে নাও।');
  const lcm = (give * take) / gcd(give, take);
  const metalCount = lcm / give;
  const nonmetalCount = lcm / take;
  const transfers: [number, number][] = [];
  const need = Array.from({ length: nonmetalCount }, () => take);
  let target = 0;
  for (let m = 0; m < metalCount; m++) {
    for (let k = 0; k < give; k++) {
      while (need[target] === 0) target++;
      transfers.push([m, target]);
      need[target]!--;
    }
  }
  const sym = (z: number, n: number) => element(z).symbol + (n > 1 ? String(n) : '');
  return {
    metal,
    nonmetal,
    metalCount,
    nonmetalCount,
    give,
    take,
    transfers,
    formula: sym(metal, metalCount) + sym(nonmetal, nonmetalCount),
  };
}

/** Shells after ion formation: Na → Na⁺ (2, 8), Cl → Cl⁻ (2, 8, 8). */
export const ionShells = (z: number, charge: number): number[] => bohrShells(z - charge);

// ── Covalent bonds (dot-and-cross) ─────────────────────────────────────────

export interface CovalentAtom {
  symbol: string;
  /** valence (outer-shell) electrons */
  valence: number;
  x: number;
  y: number;
  /** drawn with dots or crosses */
  mark: 'dot' | 'cross';
}

export interface Molecule {
  id: string;
  formula: string;
  nameBn: string;
  atoms: CovalentAtom[];
  /** pairs of atom indices that can bond */
  links: [number, number][];
  /** correct bond order for each link */
  answer: number[];
}

const A = (symbol: string, valence: number, x: number, y: number, mark: 'dot' | 'cross'): CovalentAtom => ({ symbol, valence, x, y, mark });

export const MOLECULES: readonly Molecule[] = [
  {
    id: 'H2',
    formula: 'H2',
    nameBn: 'হাইড্রোজেন',
    atoms: [A('H', 1, -60, 0, 'dot'), A('H', 1, 60, 0, 'cross')],
    links: [[0, 1]],
    answer: [1],
  },
  {
    id: 'Cl2',
    formula: 'Cl2',
    nameBn: 'ক্লোরিন',
    atoms: [A('Cl', 7, -70, 0, 'dot'), A('Cl', 7, 70, 0, 'cross')],
    links: [[0, 1]],
    answer: [1],
  },
  {
    id: 'HCl',
    formula: 'HCl',
    nameBn: 'হাইড্রোজেন ক্লোরাইড',
    atoms: [A('H', 1, -70, 0, 'cross'), A('Cl', 7, 70, 0, 'dot')],
    links: [[0, 1]],
    answer: [1],
  },
  {
    id: 'O2',
    formula: 'O2',
    nameBn: 'অক্সিজেন',
    atoms: [A('O', 6, -70, 0, 'dot'), A('O', 6, 70, 0, 'cross')],
    links: [[0, 1]],
    answer: [2],
  },
  {
    id: 'N2',
    formula: 'N2',
    nameBn: 'নাইট্রোজেন',
    atoms: [A('N', 5, -70, 0, 'dot'), A('N', 5, 70, 0, 'cross')],
    links: [[0, 1]],
    answer: [3],
  },
  {
    id: 'H2O',
    formula: 'H2O',
    nameBn: 'পানি',
    atoms: [A('O', 6, 0, -20, 'dot'), A('H', 1, -105, 55, 'cross'), A('H', 1, 105, 55, 'cross')],
    links: [
      [0, 1],
      [0, 2],
    ],
    answer: [1, 1],
  },
  {
    id: 'NH3',
    formula: 'NH3',
    nameBn: 'অ্যামোনিয়া',
    atoms: [A('N', 5, 0, -10, 'dot'), A('H', 1, -115, 20, 'cross'), A('H', 1, 115, 20, 'cross'), A('H', 1, 0, 115, 'cross')],
    links: [
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    answer: [1, 1, 1],
  },
  {
    id: 'CH4',
    formula: 'CH4',
    nameBn: 'মিথেন',
    atoms: [
      A('C', 4, 0, 0, 'dot'),
      A('H', 1, 0, -115, 'cross'),
      A('H', 1, 115, 0, 'cross'),
      A('H', 1, 0, 115, 'cross'),
      A('H', 1, -115, 0, 'cross'),
    ],
    links: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
    answer: [1, 1, 1, 1],
  },
  {
    id: 'CO2',
    formula: 'CO2',
    nameBn: 'কার্বন ডাইঅক্সাইড',
    atoms: [A('O', 6, -125, 0, 'dot'), A('C', 4, 0, 0, 'cross'), A('O', 6, 125, 0, 'dot')],
    links: [
      [0, 1],
      [1, 2],
    ],
    answer: [2, 2],
  },
];

/** Electrons an atom needs around it: 2 for hydrogen (duet), otherwise 8 (octet). */
export const target = (a: CovalentAtom): number => (a.symbol === 'H' ? 2 : 8);
/** Most bonds an atom can form: one per missing electron. */
export const maxBonds = (a: CovalentAtom): number => target(a) - a.valence;

export interface AtomStatus {
  bonds: number;
  /** electrons around the atom: own valence + one from the partner per bond */
  around: number;
  lonePairs: number;
  unpaired: number;
  full: boolean;
}

/** Check a set of bond orders (one per link): electrons around each atom and whether every octet/duet is complete. */
export function checkMolecule(
  m: Molecule,
  orders: number[],
): { atoms: AtomStatus[]; complete: boolean; bondCount: number; lonePairs: number } {
  const atoms = m.atoms.map((a, i) => {
    const bonds = m.links.reduce((s, [p, q], k) => s + (p === i || q === i ? (orders[k] ?? 0) : 0), 0);
    const nonbonding = a.valence - bonds;
    const around = a.valence + bonds;
    return {
      bonds,
      around,
      lonePairs: Math.floor(Math.max(0, nonbonding) / 2),
      unpaired: Math.max(0, nonbonding) % 2,
      full: around === target(a),
    };
  });
  return {
    atoms,
    complete: atoms.every((a) => a.full),
    bondCount: orders.reduce((s, o) => s + o, 0),
    lonePairs: atoms.reduce((s, a) => s + a.lonePairs, 0),
  };
}

export const BOND_NAME = ['', 'একক বন্ধন', 'দ্বিবন্ধন', 'ত্রিবন্ধন'] as const;
