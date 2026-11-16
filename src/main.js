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
import { intro } from './intro.js';
import { TV_BEATS } from './rooms.js';
import { SWIRL } from './stairs.js';
import { COLLIDERS, BRIDGES, STAIR, PHI_END, STAIR_EXIT_WEDGE, stairPt, TV, TV_CHANNELS, SKY_BY_HEIGHT, clearanceAt, CLEAR, LEAN_SHIFT, SHOPS, COUNTERS, H, DOORS, MILESTONES, EYE } from './world.js';

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
const tone = { wall: 0xefe3c8, facade: 0xe8a89a, stone: 0x8c8a82, ceiling: 0xf4ecdd, floor: 0xd8cdb8, pillar: 0xc9b08a, furniture: 0x9b7a55, glass: 0xbfd8d2, rail: 0x3f6e68, sign: 0x1c2124 };
const mats = Object.fromEntries(Object.entries(tone).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })]));
Object.assign(mats.glass, { transparent: true, opacity: 0.18, roughness: 0.1 });
const tinted = {};
const matFor = (c) => (c.color !== undefined ? (tinted[c.color] ||= new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.9 })) : mats[c.kind] || mats.wall);
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
  x.fillStyle = '#9E3B2C'; x.font = '500 20px monospace'; x.fillText('DEMO', 232, 166);
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
      side: THREE.DoubleSide, transparent: true, uniforms: { map: { value: cardTexture }, uR: r },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform float uR; varying vec2 vUv;
        void main(){ float k = (1.0 - smoothstep(0.5, 0.95, uR)) * 0.035; // the ghost's colours sit apart, then close up
          vec3 c = vec3(texture2D(map, vUv + vec2(k, 0.0)).r, texture2D(map, vUv).g, texture2D(map, vUv - vec2(k, 0.0)).b);
          gl_FragColor = vec4(c, smoothstep(0.22, 0.3, uR) * 0.15 + smoothstep(0.45, 0.6, uR) * 0.45 + smoothstep(0.78, 0.95, uR) * 0.4);
          #include <colorspace_fragment>
        }`,
    }), c.x, c.y, c.z);
    m.rotation.y = Math.PI; // faces north, toward the camera that is backing away
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
for (const b of BRIDGES) {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, along = b.a + (b.b - b.a) * u, y = b.ya + (b.yb - b.ya) * u - 0.1;
    const geo = b.axis === 'z' ? new THREE.BoxGeometry(b.width, 0.2, 0.72) : new THREE.BoxGeometry(0.72, 0.2, b.width);
    add(geo, mats.floor, b.axis === 'z' ? b.c : along, y, b.axis === 'z' ? along : b.c);
  }
}

const dressing = dress({ scene, camera, lowQuality });

// ---------- entrance membranes: where the rail crosses each doorway, and the full-screen wobble of passing through ----------
const gel = membranes({ scene, camera, lowQuality, crossings: DOORS.filter((d) => d.name !== 'gate').map((d) => {
  const x = (d.a[0] + d.b[0]) / 2, z = (d.a[1] + d.b[1]) / 2;
  let at = 0, best = Infinity;
  for (let p = 0; p < rail.total; p += 0.25) { const q = rail.pos(p), dist = Math.hypot(q[0] - x, q[2] - z); if (q[1] < 4 && dist < best) { best = dist; at = p; } }
  return { x, z, at, w: Math.hypot(d.a[0] - d.b[0], d.a[1] - d.b[1]), turn: Math.abs(d.a[0] - d.b[0]) > Math.abs(d.a[1] - d.b[1]) ? 0 : Math.PI / 2 };
}) });
const gelPass = { // drawn only while the camera is inside a membrane or the hat
  target: new THREE.WebGLRenderTarget(1, 1, { samples: lowQuality ? 0 : 4 }), scene: new THREE.Scene(), camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
  mat: new THREE.ShaderMaterial({
    depthTest: false, uniforms: { tDiffuse: { value: null }, k: { value: 0 }, hat: { value: -1 }, time: { value: 0 }, aspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float k, hat, time, aspect; varying vec2 vUv; ${SWIRL}
      void main(){ vec2 c = vUv - 0.5; float r = length(c);
        vec2 uv = vUv + normalize(c + 1e-5) * sin(r * 26.0 - k * 9.0) * 0.014 * k * smoothstep(0.0, 0.5, r); // a ring of refraction that moves with the scroll
        vec3 col = vec3(texture2D(tDiffuse, uv + c * 0.008 * k).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c * 0.008 * k).b);
        col += vec3(0.75, 0.95, 1.0) * smoothstep(0.3, 0.72, r) * k * 0.5; // the bright rim of the gel closing behind
        if (hat >= 0.0) { // inside the hat: the tunnel closes in from the edges, and opens from its middle at the far end
          vec2 q = c * vec2(aspect, 1.0); float cover = smoothstep(0.0, 0.14, hat) * (1.0 - smoothstep(0.8, 1.0, hat)), hole = (1.0 - cover) * 1.25;
          col = mix(col, swirl(q, hat, time), smoothstep(hole - 0.14, hole, length(q)));
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
const env = { h: 0, dark: 1, fogColor: new THREE.Color(), fogDensity: 0.004, wind: 1, air: 0, pointer: null, shop: [0, 0, 0], counter: [0, 0, 0, 0], tv: { ch: -1, f: 1 }, dusk: 0 };
function atmosphere(h) {
  let i = 0; while (i < SKY.length - 2 && h > SKY[i + 1][0]) i++;
  env.fogColor.lerpColors(SKY[i][1], SKY[i + 1][1], Math.min(1, Math.max(0, (h - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]))));
  env.fogDensity = lerp(lerp(0.004, 0.33, sstep(11, 15, h)), 0.006, sstep(20.5, 23, h));
  env.h = h;
  scene.fog.color.copy(env.fogColor); scene.background.copy(env.fogColor); scene.fog.density = env.fogDensity;
  env.dusk = sstep(29.5, 34, h); // 0 below the Extras platform, 1 at the rooftop desk
  hemi.intensity = (2.5 - 0.5 * env.dusk) * env.dark; sun.intensity = 2.2 * env.dark;
  hemi.color.lerpColors(DAY.hemi, DUSK.hemi, env.dusk); sun.color.lerpColors(DAY.sun, DUSK.sun, env.dusk);
}

// ---------- scroll, springs and caps ----------
document.getElementById('track').style.height = `${rail.total + 100}vh`;
const startAt = Number(new URLSearchParams(location.search).get('p')); // ?p=1118 opens the walk at that point
if (startAt > 0) scrollTo(0, (startAt / rail.total) * (document.documentElement.scrollHeight - innerHeight));
const free = new URLSearchParams(location.search).has('free'); // ?free=1: the old free scroll, for tuning
const blocked = (e) => document.body.classList.contains('intro') || document.querySelector('dialog[open]') || e?.target?.closest?.('#plan, [data-lenis-prevent]') || (e?.target?.closest?.('#chooser')?.scrollHeight > chooser.clientHeight + 2);
// One wheel gesture is one stop. Lenis hands every wheel event here first; returning false keeps it from scrolling.
const lenis = new Lenis({ lerp: 0.1, virtualScroll: (d) => {
  if (free || !d.event.type.startsWith('wheel') || d.event.ctrlKey || blocked(d.event)) return true;
  d.event.preventDefault(); if (Math.abs(d.deltaY) > 1) steps.wheel(Math.sign(d.deltaY), performance.now() / 1000); return false;
} });
gsap.ticker.lagSmoothing(0);

const state = { body: 0, look: 0, vBody: 0, vLook: 0, fading: false, started: false, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, hold: null };
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
  lenis.scrollTo(stopPx(i), { duration: Math.min(3.5, Math.max(1.2, far / 80)), easing: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2), lock: true, force: true, immediate: state.reduce, onComplete: () => steps.arrived() });
  if (state.reduce) steps.arrived();
});
const pips = document.getElementById('pips');
rail.stops.forEach((s, i) => {
  const b = document.createElement('button'); b.setAttribute('aria-label', `Stop ${i + 1} of ${rail.stops.length}`); b.onclick = () => steps.goto(i); pips.append(b);
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
  'Lobby hold': ['Room 01 · The lobby', "We don't just build websites.", 'We tell your story and build its world.'],
  'Gallery hold': ['Room 02 · The gallery', 'Every door, a site we built.', 'Step into any one.'],
  'Worth it hold': ['Room 03 · Worth it', 'Custom. Secure. Legal.', 'Built to bring you income.'],
  'Workshop hold': ['Room 04 · The workshop', 'Three shops.', 'One for where you are now.'],
  'Look up': ['The stairs', 'Keep climbing.', 'The best view is upstairs.'],
  'Landing hold': ['The landing · core memory', '', ''],
  'Bridge to HOME': ['Home · Scrollstory TV', 'Stories used to live on TV.', 'Now they live on your website.'],
  'Extras hold': ['Room 05 · Extras', 'Everything else', 'it takes to go digital.'],
  'Settle on the desk': ['Room 06 · Rooftop front desk', "Let's build yours.", 'The desk is open.'],
};
const cap = document.getElementById('caption'), capLabel = cap.querySelector('.label'), capH = cap.querySelector('h1'), capCta = cap.querySelector('.cta');
const lastMove = rail.moves[rail.moves.length - 1];
let capFor = null;
function caption(p) {
  const m = rail.moveAt(p), tv = env.tv.ch >= 0 && p < TV_SPAN[1]; // in the TV room each channel is its own caption
  // on the stair, the milestone the camera is passing is the caption
  const phi = STAIR.phi0 + ((rail.pos(p)[1] - EYE) * 2 * Math.PI) / STAIR.rise, mi = m.zone === 'stair' ? MILESTONES.findIndex((q) => Math.abs(phi + 0.5 - q.phi) < 0.52) : -1;
  const name = tv ? 'tv' + env.tv.ch : mi >= 0 ? 'ms' + mi : m.name;
  const c = mi >= 0 ? [`Milestone 0${mi + 1} of 0${MILESTONES.length}`, MILESTONES[mi].title, MILESTONES[mi].line] : tv ? (env.tv.ch < TV_BEATS.length ? [`Scrollstory TV · CH 0${env.tv.ch + 1} · Our story`, TV_BEATS[env.tv.ch].full, ''] : [`Scrollstory TV · CH 0${env.tv.ch + 1}`, 'Your story?', "Let's put it on the screen."]) : COPY[name];
  if (!c) { cap.style.opacity = 0; cap.classList.remove('on'); return; }
  if (capFor !== name) {
    capFor = name; capLabel.textContent = c[0]; capH.textContent = c[1];
    if (c[2]) { const em = document.createElement('em'); em.textContent = c[2]; capH.append(em); }
    capH.classList.toggle('small', mi >= 0 || (tv && env.tv.ch < TV_BEATS.length)); capCta.hidden = !(tv && env.tv.ch === TV_BEATS.length);
  }
  const u = mi >= 0 ? (phi + 0.5 - MILESTONES[mi].phi + 0.52) / 1.04 : tv ? env.tv.f : (p - m.s0) / (m.s1 - m.s0);
  const o = (m === rail.moves[0] ? 1 : sstep(0.1, tv ? 0.25 : 0.4, u)) * (m === lastMove ? 1 : 1 - sstep(tv ? 0.9 : 0.85, 1, u)); // scroll-driven, so it reverses exactly. The first caption is there when the intro ends.
  cap.style.opacity = o; cap.style.transform = `translateY(${(1 - o) * 16}px)`; cap.classList.toggle('on', o > 0.5);
}

// ---------- what the scroll is pointing at: one shop, one counter, one TV channel ----------
const byName = Object.fromEntries(rail.moves.map((m) => [m.name, m]));
const beat = (name, p, pad = 22) => { const m = byName[name]; return sstep(m.s0 - pad, m.s0 + 4, p) * (1 - sstep(m.s1 - 4, m.s1 + pad, p)); };
const GALLERY = byName['Gallery, walking backwards'], HAT = byName['Through the hat'];
const TV_SPAN = [byName['HOME partial orbit'].s0, byName['HOME hold'].s1], CHANNELS = TV_CHANNELS; // the last channel is "Your story?"
function focus(p) {
  SHOPS.forEach((s, i) => { env.shop[i] = beat(`Shop: ${s.name}`, p); });
  COUNTERS.forEach((c, i) => { env.counter[i] = beat(`Counter: ${c.name}`, p); });
  const x = ((p - TV_SPAN[0]) / (TV_SPAN[1] - TV_SPAN[0])) * CHANNELS, ch = Math.floor(x);
  env.tv.ch = x < 0 ? -1 : Math.min(CHANNELS - 1, ch); env.tv.f = x < 0 || x >= CHANNELS ? 1 : x - ch;
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
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
const info = document.getElementById('info'), chooser = document.getElementById('chooser');
let infoFor = null;
function cards(p) {
  const m = rail.moveAt(p), d = INFO[m.name], u = (p - m.s0) / (m.s1 - m.s0);
  if (d && infoFor !== m.name) {
    infoFor = m.name;
    info.replaceChildren(el('div', d.label, 'label mono'), el('h2', d.h), ...d.lines.map((l) => el('p', l)));
    if (d.plan) { const b = el('button', `Ask about ${d.plan}`, 'pill solid'); b.onclick = () => openForm(d.plan); info.append(b); }
  }
  const o = d ? sstep(0, 0.22, u) * (1 - sstep(0.8, 1, u)) : 0;
  info.style.opacity = o; info.style.transform = `translateY(${(1 - o) * 14}px)`; info.classList.toggle('on', o > 0.5);
  const oc = m.name === 'Choose one' ? sstep(0.05, 0.25, u) * (1 - sstep(0.85, 1, u)) : 0;
  chooser.style.opacity = oc; chooser.classList.toggle('on', oc > 0.5);
  startBtn.classList.toggle('on', m === lastMove && u > 0.45);
}
for (const pl of PLANS) {
  const card = el('article'), ul = el('ul'), b = el('button', `Choose ${pl.name}`, 'pill solid');
  for (const t of pl.bullets) ul.append(el('li', t));
  b.onclick = () => openForm(pl.name);
  card.append(el('h3', pl.name), el('div', pl.price, 'price'), ul, b); chooser.querySelector('.cards').append(card);
}

// ---------- the front desk's application form. Nothing is stored: submit only opens WhatsApp with the answers filled in. ----------
const formBox = document.getElementById('form'), form = formBox.querySelector('form'), startBtn = document.getElementById('startBtn');
function openForm(plan) {
  formBox.classList.remove('sent'); form.reset();
  if (plan) form.elements.need.value = plan;
  syncEmail(); lenis.stop(); formBox.showModal(); // the page behind stays where it is
}
const syncEmail = () => { const on = form.elements.contact.value === 'Email'; form.elements.email.closest('label').hidden = !on; form.elements.email.required = on; };
form.addEventListener('change', syncEmail);
form.addEventListener('submit', (e) => {
  e.preventDefault(); // the browser has already checked the required fields
  const f = form.elements, row = (k, v) => (v.trim() ? `${k}: ${v.trim()}\n` : '');
  const text = 'Hi Scrollstory, I would like to start a project.\n' + row('Name', f.name.value) + row('Business', f.business.value) + row('I need', f.need.value) + row('Budget', f.budget.value) +
    row('Reach me by', f.contact.value) + row('Email', f.contact.value === 'Email' ? f.email.value : '') + row('Message', f.message.value);
  formBox.classList.add('sent');
  window.open(`https://wa.me/919949088659?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
});
formBox.addEventListener('close', () => lenis.start());
for (const b of formBox.querySelectorAll('.close')) b.onclick = () => formBox.close();
startBtn.onclick = () => openForm();
const deskBox = new THREE.Box3(new THREE.Vector3(13.4, H.rooftop, 7), new THREE.Vector3(16.6, H.rooftop + 2.6, 8)); // the desk and the plan cards over it
const tvBox = new THREE.Box3(new THREE.Vector3(TV[0] - 1.5, H.home, TV[2] - 1.2), new THREE.Vector3(TV[0] + 1.5, H.home + 3.7, TV[2] + 0.8)); // the set and its picture in the air
addEventListener('click', (e) => {
  if (e.target.closest('button, a, dialog, #info, #chooser')) return;
  const onTv = env.tv.ch >= 0 && state.body < TV_SPAN[1];
  if (rail.moveAt(state.body) !== lastMove && !onTv) return;
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2), camera);
  if (onTv) { if (ray.ray.intersectsBox(tvBox)) steps.step(env.tv.ch === CHANNELS - 1 ? -1 : 1); return; } // a click changes the channel
  if (ray.ray.intersectsBox(deskBox)) openForm();
});

// ---------- floor plan ----------
const plan = document.getElementById('plan'), planBtn = document.getElementById('planBtn');
for (const r of rail.rooms) {
  const b = document.createElement('button'); b.className = 'mono'; b.textContent = r.name; b.setAttribute('role', 'menuitem');
  b.onclick = () => { if (free) lenis.scrollTo((r.s / rail.total) * lenis.limit, { immediate: true, force: true }); else steps.goto(steps.nearest(r.s)); togglePlan(false); };
  plan.append(b); r.btn = b;
}
function togglePlan(open = !plan.classList.contains('open')) { plan.classList.toggle('open', open); planBtn.setAttribute('aria-expanded', open); }
planBtn.onclick = () => togglePlan();
const hud = document.getElementById('hud');
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select')) return; // typing in the form
  if (e.key === 'Escape') togglePlan(false);
  if (e.key === 'h' || e.key === 'H') hud.classList.toggle('off');
  if (e.key === 'r' || e.key === 'R') { state.reduce = !state.reduce; state.hold = null; }
});

// ---------- frame ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); gelPass.target.setSize(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio()); }
addEventListener('resize', resize); resize();

let frames = 0, propsReady = false;
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
  camera.updateMatrixWorld();

  atmosphere(pos[1]);
  focus(state.body);
  for (const c of demoCards) { // each card arrives as the backward walk brings it into the frame, and leaves the same way on the way back
    const from = GALLERY.s0 + ((GALLERY.s1 - GALLERY.s0) * (8 - c.z)) / 17 - 4; // the walk runs from z = 7 to z = -10; a card shows once the camera is 1 m past it
    const r = Math.min(1, Math.max(0, (state.body - from) / 36)), u = Math.max(0, (r - 0.8) / 0.2);
    c.r.value = r; c.line.value = sstep(0.22, 0.3, r) * (0.6 + 0.4 * sstep(0.5, 0.6, r)) * (1 - sstep(0.82, 1, r));
    c.motes.material.opacity = sstep(0.02, 0.12, r) * (1 - sstep(0.3, 0.5, r)); c.motes.visible = c.motes.material.opacity > 0.01;
    c.m.scale.setScalar(1 + 0.07 * Math.sin(Math.PI * u) * (1 - u)); // a soft settle
  }
  dressing.update(time, dt, env);
  for (const [m, y0, ph] of drift) m.position.y = y0 + Math.sin(env.air * 1.3 + ph) * 0.04;
  caption(state.body); cards(state.body);
  const near = steps.travelling ? steps.dest : steps.nearest(state.body);
  if (near !== pips.at) { pips.children[pips.at]?.classList.remove('here'); pips.children[near].classList.add('here'); pips.at = near; }
  const k = state.reduce ? 0 : gel(state.body, time), hat = (state.body - HAT.s0) / (HAT.s1 - HAT.s0), inHat = hat > 0 && hat < 1;
  if (k > 0.002 || inHat) { const U = gelPass.mat.uniforms; U.hat.value = inHat ? hat : -1; U.time.value = env.air; U.aspect.value = camera.aspect; U.k.value = k; renderer.setRenderTarget(gelPass.target); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(gelPass.scene, gelPass.camera); }
  else renderer.render(scene, camera);

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

if (import.meta.env.DEV) window.__world = { state, rail, lenis, FEEL, env }; // for tuning from the console

// Stop drawing when the tab is hidden.
document.addEventListener('visibilitychange', () => (document.hidden && !pinned ? gsap.ticker.sleep() : gsap.ticker.wake())); // a headless capture counts as hidden
