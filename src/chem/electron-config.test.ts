import { describe, expect, it } from 'vitest';
import {
  AUFBAU,
  EXCEPTIONS,
  SHORTCUT_ROWS,
  analyze,
  aufbauFill,
  configText,
  electronCount,
  groundState,
  orbitalList,
  shellCounts,
} from './electron-config';
import { MAX_Z, element, zOf } from './elements';

// Golden values: the modern periodic table (IUPAC 1–18 numbering, as used by the SSC book).
const PERIOD_GROUP_1_TO_36: [symbol: string, period: number, group: number][] = [
  ['H', 1, 1], ['He', 1, 18],
  ['Li', 2, 1], ['Be', 2, 2], ['B', 2, 13], ['C', 2, 14], ['N', 2, 15], ['O', 2, 16], ['F', 2, 17], ['Ne', 2, 18],
  ['Na', 3, 1], ['Mg', 3, 2], ['Al', 3, 13], ['Si', 3, 14], ['P', 3, 15], ['S', 3, 16], ['Cl', 3, 17], ['Ar', 3, 18],
  ['K', 4, 1], ['Ca', 4, 2], ['Sc', 4, 3], ['Ti', 4, 4], ['V', 4, 5], ['Cr', 4, 6], ['Mn', 4, 7], ['Fe', 4, 8],
  ['Co', 4, 9], ['Ni', 4, 10], ['Cu', 4, 11], ['Zn', 4, 12], ['Ga', 4, 13], ['Ge', 4, 14], ['As', 4, 15],
  ['Se', 4, 16], ['Br', 4, 17], ['Kr', 4, 18],
]; // prettier-ignore

describe('period and group (Z = 1–36)', () => {
  it.each(PERIOD_GROUP_1_TO_36)('%s is in period %i, group %i', (symbol, period, group) => {
    const a = analyze(zOf(symbol));
    expect(a.symbol).toBe(symbol);
    expect(a.period).toBe(period);
    expect(a.group).toBe(group);
  });

  it('covers every element from 1 to 36 exactly once', () => {
    expect(PERIOD_GROUP_1_TO_36.map(([s]) => zOf(s))).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
  });

  it('assigns the right block', () => {
    expect(analyze(11).block).toBe('s');
    expect(analyze(17).block).toBe('p');
    expect(analyze(26).block).toBe('d');
    expect(analyze(58).block).toBe('f');
    expect(analyze(2).calc.kind).toBe('he');
  });

  it('puts f-block examples in group 3', () => {
    expect(analyze(zOf('Ce')).group).toBe(3);
    expect(analyze(zOf('U')).group).toBe(3);
  });
});

// Real ground-state configurations of every exception (valence part after the noble-gas core).
const EXCEPTION_CONFIGS: Record<number, Record<string, number>> = {
  24: { '3d': 5, '4s': 1 }, // Cr
  29: { '3d': 10, '4s': 1 }, // Cu
  41: { '4d': 4, '5s': 1 }, // Nb
  42: { '4d': 5, '5s': 1 }, // Mo
  44: { '4d': 7, '5s': 1 }, // Ru
  45: { '4d': 8, '5s': 1 }, // Rh
  46: { '4d': 10, '5s': 0 }, // Pd
  47: { '4d': 10, '5s': 1 }, // Ag
  57: { '4f': 0, '5d': 1, '6s': 2 }, // La
  58: { '4f': 1, '5d': 1, '6s': 2 }, // Ce
  64: { '4f': 7, '5d': 1, '6s': 2 }, // Gd
  78: { '4f': 14, '5d': 9, '6s': 1 }, // Pt
  79: { '4f': 14, '5d': 10, '6s': 1 }, // Au
  89: { '5f': 0, '6d': 1, '7s': 2 }, // Ac
  90: { '5f': 0, '6d': 2, '7s': 2 }, // Th
  91: { '5f': 2, '6d': 1, '7s': 2 }, // Pa
  92: { '5f': 3, '6d': 1, '7s': 2 }, // U
  93: { '5f': 4, '6d': 1, '7s': 2 }, // Np
  96: { '5f': 7, '6d': 1, '7s': 2 }, // Cm
  103: { '5f': 14, '6d': 0, '7s': 2, '7p': 1 }, // Lr
};

describe('exception configurations', () => {
  it('has a golden configuration for every exception in the engine', () => {
    expect(Object.keys(EXCEPTIONS).sort()).toEqual(Object.keys(EXCEPTION_CONFIGS).sort());
  });

  it.each(Object.entries(EXCEPTION_CONFIGS))('Z = %s matches the real ground state', (z, expected) => {
    const occ = groundState(Number(z));
    for (const [orbital, e] of Object.entries(expected)) expect(occ[orbital] ?? 0, orbital).toBe(e);
  });

  it('writes Cr and Cu correctly', () => {
    expect(configText(24)).toBe('1s2 2s2 2p6 3s2 3p6 3d5 4s1');
    expect(configText(29)).toBe('1s2 2s2 2p6 3s2 3p6 3d10 4s1');
    expect(configText(26)).toBe('1s2 2s2 2p6 3s2 3p6 3d6 4s2');
  });

  it('never leaves a negative or over-full orbital', () => {
    for (let z = 1; z <= MAX_Z; z++) {
      for (const o of orbitalList(groundState(z), 'aufbau')) {
        expect(o.e).toBeGreaterThan(0);
        expect(o.e).toBeLessThanOrEqual(o.cap);
      }
    }
  });
});

describe('electron count', () => {
  it('equals Z for every element 1–118', () => {
    for (let z = 1; z <= MAX_Z; z++) {
      expect(electronCount(groundState(z)), `Z = ${z}`).toBe(z);
      expect(aufbauFill(z).reduce((s, o) => s + o.e, 0)).toBe(z);
    }
  });

  it('gives Bohr shell counts', () => {
    expect(shellCounts(11)).toEqual([2, 8, 1]);
    expect(shellCounts(20)).toEqual([2, 8, 8, 2]);
    expect(shellCounts(26)).toEqual([2, 8, 14, 2]);
  });
});

describe('Aufbau order and the shortcut', () => {
  it('reading the shortcut grid row by row gives the Aufbau order', () => {
    expect(SHORTCUT_ROWS.flat(2)).toEqual(AUFBAU.map((o) => o.id));
  });

  it('follows the (n + l) rule', () => {
    for (let i = 1; i < AUFBAU.length; i++) {
      const a = AUFBAU[i - 1]!;
      const b = AUFBAU[i]!;
      expect(a.nl < b.nl || (a.nl === b.nl && a.n < b.n)).toBe(true);
    }
  });
});

describe('elements', () => {
  it('has 118 elements with Bangla names', () => {
    expect(MAX_Z).toBe(118);
    expect(element(26)).toEqual({ z: 26, symbol: 'Fe', name: 'আয়রন' });
    expect(element(118).symbol).toBe('Og');
    expect(() => element(0)).toThrow();
  });
});
