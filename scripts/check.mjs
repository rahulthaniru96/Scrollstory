// Build-time rail check (world-v2-design.md, section 4). Exits 1 on any failure, so `npm run build` stops.
import { buildRail } from '../src/rail.js';
import { smoothDamp } from '../src/spring.js';
import { clearanceAt, floorAt, EYE, DOORS, BRIDGES, COLLIDERS, distTo } from '../src/world.js';

const rail = buildRail();
const fails = [];
const fail = (msg) => fails.push(msg);

// 1. Clearance and eye height, every 0.1 m of rail.
const perMove = new Map(rail.moves.map((m) => [m, { minMargin: Infinity, minDist: Infinity, who: '', eyeErr: 0 }]));
const STEP = 0.1, EYE_TOL = 0.1;
let pScan = 0; // progress that matches the current length, found by walking p forward
const worst = { margin: Infinity };
for (let L = 0; L <= rail.length; L += STEP) {
  while (pScan < rail.total && rail.lengthAt(pScan) < L) pScan += 0.25;
  const m = rail.moveAt(pScan), rec = perMove.get(m);
  const p = rail.posAt(L);
  const c = clearanceAt(p);
  if (c.margin < rec.minMargin) Object.assign(rec, { minMargin: c.margin, minDist: c.dist, who: c.name });
  if (c.margin < worst.margin) Object.assign(worst, { margin: c.margin, dist: c.dist, who: c.name, move: m.name });
  if (c.margin < 0) fail(`clearance: ${c.dist.toFixed(2)} m from "${c.name}" in "${m.name}" at (${p.map((v) => v.toFixed(2))})`);
  const eyeErr = Math.abs(p[1] - floorAt(...p) - EYE);
  rec.eyeErr = Math.max(rec.eyeErr, eyeErr);
  if (m.free ? p[1] - floorAt(...p) < EYE - EYE_TOL : eyeErr > EYE_TOL) fail(`eye height: ${(p[1] - floorAt(...p)).toFixed(2)} m above the floor in "${m.name}" at (${p.map((v) => v.toFixed(2))})`);
}

// 2. Doorways and bridges: at least 1.2 m wide, and the camera goes through the middle.
const samples = [];
for (let L = 0; L <= rail.length; L += 0.05) samples.push(rail.posAt(L));
for (const d of DOORS) {
  const width = Math.hypot(d.a[0] - d.b[0], d.a[1] - d.b[1]);
  const mid = [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2];
  const off = Math.min(...samples.filter((q) => q[1] < 4).map((q) => Math.hypot(q[0] - mid[0], q[2] - mid[1])));
  if (width < 1.2) fail(`door "${d.name}" is ${width.toFixed(2)} m wide`);
  if (off > 0.2) fail(`door "${d.name}": the camera passes ${off.toFixed(2)} m from the middle`);
}
for (const b of BRIDGES) {
  if (b.width < 1.2) fail(`"${b.name}" is ${b.width} m wide`);
  const on = samples.filter((q) => {
    const along = b.axis === 'z' ? q[2] : q[0];
    return along > Math.min(b.a, b.b) && along < Math.max(b.a, b.b) && Math.abs(q[1] - (b.ya + b.yb) / 2 - EYE) < 2.5;
  });
  const off = Math.max(...on.map((q) => Math.abs((b.axis === 'z' ? q[0] : q[2]) - b.c)));
  if (!on.length) fail(`"${b.name}": the camera never crosses it`);
  else if (off > 0.15) fail(`"${b.name}": the camera strays ${off.toFixed(2)} m from the middle`);
}

// 3. Floating objects stay clear of everything solid too (they must not sit inside a wall).
for (const f of COLLIDERS.filter((c) => c.kind === 'floating')) {
  for (const c of COLLIDERS) {
    if (c === f || c.kind === 'floating' || c.t === 'pts') continue;
    if (distTo(c, [f.x, f.y, f.z]) < f.r * 0.5) fail(`floating "${f.name}" overlaps "${c.name}"`);
  }
}

// 4. No whips or jumps in the authored path: metres and degrees per vh of scroll.
const LIMIT = { m: 0.3, pitch: 2.5, yaw: { room: 3.5, stair: 6, cloud: 6 } };
for (const m of rail.moves) Object.assign(perMove.get(m), { m: 0, yaw: 0, pitch: 0 });
for (let p = 0; p < rail.total; p += 0.5) {
  const rec = perMove.get(rail.moveAt(p));
  const a = rail.pos(p), b = rail.pos(p + 0.5);
  rec.m = Math.max(rec.m, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.5);
  rec.yaw = Math.max(rec.yaw, Math.abs(rail.yaw(p + 0.5) - rail.yaw(p)) / 0.5);
  rec.pitch = Math.max(rec.pitch, Math.abs(rail.pitch(p + 0.5) - rail.pitch(p)) / 0.5);
}
for (const [m, r] of perMove) {
  if (r.m > LIMIT.m) fail(`"${m.name}" moves ${r.m.toFixed(2)} m per vh (limit ${LIMIT.m})`);
  if (r.yaw > LIMIT.yaw[m.zone]) fail(`"${m.name}" turns ${r.yaw.toFixed(1)} deg per vh (limit ${LIMIT.yaw[m.zone]})`);
  if (r.pitch > LIMIT.pitch) fail(`"${m.name}" tilts ${r.pitch.toFixed(1)} deg per vh (limit ${LIMIT.pitch})`);
}

// 5. Reverse is exact: the pose is a pure function of progress.
for (let p = rail.total; p >= 0; p -= 15.5) {
  const a = rail.pos(p), b = rail.pos(p);
  if (a.some((v, i) => v !== b[i]) || rail.yaw(p) !== rail.yaw(p)) fail(`pose is not repeatable at p=${p}`);
}

// 6. Same feel at any frame rate: the spring's step response at 60 and 144 frames per second.
const t90 = (hz) => { let x = 0, v = 0, t = 0; while (x < 0.9 && t < 5) { [x, v] = smoothDamp(x, 1, v, 0.35, 1e9, 1 / hz); t += 1 / hz; } return t; };
if (Math.abs(t90(60) - t90(144)) > 0.02) fail(`spring differs by frame rate: 90% at ${t90(60).toFixed(3)} s (60 Hz) vs ${t90(144).toFixed(3)} s (144 Hz)`);

// Report.
const pad = (s, n) => String(s).padEnd(n);
console.log(`\nRail: ${rail.length.toFixed(1)} m over ${rail.total} vh, ${rail.moves.length} moves\n`);
console.log(pad('move', 32) + pad('vh', 7) + pad('clear m', 9) + pad('nearest', 26) + pad('m/vh', 7) + pad('yaw/vh', 8) + 'pitch/vh');
for (const [m, r] of perMove) {
  console.log(
    pad(m.name, 32) + pad((m.s1 - m.s0).toFixed(0), 7) + pad(r.minDist === Infinity ? '-' : r.minDist.toFixed(2), 9) +
    pad(r.who, 26) + pad(r.m.toFixed(3), 7) + pad(r.yaw.toFixed(2), 8) + r.pitch.toFixed(2),
  );
}
console.log(`\nTightest spot: ${worst.dist.toFixed(2)} m from "${worst.who}" in "${worst.move}"`);
if (fails.length) {
  const seen = new Map();
  for (const f of fails) { const k = f.replace(/ at \(.*\)$/, '').replace(/[\d.]+ m (from|above)/, 'N m $1'); seen.set(k, [(seen.get(k)?.[0] || 0) + 1, seen.get(k)?.[1] || f]); }
  console.error(`\nFAILED: ${fails.length} problem samples`);
  for (const [, [count, first]] of seen) console.error(`  x${count}  ${first}`);
  process.exit(1);
}
console.log('\nOK: clearance, eye height, doors, bridges, floating objects, speed limits, reverse.\n');
