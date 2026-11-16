// The one holographic look: iridescent edge lines and a dissolving fill. Shared by the facade's dream half,
// the brick band, and (later phases) the intro build, the demo cards and the secret doors.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// Shared uniforms. dress.js moves them every frame.
export const HOLO = {
  time: { value: 0 },
  boundary: { value: 6.6 }, // world height where the building stops being solid and starts being imagined
  flip: { value: 0 }, // 1 at purple-sky time: the lower half glows and the upper half goes solid
  dream: { value: 0 }, // 1 while the water draws its reflection, which always shows the whole dream; otherwise it rests at `base`
  base: { value: 0 }, // 1 during the intro, when every outline shows
};

// Thin-film colours: cyan, violet, pink, gold, and round again.
const RAMP = `vec3 holoRamp(float t){ t = fract(t) * 4.0;
  vec3 a = vec3(0.2, 0.85, 1.0), b = vec3(0.55, 0.35, 1.0), c = vec3(1.0, 0.35, 0.72), d = vec3(1.0, 0.72, 0.22);
  return t < 1.0 ? mix(a, b, t) : t < 2.0 ? mix(b, c, t - 1.0) : t < 3.0 ? mix(c, d, t - 2.0) : mix(d, a, t - 3.0); }`;

const edgeMats = {};
// Edge lines of a geometry, a few pixels wide. They show above the boundary, everywhere in the reflection, or always with `everywhere`.
// The colour comes from the ramp, by view angle, height and time; three's own line shader does the width.
// `fade` is an optional { value } that the caller animates; such lines get a material of their own.
export function holoEdges(geometry, { angle = 30, everywhere = false, opacity = 0.95, fade } = {}) {
  const make = () => {
    const m = new LineMaterial({ linewidth: 2.2, transparent: true, depthWrite: false });
    Object.assign(m.uniforms, { hTime: HOLO.time, hBoundary: HOLO.boundary, hFlip: HOLO.flip, hDream: HOLO.dream, hEverywhere: { value: everywhere ? 1 : 0 }, hOpacity: fade || { value: opacity } });
    m.vertexShader = m.vertexShader.replace('void main() {', 'varying vec3 vHW;\nvoid main() {\n vHW = (modelMatrix * vec4(position.y < 0.5 ? instanceStart : instanceEnd, 1.0)).xyz;');
    m.fragmentShader = m.fragmentShader
      .replace('void main() {', `uniform float hTime, hBoundary, hFlip, hDream, hEverywhere, hOpacity; varying vec3 vHW; ${RAMP}\nvoid main() {`)
      .replace('vec4 diffuseColor = vec4( diffuse, alpha );', `float hUp = smoothstep(hBoundary - 0.8, hBoundary + 0.8, vHW.y);
        float hA = max(max(hEverywhere, hDream), mix(hUp, 1.0 - hUp, hFlip));
        alpha *= hA * hOpacity; // three's line shader writes \`alpha\` itself, not diffuseColor.a
        vec4 diffuseColor = vec4(holoRamp(dot(normalize(vHW - cameraPosition), vec3(0.9, 0.6, 0.5)) * 1.4 + vHW.y * 0.06 + hTime * 0.05) * 0.85, alpha);`);
    return m;
  };
  const mat = fade ? make() : (edgeMats[`${everywhere}:${opacity}`] ||= make());
  return new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geometry, angle)), mat);
}

// A see-through iridescent fill. `reveal` 0 to 1 dissolves it in through noise, with a bright rim at the dissolve edge.
// `floor` is an optional { value }: nothing is drawn below that world height (the intro's scan line).
export function holoFill({ reveal = { value: 1 }, opacity = 0.3, floor = { value: -1e3 } } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { time: HOLO.time, uReveal: reveal, uFloor: floor, opacity: { value: opacity } },
    vertexShader: 'varying vec3 vW, vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float time, uReveal, uFloor, opacity; varying vec3 vW, vN; ${RAMP}
      float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float noise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
      void main(){ float n = noise(vW * 1.7) * 0.999;
        if (n > uReveal || vW.y < uFloor) discard;
        float rim = smoothstep(uReveal - 0.1, uReveal, n) * step(uReveal, 0.999);
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vW - cameraPosition))), 2.0);
        gl_FragColor = vec4(holoRamp(fres * 0.8 + vW.y * 0.05 + time * 0.04) * (0.6 + fres) + rim, min(1.0, opacity + rim)); }`,
  });
}
