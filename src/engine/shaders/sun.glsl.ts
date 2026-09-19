import { NOISE_GLSL } from './noise.glsl';

export const SUN_VERTEX = /* glsl */ `
varying vec3 vObj;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vObj = normalize(position);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}
`;

export const SUN_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uTime;
uniform float uIntensity;
uniform vec3 uCameraPos;
varying vec3 vObj;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
#include <logdepthbuf_pars_fragment>
${NOISE_GLSL}
void main() {
  #include <logdepthbuf_fragment>
  vec3 p = vObj;
  float t = uTime * 0.03;
  float g1 = fbm(p * 7.0 + vec3(t, -t * 0.7, t * 0.3), 5);
  float g2 = fbm(p * 18.0 + vec3(-t * 1.3, t, 0.0), 4);
  float gran = 0.55 + 0.45 * g1 + 0.25 * g2;
  vec3 col = mix(uColorB, uColorA, clamp(gran, 0.0, 1.0));
  col = mix(col, uColorC, smoothstep(0.75, 1.1, gran) * 0.6);
  float spots = smoothstep(0.55, 0.75, snoise(p * 4.0 + vec3(t * 0.2))) * smoothstep(0.3, 0.6, snoise(p * 9.0 - 3.0));
  col = mix(col, uColorB * 0.35, spots * 0.9);
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  float mu = max(dot(N, V), 0.0);
  float limb = 0.35 + 0.65 * pow(mu, 0.55);
  gl_FragColor = vec4(col * limb * uIntensity, 1.0);
}
`;

export const CORONA_VERTEX = /* glsl */ `
varying vec2 vUv;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}
`;

export const CORONA_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;
#include <logdepthbuf_pars_fragment>
${NOISE_GLSL}
void main() {
  #include <logdepthbuf_fragment>
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float ang = atan(c.y, c.x);
  float streaks = 0.75 + 0.25 * snoise(vec3(ang * 3.0, r * 6.0 - uTime * 0.05, uTime * 0.02));
  float glow = pow(max(1.0 - r, 0.0), 2.2) * streaks;
  float halo = exp(-r * 4.5) * 0.9;
  float a = clamp(glow * 0.8 + halo, 0.0, 1.0);
  gl_FragColor = vec4(uColor * a * uIntensity, a);
}
`;
