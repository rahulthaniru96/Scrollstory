// The rooms: props modelled in Blender (blender/components.py) and what they do. Nothing here rests on a table:
// things hover, turn, come apart and drift, slowly. Their space is declared in world.js so the rail check covers it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { holoEdges, holoFill } from './holo.js';
import { EXTRAS, BOARD, SHOPS, COUNTERS, SHOP_ROOM, COUNTER_ROOM, LONE_DOOR, FANS, COLLIDERS, DEBRIS, UNDERSIDES, STAIR, H, WINDOW } from './world.js';

const V3 = THREE.Vector3, X = new V3(1, 0, 0), Y = new V3(0, 1, 0), Z = new V3(0, 0, 1);
const css = (c) => '#' + c.toString(16).padStart(6, '0');
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

// Rahul's story, from portfolio-brief.md ("The story"), cut into lines. Each line is a channel on the box TV.
// The rooftop desk's front carries a neon sign the visitor writes: their business name, lit, for as long as the page is open. Nothing is stored.
const sign = { draw: () => {} };
export const deskSign = (text) => sign.draw(text);
// Sitting on the HOME sofa: main.js reads the screen's place to fly the camera there, and clicks the floating channel tiles.
export const seat = { screen: null, normal: null, tiles: [] };
export const STORY = [
  "I've loved building websites for a long time.",
  'So I looked for clients, and built what they actually need.',
  'A website should be a tool that brings a business income.',
  'Not plain templates. Interactive visuals, built around how people understand things.',
  'And the systems behind them.',
  'Our goal is to help businesses go digital.',
];
// The TV tells it in three beats. `short` is what the screen says (seven words at most, Rahul's own); `full` is the caption under it.
export const TV_BEATS = [
  { short: "I've loved building websites.", full: `${STORY[0]} ${STORY[1]}` },
  { short: 'A tool that brings a business income.', full: `${STORY[2]} ${STORY[3]} ${STORY[4]}` },
  { short: 'Help businesses go digital.', full: STORY[5] },
];

export function furnish({ scene, camera, tick, mesh: mesh0, basic, lit, glow: glow0, glowTexture, lowQuality }) {
  // A room can be built in its own frame and then turned into place: while `root` is that room's group, everything made lands in it.
  let root = scene;
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = root) => mesh0(geo, mat, x, y, z, parent);
  const glow = (color, size, x, y, z, parent = root, opacity = 0.9) => glow0(color, size, x, y, z, parent, opacity);
  const room = (r) => { root = new THREE.Group(); root.position.set(r.x, 0, r.z); root.rotation.y = r.turn; scene.add(root); };
  const loader = new GLTFLoader(), cache = {}, pending = [];
  // Plain XHR, not the loader's fetch: fetch cannot read file:// pages, and scripts/shot.sh captures the built page that way.
  const get = (url) => new Promise((res, rej) => { const r = new XMLHttpRequest(); r.open('GET', url); r.responseType = 'arraybuffer'; r.onload = () => loader.parse(r.response, '', res, rej); r.onerror = rej; r.send(); });
  const load = (name) => (cache[name] ||= get(`${import.meta.env.BASE_URL}models/${name}.glb`).then((g) => {
    g.scene.traverse((o) => { if (o.material) o.material.metalness = Math.min(o.material.metalness, 0.2); }); // no environment map here, so full metal would go black
    return g.scene;
  }));
  // A prop is a group placed now and filled when its model arrives. `then` gets the model, for parts that move.
  const prop = (name, x, y, z, { ry = 0, s = 1, parent = root, then } = {}) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); parent.add(g);
    pending.push(load(name).then((src) => { const m = src.clone(true); g.add(m); then?.(m, g); }).catch((e) => console.error(`model ${name}:`, e)));
    return g;
  };
  const part = (m, name) => { const o = m.getObjectByName(name); if (!o) throw new Error(`no part "${name}"`); return o; };
  let hovers = 0;
  // Everything hovers on the air clock, so the cursor's breeze speeds it up without making it jump.
  const hover = (g, amp = 0.06, rate = 0.5, tilt = 0.025, turn = 0) => {
    const y0 = g.position.y, r0 = g.rotation.y, ph = hovers++ * 1.9;
    tick.push((t, dt, env) => {
      g.position.y = y0 + Math.sin(env.air * rate + ph) * amp;
      g.rotation.x = Math.sin(env.air * rate * 0.7 + ph) * tilt; g.rotation.z = Math.cos(env.air * rate * 0.6 + ph * 1.3) * tilt;
      if (turn) g.rotation.y = r0 + Math.sin(env.air * 0.2 + ph) * turn;
    });
    return g;
  };
  const q = new THREE.Quaternion();
  const swing = (node, axis, angle) => { const q0 = node.quaternion.clone(); tick.push((t, dt, env) => { node.quaternion.copy(q0).multiply(q.setFromAxisAngle(axis, angle(env, t))); }); };
  // Parts of one model drifting apart and back together. `dirs` are in the model's own metres.
  const apart = (m, dirs) => {
    const parts = Object.entries(dirs).map(([name, d], i) => [part(m, name), part(m, name).position.clone(), new V3(...d), i]);
    tick.push((t, dt, env) => { for (const [o, p0, d, i] of parts) o.position.copy(p0).addScaledVector(d, 0.5 + 0.5 * Math.sin(env.air * 0.3 + i * 1.4)); });
  };
  const fan = (x, y, z, s = 1) => prop('ceiling_fan', x, y, z, { s, then: (m) => { const b = part(m, 'blades'); tick.push((t, dt, env) => { b.rotation.y += dt * 1.1 * env.wind; }); } });
  const at = (name) => COLLIDERS.find((c) => c.name === name);
  const both = { side: THREE.DoubleSide };

  // Dashboard panels for the admin shop: bars, a ring, a list.
  const panels = [0, 1, 2].map((kind) => basic(0xffffff, { ...both, map: canvasTex(128, 96, (x, w, h) => {
    x.fillStyle = '#1e2a26'; x.fillRect(0, 0, w, h); x.fillStyle = '#f2d98b';
    if (kind === 0) for (const [i, v] of [30, 52, 40, 66, 58].entries()) x.fillRect(14 + i * 21, h - 12 - v, 14, v);
    if (kind === 1) { x.lineWidth = 12; x.strokeStyle = '#3f6e68'; x.beginPath(); x.arc(w / 2, h / 2, 28, 0, 6.3); x.stroke(); x.strokeStyle = '#f2d98b'; x.beginPath(); x.arc(w / 2, h / 2, 28, -1.6, 2.4); x.stroke(); }
    if (kind === 2) for (let i = 0; i < 5; i++) { x.fillStyle = i === 1 ? '#e8a89a' : '#8c8a82'; x.fillRect(12, 12 + i * 16, 104 - (i % 3) * 18, 7); }
  }) }));
  const keyAndLock = (x, y, z, s) => hover(prop('key_and_lock', x, y, z, { s, ry: -Math.PI / 2, then: (m) => {
    const key = part(m, 'key'); // the key circles the lock and never goes in
    tick.push((t, dt, env) => { const a = env.air * 0.5; key.position.set(Math.cos(a) * 0.27, 0.15 + Math.sin(a * 2) * 0.03, Math.sin(a) * 0.27); key.quaternion.setFromAxisAngle(Y, -a + 1.2); });
  } }), 0.05, 0.6, 0.04);

  // ================= ground floor =================
  // ---------- 04 Workshop: each shop's device hovers over its counter, and its pages come out of the screen ----------
  {
    room(SHOP_ROOM);
    const LOCAL = SHOPS.map((s) => ({ ...s, x: s.u })), [a, b, c] = LOCAL, z = -21.2;
    // On its beat a shop lights up and its device floats forward. env.shop holds each shop's weight, from the scroll.
    const front = LOCAL.map((s, i) => {
      const g = new THREE.Group(); root.add(g);
      prop('hanging_lamp', s.x, 3.05, -20.85); glow(0xffc978, 1.5, s.x, 3.05, -20.85);
      const halo = glow(0xfff0cf, 2.4, s.x, 2.0, z + 0.2, g, 0.3);
      tick.push((t, dt, env) => { const w = env.shop[i]; g.position.z = w * 0.45; halo.material.opacity = 0.2 + w * 0.3; halo.scale.setScalar(2.4 + w * 0.8); });
      return g;
    });
    // What a plan buys is pages, so each shop's pages come out of its screen on its beat, one by one, and fan out above it:
    // Starter's 3, Signature's 7. Each is labelled with the page it is. Off the beat they file back into the screen.
    const pageTex = (title, k, n, col) => canvasTex(192, 256, (x, w, h) => {
      x.fillStyle = '#f7efe2'; x.fillRect(0, 0, w, h); x.fillStyle = '#1e2a26'; x.fillRect(0, 0, w, 22);
      x.fillStyle = css(col); x.fillRect(14, 34, w - 28, 70);
      x.fillStyle = '#1e2a26'; x.font = '500 30px Fraunces, Georgia, serif'; x.fillText(title, 14, 140);
      x.fillStyle = '#8c8a82'; for (let r = 0; r < 4; r++) x.fillRect(14, 158 + r * 14, w - 28 - (r % 2) * 40, 6);
      x.font = '500 13px "Martian Mono", monospace'; x.textAlign = 'right'; x.fillText(`${k + 1} / ${n}`, w - 14, h - 14);
    });
    // The models' screens are a flat colour with no UVs, so the page goes on a sheet laid just in front of the glass.
    // The glass's facing is the face direction with the most area; a sheet goes on both sides of it, each reading the right way round.
    const screenOf = (m, map, up = new V3(0, 1, 0)) => m.traverse((o) => {
      if (!o.isMesh || o.material.name !== 'screen') return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, P = g.attributes.position, A = new V3(), B = new V3(), C = new V3(), area = new Map();
      for (let k = 0; k < P.count; k += 3) {
        A.fromBufferAttribute(P, k); B.fromBufferAttribute(P, k + 1); C.fromBufferAttribute(P, k + 2);
        const f = B.sub(A).cross(C.sub(A)), a = f.length(); if (!a) continue; f.divideScalar(a);
        const key = [f.x, f.y, f.z].map((v) => Math.round(Math.abs(v) * 20)).join(); const e = area.get(key) || { a: 0, n: f.clone() }; e.a += a; area.set(key, e);
      }
      const n = [...area.values()].sort((p, q) => q.a - p.a)[0].n;
      const u = new V3().crossVectors(Math.abs(n.dot(up)) > 0.9 ? new V3(0, 0, -1) : up, n).normalize(), v = new V3().crossVectors(n, u);
      let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      for (let k = 0; k < P.count; k++) { A.fromBufferAttribute(P, k); [u, v, n].forEach((ax, j) => { const d = A.dot(ax); lo[j] = Math.min(lo[j], d); hi[j] = Math.max(hi[j], d); }); }
      const mid = (j) => (lo[j] + hi[j]) / 2, geo = new THREE.PlaneGeometry((hi[0] - lo[0]) * 0.92, (hi[1] - lo[1]) * 0.92), mat = basic(0xffffff, { map });
      for (const sgn of [1, -1]) {
        const sheet = new THREE.Mesh(geo, mat), nn = n.clone().multiplyScalar(sgn);
        sheet.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u.clone().multiplyScalar(sgn), v, nn));
        sheet.position.copy(u).multiplyScalar(mid(0)).addScaledVector(v, mid(1)).addScaledVector(n, sgn > 0 ? hi[2] + 0.003 : lo[2] - 0.003); o.add(sheet);
      }
    });
    const fanOut = (s, i, titles, cy, faceY) => {
      const n = titles.length, geo = new THREE.PlaneGeometry(0.3, 0.4);
      const items = titles.map((t, k) => {
        const m = mesh(geo, basic(0xffffff, { ...both, map: pageTex(t, k, n, s.color), transparent: true }), s.x, cy, z, front[i]);
        const th = n === 1 ? 0 : -1.1 + (2.2 * k) / (n - 1); // a fan from left to right, over the device
        return { m, k, home: new V3(s.x + Math.sin(th) * 1.0, cy + 0.15 + Math.cos(th) * 0.6, z + 0.3 - Math.abs(th) * 0.12), th };
      });
      const src = new V3(s.x, faceY, z + 0.05);
      tick.push((t, dt, env) => {
        const w = env.shop[i];
        for (const it of items) {
          const u = THREE.MathUtils.clamp(w * (n + 1) - it.k - 0.6, 0, 1), e = u * u * (3 - 2 * u); // page k leaves once the beat passes k/(n+1)
          it.m.position.lerpVectors(src, it.home, e); it.m.position.y += Math.sin(env.air * 0.6 + it.k) * 0.03 * e;
          it.m.rotation.set(0, -it.th * 0.35 * e, -it.th * 0.25 * e + (1 - e) * 0.3);
          it.m.scale.setScalar(0.25 + 0.75 * e); it.m.material.opacity = Math.min(1, u * 3); it.m.visible = u > 0;
        }
      });
    };
    // Starter: a phone standing in the air, far taller than a phone.
    hover(prop('phone', a.x, 1.78, z, { s: 8, parent: front[0], then: (m) => { m.rotation.x = Math.PI / 2; for (const n of ['battery', 'charger']) part(m, n).visible = false; screenOf(m, pageTex('Home', 0, 3, a.color)); } }), 0.07, 0.5, 0.03, 0.35);
    fanOut(a, 0, ['Home', 'About', 'Contact'], 1.95, 1.9);
    // Signature: a laptop, its seven pages fanning out of the screen.
    hover(prop('laptop', b.x, 1.4, z, { s: 3.4, parent: front[1], then: (m) => { m.rotation.x = 0.12; screenOf(m, canvasTex(320, 200, (x, w, h) => { // the Home page, landscape
      x.fillStyle = '#f7efe2'; x.fillRect(0, 0, w, h); x.fillStyle = '#1e2a26'; x.fillRect(0, 0, w, 20); x.fillStyle = css(b.color); x.fillRect(16, 32, w - 32, 70);
      x.fillStyle = '#1e2a26'; x.font = '500 30px Fraunces, Georgia, serif'; x.fillText('Home', 16, 136); x.fillStyle = '#8c8a82'; for (let r = 0; r < 3; r++) x.fillRect(16, 152 + r * 13, w - 32 - r * 50, 6);
    })); } }), 0.06, 0.45, 0.03, 0.25);
    fanOut(b, 1, ['Home', 'Our story', 'Menu', 'Gallery', 'Reviews', 'Enquiry', 'Legal'], 1.95, 1.75);
    // Signature + Admin: the same laptop, showing its dashboard, with the dashboards circling it and a lock above.
    hover(prop('laptop', c.x, 1.4, z, { s: 3.4, parent: front[2], then: (m) => { m.rotation.x = 0.12; screenOf(m, panels[0].map); } }), 0.06, 0.45, 0.03, 0.25);
    const ring = panels.map((mat) => mesh(new THREE.PlaneGeometry(0.44, 0.33), mat));
    tick.push((t, dt, env) => { for (const [i, m] of ring.entries()) { const an = env.air * 0.25 + (i * 2 * Math.PI) / 3; m.position.set(c.x + Math.cos(an) * 0.78, 2.1 + Math.sin(an) * 0.2, z + 0.05 + Math.sin(an) * 0.32); m.rotation.y = Math.sin(an) * 0.4; } });
    keyAndLock(c.x, 2.62, z - 0.1, 1.3);
    root = scene;
  }

  // ---------- furniture: the Worth it plinths and the Workshop counters (their solid boxes are in world.js) ----------
  {
    root = scene;
    // Worth it: a terrazzo plinth with a rounded front, a brass rim, a lit glass top and its number on a brass plate.
    const terrazzo = canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = '#e9e2d4'; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 900; k++) { x.fillStyle = ['#b9a98f', '#8f9a86', '#c98b6a', '#6f7a72', '#f7efe2'][k % 5]; const s = 1 + ((k * 7) % 5); x.fillRect((k * 97) % w, (k * 61 + k * k) % h, s, s); }
    });
    terrazzo.wrapS = terrazzo.wrapT = THREE.RepeatWrapping; terrazzo.repeat.set(2, 1.4);
    const stone = lit(0xffffff, { map: terrazzo, roughness: 0.55 }), brass = lit(0xc9a24a, { roughness: 0.3, metalness: 0.6 });
    for (const [i, c] of COUNTERS.entries()) {
      const g = new THREE.Group(); g.position.set(c.x, 0, -21.6); scene.add(g);
      mesh(new THREE.BoxGeometry(1.8, 1.0, 0.8), stone, 0, 0.5, 0, g); // the back half
      const front = mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.0, 40, 1, false, -Math.PI / 2, Math.PI), stone, 0, 0.5, 0.0, g); front.scale.z = 0.78; // the rounded front, to z -20.9
      mesh(new THREE.BoxGeometry(1.84, 0.06, 0.84), brass, 0, 1.03, 0, g);
      const rim = mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.06, 40, 1, true, -Math.PI / 2, Math.PI), brass, 0, 1.03, 0, g); rim.scale.z = 0.79; rim.material.side = THREE.DoubleSide;
      const top = mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.04, 40, 1, false, -Math.PI / 2, Math.PI), basic(0xfff3d6, { transparent: true, opacity: 0.75 }), 0, 1.075, 0, g); top.scale.z = 0.75; // lit from inside
      mesh(new THREE.BoxGeometry(1.76, 0.04, 0.78), basic(0xfff3d6, { transparent: true, opacity: 0.75 }), 0, 1.075, 0, g);
      mesh(new THREE.BoxGeometry(1.86, 0.08, 0.86), lit(0x3a3330), 0, 0.04, 0, g); // a dark plinth line at the floor
      const plate = mesh(new THREE.PlaneGeometry(0.62, 0.16), basic(0xffffff, { map: canvasTex(310, 80, (x) => { x.fillStyle = '#c9a24a'; x.fillRect(0, 0, 310, 80); x.fillStyle = '#3a2810'; x.font = '500 34px "Martian Mono", monospace'; x.textAlign = 'center'; x.fillText(`0${i + 1} · ${c.name.toUpperCase()}`, 155, 52); }) }), 0, 0.72, 0.705, g);
      plate.rotation.x = -0.05;
    }
    // Workshop: a fluted timber counter along each shop, a pale stone top, a brass foot rail and a line of the shop's colour under the top.
    const timber = lit(0x8a5a3c, { roughness: 0.6 }), flute = new THREE.CylinderGeometry(0.045, 0.045, 0.82, 10), top = lit(0xeee6d8, { roughness: 0.4 });
    for (const s of SHOPS) {
      mesh(new THREE.BoxGeometry(1.3, 0.86, 4.0), timber, 11.3, 0.47, s.z);
      const n = 30, fl = new THREE.InstancedMesh(flute, timber, n), o = new THREE.Object3D();
      for (let k = 0; k < n; k++) { o.position.set(10.66, 0.47, s.z - 1.94 + (k * 3.88) / (n - 1)); o.updateMatrix(); fl.setMatrixAt(k, o.matrix); }
      scene.add(fl);
      mesh(new THREE.BoxGeometry(1.5, 0.08, 4.12), top, 11.25, 0.94, s.z);
      mesh(new THREE.BoxGeometry(0.02, 0.025, 3.9), basic(s.color), 10.52, 0.87, s.z); // the colour line under the top's edge
      const rail = mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.9, 10), lit(0xc9a24a, { roughness: 0.3, metalness: 0.6 }), 10.45, 0.16, s.z); rail.rotation.x = Math.PI / 2;
      mesh(new THREE.BoxGeometry(1.32, 0.06, 4.02), lit(0x2b2f2e), 11.3, 0.03, s.z); // the kick
    }
  }
  // ---------- 03 Worth it: one idea hovering over each counter ----------
  {
    room(COUNTER_ROOM);
    const LOCAL = COUNTERS.map((c) => ({ ...c, z: c.u })), [custom, secure, legal, income] = LOCAL, x = 11.35, WEST = -Math.PI / 2;
    for (const [i, c] of LOCAL.entries()) { const halo = glow(0xfff0cf, 2.2, x - 0.25, 1.9, c.z, root, 0.22); tick.push((t, dt, env) => { halo.material.opacity = 0.18 + env.counter[i] * 0.5; }); } // brighter on its beat
    { // Custom: a page that keeps taking itself apart and putting itself back together
      const g = new THREE.Group(); g.position.set(x, 2.0, custom.z); g.rotation.y = WEST; root.add(g);
      const blocks = [[0, 0.52, 1.0, 0.12, 0x1e2a26], [0, 0.22, 1.0, 0.4, 0xe8a89a], [-0.34, -0.2, 0.3, 0.32, 0x2f5fa8], [0, -0.2, 0.3, 0.32, 0x3f6e68], [0.34, -0.2, 0.3, 0.32, 0xf2d98b], [0, -0.5, 1.0, 0.1, 0x8c8a82]]
        .map(([bx, by, w, h, col], i) => [mesh(new THREE.BoxGeometry(w, h, 0.03), lit(col), bx, by, 0, g), bx, by, i]);
      tick.push((t, dt, env) => {
        const k = 0.5 + 0.5 * Math.sin(env.air * 0.35); // 0 = one page, 1 = loose pieces
        for (const [m, bx, by, i] of blocks) { m.position.set(bx * (1 + k * 0.5), by * (1 + k * 0.5), Math.sin(i * 2.1) * k * 0.3); m.rotation.set(Math.sin(i * 1.3) * k * 0.5, Math.cos(i * 1.7) * k * 0.6, 0); }
      });
    }
    // Secure: a safe with its door breathing open on the light inside, and a key that circles its lock.
    hover(prop('safe', x + 0.1, 1.38, secure.z, { ry: WEST, then: (m) => swing(part(m, 'door'), Y, (env) => Math.sin(env.air * 0.4) * 0.3) }), 0.05, 0.45, 0.03);
    keyAndLock(x - 0.1, 2.3, secure.z + 0.55, 1.3);
    // Legal: a balance that never settles, and a sealed deed.
    hover(prop('balance', x, 1.35, legal.z, { s: 1.8, ry: WEST, then: (m) => { const beam = part(m, 'beam'); tick.push((t, dt, env) => { beam.quaternion.setFromAxisAngle(Z, Math.sin(env.air * 0.5) * 0.14); }); } }), 0.04, 0.4, 0.02);
    const deed = mesh(new THREE.PlaneGeometry(0.42, 0.58), basic(0xffffff, { ...both, map: canvasTex(84, 116, (c, w, h) => {
      c.fillStyle = '#f7efe2'; c.fillRect(0, 0, w, h); c.fillStyle = '#8c8a82'; for (let i = 0; i < 7; i++) c.fillRect(10, 14 + i * 10, w - 20 - (i % 3) * 8, 3);
      c.fillStyle = '#9e3b2c'; c.beginPath(); c.arc(w - 22, h - 22, 10, 0, 6.3); c.fill();
    }) }), x + 0.1, 2.75, legal.z - 0.6);
    deed.rotation.y = WEST; hover(deed, 0.06, 0.5, 0.06, 0.5);
    // Income: the ledger lies open in the air, coins climb out of it, and its pages leave as paper birds (dress.js).
    hover(prop('ledger', x, 1.5, income.z, { s: 1.7, ry: WEST, then: (m) => { m.rotation.x = 0.45; } }), 0.05, 0.4, 0.03);
    const N = 12, coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 16), lit(0xe2b54a, { roughness: 0.45 }), N), o = new THREE.Object3D();
    coins.frustumCulled = false; root.add(coins);
    tick.push((t, dt, env) => {
      for (let i = 0; i < N; i++) {
        const u = (env.air * 0.05 + i / N) % 1, an = u * 9 + i;
        o.position.set(x + Math.cos(an) * 0.26, 1.75 + u * 2.3, income.z + Math.sin(an) * 0.26); o.rotation.set(env.air * 0.8 + i, an, 1.2);
        o.scale.setScalar(Math.min(1, u * 8, (1 - u) * 5)); o.updateMatrix(); coins.setMatrixAt(i, o.matrix);
      }
      coins.instanceMatrix.needsUpdate = true;
    });
    root = scene;
  }

  // ---------- water courtyard: a door standing alone, a fan with no ceiling, newspapers that never land ----------
  {
    const D = LONE_DOOR;
    const door = prop('old_door', D.x, 0, D.z, { ry: -0.5, then: (m) => swing(part(m, 'leaf'), Y, (env) => Math.sin(env.air * 0.3) * 0.18) });
    // what is behind the door: not a blaze of white but a night sky, with stars and a thin moon, and only a soft blue light spilling out
    mesh(new THREE.PlaneGeometry(1.1, 2.3), basic(0xffffff, { ...both, map: canvasTex(220, 460, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#141a3a'); g.addColorStop(0.7, '#2b3170'); g.addColorStop(1, '#6a5a9a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 70; k++) { x.fillStyle = `rgba(255,248,230,${0.3 + ((k * 37) % 10) / 14})`; x.fillRect((k * 53) % w, (k * 97) % (h * 0.8), 2, 2); }
      x.fillStyle = '#fff3d6'; x.beginPath(); x.arc(150, 90, 22, 0, 7); x.fill(); x.fillStyle = '#141a3a'; x.beginPath(); x.arc(160, 84, 20, 0, 7); x.fill(); // a crescent
    }) }), 0, 1.15, 0, door);
    glow(0x8fa8ff, 2.2, 0, 1.3, 0.25, door, 0.22);
    fan(-2.2, 3.5, -3.0, 1.3); // south of the Renovation pavilion's roof
    for (const [x, y, z] of [[3.7, 0.8, -12.4], [1.3, 1.3, -3.6], [-2.2, 0.6, -3.4]]) hover(prop('newspaper', x, y, z, { s: 1.5, then: (m) => { m.rotation.set(0.5, 0, 0.3); } }), 0.1, 0.35, 0.12, 1.2);
    for (const [x, y, z] of FANS) fan(x, y, z);
  }

  // ================= upper floor: memory fragments =================
  // ---------- every fragment hangs from rough rock, and loose stone drifts off its broken edges ----------
  {
    const rock = lit(0xa89c88, { flatShading: true });
    for (const u of UNDERSIDES) {
      const big = mesh(new THREE.ConeGeometry(u.r, u.y1 - u.y0, 7), rock, u.x, (u.y0 + u.y1) / 2, u.z); big.rotation.x = Math.PI;
      const small = mesh(new THREE.ConeGeometry(2.6, 3.2, 6), rock, u.x + 2.4, u.y1 - 1.6, u.z - 1.6); small.rotation.set(Math.PI, 0.5, 0);
    }
    const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), lit(0xb9ad98, { flatShading: true }), DEBRIS.length), o = new THREE.Object3D();
    stones.frustumCulled = false; scene.add(stones);
    tick.push((t, dt, env) => {
      if (env.h < 20) return; // out of sight below the cloud
      for (const [i, d] of DEBRIS.entries()) {
        o.position.set(d.x, d.y + Math.sin(env.air * 0.3 + d.ph) * 0.15, d.z); o.rotation.set(env.air * 0.04 + d.ph, d.ph * 2, env.air * 0.03);
        o.scale.set(d.r, d.r * 0.7, d.r * 0.85); o.updateMatrix(); stones.setMatrixAt(i, o.matrix);
      }
      stones.instanceMatrix.needsUpdate = true;
    });
  }

  // Crystal-pattern glass, lit from behind. The same pattern falls on the floor as the sun patch.
  const crystal = (extra) => new THREE.ShaderMaterial({
    fog: false, uniforms: { time: { value: 0 }, gain: { value: 1 } }, ...extra,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float time, gain; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec2 p = vUv * vec2(19.0, 11.0), c = fract(p) - 0.5, id = floor(p);
        float facet = smoothstep(0.5, 0.08, abs(c.x) + abs(c.y)), h = hash(id);
        vec3 col = mix(vec3(1.0, 0.8, 0.5), vec3(1.0, 0.97, 0.88), facet * (0.55 + 0.45 * h));
        col += 0.3 * pow(facet, 6.0) * (0.5 + 0.5 * sin(time * 1.3 + h * 30.0));
        gl_FragColor = vec4(col * gain, 1.0);
        #include <colorspace_fragment>
      }`,
  });

  // ---------- Landing: core memory. Sun through crystal glass, dust in the beam, the five How we work books open in it (secrets.js) ----------
  {
    const L = H.landing;
    const tiles = canvasTex(256, 256, (x) => {
      x.fillStyle = '#6f2f26'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = ['#9e4a3a', '#a5503f', '#974535'][(i * 3 + j * 5) % 3]; x.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); }
    });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(0.5, 0.5); // the shape's uv is in metres: one tile is half a metre
    const sh = new THREE.Shape(); sh.moveTo(-11, 3); sh.lineTo(4.5, 3); sh.lineTo(4.5, -10); sh.lineTo(-11, -10); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(STAIR.cx, -STAIR.cz, 3.2, 0, Math.PI * 2, true); sh.holes.push(hole);
    mesh(new THREE.ShapeGeometry(sh, 40).rotateX(-Math.PI / 2), lit(0xffffff, { map: tiles, roughness: 0.5, ...both }), 0, L + 0.012, 0);

    const glass = crystal(), win = new THREE.Group();
    win.position.set(WINDOW.x - 0.15, WINDOW.y, WINDOW.z); win.rotation.y = Math.PI / 2; scene.add(win); // local +z faces into the room
    mesh(new THREE.PlaneGeometry(3.8, 2.2), glass, 0, 0, 0, win);
    const teal = lit(0x3f6e68), cream = lit(0xf7f1e6);
    for (const i of [-1, 0, 1]) mesh(new THREE.BoxGeometry(0.07, 2.2, 0.08), teal, i * 0.95, 0, 0.05, win);
    mesh(new THREE.BoxGeometry(3.8, 0.07, 0.08), teal, 0, 0.4, 0.05, win);
    for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(0.12, 2.44, 0.1), cream, s * 1.96, 0, 0.14, win); mesh(new THREE.BoxGeometry(4.04, 0.12, 0.1), cream, 0, s * 1.16, 0.14, win); }
    glow(0xffe2a8, 8, WINDOW.x + 0.5, WINDOW.y, WINDOW.z, scene, 0.45);

    // The beam: the window's outline carried down to the tiles at 40 degrees.
    const z0 = WINDOW.z - 1.9, z1 = WINDOW.z + 1.9, yb = L + 0.9, yt = L + 3.1, xw = WINDOW.x + 0.02, k = 1 / Math.tan((40 * Math.PI) / 180);
    const xb = xw + 0.9 * k, xt = xw + 3.1 * k, yf = L + 0.03;
    const quad = (...p) => [0, 1, 2, 0, 2, 3].flatMap((i) => p[i]);
    const beam = new THREE.BufferGeometry();
    beam.setAttribute('position', new THREE.Float32BufferAttribute([
      ...quad([xw, yb, z0], [xw, yt, z0], [xt, yf, z0], [xb, yf, z0]), ...quad([xw, yb, z1], [xw, yt, z1], [xt, yf, z1], [xb, yf, z1]), ...quad([xw, yt, z0], [xw, yt, z1], [xt, yf, z1], [xt, yf, z0]),
    ], 3));
    scene.add(new THREE.Mesh(beam, basic(0xffd9a0, { transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, ...both })));
    const patch = crystal({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); patch.uniforms.gain.value = 0.42;
    mesh(new THREE.PlaneGeometry(xt - xb, z1 - z0).rotateX(-Math.PI / 2), patch, (xb + xt) / 2, yf, WINDOW.z);
    tick.push((t) => { glass.uniforms.time.value = patch.uniforms.time.value = t; });

    // Dust hanging in the beam.
    const n = lowQuality ? 80 : 200, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const h = 0.1 + Math.random() * 2.9, xa = xw + Math.max(0, 0.9 - h) * k, xz = xw + (3.1 - h) * k; // the beam's near and far face at this height
      pos.set([xa + (xz - xa) * Math.random(), L + h, z0 + Math.random() * (z1 - z0)], i * 3);
    }
    const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.05, map: glowTexture, color: 0xfff3d6, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dust);
    tick.push((t, dt, env) => { dust.position.set(Math.sin(env.air * 0.1) * 0.12, Math.sin(env.air * 0.17) * 0.08, Math.cos(env.air * 0.13) * 0.1); });

    const f = at('ceiling fan'); fan(f.x, f.y, f.z, 1.25); // a ceiling fan with no ceiling
    prop('steel_trunk', -10.1, L, 9.35);
    hover(prop('stool', -8, L + 0.28, 9.1), 0.04, 0.4, 0.03);
    hover(prop('newspaper', -8, L + 1.05, 9.1, { s: 1.3, then: (m) => { m.rotation.x = 0.4; } }), 0.05, 0.5, 0.05, 0.9);
  }

  // ---------- HOME: a 2012 living room, with the story on the box TV ----------
  {
    const y = H.home;
    const rug = canvasTex(256, 192, (x, w, h) => {
      x.fillStyle = '#8e3a3a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#f2d98b'; x.lineWidth = 5; x.strokeRect(14, 14, w - 28, h - 28);
      x.strokeStyle = '#e8a89a'; x.lineWidth = 3; x.strokeRect(26, 26, w - 52, h - 52);
      x.fillStyle = '#f2d98b'; x.beginPath(); x.moveTo(w / 2, 50); x.lineTo(w - 70, h / 2); x.lineTo(w / 2, h - 50); x.lineTo(70, h / 2); x.fill();
      x.fillStyle = '#8e3a3a'; x.beginPath(); x.moveTo(w / 2, 70); x.lineTo(w - 100, h / 2); x.lineTo(w / 2, h - 70); x.lineTo(100, h / 2); x.fill();
    });
    mesh(new THREE.PlaneGeometry(3.6, 2.7).rotateX(-Math.PI / 2), lit(0xffffff, { map: rug }), -6.5, y + 0.012, -17.4);
    hover(prop('sofa', -6.5, y + 0.22, -16, { ry: Math.PI }), 0.05, 0.4, 0.02); // faces the TV
    hover(prop('teapoy', -6.5, y + 0.14, -17.6), 0.04, 0.45, 0.015);
    hover(prop('newspaper', -6.5, y + 0.82, -17.6, { s: 1.2 }), 0.05, 0.5, 0.05, 1.0);
    prop('hanging_lamp', -6.5, y + 2.75, -17.6); glow(0xffc978, 2.2, -6.5, y + 2.75, -17.6); // it hangs from nothing
    prop('steel_trunk', -12.55, y, -20, { ry: Math.PI / 2 });
    hover(prop('stool', -11.6, y + 0.28, -18.2), 0.04, 0.4, 0.03);
    // The phone of that year: back cover off, battery out, charging on its own. Here the pieces drift apart.
    hover(prop('phone', -9.2, y + 1.5, -16.6, { s: 3, then: (m) => { m.rotation.x = 0.9; apart(m, { cover: [0, -0.04, 0], battery: [0.02, 0.05, -0.03], charger: [0.06, 0, 0.02] }); } }), 0.05, 0.5, 0.05, 0.6);

    // The TV plays the story as three moving pictures and a question. Sitting on the sofa brings the camera close to it.
    const c = document.createElement('canvas'); c.width = 800; c.height = 640;
    const x = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    x.scale(2, 2); // drawn in 400 x 320 units
    const CREAM = '#f7efe2', BUTTER = '#f2d98b', ROSE = '#e8a89a', TEAL = '#3f6e68', OXIDE = '#9e3b2c';
    const pop = (t, at) => Math.min(1, Math.max(0, (t - at) / 0.35)); // 0 to 1 over a third of a second, from `at`
    const box = (px, py, w, h, col, k = 1) => { if (k <= 0) return; x.fillStyle = col; x.globalAlpha = k; x.fillRect(px, py + (1 - k) * 8, w, h); x.globalAlpha = 1; };
    const shop = (px, py, lit, col) => { // a small shop front: awning, window, door
      box(px, py, 44, 40, '#2a343a'); box(px + 5, py + 12, 20, 16, lit ? BUTTER : '#3d4a52'); box(px + 30, py + 14, 9, 26, lit ? CREAM : '#3d4a52');
      for (let i = 0; i < 4; i++) box(px - 3 + i * 12.5, py - 6, 12.5, 9, i % 2 ? CREAM : col);
    };
    const SCENES = [
      (t) => { // a page builds itself in a browser window
        const u = t % 5;
        x.strokeStyle = CREAM; x.lineWidth = 2; x.strokeRect(70, 58, 260, 150); box(70, 58, 260, 14, CREAM);
        for (let i = 0; i < 3; i++) { x.fillStyle = [OXIDE, BUTTER, TEAL][i]; x.beginPath(); x.arc(79 + i * 9, 65, 2.5, 0, 7); x.fill(); }
        box(82, 82, 236, 8, TEAL, pop(u, 0.3)); box(82, 98, 130, 56, ROSE, pop(u, 0.9)); box(222, 100, 96, 7, CREAM, pop(u, 1.5)); box(222, 114, 70, 7, CREAM, pop(u, 1.8));
        box(222, 134, 50, 16, BUTTER, pop(u, 2.3)); for (let i = 0; i < 3; i++) box(82 + i * 80, 164, 72, 32, '#56666e', pop(u, 2.8 + i * 0.3));
        const cx = 90 + Math.min(1, u / 3.8) * 200, cy = 90 + Math.sin(u * 2) * 20 + u * 18; // the cursor that is doing the building
        x.fillStyle = CREAM; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + 9, cy + 9); x.lineTo(cx + 4, cy + 9.5); x.lineTo(cx, cy + 14); x.fill();
      },
      (t) => { // enquiries leave the website and arrive at the shop as income
        x.strokeStyle = CREAM; x.lineWidth = 2; x.strokeRect(62, 84, 96, 66); box(50, 152, 120, 6, CREAM); box(72, 94, 76, 8, TEAL); box(72, 108, 44, 30, ROSE); box(122, 124, 26, 12, BUTTER);
        shop(276, 112, true, OXIDE); box(262, 152, 76, 4, CREAM);
        for (let i = 0; i < 5; i++) { // coins along an arc
          const u = (t * 0.35 + i / 5) % 1, px = 150 + u * 142, py = 122 - Math.sin(u * Math.PI) * 58;
          x.globalAlpha = Math.sin(u * Math.PI) ** 0.5; x.fillStyle = BUTTER; x.beginPath(); x.arc(px, py, 8, 0, 7); x.fill();
          x.fillStyle = '#5a4a12'; x.font = '700 10px sans-serif'; x.textAlign = 'center'; x.fillText('\u20b9', px, py + 3.5); x.globalAlpha = 1;
        }
      },
      (t) => { // a street of shops comes online, one after another
        const u = t % 5;
        box(40, 170, 320, 3, CREAM);
        for (let i = 0; i < 5; i++) {
          const on = u > 0.5 + i * 0.7, px = 52 + i * 62;
          shop(px, 130, on, [OXIDE, TEAL, ROSE, OXIDE, TEAL][i]);
          if (on) for (let k = 0; k < 3; k++) { const a = pop(u, 0.5 + i * 0.7 + k * 0.15); x.globalAlpha = a * (1 - k * 0.25); x.strokeStyle = BUTTER; x.lineWidth = 2; x.beginPath(); x.arc(px + 22, 112, 6 + k * 7, Math.PI * 1.2, Math.PI * 1.8); x.stroke(); x.globalAlpha = 1; }
        }
      },
      (t) => { // an empty page, waiting
        x.setLineDash([6, 6]); x.strokeStyle = BUTTER; x.lineWidth = 2; x.strokeRect(100, 62, 200, 120); x.setLineDash([]);
        if (t % 1 < 0.55) box(196, 96, 3, 50, CREAM);
      },
    ];
    const draw = (ch, snow, t) => {
      if (snow) { // CRT static between channels
        for (let py = 0; py < 320; py += 8) for (let px = 0; px < 400; px += 8) { const v = (40 + Math.random() * 180) | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(px, py, 8, 8); }
        tex.needsUpdate = true; return;
      }
      const g = x.createRadialGradient(200, 160, 20, 200, 160, 260); g.addColorStop(0, '#34424a'); g.addColorStop(1, '#161b1f');
      x.fillStyle = g; x.fillRect(0, 0, 400, 320);
      x.font = '600 13px "Martian Mono", monospace'; x.fillStyle = BUTTER; x.textAlign = 'left'; x.fillText('SCROLLSTORY TV', 20, 32);
      if (ch >= 0) { x.textAlign = 'right'; x.fillText(`CH 0${ch + 1} / 0${SCENES.length}`, 380, 32); SCENES[ch](t); }
      const words = ch < 0 ? 'Scrollstory TV' : ch < TV_BEATS.length ? TV_BEATS[ch].short : 'Your story?', big = ch < 0 || ch >= TV_BEATS.length;
      x.font = `600 ${big ? 40 : 25}px Fraunces, Georgia, serif`; x.textAlign = 'center'; x.fillStyle = CREAM;
      const lines = []; let line = '';
      for (const word of words.split(' ')) { if (x.measureText(line + word).width > 350) { lines.push(line.trim()); line = ''; } line += word + ' '; }
      lines.push(line.trim());
      for (const [k, l] of lines.entries()) x.fillText(l, 200, (big ? 250 : 246) + (k - (lines.length - 1) / 2) * 30);
      x.fillStyle = 'rgba(0,0,0,0.14)'; for (let sy = 0; sy < 320; sy += 4) x.fillRect(0, sy, 400, 1);
      tex.needsUpdate = true;
    };
    const tv = hover(prop('box_tv', -6.5, y + 0.3, -19.45, { s: 2, ry: 0.45 }), 0.05, 0.35, 0.015); // turned a little toward the hold frame
    mesh(new THREE.PlaneGeometry(0.5, 0.4), basic(0xffffff, { map: tex }), -0.085, 0.36, 0.2625, tv);
    glow(0xcfe0ff, 3.6, -6.3, y + 1.0, -18.6, scene, 0.3);
    // Where the screen is and which way it faces, for the seated view (the set is turned 0.45 rad toward the hold frame).
    tv.updateMatrixWorld(true);
    seat.screen = new V3(-0.085, 0.36, 0.2625).applyMatrix4(tv.matrixWorld); seat.normal = new V3(Math.sin(0.45), 0, Math.cos(0.45)); seat.side = new V3(Math.cos(0.45), 0, -Math.sin(0.45));
    // Four channel tiles hang in the air beside the set, only while someone is seated. Clicking one changes the channel.
    const side = new V3(Math.cos(0.45), 0, -Math.sin(0.45));
    seat.tiles = Array.from({ length: TV_BEATS.length + 1 }, (_, i) => {
      const words = i < TV_BEATS.length ? TV_BEATS[i].short : 'Your story?';
      const t = canvasTex(256, 160, (x, w, h) => {
        x.fillStyle = '#1b2226'; x.fillRect(0, 0, w, h); x.strokeStyle = '#f2d98b'; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4);
        x.fillStyle = '#f2d98b'; x.font = '600 22px "Martian Mono", monospace'; x.fillText(`CH 0${i + 1}`, 16, 36);
        x.fillStyle = '#f7efe2'; x.font = '600 24px Fraunces, Georgia, serif'; let line = '', yy = 80;
        for (const word of words.split(' ')) { if (x.measureText(line + word).width > 220) { x.fillText(line, 16, yy); yy += 30; line = ''; } line += word + ' '; }
        x.fillText(line, 16, yy);
      });
      const m = mesh(new THREE.PlaneGeometry(0.34, 0.21), basic(0xffffff, { map: t, transparent: true, depthWrite: false }), 0, 0, 0, scene);
      m.position.copy(seat.screen).addScaledVector(side, 1.0).addScaledVector(seat.normal, 0.25); m.position.y += 0.36 - i * 0.25;
      m.rotation.y = 0.45; m.userData.ch = i; m.visible = false; return m;
    });
    let shown = '', last = 0, since = 0, was = -2;
    tick.push((t, dt, env) => { // the scroll picks the channel (env.tv), with a blip of static at each flip
      if (camera.position.y < H.landing - 1) return;
      const { ch, f } = env.tv, snow = ch >= 0 && f < 0.1;
      for (const m of seat.tiles) { m.visible = env.seated > 0.9; const on = m.userData.ch === ch; m.material.opacity = on ? 1 : 0.55; m.scale.setScalar(on ? 1.12 : 1); }
      if (ch !== was) { was = ch; since = t; }
      const k = snow ? 's' + Math.floor(t * 14) : 'c' + ch;
      if (shown === k && (ch < 0 || t - last < (lowQuality ? 0.1 : 0.05))) return; // moving pictures: 20 frames a second (10 on phones)
      shown = k; last = t; draw(ch, snow, t - since);
    });
  }

  // ---------- 05 Extras: a platform that broke off. The board still flips, the clock has let go of its hands ----------
  {
    const y = H.extras, W = 1024, Hh = 336, COLS = 21;
    const c = document.createElement('canvas'); c.width = W; c.height = Hh;
    const x = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ/ ';
    // The offer's rows are blank until the walk reaches it, flip in one after another, and are lit while the walk rests on it (env.extra, from the scroll).
    const draw = (u, litRow) => {
      x.fillStyle = '#15181a'; x.fillRect(0, 0, W, Hh);
      x.font = '600 20px "Martian Mono", monospace'; x.textAlign = 'left'; x.fillStyle = '#8c8a82'; x.fillText('NOW BOARDING', 32, 44); x.textAlign = 'right'; x.fillText('ASK ON WHATSAPP', W - 32, 44);
      x.font = '700 32px "Martian Mono", monospace'; x.textAlign = 'center';
      for (const [r, row] of EXTRAS[0].rows.entries()) {
        const ur = u[0] * 1.6 - r * 0.2, text = (ur < 0 ? '' : ' '.repeat((COLS - row.length) >> 1) + row).padEnd(COLS), ry = 66 + r * 64, flip = ur >= 0 && ur < 1, on = litRow === 0;
        for (let k = 0; k < COLS; k++) {
          const ch = flip && k / COLS > ur - 0.25 ? ABC[Math.floor(Math.random() * ABC.length)] : text[k]; // the letters land from the left
          x.fillStyle = on ? '#f2d98b' : '#262c30'; x.fillRect(30 + k * 46, ry, 41, 54);
          x.fillStyle = on ? '#15181a' : '#f2d98b'; x.fillText(ch, 50.5 + k * 46, ry + 38);
          x.fillStyle = '#15181a'; x.fillRect(30 + k * 46, ry + 26, 41, 2); // the split in each flap
        }
      }
      tex.needsUpdate = true;
    };
    draw(EXTRAS.map(() => -1), -1);
    mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), basic(0xffffff, { map: tex }), BOARD.x, BOARD.y, BOARD.z);
    const rowGlow = glow(0xf2d98b, 5, BOARD.x, BOARD.y, BOARD.z + 0.3, scene, 0);

    // A train of light on the yellow line: one carriage, a stopwatch at 15 in its window.
    const train = new THREE.Group(); train.position.set(15, y, -21.7); scene.add(train);
    const ICONS = [ // a stopwatch: its hand a quarter of the way round, 15 minutes
      (q) => { q.beginPath(); q.arc(64, 70, 42, 0, 7); q.stroke(); q.fillRect(56, 14, 16, 10); q.fillRect(61, 22, 6, 8); q.beginPath(); q.moveTo(64, 70); q.arc(64, 70, 34, -Math.PI / 2, 0); q.closePath(); q.globalAlpha = 0.45; q.fill(); q.globalAlpha = 1; q.font = '700 22px "Martian Mono", monospace'; q.textAlign = 'center'; q.fillText('15', 50, 98); },
    ];
    const carGeo = new THREE.BoxGeometry(1.32, 1.0, 0.8), carFill = holoFill({ opacity: 0.16 });
    const cars = EXTRAS.map((e, i) => {
      const car = new THREE.Group(); car.position.set((i - (EXTRAS.length - 1) / 2) * 1.45, 0.7, 0); train.add(car); // 1.45 m apart: the whole train fits the frame from the stop, 3.5 m away
      car.add(new THREE.Mesh(carGeo, carFill), holoEdges(carGeo, { everywhere: true, opacity: 0.9 }));
      const icon = canvasTex(128, 128, (q) => { q.fillStyle = q.strokeStyle = '#f2d98b'; q.lineWidth = 5; ICONS[i](q); });
      const win = mesh(new THREE.PlaneGeometry(0.72, 0.72), basic(0xffffff, { map: icon, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 0.02, 0.41, car);
      return { win, halo: glow(0xf2d98b, 2.6, 0, 0, 0.3, car, 0) };
    });
    train.add(mesh(new THREE.BoxGeometry(5.8, 0.03, 0.5), basic(0xbfe9ff, { transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.16, 0, train));
    let shown = '', last = 0;
    tick.push((t, dt, env) => {
      if (camera.position.y < H.home) return;
      const { u, lit: on, train: arrive, leave } = env.extra;
      train.visible = arrive > 0.01 && leave < 0.99; train.position.x = 15 + (1 - arrive) ** 2 * 20 - leave * leave * 26; // in from the east, out to the west
      for (const [i, c] of cars.entries()) { c.win.material.opacity = i === on ? 1 : 0.4; c.halo.material.opacity = i === on ? 0.5 : 0; c.win.position.y = 0.02 + (i === on ? Math.sin(t * 2) * 0.03 : 0); }
      rowGlow.material.opacity = on >= 0 ? 0.25 : 0; if (on >= 0) rowGlow.position.y = BOARD.rowY(1.5);
      const flip = u.some((v) => v >= 0 && v < 1), k = u.map((v) => (v < 0 ? 'b' : v < 1 ? 'f' : 'l')).join('') + on;
      if ((flip && t - last > 0.07) || k !== shown) { shown = k; last = t; draw(u, on); }
    });
    mesh(new THREE.BoxGeometry(12, 0.02, 0.4), lit(0xf2d98b), 15, y + 0.011, -21.7); // the platform's yellow line
    hover(prop('station_bench', 11.5, y + 0.2, -20.5, { ry: Math.PI }), 0.05, 0.4, 0.03);
    hover(prop('station_bench', 18.5, y + 0.38, -20.5, { ry: Math.PI + 0.25 }), 0.07, 0.35, 0.07);
    for (const lx of [11.5, 18.5]) { prop('hanging_lamp', lx, y + 3.3, -19.6); glow(0xffc978, 2.0, lx, y + 3.3, -19.6); }
    hover(prop('station_clock', 15, y + 5.7, -23.1, { s: 1.7, then: (m) => {
      const hh = part(m, 'hand_hour'), hm = part(m, 'hand_minute');
      tick.push((t, dt, env) => { // the hands have left the face and turn on their own
        hh.position.set(0.3 + Math.sin(env.air * 0.2) * 0.05, 0.1, 0.22); hh.quaternion.setFromAxisAngle(Z, -env.air * 0.07);
        hm.position.set(-0.32, -0.12 + Math.sin(env.air * 0.25) * 0.05, 0.36); hm.quaternion.setFromAxisAngle(Z, -env.air * 0.35);
      });
    } }), 0.04, 0.3, 0.02);
    // A length of track runs to the broken edge. Past it the sleepers keep going, up into the sky.
    const iron = lit(0x3a3530), wood = lit(0x6b4a32), sleeper = new THREE.BoxGeometry(0.22, 0.1, 1.5);
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(5.8, 0.1, 0.07), iron, 20.4, y + 0.15, -12.5 + s * 0.45);
    const loose = [];
    for (let i = 0; i < 26; i++) {
      const sx = 17.8 + i * 0.62, u = Math.max(0, (sx - 22.6) / 12), m = mesh(sleeper, wood, sx, y + 0.05 + u * u * 7, -12.5 + Math.sin(i * 1.7) * u * 2.5);
      m.rotation.set(Math.sin(i * 2.3) * u * 0.9, Math.sin(i * 1.1) * u * 1.2, Math.cos(i * 1.9) * u * 0.7);
      if (u > 0) loose.push([m, m.position.y, i]);
    }
    tick.push((t, dt, env) => { for (const [m, y0, i] of loose) m.position.y = y0 + Math.sin(env.air * 0.35 + i) * 0.12; });
  }

  // ---------- 06 Rooftop front desk: the washing line is held up by two kites ----------
  {
    const y = H.rooftop;
    prop('front_desk', 15, y, 7.5, { ry: Math.PI }); // its panelled front faces the visitor
    // The three plans, hovering over the desk in their shop colours.
    for (const [i, s] of SHOPS.entries()) {
      const card = mesh(new THREE.PlaneGeometry(0.72, 0.96), basic(0xffffff, { ...both, map: canvasTex(216, 288, (x, w, h) => {
        x.fillStyle = '#f7efe2'; x.fillRect(0, 0, w, h); x.fillStyle = css(s.color); x.fillRect(0, 0, w, 70);
        x.fillStyle = '#1e2a26'; x.font = '500 30px Fraunces, Georgia, serif'; x.textAlign = 'center'; for (const [k, l] of (i === 2 ? ['Signature', '+ Admin'] : [s.name]).entries()) x.fillText(l, w / 2, 112 + k * 34);
        x.fillStyle = '#8c8a82'; for (let k = 0; k <= i + 2; k++) x.fillRect(22, 180 + k * 18, w - 44 - (k % 2) * 24, 6);
      }) }), 14 + i, y + 2.05, 7.5);
      card.rotation.y = Math.PI; hover(card, 0.08, 0.45, 0.05, 0.3);
    }
    glow(0xfff0cf, 3.5, 15, y + 2.0, 7.3, scene, 0.25);
    {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 220; const x = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      sign.draw = (text) => {
        const t = (text || '').trim(), word = t || 'Your business';
        x.fillStyle = '#1e1a22'; x.fillRect(0, 0, 1024, 220); x.strokeStyle = 'rgba(246,184,208,0.35)'; x.lineWidth = 4; x.strokeRect(10, 10, 1004, 200);
        let size = 120; x.font = `italic 400 ${size}px Fraunces, serif`; while (x.measureText(word).width > 900 && size > 40) { size -= 6; x.font = `italic 400 ${size}px Fraunces, serif`; }
        x.textAlign = 'center'; x.textBaseline = 'middle';
        for (const [blur, col] of [[38, '#ff5fa2'], [14, '#ff9cc6'], [0, t ? '#fff1f7' : 'rgba(255,241,247,0.55)']]) { x.shadowColor = '#ff5fa2'; x.shadowBlur = blur; x.fillStyle = col; x.fillText(word, 512, 116); }
        x.shadowBlur = 0; tex.needsUpdate = true;
      };
      sign.draw('');
      const m = mesh(new THREE.PlaneGeometry(2.9, 0.62), basic(0xffffff, { map: tex }), 15, y + 0.6, 6.96); m.rotation.y = Math.PI; // on the desk's front, facing the visitor
      document.fonts?.ready.then(() => sign.draw(sign.last));
      let lit = -1, flick = -9; // when the tube came on, and when a letter last changed
      const draw = sign.draw; sign.draw = (t) => { sign.last = t; draw(t); flick = performance.now() / 1000; };
      tick.push((t) => { // a neon tube warming up: dark, two stutters, then on; a new letter makes it stutter once
        const now = performance.now() / 1000, near = camera.position.distanceTo(m.position) < 9;
        if (near && lit < 0) lit = now; if (!near) lit = -1;
        const a = lit < 0 ? 9 : now - lit, b = now - flick, on = a < 0.25 ? 0.15 : a < 0.35 ? 1 : a < 0.5 ? 0.2 : a < 0.62 ? 0.9 : a < 0.7 ? 0.35 : 1;
        m.material.color.setScalar(on * (b < 0.08 ? 0.45 : 1));
      });
    }
    prop('water_tank', 20, y, 9);
    hover(prop('water_tank', 18.2, y + 0.42, 9.4, { s: 0.75 }), 0.07, 0.3, 0.05); // this one has come loose
    const umbrella = hover(prop('umbrella', 17.4, y + 0.3, 6.4), 0.06, 0.35, 0.03);
    tick.push((t, dt, env) => { umbrella.rotation.y += dt * 0.12 * env.wind; });

    const A = new V3(9.2, y + 2.25, 10), B = new V3(20.8, y + 2.25, 10), kiteA = new V3(6, y + 7.5, 13.5), kiteB = new V3(24, y + 9, 14);
    const line = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => new V3(A.x + ((B.x - A.x) * i) / 8, A.y - 0.38 * Math.sin((Math.PI * i) / 8), 10)));
    mesh(new THREE.TubeGeometry(line, 40, 0.008, 4), basic(0xf7efe2));
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([A, kiteA, B, kiteB]), new THREE.LineBasicMaterial({ color: 0xf7efe2 })));
    const sway = (g, amt) => tick.push((t, dt, env) => { g.rotation.z = Math.sin(env.air * 0.6 + g.position.x) * amt; });
    for (const k of [kiteA, kiteB]) sway(prop('kite', k.x, k.y, k.z, { s: 1.8 }), 0.25);
    const clothGeo = new THREE.PlaneGeometry(0.55, 0.75).translate(0, -0.375, 0);
    const clothes = [0xf7efe2, 0x2f5fa8, 0xe8a89a, 0xf2d98b, 0x3f6e68, 0xf7efe2, 0xc2387a].map((col, i) => {
      const m = mesh(clothGeo, lit(col, both)); line.getPointAt(0.1 + i * 0.13, m.position); m.scale.x = 0.8 + (i % 3) * 0.25; return m;
    });
    tick.push((t, dt, env) => { for (const [i, m] of clothes.entries()) m.rotation.x = Math.sin(env.air * 1.1 + i * 0.9) * (0.08 + (env.wind - 1) * 0.5); }); // the cursor's breeze lifts them
    // More kites in the southern sky, for the look up at the end.
    for (const [kx, ky, kz, s] of [[4, y + 13, 30, 2.6], [13, y + 17, 38, 3], [22, y + 12, 27, 2.4], [30, y + 16, 40, 3], [16, y + 22, 50, 3.4]]) sway(prop('kite', kx, ky, kz, { s }), 0.3);
  }

  // ---------- things adrift between the fragments ----------
  {
    for (const n of ['kite', 'kite 2']) { const c = at(n), g = prop('kite', c.x, c.y + 0.3, c.z); tick.push((t, dt, env) => { g.rotation.z = Math.sin(env.air * 0.6 + c.x) * 0.25; }); }
    const tv = at('floating box TV'), set = hover(prop('box_tv', tv.x, tv.y - 0.5, tv.z, { s: 1.2 }), 0.12, 0.3, 0.2);
    const paper = at('newspaper page'), sheet = hover(prop('newspaper', paper.x, paper.y, paper.z, { s: 2.4 }), 0.15, 0.3, 0.6);
    tick.push((t, dt, env) => { set.rotation.y += dt * 0.15 * env.wind; sheet.rotation.y += dt * 0.2 * env.wind; });
    const ph = at('phone and battery');
    hover(prop('phone', ph.x, ph.y, ph.z, { s: 5, then: (m) => { m.rotation.x = 1.1; apart(m, { cover: [0, -0.07, 0], battery: [0.0, 0.08, -0.06], charger: [0.07, 0.02, 0.04] }); } }), 0.1, 0.3, 0.15, 0.8);
  }

  return Promise.all(pending);
}
