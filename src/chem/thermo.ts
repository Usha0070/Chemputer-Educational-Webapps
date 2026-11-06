// Thermochemistry: heat from a temperature change (q = mcΔT), dissolving/neutralisation experiments, bond energies.

export const C_WATER = 4.18; // J g⁻¹ K⁻¹

/** Heat absorbed by water (J): q = m·c·ΔT */
export const heat = (grams: number, deltaT: number, c = C_WATER): number => grams * c * deltaT;

export interface ThermoExperiment {
  id: string;
  nameBn: string;
  equation: string;
  /** ΔH per mole of the solid added (kJ/mol); negative = exothermic */
  dH: number;
  molarMass: number;
  kind: 'dissolve' | 'neutralise';
}

/** Literature molar enthalpies (dilute solution, 25 °C). */
export const EXPERIMENTS: readonly ThermoExperiment[] = [
  {
    id: 'naoh',
    nameBn: 'সোডিয়াম হাইড্রক্সাইড পানিতে দ্রবীভূত করা',
    equation: 'NaOH(s) -> Na^+(aq) + OH^-(aq)',
    dH: -44.5,
    molarMass: 40,
    kind: 'dissolve',
  },
  {
    id: 'nh4cl',
    nameBn: 'অ্যামোনিয়াম ক্লোরাইড পানিতে দ্রবীভূত করা',
    equation: 'NH4Cl(s) -> NH4^+(aq) + Cl^-(aq)',
    dH: 14.8,
    molarMass: 53.5,
    kind: 'dissolve',
  },
  {
    id: 'nh4no3',
    nameBn: 'অ্যামোনিয়াম নাইট্রেট পানিতে দ্রবীভূত করা',
    equation: 'NH4NO3(s) -> NH4^+(aq) + NO3^-(aq)',
    dH: 25.7,
    molarMass: 80,
    kind: 'dissolve',
  },
  {
    id: 'cacl2',
    nameBn: 'অনার্দ্র ক্যালসিয়াম ক্লোরাইড দ্রবীভূত করা',
    equation: 'CaCl2(s) -> Ca^2+(aq) + 2Cl^-(aq)',
    dH: -81.3,
    molarMass: 111,
    kind: 'dissolve',
  },
  {
    id: 'neutral',
    nameBn: 'HCl ও NaOH দ্রবণ মেশানো (প্রশমন)',
    equation: 'HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)',
    dH: -57.3,
    molarMass: 40,
    kind: 'neutralise',
  },
];

/**
 * Final temperature change of the water when `grams` of the substance is used in `waterGrams` of water.
 * Assumes all the heat goes to the water (no heat lost to the cup): ΔT = −ΔH·n / (m·c).
 */
export function temperatureChange(exp: ThermoExperiment, grams: number, waterGrams: number): { moles: number; q: number; deltaT: number } {
  const moles = grams / exp.molarMass;
  const q = -exp.dH * 1000 * moles; // J released to the water (negative if absorbed from it)
  return { moles, q, deltaT: q / (waterGrams * C_WATER) };
}

/** Average bond energies (kJ/mol). */
export const BOND_ENERGY: Readonly<Record<string, number>> = {
  'H–H': 436,
  'Cl–Cl': 242,
  'Br–Br': 193,
  'H–Cl': 431,
  'H–Br': 366,
  'O=O': 498,
  'O–H': 463,
  'C–H': 413,
  'C=O': 799,
  'C–C': 347,
  'C=C': 614,
  'N≡N': 945,
  'N–H': 391,
};

export interface BondReaction {
  id: string;
  equation: string;
  broken: [string, number][];
  formed: [string, number][];
}

export const BOND_REACTIONS: readonly BondReaction[] = [
  { id: 'hcl', equation: 'H2 + Cl2 -> 2HCl', broken: [['H–H', 1], ['Cl–Cl', 1]], formed: [['H–Cl', 2]] },
  { id: 'h2o', equation: '2H2 + O2 -> 2H2O', broken: [['H–H', 2], ['O=O', 1]], formed: [['O–H', 4]] },
  { id: 'ch4', equation: 'CH4 + 2O2 -> CO2 + 2H2O', broken: [['C–H', 4], ['O=O', 2]], formed: [['C=O', 2], ['O–H', 4]] },
  { id: 'nh3', equation: 'N2 + 3H2 -> 2NH3', broken: [['N≡N', 1], ['H–H', 3]], formed: [['N–H', 6]] },
  { id: 'hbr', equation: 'H2 + Br2 -> 2HBr', broken: [['H–H', 1], ['Br–Br', 1]], formed: [['H–Br', 2]] },
]; // prettier-ignore

/** ΔH = energy to break bonds − energy released forming bonds. */
export function bondEnthalpy(r: BondReaction): { broken: number; formed: number; dH: number } {
  const sum = (list: [string, number][]) => list.reduce((s, [b, n]) => s + (BOND_ENERGY[b] ?? 0) * n, 0);
  const broken = sum(r.broken);
  const formed = sum(r.formed);
  return { broken, formed, dH: broken - formed };
}
