// The dreamy layer: sky, mirror water, cloud sea, portal windows with light shafts, drifting lamps, paper birds,
// and dust and petals that the cursor pushes around. The rooms' props and what they do are in rooms.js. Solid parts are declared in world.js
// so the rail check covers them; everything here is drawing and ambient motion.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { WINDOWS, STAIR, PHI_END, stairPt, LAMP_ZONE, BIRD_PATH, INDOOR_CLOUD } from './world.js';
import { furnish } from './rooms.js';
import { facade } from './facade.js';
import { lake } from './lake.js';
import { HOLO } from './holo.js';

const V3 = THREE.Vector3;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const glowTexture = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

export function dress({ scene, camera, lowQuality = false }) {
  const tick = []; // per-frame updaters: (time, dt, env) => void
  const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
  const lit = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const glow = (color, size, x, y, z, parent = scene, opacity = 0.9) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
    s.scale.setScalar(size); s.position.set(x, y, z); parent.add(s); return s;
  };

  // ---------- sky dome: soft orange-pink at the ground, deeper orange higher up, purple twilight at the rooftop ----------
  const SUN_DAY = new V3(-0.93, 0.15, 0.3).normalize(), SUN_DUSK = new V3(-0.5, 0.11, 0.86).normalize(), SUN_DIR = SUN_DAY.clone(); // by the rooftop the sun has come round to the south-west, into the last view
  const sky = new THREE.Mesh(new THREE.SphereGeometry(720, 40, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, upper: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, low: { value: new THREE.Color() }, veilCol: { value: new THREE.Color() }, veil: { value: 0 }, sunDir: { value: SUN_DIR }, sunCol: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, upper, mid, low, veilCol, sunDir, sunCol; uniform float veil; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir);
        vec3 c = mix(mid, upper, smoothstep(0.0, 0.3, d.y)); c = mix(c, top, smoothstep(0.25, 0.75, d.y)); c = mix(low, c, smoothstep(-0.15, 0.08, d.y));
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * (smoothstep(0.9992, 0.9996, s) * 1.2 + pow(s, 60.0) * 0.45 + pow(s, 6.0) * 0.16);
        gl_FragColor = vec4(mix(c, veilCol, veil), 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const pal = (top, upper, mid, low, sun) => ({ top: new THREE.Color(top), upper: new THREE.Color(upper), mid: new THREE.Color(mid), low: new THREE.Color(low), sunCol: new THREE.Color(sun) });
  const SKY_LOW = pal(0x9db9c7, 0xc9c6b6, 0xf5d3a6, 0xf2a766, 0xfff1cf);
  const SKY_HIGH = pal(0xc9744b, 0xde8e58, 0xf2a766, 0xf6c08a, 0xfff1cf);
  const SKY_DUSK = pal(0x5e5a8e, 0x9c8fc4, 0xb58db8, 0xe79aa3, 0xf2a36b); // the rooftop: violet zenith down to a pink horizon, orange where the sun is
  tick.push((t, dt, env) => {
    sky.position.copy(camera.position); SUN_DIR.lerpVectors(SUN_DAY, SUN_DUSK, env.dusk).normalize();
    const u = sky.material.uniforms, k = sstep(10, 26, env.h);
    for (const key of ['top', 'upper', 'mid', 'low', 'sunCol']) u[key].value.lerpColors(SKY_LOW[key], SKY_HIGH[key], k).lerp(SKY_DUSK[key], env.dusk).multiplyScalar(key === 'sunCol' ? 1 : env.dark);
    u.veilCol.value.copy(env.fogColor); u.veil.value = sstep(0.02, 0.2, env.fogDensity);
  });

  // ---------- rooftop twilight: lavender-grey clouds, gold only on the rims the sun reaches, a few rays and far lamps ----------
  {
    const puff = (() => { // one soft cloud, drawn once
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const x = c.getContext('2d'), rnd = rng(5);
      for (let i = 0; i < 26; i++) {
        const px = 40 + rnd() * 176, py = 52 + rnd() * 34, r = 22 + rnd() * 28, g = x.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 128);
      }
      return new THREE.CanvasTexture(c);
    })();
    const SUN = SUN_DUSK, sunYaw = Math.atan2(SUN.x, SUN.z), rnd = rng(31), fade = [];
    const sprite = (color, blending, x, y, z, w, h, k) => {
      const m = new THREE.SpriteMaterial({ map: puff, color, blending, transparent: true, depthWrite: false, fog: false, opacity: 0 });
      const s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.set(w, h, 1); scene.add(s); fade.push([m, k]); return s;
    };
    for (let i = 0; i < (lowQuality ? 9 : 16); i++) {
      const an = i < 4 ? sunYaw + (i - 1.5) * 0.3 : (i / 16) * Math.PI * 2 + rnd() * 0.3, dist = 150 + rnd() * 170, w = 90 + rnd() * 90, y = i < 4 ? 38 + rnd() * 30 : 26 + rnd() * 50; // the first four sit around the sun
      const x = 15 + Math.sin(an) * dist, z = 5 + Math.cos(an) * dist;
      sprite(0x8f86ad, THREE.NormalBlending, x, y, z, w, w * 0.42, 0.85);
      const toSun = Math.cos(an - sunYaw); // rim light only on the clouds between us and the sun
      if (toSun > 0.2) sprite(0xf6c66a, THREE.AdditiveBlending, x + SUN.x * 6, y - w * 0.05, z + SUN.z * 6, w * 1.04, w * 0.42, 0.7 * toSun);
    }
    // god rays: long thin sheets fanning out of the sun
    const rayMat = basic(0xf6c66a, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, map: glowTexture });
    const sunAt = new V3(15, 33, 5).addScaledVector(SUN, 420);
    for (const [roll, len] of lowQuality ? [[0.25, 300]] : [[-0.5, 260], [0.2, 330], [0.75, 240]]) {
      const m = mesh(new THREE.PlaneGeometry(len, 34).translate(len / 2, 0, 0), rayMat, sunAt.x, sunAt.y, sunAt.z);
      m.lookAt(15, 33, 5); m.rotateZ(Math.PI + roll); m.rotateY(0.25);
    }
    fade.push([rayMat, 0.16]);
    for (let i = 0; i < 9; i++) { const an = rnd() * 6.28, dist = 60 + rnd() * 120; fade.push([glow(0xffc978, 5 + rnd() * 4, 15 + Math.sin(an) * dist, 22 + rnd() * 4, 5 + Math.cos(an) * dist).material, 0.8]); } // warm lamps below the clouds
    tick.push((t, dt, env) => { for (const [m, k] of fade) { m.opacity = k * env.dusk; m.visible = env.dusk > 0.01; } });
  }

  // ---------- thin still water: a mirror with slow ripples, and rings where the cursor has been ----------
  const RIPPLES = 8;
  const water = new Reflector(new THREE.PlaneGeometry(1400, 1400), {
    textureWidth: Math.round(innerWidth * (lowQuality ? 0.35 : 0.6)), textureHeight: Math.round(innerHeight * (lowQuality ? 0.35 : 0.6)),
    clipBias: 0.003, color: 0x6f9b95,
    shader: {
      name: 'ThinWater',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, time: { value: 0 }, fogCol: { value: new THREE.Color() }, fogDen: { value: 0.004 }, ripples: { value: Array.from({ length: RIPPLES }, () => new V3(0, 0, -99)) } },
      vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform vec3 color, fogCol; uniform sampler2D tDiffuse; uniform float time, fogDen; uniform vec3 ripples[${RIPPLES}]; varying vec4 vUv; varying vec3 vW;
        void main(){ float d = distance(cameraPosition, vW);
          vec2 n = vec2(sin(vW.x * 1.7 + time * 0.7) + sin(vW.z * 2.3 - time * 0.5) + sin((vW.x + vW.z) * 0.6 + time * 0.3), cos(vW.z * 1.9 + time * 0.6) + sin(vW.x * 0.8 - time * 0.4));
          float ring = 0.0;
          for (int i = 0; i < ${RIPPLES}; i++) { float age = time - ripples[i].z;
            if (age > 0.0 && age < 2.2) { vec2 o = vW.xz - ripples[i].xy; float r = length(o), front = r - age * 0.9;
              float w = sin(front * 14.0) * exp(-abs(front) * 5.0) * (1.0 - age / 2.2); ring += w; n += o / (r + 0.001) * w * 7.0; } }
          vec4 uv = vUv; uv.xy += n * 0.003 * uv.w / (1.0 + d * 0.06);
          vec3 refl = texture2DProj(tDiffuse, uv).rgb;
          float fres = pow(1.0 - clamp(normalize(cameraPosition - vW).y, 0.0, 1.0), 2.5);
          vec3 c = mix(color, refl, 0.5 + 0.45 * fres) + ring * 0.07;
          c = mix(c, fogCol, 1.0 - exp(-fogDen * fogDen * d * d));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    },
  });
  water.rotation.x = -Math.PI / 2; scene.add(water);
  let rippleAt = 0;
  tick.push((t, dt, env) => {
    const u = water.material.uniforms; u.time.value = t; u.fogCol.value.copy(env.fogColor); u.fogDen.value = env.fogDensity;
    water.visible = env.h < 15; // above the cloud the ground is never in view
  });
  { // the reflection always shows the fully imagined building: every holographic outline, even where the real thing is solid
    const draw = water.onBeforeRender;
    water.onBeforeRender = function (...a) { HOLO.dream.value = 1; draw.apply(this, a); HOLO.dream.value = 0; };
  }
  facade({ scene, tick, mesh, basic, lit, glow });
  lake({ scene, camera, tick, mesh, lit, basic, lowQuality, water });
  const ripple = (x, z, time) => { water.material.uniforms.ripples.value[rippleAt++ % RIPPLES].set(x, z, time); };

  // ---------- cloud sea: a soft-edged bank over the building, puffs around the stair and down its open well ----------
  {
    const deck = new THREE.Mesh(new THREE.CircleGeometry(78, 96).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tint: { value: new THREE.Color(0xfff6ea) } }]),
      vertexShader: 'varying vec2 vP; \n#include <fog_pars_vertex>\n void main(){ vP = position.xz; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition; \n#include <fog_vertex>\n }',
      fragmentShader: `uniform vec3 tint; varying vec2 vP;
        #include <fog_pars_fragment>
        void main(){ float r = length(vP), a = atan(vP.y, vP.x);
          float edge = r + 7.0 * sin(a * 5.0) + 4.0 * sin(a * 11.0 + 1.3);
          float alpha = smoothstep(4.4, 5.8, r) * (1.0 - smoothstep(44.0, 74.0, edge));
          gl_FragColor = vec4(tint, alpha);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    }));
    deck.position.set(STAIR.cx, 17.5, STAIR.cz); scene.add(deck);
    const rnd = rng(7), geo = new THREE.IcosahedronGeometry(1, 2), mats = [0xfff8ef, 0xfbebdd, 0xf7dfcd].map((c) => basic(c));
    for (let i = 0; i < (lowQuality ? 50 : 110); i++) {
      const size = 2 + rnd() * 5, dist = size + 5.2 + rnd() * rnd() * 52, a = rnd() * Math.PI * 2;
      const m = mesh(geo, mats[i % 3], STAIR.cx + Math.cos(a) * dist, 13.6 + rnd() * 7.6, STAIR.cz + Math.sin(a) * dist);
      m.scale.set(size, size * 0.42, size);
    }
    const well = [];
    for (let y = 13.4; y <= 21.8; y += 0.9) well.push(mesh(new THREE.IcosahedronGeometry(0.95, 2), basic(0xfff6ea, { transparent: true }), STAIR.cx, y, STAIR.cz));
    tick.push(() => { for (const m of well) m.material.opacity = 0.95 * Math.min(1, Math.max(0, (m.position.distanceTo(camera.position) - 1.3) / 1.2)); });
  }

  // ---------- portal windows: every window shows a different sky, and throws its own light ----------
  const SKIES = {
    gold: { a: 0x9db9c7, b: 0xf7b978, orb: 0xfff2cc, orbAt: [0.62, 0.3], orbR: 0.13, stars: 0, clouds: 0.5, light: 0xffd9a0 },
    rose: { a: 0xe9a7a0, b: 0xf8dcc0, orb: 0xffffff, orbAt: [0.5, -1], orbR: 0.01, stars: 0, clouds: 0.9, light: 0xffc9b8 },
    day: { a: 0x7fb2d9, b: 0xdcebf2, orb: 0xffffff, orbAt: [0.5, -1], orbR: 0.01, stars: 0, clouds: 1.0, light: 0xdcefff },
    night: { a: 0x141b3c, b: 0x3b3f73, orb: 0xf4f1e4, orbAt: [0.32, 0.72], orbR: 0.1, stars: 1, clouds: 0, light: 0x8fa3ff },
    dawn: { a: 0x5d62a0, b: 0xf2b38b, orb: 0xffffff, orbAt: [0.5, -1], orbR: 0.01, stars: 0.5, clouds: 0.3, light: 0xf5b7a6 },
  };
  const skyMats = {}, shaftMats = {}, patchMats = {};
  const skyMat = (name) => (skyMats[name] ||= new THREE.ShaderMaterial({
    fog: false,
    uniforms: { a: { value: new THREE.Color(SKIES[name].a) }, b: { value: new THREE.Color(SKIES[name].b) }, orb: { value: new THREE.Color(SKIES[name].orb) }, orbAt: { value: new THREE.Vector2(...SKIES[name].orbAt) }, orbR: { value: SKIES[name].orbR }, stars: { value: SKIES[name].stars }, clouds: { value: SKIES[name].clouds }, time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 a, b, orb; uniform vec2 orbAt; uniform float orbR, stars, clouds, time; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec3 c = mix(b, a, smoothstep(0.0, 1.0, vUv.y));
        vec2 sp = vUv * vec2(22.0, 40.0), g = floor(sp); // stars: one small round dot in some cells
        c += step(0.9, hash(g)) * smoothstep(0.2, 0.06, length(fract(sp) - 0.5)) * stars * (0.6 + 0.4 * sin(time * 2.0 + hash(g) * 40.0));
        float d = distance(vUv * vec2(1.0, 1.7), orbAt * vec2(1.0, 1.7));
        c += orb * 0.3 * smoothstep(orbR * 3.5, orbR, d); c = mix(c, orb, smoothstep(orbR, orbR * 0.86, d));
        float band = sin(vUv.x * 5.0 + time * 0.05 + sin(vUv.y * 9.0) * 1.2) * sin(vUv.y * 13.0 + 1.0);
        c = mix(c, vec3(1.0, 0.97, 0.93), clouds * smoothstep(0.55, 0.95, band) * 0.8);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  tick.push((t) => { for (const k in skyMats) skyMats[k].uniforms.time.value = t; });
  const arch = (w, h) => {
    const s = new THREE.Shape(), r = w / 2;
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.lineTo(-r, 0);
    const geo = new THREE.ShapeGeometry(s, 20), pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h);
    return geo;
  };
  const NORMAL = { '+x': [1, 0, Math.PI / 2], '-x': [-1, 0, -Math.PI / 2], '+z': [0, 1, 0], '-z': [0, -1, Math.PI] };
  const trim = basic(0xf7f1e6), bar = basic(0x3f6e68);
  for (const w of WINDOWS) {
    const [nx, nz, ry] = NORMAL[w.n], g = new THREE.Group();
    g.position.set(w.x + nx * 0.03, w.y, w.z + nz * 0.03); g.rotation.y = ry; scene.add(g);
    const frame = mesh(arch(w.w + 0.24, w.h + 0.12), trim, 0, -0.02, 0, g); frame.position.z = 0;
    mesh(arch(w.w, w.h), skyMat(w.sky), 0, 0, 0.01, g);
    mesh(new THREE.BoxGeometry(0.05, w.h - 0.05, 0.03), bar, 0, w.h / 2, 0.03, g); // mullion
    mesh(new THREE.BoxGeometry(w.w, 0.05, 0.03), bar, 0, w.h - w.w / 2, 0.03, g); // transom at the spring of the arch
    if (!w.shaft) continue;
    // Light shaft: the window's outline carried down to the floor.
    const a = (w.shaft * Math.PI) / 180, dir = new V3(nx * Math.cos(a), -Math.sin(a), nz * Math.cos(a)), right = new V3(nz, 0, -nx);
    const base = new V3(w.x + nx * 0.06, w.y, w.z + nz * 0.06), top = w.h * 0.92;
    const at = [[-1, 0], [1, 0], [1, top], [-1, top]].map(([sx, y]) => base.clone().addScaledVector(right, (sx * w.w) / 2).add(new V3(0, y, 0)));
    const down = at.map((p) => p.clone().addScaledVector(dir, (p.y - (w.floor || 0) - 0.03) / Math.sin(a)));
    const quad = (p0, p1, p2, p3) => [p0, p1, p2, p0, p2, p3].flatMap((p) => [p.x, p.y, p.z]);
    const sides = new THREE.BufferGeometry();
    sides.setAttribute('position', new THREE.Float32BufferAttribute([...quad(at[0], at[3], down[3], down[0]), ...quad(at[1], at[2], down[2], down[1]), ...quad(at[3], at[2], down[2], down[3])], 3));
    const light = SKIES[w.sky].light;
    scene.add(new THREE.Mesh(sides, (shaftMats[w.sky] ||= basic(light, { transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))));
    const patch = new THREE.BufferGeometry();
    patch.setAttribute('position', new THREE.Float32BufferAttribute(quad(down[0], down[1], down[2], down[3]), 3));
    scene.add(new THREE.Mesh(patch, (patchMats[w.sky] ||= basic(light, { transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))));
  }

  // ---------- the plaque on the parapet: the wordmark and the Doorway S (logo A on the design board) ----------
  {
    const g = new THREE.Group(); g.position.set(0, 7.9, 12.3); scene.add(g); // on the lobby front, facing the street
    const clay = lit(0xc9733f, { emissive: 0xc9733f, emissiveIntensity: 0.55, roughness: 0.5 });
    mesh(new THREE.BoxGeometry(6.7, 1.95, 0.08), clay, 0, 0, 0.04, g); // a clay rim behind the ink panel
    mesh(new THREE.BoxGeometry(6.5, 1.75, 0.16), lit(0x1e2a26, { roughness: 0.6 }), 0, 0, 0.08, g);
    // The mark, traced from the logo's own SVG paths (120 x 140 units, y down).
    const k = 1.25 / 140, at = (px, py) => new V3((px - 60) * k, (70 - py) * k, 0);
    const archPts = [at(12, 134), at(12, 97), at(12, 60)];
    for (let i = 1; i < 16; i++) { const an = Math.PI - (Math.PI * i) / 16; archPts.push(at(60 + 48 * Math.cos(an), 60 - 48 * Math.sin(an))); }
    archPts.push(at(108, 60), at(108, 97), at(108, 134));
    const bez = (p0, c1, c2, p1) => new THREE.CubicBezierCurve3(at(...p0), at(...c1), at(...c2), at(...p1)).getPoints(10);
    const sPts = [...bez([79, 50], [73, 37], [41, 37], [41, 55]), ...bez([41, 55], [41, 73], [79, 69], [79, 91]).slice(1), ...bez([79, 91], [79, 110], [48, 112], [38, 99]).slice(1)];
    const mark = new THREE.Group(); mark.position.set(-2.45, 0, 0.19); g.add(mark);
    for (const pts of [archPts, sPts]) mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2), 90, 0.032, 8), clay, 0, 0, 0, mark);
    // shortcut: the wordmark is a texture on the raised plaque, not extruded letters (three no longer ships a font). Upgrade when the logo is modelled in Blender.
    const c = document.createElement('canvas'); c.width = 1056; c.height = 240;
    const x = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const word = () => { x.clearRect(0, 0, 1056, 240); x.font = '190px "Instrument Serif", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#e08a52'; x.fillText('scrollstory', 528, 112); tex.needsUpdate = true; };
    word(); document.fonts?.load('190px "Instrument Serif"').then(word, () => {});
    mesh(new THREE.PlaneGeometry(4.4, 1.0), basic(0xffffff, { map: tex, transparent: true }), 0.75, 0, 0.17, g);
    glow(0xffb070, 8, 0, 0, 0.5, g, 0.22); // a soft glow, so it reads when the camera tilts up at the gate
  }

  // ---------- lamps drifting over the courtyard water ----------
  const bulb = basic(0xffe9b8);
  const lamps = [];
  {
    const rnd = rng(23), Z = LAMP_ZONE;
    for (let i = 0; i < 11; i++) {
      const g = new THREE.Group(), home = new V3(lerp(Z.x0 + 0.7, Z.x1 - 0.7, rnd()), lerp(Z.y0, Z.y1 - 0.3, rnd()), lerp(Z.z0 + 0.7, Z.z1 - 0.7, rnd()));
      mesh(new THREE.SphereGeometry(0.1, 12, 8), bulb, 0, 0, 0, g); glow(0xffc978, 1.7, 0, 0, 0, g);
      g.position.copy(home); scene.add(g); lamps.push([g, home, rnd() * 6.28]);
    }
  }
  tick.push((t, dt, env) => { for (const [g, home, ph] of lamps) g.position.set(home.x + Math.sin(env.air * 0.13 + ph) * 0.3, home.y + Math.sin(t * 0.4 + ph * 2) * 0.12, home.z + Math.cos(env.air * 0.11 + ph) * 0.3); });

  // ---------- 04 Worth it: the ledger's pages leave as paper birds ----------
  {
    // paper birds
    const curve = new THREE.CatmullRomCurve3(BIRD_PATH.map((q) => new V3(...q)));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.2, -0.17, 0.04, -0.14, 0, 0, -0.12, 0, 0, 0.2, 0, 0, -0.12, 0.17, 0.04, -0.14, 0, 0, 0.2, 0, 0, -0.12, 0, -0.07, -0.12], 3));
    geo.computeVertexNormals();
    const N = lowQuality ? 8 : 16, birds = new THREE.InstancedMesh(geo, lit(0xf7efe2, { side: THREE.DoubleSide }), N), o = new THREE.Object3D();
    birds.frustumCulled = false; scene.add(birds);
    tick.push((t, dt, env) => {
      for (let i = 0; i < N; i++) {
        const u = (env.air * 0.045 + i / N) % 1, p = curve.getPointAt(u), tan = curve.getTangentAt(u);
        o.position.set(p.x + Math.sin(i * 2.4 + t * 0.9) * 0.2, p.y + Math.sin(i * 1.7 + t * 1.3) * 0.15, p.z + Math.cos(i * 3.1 + t * 0.7) * 0.2);
        o.lookAt(o.position.clone().add(tan)); o.rotateZ(Math.sin(t * 2 + i) * 0.35);
        o.scale.setScalar(Math.min(1, u * 9, (1 - u) * 6) * (1 + u * 0.8)); o.updateMatrix(); birds.setMatrixAt(i, o.matrix);
      }
      birds.instanceMatrix.needsUpdate = true;
    });
  }

  // ---------- a cloud that has drifted indoors ----------
  {
    const cloud = new THREE.Group(); cloud.position.set(...INDOOR_CLOUD); scene.add(cloud);
    for (const [x, y, z, s] of [[0, 0, 0, 0.8], [0.7, 0.1, 0.1, 0.6], [-0.7, 0.05, -0.1, 0.55], [0.2, 0.35, 0, 0.5], [-0.25, -0.2, 0.2, 0.5]]) {
      const m = mesh(new THREE.IcosahedronGeometry(1, 2), basic(0xfffaf2, { transparent: true, opacity: 0.94 }), x, y, z, cloud); m.scale.set(s, s * 0.7, s);
    }
    tick.push((t) => { cloud.position.y = INDOOR_CLOUD[1] + Math.sin(t * 0.25) * 0.18; cloud.position.x = INDOOR_CLOUD[0] + Math.sin(t * 0.1) * 0.25; });
  }

  // ---------- stair: thin balusters under both rails, and warm light falling down the open well ----------
  {
    const PER_TURN = 33, n = Math.ceil((PHI_END - STAIR.phi0) / ((2 * Math.PI) / PER_TURN));
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 4), lit(0x3f6e68), n * 2), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) for (const [k, r] of [STAIR.rIn, STAIR.rOut].entries()) {
      o.position.set(...stairPt(STAIR.phi0 + (i * 2 * Math.PI) / PER_TURN, r, 0.45)); o.updateMatrix(); posts.setMatrixAt(i * 2 + k, o.matrix);
    }
    scene.add(posts);
    mesh(new THREE.CylinderGeometry(1.0, 1.15, 13, 24, 1, true), basic(0xffe2a8, { transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), STAIR.cx, 6.5, STAIR.cz);
    mesh(new THREE.CircleGeometry(1.15, 24).rotateX(-Math.PI / 2), basic(0xffe2a8, { transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }), STAIR.cx, 0.03, STAIR.cz);
  }

  // ---------- dust and petals: they drift on their own, and the cursor moves them like air ----------
  const air = [];
  const cloudOfPoints = (count, size, colors, box, speed, pushGain) => {
    const rnd = rng(count * 13 + 1), pos = new Float32Array(count * 3), vel = new Float32Array(count * 3), col = new Float32Array(count * 3), ph = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      pos.set([(rnd() - 0.5) * box[0], rnd() * box[1], (rnd() - 0.5) * box[2]], i * 3);
      c.set(colors[i % colors.length]); col.set([c.r, c.g, c.b], i * 3); ph[i] = rnd() * 6.28;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: glowTexture, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
    pts.frustumCulled = false; scene.add(pts);
    air.push({ count, pos, vel, ph, box, speed, pushGain, geo });
  };
  cloudOfPoints(lowQuality ? 300 : 900, 0.06, [0xfff3d6, 0xffe2b0, 0xffffff], [18, 6, 18], 0.05, 1.0); // dust
  cloudOfPoints(lowQuality ? 50 : 150, 0.16, [0xc2387a, 0xd2492f, 0xe8a89a, 0xf2d98b], [22, 7, 22], 0.12, 1.6); // bougainvillea and gulmohar petals
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), rightV = new V3(), upV = new V3(), tmp = new V3(), push = new V3();
  tick.push((t, dt, env) => {
    ndc.set(env.pointer.sx, -env.pointer.sy); ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    rightV.setFromMatrixColumn(camera.matrixWorld, 0); upV.setFromMatrixColumn(camera.matrixWorld, 1);
    push.copy(rightV).multiplyScalar(env.pointer.vx).addScaledVector(upV, -env.pointer.vy); // pointer velocity as a breeze, in world space
    const cam = camera.position;
    for (const a of air) {
      const { pos, vel, ph, box } = a, hx = box[0] / 2, hz = box[2] / 2, k = Math.min(1, dt / 1.5);
      for (let i = 0; i < a.count; i++) {
        const j = i * 3;
        // own slow drift
        const dx = Math.sin(t * 0.21 + ph[i]) * a.speed * env.wind, dy = (Math.sin(t * 0.33 + ph[i] * 2) * 0.4 + 0.15) * a.speed, dz = Math.cos(t * 0.17 + ph[i] * 1.3) * a.speed * env.wind;
        vel[j] += (dx - vel[j]) * k; vel[j + 1] += (dy - vel[j + 1]) * k; vel[j + 2] += (dz - vel[j + 2]) * k;
        // the cursor's breeze: strongest near the line from the eye through the cursor
        tmp.set(pos[j] - o.x, pos[j + 1] - o.y, pos[j + 2] - o.z);
        const along = tmp.dot(d);
        if (along > 0.3 && along < 14) {
          const off = Math.sqrt(Math.max(0, tmp.lengthSq() - along * along));
          if (off < 1.4) { const f = (1 - off / 1.4) * a.pushGain * dt * 5; vel[j] += push.x * f; vel[j + 1] += push.y * f; vel[j + 2] += push.z * f; }
        }
        pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
        // stay in a box that travels with the camera
        if (pos[j] - cam.x > hx) pos[j] -= box[0]; else if (pos[j] - cam.x < -hx) pos[j] += box[0];
        if (pos[j + 2] - cam.z > hz) pos[j + 2] -= box[2]; else if (pos[j + 2] - cam.z < -hz) pos[j + 2] += box[2];
        const lowY = cam.y - 1.5; if (pos[j + 1] > lowY + box[1]) pos[j + 1] -= box[1]; else if (pos[j + 1] < lowY) pos[j + 1] += box[1];
        // never on the lens: a mote closer than 0.9 m jumps to the far side of the box
        if ((pos[j] - cam.x) ** 2 + (pos[j + 1] - cam.y) ** 2 + (pos[j + 2] - cam.z) ** 2 < 0.81) { pos[j] += hx; pos[j + 2] += hz * 0.7; }
      }
      a.geo.attributes.position.needsUpdate = true;
    }
  });

  const ready = furnish({ scene, camera, tick, mesh, basic, lit, glow, glowTexture, lowQuality });
  return { update: (time, dt, env) => { for (const f of tick) f(time, dt, env); }, ripple, ready };
}
