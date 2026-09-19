import * as THREE from 'three';

/**
 * Exploration camera: orbits the spacecraft. Yaw/pitch come from pointer drag, distance from
 * the wheel (logarithmic). Only the orbit parameters are smoothed, never the pivot, so the
 * camera never lags behind a fast-moving ship.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = 0.18;
  distance = 0.6;
  minDistance = 0.16;
  maxDistance = 12_000;
  private targetYaw = 0;
  private targetPitch = 0.18;
  private targetDistance = 0.6;
  private readonly offset = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.002, 1_000_000);
  }

  /** Point the camera so that it sits on the far side of the ship from `lookDir`; `pitchOffset` < 0 lifts the target on screen. */
  setLookDirection(lookDir: THREE.Vector3, pitchOffset = 0.12): void {
    const off = lookDir.clone().multiplyScalar(-1).normalize();
    this.targetYaw = Math.atan2(off.x, off.z);
    this.targetPitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(off.y, -0.999, 0.999)) + pitchOffset, -1.4, 1.4);
    this.yaw = this.targetYaw;
    this.pitch = this.targetPitch;
  }

  setDistance(d: number, immediate = false): void {
    this.targetDistance = THREE.MathUtils.clamp(d, this.minDistance, this.maxDistance);
    if (immediate) this.distance = this.targetDistance;
  }

  applyInput(dx: number, dy: number, wheel: number): void {
    this.targetYaw -= dx * 0.0042;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.0036, -1.45, 1.45);
    if (wheel !== 0) this.targetDistance = THREE.MathUtils.clamp(this.targetDistance * Math.exp(wheel * 0.0014), this.minDistance, this.maxDistance);
  }

  /** Direction the camera is looking (unit vector, world space). */
  forward(out = new THREE.Vector3()): THREE.Vector3 {
    return this.camera.getWorldDirection(out);
  }

  update(pivot: THREE.Vector3, dt: number): void {
    const k = 1 - Math.exp(-dt * 9);
    this.yaw += (this.targetYaw - this.yaw) * k;
    this.pitch += (this.targetPitch - this.pitch) * k;
    this.distance = Math.exp(Math.log(this.distance) + (Math.log(this.targetDistance) - Math.log(this.distance)) * k);
    const cp = Math.cos(this.pitch);
    this.offset.set(cp * Math.sin(this.yaw), Math.sin(this.pitch), cp * Math.cos(this.yaw)).multiplyScalar(this.distance);
    this.camera.position.copy(pivot).add(this.offset);
    this.camera.up.copy(this.up);
    this.camera.lookAt(pivot);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
