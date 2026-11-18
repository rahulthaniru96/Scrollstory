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
import { gallery, SITES, siteTexture } from './gallery.js';
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
import { COLLIDERS, BRIDGES, STAIR, PHI_END, STAIR_EXIT_WEDGE, stairPt, TV, TV_CHANNELS, EXTRAS, THEME, SKY_BY_HEIGHT, clearanceAt, CLEAR, LEAN_SHIFT, SHOPS, COUNTERS, H, DOORS, MILESTONES, EYE, RENO, floorAt } from './world.js';

// ---------- feel numbers. All are starting values to tune. ----------
const FEEL = {
  smooth: { room: 0.35, stair: 0.5, cloud: 0.6 }, // seconds, body spring
  wheel: 0.8, linger: 0.3, lingerVh: 45, // the wheel scrolls freely, at down to 0.3 of its speed within 45 vh of a stop: it slows where there is something to see, never stops
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
    // A site's screen appears out of thin air as the walk comes up to it: motes, then an outline and a ghost, then the page itself.
    const geo = new THREE.PlaneGeometry(2.0, 1.25), r = { value: 1 }, line = { value: 0 };
    const m = add(geo, new THREE.ShaderMaterial({
      side: THREE.DoubleSide, transparent: true, uniforms: { map: { value: siteTexture(demoCards.length) }, uR: r, uK: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform float uR, uK; varying vec2 vUv;
        void main(){ float k = (1.0 - smoothstep(0.5, 0.95, uR)) * 0.035; // the ghost's colours sit apart, then close up
          vec3 c = vec3(texture2D(map, vUv + vec2(k, 0.0)).r, texture2D(map, vUv).g, texture2D(map, vUv - vec2(k, 0.0)).b);
          gl_FragColor = vec4(c, uK * (smoothstep(0.22, 0.3, uR) * 0.15 + smoothstep(0.45, 0.6, uR) * 0.45 + smoothstep(0.78, 0.95, uR) * 0.4));
          #include <colorspace_fragment>
        }`,
    }), c.x, c.y, c.z);
    m.rotation.y = Math.PI / 2; // on the west wall, facing the walk
    m.add(holoEdges(geo, { everywhere: true, fade: line }));
    const n = 40, at = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) at.set([(Math.random() - 0.5) * 2.0, (Math.random() - 0.5) * 1.25, Math.random() * 0.3], i * 3);
    const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(at, 3)), new THREE.PointsMaterial({ size: 0.045, color: 0xd9c8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.add(motes);
    demoCards.push({ m, r, line, motes, z: c.z });
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
const expand = gallery({ scene, cards: demoCards });
const hidden = secrets({ scene, camera, lowQuality }), sfx = sound();
const withRoot = (m) => Object.assign(m, { root: scene.children[scene.children.length - 1] }); // each of these adds one group to the scene, last
const reno = withRoot(renovation({ scene, lowQuality }));
const draft = withRoot(drafting({ scene, lowQuality })), clock = withRoot(tower({ scene, lowQuality })), cabin = withRoot(signalCabin({ scene, lowQuality })), rides = withRoot(journeys({ scene, lowQuality })), atlas = withRoot(mapRoom({ scene, lowQuality })), garden = withRoot(greenhouse({ scene, lowQuality })), railAt = new THREE.Vector3();

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
const env = { h: 0, dark: 1, fogColor: new THREE.Color(), fogDensity: 0.004, wind: 1, air: 0, pointer: null, shop: [0, 0, 0], counter: [0, 0, 0, 0], tv: { ch: -1, f: 1 }, wipe: -99, page: 0, cards: 0, levers: 0, map: 0, grow: 0, tools: 0, seated: 0, dusk: 0, site: SITES.map(() => 0), extra: { u: EXTRAS.map(() => -1), lit: -1, train: 0, leave: 0 }, tint: new THREE.Color(1, 1, 1) };
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
history.scrollRestoration = 'manual'; // a visit always starts at the gate, where the building builds itself
const startAt = Number(new URLSearchParams(location.search).get('p')); // ?p=1118 opens the walk at that point
if (startAt > 0) scrollTo(0, (startAt / rail.total) * (document.documentElement.scrollHeight - innerHeight));
const free = new URLSearchParams(location.search).has('free'); // ?free=1: the old free scroll, for tuning
const blocked = (e) => state.secret || state.seat || document.body.classList.contains('intro') || document.querySelector('dialog[open]') || e?.target?.closest?.('#plan, [data-lenis-prevent]') || (e?.target?.closest?.('#chooser')?.scrollHeight > chooser.clientHeight + 2);
// Lenis hands every wheel event here first. Coming up to a stop the wheel slows; leaving one it is quicker again. It never stops the walk.
const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: FEEL.wheel, virtualScroll: (d) => {
  if (document.body.classList.contains('intro')) return false; // the building is building itself: watch first
  if (free || d.event.ctrlKey || (blocked(d.event) && !state.seat)) return true; // seated, the wheel still scrolls: it changes the channel
  const p = target(), gap = rail.stops[steps.nearest(p)] - p, k = FEEL.linger + (1 - FEEL.linger) * sstep(0, FEEL.lingerVh, Math.abs(gap));
  d.deltaY *= Math.sign(gap) === Math.sign(d.deltaY) || Math.abs(gap) < 1 ? k : Math.max(k, 0.6);
  return true;
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
  lenis.on('scroll', () => steps.sync(target())); // the wheel, a touch or the scrollbar moved the walk: the keys and pips count from here
  const next = (dir) => { if (steps.travelling) return; const p = target(), i = dir > 0 ? rail.stops.findIndex((q) => q > p + 1) : rail.stops.findLastIndex((q) => q < p - 1); if (i >= 0) steps.goto(i); }; // the next stop ahead, or the one behind
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, button, a') || e.ctrlKey || e.metaKey || e.altKey || blocked(e)) return;
    const dir = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1, ' ': e.shiftKey ? -1 : 1 }[e.key];
    if (dir) { e.preventDefault(); next(dir); }
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && env.tv.ch >= 0 && state.body < TV_SPAN[1]) next(e.key === 'ArrowLeft' ? -1 : 1); // change the channel
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); steps.goto(e.key === 'Home' ? 0 : rail.stops.length - 1); }
  });
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

// ---------- captions: one story, told in order (STORYBOARD.md). Ground floor: what we make. Stairs and Landing: where it comes from. Upstairs: how we work, one chapter a room. Roof: yours next ----------
const COPY = {
  'Arrival hold': ['Scrollstory Studio · Secunderabad', 'Every business has a story.', "Come in, we'll show you ours."],
  'Lobby push in': ['The founder', 'Rahul Thaniru', 'built this building to show how we work.'],
  'Lobby hold': ['Room 01 · The lobby', "We don't just build websites.", 'We tell your story and build its world.'],
  'Renovation hold': ['Room 03 · The renovation', "Your old site isn't the end of your story.", 'Walk through the line.'],
  'Renovated': ['Room 03 · The renovation', 'Same café, a new site.', 'Move the cursor to compare. The café is made up.'],
  'Worth it hold': ['Room 04 · Worth it', 'What you are paying for.', 'Four things, one counter each.'],
  'Workshop hold': ['Room 05 · The workshop', 'Three plans.', 'One for where you are now.'],
  'Look up': ['The stairs', "That's what we make.", 'Upstairs: how we make it.'],
  'Landing hold': ['The landing · How we work', 'Five steps, five open books.', 'Click one. Each room upstairs is a chapter.'],
  'Bridge to HOME': ['Chapter 1 · Story', 'Stories used to live on TV.', 'Now they live on your website.'],
  'Drafting hold': ['Room 06 · Chapter 2, Design', 'You see every screen', 'before a line of code.'],
  'The page, painted': ['Room 06 · Chapter 2, Design', 'Wireframe first, then colour.', 'Then it moves.'],
  'Signal Cabin hold': ['Room 07 · Chapter 3, Build', 'Behind the page, the systems:', 'bookings, enquiries and staff in one panel.'],
  'Admin panel': ['Room 07 · Pull a lever', 'New becomes booked.', 'Demo data: nothing on this panel is real.'],
  'Out of the cabin': ['Chapter 4 · Launch', 'Next: going live.', ''],
  'Extras hold': ['Room 08 · Chapter 4, Launch', 'See your site live', 'in 15 minutes.'],
  'Map hold': ['Room 08 · Being found', 'On the map, and on Google.', 'Your Business Profile, set up in every plan.'],
  'Greenhouse hold': ['Room 09 · Chapter 5, Care', "We don't launch and leave.", 'We look after it.'],
  'Care tools': ['Room 09 · A care plan', 'Hosting, backups, uptime, security updates,', 'and a few small changes a month.'],
  'Kites up to the Rooftop': ['Room 10 · The rooftop', 'Five chapters done.', 'The next story is yours.'],
  'Settle on the desk': ['Room 10 · The front desk', "Let's build yours.", 'Tell Rahul about your business.'],
};
const cap = document.getElementById('caption'), capLabel = cap.querySelector('.label'), capH = cap.querySelector('h1'), capCta = cap.querySelector('.cta'), capNum = cap.querySelector('.num');
let capWords = [];
const lastMove = rail.moves[rail.moves.length - 1];
let capFor = null, cap3d = null;
// On a desktop the caption is a card standing in the room: 2.6 m ahead of where it is read and a metre to the left, beside what it talks about.
// A room's caption is placed from its stop; a TV channel's or a milestone's from where the camera is when it starts.
const CAP_UP = { 'Landing hold': 0.1 }; // the books lie low in the sun: the caption stands above them
function placeCaption(name) {
  if (!cap3d) { cap.classList.add('c3', 'in3d'); cap3d = new CSS3DObject(cap); cap3d.userData.k = 1.05; cap3d.scale.setScalar(C3); cssScene.add(cap3d); }
  const m = COPY[name] && byName[name], s = m && (m.hold ? lerp(m.s0, m.s1, 0.6) : m.s1 - 1);
  const g = cap3d.userData.ground; if (g) { scene.remove(g.shadow); if (g.wall) scene.remove(g.wall); cap3d.userData.ground = null; }
  cap3d.userData.follow = !m; // a TV channel's or a milestone's caption is read on the move: it stays in front of the eyes, a little to the left
  if (!m) { cap3d.position.copy(CAP_VIEW).applyQuaternion(camera.quaternion).add(camera.position); cap3d.quaternion.copy(camera.quaternion); return; }
  const at = new THREE.Vector3(...rail.pos(s)), yr = THREE.MathUtils.degToRad(rail.yaw(s)), up = CAP_UP[name] || -0.32; // a few rooms keep the low left for what is in it
  cap3d.position.copy(at).add(new THREE.Vector3(-Math.sin(yr) * 2.6 - Math.cos(yr) * 1.2, up, -Math.cos(yr) * 2.6 + Math.sin(yr) * 1.2));
  cap3d.rotation.set(0, Math.atan2(at.x - cap3d.position.x, at.z - cap3d.position.z), 0);
  ground(cap3d, false); // its shadow moves with it
}
const CAP_VIEW = new THREE.Vector3(-1.2, -0.32, -2.6), capTo = new THREE.Vector3(); // where a moving caption floats, in the camera's frame
function caption(p) {
  const m = rail.moveAt(p), tv = env.tv.ch >= 0 && p < TV_SPAN[1]; // in the TV room each channel is its own caption
  // on the stair, the milestone the camera is passing is the caption
  const phi = STAIR.phi0 + ((rail.pos(p)[1] - EYE) * 2 * Math.PI) / STAIR.rise, mi = m.zone === 'stair' ? MILESTONES.findIndex((q) => Math.abs(phi + 0.5 - q.phi) < 0.52) : -1;
  const name = tv ? 'tv' + env.tv.ch : mi >= 0 ? 'ms' + mi : m.name;
  const c = mi >= 0 ? [`Milestone 0${mi + 1} of 0${MILESTONES.length}`, MILESTONES[mi].title, MILESTONES[mi].line] : tv ? (env.tv.ch < TV_BEATS.length ? [`Scrollstory TV · CH 0${env.tv.ch + 1} · Our story`, TV_BEATS[env.tv.ch].full, ''] : [`Scrollstory TV · CH 0${env.tv.ch + 1}`, 'Your story?', "Let's put it on the screen."]) : COPY[name];
  if (!c || state.secret || hidden.opened >= 0) { if (cap3d) show3d(cap3d, 0); else cap.style.opacity = 0; cap.classList.remove('on'); return; } // inside a secret, its own card does the talking
  if (capFor !== name) {
    capFor = name; capLabel.textContent = c[0]; capH.replaceChildren(); capWords = []; if (!flatCards) placeCaption(name);
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
  if (cap3d?.userData.follow) { show3d(cap3d, o); capTo.copy(CAP_VIEW).applyQuaternion(camera.quaternion).add(camera.position); cap3d.position.lerp(capTo, 0.12); cap3d.quaternion.slerp(camera.quaternion, 0.12); }
  else if (cap3d) { show3d(cap3d, o); const turn = Math.atan2(camera.position.x - cap3d.position.x, camera.position.z - cap3d.position.z) - cap3d.rotation.y; cap3d.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * 0.05; } // it turns slowly to the reader
  else { cap.style.opacity = o; cap.style.transform = `translateY(${(1 - out) * 16}px)`; }
  cap.classList.toggle('on', arrive > 0.6 && out > 0.5);
}

// ---------- what the scroll is pointing at: one shop, one counter, one TV channel ----------
const byName = Object.fromEntries(rail.moves.map((m) => [m.name, m]));
const beat = (name, p, pad = 22) => { const m = byName[name]; return sstep(m.s0 - pad, m.s0 + 4, p) * (1 - sstep(m.s1 - 4, m.s1 + pad, p)); };
const GALLERY = byName['Gallery, walking backwards'], HAT = byName['Through the hat'];
const TV_SPAN = [byName['HOME partial orbit'].s0, byName['HOME hold'].s1], CHANNELS = TV_CHANNELS; // the last channel is "Your story?"
const SITE_STOPS = [...rail.siteStops, lerp(byName['Gallery hold'].s0, byName['Gallery hold'].s1, 0.6)]; // where the walk rests in front of each site
const EX = EXTRAS.map((e) => byName[`Extra: ${e.name}`]), EX0 = byName['Extras hold'], EX_END = byName['To the map'], CANAL = byName['Sky canal to the Greenhouse']; // the train stays while the board is read, and leaves with the boat
const LINE = byName['Through the line'], RENO_SPAN = [byName['Renovation hold'].s0 - 30, byName['Renovated'].s1 + 30];
const PAGE_MOVE = byName['Through the page'], INTO_CABIN = byName['Into the cabin'], TO_PANEL = byName['To the admin panel'];
function focus(p) {
  env.map = beat('Map hold', p, 40); env.tools = beat('Care tools', p, 30); env.grow = sstep(byName['Sky canal to the Greenhouse'].s1 - 60, byName['Care tools'].s0, p);
  env.cards = sstep(INTO_CABIN.s0 + 10, byName['Signal Cabin hold'].s1, p); env.levers = Math.min(1, Math.max(0, (p - TO_PANEL.s0) / (TO_PANEL.s1 - TO_PANEL.s0 + 25)));
  env.page = sstep(lerp(PAGE_MOVE.s0, PAGE_MOVE.s1, 0.28), lerp(PAGE_MOVE.s0, PAGE_MOVE.s1, 0.75), p); // the colour spreads from where the walk goes through
  // The Renovation's line follows the walk across the room. Resting at either end, the cursor slides it back and forth to compare.
  const lu = Math.min(1, Math.max(0, (p - LINE.s0) / (LINE.s1 - LINE.s0))), still = p > RENO_SPAN[0] && p < RENO_SPAN[1] && lu === 1 ? 1 : 0; // only once the walk has crossed the line: before it, nothing new shows
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
  if (state.seat) { // seated: the channel is still the scroll's (the remote scrolls to it), so standing up keeps it
    if (p < TV_SPAN[0] - 5 || p > TV_SPAN[1] + 5) sit(false); // scrolled out of the TV room: stand up
    else { if (env.tv.ch !== state.seat.ch) seatCh(env.tv.ch); env.tv.f = Math.min(1, (performance.now() / 1000 - state.seat.at) / 1.5); }
  }
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
{ const LIVE = SITES.filter((s) => s.live).length; SITES.forEach((s, i) => { INFO['site' + i] = s.live
  ? { label: `Live project 0${i + 1} of 0${LIVE}`, h: s.name, lines: [s.line], link: ['Visit the live site ↗', s.url] }
  : { label: `Concept demo 0${i + 1 - LIVE} of 0${SITES.length - LIVE} · a made-up business`, h: s.name, lines: [s.line], link: ['Open the demo ↗', s.url] }; }); }
EXTRAS.forEach((e) => { INFO[`Extra: ${e.name}`] = { label: 'Now boarding · try it', h: e.title, lines: [e.line], act: ['Get my demo on WhatsApp', () => window.open(`https://wa.me/919949088659?text=${encodeURIComponent(`Hi Rahul, I'd like a live demo of my website in 15 minutes.\nMy business: ${signText}`)}`, '_blank', 'noopener')] }; });
BOOKS.forEach((b, i) => { INFO['book' + i] = { label: `How we work · volume 0${i + 1} of 0${BOOKS.length}`, h: b.title, lines: [b.line], act: i === BOOKS.length - 1 ? ['Its last page is a door. Step in', () => enterSecret('lab')] : ['Put it back', () => { hidden.open(-1); sfx.page(); }] }; });
INFO['Settle on the desk'] = { label: 'Room 10 · Rooftop · try it', h: 'Your name, in lights', lines: ['Type it, and the desk wears it in neon.'], sign: true };
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
ANCHOR['Settle on the desk'] = [13.8, H.rooftop + 1.35, 6.2, 2.7]; // right of the desk, turned to the visitor
SHOPS.forEach((s) => { ANCHOR[`Shop: ${s.name}`] = [10.25, 1.7, s.z + 1.3, -Math.PI / 2]; }); // right of the shop's device
EXTRAS.forEach((e, i) => { ANCHOR[`Extra: ${e.name}`] = [15 + (i - (EXTRAS.length - 1) / 2) * 1.45 + 1.6, H.extras + 1.3, -20.6, -0.2]; }); // beside its carriage, the board above it
demoCards.forEach((c, i) => { ANCHOR['site' + i] = [c.m.position.x + 0.3, 0.95, c.m.position.z, c.m.rotation.y]; }); // under its screen, a little in front of the wall
const card3d = {}; // key: { obj, box }
function fillCard(box, d) {
  box.replaceChildren(el('div', d.label, 'label mono'), el('h2', d.h), ...d.lines.map((l) => el('p', l)));
  if (d.plan) { const b = el('button', `Ask about ${d.plan}`, 'pill solid'); b.onclick = () => openForm(d.plan); box.append(b); }
  if (d.link) box.append(linkPill(d.link));
  if (d.act) { const b = el('button', d.act[0], 'pill solid'); b.onclick = d.act[1]; box.append(b); }
  if (d.sign) {
    const i = el('input', null, 'sign'); i.placeholder = 'Your business name'; i.maxLength = 40; i.value = signText; i.setAttribute('aria-label', 'Your business name'); i.oninput = () => { signText = i.value; deskSign(signText); hidden.sketchName(signText); };
    const b = el('button', 'Start your project', 'pill solid'); b.onclick = () => openForm();
    const w = el('p', null, 'mono who'); w.append('Rahul Thaniru · Founder · '); const a = el('a', '+91 99490 88659'); a.href = 'tel:+919949088659'; w.append(a);
    box.append(i, b, w);
  }
}
function linkPill([text, href]) { const a = el('a', text, 'pill solid'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; }
function getCard(key) {
  if (card3d[key]) return card3d[key];
  const box = el('article', null, 'c3'); fillCard(box, INFO[key]);
  const obj = new CSS3DObject(box), [x, y, z, yaw] = ANCHOR[key]; obj.position.set(x, y, z); obj.rotation.y = yaw; obj.userData.k = 1; obj.scale.setScalar(C3); cssScene.add(obj); ground(obj);
  return (card3d[key] = { obj, box });
}
const flatCards = lowQuality; // phones: the flat card
// A card should look as if it is really standing in the room: a soft shadow on the floor under it, and on the ground floor's water a faint reflection.
const shadowTex = (() => { // a soft-edged card shape, not a round blob: it reads as this card's shadow
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.filter = 'blur(18px)'; x.fillStyle = 'rgba(20,32,29,0.85)'; x.beginPath(); x.roundRect(44, 44, 168, 168, 18); x.fill(); return new THREE.CanvasTexture(c);
})();
const shadowGeo = new THREE.PlaneGeometry(1, 1);
function ground(obj, mirror = true) {
  const p = obj.position, floor = floorAt(p.x, p.y, p.z), g = { floor, w: 0, shadow: new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 })) };
  g.shadow.renderOrder = -1; scene.add(g.shadow); // drawn before the glows, which write depth and would hide it
  if (mirror && floor < 0.5) { g.ref = new CSS3DObject(obj.element.cloneNode(true)); g.ref.element.classList.add('reflect'); g.ref.element.removeAttribute('id'); cssScene.add(g.ref); } // only the water mirrors
  // and its shadow on the wall behind it, if there is one within reach: that is the one the eye sees from the walk
  const back = new THREE.Vector3(-Math.sin(obj.rotation.y), 0, -Math.cos(obj.rotation.y)), cast = new THREE.Raycaster(p.clone(), back, 0.2, 4); cast.camera = camera;
  const seen = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; }; // hidden colliders are not walls you can see
  const hit = cast.intersectObjects(scene.children, true).find((h) => h.object.isMesh && !h.object.material.transparent && h.face && seen(h.object));
  if (hit) {
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    g.wall = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 })); g.wall.renderOrder = -1;
    g.wall.position.copy(hit.point).addScaledVector(n, 0.08).addScaledVector(new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize(), 0.1 + hit.distance * 0.08).add(new THREE.Vector3(0, -0.2 - hit.distance * 0.15, 0)); g.wall.lookAt(g.wall.position.clone().add(n)); g.wall.userData.d = hit.distance; scene.add(g.wall); // the light is above: the shadow falls a little low
  }
  obj.userData.ground = g;
}
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
    obj.position.copy(at); obj.rotation.y = Math.atan2(p[0] - at.x, p[2] - at.z); obj.scale.setScalar(C3); cssScene.add(obj); chooseCards.push(obj); ground(obj);
  });
  const head = el('div', null, 'c3 head'); head.append(el('h2', 'Choose one'), el('p', 'Launch prices, for the first 5 clients', 'mono'));
  const obj = new CSS3DObject(head); obj.position.set(p[0], 2.75, p[2]).addScaledVector(f, 3.2); obj.rotation.y = yr; obj.scale.setScalar(C3); cssScene.add(obj); chooseCards.push(obj);
}
function show3d(obj, o) { // fade in, rise a little, tilt up into place
  const e = obj.element; e.style.opacity = o; e.classList.toggle('on', o > 0.5); obj.visible = o > 0.01;
  obj.scale.setScalar(C3 * (obj.userData.k || 1) * (0.92 + 0.08 * o));
  const g = obj.userData.ground; if (!g) return;
  if (!g.w && e.offsetWidth) { g.w = e.offsetWidth * C3 * (obj.userData.k || 1); g.h = e.offsetHeight * C3 * (obj.userData.k || 1); }
  const p = obj.position, lift = p.y - g.h / 2 - g.floor; // how high the card's foot is off the floor
  g.shadow.visible = o > 0.01 && g.w > 0; g.shadow.position.set(p.x, g.floor + 0.012, p.z); g.shadow.rotation.set(-Math.PI / 2, 0, obj.rotation.y);
  g.shadow.scale.set(g.w * (1.5 + lift * 0.2), 0.8 + lift * 0.15, 1); g.shadow.material.opacity = o * Math.max(0.18, 0.6 - lift * 0.12); // softer and wider the higher it floats
  if (g.wall) { g.wall.visible = g.shadow.visible; const d = g.wall.userData.d; g.wall.scale.set(g.w * (1.5 + d * 0.15), g.h * (1.5 + d * 0.15), 1); g.wall.material.opacity = o * Math.max(0.22, 0.6 - d * 0.1); }
  if (g.ref) { g.ref.visible = obj.visible; g.ref.position.set(p.x, 2 * g.floor - p.y, p.z); g.ref.rotation.copy(obj.rotation); g.ref.scale.set(obj.scale.x, -obj.scale.y, obj.scale.z); g.ref.element.style.opacity = o * 0.32; }
}
let sitO = 0;
function cards(p) {
  const m = rail.moveAt(p), si = env.site.findIndex((f) => f > 0.3), u = (p - m.s0) / (m.s1 - m.s0);
  if (hidden.opened >= 0 && m !== BOOK_HOLD) hidden.open(-1); // the book goes back when the walk moves on
  const pinnedCard = state.secret ? 'secret:' + state.secret.id : hidden.opened >= 0 ? 'book' + hidden.opened : null, key = pinnedCard || (si >= 0 ? 'site' + si : m.name), d = INFO[key];
  if (d && infoFor !== key) {
    infoFor = key;
    info.replaceChildren(el('div', d.label, 'label mono'), el('h2', d.h), ...d.lines.map((l) => el('p', l)));
    if (d.plan) { const b = el('button', `Ask about ${d.plan}`, 'pill solid'); b.onclick = () => openForm(d.plan); info.append(b); }
    if (d.link) info.append(linkPill(d.link));
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
  const canSit = !state.seat && p > TV_SPAN[0] - 15 && p < TV_SPAN[1] - 5; // the whole TV stretch, moving or resting: it never blinks between channels
  sitO += ((canSit ? 1 : 0) - sitO) * 0.06;
  sitBtn.classList.toggle('on', flatCards && canSit); show3d(sit3d, flatCards ? 0 : sitO);
  const turn = Math.atan2(camera.position.x - sit3d.position.x, camera.position.z - sit3d.position.z) - sit3d.rotation.y;
  sit3d.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * 0.04; // turns slowly to whoever walks round the sofa, so it never snaps
  const end = flatCards && m === lastMove && u > 0.45; startBtn.classList.toggle('on', end); who.classList.toggle('on', end); // on a desktop they are on the desk's card
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
const BOOK_HOLD = byName['Landing hold'], foundIds = new Set(); // the books are read from the Landing hold
try { for (const id of JSON.parse(localStorage.getItem('secrets') || '[]')) if (SECRETS.some((s) => s.id === id)) foundIds.add(id); } catch { /* private mode: nothing is kept */ }
const foundBox = document.getElementById('found');
function showFound() {
  foundBox.replaceChildren(el('div', foundIds.size === SECRETS.length ? 'You found every secret' : `${foundIds.size} of ${SECRETS.length} secrets found`, 'mono'));
  for (const s of SECRETS) if (foundIds.has(s.id) && !s.egg) { const b = el('button', '✦ ' + s.name, 'mono'); b.onclick = () => { togglePlan(false); enterSecret(s.id); }; foundBox.append(b); }
  for (const s of SECRETS) if (foundIds.has(s.id) && s.egg) foundBox.append(el('p', '✦ ' + s.name, 'mono egg'));
  for (const s of SECRETS) if (!foundIds.has(s.id)) { // a clue for each one still hidden, and a way to get close
    const row = el('div', null, 'clue'), b = el('button', 'Take me near', 'mono'); row.append(el('p', '? ' + s.clue));
    b.onclick = () => { togglePlan(false); const w = hidden.ways.find((q) => q.id === s.id); jump(nearStop(w)); hidden.beckon(s.id, now + 9); };
    row.append(b); foundBox.append(row);
  }
  for (const id of foundIds) hidden.found(id);
}
// the closest stop that has a point in front of the camera (within 38 degrees of its view), for the floor plan's hints
const blockers = new THREE.Raycaster(); blockers.camera = camera; // sprites need it to be hit-tested
const nearStop = (w) => rail.stops.reduce((b, s, i) => { const at = w.at;
  const p = rail.pos(s), y = THREE.MathUtils.degToRad(rail.yaw(s)), q = THREE.MathUtils.degToRad(rail.pitch(s));
  const v = [at.x - p[0], at.y - p[1], at.z - p[2]], d = Math.hypot(...v), f = [-Math.sin(y) * Math.cos(q), Math.sin(q), -Math.cos(y) * Math.cos(q)];
  const facing = (v[0] * f[0] + v[1] * f[1] + v[2] * f[2]) / d > Math.cos(THREE.MathUtils.degToRad(38)); 
  if (!facing || d >= b[1] || d > w.near) return b; // in reach of a click, and the nearest so far
  blockers.set(new THREE.Vector3(...p), new THREE.Vector3(...v).normalize()); blockers.far = d - 0.7;
  const wall = blockers.intersectObjects(scene.children, true).find((h) => h.object.isMesh && h.object.visible && !h.object.material.transparent); // something solid in between
  return wall ? b : [i, d];
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
function seatCh(ch) { state.seat.ch = ch; state.seat.at = performance.now() / 1000; sfx.blip(); remoteBar.querySelector('b').textContent = `CH 0${ch + 1}`; remoteBar.classList.toggle('last', ch === CHANNELS - 1); }
function remote(ch) { // the remote moves the walk to that channel's stop, so the scroll and the set never disagree
  if (!state.seat) return; ch = (ch + CHANNELS) % CHANNELS;
  lenis.scrollTo(((TV_SPAN[0] + ((TV_SPAN[1] - TV_SPAN[0]) * (ch + 0.5)) / CHANNELS) / rail.total) * lenis.limit, { immediate: true, force: true }); seatCh(ch);
}
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
  const obj = new CSS3DObject(box); obj.position.set(TV[0] + 1.35, H.home + 1.05, TV[2] + 0.35); obj.rotation.y = 0.3; obj.userData.k = 1.2; obj.scale.setScalar(C3); cssScene.add(obj); ground(obj); return obj; // beside the set, at the height of its screen, clear of the caption
})();
remoteBar.querySelector('.prev').onclick = () => remote(state.seat.ch - 1);
remoteBar.querySelector('.next').onclick = () => remote(state.seat.ch + 1);
remoteBar.querySelector('.up').onclick = () => sit(false);
remoteBar.querySelector('.tell').onclick = () => { sit(false); openForm(); };
const carBoxes = EXTRAS.map((e, k) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(15 + (k - (EXTRAS.length - 1) / 2) * 1.45, H.extras + 0.7, -21.7), new THREE.Vector3(1.32, 1.0, 0.8)));
const carAt = (r) => (state.body > EX0.s0 - 5 && state.body < EX_END.s0 + 5 ? carBoxes.findIndex((b) => r.ray.intersectsBox(b)) : -1);
const tvBox = new THREE.Box3(new THREE.Vector3(TV[0] - 1.5, H.home, TV[2] - 1.2), new THREE.Vector3(TV[0] + 1.5, H.home + 3.7, TV[2] + 0.8)); // the set
// Things in the Sky Quarter rooms that answer a click, each only while the walk is in its room.
const ROOMS3 = [{ span: [byName['Drafting hold'].s0 - 20, byName['Back through to the funicular'].s1], m: draft }, { span: [byName['Into the cabin'].s0, byName['Out of the cabin'].s0 + 20], m: cabin }, { span: [byName['Into the Greenhouse'].s0, byName['Kites up to the Rooftop'].s0 + 20], m: garden }];
const room3 = () => (state.secret || state.seat ? null : ROOMS3.find((r) => state.body > r.span[0] && state.body < r.span[1]));
addEventListener('pointermove', (e) => { // a book under the cursor slides half out; inside a secret, its live things
  const r3 = room3(); if (r3) { ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2), camera); canvas.style.cursor = r3.m.over(ray) ? 'pointer' : ''; return; }
  if (state.secret && !state.secret.flip) { ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2), camera); canvas.style.cursor = hidden.over(ray, state.secret.id) ? 'pointer' : ''; return; }
  if (!state.secret && state.body > EX0.s0 - 5 && state.body < EX_END.s0 + 5) { ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2), camera); canvas.style.cursor = carAt(ray) >= 0 ? 'pointer' : ''; return; }
  if (rail.moveAt(state.body) !== BOOK_HOLD || state.secret) return hidden.hover(-1);
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
  if (hit && rail.moveAt(state.body) === BOOK_HOLD) { hidden.open(hidden.opened === hit.book ? -1 : hit.book); sfx.page(); return; }
  if (state.seat) { const hit = ray.intersectObjects(seat.tiles)[0]; if (hit) remote(hit.object.userData.ch); return; }
  const car = carAt(ray); // the Extras train: a click on the carriage goes to the offer's stop, and its card steps out
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
dressing.ready.then(() => {
  propsReady = true;
  // Compile every room's shaders now, a few objects a frame, rather than all on the first frame a room is seen (that froze the walk for half a second).
  const todo = [...scene.children];
  const step = () => {
    for (const o of todo.splice(0, 24)) { const shown = []; o.traverse((q) => { if (!q.visible) { shown.push(q); q.visible = true; } }); renderer.compile(o, camera, scene); for (const q of shown) q.visible = false; }
    if (todo.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});
// A slow graphics chip: drop the resolution a step at a time until the frame rate holds (desktop only; phones already draw at 1).
const dpr = { steps: [1.5, 1.25, 1, 0.85].filter((r) => r <= Math.min(devicePixelRatio, 1.5)), i: 0, t: 0, n: 0, since: 0 };
function adaptResolution(dt, time) {
  if (lowQuality || time < 2 || dpr.i >= dpr.steps.length - 1) return;
  dpr.t += Math.min(dt, 0.1); dpr.n++; if (dpr.t < 2) return; // one long hitch does not count as a slow chip
  const avg = dpr.t / dpr.n; dpr.t = dpr.n = 0;
  if (avg > 1 / 40 && time - dpr.since > 3) { dpr.i++; dpr.since = time; renderer.setPixelRatio(dpr.steps[dpr.i]); resize(); }
}
const prev = { pos: null, yaw: 0, t: 0 };
const shown = { speed: 0, turn: 0, fps: 0 }, view = { w: innerWidth, h: innerHeight, p: 0 };
gsap.ticker.add((time, deltaMs) => {
  if (innerWidth !== view.w || innerHeight !== view.h) { // fullscreen or a resized window: the page's height changed, so put the walk back where it was
    view.w = innerWidth; view.h = innerHeight; lenis.resize(); if (lenis.limit > 0) lenis.scrollTo((view.p / rail.total) * lenis.limit, { immediate: true, force: true });
  } else view.p = target();
  lenis.raf(time * 1000);
  now = time;
  const dt = Math.min(0.05, Math.max(0.001, deltaMs / 1000)); adaptResolution(deltaMs / 1000, time);
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
    const from = SITE_STOPS[demoCards.indexOf(c)] - 55; // a screen has shown itself a little before the walk stops in front of it
    const r = Math.min(1, Math.max(0, (state.body - from) / 36)), u = Math.max(0, (r - 0.8) / 0.2);
    c.r.value = r; c.line.value = sstep(0.22, 0.3, r) * (0.6 + 0.4 * sstep(0.5, 0.6, r)) * (1 - sstep(0.82, 1, r));
    c.motes.material.opacity = sstep(0.02, 0.12, r) * (1 - sstep(0.3, 0.5, r)); c.motes.visible = c.motes.material.opacity > 0.01;
    c.m.scale.setScalar(1 + 0.07 * Math.sin(Math.PI * u) * (1 - u)); // a soft settle
  }
  // The cloud sea hides one level from the other, so each is drawn only from its own side of it (and so not in the water's reflection either).
  const up = camera.position.y > 18; reno.root.visible = !up; for (const m of [draft, clock, cabin, rides, atlas, garden]) m.root.visible = up;
  reno.update(time, dt, env.wipe); draft.update(time, dt, env.page); clock.keyhole.material.emissiveIntensity = [...foundIds].filter((q) => q !== 'keyhole').length >= 6 ? 1.2 + Math.sin(time * 3) * 0.6 : 0; cabin.update(time, dt, env.cards, env.levers); atlas.update(time, dt, env.extra.u, env.map); garden.update(time, dt, env.grow, env.tools);
  const KM = byName['Kites up to the Rooftop'], kite = state.body < KM.s0 ? -1 : state.body > KM.s1 ? 2 : (state.body - KM.s0) / (KM.s1 - KM.s0);
  rides.update(time, dt, railAt.set(...pos), kite); // the car, the boat and the kites carry the walk, not the cursor's lean clock.update(time, dt, state.body / rail.total, env.dusk);
  expand(env.site); hidden.update(time, dt, pointer); if (!free) nudge(time);
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
  if (freeze !== null || (!pinned && !(startAt > 0) && scrollY < innerHeight * 0.3)) {
    if (state.reduce && freeze === null) gsap.fromTo(veil, { opacity: 1 }, { opacity: 0, duration: 1, ease: 'none' }); // reduced motion: a 1 s fade
    else { document.getElementById('dusk').style.opacity = 1; intro({ scene, camera, renderer, shell, parts: dressing.front.parts, outlines: dressing.front.blocks, plaque: dressing.plaque, ready: dressing.ready, ripple: (x, z) => dressing.ripple(x, z, now), freezeAt: freeze === null ? null : Number(freeze) }); }
  }
}

if (import.meta.env.DEV || location.search.includes('debug')) window.__world = { state, rail, lenis, FEEL, env, camera, scene, cssScene, renderer, hidden, enterSecret, leaveSecret, THREE }; // for tuning from the console

// Stop drawing when the tab is hidden.
document.addEventListener('visibilitychange', () => (document.hidden && !pinned ? gsap.ticker.sleep() : gsap.ticker.wake())); // a headless capture counts as hidden
