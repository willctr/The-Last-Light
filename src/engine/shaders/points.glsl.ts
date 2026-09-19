/** Shaders for GPU point clouds: background stars and belt particles. */
export const STAR_VERTEX = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aTwinkle;
uniform float uPixelRatio;
uniform float uTime;
uniform float uFade;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  float tw = 0.85 + 0.15 * sin(uTime * (0.8 + aTwinkle * 2.0) + aTwinkle * 40.0);
  vAlpha = uFade * tw;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio * tw;
  gl_Position = projectionMatrix * mv;
}
`;

export const STAR_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = smoothstep(1.0, 0.15, r);
  a = a * a;
  gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);
}
`;

export const BELT_VERTEX = /* glsl */ `
attribute float aSize;
attribute float aShade;
uniform float uPixelRatio;
uniform float uFade;
varying float vShade;
varying float vAlpha;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vShade = aShade;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = max(length(mv.xyz), 0.001);
  float px = aSize * uPixelRatio * 320.0 / dist;
  gl_PointSize = clamp(px, 1.0, 4.5 * uPixelRatio);
  vAlpha = uFade * clamp(px / 1.2, 0.15, 1.0);
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}
`;

export const BELT_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColor;
varying float vShade;
varying float vAlpha;
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  if (r > 1.0) discard;
  float a = smoothstep(1.0, 0.3, r) * vAlpha;
  gl_FragColor = vec4(uColor * (0.6 + 0.4 * vShade) * a, a);
}
`;

export const GALAXY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
