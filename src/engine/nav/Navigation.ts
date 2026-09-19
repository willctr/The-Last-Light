import * as THREE from 'three';
import type { CatalogObject, Region } from '@/data/types';
import { isBody, isRegion } from '@/data';
import type { BodyState, Ephemeris } from '@/science/ephemeris';
import { compressHelio, localDistanceToVisual } from '@/science/scale';
import { computeTransfer, type PropulsionProfile, type TransferPlan } from '@/science/transfer';
import { AU_KM } from '@/science/units';
import { distance as vdist, dot, length as vlen, normalize, scale as vscale, sub, type Vec3 } from '@/science/vec3';
import { simSecondsToJulianDate } from '@/science/units';
import { eclToThree } from '../frames';

export interface NavTarget {
  id: string;
  name: string;
  /** Real heliocentric position of the destination point (AU). */
  realPosAU: Vec3;
  /** Visual-space point where the ship will hold (three.js frame). */
  holdPos: THREE.Vector3;
  /** Visual-space centre of the body (three.js frame), for orientation. */
  centre: THREE.Vector3;
}

/**
 * Resolve where a course to `obj` should end, given the ship's current real and visual position.
 * Bodies: hold at `approachRadii` × radius on the side facing the ship's departure point.
 * Regions: the boundary target point, or the nearest edge of a belt along the ship's radial line.
 */
export function resolveNavTarget(
  obj: CatalogObject,
  states: Map<string, BodyState>,
  shipRealAU: Vec3,
  shipVis: THREE.Vector3,
): NavTarget | null {
  if (isBody(obj)) {
    const st = states.get(obj.id);
    if (!st) return null;
    const centre = eclToThree(st.visPos);
    const dir = shipVis.clone().sub(centre);
    if (dir.lengthSq() < 1e-9) dir.set(0, 0.2, 1);
    dir.normalize();
    const holdKm = (obj.approachRadii ?? 3.5) * obj.radiusKm;
    const holdVis = localDistanceToVisual(holdKm, obj.radiusKm, st.visRadius);
    const holdPos = centre.clone().addScaledVector(dir, holdVis);
    // Real destination: the hold point in real space along the same direction.
    const dirEcl: Vec3 = [dir.x, -dir.z, dir.y];
    const realPosAU: Vec3 = [
      st.realPosAU[0] + (dirEcl[0] * holdKm) / AU_KM,
      st.realPosAU[1] + (dirEcl[1] * holdKm) / AU_KM,
      st.realPosAU[2] + (dirEcl[2] * holdKm) / AU_KM,
    ];
    return { id: obj.id, name: obj.name, realPosAU, holdPos, centre };
  }
  if (isRegion(obj)) {
    const r = obj as Region;
    let point: Vec3;
    if (r.targetPointAU) point = r.targetPointAU;
    else {
      const radial = normalize(shipRealAU);
      const dirOk = Number.isFinite(radial[0]) && (radial[0] !== 0 || radial[1] !== 0 || radial[2] !== 0);
      const d = dirOk ? radial : ([1, 0, 0] as Vec3);
      const rAU = r.kind === 'shell' ? r.innerAU * 1.05 : (r.innerAU + r.outerAU) / 2;
      point = vscale(d, rAU);
    }
    const vis = eclToThree(compressHelio(point));
    return { id: r.id, name: r.name, realPosAU: point, holdPos: vis, centre: vis.clone() };
  }
  return null;
}

export interface CourseRun {
  targetId: string;
  plan: TransferPlan;
  durationRealS: number;
  departSimTime: number;
  arriveSimTime: number;
  startVis: THREE.Vector3;
  /** Unit direction from the target centre toward the departure point, in visual space. */
  approachDir: THREE.Vector3;
  holdDistanceVis: number;
  elapsedRealS: number;
  /** Δv (km/s) the ship had at departure; the live readout is this minus Δv used so far. */
  startDeltaVKms: number;
}

export function planCourse(distanceKm: number, profile: PropulsionProfile, deltaVAvailable: number): TransferPlan {
  return computeTransfer(distanceKm, profile, deltaVAvailable);
}

/** Real-time seconds the cinematic flight takes for a given simulated travel time. */
export function visualDurationFor(travelTimeS: number): number {
  if (!Number.isFinite(travelTimeS) || travelTimeS <= 0) return 6;
  const l = Math.log10(Math.max(travelTimeS, 60));
  return THREE.MathUtils.clamp(2.5 + l * 1.45, 6, 17);
}

export function courseDistanceKm(shipRealAU: Vec3, targetRealAU: Vec3): number {
  return vdist(shipRealAU, targetRealAU) * AU_KM;
}

/** Approach direction: from target centre toward the ship, in visual space, for the given body. */
export function approachDirection(shipVis: THREE.Vector3, centre: THREE.Vector3): THREE.Vector3 {
  const d = shipVis.clone().sub(centre);
  if (d.lengthSq() < 1e-9) d.set(0, 0.25, 1);
  return d.normalize();
}

export interface SolvedTransfer {
  target: NavTarget;
  plan: TransferPlan;
  /** Simulation time (s since J2000) at arrival. */
  arriveSimTime: number;
  /** Straight-line distance between ship and the target's position *now*, for comparison. */
  currentSeparationKm: number;
}

/**
 * Solve a transfer whose destination moves: iterate travel time until the plan's distance equals
 * the distance to the target's position at the moment of arrival. Damped fixed-point iteration;
 * converges in a handful of steps for every catalogue body. The path is then a straight line to
 * where the target *will be*, which is what a straight-line kinematic model honestly means.
 */
export function solveTransfer(
  obj: CatalogObject,
  eph: Ephemeris,
  statesNow: Map<string, BodyState>,
  simTime: number,
  shipRealAU: Vec3,
  shipVis: THREE.Vector3,
  profile: PropulsionProfile,
  deltaVAvailable: number,
): SolvedTransfer | null {
  const nowTarget = resolveNavTarget(obj, statesNow, shipRealAU, shipVis);
  if (!nowTarget) return null;
  const currentSeparationKm = courseDistanceKm(shipRealAU, nowTarget.realPosAU);
  let T = 0;
  let target = nowTarget;
  let plan = planCourse(currentSeparationKm, profile, deltaVAvailable);
  const movingTarget = isBody(obj) && !!(obj as { orbit?: unknown }).orbit;
  if (movingTarget && Number.isFinite(plan.travelTimeS)) {
    T = plan.travelTimeS;
    for (let i = 0; i < 12; i++) {
      const states = eph.compute(simSecondsToJulianDate(simTime + T));
      const t = resolveNavTarget(obj, states, shipRealAU, shipVis);
      if (!t) break;
      const p = planCourse(courseDistanceKm(shipRealAU, t.realPosAU), profile, deltaVAvailable);
      if (!Number.isFinite(p.travelTimeS)) break;
      target = t;
      plan = p;
      const next = 0.5 * (T + p.travelTimeS);
      if (Math.abs(next - T) < 1) {
        T = next;
        break;
      }
      T = next;
    }
  } else {
    T = plan.travelTimeS;
  }
  const sunMissAU = chordMissDistanceAU(shipRealAU, target.realPosAU);
  if (sunMissAU < 0.35) {
    plan.assumptions.push(
      `Straight-line path passes within ${sunMissAU.toFixed(2)} AU of the Sun; a real mission would fly an orbital transfer around it.`,
    );
  }
  if (movingTarget) plan.assumptions.push('Destination evaluated at arrival time: the path leads to where the target will be, not where it is now.');
  return { target, plan, arriveSimTime: simTime + T, currentSeparationKm };
}

/** Closest approach (AU) of the segment a→b to the Sun at the origin. */
export function chordMissDistanceAU(a: Vec3, b: Vec3): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 === 0) return vlen(a);
  const t = Math.max(0, Math.min(1, -dot(a, ab) / l2));
  return vlen([a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t]);
}
