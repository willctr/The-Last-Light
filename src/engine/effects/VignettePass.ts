import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/** Subtle vignette and film grain: keeps the black of space from reading as a flat void. */
export function createVignettePass(): ShaderPass {
  const shader = {
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uWarp: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uWarp;
      varying vec2 vUv;
      void main() {
        vec2 d = vUv - 0.5;
        float r = length(d);
        // faint chromatic spread when time is heavily accelerated
        vec2 shift = d * uWarp * 0.004;
        vec3 c;
        c.r = texture2D(tDiffuse, vUv + shift).r;
        c.g = texture2D(tDiffuse, vUv).g;
        c.b = texture2D(tDiffuse, vUv - shift).b;
        float vig = smoothstep(0.98, 0.3, r * 1.2);
        c *= 0.82 + 0.18 * vig;
        float g = fract(sin(dot(floor(vUv * uResolution) + fract(uTime) * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
        c += (g - 0.5) * 0.018;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  };
  return new ShaderPass(shader);
}
