// Grey blockout walkthrough: the real rail, springs, caps, holds and mist cut. Nothing here is final art.
import * as THREE from 'three';
import Lenis from 'lenis';
import gsap from 'gsap';
import { buildRail } from './rail.js';
import { smoothDamp } from './spring.js';
import { COLLIDERS, CARDS, BRIDGES, STAIR, PHI_END, STAIR_EXIT_WEDGE, stairPt, stairY, H, WINDOW, SUN_PATCH, clearanceAt, CLEAR } from './world.js';

// ---------- feel numbers (motion spec, sections 2 and 5). All tagged [C] there: tune here. ----------
const FEEL = {
  smooth: { room: 0.35, stair: 0.5, cloud: 0.6 }, // seconds, body spring
  lookFactor: 0.7, // the eyes' spring is this much quicker than the body's
  caps: { room: { move: 4, yaw: 60, pitch: 40 }, stair: { move: 5, yaw: 90, pitch: 40 }, cloud: { move: 5, yaw: 90, pitch: 40 } },
  cutBeyond: 150, // vh of lag before a mist cut replaces flying
  cutOut: 0.25, cutIn: 0.4,
  lean: { yaw: 1.5, pitch: 1.0, shift: 0.06, pointer: 0.12, camera: 0.45 },
};

const rail = buildRail();
const canvas = document.getElementById('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch {
  document.getElementById('nogl').style.display = 'block';
  throw new Error('WebGL is not available');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xf3cfa4, 0.004);
scene.background = new THREE.Color(0xf3cfa4);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);
camera.rotation.order = 'YXZ';
const hemi = new THREE.HemisphereLight(0xfff4e4, 0xb7b1a3, 2.6);
const sun = new THREE.DirectionalLight(0xffe2b8, 2.4);
sun.position.set(-30, 18, 10); // low in the west
scene.add(hemi, sun);

// ---------- blockout geometry, built from the same colliders the check uses ----------
const tone = { wall: 0xd6cfc1, ceiling: 0xe2dccf, floor: 0xb9b2a3, pillar: 0xc9b08a, furniture: 0xa98f72, glass: 0xbfd8d2, rail: 0x3f6e68, sign: 0x2f3b38 };
const mats = Object.fromEntries(Object.entries(tone).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })]));
Object.assign(mats.glass, { transparent: true, opacity: 0.22, roughness: 0.1 });
const edgeMat = new THREE.LineBasicMaterial({ color: 0x5e5a50, transparent: true, opacity: 0.35 });
const add = (geo, mat, x, y, z, edges = true) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); scene.add(m);
  if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
  return m;
};
const drift = []; // floating things: [mesh, home y, phase]
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
  if (c.t === 'box') {
    const s = c.max.map((v, i) => v - c.min[i]);
    add(new THREE.BoxGeometry(...s), mats[c.kind] || mats.wall, ...c.min.map((v, i) => v + s[i] / 2), c.kind !== 'glass');
  } else if (c.t === 'cyl') {
    add(new THREE.CylinderGeometry(c.r, c.r, c.y1 - c.y0, 20), mats.furniture, c.x, (c.y0 + c.y1) / 2, c.z);
  } else if (c.t === 'slabHole') {
    const sh = new THREE.Shape();
    sh.moveTo(c.min[0], -c.min[2]); sh.lineTo(c.max[0], -c.min[2]); sh.lineTo(c.max[0], -c.max[2]); sh.lineTo(c.min[0], -c.max[2]); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(c.hx, -c.hz, c.hr, 0, Math.PI * 2, true); sh.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: c.max[1] - c.min[1], bevelEnabled: false, curveSegments: 40 });
    geo.rotateX(-Math.PI / 2);
    add(geo, mats[c.kind] || mats.floor, 0, c.min[1], 0, false);
  } else if (c.t === 'sph') {
    let m;
    if (c.shape === 'card') {
      m = add(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: cardTexture, side: THREE.DoubleSide }), c.x, c.y, c.z, false);
      m.rotation.y = Math.PI; // faces north, toward the camera that is backing away
    } else if (c.shape === 'tv') {
      m = add(new THREE.BoxGeometry(0.9, 0.75, 0.7), mats.furniture, c.x, c.y, c.z);
    } else if (c.shape === 'fan') {
      m = new THREE.Group(); m.position.set(c.x, c.y, c.z); scene.add(m);
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.16), mats.rail); b.position.x = 0.75; const arm = new THREE.Group(); arm.rotation.y = (i * 2 * Math.PI) / 3; arm.add(b); m.add(arm); }
      m.userData.spin = 1.2;
    } else {
      m = add(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshStandardMaterial({ color: 0xf7efe2, side: THREE.DoubleSide }), c.x, c.y, c.z, false);
      m.rotation.set(0.5, 0.8, 0.2);
    }
    drift.push([m, c.y, drift.length * 1.7]);
  }
}

// Thin still water over the ground, inside and out.
add(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7fa39c, roughness: 0.25, metalness: 0.1 }), 0, 0, 0, false);

// The spiral stair: treads, the Landing wedge it steps off onto, and two rails.
{
  const PER_TURN = 33, dPhi = (2 * Math.PI) / PER_TURN;
  const flat = Math.ceil(STAIR_EXIT_WEDGE / dPhi);
  const count = Math.ceil((PHI_END - STAIR.phi0) / dPhi) + flat;
  const treads = new THREE.InstancedMesh(new THREE.BoxGeometry(STAIR.rOut - STAIR.rIn, 0.15, 0.62), mats.wall, count);
  const o = new THREE.Object3D(), rMid = (STAIR.rIn + STAIR.rOut) / 2;
  for (let i = 0; i < count; i++) {
    const phi = STAIR.phi0 + i * dPhi;
    const q = stairPt(Math.min(phi, PHI_END), rMid, -0.075);
    o.position.set(STAIR.cx - rMid * Math.sin(phi), q[1], STAIR.cz + rMid * Math.cos(phi));
    o.rotation.set(0, Math.atan2(-Math.cos(phi), -Math.sin(phi)), 0);
    o.updateMatrix(); treads.setMatrixAt(i, o.matrix);
  }
  scene.add(treads);
  for (const r of [STAIR.rIn, STAIR.rOut]) for (const dy of [0.45, 0.9]) {
    const p = [];
    for (let phi = STAIR.phi0; phi <= PHI_END; phi += 0.1) p.push(new THREE.Vector3(...stairPt(phi, r, dy)));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), p.length * 3, 0.035, 6), mats.rail));
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

// The Landing's window and the sun patch on the tiles (placeholders for the feel-test room).
add(new THREE.PlaneGeometry(3.8, 2.2).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff3d6, fog: false }), WINDOW.x + 0.02, WINDOW.y, WINDOW.z, false);
add(new THREE.PlaneGeometry(2.6, 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf7d9a0 }), SUN_PATCH[0] + 0.6, H.landing + 0.01, SUN_PATCH[2], false);

// Cloud sea: a deck with a hole for the stair, puffs around it, and puffs down the stair's open well.
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xfff6ea, roughness: 1 });
{
  const deck = new THREE.Mesh(new THREE.RingGeometry(4.6, 450, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff6ea, side: THREE.DoubleSide }));
  deck.position.set(STAIR.cx, 17.5, STAIR.cz); scene.add(deck);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const puff = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 90; i++) {
    const size = 2 + rnd() * 5, dist = size + 4.6 + rnd() * rnd() * 60, a = rnd() * Math.PI * 2;
    const m = new THREE.Mesh(puff, cloudMat);
    m.position.set(STAIR.cx + Math.cos(a) * dist, 13.6 + rnd() * 7.6, STAIR.cz + Math.sin(a) * dist);
    m.scale.set(size, size * 0.45, size); scene.add(m);
  }
}
const wellPuffs = [];
for (let y = 13.4; y <= 21.8; y += 0.9) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 2), new THREE.MeshBasicMaterial({ color: 0xfff6ea, transparent: true }));
  m.position.set(STAIR.cx, y, STAIR.cz); scene.add(m); wellPuffs.push(m);
}

// ---------- sky, fog and light by camera height (motion spec, section 7) ----------
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const SKY = [[0, 0xf3cfa4], [9, 0xf2c08e], [13, 0xf6d9b8], [15, 0xf3eee6], [17.5, 0xf7d9d3], [20, 0xfbe0a8], [23, 0xf2a766], [36, 0xe8935a]].map(([h, c]) => [h, new THREE.Color(c)]);
const skyCol = new THREE.Color();
function atmosphere(h) {
  let i = 0; while (i < SKY.length - 2 && h > SKY[i + 1][0]) i++;
  skyCol.lerpColors(SKY[i][1], SKY[i + 1][1], Math.min(1, Math.max(0, (h - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]))));
  const dark = 1 - 0.75 * sstep(24, 25.2, h) * (1 - sstep(26.4, 27.6, h)); // the dark beat inside the stone
  skyCol.multiplyScalar(dark);
  scene.fog.color.copy(skyCol); scene.background.copy(skyCol);
  scene.fog.density = lerp(lerp(0.004, 0.33, sstep(11, 15, h)), 0.006, sstep(20.5, 23, h));
  hemi.intensity = 2.6 * dark; sun.intensity = 2.4 * dark;
}

// ---------- scroll, springs and caps ----------
document.getElementById('track').style.height = `${rail.total + 100}vh`;
const lenis = new Lenis({ lerp: 0.1 });
gsap.ticker.lagSmoothing(0);

const state = { body: 0, look: 0, vBody: 0, vLook: 0, cutting: false, started: false, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, hold: null };
const pointer = { x: 0, y: 0, sx: 0, sy: 0, vx: 0, vy: 0, cx: 0, cy: 0, cvx: 0, cvy: 0 };
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = (e.clientY / innerHeight) * 2 - 1; } });

const holds = rail.moves.filter((m) => m.hold);
const target = () => (lenis.limit > 0 ? (lenis.scroll / lenis.limit) * rail.total : 0);
const mist = document.getElementById('mist');
function cut(to) {
  state.cutting = true;
  gsap.to(mist, { opacity: 1, duration: FEEL.cutOut, ease: 'none', onComplete() {
    state.body = state.look = to(); state.vBody = state.vLook = 0;
    gsap.to(mist, { opacity: 0, duration: FEEL.cutIn, ease: 'none', onComplete() { state.cutting = false; } });
  } });
}

// Fastest the progress may move right now (vh per second), from the caps and the local shape of the rail.
function speedLimit(p, zone) {
  const cap = FEEL.caps[zone], e = 0.25;
  const a = rail.pos(p - e), b = rail.pos(p + e);
  const m = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / (2 * e);
  const yaw = Math.abs(rail.yaw(p + e) - rail.yaw(p - e)) / (2 * e), pitch = Math.abs(rail.pitch(p + e) - rail.pitch(p - e)) / (2 * e);
  return Math.min(m > 1e-4 ? cap.move / m : 1e4, yaw > 1e-3 ? cap.yaw / yaw : 1e4, pitch > 1e-3 ? cap.pitch / pitch : 1e4, 2000);
}

// ---------- captions (words from the design board; rooms without written copy show their label only) ----------
const COPY = {
  'Arrival hold': ['Scrollstory Studio · Secunderabad', 'Every business has a story.', "Come in, we'll show you ours."],
  'Lobby hold': ['Room 01 · The lobby', "We don't just build websites.", 'We tell your story and build its world.'],
  'Gallery hold': ['Room 02 · The gallery', 'Every door, a site we built.', 'Step into any one.'],
  'Workshop hold': ['Room 03 · The workshop', 'Three shops. Try each one', 'before you buy.'],
  'Worth it hold': ['Room 04 · Worth it', 'Custom. Secure. Legal.', 'Built to bring you income.'],
  'Look up': ['The stairs', 'Keep climbing.', 'The best view is upstairs.'],
  'Landing hold': ['The landing · core memory', '', ''],
  'HOME hold': ['Home · the story plays here', '', ''],
  'Extras hold': ['Room 05 · Extras', 'Everything else', 'it takes to go digital.'],
  'Settle on the desk': ['Room 06 · Rooftop front desk', "Let's build yours.", 'The desk is open.'],
};
const cap = document.getElementById('caption'), capLabel = cap.querySelector('.label'), capH = cap.querySelector('h1');
let capFor = null;
function caption(p) {
  const m = rail.moveAt(p), c = COPY[m.name];
  if (!c) { cap.style.opacity = 0; return; }
  if (capFor !== m.name) {
    capFor = m.name; capLabel.textContent = c[0]; capH.textContent = c[1];
    if (c[2]) { const em = document.createElement('em'); em.textContent = c[2]; capH.append(em); }
  }
  const u = (p - m.s0) / (m.s1 - m.s0), last = m === rail.moves[rail.moves.length - 1];
  const o = sstep(0.1, 0.4, u) * (last ? 1 : 1 - sstep(0.85, 1, u)); // scroll-driven, so it reverses exactly
  cap.style.opacity = o; cap.style.transform = `translateY(${(1 - o) * 16}px)`;
}

// ---------- floor plan ----------
const plan = document.getElementById('plan'), planBtn = document.getElementById('planBtn');
for (const r of rail.rooms) {
  const b = document.createElement('button'); b.className = 'mono'; b.textContent = r.name; b.setAttribute('role', 'menuitem');
  b.onclick = () => { lenis.scrollTo((r.s / rail.total) * lenis.limit, { immediate: true, force: true }); togglePlan(false); };
  plan.append(b); r.btn = b;
}
function togglePlan(open = !plan.classList.contains('open')) { plan.classList.toggle('open', open); planBtn.setAttribute('aria-expanded', open); }
planBtn.onclick = () => togglePlan();
const hud = document.getElementById('hud');
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') togglePlan(false);
  if (e.key === 'h' || e.key === 'H') hud.classList.toggle('off');
  if (e.key === 'r' || e.key === 'R') { state.reduce = !state.reduce; state.hold = null; }
});

// ---------- frame ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const prev = { pos: null, yaw: 0, t: 0 };
let shown = { speed: 0, turn: 0, fps: 0 };
gsap.ticker.add((time, deltaMs) => {
  lenis.raf(time * 1000);
  const dt = Math.min(0.05, Math.max(0.001, deltaMs / 1000));
  let pT = target();

  if (state.reduce) { // reduced motion: cut between hold frames, never fly
    const h = [...holds].reverse().find((m) => m.s0 <= pT + 1) || holds[0];
    if (h !== state.hold && !state.cutting) { state.hold = h; cut(() => lerp(h.s0, h.s1, 0.6)); }
    pT = state.body;
  } else if (!state.started) { state.body = state.look = pT; state.started = true; } // open where the page was left, without flying there
  else if (!state.cutting && Math.abs(pT - state.body) > FEEL.cutBeyond) cut(target);

  if (!state.cutting && !state.reduce) {
    const zone = rail.moveAt(state.body).zone, st = FEEL.smooth[zone], lim = speedLimit(state.body, zone);
    [state.body, state.vBody] = smoothDamp(state.body, pT, state.vBody, st, lim, dt);
    [state.look, state.vLook] = smoothDamp(state.look, pT, state.vLook, st * FEEL.lookFactor, lim, dt);
  }

  // Cursor lean: two springs in a row, so it starts softly.
  const L = FEEL.lean;
  [pointer.sx, pointer.vx] = smoothDamp(pointer.sx, pointer.x, pointer.vx, L.pointer, 100, dt);
  [pointer.sy, pointer.vy] = smoothDamp(pointer.sy, pointer.y, pointer.vy, L.pointer, 100, dt);
  [pointer.cx, pointer.cvx] = smoothDamp(pointer.cx, pointer.sx, pointer.cvx, L.camera, 100, dt);
  [pointer.cy, pointer.cvy] = smoothDamp(pointer.cy, pointer.sy, pointer.cvy, L.camera, 100, dt);

  const pos = rail.pos(state.body), yaw = rail.yaw(state.look) - pointer.cx * L.yaw, pitch = rail.pitch(state.look) - pointer.cy * L.pitch;
  const yr = THREE.MathUtils.degToRad(yaw);
  camera.position.set(pos[0] + Math.cos(yr) * pointer.cx * L.shift, pos[1], pos[2] - Math.sin(yr) * pointer.cx * L.shift);
  camera.rotation.set(THREE.MathUtils.degToRad(pitch), yr, 0); // no roll: the horizon stays level

  atmosphere(pos[1]);
  for (const m of wellPuffs) m.material.opacity = 0.95 * Math.min(1, Math.max(0, (m.position.distanceTo(camera.position) - 1.3) / 1.2));
  for (const [m, y0, ph] of drift) { m.position.y = y0 + Math.sin(time * 1.3 + ph) * 0.04; if (m.userData.spin) m.rotation.y += m.userData.spin * dt; }
  caption(state.body);
  renderer.render(scene, camera);

  // Readout for tuning.
  if (prev.pos) {
    const k = 1 - Math.exp(-dt / 0.15);
    shown.speed = lerp(shown.speed, Math.hypot(pos[0] - prev.pos[0], pos[1] - prev.pos[1], pos[2] - prev.pos[2]) / dt, k);
    shown.turn = lerp(shown.turn, Math.abs(yaw - prev.yaw) / dt, k);
    shown.fps = lerp(shown.fps, 1 / dt, k);
  }
  prev.pos = pos; prev.yaw = yaw;
  if (!hud.classList.contains('off') && time - prev.t > 0.1) {
    prev.t = time;
    const m = rail.moveAt(state.body), c = clearanceAt(pos), zone = m.zone, caps = FEEL.caps[zone];
    const warn = (v, lim) => (v > lim * 1.02 ? ' class="bad"' : '');
    hud.innerHTML =
      `<b>${m.name}</b>${m.hold ? '  · hold' : ''}\n` +
      `scroll   ${state.body.toFixed(0)} / ${rail.total} vh   lag ${(pT - state.body).toFixed(0)}\n` +
      `speed    <span${warn(shown.speed, caps.move)}>${shown.speed.toFixed(2)}</span> m/s   cap ${caps.move}\n` +
      `turn     <span${warn(shown.turn, caps.yaw)}>${shown.turn.toFixed(0)}</span> deg/s  cap ${caps.yaw}\n` +
      `clear    <span${c.dist < CLEAR ? ' class="bad"' : ''}>${c.dist.toFixed(2)}</span> m  ${c.name}\n` +
      `height   ${pos[1].toFixed(1)} m   spring ${FEEL.smooth[zone]} s\n` +
      `${shown.fps.toFixed(0)} fps${state.reduce ? '   reduced motion' : ''}`;
    for (const r of rail.rooms) r.btn.classList.toggle('here', r === [...rail.rooms].reverse().find((q) => q.s <= state.body + 30));
  }
});

if (import.meta.env.DEV) window.__world = { state, rail, lenis, FEEL }; // for tuning from the console

// Stop drawing when the tab is hidden.
document.addEventListener('visibilitychange', () => (document.hidden ? gsap.ticker.sleep() : gsap.ticker.wake()));
