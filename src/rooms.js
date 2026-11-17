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
  // Sheets flowing along a curve: they grow out of the source and thin away at the end.
  const stream = (pts, n, mats, w, h, rate = 0.03) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p))), geo = new THREE.PlaneGeometry(w, h);
    const items = Array.from({ length: n }, (_, i) => mesh(geo, mats[i % mats.length]));
    tick.push((t, dt, env) => {
      for (const [i, m] of items.entries()) {
        const u = (env.air * rate + i / n) % 1; curve.getPointAt(u, m.position);
        m.scale.setScalar(Math.min(1, u * 7, (1 - u) * 5) * (0.55 + u * 0.6));
        m.rotation.set(Math.sin(env.air * 0.3 + i) * 0.35, Math.sin(env.air * 0.2 + i * 1.3) * 0.7, Math.sin(env.air * 0.25 + i * 2) * 0.25);
      }
    });
  };
  const fan = (x, y, z, s = 1) => prop('ceiling_fan', x, y, z, { s, then: (m) => { const b = part(m, 'blades'); tick.push((t, dt, env) => { b.rotation.y += dt * 1.1 * env.wind; }); } });
  const at = (name) => COLLIDERS.find((c) => c.name === name);
  const both = { side: THREE.DoubleSide };

  // Little website pages: what streams out of the Workshop's screens.
  const pages = [0xe8a89a, 0x2f5fa8, 0x3f6e68, 0xf2d98b].map((col) => basic(0xffffff, { ...both, map: canvasTex(96, 128, (x, w, h) => {
    x.fillStyle = '#f7efe2'; x.fillRect(0, 0, w, h); x.fillStyle = '#1e2a26'; x.fillRect(0, 0, w, 10);
    x.fillStyle = css(col); x.fillRect(8, 20, w - 16, 44);
    x.fillStyle = '#8c8a82'; x.fillRect(8, 74, w - 30, 6); x.fillRect(8, 88, w - 44, 6); x.fillRect(8, 102, w - 36, 6);
  }) }));
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
    // Starter: a phone standing in the air, far taller than a phone.
    hover(prop('phone', a.x, 1.78, z, { s: 8, parent: front[0], then: (m) => { m.rotation.x = Math.PI / 2; for (const n of ['battery', 'charger']) part(m, n).visible = false; } }), 0.07, 0.5, 0.03, 0.35);
    stream([[a.x, 1.95, z + 0.15], [a.x - 0.5, 2.3, z + 0.35], [a.x + 0.3, 2.7, z + 0.15], [a.x - 0.1, 3.0, z - 0.2]], 6, pages, 0.3, 0.4);
    // Signature: a laptop, its pages climbing out in a spiral.
    hover(prop('laptop', b.x, 1.4, z, { s: 3.4, parent: front[1], then: (m) => { m.rotation.x = 0.12; } }), 0.06, 0.45, 0.03, 0.25);
    stream([[b.x, 1.95, z + 0.1], [b.x + 0.5, 2.2, z + 0.35], [b.x, 2.45, z + 0.45], [b.x - 0.5, 2.7, z + 0.2], [b.x, 3.0, z - 0.1]], 8, pages, 0.3, 0.4);
    // Signature + Admin: the same laptop, with its dashboards circling it and a lock above.
    hover(prop('laptop', c.x, 1.4, z, { s: 3.4, parent: front[2], then: (m) => { m.rotation.x = 0.12; } }), 0.06, 0.45, 0.03, 0.25);
    const ring = panels.map((mat) => mesh(new THREE.PlaneGeometry(0.44, 0.33), mat));
    tick.push((t, dt, env) => { for (const [i, m] of ring.entries()) { const an = env.air * 0.25 + (i * 2 * Math.PI) / 3; m.position.set(c.x + Math.cos(an) * 0.78, 2.1 + Math.sin(an) * 0.2, z + 0.05 + Math.sin(an) * 0.32); m.rotation.y = Math.sin(an) * 0.4; } });
    keyAndLock(c.x, 2.62, z - 0.1, 1.3);
    root = scene;
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
    mesh(new THREE.PlaneGeometry(1.1, 2.3), basic(0xfff0c4, both), 0, 1.15, 0, door); // what is behind the door
    glow(0xffd58a, 4.2, 0, 1.3, 0.2, door, 0.6);
    fan(-2.2, 3.5, -5.5, 1.3);
    for (const [x, y, z] of [[-2.6, 0.8, -11.2], [1.3, 1.3, -3.6], [-0.4, 0.55, -13.3]]) hover(prop('newspaper', x, y, z, { s: 1.5, then: (m) => { m.rotation.set(0.5, 0, 0.3); } }), 0.1, 0.35, 0.12, 1.2);
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

  // ---------- Landing: core memory. Sun through crystal glass, dust in the beam, tiles lifting into the light ----------
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

    // Tiles that have left the floor and are rising into the light.
    const tileGeo = new THREE.BoxGeometry(0.48, 0.035, 0.48), tileMat = lit(0x9e4a3a, { roughness: 0.5 });
    const risen = [[-9.6, 0.3, 2.3], [-8.9, 0.75, 3.1], [-8.2, 1.35, 2.5], [-9.3, 1.2, 4.3], [-8.5, 0.45, 4.7], [-7.8, 0.9, 3.9], [-9.9, 1.9, 3.4], [-8.9, 2.3, 3.9]]
      .map(([x, h, z], i) => [mesh(tileGeo, tileMat, x, L + h, z), L + h, i]);
    tick.push((t, dt, env) => { for (const [m, y, i] of risen) { m.position.y = y + Math.sin(env.air * 0.4 + i * 1.3) * 0.09; m.rotation.set(Math.sin(env.air * 0.2 + i) * 0.25, env.air * 0.08 + i, Math.cos(env.air * 0.17 + i * 2) * 0.25); } });

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

    // The TV plays the story as three moving pictures and a question. It also throws its picture into the room, large enough to watch.
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
    // the picture, thrown into the air over the set and always turned to the viewer
    const big = mesh(new THREE.PlaneGeometry(2.7, 2.16), basic(0xffffff, { map: tex, transparent: true, opacity: 0.94, depthWrite: false }), -6.5, y + 2.5, -19.2, scene);
    const beam = mesh(new THREE.ConeGeometry(1.5, 1.1, 4, 1, true), basic(0xcfe0ff, { transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), -6.5, y + 1.35, -19.3, scene);
    beam.rotation.x = Math.PI; big.renderOrder = 3;
    let shown = '', last = 0, since = 0, was = -2;
    tick.push((t, dt, env) => { // the scroll picks the channel (env.tv), with a blip of static at each flip
      if (camera.position.y < H.landing - 1) return;
      const { ch, f } = env.tv, snow = ch >= 0 && f < 0.1, open = ch > 0 ? 1 : ch === 0 ? Math.min(1, f / 0.2) : 0;
      big.visible = beam.visible = open > 0.01; big.scale.setScalar(open); beam.scale.set(open, 1, open);
      big.rotation.y = Math.atan2(camera.position.x - big.position.x, camera.position.z - big.position.z);
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
    // Each row is blank until the walk reaches it, flips while it arrives, and is lit while the walk rests on it (env.extra, from the scroll).
    const draw = (u, litRow) => {
      x.fillStyle = '#15181a'; x.fillRect(0, 0, W, Hh);
      x.font = '600 20px "Martian Mono", monospace'; x.textAlign = 'left'; x.fillStyle = '#8c8a82'; x.fillText('NO.', 32, 44); x.fillText('ADD-ON', 214, 44);
      x.font = '700 32px "Martian Mono", monospace'; x.textAlign = 'center';
      for (const [r, e] of EXTRAS.entries()) {
        const text = (u[r] < 0 ? '' : `0${r + 1}  ${e.name}`).padEnd(COLS), ry = 66 + r * 64, flip = u[r] >= 0 && u[r] < 1, on = r === litRow;
        for (let k = 0; k < COLS; k++) {
          const ch = flip && k / COLS > u[r] - 0.25 ? ABC[Math.floor(Math.random() * ABC.length)] : text[k]; // the letters land from the left
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

    // A train of light on the yellow line: one carriage for each add-on, its window showing what it carries.
    const train = new THREE.Group(); train.position.set(15, y, -21.7); scene.add(train);
    const ICONS = [
      (q) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if ((i * 3 + j * 5 + i * j) % 3 === 0 || ((i < 2 || i > 4) && (j < 2 || j > 4) && !(i > 4 && j > 4))) q.fillRect(22 + i * 12, 22 + j * 12, 10, 10); },
      (q) => { q.strokeRect(20, 28, 88, 70); q.beginPath(); q.arc(84, 50, 8, 0, 7); q.fill(); q.beginPath(); q.moveTo(24, 94); q.lineTo(52, 58); q.lineTo(72, 80); q.lineTo(84, 68); q.lineTo(104, 94); q.fill(); },
      (q) => { q.beginPath(); q.roundRect(20, 24, 88, 62, 14); q.stroke(); q.beginPath(); q.moveTo(40, 86); q.lineTo(36, 108); q.lineTo(60, 86); q.fill(); for (const cx of [44, 64, 84]) { q.beginPath(); q.arc(cx, 55, 5, 0, 7); q.fill(); } },
      (q) => { q.strokeRect(30, 16, 68, 96); for (let i = 0; i < 4; i++) { q.fillRect(40, 32 + i * 18, 30, 5); q.fillRect(78, 32 + i * 18, 10, 5); } },
    ];
    const carGeo = new THREE.BoxGeometry(1.32, 1.0, 0.8), carFill = holoFill({ opacity: 0.16 });
    const cars = EXTRAS.map((e, i) => {
      const car = new THREE.Group(); car.position.set((i - 1.5) * 1.45, 0.7, 0); train.add(car); // 1.45 m apart: the whole train fits the frame from the stop, 3.5 m away
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
      rowGlow.material.opacity = on >= 0 ? 0.25 : 0; if (on >= 0) rowGlow.position.y = BOARD.rowY(on);
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
      const card = mesh(new THREE.PlaneGeometry(0.72, 0.96), basic(0xffffff, { ...both, map: canvasTex(108, 144, (x, w, h) => {
        x.fillStyle = '#f7efe2'; x.fillRect(0, 0, w, h); x.fillStyle = css(s.color); x.fillRect(0, 0, w, 46);
        x.fillStyle = '#8c8a82'; for (let k = 0; k <= i + 2; k++) x.fillRect(12, 62 + k * 15, w - 24 - (k % 2) * 16, 5);
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
      const draw = sign.draw; sign.draw = (t) => { sign.last = t; draw(t); };
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
