import { describe, expect, it } from 'vitest';
import { bn, bnFixed, bnPad, parseDecimal, parseNumber, toLatinDigits } from './format';

describe('Bangla digits', () => {
  it('converts both ways', () => {
    expect(bn(26)).toBe('২৬');
    expect(bn('3.5')).toBe('৩.৫');
    expect(toLatinDigits('২৬')).toBe('26');
    expect(bnPad(3)).toBe('০৩');
  });

  it('parses whole numbers typed in either script', () => {
    expect(parseNumber('26')).toBe(26);
    expect(parseNumber(' ২৬ ')).toBe(26);
    expect(parseNumber('2.5')).toBeNaN();
    expect(parseNumber('abc')).toBeNaN();
    expect(parseNumber('')).toBeNaN();
  });

  it('parses decimals', () => {
    expect(parseDecimal('৩৫.৫')).toBe(35.5);
    expect(parseDecimal('6.02e23')).toBe(6.02e23);
    expect(parseDecimal('x')).toBeNaN();
  });

  it('formats fixed decimals', () => {
    expect(bnFixed(35.453, 2)).toBe('৩৫.৪৫');
    expect(bnFixed(2, 2)).toBe('২');
    expect(bnFixed(Number.NaN)).toBe('—');
  });
});
