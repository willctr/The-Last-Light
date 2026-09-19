import * as THREE from 'three';
import type { Region } from '@/data/types';
import { compressHelio } from '@/science/scale';
import { GM_SUN_KM3_S2, AU_KM } from '@/science/units';
import { gaussian, mulberry32, eclToThree } from '../frames';
import { BELT_FRAGMENT, BELT_VERTEX } from '../shaders/points.glsl';

/**
 * GPU point cloud for a diffuse region (asteroid belt, Kuiper belt, Oort cloud shell).
 * The whole cloud rotates rigidly at the mean orbital rate of its middle radius — a visual
 * approximation of collective motion, not a per-particle ephemeris.
 */
export class ParticleBelt {
  readonly region: Region;
  readonly points: THREE.Points;
  readonly group = new THREE.Group();
  readonly material: THREE.ShaderMaterial;
  private readonly meanMotion: number; // rad/s

  constructor(region: Region, seed: number) {
    this.region = region;
    const n = region.particleCount ?? 5000;
    const rand = mulberry32(seed);
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const shade = new Float32Array(n);
    const inner = region.innerAU;
    const outer = region.outerAU;
    for (let i = 0; i < n; i++) {
      let x: number;
      let y: number;
      let z: number;
      if (region.kind === 'shell') {
        const u = rand();
        const r = Math.exp(Math.log(inner) + (Math.log(outer) - Math.log(inner)) * u);
        const cosT = 2 * rand() - 1;
        const sinT = Math.sqrt(1 - cosT * cosT);
        const phi = rand() * Math.PI * 2;
        x = r * sinT * Math.cos(phi);
        y = r * sinT * Math.sin(phi);
        z = r * cosT;
      } else {
        const t = (rand() + rand()) / 2; // triangular: denser in the middle
        const r = inner + (outer - inner) * t;
        const ang = rand() * Math.PI * 2;
        const thick = (region.thicknessAU ?? 0.2) * 0.5;
        x = r * Math.cos(ang);
        y = r * Math.sin(ang);
        z = gaussian(rand) * thick * (0.6 + 0.8 * t);
      }
      const vis = compressHelio([x, y, z]);
      const p = eclToThree(vis);
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      size[i] = 0.4 + Math.pow(rand(), 3) * 1.6;
      shade[i] = rand();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aShade', new THREE.BufferAttribute(shade, 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: BELT_VERTEX,
      fragmentShader: BELT_FRAGMENT,
      uniforms: {
        uPixelRatio: { value: 1 },
        uFade: { value: region.kind === 'shell' ? 0.35 : 0.75 },
        uColor: { value: new THREE.Color(...region.color) },
      },
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
    const rMid = ((inner + outer) / 2) * AU_KM;
    this.meanMotion = region.kind === 'shell' ? 0 : Math.sqrt(GM_SUN_KM3_S2 / (rMid * rMid * rMid));
  }

  update(simTime: number, pixelRatio: number): void {
    this.group.rotation.y = this.meanMotion * simTime;
    this.material.uniforms.uPixelRatio.value = pixelRatio;
  }
}
