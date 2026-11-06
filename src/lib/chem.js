// Shared chemistry data + logic used by every tool.
// One source of truth for element names, the Aufbau order, exceptions and
// the block → group rules, so all tools always agree with each other.

// ── Elements ────────────────────────────────────────────────────────────────
const SYMBOLS = (
  'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr ' +
  'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu ' +
  'Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr ' +
  'Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'
).split(' ');

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

/** { z, symbol, name } for an atomic number (1-based). */
export const element = (z) => ({ z, symbol: SYMBOLS[z - 1], name: NAMES_BN[z - 1] });
/** Atomic number for a symbol, e.g. 'Fe' → 26. */
export const zOf = (symbol) => SYMBOLS.indexOf(symbol) + 1;

// ── Numbers ─────────────────────────────────────────────────────────────────
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** Latin digits → Bangla digits: 26 → ২৬ */
export const bn = (v) => String(v).replace(/\d/g, (d) => BN_DIGITS[d]);
/** Parses '26', '২৬' or ' 26 ' → 26. Returns NaN for anything else. */
export function parseNumber(text) {
  const latin = String(text).trim().replace(/[০-৯]/g, (ch) => BN_DIGITS.indexOf(ch));
  return /^\d{1,3}$/.test(latin) ? Number(latin) : NaN;
}

// ── Orbitals ────────────────────────────────────────────────────────────────
const CAPACITY = { s: 2, p: 6, d: 10, f: 14 };
const L_INDEX = { s: 0, p: 1, d: 2, f: 3 };

/** Orbitals in Aufbau (filling) order. 8s is never filled but completes the shortcut pattern. */
export const AUFBAU = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p', '8s']
  .map((id) => ({ id, n: Number(id[0]), l: id[1], cap: CAPACITY[id[1]], nl: Number(id[0]) + L_INDEX[id[1]] }));
export const ORBITAL = Object.fromEntries(AUFBAU.map((o) => [o.id, o]));

/** Fills orbitals strictly by the Aufbau order: [{ id, n, l, cap, e }, …] */
export function aufbauFill(z) {
  const out = [];
  let left = z;
  for (const o of AUFBAU) {
    if (left <= 0) break;
    const e = Math.min(left, o.cap);
    out.push({ ...o, e });
    left -= e;
  }
  return out;
}

// Ground-state exceptions: electrons that move after the normal Aufbau filling.
// Notes use caret notation (3d^5) so the UI can render real superscripts.
export const EXCEPTIONS = {
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

/** Actual ground-state occupancy: { '1s': 2, '2s': 2, … } (exceptions applied). */
export function groundState(z) {
  const occ = Object.fromEntries(aufbauFill(z).map((o) => [o.id, o.e]));
  for (const [from, to, k] of EXCEPTIONS[z]?.moves ?? []) {
    occ[from] -= k;
    occ[to] = (occ[to] ?? 0) + k;
  }
  return occ;
}

/** Occupied orbitals as tokens [{ id, n, l, e }]. order: 'aufbau' (filling) or 'shell' (1s 2s 2p 3s 3p 3d 4s …). */
export function orbitalList(occ, order = 'shell') {
  const list = AUFBAU.filter((o) => occ[o.id] > 0).map((o) => ({ ...o, e: occ[o.id] }));
  if (order === 'shell') list.sort((a, b) => a.n - b.n || L_INDEX[a.l] - L_INDEX[b.l]);
  return list;
}

// ── Period, block and group ─────────────────────────────────────────────────
/**
 * Everything the calculator and the blocks tool need for one element.
 * Rules follow the SSC textbook (s: ns, p: 10 + ns + np, d: (n−1)d + ns, f: group 3).
 * Valid for Z = 1–36 plus the f-block examples used in the tools.
 */
export function analyze(z) {
  const filled = aufbauFill(z);
  const last = filled[filled.length - 1]; // orbital that receives the last electron
  const occ = groundState(z);
  const period = Math.max(...filled.map((o) => o.n));
  const block = last.l;
  const sId = `${period}s`;
  const s = occ[sId] ?? 0;

  let group, valence, calc;
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
    calc = { kind: 'p', parts: [[sId, s], [pId, p]] };
  } else if (block === 'd') {
    const dId = `${period - 1}d`;
    const d = occ[dId] ?? 0;
    group = d + s;
    valence = [dId, sId];
    calc = { kind: 'd', parts: [[dId, d], [sId, s]] };
  } else {
    group = 3;
    valence = [last.id];
    calc = { kind: 'f' };
  }

  return {
    ...element(z),
    occ,
    period,
    block,
    group,
    valence,
    calc,
    lastId: last.id,
    exception: EXCEPTIONS[z] ?? null,
  };
}

export const BLOCK_RULES = {
  s: 'গ্রুপ নম্বর = সর্বশেষ শক্তিস্তরের s-অরবিটালের ইলেকট্রন সংখ্যা',
  p: 'গ্রুপ নম্বর = ১০ + সর্বশেষ শক্তিস্তরের (s + p) অরবিটালের ইলেকট্রন সংখ্যা',
  d: 'গ্রুপ নম্বর = (n−১)d অরবিটালের ইলেকট্রন + ns অরবিটালের ইলেকট্রন',
  f: 'ল্যান্থানাইড ও অ্যাক্টিনাইড সিরিজের সকল f-ব্লক মৌল গ্রুপ ৩-এ অবস্থিত',
  he: 'হিলিয়ামের বিন্যাস 1s^2 (s-ব্লক), তবে এর শক্তিস্তর পূর্ণ ও এটি নিষ্ক্রিয় গ্যাস, তাই একে গ্রুপ ১৮-তে রাখা হয়',
};
