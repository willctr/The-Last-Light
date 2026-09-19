import { NOISE_GLSL } from './noise.glsl';

export const RINGS_VERTEX = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vRadius;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vRadius = length(position.xy);
  vWorldNormal = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}
`;

export const RINGS_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uInner;
uniform float uOuter;
uniform vec3 uColor;
uniform vec3 uSunPos;
uniform vec3 uPlanetPos;
uniform float uPlanetRadius;
uniform float uSeed;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vRadius;
#include <logdepthbuf_pars_fragment>
${NOISE_GLSL}

float bandDensity(float t) {
  // t in [0,1] from inner to outer edge. Saturn-like structure: C, B, Cassini division, A, Encke gap, F ring.
  float d = 0.0;
  d += 0.32 * smoothstep(0.0, 0.03, t) * (1.0 - smoothstep(0.24, 0.27, t));
  d += 0.95 * smoothstep(0.26, 0.28, t) * (1.0 - smoothstep(0.63, 0.66, t));
  d += 0.06 * smoothstep(0.65, 0.66, t) * (1.0 - smoothstep(0.72, 0.73, t));
  d += 0.72 * smoothstep(0.72, 0.735, t) * (1.0 - smoothstep(0.935, 0.95, t));
  d *= 1.0 - 0.9 * smoothstep(0.898, 0.902, t) * (1.0 - smoothstep(0.906, 0.91, t));
  d += 0.35 * smoothstep(0.985, 0.99, t) * (1.0 - smoothstep(0.993, 0.998, t));
  float fine = 0.75 + 0.25 * snoise(vec3(t * 160.0, uSeed, 0.0)) + 0.12 * snoise(vec3(t * 700.0, uSeed * 2.0, 1.0));
  return clamp(d * fine, 0.0, 1.0);
}

void main() {
  #include <logdepthbuf_fragment>
  float t = clamp((vRadius - uInner) / (uOuter - uInner), 0.0, 1.0);
  float dens = bandDensity(t);
  if (dens < 0.01) discard;
  vec3 L = normalize(uSunPos - vWorldPos);
  vec3 N = normalize(vWorldNormal);
  float lit = abs(dot(N, L)) * 0.85 + 0.15;
  // planet shadow: does the ray toward the sun pass through the planet?
  vec3 toC = uPlanetPos - vWorldPos;
  float along = dot(toC, L);
  float perp = length(toC - along * L);
  float shadow = along > 0.0 ? smoothstep(uPlanetRadius * 0.96, uPlanetRadius * 1.02, perp) : 1.0;
  vec3 tint = mix(uColor * 0.75, uColor * 1.05, smoothstep(0.2, 0.8, t));
  tint = mix(tint, vec3(0.62, 0.58, 0.5), 0.35 * smoothstep(0.0, 0.26, t) * (1.0 - smoothstep(0.26, 0.3, t)));
  vec3 col = tint * lit * (0.18 + 0.82 * shadow);
  gl_FragColor = vec4(col, dens * 0.95);
}
`;
