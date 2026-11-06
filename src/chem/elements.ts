// Element identities for Z = 1–118: symbol and curated Bangla name.
// One source of truth: every simulation reads element data from here.

const SYMBOLS = (
  'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr ' +
  'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu ' +
  'Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr ' +
  'Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'
).split(' ');

// prettier-ignore
const NAMES_BN = [
  'হাইড্রোজেন', 'হিলিয়াম', 'লিথিয়াম', 'বেরিলিয়াম', 'বোরন', 'কার্বন', 'নাইট্রোজেন', 'অক্সিজেন', 'ফ্লোরিন', 'নিয়ন',
  'সোডিয়াম', 'ম্যাগনেসিয়াম', 'অ্যালুমিনিয়াম', 'সিলিকন', 'ফসফরাস', 'সালফার', 'ক্লোরিন', 'আর্গন', 'পটাসিয়াম', 'ক্যালসিয়াম',
  'স্ক্যান্ডিয়াম', 'টাইটানিয়াম', 'ভ্যানাডিয়াম', 'ক্রোমিয়াম', 'ম্যাঙ্গানিজ', 'আয়রন', 'কোবাল্ট', 'নিকেল', 'কপার', 'জিংক',
  'গ্যালিয়াম', 'জার্মেনিয়াম', 'আর্সেনিক', 'সেলেনিয়াম', 'ব্রোমিন', 'ক্রিপ্টন', 'রুবিডিয়াম', 'স্ট্রনশিয়াম', 'ইট্রিয়াম', 'জার্কোনিয়াম',
  'নিওবিয়াম', 'মলিবডেনাম', 'টেকনেটিয়াম', 'রুথেনিয়াম', 'রোডিয়াম', 'প্যালাডিয়াম', 'সিলভার', 'ক্যাডমিয়াম', 'ইন্ডিয়াম', 'টিন',
  'অ্যান্টিমনি', 'টেলুরিয়াম', 'আয়োডিন', 'জেনন', 'সিজিয়াম', 'বেরিয়াম', 'ল্যান্থানাম', 'সিরিয়াম', 'প্রাসিওডিমিয়াম', 'নিওডিমিয়াম',
  'প্রমিথিয়াম', 'সামারিয়াম', 'ইউরোপিয়াম', 'গ্যাডোলিনিয়াম', 'টারবিয়াম', 'ডিসপ্রোসিয়াম', 'হলমিয়াম', 'আরবিয়াম', 'থুলিয়াম', 'ইটারবিয়াম',
  'লুটেশিয়াম', 'হাফনিয়াম', 'ট্যান্টালাম', 'টাংস্টেন', 'রেনিয়াম', 'অসমিয়াম', 'ইরিডিয়াম', 'প্ল্যাটিনাম', 'গোল্ড', 'মার্কারি',
  'থ্যালিয়াম', 'লেড', 'বিসমাথ', 'পোলোনিয়াম', 'অ্যাস্টাটিন', 'রেডন', 'ফ্রান্সিয়াম', 'রেডিয়াম', 'অ্যাক্টিনিয়াম', 'থোরিয়াম',
  'প্রোট্যাক্টিনিয়াম', 'ইউরেনিয়াম', 'নেপচুনিয়াম', 'প্লুটোনিয়াম', 'অ্যামেরিসিয়াম', 'কিউরিয়াম', 'বার্কেলিয়াম', 'ক্যালিফোর্নিয়াম', 'আইনস্টাইনিয়াম', 'ফার্মিয়াম',
  'মেন্ডেলেভিয়াম', 'নোবেলিয়াম', 'লরেন্সিয়াম', 'রাদারফোর্ডিয়াম', 'ডুবনিয়াম', 'সিবোর্গিয়াম', 'বোহরিয়াম', 'হাসিয়াম', 'মেইটনেরিয়াম', 'ডার্মস্টেডটিয়াম',
  'রন্টজেনিয়াম', 'কোপারনিসিয়াম', 'নিহোনিয়াম', 'ফ্লেরোভিয়াম', 'মস্কোভিয়াম', 'লিভারমোরিয়াম', 'টেনেসিন', 'ওগানেসন',
];

export const MAX_Z = SYMBOLS.length; // 118

export interface ElementId {
  z: number;
  symbol: string;
  name: string;
}

/** { z, symbol, name } for an atomic number (1-based). Throws for Z outside 1–118. */
export function element(z: number): ElementId {
  const symbol = SYMBOLS[z - 1];
  const name = NAMES_BN[z - 1];
  if (!Number.isInteger(z) || symbol === undefined || name === undefined) throw new RangeError(`No element with Z = ${z}`);
  return { z, symbol, name };
}

/** Atomic number for a symbol, e.g. "Fe" → 26. Returns 0 for an unknown symbol. */
export const zOf = (symbol: string): number => SYMBOLS.indexOf(symbol) + 1;

/** All symbols in order of Z. */
export const ALL_SYMBOLS: readonly string[] = SYMBOLS;
