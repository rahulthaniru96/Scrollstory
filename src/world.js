// World data and distance math. Pure JS: shared by the browser scene, the rail and the Node clearance check.
// Units: metres. +x = east (right from the street), +y = up, +z = south (toward the street).

export const EYE = 1.6;
export const LEAN_SHIFT = 0.15; // how far the cursor may slide the camera sideways
export const CLEAR = 0.6 + LEAN_SHIFT; // the 0.6 m rule plus that slide
export const CLEAR_CEILING = 0.4;

export const STAIR = { cx: 0, cz: 4.5, rWalk: 2.25, rIn: 1.2, rOut: 3.0, rise: 5, phi0: 0.2, turns: 5.2 };
export const PHI_END = STAIR.phi0 + STAIR.turns * 2 * Math.PI;
export const STAIR_EXIT_WEDGE = 1.75; // radians of Landing floor past the last tread
export const stairY = (phi) => (STAIR.rise * (phi - STAIR.phi0)) / (2 * Math.PI);
export const stairPt = (phi, r = STAIR.rWalk, dy = 0) => [
  STAIR.cx - r * Math.sin(phi),
  stairY(phi) + dy,
  STAIR.cz + r * Math.cos(phi),
];

// Heights (floor level of each piece).
export const H = { roof: 9, wing: 4.5, cloud0: 13, cloud1: 22, landing: 26, home: 28, extras: 30, rooftop: 33 };

// Sky and fog colour by camera height (motion spec, section 7). The cloud sea sits between 13 and 22 m.
export const SKY_BY_HEIGHT = [[0, 0xf3cfa4], [9, 0xf2c08e], [13, 0xf6d9b8], [15, 0xf3eee6], [17.5, 0xf7d9d3], [20, 0xfbe0a8], [23, 0xf2a766], [36, 0xe8935a]];

// ---------- colliders ----------
const C = [];
const box = (name, x0, x1, y0, y1, z0, z1, kind = 'wall', extra = {}) =>
  C.push({ t: 'box', name, kind, min: [x0, y0, z0], max: [x1, y1, z1], ...extra });
const cyl = (name, x, z, r, y0, y1, kind = 'furniture') => C.push({ t: 'cyl', name, kind, x, z, r, y0, y1 });
const sph = (name, x, y, z, r, shape) => C.push({ t: 'sph', name, kind: 'floating', x, y, z, r, shape });
const slabHole = (name, x0, x1, y0, y1, z0, z1, kind) =>
  C.push({ t: 'slabHole', name, kind, min: [x0, y0, z0], max: [x1, y1, z1], hx: STAIR.cx, hz: STAIR.cz, hr: 3.2 });

const W = 0.3; // wall thickness

// Street side: compound wall and gate.
box('compound wall W', -14, -2.1, 0, 1.8, 17.85, 18.15, 'stone');
box('compound wall E', 2.1, 14, 0, 1.8, 17.85, 18.15, 'stone');
box('gate pillar W', -2.1, -1.6, 0, 2.4, 17.75, 18.25);
box('gate pillar E', 1.6, 2.1, 0, 2.4, 17.75, 18.25);

// Lobby: x -6..6, z 0..12, 9 m tall.
box('lobby front W', -6, -1.2, 0, H.roof, 12, 12 + W, 'facade');
box('lobby front E', 1.2, 6, 0, H.roof, 12, 12 + W, 'facade');
box('lobby front lintel', -1.2, 1.2, 3, H.roof, 12, 12 + W, 'facade');
for (const [sx, n] of [[-1, 'W'], [1, 'E']]) {
  const x0 = sx < 0 ? -6 - W : 6, x1 = sx < 0 ? -6 : 6 + W;
  box(`lobby side ${n} back`, x0, x1, 0, H.roof, -0.15, 8);
  box(`lobby side ${n} front`, x0, x1, 0, H.roof, 10.4, 12 + W);
  box(`lobby side ${n} lintel`, x0, x1, 3, H.roof, 8, 10.4);
}
box('lobby glass back', -6, 6, 0, H.roof, -0.15, 0.15, 'glass');
slabHole('lobby roof', -6 - W, 6 + W, H.roof, H.roof + W, -0.15, 12 + W, 'ceiling');

// Wings around the water courtyard (x -6..6, z -16..0).
box('wing wall W', -12 - W, -12, 0, H.wing, -22, 12);
box('wing wall E', 12, 12 + W, 0, H.wing, -22, 12);
box('wing south W', -12 - W, -6 - W, 0, H.wing, 12, 12 + W, 'facade');
box('wing south E', 6 + W, 12 + W, 0, H.wing, 12, 12 + W, 'facade');
box('wing wall N', -12 - W, 12 + W, 0, H.wing, -22 - W, -22);
box('gallery roof', -12 - W, -6, H.wing, H.wing + W, -16, 12, 'ceiling');
box('workshop roof', -12 - W, 12 + W, H.wing, H.wing + W, -22 - W, -16, 'ceiling');
box('worth it roof', 6, 12 + W, H.wing, H.wing + W, -16, 12, 'ceiling');
for (const z of [-2, -5, -8, -11, -14]) {
  box(`pillar W z${z}`, -6.25, -5.75, 0, H.wing, z - 0.25, z + 0.25, 'pillar');
  box(`pillar E z${z}`, 5.75, 6.25, 0, H.wing, z - 0.25, z + 0.25, 'pillar');
}
for (const x of [-6, -3, 0, 3, 6]) box(`pillar N x${x}`, x - 0.25, x + 0.25, 0, H.wing, -16.25, -15.75, 'pillar');
box('arcade beam W', -6.25, -5.75, 3.6, H.wing, -16, 0, 'pillar');
box('arcade beam E', 5.75, 6.25, 3.6, H.wing, -16, 0, 'pillar');
box('arcade beam N', -6, 6, 3.6, H.wing, -16.25, -15.75, 'pillar');

// 03 Workshop: three shop counters on the back wall.
export const SHOPS = [-6, 0, 6].map((x, i) => ({ x, name: ['Starter', 'Signature', 'Signature + Admin'][i], color: [0xe8a89a, 0x2f5fa8, 0x3f6e68][i] }));
for (const s of SHOPS) {
  box(`shop ${s.name}`, s.x - 2, s.x + 2, 0, 1.0, -22, -20.6, 'furniture');
  box(`shop sign ${s.name}`, s.x - 2.4, s.x + 2.4, 3.55, 4.2, -22, -21.6, 'sign', { color: s.color });
}
for (const x of [-9, -3, 3, 9]) box(`shop divider x${x}`, x - 0.15, x + 0.15, 0, 4.2, -22, -20.6, 'wall', { color: 0xc47a5a });

// 04 Worth it: four counters on the east wall.
export const COUNTERS = [-8.5, -5.5, -2.5, 0.5].map((z, i) => ({ z, name: ['Custom', 'Secure', 'Legal', 'Income'][i] }));
for (const c of COUNTERS) box(`counter ${c.name}`, 10.9, 12, 0, 1.1, c.z - 0.9, c.z + 0.9, 'furniture');
export const WORTH_CENTRE = [11.3, 1.1, -4];

// 02 Gallery: floating website cards (placeholders until Rahul decides which sites show).
export const CARDS = [4, 1, -2, -5, -8].map((z, i) => ({ x: i % 2 ? -11 : -7, y: 1.55, z, w: 1.6, h: 1.0, label: 'Demo' }));
for (const [i, c] of CARDS.entries()) sph(`card ${i + 1}`, c.x, c.y, c.z, 1.0, 'card');

// ---------- the dreamy layer's solid parts (drawn by dress.js, checked here) ----------
// Windows are portals: each shows a different sky. `n` is the way the window faces (into the room).
export const WINDOWS = [
  ...[5.5, 2.5, -0.5, -3.5, -6.5, -9.5].map((z, i) => ({ x: -12, y: 0.8, z, n: '+x', w: 1.5, h: 3.0, sky: ['gold', 'rose', 'gold', 'day', 'gold', 'rose'][i], shaft: 40 })),
  ...COUNTERS.map((c, i) => ({ x: 12, y: 1.3, z: c.z, n: '-x', w: 1.7, h: 2.5, sky: ['night', 'dawn', 'day', 'gold'][i], shaft: 38 })),
  ...SHOPS.map((s, i) => ({ x: s.x, y: 1.1, z: -22, n: '+z', w: 2.6, h: 2.3, sky: ['rose', 'day', 'night'][i], shaft: 36 })),
  ...[2.2, 5.4].flatMap((z) => [
    { x: -6, y: 5.0, z, n: '+x', w: 1.6, h: 3.2, sky: 'gold', shaft: 40 },
    { x: 6, y: 5.0, z, n: '-x', w: 1.6, h: 3.2, sky: 'rose' },
  ]),
];
// A door standing alone in the courtyard water, ajar, with light behind it.
export const LONE_DOOR = { x: 2.6, z: -9.5, w: 1.1, h: 2.3 };
box('door in the water', LONE_DOOR.x - 0.7, LONE_DOOR.x + 0.7, 0, 2.5, LONE_DOOR.z - 0.2, LONE_DOOR.z + 0.2, 'furniture', { hidden: true });
// Lamps drift over the courtyard water. The whole court is theirs; no camera lane crosses it.
export const LAMP_ZONE = { x0: -4.6, x1: 4.6, z0: -14.6, z1: -1.4, y0: 0.5, y1: 3.0 };
box('courtyard lamps', LAMP_ZONE.x0, LAMP_ZONE.x1, 0, LAMP_ZONE.y1 + 0.2, LAMP_ZONE.z0, LAMP_ZONE.z1, 'floating', { hidden: true });
// Ledger pages leave the Income counter as paper birds, out through the arcade and up into the sky.
export const BIRD_PATH = [[11.2, 1.5, 0.5], [10.6, 2.6, -1.5], [9.2, 3.1, -4], [7.4, 3.1, -5.8], [6, 3.0, -6.5], [3.5, 3.6, -7.5], [0, 5.5, -8], [-3, 8.5, -6], [-2, 12, 0]];
for (const [i, q] of BIRD_PATH.entries()) C.push({ t: 'sph', name: `paper birds path ${i}`, kind: 'floating', x: q[0], y: q[1], z: q[2], r: 0.4, hidden: true });
// Long-rod ceiling fans and a cloud that has drifted indoors.
export const FANS = [[-9, 3.6, -4], [9, 3.6, -4], [0, 3.6, -18.8]];
for (const [i, q] of FANS.entries()) C.push({ t: 'sph', name: `wing fan ${i}`, kind: 'floating', x: q[0], y: q[1], z: q[2], r: 0.85, hidden: true });
export const INDOOR_CLOUD = [4.4, 6.6, 9.6];
C.push({ t: 'sph', name: 'cloud indoors', kind: 'floating', x: INDOOR_CLOUD[0], y: INDOOR_CLOUD[1], z: INDOOR_CLOUD[2], r: 1.6, hidden: true });

// Landing fragment: 2.5 m of stone with the stair shaft through it.
slabHole('landing slab', -11, 4.5, H.landing - 2.5, H.landing, -3, 10, 'floor');
box('landing west wall', -11 - W, -11, H.landing, H.landing + 4, -3, 1.6);
box('landing west wall 2', -11 - W, -11, H.landing, H.landing + 4, 5.4, 10);
box('landing window sill', -11 - W, -11, H.landing, H.landing + 0.9, 1.6, 5.4);
box('landing window head', -11 - W, -11, H.landing + 3.1, H.landing + 4, 1.6, 5.4);
box('landing south wall', -11, -4, H.landing, H.landing + 3.2, 10, 10 + W);
export const WINDOW = { x: -11, y: H.landing + 2, z: 3.5 }; // crystal-glass window centre
export const SUN_PATCH = [-9, H.landing + 0.9, 3.6]; // what the hold frame looks at

// HOME fragment.
box('home slab', -13, 0, H.home - 1.5, H.home, -23, -11, 'floor');
box('home back wall', -13, 0, H.home, H.home + 3.5, -23 - W, -23);
box('home west wall', -13 - W, -13, H.home, H.home + 3.5, -23, -17);
box('sofa', -8, -5, H.home, H.home + 0.9, -16.5, -15.5, 'furniture');
box('box TV', -7.2, -5.8, H.home, H.home + 1.5, -19.6, -19, 'furniture');
export const TV = [-6.5, H.home + 1.0, -19];

// Extras fragment.
box('extras slab', 8, 22, H.extras - 1.5, H.extras, -24, -10, 'floor');
box('departure board wall', 9, 21, H.extras, H.extras + 5, -24 - W, -24);
box('departure board', 11, 19, H.extras + 1.2, H.extras + 4, -24, -23.85, 'sign');

// Rooftop fragment.
box('rooftop slab', 8, 22, H.rooftop - 1.5, H.rooftop, -1, 11, 'floor');
box('front desk', 13.4, 16.6, H.rooftop, H.rooftop + 1.0, 7, 8, 'furniture');
cyl('water tank 1', 20, 9, 0.8, H.rooftop, H.rooftop + 1.6);
cyl('water tank 2', 18.2, 9.4, 0.6, H.rooftop, H.rooftop + 1.2);
cyl('umbrella pole', 17.4, 6.4, 0.05, H.rooftop, H.rooftop + 2.4);
box('parapet S', 8, 22, H.rooftop, H.rooftop + 0.9, 11, 11 + 0.2);
box('parapet E', 22, 22.2, H.rooftop, H.rooftop + 0.9, -1, 11);
box('parapet W', 7.8, 8, H.rooftop, H.rooftop + 0.9, -1, 11);
export const DESK = [15, H.rooftop + 0.8, 7.5];

// Floating objects. Radius includes the object's whole drift range.
sph('kite', 6.5, 16, 4.5, 1.2, 'kite');
sph('paper birds', -6, 18.5, 9, 1.2, 'birds');
sph('newspaper page', 4, 20.5, -2, 1.0, 'paper');
sph('ceiling fan', -6, H.landing + 4.4, 3, 1.0, 'fan');
sph('floating box TV', 2, 30, -8, 1.2, 'tv');
sph('phone and battery', -10, 30.5, -6, 1.0, 'phone');
sph('petals', 12, 33, -5, 1.0, 'petals');
sph('kite 2', 20, 37, 4, 1.2, 'kite');

// Bridges (ramps). The blockout draws them as stepping slabs.
export const BRIDGES = [
  { name: 'bridge to HOME', axis: 'z', c: -6.5, a: -3, b: -11, ya: H.landing, yb: H.home, width: 1.6 },
  { name: 'bridge to Extras', axis: 'x', c: -16, a: 0, b: 8, ya: H.home, yb: H.extras, width: 1.6 },
  { name: 'bridge to Rooftop', axis: 'z', c: 15, a: -10, b: -1, ya: H.extras, yb: H.rooftop, width: 1.6 },
];

// Doorways the camera passes: [x, z] of each jamb.
export const DOORS = [
  { name: 'gate', a: [-1.6, 18], b: [1.6, 18] },
  { name: 'lobby front door', a: [-1.2, 12.15], b: [1.2, 12.15] },
  { name: 'lobby west door', a: [-6.15, 8], b: [-6.15, 10.4] },
  { name: 'lobby east door', a: [6.15, 8], b: [6.15, 10.4] },
];

// Stair as point clouds: both rails (0 to 0.9 m above the treads) and the tread slab.
{
  const rails = [], treads = [];
  for (let phi = STAIR.phi0; phi <= PHI_END + 1e-9; phi += 0.05) {
    for (const r of [STAIR.rIn, STAIR.rOut]) for (const dy of [0.3, 0.6, 0.9]) rails.push(stairPt(phi, r, dy));
  }
  for (let phi = STAIR.phi0; phi <= PHI_END + 1e-9; phi += 0.12) {
    for (const r of [1.35, 1.85, 2.35, 2.85]) treads.push(stairPt(phi, r, -0.1));
  }
  C.push({ t: 'pts', name: 'stair rails', kind: 'rail', r: 0.04, pts: rails });
  C.push({ t: 'pts', name: 'stair treads', kind: 'floor', r: 0.3, pts: treads });
}

export const COLLIDERS = C;

// ---------- distance ----------
const boxDist = (c, p) =>
  Math.hypot(
    Math.max(c.min[0] - p[0], 0, p[0] - c.max[0]),
    Math.max(c.min[1] - p[1], 0, p[1] - c.max[1]),
    Math.max(c.min[2] - p[2], 0, p[2] - c.max[2]),
  );

export function distTo(c, p) {
  switch (c.t) {
    case 'box':
      return boxDist(c, p);
    case 'cyl':
      return Math.hypot(Math.max(Math.hypot(p[0] - c.x, p[2] - c.z) - c.r, 0), Math.max(c.y0 - p[1], 0, p[1] - c.y1));
    case 'sph':
      return Math.hypot(p[0] - c.x, p[1] - c.y, p[2] - c.z) - c.r;
    case 'slabHole': {
      const rho = Math.hypot(p[0] - c.hx, p[2] - c.hz);
      if (rho >= c.hr) return boxDist(c, p);
      return Math.hypot(c.hr - rho, Math.max(c.min[1] - p[1], 0, p[1] - c.max[1]));
    }
    case 'pts': {
      let m = Infinity;
      for (const q of c.pts) {
        const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2;
        if (d < m) m = d;
      }
      return Math.sqrt(m) - c.r;
    }
  }
}

// Smallest margin left at a point: distance minus the clearance that collider needs.
export function clearanceAt(p) {
  let best = { margin: Infinity, dist: Infinity, name: '' };
  for (const c of COLLIDERS) {
    const d = distTo(c, p);
    const margin = d - (c.kind === 'ceiling' ? CLEAR_CEILING : CLEAR);
    if (margin < best.margin) best = { margin, dist: d, name: c.name };
  }
  return best;
}

// ---------- floors ----------
const RECT_FLOORS = [
  { y: H.landing, x0: -11, x1: 4.5, z0: -3, z1: 10 },
  { y: H.home, x0: -13, x1: 0, z0: -23, z1: -11 },
  { y: H.extras, x0: 8, x1: 22, z0: -24, z1: -10 },
  { y: H.rooftop, x0: 8, x1: 22, z0: -1, z1: 11 },
];

// Height of the floor under an eye at (x, y, z): the highest surface at least 1 m below the eye.
export function floorAt(x, y, z) {
  let best = 0; // the ground and its thin water
  const take = (fy) => { if (fy <= y - 1 && fy > best) best = fy; };
  const rho = Math.hypot(x - STAIR.cx, z - STAIR.cz);
  const base = Math.atan2(-(x - STAIR.cx), z - STAIR.cz);
  for (const f of RECT_FLOORS) {
    if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
    // Inside the stair shaft the Landing floor exists only as the wedge where the stair steps off.
    if (f.y === H.landing && rho < 3.2) {
      const past = (((base - PHI_END) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (past > STAIR_EXIT_WEDGE) continue;
    }
    take(f.y);
  }
  for (const b of BRIDGES) {
    const along = b.axis === 'z' ? z : x, across = b.axis === 'z' ? x : z;
    const u = (along - b.a) / (b.b - b.a);
    if (u >= 0 && u <= 1 && Math.abs(across - b.c) <= b.width / 2) take(b.ya + (b.yb - b.ya) * u);
  }
  if (rho >= STAIR.rIn - 0.1 && rho <= STAIR.rOut + 0.1) {
    for (let k = -1; k <= 7; k++) {
      const phi = base + 2 * Math.PI * k;
      if (phi >= STAIR.phi0 && phi <= PHI_END) take(stairY(phi));
    }
  }
  return best;
}
