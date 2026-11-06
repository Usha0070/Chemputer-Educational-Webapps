// The reactivity series and how each metal is extracted from its ore.

export type Method = 'electrolysis' | 'carbon' | 'roasting' | 'native';

export interface Metal {
  symbol: string;
  nameBn: string;
  method: Method;
  ore: string;
  oreFormula: string;
  /** main extraction equation */
  equation: string;
}

/** Most reactive first. Carbon and hydrogen are reference points, not metals. */
export const REACTIVITY: readonly Metal[] = [
  { symbol: 'K', nameBn: 'পটাসিয়াম', method: 'electrolysis', ore: 'সিলভাইট', oreFormula: 'KCl', equation: 'K^+ + e^- -> K' },
  {
    symbol: 'Na',
    nameBn: 'সোডিয়াম',
    method: 'electrolysis',
    ore: 'সাধারণ লবণ (রক সল্ট)',
    oreFormula: 'NaCl',
    equation: 'Na^+ + e^- -> Na',
  },
  { symbol: 'Ca', nameBn: 'ক্যালসিয়াম', method: 'electrolysis', ore: 'চুনাপাথর', oreFormula: 'CaCO3', equation: 'Ca^2+ + 2e^- -> Ca' },
  {
    symbol: 'Mg',
    nameBn: 'ম্যাগনেসিয়াম',
    method: 'electrolysis',
    ore: 'ম্যাগনেসাইট',
    oreFormula: 'MgCO3',
    equation: 'Mg^2+ + 2e^- -> Mg',
  },
  { symbol: 'Al', nameBn: 'অ্যালুমিনিয়াম', method: 'electrolysis', ore: 'বক্সাইট', oreFormula: 'Al2O3', equation: 'Al^3+ + 3e^- -> Al' },
  { symbol: 'Zn', nameBn: 'জিংক', method: 'carbon', ore: 'জিংক ব্লেন্ড', oreFormula: 'ZnS', equation: 'ZnO + C -[Δ]-> Zn + CO' },
  { symbol: 'Fe', nameBn: 'আয়রন', method: 'carbon', ore: 'হেমাটাইট', oreFormula: 'Fe2O3', equation: 'Fe2O3 + 3CO -[Δ]-> 2Fe + 3CO2' },
  { symbol: 'Sn', nameBn: 'টিন', method: 'carbon', ore: 'ক্যাসিটেরাইট', oreFormula: 'SnO2', equation: 'SnO2 + 2C -[Δ]-> Sn + 2CO' },
  { symbol: 'Pb', nameBn: 'লেড', method: 'carbon', ore: 'গ্যালেনা', oreFormula: 'PbS', equation: 'PbO + C -[Δ]-> Pb + CO' },
  { symbol: 'Cu', nameBn: 'কপার', method: 'roasting', ore: 'কপার পাইরাইটস', oreFormula: 'CuFeS2', equation: 'Cu2S + O2 -[Δ]-> 2Cu + SO2' },
  { symbol: 'Hg', nameBn: 'মার্কারি', method: 'roasting', ore: 'সিনাবার', oreFormula: 'HgS', equation: 'HgS + O2 -[Δ]-> Hg + SO2' },
  {
    symbol: 'Ag',
    nameBn: 'সিলভার',
    method: 'native',
    ore: 'মুক্ত অবস্থায় বা আর্জেন্টাইট',
    oreFormula: 'Ag2S',
    equation: 'Ag (মুক্ত অবস্থায় পাওয়া যায়)',
  },
  { symbol: 'Au', nameBn: 'গোল্ড', method: 'native', ore: 'মুক্ত অবস্থায়', oreFormula: 'Au', equation: 'Au (মুক্ত অবস্থায় পাওয়া যায়)' },
];

export const METHOD_TEXT: Record<Method, { titleBn: string; why: string }> = {
  electrolysis: {
    titleBn: 'গলিত যৌগের তড়িৎ বিশ্লেষণ',
    why: 'ধাতুটি কার্বনের চেয়ে বেশি সক্রিয়, তাই কার্বন এর অক্সাইড থেকে অক্সিজেন সরাতে পারে না। অনেক শক্তি খরচ করে বিদ্যুৎ দিয়ে আলাদা করতে হয়।',
  },
  carbon: {
    titleBn: 'কার্বন বা কার্বন মনোক্সাইড দিয়ে বিজারণ',
    why: 'ধাতুটি কার্বনের চেয়ে কম সক্রিয়, তাই উত্তপ্ত কার্বন (কোক) এর অক্সাইড থেকে অক্সিজেন সরিয়ে নিতে পারে। সালফাইড আকরিক আগে তাপ দিয়ে অক্সাইড করা হয়।',
  },
  roasting: {
    titleBn: 'বায়ুতে তাপ দিয়ে (ভস্মীকরণ)',
    why: 'ধাতুটি খুব কম সক্রিয়, তাই এর সালফাইড আকরিক বাতাসে উত্তপ্ত করলেই ধাতু আলাদা হয়ে যায়।',
  },
  native: {
    titleBn: 'মুক্ত অবস্থায় পাওয়া যায়',
    why: 'ধাতুটি এত নিষ্ক্রিয় যে প্রকৃতিতে যৌগ না হয়ে বিশুদ্ধ ধাতু হিসেবেই থাকে; শুধু ছেঁকে আলাদা করতে হয়।',
  },
};

export const rankOf = (symbol: string): number => REACTIVITY.findIndex((m) => m.symbol === symbol);

/** Does metal a displace metal b from a solution of b's salt? (a must be more reactive) */
export const displaces = (a: string, b: string): boolean => rankOf(a) >= 0 && rankOf(b) >= 0 && rankOf(a) < rankOf(b);

/** Carbon sits between Al and Zn; hydrogen between Pb and Cu. */
export const CARBON_AFTER = 'Al';
export const HYDROGEN_AFTER = 'Pb';
export const reactsWithAcid = (symbol: string): boolean => rankOf(symbol) >= 0 && rankOf(symbol) <= rankOf(HYDROGEN_AFTER);
