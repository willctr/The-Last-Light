/**
 * Physical constants and unit conversions.
 *
 * Internal convention across the project:
 *   - distances in kilometres (km) unless a function name says otherwise
 *   - heliocentric positions in astronomical units (AU) in the J2000 ecliptic frame
 *   - time as seconds; absolute epochs as Julian Date (JD)
 *   - masses in kilograms, temperatures in kelvin, velocities in km/s
 *
 * Sources: IAU 2012 resolution B2 (AU), CODATA 2018, IERS conventions.
 */

export const AU_KM = 149_597_870.7;
export const C_KMS = 299_792.458;
export const LIGHT_YEAR_KM = 9_460_730_472_580.8;
export const PARSEC_KM = 30_856_775_814_913.67;

export const SOLAR_MASS_KG = 1.9885e30;
export const EARTH_MASS_KG = 5.9722e24;
export const JUPITER_MASS_KG = 1.8982e27;
export const SOLAR_RADIUS_KM = 695_700;
export const EARTH_RADIUS_KM = 6_371.0;
export const JUPITER_RADIUS_KM = 69_911;

export const G_SI = 6.6743e-11; // m^3 kg^-1 s^-2
export const STANDARD_GRAVITY = 9.80665; // m/s^2
export const GM_SUN_KM3_S2 = 1.32712440018e11;
export const GM_EARTH_KM3_S2 = 398_600.4418;

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3_600;
export const SECONDS_PER_DAY = 86_400;
export const SECONDS_PER_JULIAN_YEAR = 365.25 * SECONDS_PER_DAY;
export const DAYS_PER_JULIAN_CENTURY = 36_525;

/** Julian Date of the J2000.0 epoch (2000-01-01 12:00 TT). */
export const J2000_JD = 2_451_545.0;

/** Mean obliquity of the ecliptic at J2000 (degrees). */
export const OBLIQUITY_J2000_DEG = 23.439_291_1;

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const kmToAU = (km: number): number => km / AU_KM;
export const auToKm = (au: number): number => au * AU_KM;
export const kmToLightYears = (km: number): number => km / LIGHT_YEAR_KM;
export const lightYearsToKm = (ly: number): number => ly * LIGHT_YEAR_KM;
export const kmToParsecs = (km: number): number => km / PARSEC_KM;
export const auToLightYears = (au: number): number => (au * AU_KM) / LIGHT_YEAR_KM;

export const kmsToFractionOfC = (kms: number): number => kms / C_KMS;
export const fractionOfCToKms = (f: number): number => f * C_KMS;

export const ms2ToG = (ms2: number): number => ms2 / STANDARD_GRAVITY;
export const gToMs2 = (g: number): number => g * STANDARD_GRAVITY;

export const kelvinToCelsius = (k: number): number => k - 273.15;

export const kgToEarthMasses = (kg: number): number => kg / EARTH_MASS_KG;
export const kgToSolarMasses = (kg: number): number => kg / SOLAR_MASS_KG;
export const kgToJupiterMasses = (kg: number): number => kg / JUPITER_MASS_KG;
export const kmToEarthRadii = (km: number): number => km / EARTH_RADIUS_KM;

/** Julian Date from a JavaScript Date (UTC; the TT/UTC offset of ~69 s is ignored). */
export function dateToJulianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

export function julianDateToDate(jd: number): Date {
  return new Date((jd - 2_440_587.5) * 86_400_000);
}

/** Seconds since J2000 → Julian Date. */
export function simSecondsToJulianDate(seconds: number): number {
  return J2000_JD + seconds / SECONDS_PER_DAY;
}

export function julianDateToSimSeconds(jd: number): number {
  return (jd - J2000_JD) * SECONDS_PER_DAY;
}

/** Julian centuries since J2000 for a given Julian Date. */
export function julianCenturiesSinceJ2000(jd: number): number {
  return (jd - J2000_JD) / DAYS_PER_JULIAN_CENTURY;
}

/** Light travel time (seconds) across a distance in km. */
export function lightTravelTimeSeconds(km: number): number {
  return km / C_KMS;
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
