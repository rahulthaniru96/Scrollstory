// World v2 walkthrough: blockout geometry from world.js, the dreamy layer from dress.js, and the camera on its rail.
import * as THREE from 'three';
import Lenis from 'lenis';
import gsap from 'gsap';
import { buildRail } from './rail.js';
import { smoothDamp } from './spring.js';
import { stepper } from './stepper.js';
import { dress } from './dress.js';
import { holoEdges } from './holo.js';
import { membranes } from './membrane.js';
import { gallery, SITES } from './gallery.js';
import { deskSign, seat } from './rooms.js';
import { secrets, BOOKS, SECRETS } from './secrets.js';
import { sound } from './sound.js';
import { intro } from './intro.js';
import { TV_BEATS } from './rooms.js';
import { SWIRL } from './stairs.js';
import { portalRide } from './portal.js';
import { renovation } from './renovation.js';
import { drafting } from './drafting.js';
import { tower } from './tower.js';
import { signalCabin } from './signal.js';
import { journeys } from './journeys.js';
import { mapRoom } from './maproom.js';
import { greenhouse } from './greenhouse.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { COLLIDERS, BRIDGES, STAIR, PHI_END, STAIR_EXIT_WEDGE, stairPt, TV, TV_CHANNELS, EXTRAS, THEME, SKY_BY_HEIGHT, clearanceAt, CLEAR, LEAN_SHIFT, SHOPS, COUNTERS, H, DOORS, MILESTONES, EYE, RENO } from './world.js';

// ---------- feel numbers. All are starting values to tune. ----------
const FEEL = {
  smooth: { room: 0.35, stair: 0.5, cloud: 0.6 }, // seconds, body spring
  lookFactor: 0.7, // the eyes' spring is this much quicker than the body's
  // Loose caps: they only stop a hard fling from whipping the view. The camera always flies; it never cuts.
  caps: { room: { move: 9, yaw: 140, pitch: 90 }, stair: { move: 10, yaw: 160, pitch: 90 }, cloud: { move: 10, yaw: 160, pitch: 90 } },
  catchUp: { after: 30, per: 45, max: 8 }, // further behind than `after` vh, the caps grow so it catches up
  lean: { yaw: 6, pitch: 4, shift: LEAN_SHIFT, pointer: 0.12, camera: 0.45 }, // how far the cursor moves the view
  sway: { yaw: 0.22, pitch: 0.14, bob: 0.012 }, // slow breathing when nothing else moves
  fade: 0.3, // reduced motion only: cross-fade between hold frames
};

// The 3D scene draws its lettering on canvases, so the fonts come first (2 s at most, then the fallbacks do).
await Promise.race([Promise.all(['500 30px "Martian Mono"', '500 100px Fraunces', '400 16px "Familjen Grotesk"'].map((f) => document.fonts.load(f))).catch(() => {}), new Promise((r) => setTimeout(r, 2000))]);

const rail = buildRail();
const canvas = document.getElementById('stage');
let renderer;
try {
  // ?at= (screenshot mode) keeps the drawn frame in the canvas so a capture never catches it empty
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: location.search.includes('at=') });
} catch {
  document.getElementById('nogl').style.display = 'block';
  throw new Error('WebGL is not available');
}
const lowQuality = matchMedia('(pointer: coarse)').matches; // phones
renderer.setPixelRatio(Math.min(devicePixelRatio, lowQuality ? 1 : 1.5));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xf3cfa4, 0.004);
scene.background = new THREE.Color(0xf3cfa4);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1600);
camera.rotation.order = 'YXZ';
const hemi = new THREE.HemisphereLight(0xfff4e4, 0xc9bfae, 2.5);
const sun = new THREE.DirectionalLight(0xffe2b8, 2.2);
sun.position.set(-30, 18, 10); // low in the west
scene.add(hemi, sun);

// ---------- solid geometry, built from the same colliders the rail check uses ----------
const tone = { wall: 0xefe3c8, facade: 0xe3dccf, stone: 0x8c8a82, ceiling: 0xf4ecdd, floor: 0xd8cdb8, pillar: 0xc9b08a, furniture: 0x9b7a55, glass: 0xbfd8d2, rail: 0x3f6e68, sign: 0x1c2124 };
const mats = Object.fromEntries(Object.entries(tone).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })]));
Object.assign(mats.glass, { transparent: true, opacity: 0.18, roughness: 0.1 });
const tinted = {};
// Paint, room by room: [wall, dado]. The dado runs to 1 m with a brass line on top, so each room reads as decorated, not blocked out.
const PAINT = { lobby: [0xf1e8d8, 0xb7a58a], gallery: [0xe8e4ee, 0x8f86a6], worth: [0xdfe6d3, 0x7f9478], workshop: [0xf2dccb, 0xb07a62], upper: [0xefe3c8, 0xc9b08a] };
const roomOf = (c) => {
  const x = (c.min[0] + c.max[0]) / 2, y = (c.min[1] + c.max[1]) / 2, z = (c.min[2] + c.max[2]) / 2;
  if (y > 12) return 'upper';
  if (z < -16) return 'worth';
  if (x < -6) return 'gallery';
  if (x > 6) return 'workshop';
  return 'lobby';
};
const painted = {};
const paint = (room) => painted[room] ||= (() => {
  const [wall, dado] = PAINT[room], m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uWall = { value: new THREE.Color(wall) }; s.uniforms.uDado = { value: new THREE.Color(dado) };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWY;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uWall, uDado; varying float vWY;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 paint = mix(uDado, uWall, step(1.0, vWY));
        paint = mix(paint, vec3(0.79, 0.64, 0.29), 1.0 - step(0.035, abs(vWY - 1.0))); // the brass line
        diffuseColor.rgb *= paint;`);
  };
  return m;
})();
const matFor = (c) => (c.color !== undefined ? (tinted[c.color] ||= new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.9 })) : c.kind === 'wall' && c.t === 'box' && roomOf(c) !== 'upper' ? paint(roomOf(c)) : mats[c.kind] || mats.wall);
const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); scene.add(m); return m; };
const drift = []; // floating things: [mesh, home y, phase]
const demoCards = []; // the Gallery's demo sites
const shell = []; // the ground building's blockout meshes, which the intro builds
const cardTexture = (() => {
  const c = document.createElement('canvas'); c.width = 320; c.height = 200;
  const x = c.getContext('2d');
  x.fillStyle = '#F7EFE2'; x.fillRect(0, 0, 320, 200);
  x.fillStyle = '#1E2A26'; x.fillRect(0, 0, 320, 22);
  x.fillStyle = '#E8A89A'; x.fillRect(24, 44, 272, 78);
  x.fillStyle = '#8C8A82'; x.fillRect(24, 138, 150, 10); x.fillRect(24, 158, 96, 10);
  x.fillStyle = '#9E3B2C'; x.font = '500 20px "Martian Mono", monospace'; x.fillText('DEMO', 232, 166);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

for (const c of COLLIDERS) {
  if (c.hidden) continue; // drawn by dress.js
  if (c.t === 'box') {
    const s = c.max.map((v, i) => v - c.min[i]);
    const m = add(new THREE.BoxGeometry(...s), matFor(c), ...c.min.map((v, i) => v + s[i] / 2)); if (c.min[1] < 14) shell.push(m);
  } else if (c.t === 'cyl') {
    add(new THREE.CylinderGeometry(c.r, c.r, c.y1 - c.y0, 20), mats.furniture, c.x, (c.y0 + c.y1) / 2, c.z);
  } else if (c.t === 'slabHole') {
    const sh = new THREE.Shape();
    sh.moveTo(c.min[0], -c.min[2]); sh.lineTo(c.max[0], -c.min[2]); sh.lineTo(c.max[0], -c.max[2]); sh.lineTo(c.min[0], -c.max[2]); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(c.hx, -c.hz, c.hr, 0, Math.PI * 2, true); sh.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: c.max[1] - c.min[1], bevelEnabled: false, curveSegments: 40 });
    geo.rotateX(-Math.PI / 2);
    const m = add(geo, mats[c.kind] || mats.floor, 0, c.min[1], 0); if (c.min[1] < 14) shell.push(m);
  } else if (c.t === 'sph' && c.shape === 'card') { // the other floating things are drawn by rooms.js
    // A demo site appears out of thin air as the scroll reaches it: motes, then an outline and a ghost, then the page itself.
    const geo = new THREE.PlaneGeometry(1.6, 1.0), r = { value: 1 }, line = { value: 0 };
    const m = add(geo, new THREE.ShaderMaterial({
      side: THREE.DoubleSide, transparent: true, uniforms: { map: { value: cardTexture }, uR: r, uK: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform float uR, uK; varying vec2 vUv;
        void main(){ float k = (1.0 - smoothstep(0.5, 0.95, uR)) * 0.035; // the ghost's colours sit apart, then close up
          vec3 c = vec3(texture2D(map, vUv + vec2(k, 0.0)).r, texture2D(map, vUv).g, texture2D(map, vUv - vec2(k, 0.0)).b);
          gl_FragColor = vec4(c, uK * (smoothstep(0.22, 0.3, uR) * 0.15 + smoothstep(0.45, 0.6, uR) * 0.45 + smoothstep(0.78, 0.95, uR) * 0.4));
          #include <colorspace_fragment>
        }`,
    }), c.x, c.y, c.z);
    m.rotation.y = Math.atan2(-9 - c.x, -3); // faces the spot on the walk 3 m past it, where the camera rests
    m.add(holoEdges(geo, { everywhere: true, fade: line }));
    const n = 40, at = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) at.set([(Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 0.3], i * 3);
    const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(at, 3)), new THREE.PointsMaterial({ size: 0.045, color: 0xd9c8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.add(motes);
    demoCards.push({ m, r, line, motes, z: c.z });
    drift.push([m, c.y, drift.length * 1.7]);
  }
}

// The spiral stair: checkered treads that are each a little wrong, the Landing wedge where the hat lets the camera out, and two rails that wander.
{
  const PER_TURN = 33, dPhi = (2 * Math.PI) / PER_TURN;
  const flat = Math.ceil(STAIR_EXIT_WEDGE / dPhi), steps = Math.ceil((PHI_END - STAIR.phi0) / dPhi);
  const treads = new THREE.InstancedMesh(new THREE.BoxGeometry(STAIR.rOut - STAIR.rIn, 0.15, 0.62), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), steps + flat);
  const o = new THREE.Object3D(), rMid = (STAIR.rIn + STAIR.rOut) / 2, cream = new THREE.Color(0xeadcbf), ink = new THREE.Color(0x2c3834);
  for (let i = 0; i < steps + flat; i++) {
    const wedge = i >= steps, phi = wedge ? PHI_END + (i - steps) * dPhi : STAIR.phi0 + i * dPhi;
    o.position.set(STAIR.cx - rMid * Math.sin(phi), (wedge ? H.landing : stairPt(phi)[1]) - 0.075, STAIR.cz + rMid * Math.cos(phi));
    o.rotation.set(0, Math.atan2(-Math.cos(phi), -Math.sin(phi)), wedge ? 0 : Math.sin(i * 1.7) * 0.045); // a small roll, never the same twice
    o.scale.set(wedge ? 1 : 1 + 0.08 * Math.sin(i * 2.3), 1, 1);
    o.updateMatrix(); treads.setMatrixAt(i, o.matrix); treads.setColorAt(i, wedge || i % 2 ? cream : ink);
  }
  scene.add(treads);
  for (const r of [STAIR.rIn, STAIR.rOut]) {
    const p = [];
    for (let phi = STAIR.phi0; phi <= PHI_END; phi += 0.1) p.push(new THREE.Vector3(...stairPt(phi, r + 0.04 * Math.sin(phi * 6 + r), 0.9 + 0.05 * Math.sin(phi * 4 + r * 2))));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), p.length * 3, 0.022, 6), mats.rail));
  }
}

// Bridges as stepping slabs.
for (const b of BRIDGES.filter((q) => q.ride === 'doors')) { // the rides draw themselves (journeys.js)
  const dx = b.b[0] - b.a[0], dz = b.b[1] - b.a[1], n = Math.max(3, Math.round(Math.hypot(dx, dz) / 0.9)), geo = new THREE.BoxGeometry(b.width, 0.2, 0.72);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    add(geo, mats.floor, b.a[0] + dx * u, b.ya + (b.yb - b.ya) * u - 0.1, b.a[1] + dz * u).rotation.y = Math.atan2(dx, dz);
  }
}

const dressing = dress({ scene, camera, lowQuality });
const expand = gallery({ scene, cards: demoCards, lowQuality, camera });
const hidden = secrets({ scene, camera, lowQuality }), sfx = sound();
const reno = renovation({ scene, lowQuality });
const draft = drafting({ scene, lowQuality }), clock = tower({ scene, lowQuality }), cabin = signalCabin({ scene, lowQuality }), rides = journeys({ scene, lowQuality }), atlas = mapRoom({ scene, lowQuality }), garden = greenhouse({ scene, lowQuality }), railAt = new THREE.Vector3();

// ---------- entrance membranes: where the rail crosses each doorway, and the full-screen wobble of passing through ----------
const gel = membranes({ scene, camera, lowQuality, crossings: DOORS.filter((d) => d.name !== 'gate').map((d) => {
  const x = (d.a[0] + d.b[0]) / 2, z = (d.a[1] + d.b[1]) / 2;
  let at = 0, best = Infinity;
  for (let p = 0; p < rail.total; p += 0.25) { const q = rail.pos(p), dist = Math.hypot(q[0] - x, q[2] - z); if (q[1] < 4 && dist < best) { best = dist; at = p; } }
  return { x, z, at, w: Math.hypot(d.a[0] - d.b[0], d.a[1] - d.b[1]), turn: Math.abs(d.a[0] - d.b[0]) > Math.abs(d.a[1] - d.b[1]) ? 0 : Math.PI / 2 };
}).concat((() => { // and one in the sky, in the gap the walk falls through from the Signal Cabin to Extras
  const m = rail.moves.find((q) => q.name === 'A short fall'); let at = m.s0;
  for (let p = m.s0; p < m.s1; p += 0.25) if (rail.pos(p)[0] > 23.2) at = p;
  return [{ x: 23.2, y: H.extras + 0.9, z: -20.4, at, w: 2.6, turn: Math.PI / 2 }];
})()) });
const gelPass = { // drawn only while the camera is inside a membrane or the hat
  target: new THREE.WebGLRenderTarget(1, 1, { samples: lowQuality ? 0 : 4 }), scene: new THREE.Scene(), camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
  mat: new THREE.ShaderMaterial({
    depthTest: false, uniforms: { tDiffuse: { value: null }, k: { value: 0 }, hat: { value: -1 }, time: { value: 0 }, aspect: { value: 1 }, under: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float k, hat, time, aspect, under; varying vec2 vUv; ${SWIRL}
      void main(){ vec2 c = vUv - 0.5; float r = length(c);
        vec2 uv = vUv + normalize(c + 1e-5) * sin(r * 26.0 - k * 9.0) * 0.014 * k * smoothstep(0.0, 0.5, r); // a ring of refraction that moves with the scroll
        // under the water (the mirror): slow crossing waves bend everything, so the room seems to sway
        uv += under * vec2(sin(vUv.y * 11.0 + time * 1.3) + 0.6 * sin(vUv.y * 23.0 - time * 0.9 + vUv.x * 7.0), cos(vUv.x * 9.0 + time * 1.1) + 0.5 * sin(vUv.x * 19.0 + time * 1.7)) * 0.006;
        vec3 col = vec3(texture2D(tDiffuse, uv + c * 0.008 * k).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c * 0.008 * k).b);
        col += vec3(0.75, 0.95, 1.0) * smoothstep(0.3, 0.72, r) * k * 0.5; // the bright rim of the gel closing behind
        if (hat >= 0.0) { // inside the hat: the tunnel closes in from the edges, and opens from its middle at the far end
          vec2 q = c * vec2(aspect, 1.0); float cover = smoothstep(0.0, 0.14, hat) * (1.0 - smoothstep(0.8, 1.0, hat)), hole = (1.0 - cover) * 1.25;
          col = mix(col, swirl(q, hat, time), smoothstep(hole - 0.14, hole, length(q)));
        }
        if (under > 0.0) { // caustics: bright threads of light that drift, and a deeper blue at the edges
          vec2 q = vUv * vec2(aspect, 1.0) * 6.0; float cst = pow(abs(sin(q.x + sin(q.y * 1.3 + time * 0.7) * 1.4 + time * 0.4) * sin(q.y * 1.1 + sin(q.x * 0.9 - time * 0.5) * 1.6)), 6.0);
          col = mix(col, col * vec3(0.78, 0.92, 1.05) + vec3(0.7, 0.9, 1.0) * cst * 0.18, under) * mix(1.0, 1.0 - 0.35 * smoothstep(0.35, 0.8, r), under);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }),
};
gelPass.mat.uniforms.tDiffuse.value = gelPass.target.texture;
gelPass.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gelPass.mat));

// ---------- fog and light by camera height (motion spec, section 7) ----------
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const SKY = SKY_BY_HEIGHT.map(([h, c]) => [h, new THREE.Color(c)]);
const DAY = { hemi: new THREE.Color(0xfff4e4), sun: new THREE.Color(0xffe2b8) }, DUSK = { hemi: new THREE.Color(0xd9cdf0), sun: new THREE.Color(0xf6c66a) };
const env = { h: 0, dark: 1, fogColor: new THREE.Color(), fogDensity: 0.004, wind: 1, air: 0, pointer: null, shop: [0, 0, 0], counter: [0, 0, 0, 0], tv: { ch: -1, f: 1 }, wipe: -99, page: 0, cards: 0, levers: 0, map: 0, grow: 0, tools: 0, seated: 0, dusk: 0, site: [0, 0, 0, 0, 0], extra: { u: EXTRAS.map(() => -1), lit: -1, train: 0, leave: 0 }, tint: new THREE.Color(1, 1, 1) };
function atmosphere(h) {
  let i = 0; while (i < SKY.length - 2 && h > SKY[i + 1][0]) i++;
  env.fogColor.lerpColors(SKY[i][1], SKY[i + 1][1], Math.min(1, Math.max(0, (h - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]))));
  env.fogDensity = lerp(lerp(0.004, 0.33, sstep(11, 15, h)), 0.006, sstep(20.5, 23, h));
  env.h = h; env.fogColor.lerp(env.tint, 0.14);
  scene.fog.color.copy(env.fogColor); scene.background.copy(env.fogColor); scene.fog.density = env.fogDensity;
  env.dusk = sstep(30.5, 38.5, h); // 0 at the Drafting Room, rising through the Sky Quarter, 1 at the rooftop desk
  hemi.intensity = (2.5 - 0.5 * env.dusk) * env.dark; sun.intensity = 2.2 * env.dark;
  hemi.color.lerpColors(DAY.hemi, DUSK.hemi, env.dusk).multiply(env.tint); sun.color.lerpColors(DAY.sun, DUSK.sun, env.dusk);
}
// Each room is a level: the light takes its tint, and the page's accent colour and the level chip follow.
const LEVELS = rail.rooms.map((r) => ({ ...r, tint: new THREE.Color(THEME[r.name].tint), accent: THEME[r.name].accent })), levelChip = document.getElementById('level');
let levelNow = -1;
function theme(p) {
  let i = 0; while (i < LEVELS.length - 1 && p >= LEVELS[i + 1].s) i++;
  const a = LEVELS[i], b = LEVELS[Math.min(i + 1, LEVELS.length - 1)], t = b === a ? 0 : sstep(0.3, 0.7, (p - a.s) / (b.s - a.s));
  env.tint.lerpColors(a.tint, b.tint, t);
  const k = b !== a && p >= b.s - 45 ? i + 1 : i; // the chip changes as the next room comes into view, not halfway down a long one
  if (k !== levelNow) { levelNow = k; sfx.level(k); document.documentElement.style.setProperty('--accent', LEVELS[k].accent); levelChip.textContent = `Level ${String(k + 1).padStart(2, '0')} / ${LEVELS.length} · ${LEVELS[k].name.replace(/^\d+ /, '')}`; }
}

// ---------- scroll, springs and caps ----------
document.getElementById('track').style.height = `${rail.total + 100}vh`;
const startAt = Number(new URLSearchParams(location.search).get('p')); // ?p=1118 opens the walk at that point
if (startAt > 0) scrollTo(0, (startAt / rail.total) * (document.documentElement.scrollHeight - innerHeight));
const free = new URLSearchParams(location.search).has('free'); // ?free=1: the old free scroll, for tuning
const blocked = (e) => state.secret || state.seat || document.body.classList.contains('intro') || document.querySelector('dialog[open]') || e?.target?.closest?.('#plan, [data-lenis-prevent]') || (e?.target?.closest?.('#chooser')?.scrollHeight > chooser.clientHeight + 2);
// One wheel gesture is one stop. Lenis hands every wheel event here first; returning false keeps it from scrolling.
const lenis = new Lenis({ lerp: 0.1, virtualScroll: (d) => {
  if (free || !d.event.type.startsWith('wheel') || d.event.ctrlKey || blocked(d.event)) return true;
  d.event.preventDefault(); if (Math.abs(d.deltaY) > 1) steps.wheel(Math.sign(d.deltaY), d.event.timeStamp / 1000, Math.abs(d.deltaY)); return false;
} });
gsap.ticker.lagSmoothing(0);

const state = { seat: null, secret: null, body: 0, look: 0, vBody: 0, vLook: 0, fading: false, started: false, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, hold: null };
const pointer = { x: 0, y: 0, sx: 0, sy: 0, vx: 0, vy: 0, cx: 0, cy: 0, cvx: 0, cvy: 0, lastX: 0, lastY: 0, lastT: 0, stirred: -9 };
env.pointer = pointer;
const ray = new THREE.Raycaster(), waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
let now = 0;
addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = (e.clientY / innerHeight) * 2 - 1; pointer.stirred = now;
  // a ring on the water where the cursor is, every 40 px or 120 ms of movement
  if (Math.hypot(e.clientX - pointer.lastX, e.clientY - pointer.lastY) > 40 || now - pointer.lastT > 0.12) {
    pointer.lastX = e.clientX; pointer.lastY = e.clientY; pointer.lastT = now;
    ray.setFromCamera(new THREE.Vector2(pointer.x, -pointer.y), camera);
    if (camera.position.y < 12 && ray.ray.intersectPlane(waterPlane, hit) && hit.distanceTo(camera.position) < 45) dressing.ripple(hit.x, hit.z, now);
  }
});

const holds = rail.moves.filter((m) => m.hold);
// ---------- scroll to checkpoint ----------
const stopPx = (i) => (rail.stops[i] / rail.total) * lenis.limit;
const steps = stepper(rail.stops, (i) => {
  const far = Math.abs(rail.stops[i] - target());
  lenis.scrollTo(stopPx(i), { duration: Math.min(3.5, Math.max(1.2, far / 80)), easing: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2), lock: true, force: true, immediate: state.reduce, onComplete: () => { steps.arrived(); sfx.tick(); } });
  if (state.reduce) steps.arrived();
});
const pips = document.getElementById('pips');
rail.stops.forEach((s, i) => {
  const b = document.createElement('button'); b.setAttribute('aria-label', `Stop ${i + 1} of ${rail.stops.length}`); b.onclick = () => (Math.abs(i - steps.dest) > 2 ? jump(i) : steps.goto(i)); pips.append(b);
});
if (free) pips.hidden = true;
else {
  let settle = 0, ty = null;
  // a scrollbar drag or a jump stays free, then comes to rest on the nearest stop
  lenis.on('scroll', () => { if (steps.travelling) return; clearTimeout(settle); settle = setTimeout(() => { if (steps.travelling || blocked()) return; steps.sync(target()); if (Math.abs(rail.stops[steps.dest] - target()) > 1.5) steps.goto(steps.dest); }, 350); });
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, button, a') || e.ctrlKey || e.metaKey || e.altKey || blocked(e)) return;
    const dir = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1, ' ': e.shiftKey ? -1 : 1 }[e.key];
    if (dir) { e.preventDefault(); steps.step(dir); }
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && env.tv.ch >= 0 && state.body < TV_SPAN[1]) steps.step(e.key === 'ArrowLeft' ? -1 : 1); // change the channel
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); steps.goto(e.key === 'Home' ? 0 : rail.stops.length - 1); }
  });
  // touch: a swipe of 40 px or more is one step; the page itself does not drag
  addEventListener('touchstart', (e) => { ty = blocked(e) || e.target.closest('button, a') ? null : e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => { if (ty !== null && e.cancelable) e.preventDefault(); }, { passive: false });
  addEventListener('touchend', (e) => { if (ty === null) return; const dy = ty - e.changedTouches[0].clientY; ty = null; if (Math.abs(dy) > 40) steps.step(Math.sign(dy)); }, { passive: true });
}
const pinned = Number(new URLSearchParams(location.search).get('at')); // ?at=1118 freezes the walk there, for screenshots
const target = () => (pinned > 0 ? pinned : lenis.limit > 0 ? (lenis.scroll / lenis.limit) * rail.total : 0);
const veil = document.getElementById('mist');
function fadeTo(to) { // reduced motion only
  state.fading = true;
  gsap.to(veil, { opacity: 1, duration: FEEL.fade, ease: 'none', onComplete() {
    state.body = state.look = to(); state.vBody = state.vLook = 0;
    gsap.to(veil, { opacity: 0, duration: FEEL.fade, ease: 'none', onComplete() { state.fading = false; } });
  } });
}

// Fastest the progress may move right now (vh per second), from the caps and the local shape of the rail.
function speedLimit(p, zone, lag) {
  const cap = FEEL.caps[zone], e = 0.25, c = FEEL.catchUp;
  const a = rail.pos(p - e), b = rail.pos(p + e);
  const m = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / (2 * e);
  const yaw = Math.abs(rail.yaw(p + e) - rail.yaw(p - e)) / (2 * e), pitch = Math.abs(rail.pitch(p + e) - rail.pitch(p - e)) / (2 * e);
  const boost = Math.min(c.max, 1 + Math.max(0, lag - c.after) / c.per);
  return Math.min(m > 1e-4 ? cap.move / m : 1e4, yaw > 1e-3 ? cap.yaw / yaw : 1e4, pitch > 1e-3 ? cap.pitch / pitch : 1e4, 2000) * boost;
}

// ---------- captions (words from the design board; rooms without written copy show their label only) ----------
const COPY = {
  'Arrival hold': ['Scrollstory Studio · Secunderabad', 'Every business has a story.', "Come in, we'll show you ours."],
  'Lobby push in': ['The founder', 'Rahul Thaniru', 'Founder, Scrollstory Studio.'],
  'Lobby hold': ['Room 01 · The lobby', "We don't just build websites.", 'We tell your story and build its world.'],
  'Gallery hold': ['Room 02 · The gallery', 'Every door, a site we built.', 'Step into any one.'],
  'Renovation hold': ['Room 03 · The renovation', "Your old site isn't the end of your story.", 'Walk through the line.'],
  'Renovated': ['Room 03 · The renovation', 'Same café, a new site.', 'Move the cursor to compare. The café is made up.'],
  'Worth it hold': ['Room 04 · Worth it', 'Custom. Secure. Legal.', 'Built to bring you income.'],
  'Workshop hold': ['Room 05 · The workshop', 'Three shops.', 'One for where you are now.'],
  'Look up': ['The stairs', 'Keep climbing.', 'The best view is upstairs.'],
  'Landing hold': ['The landing · core memory', '', ''],
  'Bookshelf hold': ['The landing · How we work', 'Five volumes.', 'Pull one out.'],
  'Bridge to HOME': ['Home · Scrollstory TV', 'Stories used to live on TV.', 'Now they live on your website.'],
  'Drafting hold': ['Room 06 · The drafting room', 'You see every screen', 'before a line of code.'],
  'The page, painted': ['Room 06 · The drafting room', 'Wireframe first, then colour.', 'Then it moves.'],
  'Signal Cabin hold': ['Room 07 · The signal cabin', 'Bookings, enquiries and staff,', 'all in one panel.'],
  'Admin panel': ['Room 07 · Pull a lever', 'New becomes booked.', 'Demo data: nothing on this panel is real.'],
  'Out of the cabin': ['Room 07 · The edge', 'One small step down.', ''],
  'Extras hold': ['Room 08 · Extras', 'Everything else it takes to go digital.', 'Click a carriage to see what it carries.'],
  'Map hold': ['Room 08 · Being found', 'On the map, and on your Google Business Profile.', 'Set up in every plan.'],
  'Greenhouse hold': ['Room 09 · The greenhouse', "We don't launch and leave.", 'We look after it.'],
  'Care tools': ['Room 09 · A care plan', 'Hosting, backups, uptime, security updates,', 'and a few small changes a month.'],
  'Kites up to the Rooftop': ['Room 10 · The rooftop', 'Up on the roof.', 'The desk is one step away.'],
  'Settle on the desk': ['Room 10 · Rooftop front desk', "Let's build yours.", 'The desk is open.'],
};
const cap = document.getElementById('caption'), capLabel = cap.querySelector('.label'), capH = cap.querySelector('h1'), capCta = cap.querySelector('.cta'), capNum = cap.querySelector('.num');
let capWords = [];
const lastMove = rail.moves[rail.moves.length - 1];
let capFor = null;
function caption(p) {
  const m = rail.moveAt(p), tv = env.tv.ch >= 0 && p < TV_SPAN[1]; // in the TV room each channel is its own caption
  // on the stair, the milestone the camera is passing is the caption
  const phi = STAIR.phi0 + ((rail.pos(p)[1] - EYE) * 2 * Math.PI) / STAIR.rise, mi = m.zone === 'stair' ? MILESTONES.findIndex((q) => Math.abs(phi + 0.5 - q.phi) < 0.52) : -1;
  const name = tv ? 'tv' + env.tv.ch : mi >= 0 ? 'ms' + mi : m.name;
  const c = mi >= 0 ? [`Milestone 0${mi + 1} of 0${MILESTONES.length}`, MILESTONES[mi].title, MILESTONES[mi].line] : tv ? (env.tv.ch < TV_BEATS.length ? [`Scrollstory TV · CH 0${env.tv.ch + 1} · Our story`, TV_BEATS[env.tv.ch].full, ''] : [`Scrollstory TV · CH 0${env.tv.ch + 1}`, 'Your story?', "Let's put it on the screen."]) : COPY[name];
  if (!c || state.secret || hidden.opened >= 0) { cap.style.opacity = 0; cap.classList.remove('on'); return; } // inside a secret, its own card does the talking
  if (capFor !== name) {
    capFor = name; capLabel.textContent = c[0]; capH.replaceChildren(); capWords = [];
    const put = (text, into) => { for (const w of text.split(' ')) { const s = el('span', w, 'w'); capWords.push(s); into.append(s, ' '); } }; // one span a word: they arrive one after another
    put(c[1], capH);
    if (c[2]) { const em = document.createElement('em'); capH.append(em); put(c[2], em); }
    capNum.textContent = (c[0].match(/(?:Room|CH|Milestone) (\d+)/) || [])[1] || ''; // the big outlined numeral behind the words
    capH.classList.toggle('small', mi >= 0 || (tv && env.tv.ch < TV_BEATS.length)); capCta.hidden = !(tv && env.tv.ch === TV_BEATS.length);
  }
  const u = mi >= 0 ? (phi + 0.5 - MILESTONES[mi].phi + 0.52) / 1.04 : tv ? env.tv.f : (p - m.s0) / (m.s1 - m.s0);
  // Scroll-driven, so it reverses exactly: the words come in one by one, then the whole caption leaves. The first caption is there when the intro ends.
  const arrive = m === rail.moves[0] ? 1 : Math.min(1, Math.max(0, (u - 0.06) / (tv ? 0.2 : 0.36))), out = m === lastMove || m.name === 'Kites up to the Rooftop' ? 1 : 1 - sstep(tv ? 0.9 : 0.85, 1, u), n = capWords.length;
  for (const [k, w] of capWords.entries()) { const wo = sstep((k / n) * 0.6, (k / n) * 0.6 + 0.4, arrive); w.style.opacity = wo; w.style.transform = `translateY(${(1 - wo) * 0.4}em)`; }
  const o = sstep(0, 0.2, arrive) * out;
  cap.style.opacity = o; cap.style.transform = `translateY(${(1 - out) * 16}px)`; cap.classList.toggle('on', arrive > 0.6 && out > 0.5);
}

// ---------- what the scroll is pointing at: one shop, one counter, one TV channel ----------
const byName = Object.fromEntries(rail.moves.map((m) => [m.name, m]));
const beat = (name, p, pad = 22) => { const m = byName[name]; return sstep(m.s0 - pad, m.s0 + 4, p) * (1 - sstep(m.s1 - 4, m.s1 + pad, p)); };
const GALLERY = byName['Gallery, walking backwards'], HAT = byName['Through the hat'];
const TV_SPAN = [byName['HOME partial orbit'].s0, byName['HOME hold'].s1], CHANNELS = TV_CHANNELS; // the last channel is "Your story?"
const SITE_STOPS = demoCards.map((c, i) => (i < 4 ? GALLERY.s0 + ((GALLERY.s1 - GALLERY.s0) * (10 - c.z)) / 17 : lerp(byName['Gallery hold'].s0, byName['Gallery hold'].s1, 0.6))); // where the walk rests in front of each demo site
const EX = EXTRAS.map((e) => byName[`Extra: ${e.name}`]), EX0 = byName['Extras hold'], EX_END = byName['To the map'], CANAL = byName['Sky canal to the Greenhouse']; // the train stays while the board is read, and leaves with the boat
const LINE = byName['Through the line'], RENO_SPAN = [byName['Renovation hold'].s0 - 30, byName['Renovated'].s1 + 30];
const PAGE_MOVE = byName['Through the page'], INTO_CABIN = byName['Into the cabin'], TO_PANEL = byName['To the admin panel'];
function focus(p) {
  env.map = beat('Map hold', p, 40); env.tools = beat('Care tools', p, 30); env.grow = sstep(byName['Sky canal to the Greenhouse'].s1 - 60, byName['Care tools'].s0, p);
  env.cards = sstep(INTO_CABIN.s0 + 10, byName['Signal Cabin hold'].s1, p); env.levers = Math.min(1, Math.max(0, (p - TO_PANEL.s0) / (TO_PANEL.s1 - TO_PANEL.s0 + 25)));
  env.page = sstep(lerp(PAGE_MOVE.s0, PAGE_MOVE.s1, 0.28), lerp(PAGE_MOVE.s0, PAGE_MOVE.s1, 0.75), p); // the colour spreads from where the walk goes through
  // The Renovation's line follows the walk across the room. Resting at either end, the cursor slides it back and forth to compare.
  const lu = Math.min(1, Math.max(0, (p - LINE.s0) / (LINE.s1 - LINE.s0))), still = p > RENO_SPAN[0] && p < RENO_SPAN[1] && (lu === 0 || lu === 1) ? 1 : 0;
  env.wipe = Math.min(RENO.x1 + 0.4, Math.max(RENO.x0 - 0.4, lerp(RENO.x0 - 0.4, RENO.x1 + 0.4, lu) + still * pointer.sx * 2.6));
  const back = now - clockAt; env.lineU = lu; if (back > 0 && back < 3.5) env.wipe = lerp(env.wipe, lu < 0.5 ? RENO.x1 + 0.4 : RENO.x0 - 0.4, Math.sin((back / 3.5) * Math.PI)); // the time machine: the other version sweeps over the room, then away
  EX.forEach((m, i) => { env.extra.u[i] = (p - (m.s0 - 8)) / 26; }); // below 0 the row is blank, 0 to 1 it flips, then it has landed
  env.extra.lit = EX.findIndex((m) => p >= m.s0 - 2 && p < m.s1 - 2);
  env.extra.train = sstep(EX0.s0 - 50, EX0.s0 + 20, p); env.extra.leave = sstep(CANAL.s0 + 5, CANAL.s0 + 70, p);
  SITE_STOPS.forEach((s, i) => { env.site[i] = sstep(s - 26, s - 5, p) * (1 - sstep(s + 6, s + 26, p)); });
  SHOPS.forEach((s, i) => { env.shop[i] = beat(`Shop: ${s.name}`, p); });
  COUNTERS.forEach((c, i) => { env.counter[i] = beat(`Counter: ${c.name}`, p); });
  const x = ((p - TV_SPAN[0]) / (TV_SPAN[1] - TV_SPAN[0])) * CHANNELS, ch = Math.floor(x);
  env.tv.ch = x < 0 ? -1 : Math.min(CHANNELS - 1, ch); env.tv.f = x < 0 || x >= CHANNELS ? 1 : x - ch;
  if (state.seat) { env.tv.ch = state.seat.ch; env.tv.f = Math.min(1, (performance.now() / 1000 - state.seat.at) / 1.5); } // seated: the remote, not the scroll, picks the channel
}

// ---------- room cards: what each shop and counter means, in HTML over the canvas ----------
// Plans and launch prices are from the rate card of 13 Nov 2026 (business-and-pricing.md).
const PLANS = [
  { price: '₹15,000', line: '1 to 3 pages with one signature animation, Call and WhatsApp buttons, Google Maps and basic SEO.', bullets: ['1 to 3 pages', 'One signature animation', 'Call and WhatsApp buttons, Google Maps'] },
  { price: '₹40,000', line: "Your business's story across 5 to 7 pages, with one custom 3D moment, an enquiry form and legal pages.", bullets: ['Story concept, 5 to 7 pages', 'One custom 3D moment', 'Enquiry form, SEO, legal pages, domain and hosting setup'] },
  { price: '₹65,000', line: 'Everything in Signature, plus an admin panel for enquiries or appointments, content editing and staff login.', bullets: ['Everything in Signature', 'Admin panel for enquiries or appointments', 'Content editing and staff login'] },
].map((pl, i) => ({ ...pl, name: SHOPS[i].name }));
const WORTH = [
  ['Made for you, not a template', 'Your story, your design,', 'built around how your customers think.'],
  ['Safe by default', 'SSL, safe forms, backups,', 'logins locked down.'],
  ['The paperwork done right', 'Privacy note, cookie note, terms,', 'licences for fonts and music.'],
  ['Built to bring you customers', 'Calls, WhatsApp messages, bookings and walk-ins,', 'not just a pretty page.'],
];
const INFO = {};
PLANS.forEach((pl, i) => { INFO[`Shop: ${pl.name}`] = { label: `Shop 0${i + 1} of 03`, h: pl.name, lines: [pl.line], plan: pl.name }; });
COUNTERS.forEach((c, i) => { INFO[`Counter: ${c.name}`] = { label: `Counter 0${i + 1} · ${c.name}${c.name === 'Income' ? ' · the ledger' : ''}`, h: WORTH[i][0], lines: WORTH[i].slice(1) }; });
SITES.forEach((s, i) => { INFO['site' + i] = { label: `Demo 0${i + 1} of 0${SITES.length} · fictional business`, h: s.name, lines: ['One of five demo sites we built to show the range. The business is made up; the site is real.'] }; });
EXTRAS.forEach((e, i) => { INFO[`Extra: ${e.name}`] = { label: `Add-on 0${i + 1} of 0${EXTRAS.length} · ask at the desk`, h: e.title, lines: [e.line] }; });
BOOKS.forEach((b, i) => { INFO['book' + i] = { label: `How we work · volume 0${i + 1} of 0${BOOKS.length}`, h: b.title, lines: [b.line], act: i === BOOKS.length - 1 ? ['The shelf moves. Step in', () => enterSecret('lab')] : ['Put it back', () => { hidden.open(-1); sfx.page(); }] }; });
INFO['Settle on the desk'] = { label: 'Room 10 · Rooftop · try it', h: 'Your name, in lights', lines: ['Type your business name and the desk wears it. Then tell Rahul about it.'], sign: true };
let signText = '';
SECRETS.forEach((s, i) => { INFO['secret:' + s.id] = { label: `Secret 0${i + 1} of 0${SECRETS.length}`, h: s.name, lines: [s.text], act: ['Back to the walk', () => leaveSecret()] }; });
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
const info = document.getElementById('info'), chooser = document.getElementById('chooser');
let infoFor = null;
// ---------- 3D cards: on a desktop, a room's card stands in the room beside the thing it explains, and folds away when the walk moves on ----------
// HTML in 3D (CSS3DRenderer): readable text and real buttons, held at a world position. Phones keep the flat card, which fits a small screen better.
const css = new CSS3DRenderer(), cssScene = new THREE.Scene();
css.domElement.id = 'cards3d'; document.body.append(css.domElement);
const C3 = 0.0026; // metres per CSS pixel: a 420 px card is 1.1 m wide
const ANCHOR = {}; // INFO key: [x, y, z, yaw] where its card stands
COUNTERS.forEach((c) => { ANCHOR[`Counter: ${c.name}`] = [c.x + 1.35, 1.7, -20.4, 0]; }); // right of what floats over the counter
SHOPS.forEach((s) => { ANCHOR[`Shop: ${s.name}`] = [10.25, 1.7, s.z + 1.3, -Math.PI / 2]; }); // right of the shop's device
EXTRAS.forEach((e, i) => { ANCHOR[`Extra: ${e.name}`] = [15 + (i - 1.5) * 1.45, H.extras + 1.15, -20.85, 0]; }); // stepping out of the front of its carriage
demoCards.forEach((c, i) => { // beside each demo world, on the side away from the page
  const y = c.m.rotation.y, side = new THREE.Vector3(Math.cos(y), 0, -Math.sin(y)), toward = new THREE.Vector3(Math.sin(y), 0, Math.cos(y));
  const at = c.m.position.clone().addScaledVector(side, 1.75).addScaledVector(toward, 0.7); ANCHOR['site' + i] = [at.x, c.m.position.y + 0.05, at.z, y];
});
const BIG = { site0: 1.45, site1: 1.45, site2: 1.45, site3: 1.45, site4: 1.45 }; // the demo worlds are seen from further away
const card3d = {}; // key: { obj, box }
function fillCard(box, d) {
  box.replaceChildren(el('div', d.label, 'label mono'), el('h2', d.h), ...d.lines.map((l) => el('p', l)));
  if (d.plan) { const b = el('button', `Ask about ${d.plan}`, 'pill solid'); b.onclick = () => openForm(d.plan); box.append(b); }
  if (d.act) { const b = el('button', d.act[0], 'pill solid'); b.onclick = d.act[1]; box.append(b); }
}
function getCard(key) {
  if (card3d[key]) return card3d[key];
  const box = el('article', null, 'c3'); fillCard(box, INFO[key]);
  const obj = new CSS3DObject(box), [x, y, z, yaw] = ANCHOR[key]; obj.position.set(x, y, z); obj.rotation.y = yaw; obj.userData.k = BIG[key] || 1; obj.scale.setScalar(C3); cssScene.add(obj);
  return (card3d[key] = { obj, box });
}
const flatCards = lowQuality; // phones: the flat card
// "Choose one": the three plans hang in the room in a shallow arc in front of the walk, each on two cords.
const chooseCards = [];
{
  const cm = byName['Choose one'], s = lerp(cm.s0, cm.s1, 0.6), p = rail.pos(s), yr = THREE.MathUtils.degToRad(rail.yaw(s));
  const f = new THREE.Vector3(-Math.sin(yr), 0, -Math.cos(yr)), r = new THREE.Vector3(Math.cos(yr), 0, -Math.sin(yr));
  PLANS.forEach((pl, k) => {
    const box = el('article', null, 'c3 plan'), ul = el('ul'), b = el('button', `Choose ${pl.name}`, 'pill solid');
    box.style.setProperty('--plan', '#' + SHOPS[k].color.toString(16).padStart(6, '0'));
    for (const t of pl.bullets) ul.append(el('li', t));
    b.onclick = () => openForm(pl.name);
    box.append(el('div', `Plan 0${k + 1} of 03`, 'label mono'), el('h2', pl.name), el('div', pl.price, 'price'), ul, b);
    const obj = new CSS3DObject(box), at = new THREE.Vector3(p[0], 1.75, p[2]).addScaledVector(f, 3.1).addScaledVector(r, (k - 1) * 1.28).addScaledVector(f, -Math.abs(k - 1) * 0.35);
    obj.position.copy(at); obj.rotation.y = Math.atan2(p[0] - at.x, p[2] - at.z); obj.scale.setScalar(C3); cssScene.add(obj); chooseCards.push(obj);
  });
  const head = el('div', null, 'c3 head'); head.append(el('h2', 'Choose one'), el('p', 'Launch prices, for the first 5 clients', 'mono'));
  const obj = new CSS3DObject(head); obj.position.set(p[0], 2.75, p[2]).addScaledVector(f, 3.2); obj.rotation.y = yr; obj.scale.setScalar(C3); cssScene.add(obj); chooseCards.push(obj);
}
function show3d(obj, o) { // fade in, rise a little, tilt up into place
  const e = obj.element; e.style.opacity = o; e.classList.toggle('on', o > 0.5); obj.visible = o > 0.01;
  obj.scale.setScalar(C3 * (obj.userData.k || 1) * (0.92 + 0.08 * o));
}
function cards(p) {
  const m = rail.moveAt(p), si = env.site.findIndex((f) => f > 0.3), u = (p - m.s0) / (m.s1 - m.s0);
  if (hidden.opened >= 0 && m !== SHELF_HOLD) hidden.open(-1); // the book goes back when the walk moves on
  const pinnedCard = state.secret ? 'secret:' + state.secret.id : hidden.opened >= 0 ? 'book' + hidden.opened : null, key = pinnedCard || (si >= 0 ? 'site' + si : m.name), d = INFO[key];
  if (d && infoFor !== key) {
    infoFor = key;
    info.replaceChildren(el('div', d.label, 'label mono'), el('h2', d.h), ...d.lines.map((l) => el('p', l)));
    if (d.plan) { const b = el('button', `Ask about ${d.plan}`, 'pill solid'); b.onclick = () => openForm(d.plan); info.append(b); }
    if (d.act) { const b = el('button', d.act[0], 'pill solid'); b.onclick = d.act[1]; info.append(b); }
    if (d.sign) { const i = el('input', null, 'sign'); i.placeholder = 'Your business name'; i.maxLength = 40; i.value = signText; i.setAttribute('aria-label', 'Your business name'); i.oninput = () => { signText = i.value; deskSign(signText); hidden.sketchName(signText); }; info.append(i); }
  }
  const o = pinnedCard ? 1 : si >= 0 ? sstep(0.3, 0.8, env.site[si]) : d ? sstep(0, 0.22, u) * (m === lastMove ? 1 : 1 - sstep(0.8, 1, u)) : 0;
  const in3d = !flatCards && !pinnedCard && ANCHOR[key];
  for (const k in card3d) show3d(card3d[k].obj, in3d && k === key ? o : 0);
  if (in3d) getCard(key) && show3d(card3d[key].obj, o);
  const of = in3d ? 0 : o;
  info.style.opacity = of; info.style.transform = `translateY(${(1 - of) * 14}px)`; info.classList.toggle('on', of > 0.5);
  const oc = m.name === 'Choose one' ? sstep(0.05, 0.25, u) * (1 - sstep(0.85, 1, u)) : 0;
  for (const c of chooseCards) show3d(c, flatCards ? 0 : oc);
  const ocf = flatCards ? oc : 0;
  chooser.style.opacity = ocf; chooser.classList.toggle('on', ocf > 0.5);
  const canSit = !state.seat && env.tv.ch >= 0 && p < TV_SPAN[1] && !steps.travelling;
  sitBtn.classList.toggle('on', flatCards && canSit); show3d(sit3d, flatCards ? 0 : canSit ? 1 : 0);
  sit3d.rotation.y = Math.atan2(camera.position.x - sit3d.position.x, camera.position.z - sit3d.position.z);
  startBtn.classList.toggle('on', m === lastMove && u > 0.45); who.classList.toggle('on', m === lastMove && u > 0.45);
}
for (const pl of PLANS) {
  const card = el('article'), ul = el('ul'), b = el('button', `Choose ${pl.name}`, 'pill solid');
  for (const t of pl.bullets) ul.append(el('li', t));
  b.onclick = () => openForm(pl.name);
  card.append(el('h3', pl.name), el('div', pl.price, 'price'), ul, b); chooser.querySelector('.cards').append(card);
}

// ---------- the front desk's application form. Nothing is stored: submit only opens WhatsApp with the answers filled in. ----------
const formBox = document.getElementById('form'), form = formBox.querySelector('form'), startBtn = document.getElementById('startBtn'), who = document.getElementById('who');
function openForm(plan) {
  formBox.classList.remove('sent'); form.reset();
  if (plan) form.elements.need.value = plan;
  if (signText.trim()) form.elements.business.value = signText.trim();
  syncEmail(); lenis.stop(); formBox.showModal(); // the page behind stays where it is
}
const syncEmail = () => { const on = form.elements.contact.value === 'Email'; form.elements.email.closest('label').hidden = !on; form.elements.email.required = on; };
form.addEventListener('change', syncEmail);
form.addEventListener('submit', (e) => {
  e.preventDefault(); // the browser has already checked the required fields
  const f = form.elements, row = (k, v) => (v.trim() ? `${k}: ${v.trim()}\n` : '');
  const text = 'Hi Rahul, I would like to start a project with Scrollstory.\n' + row('Name', f.name.value) + row('Business', f.business.value) + row('I need', f.need.value) + row('Budget', f.budget.value) +
    row('Reach me by', f.contact.value) + row('Email', f.contact.value === 'Email' ? f.email.value : '') + row('Message', f.message.value);
  formBox.classList.add('sent');
  window.open(`https://wa.me/919949088659?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
});
formBox.addEventListener('close', () => lenis.start());
for (const b of formBox.querySelectorAll('.close')) b.onclick = () => formBox.close();
startBtn.onclick = () => openForm();
const deskBox = new THREE.Box3(new THREE.Vector3(13.4, H.rooftop, 7), new THREE.Vector3(16.6, H.rooftop + 2.6, 8)); // the desk and the plan cards over it
// ---------- secrets: side trips off the walk. The camera fades into each and back to the same spot. What was found is kept in this browser only. ----------
const SHELF_HOLD = byName['Bookshelf hold'], foundIds = new Set();
try { for (const id of JSON.parse(localStorage.getItem('secrets') || '[]')) if (SECRETS.some((s) => s.id === id)) foundIds.add(id); } catch { /* private mode: nothing is kept */ }
const foundBox = document.getElementById('found');
function showFound() {
  foundBox.replaceChildren(el('div', foundIds.size === SECRETS.length ? 'You found every secret' : `${foundIds.size} of ${SECRETS.length} secrets found`, 'mono'));
  for (const s of SECRETS) if (foundIds.has(s.id) && !s.egg) { const b = el('button', '✦ ' + s.name, 'mono'); b.onclick = () => { togglePlan(false); enterSecret(s.id); }; foundBox.append(b); }
  for (const s of SECRETS) if (foundIds.has(s.id) && s.egg) foundBox.append(el('p', '✦ ' + s.name, 'mono egg'));
  for (const s of SECRETS) if (!foundIds.has(s.id)) { // a clue for each one still hidden, and a way to get close
    const row = el('div', null, 'clue'), b = el('button', 'Take me near', 'mono'); row.append(el('p', '? ' + s.clue));
    b.onclick = () => { togglePlan(false); const w = hidden.ways.find((q) => q.id === s.id); jump(nearStop(w.at)); hidden.beckon(s.id, now + 9); };
    row.append(b); foundBox.append(row);
  }
  for (const id of foundIds) hidden.found(id);
}
// the closest stop that has a point in front of the camera (within 38 degrees of its view), for the floor plan's hints
const nearStop = (at) => rail.stops.reduce((b, s, i) => {
  const p = rail.pos(s), y = THREE.MathUtils.degToRad(rail.yaw(s)), q = THREE.MathUtils.degToRad(rail.pitch(s));
  const v = [at.x - p[0], at.y - p[1], at.z - p[2]], d = Math.hypot(...v), f = [-Math.sin(y) * Math.cos(q), Math.sin(q), -Math.cos(y) * Math.cos(q)];
  const facing = (v[0] * f[0] + v[1] * f[1] + v[2] * f[2]) / d > Math.cos(THREE.MathUtils.degToRad(38)); // shortcut: no wall test, so a stop behind a wall could win; fine for the three ways in today
  return facing && d < b[1] ? [i, d] : b;
}, [0, 1e9])[0];
// A nudge: resting at a stop with a way in on screen that is still hidden, a line says so, once per secret per visit.
const nudgeBox = document.getElementById('nudge'), nudged = new Set(), scrN = new THREE.Vector3();
let nudgeSince = 0;
function nudge(t) {
  const w = !steps.travelling && !state.secret && !state.seat && hidden.ways.find((q) => !q.found && !nudged.has(q.id) && q.at.distanceTo(camera.position) < q.near && (scrN.copy(q.at).project(camera), scrN.z < 1 && Math.abs(scrN.x) < 0.9 && Math.abs(scrN.y) < 0.9));
  if (!w) { nudgeSince = 0; return; }
  if (!nudgeSince) nudgeSince = t;
  if (t - nudgeSince < 2.5) return;
  nudged.add(w.id); hidden.beckon(w.id, t + 6); nudgeBox.textContent = 'Psst. Something here opens. Look for the fireflies.';
  gsap.fromTo(nudgeBox, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }); gsap.to(nudgeBox, { opacity: 0, duration: 0.6, delay: 5 });
}
function through(change) { // a short fade covers every jump in or out
  if (state.fading) return;
  state.fading = true;
  gsap.to(veil, { opacity: 1, duration: 0.45, ease: 'none', onComplete() { change(); gsap.to(veil, { opacity: 0, duration: 0.45, ease: 'none', onComplete() { state.fading = false; } }); } });
}
function markFound(id) { if (foundIds.has(id)) return; foundIds.add(id); sfx.chime(foundIds.size); try { localStorage.setItem('secrets', JSON.stringify([...foundIds])); } catch { /* not kept */ } showFound(); if (foundIds.size === SECRETS.length) firework(); }
function toast(text, hold = 5) { nudgeBox.textContent = text; gsap.fromTo(nudgeBox, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }); gsap.to(nudgeBox, { opacity: 0, duration: 0.6, delay: hold }); }
// Finding every secret: a burst of holographic diamonds from the middle of the screen.
function firework() {
  if (state.reduce) return toast('You found every secret. Thank you for looking so closely.', 6);
  for (let k = 0; k < 48; k++) {
    const d = document.createElement('i'); d.className = 'spark'; d.style.background = ['#9fe8ff', '#d9b8ff', '#ffc9a0', '#f2d98b'][k % 4]; document.body.append(d);
    const a = (k / 48) * Math.PI * 2, r = 120 + Math.random() * 260;
    gsap.fromTo(d, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: Math.cos(a) * r, y: Math.sin(a) * r + 80, rotate: 180, scale: 0.3, opacity: 0, duration: 1.6 + Math.random() * 0.8, ease: 'power2.out', onComplete: () => d.remove() });
  }
  toast('You found every secret. Thank you for looking so closely.', 6);
}
// The v1.1 ones happen where they are, with no room to step into.
let clockAt = -9; // when the Renovation's clock was last turned back
const EGGS = {
  tile() { setTimeout(() => jump(steps.first(LEVELS.find((r) => r.name === 'The stairs').s)), 900); toast('A shortcut, under the water.', 3); },
  kite() { toast('The golden kite.', 3); },
  tank() { toast('The VIP desk. This form goes straight to Rahul.', 4); setTimeout(() => openForm(), 1200); },
  clock() { clockAt = now; reno.turnBack(now); toast(env.lineU < 0.5 ? 'Forward to the new site, for a moment.' : 'Back to the old site, for a moment.', 3); },
  seal() { draft.openSeal(now); toast('Ideas we drop on the way to a good page.', 4); },
  keyhole() { toast('Every story has moving parts. Thanks for finding them all.', 6); },
};
function enterSecret(id) {
  const s = SECRETS.find((q) => q.id === id);
  if (id === 'keyhole' && [...foundIds].filter((q) => q !== 'keyhole').length < 6) { toast('The keyhole is cold. It opens once you have found six other secrets.', 4); return; }
  if (s.egg) { hidden.egg(id, now); markFound(id); EGGS[id](); sfx.page(); return; }
  through(() => {
    state.secret = s; document.body.classList.toggle('under', !!s.flip); hidden.open(-1); markFound(id);
  });
}
function leaveSecret() { through(() => { state.secret = null; document.body.classList.remove('under'); }); }
// ---------- the HOME sofa: sit to watch. The camera sits, then leans in to the set; the channel tiles float beside it. ----------
const sitBtn = document.getElementById('sitBtn'), remoteBar = document.getElementById('remote');
function remote(ch) { if (!state.seat) return; state.seat.ch = (ch + CHANNELS) % CHANNELS; state.seat.at = performance.now() / 1000; sfx.blip(); remoteBar.querySelector('b').textContent = `CH 0${state.seat.ch + 1}`; remoteBar.classList.toggle('last', state.seat.ch === CHANNELS - 1); }
function sit(on) {
  if (on === !!state.seat) return;
  if (on) { state.seat = { ch: Math.max(0, env.tv.ch), at: 0 }; remote(state.seat.ch); } else state.seat = null;
  document.body.classList.toggle('seated', on);
  gsap.to(env, { seated: on ? 2 : 0, duration: state.reduce ? 0.01 : on ? 2.2 : 1.4, ease: 'power2.inOut', overwrite: true });
}
sitBtn.onclick = () => sit(true);
// On a desktop the way to sit is at the set itself: a small control hovering over the TV, turned to the viewer.
const sit3d = (() => {
  const box = el('button', null, 'c3 sit'); box.append(el('b', '▶'), el('span', 'Sit & watch'), el('small', 'Scrollstory TV · 4 channels', 'mono'));
  box.onclick = () => sit(true);
  const obj = new CSS3DObject(box); obj.position.set(TV[0], H.home + 2.85, TV[2] + 0.3); obj.userData.k = 2.4; obj.scale.setScalar(C3); cssScene.add(obj); return obj; // over the set, turned to the viewer each frame
})();
remoteBar.querySelector('.prev').onclick = () => remote(state.seat.ch - 1);
remoteBar.querySelector('.next').onclick = () => remote(state.seat.ch + 1);
remoteBar.querySelector('.up').onclick = () => sit(false);
remoteBar.querySelector('.tell').onclick = () => { sit(false); openForm(); };
const carBoxes = EXTRAS.map((e, k) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(15 + (k - 1.5) * 1.45, H.extras + 0.7, -21.7), new THREE.Vector3(1.32, 1.0, 0.8)));
const carAt = (r) => (state.body > EX0.s0 - 5 && state.body < EX_END.s0 + 5 ? carBoxes.findIndex((b) => r.ray.intersectsBox(b)) : -1);
const tvBox = new THREE.Box3(new THREE.Vector3(TV[0] - 1.5, H.home, TV[2] - 1.2), new THREE.Vector3(TV[0] + 1.5, H.home + 3.7, TV[2] + 0.8)); // the set
// Things in the Sky Quarter rooms that answer a click, each only while the walk is in its room.
const ROOMS3 = [{ span: [byName['Drafting hold'].s0 - 20, byName['Back through to the funicular'].s1], m: draft }, { span: [byName['Into the cabin'].s0, byName['Out of the cabin'].s0 + 20], m: cabin }, { span: [byName['Into the Greenhouse'].s0, byName['Kites up to the Rooftop'].s0 + 20], m: garden }];
const room3 = () => (state.secret || state.seat ? null : ROOMS3.find((r) => state.body > r.span[0] && state.body < r.span[1]));
addEventListener('pointermove', (e) => { // a book under the cursor slides half out; inside a secret, its live things
  const r3 = room3(); if (r3) { ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2), camera); canvas.style.cursor = r3.m.over(ray) ? 'pointer' : ''; return; }
  if (state.secret && !state.secret.flip) { ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2), camera); canvas.style.cursor = hidden.over(ray, state.secret.id) ? 'pointer' : ''; return; }
  if (!state.secret && state.body > EX0.s0 - 5 && state.body < EX_END.s0 + 5) { ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2), camera); canvas.style.cursor = carAt(ray) >= 0 ? 'pointer' : ''; return; }
  if (rail.moveAt(state.body) !== SHELF_HOLD || state.secret) return hidden.hover(-1);
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2), camera);
  const hit = hidden.pick(ray); hidden.hover(hit?.book ?? -1); canvas.style.cursor = hit ? 'pointer' : '';
});
addEventListener('click', (e) => {
  if (e.target.closest('button, a, dialog, #info, #chooser, #plan, header, #pips, .c3') || document.body.classList.contains('intro')) return;
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2), camera);
  if (state.secret) { if (hidden.press(ray, state.secret.id)) sfx.blip(); return; }
  const r3 = room3(); if (r3?.m.pick(ray)) { sfx.blip(); return; }
  const hit = hidden.pick(ray);
  if (hit?.secret) return enterSecret(hit.secret);
  if (hit && rail.moveAt(state.body) === SHELF_HOLD) { hidden.open(hidden.opened === hit.book ? -1 : hit.book); sfx.page(); return; }
  if (state.seat) { const hit = ray.intersectObjects(seat.tiles)[0]; if (hit) remote(hit.object.userData.ch); return; }
  const car = carAt(ray); // the Extras train: a click on a carriage goes to that add-on's stop, and its card steps out of it
  if (car >= 0) { const m = byName[`Extra: ${EXTRAS[car].name}`]; steps.goto(rail.stops.findIndex((s) => s >= m.s0 - 1 && s <= m.s1 + 1)); sfx.blip(); return; }
  const onTv = env.tv.ch >= 0 && state.body < TV_SPAN[1];
  if (rail.moveAt(state.body) !== lastMove && !onTv) return;
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2), camera);
  if (onTv) { if (ray.ray.intersectsBox(tvBox)) sit(true); return; } // a click on the set sits down to watch
  if (ray.ray.intersectsBox(deskBox)) openForm();
});

// ---------- floor plan ----------
const plan = document.getElementById('plan'), planBtn = document.getElementById('planBtn');
for (const r of rail.rooms) {
  const b = document.createElement('button'); b.className = 'mono'; b.textContent = r.name; b.setAttribute('role', 'menuitem');
  b.onclick = () => { if (free) lenis.scrollTo((r.s / rail.total) * lenis.limit, { immediate: true, force: true }); else jump(steps.first(r.s)); togglePlan(false); };
  plan.insertBefore(b, foundBox); r.btn = b;
}
// A far jump (floor plan, a distant pip) does not fly through the building: a card for the room comes up, the walk lands on the stop underneath, the card lifts.
const jumpCard = document.getElementById('jump');
function jump(i) {
  if (state.fading) return;
  state.fading = true;
  const p = rail.stops[i], k = LEVELS.reduce((b, r, j) => (r.s <= p + 1 ? j : b), 0), L = LEVELS[k];
  jumpCard.querySelector('b').textContent = String(k + 1).padStart(2, '0');
  jumpCard.querySelector('span').textContent = L.name.replace(/^\d+ /, '');
  jumpCard.style.setProperty('--card', L.accent);
  const land = () => { lenis.scrollTo(stopPx(i), { immediate: true, force: true }); steps.land(i); state.body = state.look = p; state.vBody = state.vLook = 0; };
  const [inn, out] = state.reduce ? [{ opacity: 1, duration: 0.4 }, { opacity: 0, duration: 0.4 }] : [{ yPercent: 0, rotate: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, { yPercent: -110, rotate: -3, duration: 0.6, ease: 'power3.in' }];
  gsap.timeline({ onComplete() { state.fading = false; } })
    .fromTo(jumpCard, state.reduce ? { opacity: 0, yPercent: 0, rotate: 0 } : { yPercent: 110, rotate: 4, opacity: 1 }, { ...inn, onComplete: land })
    .to(jumpCard, { ...out, delay: 0.45 });
}
function togglePlan(open = !plan.classList.contains('open')) { plan.classList.toggle('open', open); planBtn.setAttribute('aria-expanded', open); }
planBtn.onclick = () => togglePlan();
const hud = document.getElementById('hud'), soundBtn = document.getElementById('soundBtn');
soundBtn.onclick = () => { const on = sfx.toggle(); soundBtn.textContent = on ? 'Sound on' : 'Sound off'; soundBtn.setAttribute('aria-pressed', on); if (on) sfx.level(levelNow); };
showFound();
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select')) return; // typing in the form
  if (e.key === 'Escape') { togglePlan(false); if (state.secret) leaveSecret(); sit(false); hidden.open(-1); }
  if (state.seat && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) remote(state.seat.ch + (e.key === 'ArrowLeft' ? -1 : 1));
  if (e.key === 'm' || e.key === 'M') soundBtn.click();
  if (e.key === 'h' || e.key === 'H') hud.classList.toggle('off');
  if (e.key === 'r' || e.key === 'R') { state.reduce = !state.reduce; state.hold = null; }
});

// ---------- frame ----------
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
  // portrait: widen the view so the sides of each frame (the plaque, the sign, the shelf) stay in it; at least 48 degrees across, at most 85 up and down
  camera.fov = camera.aspect < 1 ? Math.min(85, Math.max(55, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(24)) / camera.aspect)))) : 55;
  camera.updateProjectionMatrix(); css.setSize(innerWidth, innerHeight); gelPass.target.setSize(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio()); }
addEventListener('resize', resize); resize();

let frames = 0, propsReady = false;
const sfxWas = { ch: -1, k: 0, hat: false };
const ride = portalRide({ lowQuality });
dressing.ready.then(() => { propsReady = true; });
const prev = { pos: null, yaw: 0, t: 0 };
const shown = { speed: 0, turn: 0, fps: 0 };
gsap.ticker.add((time, deltaMs) => {
  lenis.raf(time * 1000);
  now = time;
  const dt = Math.min(0.05, Math.max(0.001, deltaMs / 1000));
  let pT = target();

  if (state.reduce) { // reduced motion: fade between hold frames, never fly
    const h = free ? [...holds].reverse().find((m) => m.s0 <= pT + 1) || holds[0] : steps.dest, to = free ? lerp(h.s0, h.s1, 0.6) : rail.stops[h];
    if (h !== state.hold && !state.fading) { state.hold = h; fadeTo(() => to); }
    pT = state.body;
  } else if (!state.started) { state.body = state.look = pT; state.started = true; } // open where the page was left
  else {
    const zone = rail.moveAt(state.body).zone, st = FEEL.smooth[zone], lim = speedLimit(state.body, zone, Math.abs(pT - state.body));
    [state.body, state.vBody] = smoothDamp(state.body, pT, state.vBody, st, lim, dt);
    [state.look, state.vLook] = smoothDamp(state.look, pT, state.vLook, st * FEEL.lookFactor, lim, dt);
  }

  // Cursor: two springs in a row, so the view starts to move softly and never twitches.
  const L = FEEL.lean;
  [pointer.sx, pointer.vx] = smoothDamp(pointer.sx, pointer.x, pointer.vx, L.pointer, 100, dt);
  [pointer.sy, pointer.vy] = smoothDamp(pointer.sy, pointer.y, pointer.vy, L.pointer, 100, dt);
  [pointer.cx, pointer.cvx] = smoothDamp(pointer.cx, pointer.sx, pointer.cvx, L.camera, 100, dt);
  [pointer.cy, pointer.cvy] = smoothDamp(pointer.cy, pointer.sy, pointer.cvy, L.camera, 100, dt);
  // Moving the cursor stirs the air: everything that drifts speeds up, then calms over two seconds.
  env.wind = 1 + 0.5 * Math.max(0, 1 - (time - pointer.stirred) / 2);
  env.air += dt * env.wind; // the clock of everything that drifts. Scaling time itself by the wind made things jump.

  const S = state.reduce ? { yaw: 0, pitch: 0, bob: 0 } : FEEL.sway;
  const pos = rail.pos(state.body);
  const yaw = rail.yaw(state.look) - pointer.cx * L.yaw + S.yaw * (Math.sin(time * 0.45) + 0.45 * Math.sin(time * 0.83 + 1));
  const pitch = rail.pitch(state.look) - pointer.cy * L.pitch + S.pitch * Math.sin(time * 0.37 + 2);
  const yr = THREE.MathUtils.degToRad(yaw);
  camera.position.set(pos[0] + Math.cos(yr) * pointer.cx * L.shift, pos[1] + S.bob * Math.sin(time * 0.6), pos[2] - Math.sin(yr) * pointer.cx * L.shift);
  camera.rotation.set(THREE.MathUtils.degToRad(pitch), yr, 0); // no roll: the horizon stays level
  if (state.secret?.flip) camera.rotation.z = Math.PI; // the mirror: the same place, upside down, with the water for a sky
  else if (state.secret) { const q = state.secret.pose; camera.position.set(q.pos[0] + pointer.cx * 0.25, q.pos[1] + S.bob * Math.sin(time * 0.6), q.pos[2]); camera.rotation.set(THREE.MathUtils.degToRad(q.pitch - pointer.cy * 3), THREE.MathUtils.degToRad(q.yaw - pointer.cx * 8), 0); }
  if (env.seated > 0) { // seated: from the walk to the sofa (0 to 1), then leaning in to the set (1 to 2)
    const k = env.seated, sofa = new THREE.Vector3(-6.5, H.home + 1.15, -16.2), close = seat.screen.clone().addScaledVector(seat.normal, 1.45).addScaledVector(seat.side, 0.3);
    const look = new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(-pointer.cy * 2), 0.45 - pointer.cx * 0.05, 0, 'YXZ'));
    camera.position.lerp(sofa, Math.min(1, k)).lerp(close, Math.max(0, k - 1));
    camera.quaternion.slerp(look, Math.min(1, k * 1.2));
  }
  camera.updateMatrixWorld();

  theme(state.body); atmosphere(pos[1]);
  focus(state.body);
  for (const c of demoCards) { // each card arrives as the backward walk brings it into the frame, and leaves the same way on the way back
    const from = GALLERY.s0 + ((GALLERY.s1 - GALLERY.s0) * (8 - c.z)) / 17 - 4; // the walk runs from z = 7 to z = -10; a card shows once the camera is 1 m past it
    const r = Math.min(1, Math.max(0, (state.body - from) / 36)), u = Math.max(0, (r - 0.8) / 0.2);
    c.r.value = r; c.line.value = sstep(0.22, 0.3, r) * (0.6 + 0.4 * sstep(0.5, 0.6, r)) * (1 - sstep(0.82, 1, r));
    c.motes.material.opacity = sstep(0.02, 0.12, r) * (1 - sstep(0.3, 0.5, r)); c.motes.visible = c.motes.material.opacity > 0.01;
    c.m.scale.setScalar(1 + 0.07 * Math.sin(Math.PI * u) * (1 - u)); // a soft settle
  }
  reno.update(time, dt, env.wipe); draft.update(time, dt, env.page); clock.keyhole.material.emissiveIntensity = [...foundIds].filter((q) => q !== 'keyhole').length >= 6 ? 1.2 + Math.sin(time * 3) * 0.6 : 0; cabin.update(time, dt, env.cards, env.levers); atlas.update(time, dt, env.extra.u, env.map); garden.update(time, dt, env.grow, env.tools);
  const KM = byName['Kites up to the Rooftop'], kite = state.body < KM.s0 ? -1 : state.body > KM.s1 ? 2 : (state.body - KM.s0) / (KM.s1 - KM.s0);
  rides.update(time, dt, railAt.set(...pos), kite); // the car, the boat and the kites carry the walk, not the cursor's lean clock.update(time, dt, state.body / rail.total, env.dusk);
  expand(env.site, env.air); hidden.update(time, dt, pointer); if (!free) nudge(time);
  if (env.tv.ch !== sfxWas.ch) { sfxWas.ch = env.tv.ch; if (env.tv.ch >= 0) sfx.blip(); }
  dressing.update(time, dt, env);
  for (const [m, y0, ph] of drift) m.position.y = y0 + Math.sin(env.air * 1.3 + ph) * 0.04;
  caption(state.body); cards(state.body);
  const near = steps.travelling ? steps.dest : steps.nearest(state.body);
  if (near !== pips.at) { pips.children[pips.at]?.classList.remove('here'); pips.children[near].classList.add('here'); pips.at = near; }
  const k = state.reduce ? 0 : gel(state.body, time); if (k > 0.5 && sfxWas.k <= 0.5) sfx.gloop(); sfxWas.k = k;
  const hat = (state.body - HAT.s0) / (HAT.s1 - HAT.s0), inHat = hat > 0 && hat < 1;
  if (inHat !== sfxWas.hat) { sfxWas.hat = inHat; if (inHat) sfx.whoosh(); }
  const under = state.secret?.flip ? 1 : 0;
  if (((k > 0.002 || inHat) && !state.secret) || under) { const U = gelPass.mat.uniforms; U.under.value = under; U.hat.value = inHat && !under ? hat : -1; U.time.value = env.air; U.aspect.value = camera.aspect; U.k.value = under ? 0 : k; renderer.setRenderTarget(gelPass.target); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(gelPass.scene, gelPass.camera);
    if (inHat && !state.reduce) { ride.update(hat, env.air, camera.aspect); renderer.autoClear = false; renderer.clearDepth(); renderer.render(ride.scene, ride.camera); renderer.autoClear = true; } } // things tumbling past in the hat
  else renderer.render(scene, camera);
  if (!flatCards) css.render(cssScene, camera); // the 3D cards, over the picture

  if (pinned > 0 && propsReady && ++frames === 3) { const t = document.createElement('textarea'); t.id = 'shot'; t.textContent = canvas.toDataURL('image/jpeg', 0.85); t.hidden = true; document.body.append(t); }
  // Readout for tuning.
  if (prev.pos) {
    const k = 1 - Math.exp(-dt / 0.15);
    shown.speed = lerp(shown.speed, Math.hypot(pos[0] - prev.pos[0], pos[1] - prev.pos[1], pos[2] - prev.pos[2]) / dt, k);
    shown.turn = lerp(shown.turn, Math.abs(rail.yaw(state.look) - prev.yaw) / dt, k);
    shown.fps = lerp(shown.fps, 1 / dt, k);
  }
  prev.pos = pos; prev.yaw = rail.yaw(state.look);
  if (!hud.classList.contains('off') && time - prev.t > 0.1) {
    prev.t = time;
    const m = rail.moveAt(state.body), c = clearanceAt(pos);
    hud.innerHTML =
      `<b>${m.name}</b>${m.hold ? '  · hold' : ''}\n` +
      `scroll   ${state.body.toFixed(0)} / ${rail.total} vh   lag ${(pT - state.body).toFixed(0)}\n` +
      `speed    ${shown.speed.toFixed(2)} m/s   turn ${shown.turn.toFixed(0)} deg/s\n` +
      `clear    <span${c.dist < CLEAR ? ' class="bad"' : ''}>${c.dist.toFixed(2)}</span> m  ${c.name}\n` +
      `height   ${pos[1].toFixed(1)} m   spring ${FEEL.smooth[m.zone]} s\n` +
      `${shown.fps.toFixed(0)} fps${state.reduce ? '   reduced motion' : ''}`;
    for (const r of rail.rooms) r.btn.classList.toggle('here', r === [...rail.rooms].reverse().find((q) => q.s <= state.body + 30));
  }
});

// ---------- the intro: once per session, never on a pinned frame or a page opened part-way down ----------
{
  const freeze = new URLSearchParams(location.search).get('intro'); // ?intro=3.2 holds the intro at 3.2 s, for screenshots
  let seen = false;
  try { seen = sessionStorage.getItem('intro') === '1'; sessionStorage.setItem('intro', '1'); } catch { /* private mode: play it */ }
  if (freeze !== null || (!pinned && !seen && !(startAt > 0) && scrollY < innerHeight * 0.3)) {
    if (state.reduce && freeze === null) gsap.fromTo(veil, { opacity: 1 }, { opacity: 0, duration: 1, ease: 'none' }); // reduced motion: a 1 s fade
    else { document.getElementById('dusk').style.opacity = 1; intro({ scene, renderer, shell, parts: dressing.front.parts, outlines: dressing.front.blocks, plaque: dressing.plaque, ready: dressing.ready, ripple: (x, z) => dressing.ripple(x, z, now), freezeAt: freeze === null ? null : Number(freeze) }); }
  }
}

if (import.meta.env.DEV || location.search.includes('debug')) window.__world = { state, rail, lenis, FEEL, env, camera, scene, hidden, enterSecret, leaveSecret, THREE }; // for tuning from the console

// Stop drawing when the tab is hidden.
document.addEventListener('visibilitychange', () => (document.hidden && !pinned ? gsap.ticker.sleep() : gsap.ticker.wake())); // a headless capture counts as hidden
