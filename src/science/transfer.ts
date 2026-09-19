/**
 * Transfer (travel-time) calculations for AURORA-01 and the propulsion concept catalogue.
 *
 * The model is deliberately simple and transparent:
 *
 *  - Constant-acceleration "brachistochrone": accelerate for half the distance, flip, decelerate.
 *    t = 2·sqrt(d / a). Used when the required Δv (= 2·v_peak) fits the available budget.
 *  - Δv-limited: accelerate to v_max = Δv_available / 2, coast, decelerate.
 *  - Cruise / flyby: for sail concepts that reach a cruise speed and do not decelerate (t = d / v).
 *
 * Gravity, orbital mechanics, launch windows and relativistic corrections are ignored. Every
 * plan carries its assumptions as text so the UI can show them alongside the numbers.
 */
import { C_KMS, SECONDS_PER_JULIAN_YEAR } from './units';

export type PropulsionStatus = 'DEMONSTRATED' | 'PROPOSED' | 'THEORETICAL' | 'SPECULATIVE';

export interface PropulsionProfile {
  id: string;
  name: string;
  status: PropulsionStatus;
  /** Sustained acceleration in m/s² (for thrust-based concepts). */
  accelerationMs2: number;
  /** Total Δv budget in km/s (fuel/propellant limited). Infinity for external-power concepts. */
  deltaVBudgetKms: number;
  /** For sail/flyby concepts: cruise speed as a fraction of c, with no deceleration. */
  cruiseFractionOfC?: number;
  /** Whether the concept decelerates at the destination. */
  decelerates: boolean;
  summary: string;
  performance: string;
  energy: string;
  limitations: string;
  /** Representative examples or missions. */
  examples: string;
  sourceIds: string[];
}

export type TransferMode = 'BRACHISTOCHRONE' | 'DELTA_V_LIMITED' | 'CRUISE_FLYBY' | 'NO_PROPULSION';

export interface TransferPlan {
  mode: TransferMode;
  distanceKm: number;
  travelTimeS: number;
  accelTimeS: number;
  coastTimeS: number;
  decelTimeS: number;
  peakVelocityKms: number;
  deltaVUsedKms: number;
  accelerationMs2: number;
  assumptions: string[];
  /** Light travel time over the same distance. */
  lightTimeS: number;
}

export function computeTransfer(distanceKm: number, profile: PropulsionProfile, deltaVAvailableKms: number): TransferPlan {
  const d = Math.max(0, distanceKm);
  const lightTimeS = d / C_KMS;
  const assumptions: string[] = [
    'Straight-line transfer; gravity and orbital motion of origin/destination ignored.',
    'Non-relativistic kinematics.',
  ];

  if (profile.cruiseFractionOfC !== undefined) {
    const v = profile.cruiseFractionOfC * C_KMS;
    const t = v > 0 ? d / v : Infinity;
    assumptions.push(`Cruise at ${(profile.cruiseFractionOfC * 100).toFixed(0)}% of c; acceleration phase treated as instantaneous.`);
    if (!profile.decelerates) assumptions.push('Flyby profile: no deceleration at destination.');
    return {
      mode: 'CRUISE_FLYBY',
      distanceKm: d,
      travelTimeS: t,
      accelTimeS: 0,
      coastTimeS: t,
      decelTimeS: 0,
      peakVelocityKms: v,
      deltaVUsedKms: 0,
      accelerationMs2: profile.accelerationMs2,
      assumptions,
      lightTimeS,
    };
  }

  const a = profile.accelerationMs2; // m/s²
  const dm = d * 1000; // metres
  if (a <= 0 || deltaVAvailableKms <= 0) {
    return {
      mode: 'NO_PROPULSION',
      distanceKm: d,
      travelTimeS: Infinity,
      accelTimeS: 0,
      coastTimeS: Infinity,
      decelTimeS: 0,
      peakVelocityKms: 0,
      deltaVUsedKms: 0,
      accelerationMs2: 0,
      assumptions: [...assumptions, 'No usable Δv remaining.'],
      lightTimeS,
    };
  }

  const dv = Math.min(deltaVAvailableKms, profile.deltaVBudgetKms) * 1000; // m/s
  const decelFactor = profile.decelerates ? 2 : 1;
  // Ideal brachistochrone peak speed (accelerate half, decelerate half)
  const vPeakIdeal = profile.decelerates ? Math.sqrt(a * dm) : Math.sqrt(2 * a * dm);
  const vMaxByDv = dv / decelFactor;

  if (vPeakIdeal <= vMaxByDv) {
    const tHalf = vPeakIdeal / a;
    const t = profile.decelerates ? 2 * tHalf : tHalf;
    assumptions.push(
      profile.decelerates
        ? 'Continuous thrust: accelerate to midpoint, flip, decelerate to rest at destination.'
        : 'Continuous thrust to arrival (flyby).',
    );
    return {
      mode: 'BRACHISTOCHRONE',
      distanceKm: d,
      travelTimeS: t,
      accelTimeS: tHalf,
      coastTimeS: 0,
      decelTimeS: profile.decelerates ? tHalf : 0,
      peakVelocityKms: vPeakIdeal / 1000,
      deltaVUsedKms: (vPeakIdeal * decelFactor) / 1000,
      accelerationMs2: a,
      assumptions,
      lightTimeS,
    };
  }

  // Δv-limited: accelerate to vMax, coast, (decelerate)
  const vMax = vMaxByDv;
  const tAccel = vMax / a;
  const dAccel = 0.5 * a * tAccel * tAccel;
  const dCoast = Math.max(0, dm - dAccel * decelFactor);
  const tCoast = dCoast / vMax;
  const t = tAccel * decelFactor + tCoast;
  assumptions.push(
    `Δv-limited: accelerate to ${(vMax / 1000).toFixed(1)} km/s, coast${profile.decelerates ? ', then decelerate' : ''}.`,
  );
  return {
    mode: 'DELTA_V_LIMITED',
    distanceKm: d,
    travelTimeS: t,
    accelTimeS: tAccel,
    coastTimeS: tCoast,
    decelTimeS: profile.decelerates ? tAccel : 0,
    peakVelocityKms: vMax / 1000,
    deltaVUsedKms: (vMax * decelFactor) / 1000,
    accelerationMs2: a,
    assumptions,
    lightTimeS,
  };
}

/** Velocity (km/s) at elapsed time t along a plan. */
export function transferVelocityAt(plan: TransferPlan, tElapsedS: number): number {
  const t = Math.max(0, Math.min(plan.travelTimeS, tElapsedS));
  if (plan.mode === 'CRUISE_FLYBY') return plan.peakVelocityKms;
  if (plan.mode === 'NO_PROPULSION') return 0;
  const a = plan.accelerationMs2 / 1000; // km/s²
  if (t < plan.accelTimeS) return a * t;
  if (t < plan.accelTimeS + plan.coastTimeS) return plan.peakVelocityKms;
  const tDecel = t - plan.accelTimeS - plan.coastTimeS;
  if (plan.decelTimeS === 0) return plan.peakVelocityKms;
  return Math.max(0, plan.peakVelocityKms - a * tDecel);
}

/** Fraction of the distance covered at elapsed time t (0..1), consistent with the velocity profile. */
export function transferProgressAt(plan: TransferPlan, tElapsedS: number): number {
  if (!Number.isFinite(plan.travelTimeS) || plan.travelTimeS <= 0) return 0;
  const t = Math.max(0, Math.min(plan.travelTimeS, tElapsedS));
  const dm = plan.distanceKm * 1000;
  if (dm === 0) return 1;
  if (plan.mode === 'CRUISE_FLYBY') return t / plan.travelTimeS;
  const a = plan.accelerationMs2;
  const vPeak = plan.peakVelocityKms * 1000;
  let dist = 0;
  if (t < plan.accelTimeS) {
    dist = 0.5 * a * t * t;
  } else {
    dist = 0.5 * a * plan.accelTimeS * plan.accelTimeS;
    const tc = Math.min(t - plan.accelTimeS, plan.coastTimeS);
    dist += vPeak * tc;
    const td = t - plan.accelTimeS - plan.coastTimeS;
    if (td > 0) dist += vPeak * td - 0.5 * a * td * td;
  }
  return Math.max(0, Math.min(1, dist / dm));
}

/** Δv used (km/s) at elapsed time t. */
export function transferDeltaVUsedAt(plan: TransferPlan, tElapsedS: number): number {
  const t = Math.max(0, Math.min(plan.travelTimeS, tElapsedS));
  if (plan.mode === 'CRUISE_FLYBY' || plan.mode === 'NO_PROPULSION') return 0;
  const a = plan.accelerationMs2 / 1000;
  if (t < plan.accelTimeS) return a * t;
  const afterAccel = a * plan.accelTimeS;
  const td = t - plan.accelTimeS - plan.coastTimeS;
  if (td <= 0) return afterAccel;
  return afterAccel + a * Math.min(td, plan.decelTimeS);
}

/** Convenience for the "travel time is a core mechanic" comparison table. */
export function travelTimeYears(plan: TransferPlan): number {
  return plan.travelTimeS / SECONDS_PER_JULIAN_YEAR;
}
