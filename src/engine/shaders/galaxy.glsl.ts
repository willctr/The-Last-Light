import { NOISE_GLSL } from './noise.glsl';

/** Diffuse Milky Way band, rendered on a camera-attached sky sphere. */
export const GALAXY_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uGalPole;
uniform vec3 uGalCentre;
uniform float uFade;
varying vec3 vDir;
${NOISE_GLSL}
void main() {
  vec3 d = normalize(vDir);
  float lat = asin(clamp(dot(d, uGalPole), -1.0, 1.0));
  vec3 third = cross(uGalPole, uGalCentre);
  float lon = atan(dot(d, third), dot(d, uGalCentre));
  float bulge = exp(-pow(lon / 0.9, 2.0)) * 0.9 + 0.35;
  float width = 0.11 + 0.08 * bulge;
  float band = exp(-pow(lat / width, 2.0));
  float dust = fbm(d * 6.0 + 3.0, 5);
  float lanes = smoothstep(-0.05, 0.45, dust);
  float clouds = 0.6 + 0.4 * fbm(d * 2.5 - 7.0, 4);
  float glow = band * bulge * clouds * (0.55 + 0.45 * lanes);
  vec3 warm = vec3(1.0, 0.86, 0.68);
  vec3 cool = vec3(0.55, 0.65, 0.9);
  vec3 col = mix(cool, warm, bulge * 0.6) * glow * 0.2;
  float faint = 0.012 * (0.5 + 0.5 * fbm(d * 1.5, 3));
  gl_FragColor = vec4((col + faint * vec3(0.5, 0.6, 0.9)) * uFade, 1.0);
}
`;
