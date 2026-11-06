import { describe, expect, it } from 'vitest';
import { MOST_ABUNDANT_A, STABLE_ISOTOPES, analyzeAtom, areIsotopes, bohrShells, chargeLabel, commonIonCharge, typicalAtom } from './atom';
import {
  binAngle,
  closestApproach,
  collapseRadius,
  deflectionAngle,
  impactParameterFor,
  levelEnergy,
  photonEnergy,
  photonWavelength,
  region,
  thomsonMaxDeflection,
} from './atomic-models';
import { ALL_ELEMENTS, atomicMass, category, elementInfo, position, stateAtRoomTemp } from './element-data';
import { analyze } from './electron-config';

describe('build an atom', () => {
  it('identifies a neutral sodium-23 atom', () => {
    const r = analyzeAtom({ protons: 11, neutrons: 12, electrons: 11 });
    expect(r.element?.symbol).toBe('Na');
    expect(r.massNumber).toBe(23);
    expect(r.charge).toBe(0);
    expect(r.kind).toBe('neutral');
    expect(r.stability).toBe('stable');
    expect(r.shells).toEqual([2, 8, 1]);
  });

  it('identifies ions', () => {
    const cl = analyzeAtom({ protons: 17, neutrons: 18, electrons: 18 });
    expect(cl.kind).toBe('anion');
    expect(cl.charge).toBe(-1);
    expect(cl.notation).toEqual({ mass: 35, z: 17, symbol: 'Cl', charge: '−' });
    expect(cl.shells).toEqual([2, 8, 8]);
    const mg = analyzeAtom({ protons: 12, neutrons: 12, electrons: 10 });
    expect(mg.kind).toBe('cation');
    expect(mg.notation?.charge).toBe('2+');
    const o = analyzeAtom({ protons: 8, neutrons: 8, electrons: 10 });
    expect(o.notation?.charge).toBe('2−');
  });

  it('knows stable and radioactive isotopes', () => {
    expect(analyzeAtom({ protons: 6, neutrons: 6, electrons: 6 }).stability).toBe('stable');
    const c14 = analyzeAtom({ protons: 6, neutrons: 8, electrons: 6 });
    expect(c14.stability).toBe('radioactive');
    expect(c14.note).toContain('কার্বন-১৪');
    expect(analyzeAtom({ protons: 1, neutrons: 0, electrons: 1 }).stability).toBe('stable');
    expect(analyzeAtom({ protons: 1, neutrons: 2, electrons: 1 }).stability).toBe('radioactive');
    expect(areIsotopes({ protons: 17, neutrons: 18, electrons: 17 }, { protons: 17, neutrons: 20, electrons: 17 })).toBe(true);
    expect(areIsotopes({ protons: 17, neutrons: 18, electrons: 17 }, { protons: 18, neutrons: 18, electrons: 18 })).toBe(false);
  });

  it('uses a stable isotope as the typical atom of every element 1–20', () => {
    for (let z = 1; z <= 20; z++) {
      expect(STABLE_ISOTOPES[z], `Z = ${z}`).toContain(MOST_ABUNDANT_A[z - 1]);
      expect(analyzeAtom(typicalAtom(z)).kind).toBe('neutral');
    }
    expect(typicalAtom(17)).toEqual({ protons: 17, neutrons: 18, electrons: 17 });
  });

  it('handles particles without protons', () => {
    expect(analyzeAtom({ protons: 0, neutrons: 0, electrons: 0 }).kind).toBe('empty');
    expect(analyzeAtom({ protons: 0, neutrons: 2, electrons: 0 }).element).toBeNull();
  });

  it('fills Bohr shells 2, 8, 8, 2', () => {
    expect(bohrShells(20)).toEqual([2, 8, 8, 2]);
    expect(bohrShells(2)).toEqual([2]);
    expect(bohrShells(0)).toEqual([]);
  });

  it('labels charges and common ions', () => {
    expect(chargeLabel(0)).toBe('');
    expect(chargeLabel(1)).toBe('+');
    expect(chargeLabel(-3)).toBe('3−');
    expect([11, 12, 13, 15, 16, 17, 18, 6].map(commonIonCharge)).toEqual([1, 2, 3, -3, -2, -1, 0, 0]);
  });
});

describe('Rutherford scattering', () => {
  it('computes the closest approach for 5 MeV α on gold (≈ 45 fm)', () => {
    expect(closestApproach(79, 5)).toBeCloseTo(45.5, 1);
  });

  it('bounces head-on hits straight back and barely deflects distant ones', () => {
    const d = 45;
    expect(deflectionAngle(0, d)).toBe(180);
    expect(deflectionAngle(d / 2, d)).toBeCloseTo(90, 5);
    expect(deflectionAngle(1000 * d, d)).toBeLessThan(0.1);
    for (let b = 1; b < 200; b += 7) expect(deflectionAngle(b, d)).toBeGreaterThan(deflectionAngle(b + 7, d));
    expect(deflectionAngle(impactParameterFor(30, d), d)).toBeCloseTo(30, 6);
  });

  it('shows why the Thomson model fails: its maximum deflection is a tiny fraction of a degree', () => {
    expect(thomsonMaxDeflection(79, 5)).toBeLessThan(0.05);
  });

  it('bins detector angles', () => {
    expect([0.2, 4.9, 10, 60, 150].map(binAngle)).toEqual(['straight', 'straight', 'small', 'large', 'back']);
  });
});

describe('Bohr hydrogen atom', () => {
  it('has E₁ = −13.6 eV and E∞ → 0', () => {
    expect(levelEnergy(1)).toBeCloseTo(-13.6, 6);
    expect(levelEnergy(2)).toBeCloseTo(-3.4, 6);
    expect(levelEnergy(100)).toBeGreaterThan(-0.01);
  });

  it('gives the Balmer red line (3 → 2) at ≈ 656 nm and Lyman α (2 → 1) in the UV', () => {
    expect(photonWavelength(3, 2)).toBeCloseTo(656, -1);
    expect(Math.abs(photonWavelength(3, 2) - 656.3)).toBeLessThan(1.5);
    expect(Math.abs(photonWavelength(4, 2) - 486.1)).toBeLessThan(1.5);
    expect(Math.abs(photonWavelength(2, 1) - 121.6)).toBeLessThan(0.5);
    expect(region(photonWavelength(2, 1))).toBe('uv');
    expect(region(photonWavelength(3, 2))).toBe('visible');
    expect(region(photonWavelength(4, 3))).toBe('ir');
    expect(photonEnergy(3, 2)).toBeCloseTo(1.89, 2);
  });

  it('shrinks the classical orbit to zero at the end of the collapse', () => {
    expect(collapseRadius(0)).toBe(1);
    expect(collapseRadius(1)).toBe(0);
    expect(collapseRadius(0.5)).toBeGreaterThan(0.5);
  });
});

describe('element data (118)', () => {
  it('has every element with a name and mass', () => {
    expect(ALL_ELEMENTS).toHaveLength(118);
    for (const e of ALL_ELEMENTS) {
      expect(e.nameEn.length).toBeGreaterThan(2);
      expect(e.mass).toBeGreaterThan(0);
    }
    expect(elementInfo(118).nameEn).toBe('Oganesson');
  });

  it('uses IUPAC standard atomic weights', () => {
    expect(atomicMass('H')).toBe(1.008);
    expect(atomicMass('C')).toBe(12.011);
    expect(atomicMass('Cl')).toBe(35.45);
    expect(atomicMass('Fe')).toBe(55.845);
    expect(elementInfo(43).massIsApprox).toBe(true);
    expect(atomicMass('Cl', 'ssc')).toBe(35.5);
    expect(atomicMass('Na', 'ssc')).toBe(23);
  });

  it('places every element in a unique cell and matches the engine for Z = 1–36', () => {
    const cells = new Set(ALL_ELEMENTS.map((e) => `${e.position.row}-${e.position.col}`));
    expect(cells.size).toBe(118);
    for (let z = 1; z <= 36; z++) {
      const p = position(z);
      const a = analyze(z);
      expect([p.period, p.group], `Z = ${z}`).toEqual([a.period, a.group]);
    }
    expect(position(79)).toMatchObject({ period: 6, group: 11 });
    expect(position(57)).toMatchObject({ period: 6, group: 3, row: 9, col: 3 });
    expect(position(103)).toMatchObject({ period: 7, group: 3, row: 10, col: 17 });
    expect(position(72)).toMatchObject({ period: 6, group: 4 });
    expect(position(118)).toMatchObject({ period: 7, group: 18 });
  });

  it('classifies categories and states', () => {
    expect(category(11)).toBe('alkali');
    expect(category(17)).toBe('halogen');
    expect(category(26)).toBe('transition');
    expect(category(14)).toBe('metalloid');
    expect(category(60)).toBe('lanthanide');
    expect(ALL_ELEMENTS.filter((e) => e.category === 'noble-gas')).toHaveLength(7);
    expect(ALL_ELEMENTS.filter((e) => e.state === 'liquid').map((e) => e.symbol)).toEqual(['Br', 'Hg']);
    expect(ALL_ELEMENTS.filter((e) => e.state === 'gas')).toHaveLength(11);
    expect(stateAtRoomTemp(26)).toBe('solid');
  });

  it('has F as the most electronegative element and He the highest first ionisation energy', () => {
    const maxEn = ALL_ELEMENTS.reduce((a, b) => ((b.en ?? 0) > (a.en ?? 0) ? b : a));
    expect(maxEn.symbol).toBe('F');
    const maxIe = ALL_ELEMENTS.reduce((a, b) => ((b.ie1 ?? 0) > (a.ie1 ?? 0) ? b : a));
    expect(maxIe.symbol).toBe('He');
  });
});

describe('noble-gas core notation', () => {
  it('writes short configurations', async () => {
    const { coreConfigText } = await import('./electron-config');
    expect(coreConfigText(1)).toBe('1s1');
    expect(coreConfigText(11)).toBe('[Ne] 3s1');
    expect(coreConfigText(26)).toBe('[Ar] 3d6 4s2');
    expect(coreConfigText(29)).toBe('[Ar] 3d10 4s1');
    expect(coreConfigText(36)).toBe('[Ar] 3d10 4s2 4p6');
    expect(coreConfigText(79)).toBe('[Xe] 4f14 5d10 6s1');
    expect(coreConfigText(92)).toBe('[Rn] 5f3 6d1 7s2');
  });
});
