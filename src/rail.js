// The camera rail: one position spline measured by length, plus a separate look track.
// pose(p) is a pure function of scroll progress p (in vh), so scrolling up replays the walk exactly.
import { EYE, STAIR, PHI_END, stairPt, stairY, H, SHOPS, COUNTERS, SUN_PATCH, TV, TV_CHANNELS, DESK, CARDS } from './world.js';

export const TOTAL_VH = 3860; // whole walk, in screen-heights x 100. One constant scales everything.

const deg = (r) => (r * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;

// Monotone cubic (Fritsch-Carlson): no overshoot, flat wherever two keys share a value.
function pchip(xs, ys) {
  const n = xs.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    const t = (x - xs[lo]) / h[lo], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h[lo] * m[lo] + (-2 * t3 + 3 * t2) * ys[hi] + (t3 - t2) * h[lo] * m[hi];
  };
}

// Centripetal Catmull-Rom between p1 and p2.
function catmull(p0, p1, p2, p3, t) {
  const kd = (a, b) => Math.sqrt(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  const t0 = 0, t1 = t0 + kd(p0, p1), t2 = t1 + kd(p1, p2), t3 = t2 + kd(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const mix = (a, b, ta, tb) => a.map((v, i) => ((tb - tt) * v + (tt - ta) * b[i]) / (tb - ta));
  const a1 = mix(p0, p1, t0, t1), a2 = mix(p1, p2, t1, t2), a3 = mix(p2, p3, t2, t3);
  return mix(mix(a1, a2, t0, t2), mix(a2, a3, t1, t3), t1, t2);
}

function aim(from, to, ref) {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const yaw = deg(Math.atan2(-dx, -dz));
  return [yaw + 360 * Math.round((ref - yaw) / 360), deg(Math.atan2(dy, Math.hypot(dx, dz)))];
}

export function buildRail() {
  const pts = [], posKeys = [], lookKeys = [], moves = [], rooms = [];
  let s = 0;
  const P = (x, y, z) => {
    const l = pts[pts.length - 1];
    if (!l || Math.hypot(l[0] - x, l[1] - y, l[2] - z) > 1e-6) pts.push([x, y, z]);
    return pts.length - 1;
  };
  const g = (x, z, floor = 0) => P(x, floor + EYE, z); // a point at eye height above a floor
  const key = (at, i) => posKeys.push({ s: at, i });
  const look = (at, yaw, pitch) => lookKeys.push({ s: at, yaw, pitch });
  const last = () => pts.length - 1;
  const here = () => pts[last()];
  // A straight run: pin a point 1 m in from each end so the spline cannot bow sideways into a wall.
  const line = (x, z, floor = 0) => {
    const a = here(), b = [x, floor + EYE, z], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (L > 3) for (const f of [1 / L, 1 - 1 / L]) P(...a.map((v, j) => v + (b[j] - v) * f));
    return P(...b);
  };
  const move = (name, zone, ds, fn) => { const a = s; fn(a, ds); s = a + ds; moves.push({ name, zone, s0: a, s1: s }); };
  const hold = (name, ds, room, zone = 'room') => {
    const a = s; key(a + ds, last()); s = a + ds;
    const gaze = lookKeys[lookKeys.length - 1]; look(s, gaze.yaw, gaze.pitch); // the eyes rest during a hold too
    moves.push({ name, zone, s0: a, s1: s, hold: true });
    if (room) rooms.push({ name: room, s: a + ds * 0.4 });
  };

  // ---- 00 Arrival ----
  // Open high and far back, then crane down to eye height while pushing in to the gate.
  key(0, P(0, 4.6, 34)); look(0, 0, 1);
  hold('Arrival hold', 50, '00 Arrival');
  move('Gate push in', 'room', 110, (a, d) => { look(a, 0, 1); key(a + d, line(0, 20)); look(a + d, 0, 4); });
  move('Tilt up to the plaque', 'room', 60, (a, d) => { key(a + d, g(0, 19.5)); look(a + d * 0.9, 0, 42); });
  // ---- 01 Lobby ----
  move('Lobby push in', 'room', 140, (a, d) => { key(a + d, line(0, 9.2)); look(a + d * 0.35, 0, 2); look(a + d, 0, 0); });
  move('Tilt up the stairwell', 'room', 70, (a, d) => { key(a + d, last()); look(a + d * 0.9, 0, 55); });
  hold('Lobby hold', 50, '01 Lobby');
  move('Look, then turn left', 'room', 130, (a, d) => {
    look(a, 0, 55);
    look(a + d * 0.35, 90, 0); // eyes are already west before the body is a third of the way
    key(a + d * 0.55, line(-6.15, 9.2));
    look(a + d * 0.6, 95, 0);
    g(-7.7, 9.05); g(-8.7, 8.35); key(a + d, g(-9, 7));
    look(a + d * 0.92, 180, -3); look(a + d, 180, -3);
  });
  // ---- 02 Gallery ----
  const LAST_CARD = 180 + 24;
  move('Gallery, walking backwards', 'room', 220, (a, d) => {
    key(a + d, line(-9, -10));
    for (const c of CARDS) { // each demo site gets a stop 3 m past it, with the eyes on it while it opens
      const u = (10 - c.z) / 17;
      if (u < 1) look(a + d * u, 180 + (c.x > -9 ? 17 : -17), -2);
    }
    look(a + d, LAST_CARD, -2); // the last one opens on the Gallery hold
  });
  hold('Gallery hold', 50, '02 Gallery');
  // ---- 03 Worth it: the why. Four counters on the south room's back wall, one beat at each ----
  move('Corner into Worth it', 'room', 110, (a, d) => {
    look(a, LAST_CARD, -2);
    g(-9.3, -13.5); key(a + d, g(-10.2, -17.4));
    look(a + d * 0.45, 250, 0); look(a + d * 0.85, 293, 0); look(a + d, 293, 0);
  });
  hold('Worth it hold', 50, '03 Worth it');
  for (const [i, c] of COUNTERS.entries()) {
    move(`To ${c.name}`, 'room', i ? 45 : 70, (a, d) => { key(a + d, line(c.x, -18.2)); look(a + d * 0.8, 360, 0); look(a + d, 360, 0); });
    hold(`Counter: ${c.name}`, 55);
  }
  // ---- 04 Workshop: the price. Round the corner, down the row from its end, a beat at each shop, then step back to choose ----
  const LANE = 7.6;
  move('Corner into Workshop', 'room', 120, (a, d) => {
    g(7.3, -17.4); key(a + d, g(LANE, -14.6));
    look(a + d * 0.45, 300, 0);
    const [y, p] = aim(here(), [11.35, EYE, -5], 200); look(a + d * 0.9, y, p); look(a + d, y, p);
  });
  hold('Workshop hold', 40, '04 Workshop');
  for (const [i, sh] of SHOPS.entries()) {
    move(`To ${sh.name}`, 'room', i ? 55 : 50, (a, d) => { key(a + d, line(LANE, sh.z)); look(a + d * 0.8, 270, 0); look(a + d, 270, 0); });
    hold(`Shop: ${sh.name}`, 60);
  }
  move('Step back to choose', 'room', 50, (a, d) => { key(a + d, g(7.5, 2.8)); look(a + d * 0.85, 250, 0); look(a + d, 250, 0); });
  hold('Choose one', 90);
  move('Back to the stair foot', 'room', 150, (a, d) => {
    look(a + d * 0.35, 152, 0); // the eyes go to the lobby's east door early, so its membrane is in view for the whole approach
    g(7.8, 5.2); g(7.9, 7.2); g(7.3, 8.7);
    look(a + d * 0.55, 113, 0);
    key(a + d * 0.8, g(6.15, 9.2));
    look(a + d * 0.8, 90, 0);
    g(4.9, 8.25); g(3.8, 7.62); key(a + d, g(2.49, 7.3));
    look(a + d, 60, 0);
  });
  // ---- The stairs ----
  const well = [STAIR.cx, EYE, STAIR.cz];
  move('Look up', 'stair', 60, (a, d) => { key(a + d, last()); const [y] = aim(here(), well, 40); look(a + d * 0.9, y, 50); });
  rooms.push({ name: 'The stairs', s: s - 20 });
  const stairYaw = (phi) => 90 - deg(phi) - 50 * Math.min(1, Math.max(0, (PHI_END - phi) / (Math.PI / 3))); // the look-ahead fades out over the last 60 deg
  const TOP = stairY(PHI_END), pitchByY = pchip([0, TOP - 1.5, TOP], [13, 13, 30]); // at the top the eyes lift toward the hat
  move('Step onto the stair', 'stair', 25, (a, d) => {
    const q = stairPt(STAIR.phi0, STAIR.rWalk, EYE); key(a + d, P(...q)); look(a + d, stairYaw(STAIR.phi0), 13);
  });
  move("Up the Hatter's stair", 'stair', 150, (a, d) => {
    const step = Math.PI / 6;
    for (let phi = STAIR.phi0 + step; ; phi += step) {
      if (phi > PHI_END - 0.05) phi = PHI_END;
      const at = a + (d * stairY(phi)) / TOP;
      key(at, P(...stairPt(phi, STAIR.rWalk, EYE))); look(at, stairYaw(phi), pitchByY(stairY(phi)));
      if (phi === PHI_END) break;
    }
  });
  // The portal: straight up through the hat to the Landing. It is a real stretch of rail, so scrolling back goes down it again.
  move('Through the hat', 'cloud', 110, (a, d) => {
    const q = stairPt(PHI_END, STAIR.rWalk, EYE), yaw = stairYaw(PHI_END);
    P(q[0], q[1] + 0.6, q[2]); P(q[0], 12, q[2]); P(q[0], 20, q[2]); P(q[0], H.landing + EYE - 0.6, q[2]); key(a + d, P(q[0], H.landing + EYE, q[2]));
    look(a + d * 0.35, yaw, 65); look(a + d * 0.6, yaw, 65); look(a + d, yaw, 0);
  });
  moves[moves.length - 1].portal = true; // the camera leaves one floor and comes up through another: no eye-height rule in between
  const NORTH = 360 * Math.round((90 - deg(PHI_END)) / 360); // "north" after 5.2 turns of unwrapped yaw
  // ---- Landing ----
  const Hpose = [-5.5, H.landing + EYE, -0.8];
  move('Arrive at the Landing', 'stair', 90, (a, d) => {
    g(-2.3, 4.3, H.landing); g(-2.46, 2.79, H.landing); g(-3.3, 0.5, H.landing); key(a + d, P(...Hpose));
    const [y, p] = aim(Hpose, SUN_PATCH, NORTH + 140); look(a + d * 0.75, y, p); look(a + d, y, p);
  });
  move('Landing hold', 'room', 120, (a, d) => {
    const dx = SUN_PATCH[0] - Hpose[0], dz = SUN_PATCH[2] - Hpose[2], n = Math.hypot(dx, dz);
    key(a + d, P(Hpose[0] + (0.15 * dx) / n, Hpose[1], Hpose[2] + (0.15 * dz) / n)); // a 0.15 m creep, not a stop
    const [y, p] = aim(here(), SUN_PATCH, NORTH + 140); look(a + d, y, p);
  });
  moves[moves.length - 1].hold = true;
  rooms.push({ name: 'Landing', s: s - 80 });
  move('Look, then turn to the bridge', 'room', 100, (a, d) => {
    g(-6.2, -2, H.landing); key(a + d, g(-6.5, -3, H.landing));
    look(a + d * 0.85, NORTH, 4); look(a + d, NORTH, 4);
  });
  // ---- HOME ----
  move('Bridge to HOME', 'room', 130, (a, d) => {
    P(-6.5, H.landing + 0.5 + EYE, -5); P(-6.5, H.landing + 1.5 + EYE, -9); g(-6.5, -11, H.home);
    key(a + d, g(-6.5, -13, H.home));
    const [y, p] = aim(here(), TV, NORTH); look(a + d, y, p);
  });
  move('HOME partial orbit', 'room', 90, (a, d) => {
    for (const al of [20, 40, 60]) {
      key(a + (d * al) / 60, g(TV[0] + 6 * Math.sin(rad(al)), TV[2] + 6 * Math.cos(rad(al)), H.home));
      const [y, p] = aim(here(), TV, NORTH + 30); look(a + (d * al) / 60, y, p);
    }
  });
  hold('HOME hold', 120, 'HOME'); // the TV's four channels share this and the orbit
  // ---- 05 Extras ----
  const boardL = [11, H.extras + 2.6, -24], boardR = [19, H.extras + 2.6, -24];
  move('Bridge to Extras', 'room', 150, (a, d) => {
    g(0, -16, H.home); P(2, H.home + 0.5 + EYE, -16); P(6, H.home + 1.5 + EYE, -16); g(8, -16, H.extras);
    key(a + d, g(15, -15.5, H.extras));
    look(a + d * 0.5, NORTH - 90, 5); look(a + d * 0.65, NORTH - 90, 5);
    const [y, p] = aim(here(), boardL, NORTH); look(a + d, y, p);
  });
  move('Pan across the board', 'room', 90, (a, d) => {
    key(a + d, last());
    const [y, p] = aim(here(), boardR, NORTH - 30); look(a + d * 0.75, y, p);
    look(a + d, y + 12, p); // settle back a little, like eyes resting on the last row
  });
  hold('Extras hold', 50, '05 Extras');
  // ---- 06 Rooftop ----
  move('Bridge up to the Rooftop', 'room', 180, (a, d) => {
    line(15, -10, H.extras);
    P(15, H.extras + 1 + EYE, -7); P(15, H.extras + 2 + EYE, -4); g(15, -1, H.rooftop);
    key(a + d, g(15, 2.5, H.rooftop));
    look(a + d * 0.6, NORTH - 180, 6); look(a + d, NORTH - 180, 0);
  });
  move('Tilt up to the sky', 'room', 80, (a, d) => { key(a + d, last()); look(a + d * 0.9, NORTH - 180, 45); });
  move('Settle on the desk', 'room', 60, (a, d) => {
    key(a + d, g(15, 3.2, H.rooftop)); const [y, p] = aim(here(), DESK, NORTH - 180); look(a + d, y, p);
  });
  rooms.push({ name: '06 Rooftop', s: s - 1 });

  for (const m of moves) if (m.name === 'Arrival hold' || m.name === 'Gate push in' || m.portal) m.free = true; // crane: above eye height on purpose

  // ---- scale to the total, then build the lookups ----
  const k = TOTAL_VH / s;
  for (const a of [posKeys, lookKeys, rooms]) for (const o of a) o.s *= k;
  for (const m of moves) { m.s0 *= k; m.s1 *= k; }

  const n = pts.length, SUB = 24, table = [];
  const at = (i) => pts[Math.min(n - 1, Math.max(0, i))];
  const ghost = (a, b) => a.map((v, j) => 2 * v - b[j]);
  let len = 0, prev = pts[0];
  const Lpt = [0];
  table.push({ L: 0, p: pts[0] });
  for (let i = 0; i < n - 1; i++) {
    const p0 = i === 0 ? ghost(pts[0], pts[1]) : at(i - 1), p3 = i === n - 2 ? ghost(pts[n - 1], pts[n - 2]) : at(i + 2);
    for (let j = 1; j <= SUB; j++) {
      const q = catmull(p0, pts[i], pts[i + 1], p3, j / SUB);
      len += Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2]);
      table.push({ L: len, p: q }); prev = q;
    }
    Lpt.push(len);
  }
  const posAt = (L) => {
    if (L <= 0) return table[0].p;
    if (L >= len) return table[table.length - 1].p;
    let lo = 0, hi = table.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (table[mid].L <= L) lo = mid; else hi = mid; }
    const a = table[lo], b = table[hi], t = (L - a.L) / (b.L - a.L || 1);
    return a.p.map((v, j) => v + (b.p[j] - v) * t);
  };
  const uniq = (keys) => keys.sort((a, b) => a.s - b.s).filter((q, i, arr) => i === 0 || q.s - arr[i - 1].s > 1e-6);
  const pk = uniq(posKeys), lk = uniq(lookKeys);
  const LofS = pchip(pk.map((q) => q.s), pk.map((q) => Lpt[q.i]));
  const yawOfS = pchip(lk.map((q) => q.s), lk.map((q) => q.yaw));
  const pitchOfS = pchip(lk.map((q) => q.s), lk.map((q) => q.pitch));

  // Stops: where one scroll gesture comes to rest. Every hold, the ends of the tilts, one per demo site in the Gallery, and one per TV channel.
  const END_STOPS = ['Tilt up to the plaque', 'Look up', "Up the Hatter's stair", 'Look, then turn to the bridge', 'Pan across the board', 'Bridge up to the Rooftop', 'Tilt up to the sky'];
  const stops = [0, TOTAL_VH];
  for (const m of moves) {
    const d = m.s1 - m.s0;
    if (m.name === 'Arrival hold' || m.name === 'HOME hold') continue; // the walk opens on the first; the TV's channels cover the second
    if (m.name === 'HOME partial orbit') { const t1 = moves[moves.indexOf(m) + 1].s1; for (let c = 0; c < TV_CHANNELS; c++) stops.push(m.s0 + ((t1 - m.s0) * (c + 0.5)) / TV_CHANNELS); }
    else if (m.name === 'Gallery, walking backwards') { for (const c of CARDS) if (c.z > -7) stops.push(m.s0 + (d * (10 - c.z)) / 17); }
    else if (m.hold) stops.push(m.s0 + d * 0.6);
    else if (END_STOPS.includes(m.name)) stops.push(m.s1 - 1);
  }
  stops.sort((a, b) => a - b);

  const clampP = (p) => Math.min(TOTAL_VH, Math.max(0, p));
  return {
    total: TOTAL_VH,
    length: len,
    moves,
    rooms,
    stops,
    north: NORTH,
    posAt, // position at a rail length (m)
    lengthAt: (p) => LofS(clampP(p)),
    pos: (p) => posAt(LofS(clampP(p))),
    yaw: (p) => yawOfS(clampP(p)), // degrees, + = turn left; 0 = facing north (-z)
    pitch: (p) => pitchOfS(clampP(p)),
    moveAt: (p) => moves.find((m) => p >= m.s0 && p < m.s1) || moves[moves.length - 1],
  };
}
