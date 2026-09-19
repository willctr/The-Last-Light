/**
 * Keplerian orbit propagation.
 *
 * Two element flavours are supported:
 *
 *  1. `StandishElements` — the JPL "Keplerian Elements for Approximate Positions of the
 *     Major Planets" (E.M. Standish, 1992/2006), valid 1800–2050. Mean elements plus
 *     secular rates per Julian century, referenced to the J2000 ecliptic. Positions are
 *     accurate to arcminutes over that interval, which is far more than exploration needs.
 *
 *  2. `KeplerElements` — classical elements at a fixed epoch with a fixed period. Used for
 *     moons and dwarf planets. These are *approximate*: orbital phases are not taken from a
 *     numerical ephemeris, so a moon's exact position on a given date is not authoritative.
 *
 * All outputs are in the parent-centred J2000 ecliptic frame: +x toward the vernal equinox,
 * +z toward ecliptic north (right-handed).
 */
import { DEG, DAYS_PER_JULIAN_CENTURY, J2000_JD, SECONDS_PER_DAY } from './units';
import type { Vec3 } from './vec3';

export interface StandishElements {
  kind: 'standish';
  /** Semi-major axis (AU) and rate per century. */
  a: number;
  aDot: number;
  e: number;
  eDot: number;
  /** Inclination (deg) and rate. */
  i: number;
  iDot: number;
  /** Mean longitude (deg) and rate. */
  L: number;
  LDot: number;
  /** Longitude of perihelion (deg) and rate. */
  longPeri: number;
  longPeriDot: number;
  /** Longitude of ascending node (deg) and rate. */
  longNode: number;
  longNodeDot: number;
}

export interface KeplerElements {
  kind: 'kepler';
  /** Semi-major axis in the caller's chosen unit (km for moons, AU for dwarf planets). */
  a: number;
  e: number;
  /** Inclination (deg) relative to the chosen reference plane. */
  i: number;
  /** Longitude of ascending node (deg). */
  Omega: number;
  /** Argument of periapsis (deg). */
  omega: number;
  /** Mean anomaly (deg) at epoch. */
  M0: number;
  /** Epoch as Julian Date. */
  epochJD: number;
  /** Sidereal orbital period in days (always positive; retrograde orbits use i > 90°). */
  periodDays: number;
}

export type OrbitElements = StandishElements | KeplerElements;

/** Solve Kepler's equation M = E − e·sin(E) for E (radians). */
export function solveEccentricAnomaly(meanAnomalyRad: number, e: number): number {
  const M = normalizeAngle(meanAnomalyRad);
  let E = e < 0.8 ? M : Math.PI;
  for (let iter = 0; iter < 30; iter++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

export function normalizeAngle(rad: number): number {
  const twoPi = Math.PI * 2;
  let a = rad % twoPi;
  if (a < 0) a += twoPi;
  return a;
}

/** Rotate perifocal coordinates into the reference frame using ω, Ω, i (radians). */
export function perifocalToReference(xp: number, yp: number, omega: number, Omega: number, inc: number): Vec3 {
  const cw = Math.cos(omega);
  const sw = Math.sin(omega);
  const cO = Math.cos(Omega);
  const sO = Math.sin(Omega);
  const ci = Math.cos(inc);
  const si = Math.sin(inc);
  return [
    (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}

/** Position from Standish mean elements at Julian Date `jd`. Output in AU, heliocentric J2000 ecliptic. */
export function standishPosition(el: StandishElements, jd: number): Vec3 {
  const T = (jd - J2000_JD) / DAYS_PER_JULIAN_CENTURY;
  const a = el.a + el.aDot * T;
  const e = el.e + el.eDot * T;
  const i = (el.i + el.iDot * T) * DEG;
  const L = (el.L + el.LDot * T) * DEG;
  const longPeri = (el.longPeri + el.longPeriDot * T) * DEG;
  const longNode = (el.longNode + el.longNodeDot * T) * DEG;

  const omega = longPeri - longNode;
  const M = L - longPeri;
  const E = solveEccentricAnomaly(M, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return perifocalToReference(xp, yp, omega, longNode, i);
}

/** Position from fixed classical elements at Julian Date `jd`. Output in the same unit as `a`. */
export function keplerPosition(el: KeplerElements, jd: number): Vec3 {
  const days = jd - el.epochJD;
  const n = (2 * Math.PI) / el.periodDays; // rad/day
  const M = el.M0 * DEG + n * days;
  const E = solveEccentricAnomaly(M, el.e);
  const xp = el.a * (Math.cos(E) - el.e);
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  return perifocalToReference(xp, yp, el.omega * DEG, el.Omega * DEG, el.i * DEG);
}

export function orbitPosition(el: OrbitElements, jd: number): Vec3 {
  return el.kind === 'standish' ? standishPosition(el, jd) : keplerPosition(el, jd);
}

/** Sample a full orbit as `n` points (in the element's own unit) at a given epoch. */
export function sampleOrbit(el: OrbitElements, jd: number, n = 256): Vec3[] {
  const pts: Vec3[] = [];
  if (el.kind === 'standish') {
    const T = (jd - J2000_JD) / DAYS_PER_JULIAN_CENTURY;
    const a = el.a + el.aDot * T;
    const e = el.e + el.eDot * T;
    const i = (el.i + el.iDot * T) * DEG;
    const longPeri = (el.longPeri + el.longPeriDot * T) * DEG;
    const longNode = (el.longNode + el.longNodeDot * T) * DEG;
    const omega = longPeri - longNode;
    for (let k = 0; k <= n; k++) {
      const E = (k / n) * Math.PI * 2;
      const xp = a * (Math.cos(E) - e);
      const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
      pts.push(perifocalToReference(xp, yp, omega, longNode, i));
    }
  } else {
    for (let k = 0; k <= n; k++) {
      const E = (k / n) * Math.PI * 2;
      const xp = el.a * (Math.cos(E) - el.e);
      const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
      pts.push(perifocalToReference(xp, yp, el.omega * DEG, el.Omega * DEG, el.i * DEG));
    }
  }
  return pts;
}

/** Orbital period (days) from Standish elements via Kepler's third law (a in AU, around the Sun). */
export function standishPeriodDays(el: StandishElements): number {
  return Math.sqrt(el.a * el.a * el.a) * 365.256;
}

export function orbitPeriodDays(el: OrbitElements): number {
  return el.kind === 'standish' ? standishPeriodDays(el) : Math.abs(el.periodDays);
}

/** Convert seconds since J2000 to a Julian Date. */
export const jdFromSimSeconds = (s: number): number => J2000_JD + s / SECONDS_PER_DAY;
