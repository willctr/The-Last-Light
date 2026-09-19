/**
 * VISUAL SPACE vs SCIENTIFIC SPACE.
 *
 * Astronomical distances span so many orders of magnitude that a literal 1:1 scene is
 * unnavigable: at a scale where Earth is a marble, Neptune is kilometres away. The engine
 * therefore renders a *compressed* visual space while all instrument readouts are computed
 * from *scientific* (real) positions.
 *
 * The compression is hierarchical and radial (direction-preserving), so orbits remain closed
 * planar curves and ordering is preserved:
 *
 *   heliocentric:  r_vis = K_HELIO · r_AU ^ P_HELIO
 *   body radius:   R_vis = K_RADIUS · R_km ^ P_RADIUS           (floored so small moons stay visible)
 *   moon orbits:   d_vis = R_parent_vis · (d / R_parent) ^ P_LOCAL  (ratios to parent radius)
 *
 * Anything shown to the player as a distance, speed or time is computed from real values.
 * The visual units are never presented as physical distances.
 */
import { AU_KM } from './units';
import { length, scale as scaleVec, type Vec3 } from './vec3';

export const K_HELIO = 100; // visual units at 1 AU
export const P_HELIO = 0.56;
export const K_RADIUS = 0.0194;
export const P_RADIUS = 0.45;
export const MIN_BODY_RADIUS_VIS = 0.04;
export const P_LOCAL = 0.8;

/** Heliocentric distance: AU → visual units. */
export function helioRadiusToVisual(rAU: number): number {
  return K_HELIO * Math.pow(Math.max(rAU, 0), P_HELIO);
}

/** Heliocentric distance: visual units → AU. */
export function helioRadiusToReal(rVis: number): number {
  return Math.pow(Math.max(rVis, 0) / K_HELIO, 1 / P_HELIO);
}

/** Compress a heliocentric position vector (AU) into visual space (direction preserved). */
export function compressHelio(posAU: Vec3): Vec3 {
  const r = length(posAU);
  if (r === 0) return [0, 0, 0];
  return scaleVec(posAU, helioRadiusToVisual(r) / r);
}

/** Expand a visual-space heliocentric position back to AU. */
export function expandHelio(posVis: Vec3): Vec3 {
  const r = length(posVis);
  if (r === 0) return [0, 0, 0];
  return scaleVec(posVis, helioRadiusToReal(r) / r);
}

/** Body radius: km → visual units. */
export function bodyRadiusToVisual(radiusKm: number): number {
  return Math.max(MIN_BODY_RADIUS_VIS, K_RADIUS * Math.pow(radiusKm, P_RADIUS));
}

/** Local (parent-centred) distance: km → visual units, relative to the parent's visual radius. */
export function localDistanceToVisual(dKm: number, parentRadiusKm: number, parentRadiusVis: number): number {
  return parentRadiusVis * Math.pow(Math.max(dKm, 0) / parentRadiusKm, P_LOCAL);
}

export function localDistanceToReal(dVis: number, parentRadiusKm: number, parentRadiusVis: number): number {
  return parentRadiusKm * Math.pow(Math.max(dVis, 0) / parentRadiusVis, 1 / P_LOCAL);
}

export function compressLocal(offsetKm: Vec3, parentRadiusKm: number, parentRadiusVis: number): Vec3 {
  const d = length(offsetKm);
  if (d === 0) return [0, 0, 0];
  return scaleVec(offsetKm, localDistanceToVisual(d, parentRadiusKm, parentRadiusVis) / d);
}

export function expandLocal(offsetVis: Vec3, parentRadiusKm: number, parentRadiusVis: number): Vec3 {
  const d = length(offsetVis);
  if (d === 0) return [0, 0, 0];
  return scaleVec(offsetVis, localDistanceToReal(d, parentRadiusKm, parentRadiusVis) / d);
}

/** Convenience: heliocentric AU vector → km vector. */
export const auVecToKm = (v: Vec3): Vec3 => scaleVec(v, AU_KM);
export const kmVecToAU = (v: Vec3): Vec3 => scaleVec(v, 1 / AU_KM);

/**
 * A short human explanation of the compression, shown in the navigation UI so the player
 * never mistakes visual distance for physical distance.
 */
export const SCALE_DISCLAIMER =
  'Visual distances are compressed for navigation (radial power law). All readouts use real values.';
