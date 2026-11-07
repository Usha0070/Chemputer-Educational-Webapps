// Chapter 1 (রসায়নের ধারণা): a scientific investigation run as a fair test, and laboratory safety (hazard symbols).
import { makeRandom } from './random';

// ── Scientific investigation: does hotter water dissolve sugar faster? ──────

export type SugarForm = 'granules' | 'cube';
export interface Trial {
  /** water temperature, °C (the variable under test) */
  temp: number;
  stirred: boolean;
  form: SugarForm;
  /** sugar, g */
  sugar: number;
  /** water, mL */
  water: number;
}
export type Variable = keyof Trial;

/** The controlled variables' standard settings. */
export const STANDARD: Omit<Trial, 'temp'> = { stirred: true, form: 'granules', sugar: 5, water: 100 };

/**
 * Model dissolving time (s). 5 g granulated sugar stirred into 100 mL water takes about a minute at 20 °C, and every
 * 20 °C rise roughly halves it. Not stirring makes it about 3× slower, a sugar cube about 2.5× slower; more sugar takes
 * proportionally longer and more water a little less.
 */
export function dissolveTime(t: Trial): number {
  const temperature = 2 ** (-(t.temp - 20) / 20);
  const stir = t.stirred ? 1 : 3;
  const form = t.form === 'cube' ? 2.5 : 1;
  return 60 * temperature * stir * form * (t.sugar / 5) * Math.sqrt(100 / t.water);
}

/** A stopwatch reading: the model time with the small scatter of a real measurement (±4 %), repeatable per trial number. */
export function measuredTime(t: Trial, trialNumber: number): number {
  const r = makeRandom(1000 + trialNumber)();
  return Math.round(dissolveTime(t) * (1 + (r - 0.5) * 0.08));
}

/** Variables other than `independent` that are not the same in every trial (empty = a fair test). */
export function uncontrolled(trials: Trial[], independent: Variable = 'temp'): Variable[] {
  if (trials.length < 2) return [];
  const keys = (Object.keys(trials[0]!) as Variable[]).filter((k) => k !== independent);
  return keys.filter((k) => trials.some((t) => t[k] !== trials[0]![k]));
}

export type Trend = 'not-enough-data' | 'unfair' | 'faster-when-hotter' | 'slower-when-hotter' | 'no-clear-trend';

/** What the recorded results show: at least three fair trials at different temperatures are needed for a conclusion. */
export function trend(results: { trial: Trial; time: number }[]): Trend {
  const temps = new Set(results.map((r) => r.trial.temp));
  if (temps.size < 3) return 'not-enough-data';
  if (uncontrolled(results.map((r) => r.trial)).length > 0) return 'unfair';
  const sorted = [...results].sort((a, b) => a.trial.temp - b.trial.temp);
  let down = 0;
  let up = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.trial.temp === sorted[i - 1]!.trial.temp) continue;
    if (sorted[i]!.time < sorted[i - 1]!.time) down++;
    else if (sorted[i]!.time > sorted[i - 1]!.time) up++;
  }
  if (down > 0 && up === 0) return 'faster-when-hotter';
  if (up > 0 && down === 0) return 'slower-when-hotter';
  return 'no-clear-trend';
}

export type Hypothesis = 'faster' | 'slower' | 'same';
export const HYPOTHESES: { id: Hypothesis; textBn: string }[] = [
  { id: 'faster', textBn: 'পানির তাপমাত্রা বাড়লে চিনি দ্রুত গলবে' },
  { id: 'slower', textBn: 'পানির তাপমাত্রা বাড়লে চিনি ধীরে গলবে' },
  { id: 'same', textBn: 'তাপমাত্রার সাথে গলার সময়ের কোনো সম্পর্ক নেই' },
];

/** Does the evidence support the hypothesis? null while there is no fair conclusion yet. */
export function supports(h: Hypothesis, t: Trend): boolean | null {
  if (t === 'not-enough-data' || t === 'unfair') return null;
  if (t === 'faster-when-hotter') return h === 'faster';
  if (t === 'slower-when-hotter') return h === 'slower';
  return h === 'same';
}

// ── Laboratory safety: hazard pictograms (GHS) ─────────────────────────────

export type HazardId = 'explosive' | 'flammable' | 'oxidising' | 'gas' | 'corrosive' | 'toxic' | 'harmful' | 'health' | 'environment';

export interface Hazard {
  id: HazardId;
  nameBn: string;
  nameEn: string;
  meaning: string;
  handling: string;
}

export const HAZARDS: Hazard[] = [
  {
    id: 'explosive',
    nameBn: 'বিস্ফোরক',
    nameEn: 'Explosive',
    meaning: 'আঘাত, ঘর্ষণ, আগুন বা তাপে বিস্ফোরিত হতে পারে।',
    handling: 'ঝাঁকুনি, ঘষা ও আগুন থেকে দূরে রাখো; অল্প পরিমাণে, শিক্ষকের তত্ত্বাবধানে ব্যবহার করো।',
  },
  {
    id: 'flammable',
    nameBn: 'দাহ্য',
    nameEn: 'Flammable',
    meaning: 'সহজে আগুন ধরে যায়; বাষ্পও জ্বলে উঠতে পারে।',
    handling: 'শিখা, স্পার্ক ও গরম জিনিস থেকে দূরে রাখো; বোতলের মুখ বন্ধ রাখো।',
  },
  {
    id: 'oxidising',
    nameBn: 'জারক',
    nameEn: 'Oxidising',
    meaning: 'নিজে না জ্বললেও অক্সিজেন জুগিয়ে অন্য পদার্থের আগুন বাড়িয়ে দেয়।',
    handling: 'দাহ্য পদার্থ, কাগজ ও কাঠের গুঁড়া থেকে আলাদা রাখো।',
  },
  {
    id: 'gas',
    nameBn: 'চাপযুক্ত গ্যাস',
    nameEn: 'Gas under pressure',
    meaning: 'সিলিন্ডারে উচ্চ চাপে গ্যাস ভরা; গরম হলে ফেটে যেতে পারে।',
    handling: 'সিলিন্ডার খাড়া করে বেঁধে রাখো, রোদ ও তাপ থেকে দূরে রাখো।',
  },
  {
    id: 'corrosive',
    nameBn: 'ক্ষয়কারী',
    nameEn: 'Corrosive',
    meaning: 'চামড়া ও চোখ পুড়িয়ে দেয়, ধাতু ক্ষয় করে।',
    handling: 'গ্লাভস ও চশমা পরো; গায়ে লাগলে সাথে সাথে প্রচুর পানি দিয়ে ধুয়ে ফেলো।',
  },
  {
    id: 'toxic',
    nameBn: 'বিষাক্ত',
    nameEn: 'Toxic',
    meaning: 'অল্প পরিমাণ খেলে, শ্বাসে নিলে বা চামড়ায় লাগলেও মারাত্মক ক্ষতি বা মৃত্যু হতে পারে।',
    handling: 'কখনো মুখে বা নাকের কাছে নেবে না; কাজ শেষে হাত ধোবে; তালাবদ্ধ জায়গায় রাখা হয়।',
  },
  {
    id: 'harmful',
    nameBn: 'ক্ষতিকর / উত্তেজক',
    nameEn: 'Harmful / irritant',
    meaning: 'চামড়া, চোখ বা শ্বাসনালিতে জ্বালা ধরায়; বেশি হলে অসুস্থ করে।',
    handling: 'গায়ে লাগানো ও শ্বাসে নেওয়া এড়াও; বাতাস চলাচলের জায়গায় কাজ করো।',
  },
  {
    id: 'health',
    nameBn: 'স্বাস্থ্যঝুঁকি',
    nameEn: 'Serious health hazard',
    meaning: 'দীর্ঘদিনে ক্যান্সার, শ্বাসকষ্ট বা অঙ্গের ক্ষতি করতে পারে।',
    handling: 'যতটা সম্ভব কম সংস্পর্শে আসো; মাস্ক ও গ্লাভস ব্যবহার করো।',
  },
  {
    id: 'environment',
    nameBn: 'পরিবেশের জন্য ক্ষতিকর',
    nameEn: 'Hazardous to the environment',
    meaning: 'পানি ও মাটিতে গেলে মাছ ও অন্য জীবের ক্ষতি করে।',
    handling: 'ড্রেনে বা মাটিতে ফেলবে না; নির্দিষ্ট পাত্রে জমা দাও।',
  },
];

export interface LabChemical {
  id: string;
  nameBn: string;
  formula?: string;
  hazards: HazardId[];
  note: string;
}

/** Common school-lab and household chemicals with their main hazard symbols. */
export const LAB_CHEMICALS: LabChemical[] = [
  {
    id: 'h2so4',
    nameBn: 'গাঢ় সালফিউরিক এসিড',
    formula: 'H2SO4',
    hazards: ['corrosive'],
    note: 'চামড়া পুড়িয়ে দেয়। পাতলা করতে পানিতে এসিড ধীরে ধীরে ঢালো, এসিডে পানি নয়।',
  },
  { id: 'naoh', nameBn: 'কস্টিক সোডা', formula: 'NaOH', hazards: ['corrosive'], note: 'ক্ষার হলেও এসিডের মতোই চামড়া ও চোখ পোড়ায়।' },
  {
    id: 'ethanol',
    nameBn: 'ইথানল (স্পিরিট)',
    formula: 'C2H5OH',
    hazards: ['flammable', 'harmful'],
    note: 'স্পিরিট ল্যাম্পের জ্বালানি; বাষ্পও জ্বলে ওঠে।',
  },
  { id: 'petrol', nameBn: 'পেট্রোল', hazards: ['flammable', 'health', 'environment'], note: 'খুব দাহ্য; বাষ্প শ্বাসে নেওয়া ক্ষতিকর।' },
  {
    id: 'lpg',
    nameBn: 'এলপি গ্যাস সিলিন্ডার',
    hazards: ['gas', 'flammable'],
    note: 'চাপে তরল করা দাহ্য গ্যাস; লিক হলে আগুন ও বিস্ফোরণের ঝুঁকি।',
  },
  {
    id: 'kmno4',
    nameBn: 'পটাশিয়াম পারম্যাঙ্গানেট',
    formula: 'KMnO4',
    hazards: ['oxidising', 'harmful', 'environment'],
    note: 'তীব্র জারক; দাহ্য পদার্থের সংস্পর্শে আগুন বাড়ায়।',
  },
  {
    id: 'h2o2',
    nameBn: 'ঘন হাইড্রোজেন পারঅক্সাইড',
    formula: 'H2O2',
    hazards: ['oxidising', 'corrosive'],
    note: 'ঘন দ্রবণ চামড়া সাদা করে পুড়িয়ে দেয় এবং আগুন বাড়ায়।',
  },
  {
    id: 'mercury',
    nameBn: 'পারদ',
    formula: 'Hg',
    hazards: ['toxic', 'health', 'environment'],
    note: 'বাষ্প অত্যন্ত বিষাক্ত; ভাঙা থার্মোমিটারের পারদ খালি হাতে ধরবে না।',
  },
  {
    id: 'bleach',
    nameBn: 'ব্লিচ',
    formula: 'NaOCl',
    hazards: ['corrosive', 'environment'],
    note: 'এসিডের সাথে মেশালে বিষাক্ত ক্লোরিন গ্যাস বের হয়।',
  },
  {
    id: 'cuso4',
    nameBn: 'কপার সালফেট (তুঁতে)',
    formula: 'CuSO4',
    hazards: ['harmful', 'environment'],
    note: 'গিলে ফেলা ক্ষতিকর; পানিতে মাছের জন্য বিষাক্ত।',
  },
  { id: 'gunpowder', nameBn: 'বারুদ (আতশবাজির মশলা)', hazards: ['explosive'], note: 'ঘষা বা আগুনে বিস্ফোরিত হয়।' },
];

export const hazardById = (id: HazardId): Hazard => HAZARDS.find((h) => h.id === id)!;
/** Is this symbol one of the chemical's hazard symbols? */
export const hasHazard = (chemical: LabChemical, id: HazardId): boolean => chemical.hazards.includes(id);

export interface LabRule {
  text: string;
  safe: boolean;
  why: string;
}

export const LAB_RULES: LabRule[] = [
  { text: 'ল্যাবে কাজের সময় সুরক্ষা চশমা পরা', safe: true, why: 'ছিটকে আসা রাসায়নিক বা কাচ থেকে চোখ বাঁচায়।' },
  {
    text: 'এসিড পাতলা করতে এসিডের মধ্যে পানি ঢালা',
    safe: false,
    why: 'প্রচণ্ড তাপে এসিড ছিটকে আসে; সবসময় পানিতে এসিড ধীরে ধীরে ঢালতে হয়।',
  },
  {
    text: 'গন্ধ নিতে হাত দিয়ে বাষ্প নাকের দিকে আলতো করে টেনে আনা',
    safe: true,
    why: 'সরাসরি নাক লাগিয়ে শুঁকলে বেশি বাষ্প ঢুকে ক্ষতি করতে পারে।',
  },
  { text: 'ল্যাবের টেবিলে বসে টিফিন খাওয়া', safe: false, why: 'খাবারে রাসায়নিক লেগে পেটে যেতে পারে।' },
  { text: 'টেস্টটিউব গরম করার সময় মুখ নিজের বা অন্যের দিকে রাখা', safe: false, why: 'হঠাৎ ফুটে উঠে গরম তরল ছিটকে আসতে পারে।' },
  {
    text: 'কিছু পড়ে গেলে বা ভেঙে গেলে সাথে সাথে শিক্ষককে জানানো',
    safe: true,
    why: 'কোন রাসায়নিক কীভাবে পরিষ্কার করতে হয়, শিক্ষক জানেন।',
  },
  { text: 'স্পিরিট বা পেট্রোল আগুন থেকে দূরে রাখা', safe: true, why: 'এরা দাহ্য, বাষ্পও জ্বলে ওঠে।' },
  { text: 'বেঁচে যাওয়া রাসায়নিক আবার মূল বোতলে ঢেলে রাখা', safe: false, why: 'মূল বোতলের পুরো রাসায়নিক দূষিত হয়ে যায়।' },
];
