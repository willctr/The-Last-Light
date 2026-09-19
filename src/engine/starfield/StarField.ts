import * as THREE from 'three';
import { gaussian, mulberry32 } from '../frames';
import { STAR_FRAGMENT, STAR_VERTEX, GALAXY_VERTEX } from '../shaders/points.glsl';
import { GALAXY_FRAGMENT } from '../shaders/galaxy.glsl';

/** Galactic frame in ecliptic J2000 coordinates (approximate). */
const GAL_POLE_ECL = new THREE.Vector3(-0.8676, -0.0003, 0.4971);
const GAL_CENTRE_ECL = new THREE.Vector3(-0.0556, -0.9938, -0.0958);

const eclToThree = (v: THREE.Vector3) => new THREE.Vector3(v.x, v.z, -v.y);

/** Linear-RGB colours by spectral class. */
const CLASS_COLORS: Record<string, [number, number, number]> = {
  O: [0.62, 0.72, 1.0],
  B: [0.72, 0.8, 1.0],
  A: [0.9, 0.93, 1.0],
  F: [1.0, 0.98, 0.92],
  G: [1.0, 0.93, 0.78],
  K: [1.0, 0.8, 0.55],
  M: [1.0, 0.6, 0.4],
};
const CLASS_WEIGHTS: [string, number][] = [
  ['O', 0.02],
  ['B', 0.08],
  ['A', 0.14],
  ['F', 0.15],
  ['G', 0.2],
  ['K', 0.27],
  ['M', 0.14],
];

export interface NamedStar {
  name: string;
  /** Unit direction, ecliptic J2000. */
  dir: [number, number, number];
  spectral: string;
  distanceLy: number;
  mag: number;
}

export const SKY_RADIUS = 40_000;

/**
 * Procedural background sky: a camera-attached sphere of point stars with class-based colours
 * and a Milky Way density band, a diffuse galaxy-glow sphere, and (when loaded) named stars
 * at their real sky positions.
 */
export class StarField {
  readonly group = new THREE.Group();
  readonly stars: THREE.Points;
  readonly galaxy: THREE.Mesh;
  readonly named = new THREE.Group();
  readonly namedStars: NamedStar[] = [];
  private readonly starMat: THREE.ShaderMaterial;
  private readonly galaxyMat: THREE.ShaderMaterial;
  private namedMat: THREE.ShaderMaterial | null = null;

  constructor(count = 16_000, seed = 7) {
    const rand = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const tw = new Float32Array(count);
    const pole = eclToThree(GAL_POLE_ECL).normalize();
    const centre = eclToThree(GAL_CENTRE_ECL).normalize();
    const third = new THREE.Vector3().crossVectors(pole, centre).normalize();
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const inBand = rand() < 0.42;
      if (inBand) {
        const lon = (rand() * 2 - 1) * Math.PI;
        const bulge = Math.exp(-Math.pow(lon / 1.1, 2));
        const lat = gaussian(rand) * (0.09 + 0.09 * bulge);
        if (rand() > 0.35 + 0.65 * bulge) {
          i--;
          continue;
        }
        v.copy(centre).multiplyScalar(Math.cos(lon) * Math.cos(lat))
          .addScaledVector(third, Math.sin(lon) * Math.cos(lat))
          .addScaledVector(pole, Math.sin(lat));
      } else {
        const cosT = 2 * rand() - 1;
        const sinT = Math.sqrt(1 - cosT * cosT);
        const phi = rand() * Math.PI * 2;
        v.set(sinT * Math.cos(phi), cosT, sinT * Math.sin(phi));
      }
      v.normalize().multiplyScalar(SKY_RADIUS);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
      const cls = pickClass(rand);
      const c = CLASS_COLORS[cls];
      // Band stars are distant and faint on average: smaller and dimmer, so the band reads as a glow, not a speckle.
      const brightness = Math.pow(rand(), inBand ? 7 : 5.5);
      const s = (inBand ? 0.7 : 0.9) + brightness * (inBand ? 2.4 : 3.6);
      size[i] = s;
      const intensity = (inBand ? 0.22 : 0.35) + brightness * 0.75;
      col[i * 3] = c[0] * intensity;
      col[i * 3 + 1] = c[1] * intensity;
      col[i * 3 + 2] = c[2] * intensity;
      tw[i] = rand();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aTwinkle', new THREE.BufferAttribute(tw, 1));
    this.starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      uniforms: { uPixelRatio: { value: 1 }, uTime: { value: 0 }, uFade: { value: 0 } },
      // Opaque pass (renderOrder -10) so planets drawn later occlude the sky; blending still additive.
      transparent: false,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(geo, this.starMat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -10;

    this.galaxyMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_VERTEX,
      fragmentShader: GALAXY_FRAGMENT,
      uniforms: { uGalPole: { value: pole }, uGalCentre: { value: centre }, uFade: { value: 0 } },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });
    this.galaxy = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS * 0.98, 48, 32), this.galaxyMat);
    this.galaxy.frustumCulled = false;
    this.galaxy.renderOrder = -11;

    this.group.add(this.galaxy, this.stars, this.named);
  }

  /** Load the Python-generated nearby/bright star catalogue and place the stars on the sky. */
  async loadNamedStars(url = `${import.meta.env.BASE_URL}data/stars-nearby.json`): Promise<void> {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as { stars: NamedStar[] };
      const n = data.stars.length;
      const pos = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const tw = new Float32Array(n);
      data.stars.forEach((s, i) => {
        const v = eclToThree(new THREE.Vector3(s.dir[0], s.dir[1], s.dir[2])).normalize().multiplyScalar(SKY_RADIUS * 0.99);
        pos[i * 3] = v.x;
        pos[i * 3 + 1] = v.y;
        pos[i * 3 + 2] = v.z;
        const c = CLASS_COLORS[s.spectral.charAt(0).toUpperCase()] ?? CLASS_COLORS.G;
        const bright = Math.max(0.35, Math.min(1.6, 1.25 - s.mag * 0.22));
        col[i * 3] = c[0] * bright;
        col[i * 3 + 1] = c[1] * bright;
        col[i * 3 + 2] = c[2] * bright;
        size[i] = Math.max(1.6, Math.min(6.5, 4.6 - s.mag * 0.9));
        tw[i] = (i * 0.37) % 1;
        this.namedStars.push(s);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      geo.setAttribute('aTwinkle', new THREE.BufferAttribute(tw, 1));
      this.namedMat = this.starMat.clone();
      const pts = new THREE.Points(geo, this.namedMat);
      pts.frustumCulled = false;
      pts.renderOrder = -9;
      this.named.add(pts);
    } catch {
      /* the sky still works without the catalogue */
    }
  }

  update(cameraPos: THREE.Vector3, time: number, pixelRatio: number, fade: number): void {
    this.group.position.copy(cameraPos);
    this.starMat.uniforms.uPixelRatio.value = pixelRatio;
    this.starMat.uniforms.uTime.value = time;
    this.starMat.uniforms.uFade.value = fade;
    this.galaxyMat.uniforms.uFade.value = fade;
    if (this.namedMat) {
      this.namedMat.uniforms.uPixelRatio.value = pixelRatio;
      this.namedMat.uniforms.uTime.value = time;
      this.namedMat.uniforms.uFade.value = fade;
    }
  }
}

function pickClass(rand: () => number): string {
  let r = rand();
  for (const [cls, w] of CLASS_WEIGHTS) {
    if (r < w) return cls;
    r -= w;
  }
  return 'K';
}
