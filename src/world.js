// World data and distance math. Pure JS: shared by the browser scene, the rail and the Node clearance check.
// Units: metres. +x = east (right from the street), +y = up, +z = south (toward the street).

export const EYE = 1.6;
export const LEAN_SHIFT = 0.15; // how far the cursor may slide the camera sideways
export const CLEAR = 0.6 + LEAN_SHIFT; // the 0.6 m rule plus that slide
export const CLEAR_CEILING = 0.4;

export const STAIR = { cx: 0, cz: 4.5, rWalk: 2.25, rIn: 1.2, rOut: 3.0, rise: 5, phi0: 0.2, turns: 1.2 }; // a short stair: the top hat at its head carries the camera the rest of the way up
export const PHI_END = STAIR.phi0 + STAIR.turns * 2 * Math.PI;
export const STAIR_EXIT_WEDGE = 1.75; // radians of Landing floor past the last tread
export const stairY = (phi) => (STAIR.rise * (phi - STAIR.phi0)) / (2 * Math.PI);
export const stairPt = (phi, r = STAIR.rWalk, dy = 0) => [
  STAIR.cx - r * Math.sin(phi),
  stairY(phi) + dy,
  STAIR.cz + r * Math.cos(phi),
];

// Heights (floor level of each piece).
export const H = { roof: 9, wing: 4.5, cloud0: 13, cloud1: 22, landing: 26, home: 28, drafting: 30.5, extras: 31.5, signal: 33, greenhouse: 35, rooftop: 38 }; // the Sky Quarter keeps rising to the end

// Sky and fog colour by camera height (motion spec, section 7). The cloud sea sits between 13 and 22 m.
export const SKY_BY_HEIGHT = [[0, 0xf3cfa4], [9, 0xf2c08e], [13, 0xf6d9b8], [15, 0xf3eee6], [17.5, 0xf7d9d3], [20, 0xfbe0a8], [23, 0xf2a766], [31, 0xee9f7c], [36, 0xc79bb5], [40, 0xb58db8]]; // the top is the rooftop's purple twilight

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
for (const c of COUNTERS) box(`counter ${c.name}`, c.x - 0.9, c.x + 0.9, 0, 1.1, -22, -20.9, 'furniture', HID); // a terrazzo plinth, drawn by rooms.js
for (const c of COUNTERS) air(`counter float ${c.name}`, c.x, 1.95, c.z, 0.7); // nothing rests on a counter
air('coins rising', COUNTERS[3].x, 3.3, COUNTERS[3].z, 0.6);

// 04 Workshop: three shop counters on the east wall, facing west.
export const SHOPS = [-6, 0, 6].map((u, i) => ({ u, x: 11.35, z: u - 5, name: ['Starter', 'Signature', 'Signature + Admin'][i], color: [0xe8a89a, 0x2f5fa8, 0x3f6e68][i] }));
export const SHOP_ROOM = { turn: -Math.PI / 2, x: -9.85, z: -5 };
for (const s of SHOPS) {
  box(`shop ${s.name}`, 10.6, 12, 0, 1.0, s.z - 2, s.z + 2, 'furniture', HID); // a fluted timber counter, drawn by rooms.js
  box(`shop sign ${s.name}`, 11.6, 12, 3.55, 4.2, s.z - 2.4, s.z + 2.4, 'sign', { color: s.color });
}
for (const s of SHOPS) air(`shop float ${s.name}`, 11.15, 2.2, s.z, 1.1); // each shop's device hovers over its counter, and floats forward on its beat
for (const z of [-8, -2, 4]) box(`shop divider z${z}`, 11.3, 12, 0, 4.2, z - 0.15, z + 0.15, 'wall', { color: 0xc47a5a }); // shallow, so all three shops show from the corner

// 02 Gallery: a row of framed screens on the west wall, 2.5 m apart, one per site (gallery.js). The walk runs down x = -9 and stops square in front of each.
export const CARDS = [5.5, 3, 0.5, -2, -4.5, -7, -9.5].map((z) => ({ x: -11.8, y: 2.0, z }));
for (const [i, c] of CARDS.entries()) sph(`card ${i + 1}`, c.x, c.y, c.z, 0.35, 'card');

// ---------- the dreamy layer's solid parts (drawn by dress.js, checked here) ----------
// Windows are portals: each shows a different sky. `n` is the way the window faces (into the room).
export const WINDOWS = [
  // (the Gallery's west wall carries the site screens instead of windows)
  ...SHOPS.map((s, i) => ({ x: 12, y: 1.1, z: s.z, n: '-x', w: 2.6, h: 2.3, sky: ['rose', 'day', 'night'][i], shaft: 38 })),
  ...COUNTERS.map((c, i) => ({ x: c.x, y: 1.3, z: -22, n: '+z', w: 1.7, h: 2.5, sky: ['night', 'dawn', 'day', 'gold'][i], shaft: 36 })),
  ...[2.2, 5.4].flatMap((z) => [
    { x: -6, y: 5.0, z, n: '+x', w: 1.6, h: 3.2, sky: 'gold', shaft: 40 },
    { x: 6, y: 5.0, z, n: '-x', w: 1.6, h: 3.2, sky: 'rose' },
  ]),
  // Walls the turns face, so no turn ends on a blank wall.
  // (the west wall at z 9.2, where the Lobby turn ends, carries the Gallery's sign: gallery.js)
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
export const LONE_DOOR = { x: 4.0, z: -9.5, w: 1.1, h: 2.3 }; // east of the Renovation pavilion
box('door in the water', LONE_DOOR.x - 0.7, LONE_DOOR.x + 0.7, 0, 2.5, LONE_DOOR.z - 0.2, LONE_DOOR.z + 0.2, 'furniture', { hidden: true });
// Lamps drift over the courtyard water. The whole court is theirs; no camera lane crosses it.
export const LAMP_ZONE = { x0: 2.9, x1: 4.8, z0: -14.6, z1: -1.4, y0: 0.5, y1: 3.0 }; // the east strip: the pavilion has the rest
box('courtyard lamps', LAMP_ZONE.x0, LAMP_ZONE.x1, 0, 5, LAMP_ZONE.z0, LAMP_ZONE.z1, 'floating', { hidden: true });
// Ledger pages leave the Income counter as paper birds, out through the arcade and up into the sky.
export const BIRD_PATH = [[6, 1.5, -21.2], [5.4, 2.6, -19.6], [4.6, 3.0, -17.6], [4.5, 3.0, -15.4], [3.5, 3.4, -12], [0, 5.5, -8], [-3, 8.5, -6], [-2, 12, 0]];
for (const [i, q] of BIRD_PATH.entries()) C.push({ t: 'sph', name: `paper birds path ${i}`, kind: 'floating', x: q[0], y: q[1], z: q[2], r: 0.4, hidden: true });
// Long-rod ceiling fans and a cloud that has drifted indoors.
export const FANS = [[-9, 3.6, -4], [9, 3.6, -4], [0, 3.6, -18.8]];
for (const [i, q] of FANS.entries()) C.push({ t: 'sph', name: `wing fan ${i}`, kind: 'floating', x: q[0], y: q[1], z: q[2], r: 0.85, hidden: true });
export const INDOOR_CLOUD = [4.4, 6.6, 9.6];
C.push({ t: 'sph', name: 'cloud indoors', kind: 'floating', x: INDOOR_CLOUD[0], y: INDOOR_CLOUD[1], z: INDOOR_CLOUD[2], r: 1.6, hidden: true });

// Each room is a level with its own accent and a light tint, all close to the one palette. main.js blends between them.
export const THEME = {
  '00 Arrival': { accent: '#F2D98B', tint: 0xfff2dc },
  '01 Lobby': { accent: '#F7C98A', tint: 0xfff4e4 },
  '02 Gallery': { accent: '#CDBBFF', tint: 0xf0eaff },
  '03 Renovation': { accent: '#B9A8F0', tint: 0xf1ecff },
  '04 Worth it': { accent: '#F2C46A', tint: 0xffecc6 },
  '05 Workshop': { accent: '#F3A592', tint: 0xffe6dc },
  'The stairs': { accent: '#EE8E78', tint: 0xf6f1e6 },
  Landing: { accent: '#FFD9A0', tint: 0xffe9c8 },
  HOME: { accent: '#BFD4FF', tint: 0xe6ecff },
  '06 Drafting Room': { accent: '#9FB8F2', tint: 0xeaf0ff },
  '07 Signal Cabin': { accent: '#8FCB9B', tint: 0xe8f4ea },
  '08 Extras': { accent: '#A6E0D2', tint: 0xe4f6f0 },
  '09 Greenhouse': { accent: '#B5D98A', tint: 0xeff8e2 },
  '10 Rooftop': { accent: '#F6B8D0', tint: 0xf5def0 },
};
export const FOUNDER = { name: 'Rahul Thaniru', role: 'Founder, Scrollstory Studio', phone: '+91 99490 88659', at: [-2.2, 1.55, 8.0] }; // his brass plaque stands in the Lobby
cyl('founder plaque', FOUNDER.at[0], FOUNDER.at[2], 0.3, 0, 2.1, 'furniture', HID);

// The wall of milestones: framed pictures hung just outside the stair's outer rail, up the lobby part of the climb.
// Facts only, from D:\\rahul-context\\projects. A milestone with no known fact has no line.
export const MILESTONES = [
  ['The first website', ''],
  ['Rishi Care Hospital', 'A hospital website with an admin dashboard for patients, inventory and billing.'],
  ['Bhumi Insurance', 'An insurance website with an admin CRM behind it.'],
  ['G-Thriftz', 'An online thrift store you walk into by scrolling.'],
  ['Five demo sites', 'A café, a gym, a preschool, a coaching centre and a real estate project. All fictional.'],
  ['Scrollstory Studio', 'This building.'],
].map(([title, line], i) => { const phi = STAIR.phi0 + 1.2 + i * 1.05; return { title, line, phi, at: stairPt(phi, 3.75, 1.75) }; });
for (const m of MILESTONES) air(`milestone: ${m.title}`, ...m.at, 0.5);
air('pocket watch in the well', STAIR.cx, 4.3, STAIR.cz, 0.75);
cyl('teacup tower', STAIR.cx, STAIR.cz, 0.35, 0, 1.9, 'furniture', HID);
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
box('How we work books in the sun beam', -10.3, -7.4, H.landing + 0.05, H.landing + 1.35, 1.5, 5.5, 'floating', HID);
box('landing trunk', -10.6, -9.6, H.landing, H.landing + 0.5, 8.9, 9.8, 'furniture', HID);
air('landing stool and newspaper', -8, H.landing + 0.8, 9.1, 0.6);

// HOME fragment.
box('home slab', -13, 0, H.home - 1.5, H.home, -23, -11, 'floor');
box('home back wall', -13, -2.4, H.home, H.home + 3.5, -23 - W, -23); // open at its east end, where the rope bridge leaves
box('home west wall', -13 - W, -13, H.home, H.home + 3.5, -23, -17);
box('sofa', -7.7, -5.3, H.home, H.home + 1.4, -16.5, -15.5, 'furniture', HID); // it hovers a little
box('box TV', -7.7, -5.3, H.home, H.home + 3, -20.5, -18.6, 'furniture', HID);
box('teapoy and lamp', -7.1, -5.9, H.home, H.home + 5, -18.1, -17.1, 'furniture', HID);
box('home trunk', -12.95, -12.15, H.home, H.home + 0.6, -20.6, -19.4, 'furniture', HID);
air('home stool', -11.6, H.home + 0.5, -18.2, 0.45);
air('home phone and battery', -9.2, H.home + 1.5, -16.6, 0.45); // west of the sofa, clear of every line of sight to the TV
export const TV_CHANNELS = 4; // three beats of the story, then "Your story?"; // one stop of the walk for each
export const TV = [-6.5, H.home + 1.0, -19];

// Extras fragment.
// The four add-ons are from the build plan, section 8. The one-line descriptions are plain wording of what each is; Rahul to confirm.
export const EXTRAS = [
  { name: 'QR CODES', title: 'QR codes', line: 'Scan to open your site, your menu or your WhatsApp.' },
  { name: 'PHOTOS', title: 'Photos', line: 'Pictures of your place and your work, for the site.' },
  { name: 'SOCIAL POSTS', title: 'Social posts', line: 'Posts for your pages that match the site.' },
  { name: 'MENU / PRICE CARD', title: 'Menu or price card', line: 'Your menu or price list, designed to match.' },
];
export const BOARD = { x: 15, y: H.extras + 2.6, z: -23.84, w: 7.8, h: 2.56, rowY: (r) => H.extras + 3.17 - 0.488 * r }; // the departure board's face, and the height of each row on it
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
sph('kite 2', 25, 42.5, 10, 1.4, 'kite');

// ---------- The Sky Quarter: four new rooms on the upper floor, round a floating clock tower (sky-quarter-layouts, plans 01 to 03) ----------
// Each fragment is a slab of stone in the sky. The walk goes HOME, Drafting Room, Signal Cabin, Extras + Map, Greenhouse, Rooftop, and keeps rising.
export const DRAFT = { x0: -9, x1: 3, z0: -42, z1: -31, y: H.drafting };
export const SIGNAL = { x0: 24.5, x1: 33, z0: -36, z1: -18, y: H.signal };
export const GREEN = { x0: 26, x1: 35, z0: -4, z1: 6, y: H.greenhouse };
for (const [n, f] of [['drafting slab', DRAFT], ['signal slab', SIGNAL], ['greenhouse slab', GREEN]]) box(n, f.x0, f.x1, f.y - 1.5, f.y, f.z0, f.z1, 'floor');
export const HUB = { x: 5, z: -10, r: 1.8, y0: 22, y1: 47, face: 41.5 }; // the clock tower: its hands are how far the walk has come
cyl('clock tower', HUB.x, HUB.z, HUB.r + 0.4, HUB.y0, HUB.y1, 'wall', HID);
// Drafting Room: a giant wireframe page stands across the room, and the walk goes through it.
export const PAGE = { x: -1.2, z: -36.2, w: 4.6, h: 2.875, y: H.drafting + 0.4 }; // 1280 x 800 of a desktop page, the shape of a laptop screen
box('drafting back wall', DRAFT.x0, DRAFT.x1, H.drafting, H.drafting + 3.4, DRAFT.z0 - W, DRAFT.z0, 'wall', HID);
box('drafting west wall', DRAFT.x0 - W, DRAFT.x0, H.drafting, H.drafting + 3.4, DRAFT.z0, -36.5, 'wall', HID);
for (const sx of [-1, 1]) box(`page frame post ${sx < 0 ? 'W' : 'E'}`, PAGE.x + sx * (PAGE.w / 2 + 0.05) - 0.15, PAGE.x + sx * (PAGE.w / 2 + 0.05) + 0.15, H.drafting, PAGE.y + PAGE.h + 0.2, PAGE.z - 0.15, PAGE.z + 0.15, 'furniture', HID);
box('page frame top', PAGE.x - PAGE.w / 2 - 0.2, PAGE.x + PAGE.w / 2 + 0.2, PAGE.y + PAGE.h, PAGE.y + PAGE.h + 0.2, PAGE.z - 0.15, PAGE.z + 0.15, 'sign', HID);
export const DRAFT_TABLES = [{ x: -6.6, z: -38.4, ry: 0.35 }, { x: 1.0, z: -40.6, ry: -0.3 }];
for (const [i, t] of DRAFT_TABLES.entries()) { box(`drafting table ${i + 1}`, t.x - 0.85, t.x + 0.85, H.drafting, H.drafting + 1.05, t.z - 0.6, t.z + 0.6, 'furniture', HID); air(`blueprints over table ${i + 1}`, t.x, H.drafting + 2.1, t.z, 0.8); }
// Signal Cabin: an old railway signal box. Levers on the east wall, the admin panel on the north wall, open to the west.
export const CABIN = { x0: 26.5, x1: 32.5, z0: -31.5, z1: -24.5, h: 3.6 };
box('cabin north wall', CABIN.x0, CABIN.x1 + W, H.signal, H.signal + CABIN.h, CABIN.z0 - W, CABIN.z0, 'wall', HID);
box('cabin east wall', CABIN.x1, CABIN.x1 + W, H.signal, H.signal + CABIN.h, CABIN.z0, CABIN.z1 + W, 'wall', HID);
box('cabin south wall', CABIN.x0 + 1, CABIN.x1, H.signal, H.signal + CABIN.h, CABIN.z1, CABIN.z1 + W, 'wall', HID);
box('cabin roof', CABIN.x0 - 0.4, CABIN.x1 + 0.6, H.signal + CABIN.h, H.signal + CABIN.h + 0.25, CABIN.z0 - 0.6, CABIN.z1 + 0.6, 'ceiling', HID);
box('cabin corner post', CABIN.x0 - 0.12, CABIN.x0 + 0.12, H.signal, H.signal + CABIN.h, CABIN.z0 - 0.12, CABIN.z0 + 0.12, 'pillar', HID);
export const LEVERS = ['ENQUIRY', 'BOOKING', 'STOCK', 'BILLING'].map((name, i) => ({ name, z: -29.6 + i * 1.05 }));
box('lever frame', CABIN.x1 - 1.05, CABIN.x1, H.signal, H.signal + 1.15, -30.4, -25.6, 'furniture', HID);
box('cabin desk', 28.2, 30.6, H.signal, H.signal + 0.9, CABIN.z1 - 0.75, CABIN.z1, 'furniture', HID);
// Extras grows a map room: a brass relief map on a table, south of the board.
export const MAP = { x: 11.1, z: -13.6, w: 3.0, d: 2.4 };
box('map table', MAP.x - MAP.w / 2, MAP.x + MAP.w / 2, H.extras, H.extras + 0.95, MAP.z - MAP.d / 2, MAP.z + MAP.d / 2, 'furniture', HID);
air('pins and QR over the map', MAP.x, H.extras + 2.0, MAP.z, 0.9);
// Greenhouse: a deco glasshouse. Five potted plants, one per demo site, and the gardener's tools of a care plan.
box('greenhouse north glass', GREEN.x0, GREEN.x1, H.greenhouse, H.greenhouse + 4.4, GREEN.z0 - 0.15, GREEN.z0, 'glass', HID);
box('greenhouse east glass', GREEN.x1, GREEN.x1 + 0.15, H.greenhouse, H.greenhouse + 4.4, GREEN.z0, GREEN.z1, 'glass', HID);
box('greenhouse south glass', GREEN.x0, GREEN.x1, H.greenhouse, H.greenhouse + 4.4, GREEN.z1, GREEN.z1 + 0.15, 'glass', HID);
box('plant staging', 33.1, 34.9, H.greenhouse, H.greenhouse + 1.3, -3.2, 5.2, 'furniture', HID);
air('plants on the staging', 34, H.greenhouse + 2.3, 1, 1.1);
box('seed vault', 29.3, 31.1, H.greenhouse, H.greenhouse + 2.0, GREEN.z0, GREEN.z0 + 0.7, 'furniture', HID);
cyl('ledger lectern', 32.1, -2.9, 0.4, H.greenhouse, H.greenhouse + 1.2, 'furniture', HID);
air('watering can', 32.2, H.greenhouse + 2.4, -1.6, 0.5);
// Ground floor: the Renovation, a glass pavilion in the water courtyard. The fictional demo cafe's old site and its new one, split by a line that sweeps as you walk.
export const RENO = { x0: -5.2, x1: 1.2, z0: -13.4, z1: -6, h: 3.6, walk: -9.3 };
box('renovation mural wall', -4.9, 0.4, 0, RENO.h - 0.2, RENO.z0, RENO.z0 + 0.3, 'wall', HID);
box('renovation glass W1', RENO.x0, RENO.x0 + 0.1, 0, RENO.h, RENO.z0, -10.6, 'glass', HID);
box('renovation glass W2', RENO.x0, RENO.x0 + 0.1, 0, RENO.h, -7.9, RENO.z1, 'glass', HID);
box('renovation glass S', RENO.x0, RENO.x1, 0, RENO.h, RENO.z1 - 0.1, RENO.z1, 'glass', HID);
box('renovation counter', -3.45, -1.35, 0, 1.1, -12.15, -11.45, 'furniture', HID);
cyl('renovation plant', -4.35, -12.2, 0.4, 0, 1.6, 'furniture', HID);
air('renovation menu', -0.25, 2.0, -12.65, 0.55);
box('renovation roof', RENO.x0 - 0.2, RENO.x1 + 0.2, RENO.h, RENO.h + 0.15, RENO.z0 - 0.2, RENO.z1 + 0.2, 'ceiling', HID);

// Bridges and rides: ramps from `a` to `b` ([x, z]), with the floor rising from `ya` to `yb`. Each journey between rooms is a different one.
export const BRIDGES = [
  { name: 'bridge to HOME', a: [-6.5, -3], b: [-6.5, -11], ya: H.landing, yb: H.home, width: 1.6, ride: 'doors' }, // floating door frames
  { name: 'rope bridge', a: [-1.2, -23], b: [-1.2, -31], ya: H.home, yb: H.drafting, width: 1.6, ride: 'rope' },
  { name: 'funicular', a: [3, -33], b: [24.5, -33], ya: H.drafting, yb: H.signal, width: 1.6, ride: 'car' },
  { name: 'sky canal', a: [14, -10.4], b: [26.0, -2.6], ya: H.extras, yb: H.greenhouse, width: 1.6, ride: 'boat' },
];

// Doorways the camera passes: [x, z] of each jamb.
export const DOORS = [
  { name: 'gate', a: [-1.6, 18], b: [1.6, 18] },
  { name: 'lobby front door', a: [-1.2, 12.15], b: [1.2, 12.15] },
  { name: 'lobby west door', a: [-6.15, 8], b: [-6.15, 10.4] },
  { name: 'lobby east door', a: [6.15, 8], b: [6.15, 10.4] },
  { name: 'renovation door', a: [RENO.x0 + 0.05, -10.6], b: [RENO.x0 + 0.05, -7.9] },
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
  ...[DRAFT, SIGNAL, GREEN].map((f) => ({ y: f.y, x0: f.x0, x1: f.x1, z0: f.z0, z1: f.z1 })),
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
    if (Math.hypot(x - HUB.x, z - HUB.z) < HUB.r + 1.6 + r) continue; // clear of the clock tower
    if (RECT_FLOORS.some((g) => g !== f && x > g.x0 - r - 1 && x < g.x1 + r + 1 && z > g.z0 - r - 1 && z < g.z1 + r + 1 && Math.abs(y - g.y) < 2.5 + r)) continue; // and of the other fragments
    if (BRIDGES.some((b) => { const [u, off] = onBridge(b, x, z); return u > -0.2 && u < 1.2 && Math.abs(off) < 3.5; })) continue; // and off every ride
    DEBRIS.push({ x, y, z, r, ph });
    air(`loose stone ${DEBRIS.length}`, x, y, z, r + 0.2);
  }
}

// Where (x, z) sits on a bridge: u is 0 at `a` and 1 at `b`, off is the signed distance from its middle line.
export function onBridge(b, x, z) {
  const dx = b.b[0] - b.a[0], dz = b.b[1] - b.a[1], L2 = dx * dx + dz * dz, L = Math.sqrt(L2);
  return [((x - b.a[0]) * dx + (z - b.a[1]) * dz) / L2, ((x - b.a[0]) * dz - (z - b.a[1]) * dx) / L];
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
      if (past > STAIR_EXIT_WEDGE && past < 2 * Math.PI - 0.05) continue; // the step-off line itself counts, even when rounding puts it a hair before
    }
    take(f.y);
  }
  for (const b of BRIDGES) {
    const [u, off] = onBridge(b, x, z);
    if (u >= 0 && u <= 1 && Math.abs(off) <= b.width / 2) take(b.ya + (b.yb - b.ya) * u);
  }
  if (rho >= STAIR.rIn - 0.1 && rho <= STAIR.rOut + 0.1) {
    for (let k = -1; k <= 7; k++) {
      const phi = base + 2 * Math.PI * k;
      if (phi >= STAIR.phi0 && phi <= PHI_END) take(stairY(phi));
    }
  }
  return best;
}
