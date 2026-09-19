/**
 * Ephemeris: computes, for every catalogued body at a given Julian Date,
 *   - its real heliocentric position (AU, J2000 ecliptic) and velocity (km/s)
 *   - its visual-space position and radius (see scale.ts)
 * and provides the inverse mapping from a visual-space point back to a real position, used to
 * give the spacecraft honest scientific readouts while it navigates compressed space.
 */
import type { CelestialBody } from '@/data/types';
import { orbitPosition } from './kepler';
import {
  bodyRadiusToVisual,
  compressHelio,
  compressLocal,
  expandHelio,
  expandLocal,
  localDistanceToVisual,
} from './scale';
import { AU_KM, DEG, SECONDS_PER_DAY, smoothstep } from './units';
import { add, distance, length, lerpVec, rotateX, scale, sub, type Vec3 } from './vec3';

export interface BodyState {
  id: string;
  parentId: string | null;
  /** Heliocentric position, AU, ecliptic J2000. */
  realPosAU: Vec3;
  /** Heliocentric velocity, km/s. */
  realVelKms: Vec3;
  /** Visual-space position (ecliptic axes). */
  visPos: Vec3;
  /** Visual radius. */
  visRadius: number;
  /** Radius (visual units) of the region in which this body defines the local frame. */
  influenceVis: number;
}

export interface FrameResolution {
  /** Body whose local frame contains the point (Sun when in open heliocentric space). */
  frameId: string;
  /** Real heliocentric position in AU. */
  realPosAU: Vec3;
  /** 0 at the frame body's centre, 1 at the edge of its influence (∞ for the Sun). */
  normalized: number;
}

const VEL_DT_S = 60;

export class Ephemeris {
  readonly bodies: CelestialBody[];
  readonly byId: Map<string, CelestialBody>;
  private readonly order: CelestialBody[];
  private readonly visRadius: Map<string, number>;
  private readonly influence: Map<string, number>;

  constructor(bodies: CelestialBody[]) {
    this.bodies = bodies;
    this.byId = new Map(bodies.map((b) => [b.id, b]));
    this.order = topologicalOrder(bodies);
    this.visRadius = new Map(bodies.map((b) => [b.id, bodyRadiusToVisual(b.radiusKm)]));
    this.influence = new Map();
    for (const b of bodies) {
      const rVis = this.visRadius.get(b.id)!;
      const children = bodies.filter((c) => c.parentId === b.id && c.orbit);
      let inf = rVis * 8;
      for (const c of children) {
        const el = c.orbit!.elements;
        const apo = el.kind === 'kepler' ? el.a * (1 + el.e) : 0;
        inf = Math.max(inf, localDistanceToVisual(apo, b.radiusKm, rVis) * 1.35 + this.visRadiusOf(c.id) * 2);
      }
      this.influence.set(b.id, b.parentId === null ? Infinity : inf);
    }
  }

  visRadiusOf(id: string): number {
    return this.visRadius.get(id) ?? 0.05;
  }

  /** Hierarchy depth: Sun 0, planets 1, moons 2. */
  depthOf(id: string): number {
    let d = 0;
    let b = this.byId.get(id);
    while (b && b.parentId) {
      d++;
      b = this.byId.get(b.parentId);
    }
    return d;
  }

  influenceOf(id: string): number {
    return this.influence.get(id) ?? 0;
  }

  /** Full state for all bodies at Julian Date `jd`. */
  compute(jd: number): Map<string, BodyState> {
    const now = this.positions(jd);
    const later = this.positions(jd + VEL_DT_S / SECONDS_PER_DAY);
    const out = new Map<string, BodyState>();
    for (const b of this.order) {
      const p0 = now.get(b.id)!;
      const p1 = later.get(b.id)!;
      const vel = scale(sub(p1.real, p0.real), AU_KM / VEL_DT_S);
      out.set(b.id, {
        id: b.id,
        parentId: b.parentId,
        realPosAU: p0.real,
        realVelKms: vel,
        visPos: p0.vis,
        visRadius: this.visRadius.get(b.id)!,
        influenceVis: this.influence.get(b.id)!,
      });
    }
    return out;
  }

  /** Positions only (real AU + visual), used twice per frame for velocity finite differences. */
  private positions(jd: number): Map<string, { real: Vec3; vis: Vec3 }> {
    const out = new Map<string, { real: Vec3; vis: Vec3 }>();
    for (const b of this.order) {
      if (!b.orbit || !b.parentId) {
        out.set(b.id, { real: [0, 0, 0], vis: [0, 0, 0] });
        continue;
      }
      const parent = out.get(b.parentId)!;
      const parentBody = this.byId.get(b.parentId)!;
      let local = orbitPosition(b.orbit.elements, jd);
      if (b.orbit.frame === 'parentEquator') {
        local = rotateX(local, (parentBody.axialTiltDeg ?? 0) * DEG);
      }
      if (b.orbit.unit === 'AU') {
        const real = add(parent.real, local);
        out.set(b.id, { real, vis: parentBody.parentId === null ? compressHelio(real) : add(parent.vis, compressHelio(local)) });
      } else {
        const real = add(parent.real, scale(local, 1 / AU_KM));
        const vis = add(parent.vis, compressLocal(local, parentBody.radiusKm, this.visRadius.get(parentBody.id)!));
        out.set(b.id, { real, vis });
      }
    }
    return out;
  }

  /**
   * Map a visual-space point to a real heliocentric position. Picks the body whose local
   * frame the point is most deeply inside (normalized distance), blending to the heliocentric
   * mapping near the edge so readouts stay continuous.
   */
  resolveFrame(visPos: Vec3, states: Map<string, BodyState>): FrameResolution {
    // A moon's influence sphere sits inside its parent's, so among bodies whose sphere contains the
    // point the deepest one wins (Europa over Jupiter); otherwise the smallest normalised distance.
    let best: BodyState | null = null;
    let bestRho = Infinity;
    let bestDepth = -1;
    for (const s of states.values()) {
      if (s.parentId === null) continue;
      const rho = distance(visPos, s.visPos) / s.influenceVis;
      const depth = rho < 1 ? this.depthOf(s.id) : -1;
      if (depth > bestDepth || (depth === bestDepth && rho < bestRho)) {
        bestRho = rho;
        bestDepth = depth;
        best = s;
      }
    }
    const helio = expandHelio(visPos);
    if (!best || bestRho >= 1) {
      return { frameId: 'sun', realPosAU: helio, normalized: length(visPos) };
    }
    const body = this.byId.get(best.id)!;
    const offsetVis = sub(visPos, best.visPos);
    const offsetKm = expandLocal(offsetVis, body.radiusKm, best.visRadius);
    const local = add(best.realPosAU, scale(offsetKm, 1 / AU_KM));
    if (bestRho < 0.7) return { frameId: best.id, realPosAU: local, normalized: bestRho };
    const t = smoothstep(0.7, 1, bestRho);
    return { frameId: best.id, realPosAU: lerpVec(local, helio, t), normalized: bestRho };
  }

  /** Visual-space point at a given real offset (km) from a body, along a direction, honouring the body's own frame. */
  visualPointNearBody(state: BodyState, body: CelestialBody, directionVis: Vec3, distanceKm: number): Vec3 {
    const d = localDistanceToVisual(distanceKm, body.radiusKm, state.visRadius);
    return add(state.visPos, scale(directionVis, d));
  }
}

function topologicalOrder(bodies: CelestialBody[]): CelestialBody[] {
  const out: CelestialBody[] = [];
  const seen = new Set<string>();
  const byId = new Map(bodies.map((b) => [b.id, b]));
  const visit = (b: CelestialBody) => {
    if (seen.has(b.id)) return;
    if (b.parentId && byId.has(b.parentId)) visit(byId.get(b.parentId)!);
    seen.add(b.id);
    out.push(b);
  };
  bodies.forEach(visit);
  return out;
}
