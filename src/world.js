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
export const SKY_BY_HEIGHT = [[0, 0xf3cfa4], [9, 0xf2c08e], [13, 0xf6d9b8], [15, 0xf3eee6], [17.5, 0xf7d9d3], [20, 0xfbe0a8], [23, 0xf2a766], [29, 0xee9f7c], [33, 0xc79bb5], [37, 0xb58db8]]; // the top is the rooftop's purple twilight

// ---------- colliders ----------
const C = [];
const box = (name, x0, x1, y0, y1, z0, z1, kind = 'wall', extra = {}) =>
  C.push({ t: 'box', name, kind, min: [x0, y0, z0], max: [x1, y1, z1], ...extra });
const cyl = (name, x, z, r, y0, y1, kind = 'furniture', extra = {}) => C.push({ t: 'cyl', name, kind, x, z, r, y0, y1, ...extra });
const sph = (name, x, y, z, r, shape) => C.push({ t: 'sph', name, kind: 'floating', x, y, z, r, shape });
const HID = { hidden: true }; // drawn by dress.js or rooms.js, not as a blockout box
const air = (name, x, y, z, r) => C.push({ t: 'sph', name, kind: 'floating', x, y, z, r, hidden: true }); // room for something that hovers
const slabHole = (name, x0, x1, y0, y1, z0, z1, kind) =>
  C.push({ t: 'slabHole', name, kind, min: [x0, y0, z0], max: [x1, y1, z1], hx: STAIR.cx, hz: STAIR.cz, hr: 3.2 });

const W = 0.3; // wall thickness

// Street side: compound wall and gate.
box('compound wall W', -14, -2.1, 0, 1.8, 17.85, 18.15, 'stone');
box('compound wall E', 2.1, 14, 0, 1.8, 17.85, 18.15, 'stone');
box('gate pillar W', -2.1, -1.6, 0, 2.4, 17.75, 18.25);
box('gate pillar E', 1.6, 2.1, 0, 2.4, 17.75, 18.25);

// The street front's solid parts (drawn by facade.js).
export const TOWER = { x: 7, z: 13.9, r: 1.9 }; // the rounded corner tower, outside the east end of the lobby front
cyl('corner tower', TOWER.x, TOWER.z, TOWER.r + 0.55, 0, 14.9, 'wall', HID);
box('stepped parapet', -4.6, 4.6, 9.3, 11.3, 12, 12.3, 'wall', HID);
box('door leaf W', -1.28, -1.18, 0, 2.95, 12.8, 13.9, 'wall', HID);
box('door leaf E', 1.18, 1.28, 0, 2.95, 12.8, 13.9, 'wall', HID);
box('handrail W', -2, -1.9, 0, 0.95, 12.9, 14.95, 'rail', HID);
box('handrail E', 1.9, 2, 0, 0.95, 12.9, 14.95, 'rail', HID);
box('entrance canopy', -2.3, 2.3, 3.8, 3.95, 12.3, 13.2, 'ceiling', HID);
// Everything at street level stands on one plinth (lake.js): the building, its yard and the compound wall.
export const FOOTPRINT = { x0: -14.3, x1: 14.3, z0: -23.3, z1: 18.7 };

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
box('gallery roof', -12 - W, -6.15, H.wing, H.wing + W, -16, 12, 'ceiling');
box('workshop roof', -12 - W, 12 + W, H.wing, H.wing + W, -22 - W, -16, 'ceiling');
box('worth it roof', 6.15, 12 + W, H.wing, H.wing + W, -16, 12, 'ceiling');
for (const z of [-2, -5, -8, -11, -14]) {
  box(`pillar W z${z}`, -6.25, -5.75, 0, H.wing, z - 0.25, z + 0.25, 'pillar');
  box(`pillar E z${z}`, 5.75, 6.25, 0, H.wing, z - 0.25, z + 0.25, 'pillar');
}
for (const x of [-6, -3, 0, 3, 6]) box(`pillar N x${x}`, x - 0.25, x + 0.25, 0, H.wing, -16.25, -15.75, 'pillar');
box('arcade beam W', -6.25, -5.75, 3.6, H.wing, -16, 0, 'pillar');
box('arcade beam E', 5.75, 6.25, 3.6, H.wing, -16, 0, 'pillar');
box('arcade beam N', -6, 6, 3.6, H.wing, -16.25, -15.75, 'pillar');

// The story runs who, proof, why, price. So the south room is 03 Worth it and the east room is 04 Workshop.
// rooms.js still builds each room in the frame it was first drawn in (`u` is the place along that wall) and turns the whole room into place.
// 03 Worth it: four counters on the south room's back wall, facing the courtyard.
export const COUNTERS = [-11, -7, -3, 1].map((u, i) => ({ u, x: u + 5, z: -21.2, name: ['Custom', 'Secure', 'Legal', 'Income'][i] }));
export const COUNTER_ROOM = { turn: Math.PI / 2, x: 5, z: -9.85 };
for (const c of COUNTERS) box(`counter ${c.name}`, c.x - 0.9, c.x + 0.9, 0, 1.1, -22, -20.9, 'furniture');
for (const c of COUNTERS) air(`counter float ${c.name}`, c.x, 1.95, c.z, 0.7); // nothing rests on a counter
air('coins rising', COUNTERS[3].x, 3.3, COUNTERS[3].z, 0.6);

// 04 Workshop: three shop counters on the east wall, facing west.
export const SHOPS = [-6, 0, 6].map((u, i) => ({ u, x: 11.35, z: u - 5, name: ['Starter', 'Signature', 'Signature + Admin'][i], color: [0xe8a89a, 0x2f5fa8, 0x3f6e68][i] }));
export const SHOP_ROOM = { turn: -Math.PI / 2, x: -9.85, z: -5 };
for (const s of SHOPS) {
  box(`shop ${s.name}`, 10.6, 12, 0, 1.0, s.z - 2, s.z + 2, 'furniture');
  box(`shop sign ${s.name}`, 11.6, 12, 3.55, 4.2, s.z - 2.4, s.z + 2.4, 'sign', { color: s.color });
}
for (const s of SHOPS) air(`shop float ${s.name}`, 11.15, 2.2, s.z, 1.1); // each shop's device hovers over its counter, and floats forward on its beat
for (const z of [-8, -2, 4]) box(`shop divider z${z}`, 11.3, 12, 0, 4.2, z - 0.15, z + 0.15, 'wall', { color: 0xc47a5a }); // shallow, so all three shops show from the corner

// 02 Gallery: floating website cards (placeholders until Rahul decides which sites show).
export const CARDS = [4, 1, -2, -5, -8].map((z, i) => ({ x: i % 2 ? -11 : -7, y: 1.55, z, w: 1.6, h: 1.0, label: 'Demo' }));
for (const [i, c] of CARDS.entries()) sph(`card ${i + 1}`, c.x, c.y, c.z, 1.0, 'card');

// ---------- the dreamy layer's solid parts (drawn by dress.js, checked here) ----------
// Windows are portals: each shows a different sky. `n` is the way the window faces (into the room).
export const WINDOWS = [
  ...[5.5, 2.5, -0.5, -3.5, -6.5, -9.5].map((z, i) => ({ x: -12, y: 0.8, z, n: '+x', w: 1.5, h: 3.0, sky: ['gold', 'rose', 'gold', 'day', 'gold', 'rose'][i], shaft: 40 })),
  ...SHOPS.map((s, i) => ({ x: 12, y: 1.1, z: s.z, n: '-x', w: 2.6, h: 2.3, sky: ['rose', 'day', 'night'][i], shaft: 38 })),
  ...COUNTERS.map((c, i) => ({ x: c.x, y: 1.3, z: -22, n: '+z', w: 1.7, h: 2.5, sky: ['night', 'dawn', 'day', 'gold'][i], shaft: 36 })),
  ...[2.2, 5.4].flatMap((z) => [
    { x: -6, y: 5.0, z, n: '+x', w: 1.6, h: 3.2, sky: 'gold', shaft: 40 },
    { x: 6, y: 5.0, z, n: '-x', w: 1.6, h: 3.2, sky: 'rose' },
  ]),
  // Walls the turns face, so no turn ends on a blank wall.
  { x: -12, y: 0.8, z: 9.2, n: '+x', w: 1.5, h: 3.0, sky: 'night' },
  { x: 12, y: 1.0, z: -15, n: '-x', w: 1.5, h: 2.8, sky: 'rose' },
  { x: 9.2, y: 0.9, z: 12, n: '-z', w: 1.6, h: 2.9, sky: 'dawn' },
  { x: -9.6, y: 0.9, z: 12, n: '-z', w: 1.6, h: 2.9, sky: 'gold' },
  { x: 12, y: 0.9, z: -19.2, n: '-x', w: 1.6, h: 2.9, sky: 'day' },
  // Upper floor. `floor` is the level the light falls on.
  { x: -7.5, y: H.landing + 0.9, z: 10, n: '-z', w: 1.4, h: 2.0, sky: 'day' },
  { x: -10.2, y: H.home + 0.9, z: -23, n: '+z', w: 1.5, h: 2.2, sky: 'night', shaft: 42, floor: H.home },
  { x: -13, y: H.home + 0.9, z: -20, n: '+x', w: 1.4, h: 2.1, sky: 'dawn', shaft: 40, floor: H.home },
];
// A door standing alone in the courtyard water, ajar, with light behind it.
export const LONE_DOOR = { x: 2.6, z: -9.5, w: 1.1, h: 2.3 };
box('door in the water', LONE_DOOR.x - 0.7, LONE_DOOR.x + 0.7, 0, 2.5, LONE_DOOR.z - 0.2, LONE_DOOR.z + 0.2, 'furniture', { hidden: true });
// Lamps drift over the courtyard water. The whole court is theirs; no camera lane crosses it.
export const LAMP_ZONE = { x0: -4.6, x1: 4.6, z0: -14.6, z1: -1.4, y0: 0.5, y1: 3.0 };
box('courtyard lamps', LAMP_ZONE.x0, LAMP_ZONE.x1, 0, 5, LAMP_ZONE.z0, LAMP_ZONE.z1, 'floating', { hidden: true });
// Ledger pages leave the Income counter as paper birds, out through the arcade and up into the sky.
export const BIRD_PATH = [[6, 1.5, -21.2], [5.4, 2.6, -19.6], [4.6, 3.0, -17.6], [4.5, 3.0, -15.4], [3.5, 3.4, -12], [0, 5.5, -8], [-3, 8.5, -6], [-2, 12, 0]];
for (const [i, q] of BIRD_PATH.entries()) C.push({ t: 'sph', name: `paper birds path ${i}`, kind: 'floating', x: q[0], y: q[1], z: q[2], r: 0.4, hidden: true });
// Long-rod ceiling fans and a cloud that has drifted indoors.
export const FANS = [[-9, 3.6, -4], [9, 3.6, -4], [0, 3.6, -18.8]];
for (const [i, q] of FANS.entries()) C.push({ t: 'sph', name: `wing fan ${i}`, kind: 'floating', x: q[0], y: q[1], z: q[2], r: 0.85, hidden: true });
export const INDOOR_CLOUD = [4.4, 6.6, 9.6];
C.push({ t: 'sph', name: 'cloud indoors', kind: 'floating', x: INDOOR_CLOUD[0], y: INDOOR_CLOUD[1], z: INDOOR_CLOUD[2], r: 1.6, hidden: true });

// The wall of milestones: framed pictures hung just outside the stair's outer rail, up the lobby part of the climb.
// Facts only, from D:\\rahul-context\\projects. A milestone with no known fact has no line.
export const MILESTONES = [
  ['The first website', ''],
  ['Rishi Care Hospital', 'A hospital website with an admin dashboard for patients, inventory and billing.'],
  ['Bhumi Insurance', 'An insurance website with an admin CRM behind it.'],
  ['G-Thriftz', 'An online thrift store you walk into by scrolling.'],
  ['Five demo sites', 'A café, a gym, a preschool, a coaching centre and a real estate project. All fictional.'],
  ['Scrollstory Studio', 'This building.'],
].map(([title, line], i) => { const phi = STAIR.phi0 + 1.2 + i * 1.3; return { title, line, phi, at: stairPt(phi, 3.75, 1.75) }; });
for (const m of MILESTONES) air(`milestone: ${m.title}`, ...m.at, 0.5);
cyl('landing plant', 2.6, 8.6, 0.45, H.landing, H.landing + 1.3, 'furniture', HID);

// Landing fragment: 2.5 m of stone with the stair shaft through it.
slabHole('landing slab', -11, 4.5, H.landing - 2.5, H.landing, -3, 10, 'floor');
box('landing west wall', -11 - W, -11, H.landing, H.landing + 4, -3, 1.6);
box('landing west wall 2', -11 - W, -11, H.landing, H.landing + 4, 5.4, 10);
box('landing window sill', -11 - W, -11, H.landing, H.landing + 0.9, 1.6, 5.4);
box('landing window head', -11 - W, -11, H.landing + 3.1, H.landing + 4, 1.6, 5.4);
box('landing south wall', -11, -4, H.landing, H.landing + 3.2, 10, 10 + W);
export const WINDOW = { x: -11, y: H.landing + 2, z: 3.5 }; // crystal-glass window centre
export const SUN_PATCH = [-9, H.landing + 0.9, 3.6]; // what the hold frame looks at
box('tiles rising in the sun beam', -10.7, -7.2, H.landing, H.landing + 3, 1.8, 5.2, 'floating', HID);
box('landing trunk', -10.6, -9.6, H.landing, H.landing + 0.5, 8.9, 9.8, 'furniture', HID);
air('landing stool and newspaper', -8, H.landing + 0.8, 9.1, 0.6);

// HOME fragment.
box('home slab', -13, 0, H.home - 1.5, H.home, -23, -11, 'floor');
box('home back wall', -13, 0, H.home, H.home + 3.5, -23 - W, -23);
box('home west wall', -13 - W, -13, H.home, H.home + 3.5, -23, -17);
box('sofa', -7.7, -5.3, H.home, H.home + 1.4, -16.5, -15.5, 'furniture', HID); // it hovers a little
box('box TV', -7.7, -5.3, H.home, H.home + 3, -20.5, -18.6, 'furniture', HID);
box('teapoy and lamp', -7.1, -5.9, H.home, H.home + 5, -18.1, -17.1, 'furniture', HID);
box('home trunk', -12.95, -12.15, H.home, H.home + 0.6, -20.6, -19.4, 'furniture', HID);
air('home stool', -11.6, H.home + 0.5, -18.2, 0.45);
air('home phone and battery', -9.2, H.home + 1.5, -16.6, 0.45); // west of the sofa, clear of every line of sight to the TV
export const TV = [-6.5, H.home + 1.0, -19];

// Extras fragment.
box('extras slab', 8, 22, H.extras - 1.5, H.extras, -24, -10, 'floor');
box('departure board wall', 9, 21, H.extras, H.extras + 5, -24 - W, -24);
box('departure board', 11, 19, H.extras + 1.2, H.extras + 4, -24, -23.85, 'sign');
box('bench W', 10.5, 12.5, H.extras, H.extras + 1.4, -21, -20, 'furniture', HID);
box('bench E', 17.5, 19.5, H.extras, H.extras + 1.6, -21, -20, 'furniture', HID);
box('track', 17.5, 23.5, H.extras, H.extras + 0.3, -13.4, -11.6, 'furniture', HID);
air('station clock', 15, H.extras + 5.7, -23.1, 0.8);

// Rooftop fragment.
box('rooftop slab', 8, 22, H.rooftop - 1.5, H.rooftop, -1, 11, 'floor');
box('front desk', 13.4, 16.6, H.rooftop, H.rooftop + 1.1, 7, 8, 'furniture', HID);
air('plan cards', 15, H.rooftop + 2.05, 7.5, 1.3);
cyl('water tank 1', 20, 9, 0.85, H.rooftop, H.rooftop + 1.6, 'furniture', HID);
cyl('water tank 2', 18.2, 9.4, 0.65, H.rooftop + 0.3, H.rooftop + 1.8, 'furniture', HID); // this one floats
cyl('umbrella pole', 17.4, 6.4, 0.05, H.rooftop, H.rooftop + 2.7, 'furniture', HID);
cyl('umbrella canopy', 17.4, 6.4, 1.4, H.rooftop + 1.9, H.rooftop + 3, 'furniture', HID);
box('clothes line', 9, 21, H.rooftop + 1.0, H.rooftop + 2.5, 9.7, 10.3, 'floating', HID);
box('parapet S', 8, 22, H.rooftop, H.rooftop + 0.9, 11, 11 + 0.2);
box('parapet E', 22, 22.2, H.rooftop, H.rooftop + 0.9, -1, 11);
box('parapet W', 7.8, 8, H.rooftop, H.rooftop + 0.9, -1, 11);
export const DESK = [15, H.rooftop + 0.8, 7.5];

// Floating objects. Radius includes the object's whole drift range.
sph('kite', 6.5, 16, 4.5, 1.4, 'kite');
sph('paper birds', -6, 18.5, 9, 1.2, 'birds');
sph('newspaper page', 4, 20.5, -2, 1.0, 'paper');
sph('ceiling fan', -6, H.landing + 4.4, 3, 1.0, 'fan');
sph('floating box TV', 2, 30, -8, 1.2, 'tv');
sph('phone and battery', -10, 30.5, -6, 1.0, 'phone');
sph('petals', 12, 33, -5, 1.0, 'petals');
sph('kite 2', 20, 37, 4, 1.4, 'kite');

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

// Each fragment above the Landing hangs from a rough cone of rock, and loose stone drifts off every broken edge.
// The stone stays below floor level and well away from the stair shaft.
export const UNDERSIDES = RECT_FLOORS.slice(1).map((f) => ({ x: (f.x0 + f.x1) / 2, z: (f.z0 + f.z1) / 2, r: 5.4, y0: f.y - 6.5, y1: f.y - 1.5 }));
for (const [i, u] of UNDERSIDES.entries()) cyl(`rock under fragment ${i + 1}`, u.x, u.z, u.r, u.y0, u.y1, 'floor', HID);
export const DEBRIS = [];
{
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const f of RECT_FLOORS) for (let i = 0; i < 10; i++) {
    const r = 0.25 + rnd() * 0.55, side = Math.floor(rnd() * 4), u = rnd(), out = 0.7 + r + rnd() * 3.2;
    const x = side < 2 ? f.x0 + (f.x1 - f.x0) * u : side === 2 ? f.x0 - out : f.x1 + out;
    const z = side === 0 ? f.z0 - out : side === 1 ? f.z1 + out : f.z0 + (f.z1 - f.z0) * u;
    const y = f.y - 0.7 - r - rnd() * 3, ph = rnd() * 6.28;
    if (Math.hypot(x - STAIR.cx, z - STAIR.cz) < 7) continue;
    DEBRIS.push({ x, y, z, r, ph });
    air(`loose stone ${DEBRIS.length}`, x, y, z, r + 0.2);
  }
}

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
