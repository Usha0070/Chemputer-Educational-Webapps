// Bangla number formatting and parsing shared by every page and simulation.

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Latin digits → Bangla digits: 26 → "২৬", 3.5 → "৩.৫". */
export const bn = (v: string | number): string => String(v).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);

/** Bangla digits → Latin digits: "২৬" → "26". */
export const toLatinDigits = (text: string): string => text.replace(/[০-৯]/g, (ch) => String(BN_DIGITS.indexOf(ch)));

/** Parses "26", "২৬" or " 26 " → 26 (whole numbers, up to 3 digits). Returns NaN for anything else. */
export function parseNumber(text: string): number {
  const latin = toLatinDigits(String(text).trim());
  return /^\d{1,3}$/.test(latin) ? Number(latin) : NaN;
}

/** Parses a decimal typed with Latin or Bangla digits ("৩৫.৫", "1.5e3"). Returns NaN when invalid. */
export function parseDecimal(text: string): number {
  const latin = toLatinDigits(String(text).trim()).replace(/,/g, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(latin)) return NaN;
  return Number(latin);
}

/** Rounds to `digits` decimals and prints with Bangla digits, trimming trailing zeros: 35.453 → "৩৫.৪৫". */
export function bnFixed(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  const s = value.toFixed(digits).replace(/\.?0+$/, '');
  return bn(s === '-0' ? '0' : s);
}

/** Two-digit Bangla ordinal-style number used for chapter labels: 3 → "০৩". */
export const bnPad = (n: number, width = 2): string => bn(String(n).padStart(width, '0'));
