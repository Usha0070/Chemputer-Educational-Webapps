// Rutherford scattering and the Bohr hydrogen atom.

// ── Rutherford α-scattering ─────────────────────────────────────────────────

/** e²/(4πε₀) in MeV·fm */
export const COULOMB_MEV_FM = 1.44;

/** Distance of closest approach (fm) for a head-on α-particle (charge 2e) of kinetic energy `keMeV` hitting a nucleus of charge Z. */
export function closestApproach(z: number, keMeV: number): number {
  return (COULOMB_MEV_FM * 2 * z) / keMeV;
}

/**
 * Rutherford deflection angle (degrees) for impact parameter b (same length unit as d, the head-on closest approach):
 * tan(θ/2) = d / (2b). b = 0 is a head-on hit and bounces straight back (180°).
 */
export function deflectionAngle(b: number, d: number): number {
  if (b <= 0) return 180;
  return (2 * Math.atan(d / (2 * Math.abs(b))) * 180) / Math.PI;
}

/** Largest impact parameter that still gives a deflection of at least `thetaDeg`. */
export const impactParameterFor = (thetaDeg: number, d: number): number => d / (2 * Math.tan((thetaDeg * Math.PI) / 360));

/**
 * Thomson ("plum pudding") prediction: positive charge spread over the whole atom gives only a tiny push.
 * Maximum deflection ≈ (k·q₁q₂ / (KE · R)) radians, with R the atomic radius. For gold and 5 MeV α it is ≈ 0.02°.
 */
export function thomsonMaxDeflection(z: number, keMeV: number, atomRadiusFm = 1.44e5): number {
  return ((COULOMB_MEV_FM * 2 * z) / (keMeV * atomRadiusFm)) * (180 / Math.PI);
}

export type DetectorBin = 'straight' | 'small' | 'large' | 'back';
/** How the detector groups angles: < 5° (counted as straight through), 5–30°, 30–90°, > 90°. */
export function binAngle(deg: number): DetectorBin {
  if (deg < 5) return 'straight';
  if (deg < 30) return 'small';
  if (deg <= 90) return 'large';
  return 'back';
}

// ── Bohr hydrogen atom ──────────────────────────────────────────────────────

export const RYDBERG_EV = 13.6;
/** hc in eV·nm */
export const HC_EV_NM = 1239.84;
export const BOHR_RADIUS_PM = 52.9;

/** Energy of level n in hydrogen (eV): −13.6 / n² */
export const levelEnergy = (n: number): number => -RYDBERG_EV / (n * n);
/** Orbit radius in pm: 52.9 · n² */
export const orbitRadius = (n: number): number => BOHR_RADIUS_PM * n * n;

/** Photon energy (eV, positive) for a jump between two levels. */
export const photonEnergy = (from: number, to: number): number => Math.abs(levelEnergy(from) - levelEnergy(to));
/** Photon wavelength (nm) for a jump between two levels. */
export const photonWavelength = (from: number, to: number): number => HC_EV_NM / photonEnergy(from, to);

export type Region = 'uv' | 'visible' | 'ir';
export const region = (nm: number): Region => (nm < 380 ? 'uv' : nm <= 750 ? 'visible' : 'ir');

export const SERIES: Record<number, { bn: string; en: string }> = {
  1: { bn: 'লাইম্যান সিরিজ (অতিবেগুনি)', en: 'Lyman' },
  2: { bn: 'বামার সিরিজ (দৃশ্যমান আলো)', en: 'Balmer' },
  3: { bn: 'পাশেন সিরিজ (অবলোহিত)', en: 'Paschen' },
  4: { bn: 'ব্র্যাকেট সিরিজ (অবলোহিত)', en: 'Brackett' },
  5: { bn: 'ফুন্ড সিরিজ (অবলোহিত)', en: 'Pfund' },
};

/** Approximate sRGB colour of a visible wavelength (for drawing the photon). UV/IR return a neutral grey. */
export function wavelengthToRgb(nm: number): string {
  const rgb: [number, number, number] | null =
    nm >= 380 && nm < 440
      ? [(440 - nm) / 60, 0, 1]
      : nm >= 440 && nm < 490
        ? [0, (nm - 440) / 50, 1]
        : nm >= 490 && nm < 510
          ? [0, 1, (510 - nm) / 20]
          : nm >= 510 && nm < 580
            ? [(nm - 510) / 70, 1, 0]
            : nm >= 580 && nm < 645
              ? [1, (645 - nm) / 65, 0]
              : nm >= 645 && nm <= 750
                ? [1, 0, 0]
                : null;
  if (!rgb) return '#9ca3af';
  const to = (v: number) => Math.round(255 * Math.max(0, Math.min(1, v)) ** 0.8);
  return `rgb(${to(rgb[0])}, ${to(rgb[1])}, ${to(rgb[2])})`;
}

/**
 * A classical (Rutherford) electron radiates and spirals in. For hydrogen the collapse time from the Bohr radius
 * is about 1.6 × 10⁻¹¹ s; this returns the orbit radius fraction r/r₀ at fraction t/T of that time (r³ ∝ T − t).
 */
export const collapseRadius = (tFraction: number): number => Math.cbrt(Math.max(0, 1 - Math.min(1, tFraction)));
export const COLLAPSE_TIME_S = 1.6e-11;
