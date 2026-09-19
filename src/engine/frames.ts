/**
 * Frame conversion between the science layer (J2000 ecliptic: +x equinox, +z ecliptic north,
 * right-handed) and the three.js scene (+y up). Mapping: three = (x, z, −y). Prograde orbital
 * motion is a positive rotation about three's +Y axis.
 */
import * as THREE from 'three';
import type { Vec3 } from '@/science/vec3';

export function eclToThree(v: Vec3, out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
  return out.set(v[0], v[2], -v[1]);
}

export function threeToEcl(v: THREE.Vector3): Vec3 {
  return [v.x, -v.z, v.y];
}

/** Deterministic PRNG (mulberry32) for procedural content. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
