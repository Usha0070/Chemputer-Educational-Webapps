import { describe, expect, it } from 'vitest';
import { formulaToUnicode, tokenizeEquation, tokenizeFormula } from './notation';

describe('formula typography', () => {
  it('subscripts digits after symbols and brackets', () => {
    expect(tokenizeFormula('H2SO4')).toEqual([
      { kind: 'text', value: 'H' },
      { kind: 'sub', value: '2' },
      { kind: 'text', value: 'SO' },
      { kind: 'sub', value: '4' },
    ]);
    expect(formulaToUnicode('Al2(SO4)3')).toBe('Al₂(SO₄)₃');
    expect(formulaToUnicode('[Cu(NH3)4]2')).toBe('[Cu(NH₃)₄]₂');
  });

  it('keeps coefficients and hydrate dots normal', () => {
    expect(formulaToUnicode('2H2O')).toBe('2H₂O');
    expect(formulaToUnicode('CuSO4·5H2O')).toBe('CuSO₄·5H₂O');
    expect(formulaToUnicode('CuSO4*5H2O')).toBe('CuSO₄·5H₂O');
  });

  it('writes charges as superscripts with a real minus sign', () => {
    expect(tokenizeFormula('SO4^2-').at(-1)).toEqual({ kind: 'sup', value: '2−' });
    expect(formulaToUnicode('Fe^3+')).toBe('Fe³⁺');
    expect(formulaToUnicode('e^-')).toBe('e⁻');
  });

  it('recognises state symbols', () => {
    expect(tokenizeFormula('NaCl(aq)').at(-1)).toEqual({ kind: 'state', value: '(aq)' });
    expect(formulaToUnicode('H2O(l)')).toBe('H₂O(l)');
  });
});

describe('equation typography', () => {
  it('splits species, plus signs and arrows', () => {
    expect(tokenizeEquation('2H2 + O2 -> 2H2O')).toEqual([
      { kind: 'species', formula: '2H2' },
      { kind: 'plus' },
      { kind: 'species', formula: 'O2' },
      { kind: 'arrow', arrow: '→' },
      { kind: 'species', formula: '2H2O' },
    ]);
  });

  it('handles reversible arrows and conditions', () => {
    const parts = tokenizeEquation('N2 + 3H2 <=> 2NH3');
    expect(parts.find((p) => p.kind === 'arrow')).toEqual({ kind: 'arrow', arrow: '⇌' });
    const heated = tokenizeEquation('CaCO3 -[Δ]-> CaO + CO2');
    expect(heated[1]).toEqual({ kind: 'arrow', arrow: '→', over: 'Δ' });
    const both = tokenizeEquation('2KClO3 -[Δ][MnO2]-> 2KCl + 3O2');
    expect(both[1]).toEqual({ kind: 'arrow', arrow: '→', over: 'Δ', under: 'MnO2' });
  });

  it('does not split on charges', () => {
    const parts = tokenizeEquation('Na^+ + Cl^- -> NaCl');
    expect(parts.filter((p) => p.kind === 'species')).toHaveLength(3);
  });
});
