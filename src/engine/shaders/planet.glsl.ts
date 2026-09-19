import { NOISE_GLSL } from './noise.glsl';

export const PLANET_VERTEX = /* glsl */ `
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

/**
 * Procedural surface shader. `uKind` selects the surface family:
 * 0 rocky · 1 earth · 2 venus · 3 gas giant · 4 ice giant · 5 ice moon · 6 titan · 7 io · 8 pluto
 */
export const PLANET_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform int uKind;
uniform float uSeed;
uniform float uNoiseScale;
uniform float uBands;
uniform float uIceCap;
uniform float uAlbedo;
uniform float uSpot;
uniform float uStripe;
uniform vec3 uSunPos;
uniform vec3 uAtmoColor;
uniform float uAtmoStrength;
uniform float uTime;
uniform vec3 uCameraPos;
varying vec3 vObj;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
#include <logdepthbuf_pars_fragment>
${NOISE_GLSL}

vec3 capMix(vec3 col, vec3 p, float cap, float n) {
  if (cap <= 0.0) return col;
  float lat = abs(p.y);
  float edge = 1.0 - cap;
  float c = smoothstep(edge - 0.04, edge + 0.04, lat + 0.06 * n);
  return mix(col, vec3(0.93, 0.95, 0.97), c);
}

void main() {
  #include <logdepthbuf_fragment>
  vec3 p = vObj;
  vec3 sp = p * uNoiseScale + vec3(uSeed * 7.31, uSeed * 3.17, uSeed * 1.93);
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(uCameraPos - vWorldPos);
  float ndl = dot(N, L);
  float diff = smoothstep(-0.08, 0.35, ndl) * max(ndl, 0.0) * 0.85 + smoothstep(-0.1, 0.3, ndl) * 0.15;
  vec3 col = uColorA;
  float spec = 0.0;
  float specPow = 40.0;
  vec3 night = vec3(0.0);

  if (uKind == 0) {
    float h = fbm(sp, 6);
    float h2 = ridged(sp * 2.3 + 11.0, 4);
    col = mix(uColorB, uColorA, smoothstep(-0.35, 0.35, h));
    col = mix(col, uColorC, smoothstep(0.78, 0.95, h2) * 0.6);
    float crater = smoothstep(0.62, 0.75, snoise(sp * 5.0 + 3.0)) * smoothstep(0.3, 0.0, h);
    col *= 1.0 - 0.25 * crater;
    col = capMix(col, p, uIceCap, h);
  } else if (uKind == 1) {
    float c = fbm(sp, 7) + 0.35 * fbm(sp * 3.1 + 40.0, 4);
    float land = smoothstep(0.03, 0.09, c);
    float elev = smoothstep(0.03, 0.6, c);
    float lat = abs(p.y);
    vec3 ocean = mix(uColorA * 1.15, uColorA * 0.55, smoothstep(-0.4, 0.0, c));
    vec3 lowland = uColorB;
    vec3 desert = vec3(0.55, 0.45, 0.25);
    vec3 mountain = vec3(0.36, 0.3, 0.22);
    float dry = smoothstep(0.15, 0.4, abs(snoise(sp * 1.7 + 9.0))) * (1.0 - smoothstep(0.35, 0.7, lat));
    vec3 landCol = mix(mix(lowland, desert, dry), mountain, smoothstep(0.35, 0.8, elev));
    float snow = smoothstep(0.72, 0.9, lat + 0.25 * elev + 0.05 * snoise(sp * 4.0));
    landCol = mix(landCol, vec3(0.92, 0.94, 0.96), snow);
    col = mix(ocean, landCol, land);
    col = capMix(col, p, uIceCap, snoise(sp * 3.0));
    spec = (1.0 - land) * 0.9;
    specPow = 90.0;
    float cl = fbm(sp * 1.6 + vec3(uTime * 0.004, 0.0, uTime * 0.0015) + 100.0, 6);
    float cloud = smoothstep(0.08, 0.5, cl + 0.15 * snoise(sp * 6.0));
    col = mix(col, uColorC, cloud * 0.9);
    spec *= 1.0 - cloud;
    float lights = smoothstep(0.55, 0.85, snoise(sp * 9.0 + 77.0)) * land * (1.0 - snow) * (1.0 - cloud * 0.7);
    night = vec3(1.0, 0.75, 0.42) * lights * 0.35;
  } else if (uKind == 2) {
    float lat = p.y;
    float w = fbm(sp * 0.8 + vec3(uTime * 0.003, 0.0, 0.0), 5);
    float band = sin((lat + 0.25 * w) * 7.0 + 0.6 * sin(lat * 4.0 + w));
    float swirl = fbm(sp * 2.5 + vec3(0.0, uTime * 0.002, 0.0) + 3.0 * w, 5);
    col = mix(uColorA, uColorB, smoothstep(-0.5, 0.6, band) * 0.6);
    col = mix(col, uColorC, smoothstep(0.1, 0.55, swirl) * 0.5);
    float polar = smoothstep(0.75, 0.95, abs(lat));
    col = mix(col, uColorB * 0.9, polar * 0.4);
  } else if (uKind == 3) {
    float lat = p.y;
    float w = fbm(sp + vec3(uTime * 0.0015, 0.0, 0.0), 5);
    float w2 = fbm(sp * 3.0 + 20.0 + vec3(uTime * 0.003, 0.0, 0.0), 4);
    float band = sin((lat + 0.12 * w) * uBands * 3.14159 + 0.4 * sin(lat * 5.0 + 2.0 * w));
    float band2 = sin((lat + 0.05 * w2) * uBands * 6.28318 + 1.3);
    col = mix(uColorA, uColorB, smoothstep(-0.55, 0.55, band));
    col = mix(col, uColorC, smoothstep(0.3, 0.9, band2) * 0.3);
    col = mix(col, uColorB * 0.8, smoothstep(0.25, 0.6, w2) * 0.25);
    float polar = smoothstep(0.8, 1.0, abs(lat));
    col = mix(col, uColorB * 0.85, polar * 0.5);
    if (uSpot > 0.5) {
      float lon = atan(p.z, p.x);
      vec2 d = vec2((lon - 0.9) * 0.8, (lat + 0.32) * 2.6);
      float spot = smoothstep(0.32, 0.18, length(d) + 0.04 * snoise(sp * 6.0));
      vec3 spotCol = vec3(0.72, 0.36, 0.26);
      float ring = smoothstep(0.2, 0.26, length(d)) * smoothstep(0.34, 0.28, length(d));
      col = mix(col, spotCol, spot * 0.85);
      col = mix(col, uColorC, ring * 0.35);
    }
  } else if (uKind == 4) {
    float lat = p.y;
    float w = fbm(sp * 0.7 + vec3(uTime * 0.001, 0.0, 0.0), 4);
    float band = sin((lat + 0.08 * w) * uBands * 3.14159);
    col = mix(uColorB, uColorA, 0.5 + 0.5 * lat * 0.4 + 0.2 * band);
    col = mix(col, uColorC, smoothstep(0.2, 0.7, fbm(sp * 2.0 + 5.0, 4)) * 0.18);
    float polar = smoothstep(0.7, 1.0, abs(lat));
    col = mix(col, uColorC, polar * 0.25);
    spec = 0.15;
  } else if (uKind == 5) {
    float h = fbm(sp, 5);
    col = mix(uColorA * 0.92, uColorC, smoothstep(-0.3, 0.5, h));
    float crater = smoothstep(0.6, 0.8, snoise(sp * 4.0 + 8.0)) * 0.3;
    col *= 1.0 - crater;
    if (uStripe > 0.5) {
      float mask = uStripe > 1.5 ? smoothstep(-0.55, -0.75, p.y) : 1.0;
      float r1 = 1.0 - abs(snoise(sp * 1.5 + 30.0));
      float r2 = 1.0 - abs(snoise(sp * 3.5 + 60.0));
      float lines = smoothstep(0.93, 0.995, r1) + 0.7 * smoothstep(0.95, 0.997, r2);
      col = mix(col, uColorB, clamp(lines, 0.0, 1.0) * mask * 0.85);
    }
    spec = 0.35;
    specPow = 30.0;
  } else if (uKind == 6) {
    float w = fbm(sp * 0.9 + vec3(uTime * 0.002, 0.0, 0.0), 4);
    col = mix(uColorB, uColorA, 0.5 + 0.35 * w);
    col = mix(col, uColorC, smoothstep(0.55, 0.9, p.y) * 0.4);
    col = mix(col, uColorB * 0.8, smoothstep(-0.6, -0.95, p.y) * 0.4);
  } else if (uKind == 7) {
    float h = fbm(sp, 6);
    float h2 = snoise(sp * 3.0 + 50.0);
    col = mix(uColorA, uColorB, smoothstep(-0.2, 0.5, h));
    col = mix(col, uColorC, smoothstep(0.35, 0.7, h2) * 0.6);
    float caldera = smoothstep(0.66, 0.8, snoise(sp * 5.0 + 90.0));
    col = mix(col, vec3(0.12, 0.08, 0.06), caldera);
    float polarFrost = smoothstep(0.6, 0.95, abs(p.y));
    col = mix(col, uColorC, polarFrost * 0.35);
  } else {
    float h = fbm(sp, 6);
    col = mix(uColorB, uColorA, smoothstep(-0.4, 0.4, h));
    vec3 heartDir = normalize(vec3(0.62, -0.18, 0.76));
    float heart = smoothstep(0.42, 0.28, distance(p, heartDir) + 0.06 * snoise(sp * 3.0));
    col = mix(col, uColorC, heart * 0.95);
    float dark = smoothstep(0.55, 0.8, snoise(sp * 1.4 + 70.0)) * (1.0 - heart);
    col = mix(col, uColorB * 0.55, dark * 0.7);
    spec = 0.2;
  }

  col *= uAlbedo;
  vec3 H = normalize(L + V);
  float s = spec * pow(max(dot(N, H), 0.0), specPow) * max(ndl, 0.0);
  float ambient = 0.012;
  vec3 lit = col * (diff + ambient) + vec3(1.0, 0.95, 0.85) * s;
  float darkSide = smoothstep(0.05, -0.15, ndl);
  lit += night * darkSide;

  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  vec3 atmo = uAtmoColor * uAtmoStrength * fres * (0.25 + 0.75 * smoothstep(-0.25, 0.4, ndl));
  lit += atmo * 0.6;

  gl_FragColor = vec4(lit, 1.0);
}
`;

export const ATMOSPHERE_VERTEX = /* glsl */ `
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}
`;

/**
 * Atmosphere halo on a shell slightly larger than the planet. `uRatio` = planet radius / shell
 * radius. The glow peaks at the planet's limb, fades to zero at the shell's silhouette (so there is
 * no hard outer edge) and thins toward the disc centre as a light haze.
 */
export const ATMOSPHERE_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uStrength;
uniform float uRatio;
uniform vec3 uSunPos;
uniform vec3 uCameraPos;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 L = normalize(uSunPos - vWorldPos);
  float ndv = max(dot(N, V), 0.0);
  float limb = sqrt(max(1.0 - uRatio * uRatio, 1e-4));
  float outer = pow(smoothstep(0.0, limb, ndv), 1.5);
  float inner = pow(1.0 - smoothstep(limb, 1.0, ndv), 2.5);
  float shape = ndv < limb ? outer : 0.4 * inner;
  float lit = 0.12 + 0.88 * smoothstep(-0.3, 0.5, dot(N, L));
  float a = shape * uStrength * lit;
  gl_FragColor = vec4(uColor * a * 1.3, a);
}
`;
