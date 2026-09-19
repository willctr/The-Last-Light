import { describe, expect, it } from 'vitest';
import {
  AU_KM,
  C_KMS,
  J2000_JD,
  auToLightYears,
  dateToJulianDate,
  julianDateToDate,
  kmsToFractionOfC,
  lightTravelTimeSeconds,
} from './units';
import { keplerPosition, solveEccentricAnomaly, standishPosition } from './kepler';
import { length } from './vec3';
import {
  bodyRadiusToVisual,
  compressHelio,
  expandHelio,
  helioRadiusToReal,
  helioRadiusToVisual,
  localDistanceToReal,
  localDistanceToVisual,
} from './scale';
import { computeTransfer, transferProgressAt, transferVelocityAt, type PropulsionProfile } from './transfer';
import { formatDistance, formatDuration, formatMissionClock, formatVelocity } from './format';

const EARTH_STANDISH = {
  kind: 'standish' as const,
  a: 1.00000261, aDot: 0.00000562,
  e: 0.01671123, eDot: -0.00004392,
  i: -0.00001531, iDot: -0.01294668,
  L: 100.46457166, LDot: 35999.37244981,
  longPeri: 102.93768193, longPeriDot: 0.32327364,
  longNode: 0.0, longNodeDot: 0.0,
};

describe('units', () => {
  it('converts AU to light-years', () => {
    expect(auToLightYears(63241.077)).toBeCloseTo(1, 3);
  });
  it('light crosses 1 AU in ~499 s', () => {
    expect(lightTravelTimeSeconds(AU_KM)).toBeCloseTo(499.0, 0);
  });
  it('fraction of c', () => {
    expect(kmsToFractionOfC(C_KMS)).toBe(1);
  });
  it('julian date round-trips', () => {
    const d = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    expect(dateToJulianDate(d)).toBeCloseTo(J2000_JD, 6);
    expect(julianDateToDate(J2000_JD).getTime()).toBe(d.getTime());
  });
});

describe('kepler', () => {
  it('solves Kepler equation', () => {
    for (const e of [0, 0.1, 0.5, 0.9]) {
      for (const M of [0.1, 1, 2.5, 4, 6]) {
        const E = solveEccentricAnomaly(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(M % (2 * Math.PI), 9);
      }
    }
  });
  it('places Earth at ~0.983 AU near heliocentric longitude 100° at J2000', () => {
    const p = standishPosition(EARTH_STANDISH, J2000_JD);
    const r = length(p);
    expect(r).toBeGreaterThan(0.98);
    expect(r).toBeLessThan(0.99);
    const lon = (Math.atan2(p[1], p[0]) * 180) / Math.PI;
    expect(lon).toBeGreaterThan(98);
    expect(lon).toBeLessThan(102);
    expect(Math.abs(p[2])).toBeLessThan(1e-3);
  });
  it('circular moon orbit returns to start after one period', () => {
    const el = { kind: 'kepler' as const, a: 384400, e: 0, i: 0, Omega: 0, omega: 0, M0: 0, epochJD: J2000_JD, periodDays: 27.3217 };
    const p0 = keplerPosition(el, J2000_JD);
    const p1 = keplerPosition(el, J2000_JD + 27.3217);
    expect(p0[0]).toBeCloseTo(384400, 3);
    expect(p1[0]).toBeCloseTo(384400, 3);
    const pq = keplerPosition(el, J2000_JD + 27.3217 / 4);
    expect(pq[1]).toBeCloseTo(384400, 3);
  });
});

describe('scale', () => {
  it('heliocentric compression is monotonic and invertible', () => {
    for (const r of [0.1, 0.39, 1, 5.2, 30, 120, 2000]) {
      expect(helioRadiusToReal(helioRadiusToVisual(r))).toBeCloseTo(r, 6);
    }
    expect(helioRadiusToVisual(1)).toBeCloseTo(100, 6);
    expect(helioRadiusToVisual(5.2)).toBeGreaterThan(helioRadiusToVisual(1.5));
  });
  it('vector compression preserves direction', () => {
    const v = compressHelio([3, 4, 0]);
    expect(v[0] / v[1]).toBeCloseTo(0.75, 9);
    const back = expandHelio(v);
    expect(back[0]).toBeCloseTo(3, 6);
    expect(back[1]).toBeCloseTo(4, 6);
  });
  it('local orbits stay outside the parent and invert', () => {
    const rEarthVis = bodyRadiusToVisual(6371);
    const dMoon = localDistanceToVisual(384400, 6371, rEarthVis);
    expect(dMoon).toBeGreaterThan(rEarthVis * 5);
    expect(localDistanceToReal(dMoon, 6371, rEarthVis)).toBeCloseTo(384400, 3);
  });
  it('bodies keep size ordering', () => {
    expect(bodyRadiusToVisual(695700)).toBeGreaterThan(bodyRadiusToVisual(69911));
    expect(bodyRadiusToVisual(69911)).toBeGreaterThan(bodyRadiusToVisual(6371));
    expect(bodyRadiusToVisual(11)).toBeGreaterThanOrEqual(0.04);
  });
});

const NEP: PropulsionProfile = {
  id: 'nep', name: 'NEP', status: 'PROPOSED', accelerationMs2: 1e-3, deltaVBudgetKms: 240, decelerates: true,
  summary: '', performance: '', energy: '', limitations: '', examples: '', sourceIds: [],
};

describe('transfer', () => {
  it('brachistochrone t = 2 sqrt(d/a)', () => {
    const d = 78e6; // km, Earth–Mars at closest approach
    const plan = computeTransfer(d, NEP, 240);
    expect(plan.mode).toBe('BRACHISTOCHRONE');
    expect(plan.travelTimeS).toBeCloseTo(2 * Math.sqrt((d * 1000) / 1e-3), 3);
    expect(plan.deltaVUsedKms).toBeCloseTo(2 * plan.peakVelocityKms, 9);
    expect(transferProgressAt(plan, plan.travelTimeS)).toBeCloseTo(1, 6);
    expect(transferProgressAt(plan, plan.travelTimeS / 2)).toBeCloseTo(0.5, 6);
    expect(transferVelocityAt(plan, plan.travelTimeS / 2)).toBeCloseTo(plan.peakVelocityKms, 6);
    expect(transferVelocityAt(plan, plan.travelTimeS)).toBeCloseTo(0, 6);
  });
  it('becomes Δv-limited for interstellar distances', () => {
    const d = 4.0e13; // km, ~4.2 ly
    const plan = computeTransfer(d, NEP, 240);
    expect(plan.mode).toBe('DELTA_V_LIMITED');
    expect(plan.peakVelocityKms).toBeCloseTo(120, 6);
    const years = plan.travelTimeS / (365.25 * 86400);
    expect(years).toBeGreaterThan(10000);
    expect(years).toBeLessThan(12000);
    expect(transferProgressAt(plan, plan.travelTimeS)).toBeCloseTo(1, 6);
  });
  it('cruise concept at 0.1 c reaches Proxima in ~42 years', () => {
    const sail: PropulsionProfile = { ...NEP, id: 'sail', cruiseFractionOfC: 0.1, decelerates: false, deltaVBudgetKms: Infinity };
    const plan = computeTransfer(4.2465 * 9.4607e12, sail, Infinity);
    expect(plan.travelTimeS / (365.25 * 86400)).toBeCloseTo(42.5, 0);
  });
});

describe('format', () => {
  it('formats distances in sensible units', () => {
    expect(formatDistance(384400)).toBe('384,400 km');
    expect(formatDistance(AU_KM)).toContain('AU');
    expect(formatDistance(4.2465 * 9.4607e12)).toContain('ly');
  });
  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(3600 * 5.5)).toBe('5 h 30 min');
    expect(formatDuration(365.25 * 86400 * 11000)).toBe('11,000 years');
  });
  it('mission clock', () => {
    expect(formatMissionClock(34 * 86400 + 17 * 3600 + 9 * 60)).toBe('0034:17:09');
  });
  it('velocity', () => {
    const v = formatVelocity(29.78);
    expect(v.kms).toBe('29.78 km/s');
    expect(v.c).toContain('c');
  });
});
