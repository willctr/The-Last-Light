import * as THREE from 'three';
import type { CelestialBody } from '@/data/types';
import { sampleOrbit } from '@/science/kepler';
import { compressHelio, compressLocal } from '@/science/scale';
import { DEG } from '@/science/units';
import { rotateX } from '@/science/vec3';
import { eclToThree } from '../frames';

export interface OrbitLine {
  bodyId: string;
  parentId: string;
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  baseOpacity: number;
}

/** Builds orbit polylines in visual space. Heliocentric orbits are world-space; moon orbits are children of the parent's root. */
export function buildOrbitLine(body: CelestialBody, parent: CelestialBody, parentVisRadius: number, jd: number): OrbitLine | null {
  if (!body.orbit) return null;
  const pts = sampleOrbit(body.orbit.elements, jd, 360);
  const positions = new Float32Array(pts.length * 3);
  const tilt = (parent.axialTiltDeg ?? 0) * DEG;
  for (let i = 0; i < pts.length; i++) {
    let p = pts[i];
    if (body.orbit.frame === 'parentEquator') p = rotateX(p, tilt);
    const vis = body.orbit.unit === 'AU' ? compressHelio(p) : compressLocal(p, parent.radiusKm, parentVisRadius);
    const t = eclToThree(vis);
    positions[i * 3] = t.x;
    positions[i * 3 + 1] = t.y;
    positions[i * 3 + 2] = t.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const isMoon = body.orbit.unit === 'km';
  const baseOpacity = isMoon ? 0.22 : body.type === 'DwarfPlanet' ? 0.1 : 0.16;
  const material = new THREE.LineBasicMaterial({
    color: isMoon ? new THREE.Color(0.55, 0.7, 0.8) : new THREE.Color(0.35, 0.6, 0.75),
    transparent: true,
    opacity: baseOpacity,
    depthWrite: false,
  });
  const line = new THREE.Line(geo, material);
  line.renderOrder = 1;
  line.frustumCulled = false;
  return { bodyId: body.id, parentId: parent.id, line, material, baseOpacity };
}
