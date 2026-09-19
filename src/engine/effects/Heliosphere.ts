import * as THREE from 'three';
import { NOISE_GLSL } from '../shaders/noise.glsl';
import { helioRadiusToVisual } from '@/science/scale';
import { eclToThree } from '../frames';

const NOSE_ECL: [number, number, number] = [-0.258, -0.962, 0.087];

const VERT = /* glsl */ `
uniform vec3 uNose;
uniform float uTime;
varying vec3 vN;
varying vec3 vWorld;
varying float vTail;
#include <common>
#include <logdepthbuf_pars_vertex>
${NOISE_GLSL}
void main() {
  vec3 d = normalize(position);
  float tail = smoothstep(0.1, -0.9, dot(d, uNose));
  float ripple = 1.0 + 0.03 * snoise(d * 4.0 + uTime * 0.01);
  vec3 p = d * (1.0 + 0.9 * tail) * ripple;
  vTail = tail;
  vN = normalize(mat3(modelMatrix) * d);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uCameraPos;
uniform float uTime;
varying vec3 vN;
varying vec3 vWorld;
varying float vTail;
#include <logdepthbuf_pars_fragment>
${NOISE_GLSL}
void main() {
  #include <logdepthbuf_fragment>
  vec3 V = normalize(uCameraPos - vWorld);
  float ndv = abs(dot(normalize(vN), V));
  float rim = pow(1.0 - ndv, 2.2);
  float n = 0.6 + 0.4 * fbm(normalize(vN) * 3.0 + uTime * 0.005, 3);
  float a = (0.05 + 0.35 * rim) * n * (1.0 - 0.5 * vTail);
  vec3 col = mix(vec3(0.25, 0.5, 0.85), vec3(0.6, 0.4, 0.7), vTail);
  gl_FragColor = vec4(col * a, a * 0.5);
}
`;

/** Conceptual heliopause: a faint asymmetric bubble at ~120 AU with a tail away from the nose direction. */
export class Heliosphere {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  readonly radiusVis: number;

  constructor(radiusAU = 120) {
    this.radiusVis = helioRadiusToVisual(radiusAU);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uNose: { value: eclToThree(NOSE_ECL).normalize() },
        uTime: { value: 0 },
        uCameraPos: { value: new THREE.Vector3() },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), this.material);
    this.mesh.scale.setScalar(this.radiusVis);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
  }

  update(time: number, cameraPos: THREE.Vector3): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uCameraPos.value.copy(cameraPos);
  }
}
