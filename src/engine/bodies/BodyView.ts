import * as THREE from 'three';
import type { CelestialBody, SurfaceShader } from '@/data/types';
import { ATMOSPHERE_FRAGMENT, ATMOSPHERE_VERTEX, PLANET_FRAGMENT, PLANET_VERTEX } from '../shaders/planet.glsl';
import { CORONA_FRAGMENT, CORONA_VERTEX, SUN_FRAGMENT, SUN_VERTEX } from '../shaders/sun.glsl';
import { RINGS_FRAGMENT, RINGS_VERTEX } from '../shaders/rings.glsl';
import { DEG } from '@/science/units';

const KIND: Record<SurfaceShader, number> = {
  sun: -1,
  rocky: 0,
  earth: 1,
  venus: 2,
  gas: 3,
  'ice-giant': 4,
  'ice-moon': 5,
  titan: 6,
  io: 7,
  pluto: 8,
};

const sphereHi = new THREE.SphereGeometry(1, 96, 64);
const sphereLo = new THREE.SphereGeometry(1, 48, 32);

/**
 * Renders one celestial body: a tilt group (axial tilt), a spinning surface mesh with the
 * procedural shader, an optional atmosphere shell and rings. Positions are in visual units.
 */
export class BodyView {
  readonly body: CelestialBody;
  readonly root = new THREE.Group();
  readonly tilt = new THREE.Group();
  readonly mesh: THREE.Mesh;
  readonly visRadius: number;
  readonly material: THREE.ShaderMaterial;
  readonly atmosphere: THREE.Mesh | null = null;
  readonly rings: THREE.Mesh | null = null;
  readonly corona: THREE.Mesh | null = null;
  private readonly atmoMat: THREE.ShaderMaterial | null = null;
  private readonly ringMat: THREE.ShaderMaterial | null = null;
  private readonly coronaMat: THREE.ShaderMaterial | null = null;

  constructor(body: CelestialBody, visRadius: number) {
    this.body = body;
    this.visRadius = visRadius;
    const v = body.visual;
    const isSun = v.shader === 'sun';
    const geo = visRadius > 0.4 ? sphereHi : sphereLo;

    if (isSun) {
      this.material = new THREE.ShaderMaterial({
        vertexShader: SUN_VERTEX,
        fragmentShader: SUN_FRAGMENT,
        uniforms: {
          uColorA: { value: new THREE.Color(...v.colors[0]) },
          uColorB: { value: new THREE.Color(...v.colors[1]) },
          uColorC: { value: new THREE.Color(...v.colors[2]) },
          uTime: { value: 0 },
          uIntensity: { value: v.emissive ?? 2 },
          uCameraPos: { value: new THREE.Vector3() },
        },
      });
      this.coronaMat = new THREE.ShaderMaterial({
        vertexShader: CORONA_VERTEX,
        fragmentShader: CORONA_FRAGMENT,
        uniforms: {
          uColor: { value: new THREE.Color(1.0, 0.72, 0.4) },
          uTime: { value: 0 },
          uIntensity: { value: 1.6 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.corona = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.coronaMat);
      this.corona.scale.setScalar(visRadius * 7);
      this.corona.renderOrder = 5;
      this.root.add(this.corona);
    } else {
      this.material = new THREE.ShaderMaterial({
        vertexShader: PLANET_VERTEX,
        fragmentShader: PLANET_FRAGMENT,
        uniforms: {
          uColorA: { value: new THREE.Color(...v.colors[0]) },
          uColorB: { value: new THREE.Color(...v.colors[1]) },
          uColorC: { value: new THREE.Color(...v.colors[2]) },
          uKind: { value: KIND[v.shader] },
          uSeed: { value: v.seed },
          uNoiseScale: { value: v.noiseScale ?? 3 },
          uBands: { value: v.bands ?? 6 },
          uIceCap: { value: v.iceCap ?? 0 },
          uAlbedo: { value: v.albedo ?? 1 },
          uSpot: { value: body.id === 'jupiter' ? 1 : 0 },
          uStripe: { value: body.id === 'europa' ? 1 : body.id === 'enceladus' ? 2 : 0 },
          uSunPos: { value: new THREE.Vector3() },
          uAtmoColor: { value: new THREE.Color(...(v.atmosphere?.color ?? [0, 0, 0])) },
          uAtmoStrength: { value: v.atmosphere?.strength ?? 0 },
          uTime: { value: 0 },
          uCameraPos: { value: new THREE.Vector3() },
        },
      });
      if (v.atmosphere && v.atmosphere.strength > 0.2) {
        this.atmoMat = new THREE.ShaderMaterial({
          vertexShader: ATMOSPHERE_VERTEX,
          fragmentShader: ATMOSPHERE_FRAGMENT,
          uniforms: {
            uColor: { value: new THREE.Color(...v.atmosphere.color) },
            uStrength: { value: v.atmosphere.strength },
            uRatio: { value: 1 / (1 + v.atmosphere.height * 2.2) },
            uSunPos: { value: new THREE.Vector3() },
            uCameraPos: { value: new THREE.Vector3() },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.FrontSide,
        });
        this.atmosphere = new THREE.Mesh(geo, this.atmoMat);
        this.atmosphere.scale.setScalar(visRadius * (1 + v.atmosphere.height * 2.2));
        this.atmosphere.renderOrder = 3;
        this.root.add(this.atmosphere);
      }
      if (v.rings) {
        const inner = (v.rings.innerKm / body.radiusKm) * visRadius;
        const outer = (v.rings.outerKm / body.radiusKm) * visRadius;
        this.ringMat = new THREE.ShaderMaterial({
          vertexShader: RINGS_VERTEX,
          fragmentShader: RINGS_FRAGMENT,
          uniforms: {
            uInner: { value: inner },
            uOuter: { value: outer },
            uColor: { value: new THREE.Color(...v.rings.color) },
            uSunPos: { value: new THREE.Vector3() },
            uPlanetPos: { value: new THREE.Vector3() },
            uPlanetRadius: { value: visRadius },
            uSeed: { value: v.seed },
          },
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        this.rings = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 256, 6), this.ringMat);
        this.rings.rotation.x = -Math.PI / 2;
        this.rings.renderOrder = 2;
        this.tilt.add(this.rings);
      }
    }

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.scale.setScalar(visRadius);
    this.mesh.userData.bodyId = body.id;
    this.tilt.rotation.x = (body.axialTiltDeg ?? 0) * DEG;
    this.tilt.add(this.mesh);
    this.root.add(this.tilt);
    this.root.userData.bodyId = body.id;
  }

  /** Spin angle (radians) at the given simulation time (seconds since J2000). */
  spinAngle(simTime: number): number {
    const p = this.body.rotationPeriodDays;
    if (!p) return 0;
    return ((simTime / 86400) / p) * Math.PI * 2;
  }

  update(sunPos: THREE.Vector3, cameraPos: THREE.Vector3, cameraQuat: THREE.Quaternion, time: number, simTime: number): void {
    this.mesh.rotation.y = this.spinAngle(simTime);
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uCameraPos.value.copy(cameraPos);
    if (u.uSunPos) u.uSunPos.value.copy(sunPos);
    if (this.atmoMat) {
      this.atmoMat.uniforms.uSunPos.value.copy(sunPos);
      this.atmoMat.uniforms.uCameraPos.value.copy(cameraPos);
    }
    if (this.ringMat) {
      this.ringMat.uniforms.uSunPos.value.copy(sunPos);
      this.root.getWorldPosition(this.ringMat.uniforms.uPlanetPos.value);
    }
    if (this.corona && this.coronaMat) {
      this.corona.quaternion.copy(cameraQuat);
      this.coronaMat.uniforms.uTime.value = time;
    }
  }

  setVisible(v: boolean): void {
    this.root.visible = v;
  }
}
