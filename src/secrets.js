// The Landing's bookshelf ("How we work" in five volumes), and the three v1 secrets: The Lab behind volume five,
// Door 201, and the mirror in the Lobby's water. The secret rooms are built far under the lake; main.js fades the
// camera in and out of them, so the walk's rail stays one line.
import * as THREE from 'three';
import { holoEdges, holoFill } from './holo.js';
import { H } from './world.js';
import renders from '../blender/renders/all-components.jpg';

// From the brief (world-v3-changes.md, item 12).
// Inside each: what the rate card of 13 Nov 2026 (business-and-pricing.md) says about that step. Nothing else is claimed.
export const BOOKS = [
  { title: 'Story', line: 'We learn your business and find its story.', head: 'Where it starts', facts: ['Signature plans begin with a story concept for your business.', 'Starter: 1 to 3 pages. Signature: 5 to 7.', 'Not sure which? Ask at the rooftop desk.'] },
  { title: 'Design', line: 'You see every screen before code.', head: 'Before any code', facts: ['You see every screen first.', 'Starter: 2 free revision rounds.', 'Signature plans: 3 free revision rounds.'] },
  { title: 'Build', line: 'Hand-checked code, fast on phones.', head: 'In every plan', facts: ['SSL, and fast loading on phones.', 'WhatsApp click-to-chat.', 'Enquiry forms with spam protection.'] },
  { title: 'Launch', line: 'Domain, hosting, Google profile.', head: 'Going live', facts: ['Deployment and Google Business Profile setup, in every plan.', 'Domain and hosting setup: free with Signature.', 'A Telugu version is an add-on.'] },
  { title: 'Care', line: 'Backups, updates, small changes.', head: 'After launch', facts: ['30 days of free bug fixes, in every plan.', 'Daily backups with Signature + Admin.', 'Changes after the revision rounds are billed by the hour.'] },
];
const DEEP = -60; // the floor of the secret rooms
// pose: where the camera stands inside. flip: no room, the walk's own view turned upside down.
export const SECRETS = [
  { id: 'lab', name: 'The Lab', text: "Experiments, Blender renders, and a kids' game prototype. Move the cursor over the tablet to brush it clean.", pose: { pos: [60, DEEP + 1.6, 1.9], yaw: 0, pitch: -3 } },
  { id: 'mirror', name: 'The mirror', text: 'An upside-down copy of the room, where the sky is underwater.', flip: true },
  { id: '201', name: 'Door 201 · The sketch room', text: 'Where a site starts. Click a colour, a typeface and a layout on the desk, and the screen sketches a first homepage.', pose: { pos: [80.6, DEEP + 1.55, 1.5], yaw: 0, pitch: -6 } },
];
export const SHELF = { x: -11, z: -1.68 }, PUDDLE = [-3.4, 0.03, 7.0], DOOR = { x: -11, z: 0.75 };

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function secrets({ scene, camera, lowQuality }) {
  const L = H.landing;
  const lit = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
  const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
  const mesh = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const tick = [];

  // ---------- the shelf and its five volumes, on the Landing's west wall ----------
  const COLORS = [0x9e3b2c, 0x3f6e68, 0x2f5fa8, 0xc98b5a, 0x6b4a7a];
  box(0.5, 0.06, 2.1, lit(0x6b4a32), SHELF.x + 0.25, L + 1.12, SHELF.z); box(0.5, 0.06, 2.1, lit(0x6b4a32), SHELF.x + 0.25, L + 2.3, SHELF.z);
  for (const s of [-1, 1]) box(0.5, 1.24, 0.06, lit(0x6b4a32), SHELF.x + 0.25, L + 1.71, SHELF.z + s * 1.05);
  const books = BOOKS.map((b, i) => {
    const spine = canvasTex(96, 448, (x, w, h) => {
      x.fillStyle = '#' + COLORS[i].toString(16).padStart(6, '0'); x.fillRect(0, 0, w, h);
      x.fillStyle = '#f2d98b'; x.fillRect(10, 22, w - 20, 4); x.fillRect(10, h - 26, w - 20, 4);
      x.textAlign = 'center'; x.font = '500 54px Fraunces, Georgia, serif'; x.fillText(String(i + 1), w / 2, 92);
      x.save(); x.translate(w / 2 + 14, 270); x.rotate(Math.PI / 2); x.font = '500 44px Fraunces, Georgia, serif'; x.fillText(b.title, 0, 0); x.restore();
    });
    const cover = lit(COLORS[i]), paper = lit(0xf3ead6);
    const z = SHELF.z - 0.76 + i * 0.38, home = SHELF.x + 0.29;
    const m = mesh(new THREE.BoxGeometry(0.5, 1.02, 0.24), [basic(0xffffff, { map: spine }), cover, paper, cover, cover, cover], home, L + 1.66, z);
    m.rotation.z = i === 3 ? -0.05 : 0; // one leans a little
    return { m, home, pull: 0, want: 0, z };
  });
  // The open book. A click pulls the volume right out, its neighbours lean into the gap, it flies to the reader turning
  // spine first, opens, and a few leaves turn before its two pages settle. Closing runs the same path backwards.
  const READ = new THREE.Vector3(SHELF.x + 2.0, L + 1.5, SHELF.z + 1.23); // 1.6 m in front of the Bookshelf hold, left of the HTML card
  const open = new THREE.Group(); open.visible = false; scene.add(open);
  const coverMats = COLORS.map((c) => lit(c, { side: THREE.DoubleSide })), leafGeo = new THREE.PlaneGeometry(0.5, 0.72).translate(0.25, 0, 0);
  const coverGeo = new THREE.PlaneGeometry(0.57, 0.82).translate(0.285, 0, 0);
  const leafTex = canvasTex(160, 230, (x, w, h) => { x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); x.fillStyle = '#d9cfbd'; for (let r = 0; r < 12; r++) x.fillRect(18, 26 + r * 15, r % 4 === 3 ? 70 : 124, 4); });
  const covers = [-1, 1].map(() => mesh(coverGeo, coverMats[0], 0, 0, 0, open)), leaves = [0, 1, 2].map((k) => mesh(leafGeo, basic(0xffffff, { map: leafTex, side: THREE.DoubleSide }), 0, 0, 0.003 * (k + 1), open));
  const wrap = (x, text, maxW) => { const out = []; let line = ''; for (const w of text.split(' ')) { if (x.measureText(line + w).width > maxW) { out.push(line.trim()); line = ''; } line += w + ' '; } out.push(line.trim()); return out; };
  const spreads = BOOKS.map((b, i) => canvasTex(1024, 700, (x, w, h) => {
    const hex = '#' + COLORS[i].toString(16).padStart(6, '0');
    x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(30,42,38,0.08)'; x.fillRect(w / 2 - 14, 0, 28, h); // the gutter
    x.fillStyle = '#1e2a26'; x.font = '500 22px "Martian Mono", monospace'; x.fillText(`HOW WE WORK · VOLUME 0${i + 1} OF 05`, 48, 70);
    x.fillStyle = hex; x.font = '300 210px Fraunces, Georgia, serif'; x.fillText(String(i + 1), 40, 300);
    x.fillStyle = '#1e2a26'; x.font = '500 78px Fraunces, Georgia, serif'; x.fillText(b.title, 48, 400);
    x.font = 'italic 400 36px Fraunces, Georgia, serif'; wrap(x, b.line, 400).forEach((l, k) => x.fillText(l, 48, 470 + k * 46));
    x.fillStyle = hex; x.fillRect(48, 610, 120, 6);
    x.fillStyle = hex; x.font = '500 22px "Martian Mono", monospace'; x.fillText(b.head.toUpperCase(), 560, 110);
    let y = 180; x.font = '400 32px "Familjen Grotesk", Arial, sans-serif';
    for (const f of b.facts) { x.fillStyle = hex; x.fillRect(560, y - 18, 14, 14); x.fillStyle = '#1e2a26'; for (const l of wrap(x, f, 380)) { x.fillText(l, 592, y); y += 42; } y += 30; }
    x.fillStyle = '#8c8a82'; x.font = '400 18px "Martian Mono", monospace'; x.fillText('FROM THE RATE CARD OF 13 NOV 2026', 560, 640);
  }));
  const page = mesh(new THREE.PlaneGeometry(1.1, 0.75), basic(0xffffff, { map: spreads[0], transparent: true, opacity: 0 }), 0, 0, 0.075, open);
  let want = -1, shown = -1, openK = 0;
  const FLY = new THREE.Vector3();
  // ---------- Door 201, on the same wall ----------
  const door = new THREE.Group(); door.position.set(DOOR.x + 0.06, L, DOOR.z + 0.48); scene.add(door); // hinged at its south edge
  const leaf = box(0.07, 2.1, 0.96, lit(0x3f6e68), 0, 1.05, -0.48, door);
  for (const y of [0.55, 1.5]) box(0.02, 0.7, 0.62, lit(0x356058), 0.04, y, -0.48, door);
  mesh(new THREE.SphereGeometry(0.045, 12, 10), lit(0xb9935a, { metalness: 0.7, roughness: 0.4 }), 0.08, 1.02, -0.86, door);
  mesh(new THREE.PlaneGeometry(0.3, 0.16), basic(0xffffff, { map: canvasTex(150, 80, (x) => { x.fillStyle = '#d8b77a'; x.fillRect(0, 0, 150, 80); x.fillStyle = '#3a2810'; x.font = '600 50px "Martian Mono", monospace'; x.textAlign = 'center'; x.fillText('201', 75, 58); }) }), 0.046, 1.75, -0.48, door).rotation.y = Math.PI / 2;
  const doorGlow = mesh(new THREE.PlaneGeometry(0.9, 2.05), basic(0xffd9a0, { transparent: true, opacity: 0 }), DOOR.x + 0.02, L + 1.03, DOOR.z); doorGlow.rotation.y = Math.PI / 2;

  // ---------- the mirror's way in: a ring of light on the Lobby's water ----------
  const ring = mesh(new THREE.RingGeometry(0.42, 0.55, 40).rotateX(-Math.PI / 2), basic(0xbfe9ff, { transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), ...PUDDLE);

  // ---------- the way in to each: an outline that shows only when the cursor is near, and a few fireflies until it is found ----------
  const ways = [
    { id: 'lab', at: new THREE.Vector3(SHELF.x + 0.5, L + 1.66, books[4].z), geo: new THREE.BoxGeometry(0.56, 1.1, 0.3), near: 9 },
    { id: 'mirror', at: new THREE.Vector3(...PUDDLE).setY(0.25), geo: new THREE.CylinderGeometry(0.6, 0.6, 0.5, 20), near: 9 },
    { id: '201', at: new THREE.Vector3(DOOR.x + 0.1, L + 1.05, DOOR.z), geo: new THREE.BoxGeometry(0.2, 2.14, 1.0), near: 9 },
  ].map((w, k) => {
    const fade = { value: 0 }, edge = holoEdges(w.geo, { everywhere: true, fade }); edge.position.copy(w.at); scene.add(edge);
    const n = 4, pos = new Float32Array(n * 3), flies = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ size: 0.07, color: [0x9fe8ff, 0xd9b8ff, 0xffc9a0][k], transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    flies.position.copy(w.at); flies.frustumCulled = false; scene.add(flies);
    w.geo.computeBoundingBox();
    return { ...w, fade, edge, flies, pos, box: w.geo.boundingBox.clone().translate(w.at).expandByScalar(0.12), found: false };
  });

  // ---------- The Lab ----------
  const lab = {};
  {
    const g = new THREE.Group(); g.position.set(60, DEEP, 0); scene.add(g);
    mesh(new THREE.BoxGeometry(6.4, 3.3, 6.4), lit(0x25302e, { side: THREE.BackSide }), 0, 1.65, 0, g);
    mesh(new THREE.PlaneGeometry(6.4, 6.4).rotateX(-Math.PI / 2), lit(0x3a4744), 0, 0.01, 0, g);
    box(3.4, 0.07, 0.9, lit(0x9b7a55), 0, 0.82, -2.5, g); for (const s of [-1.5, 1.5]) box(0.07, 0.8, 0.8, lit(0x6b4a32), s, 0.4, -2.5, g);
    const tex = new THREE.TextureLoader().load(renders); tex.colorSpace = THREE.SRGBColorSpace;
    box(3.3, 1.9, 0.05, lit(0x1c2124), 0, 2.05, -3.14, g); mesh(new THREE.PlaneGeometry(3.14, 1.76), basic(0xffffff, { map: tex }), 0, 2.05, -3.1, g); // the real Blender render of every prop in the building
    // "brush it clean": the kids' game prototype, playable. Dust covers a little picture; the cursor brushes it away.
    const tablet = canvasTex(512, 320, (x) => {
      x.fillStyle = '#bfe3f2'; x.fillRect(0, 0, 512, 320); x.fillStyle = '#f2d98b'; x.beginPath(); x.arc(420, 70, 40, 0, 7); x.fill(); // sky and sun
      x.fillStyle = '#7fae7a'; x.fillRect(0, 250, 512, 70); // grass
      x.fillStyle = '#e8a89a'; x.fillRect(150, 130, 210, 120); x.fillStyle = '#9e3b2c'; x.beginPath(); x.moveTo(130, 135); x.lineTo(255, 60); x.lineTo(380, 135); x.fill(); // a little house
      x.fillStyle = '#3f6e68'; x.fillRect(235, 185, 40, 65); x.fillStyle = '#f7efe2'; x.fillRect(170, 160, 44, 36); x.fillRect(296, 160, 44, 36);
      x.fillStyle = '#1e2a26'; x.textAlign = 'center'; x.font = '600 34px Fraunces, Georgia, serif'; x.fillText('Sparkling!', 256, 300);
    });
    const dustC = document.createElement('canvas'); dustC.width = 256; dustC.height = 160; const dx = dustC.getContext('2d'), dust = new THREE.CanvasTexture(dustC); dust.colorSpace = THREE.SRGBColorSpace;
    const fillDust = () => {
      dx.globalCompositeOperation = 'source-over'; dx.fillStyle = '#8a7356'; dx.fillRect(0, 0, 256, 160);
      for (let k = 0; k < 900; k++) { dx.fillStyle = `rgba(${90 + Math.random() * 60},${70 + Math.random() * 40},${50 + Math.random() * 30},0.6)`; dx.fillRect(Math.random() * 256, Math.random() * 160, 3, 3); }
      dx.fillStyle = '#f7efe2'; dx.font = '600 22px "Martian Mono", monospace'; dx.textAlign = 'center'; dx.fillText('BRUSH IT CLEAN', 128, 86); dust.needsUpdate = true;
    };
    fillDust();
    const slate = new THREE.Group(); slate.position.set(-1.2, 1.35, -1.3); slate.rotation.set(-0.12, 0.35, 0); g.add(slate);
    box(1.32, 0.86, 0.04, lit(0x1c2124), 0, 0, 0, slate); mesh(new THREE.PlaneGeometry(1.24, 0.78), basic(0xffffff, { map: tablet }), 0, 0, 0.021, slate);
    const dustPlane = mesh(new THREE.PlaneGeometry(1.24, 0.78), basic(0xffffff, { map: dust, transparent: true }), 0, 0, 0.024, slate);
    box(0.05, 1.0, 0.05, lit(0x6b4a32), 0, -0.9, -0.05, slate); // its stand
    lab.brush = (ray) => {
      const hit = ray.intersectObject(dustPlane)[0]; if (!hit) return false;
      dx.globalCompositeOperation = 'destination-out'; dx.beginPath(); dx.arc(hit.uv.x * 256, (1 - hit.uv.y) * 160, 16, 0, 7); dx.fill(); dust.needsUpdate = true;
      return true;
    };
    lab.left = () => { const d = dx.getImageData(0, 0, 256, 160).data; let n = 0; for (let k = 3; k < d.length; k += 16) n += d[k] > 40; return n / (d.length / 16); }; // how much dust is left, 0 to 1
    lab.reset = fillDust;
    // experiments: wireframe shapes turning in the air
    const shapes = [[new THREE.IcosahedronGeometry(0.36, 0), 1.7, 1.5, -1.6], [new THREE.TorusKnotGeometry(0.24, 0.07, 48, 8), 2.0, 1.9, -0.9], [new THREE.OctahedronGeometry(0.3, 0), 0.9, 1.2, -2.3]].map(([geo, x, y, z]) => {
      const m = mesh(geo, holoFill({ opacity: 0.2 }), x, y, z, g); m.add(holoEdges(geo, { angle: 1, everywhere: true })); return m;
    });
    tick.push((t) => { if (camera.position.y > DEEP + 10) return; for (const [k, m] of shapes.entries()) { m.rotation.set(t * 0.3 + k, t * 0.4 + k * 2, 0); m.position.y += Math.sin(t * 0.8 + k) * 0.0008; } });
  }
  // ---------- Door 201: the sketch room. A desk of choices; the screen draws a homepage from what is picked. ----------
  const sketch = { pal: 0, font: 0, layout: 0, name: '', items: [] };
  {
    const g = new THREE.Group(); g.position.set(80, DEEP, 0); scene.add(g);
    mesh(new THREE.BoxGeometry(4.6, 3.0, 4.6), lit(0xece3d2, { side: THREE.BackSide }), 0, 1.5, 0, g);
    mesh(new THREE.PlaneGeometry(4.6, 4.6).rotateX(-Math.PI / 2), lit(0xb8a07c), 0, 0.01, 0, g);
    box(3.4, 0.06, 0.9, lit(0xd9c7a8), 0, 0.78, -1.75, g); for (const s of [-1.6, 1.6]) box(0.06, 0.78, 0.8, lit(0x6b4a32), s, 0.39, -1.75, g); // the desk
    mesh(new THREE.PlaneGeometry(1.5, 0.4), basic(0xffffff, { map: canvasTex(600, 160, (x) => { x.fillStyle = '#ece3d2'; x.fillRect(0, 0, 600, 160); x.fillStyle = '#1e2a26'; x.font = '500 30px "Martian Mono", monospace'; x.fillText('ROOM 201', 20, 50); x.font = 'italic 400 64px Fraunces, Georgia, serif'; x.fillText('The sketch room', 20, 128); }) }), -1.3, 2.55, -2.29, g);
    box(1.34, 0.84, 0.05, lit(0x1c2124), 0, 1.36, -1.95, g); box(0.08, 0.3, 0.08, lit(0x1c2124), 0, 0.95, -1.97, g); // the screen and its neck
    const c = document.createElement('canvas'); c.width = 640; c.height = 400; const x = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    mesh(new THREE.PlaneGeometry(1.26, 0.78), basic(0xffffff, { map: tex }), 0, 1.36, -1.92, g);
    const PALS = [['#f6e7d2', '#3a2416', '#c2562f'], ['#eef5f3', '#1e3a36', '#3f8f86'], ['#16161d', '#f5f0e6', '#f2c94c'], ['#fbeef0', '#4a2030', '#d4587a']];
    const FONTS = [['Fraunces, Georgia, serif', 'Aa', 'Serif'], ['"Familjen Grotesk", Arial, sans-serif', 'Aa', 'Sans'], ['"Martian Mono", monospace', 'Aa', 'Mono']];
    const draw = () => {
      const [bg, ink, acc] = PALS[sketch.pal], f = FONTS[sketch.font][0], name = sketch.name.trim() || 'Your business', L = sketch.layout;
      x.fillStyle = bg; x.fillRect(0, 0, 640, 400);
      x.fillStyle = ink; x.font = `600 20px ${f}`; x.textAlign = 'left'; x.fillText(name, 28, 40); x.font = `400 14px ${f}`; ['Menu', 'About', 'Visit'].forEach((t, k) => x.fillText(t, 420 + k * 64, 40));
      x.fillStyle = acc; x.globalAlpha = 0.9;
      const title = (px, py, size, align) => { x.fillStyle = ink; x.textAlign = align; let s = size; x.font = `600 ${s}px ${f}`; while (x.measureText(name).width > 520 && s > 22) { s -= 4; x.font = `600 ${s}px ${f}`; } x.fillText(name, px, py); x.font = `400 18px ${f}`; x.fillText('A line about what you do, and for whom.', px, py + 34); };
      const btn = (px, py) => { x.fillStyle = acc; x.fillRect(px, py, 150, 40); x.fillStyle = bg; x.font = `600 15px ${f}`; x.textAlign = 'center'; x.fillText('WhatsApp us', px + 75, py + 26); };
      x.globalAlpha = 1;
      if (L === 0) { title(28, 170, 44, 'left'); btn(28, 230); x.fillStyle = acc; x.globalAlpha = 0.35; x.fillRect(380, 80, 232, 220); x.globalAlpha = 1; x.strokeStyle = ink; x.lineWidth = 2; x.beginPath(); x.moveTo(380, 300); x.lineTo(460, 200); x.lineTo(520, 260); x.lineTo(612, 160); x.stroke(); }
      else if (L === 1) { title(320, 180, 54, 'center'); btn(245, 240); x.fillStyle = acc; x.fillRect(300, 90, 40, 6); }
      else { title(28, 130, 40, 'left'); for (let k = 0; k < 3; k++) { x.fillStyle = acc; x.globalAlpha = 0.25 + k * 0.2; x.fillRect(28 + k * 200, 200, 184, 150); x.globalAlpha = 1; x.fillStyle = ink; x.font = `600 16px ${f}`; x.textAlign = 'left'; x.fillText(['Our work', 'Prices', 'Find us'][k], 44 + k * 200, 335); } }
      x.fillStyle = ink; x.globalAlpha = 0.4; x.font = '400 11px "Martian Mono", monospace'; x.textAlign = 'right'; x.fillText('SKETCH · NOT A REAL SITE', 620, 390); x.globalAlpha = 1;
      tex.needsUpdate = true;
    };
    sketch.draw = draw;
    const item = (kind, i, geo, mat, px, py, pz, rx = 0) => { const m = mesh(geo, mat, px, py, pz, g); m.rotation.x = rx; m.userData = { kind, i, y: py }; sketch.items.push(m); return m; };
    // colour chips, standing on the left of the desk
    PALS.forEach((p, i) => item('pal', i, new THREE.BoxGeometry(0.2, 0.3, 0.02), basic(0xffffff, { map: canvasTex(80, 120, (q) => { q.fillStyle = p[0]; q.fillRect(0, 0, 80, 120); q.fillStyle = p[2]; q.fillRect(0, 0, 80, 56); q.fillStyle = p[1]; q.fillRect(0, 96, 80, 24); }) }), -1.45 + i * 0.24, 0.98, -1.55, -0.2));
    // typeface cards, on the right
    FONTS.forEach((fo, i) => item('font', i, new THREE.BoxGeometry(0.24, 0.3, 0.02), basic(0xffffff, { map: canvasTex(96, 120, (q) => { q.fillStyle = '#fffaf0'; q.fillRect(0, 0, 96, 120); q.fillStyle = '#1e2a26'; q.textAlign = 'center'; q.font = `600 52px ${fo[0]}`; q.fillText(fo[1], 48, 70); q.font = '400 14px "Martian Mono", monospace'; q.fillText(fo[2].toUpperCase(), 48, 104); }) }), 0.85 + i * 0.28, 0.98, -1.55, -0.2));
    // layout blueprints, pinned to the wall above the screen
    ['Picture right', 'Centred', 'Three cards'].forEach((t, i) => item('layout', i, new THREE.PlaneGeometry(0.42, 0.3), basic(0xffffff, { map: canvasTex(168, 120, (q) => {
      q.fillStyle = '#2f5fa8'; q.fillRect(0, 0, 168, 120); q.strokeStyle = '#dfe9ff'; q.lineWidth = 2; q.strokeRect(6, 6, 156, 108); q.fillStyle = '#dfe9ff';
      if (i === 0) { q.fillRect(16, 40, 60, 8); q.fillRect(16, 54, 44, 6); q.strokeRect(96, 28, 56, 52); } else if (i === 1) { q.fillRect(44, 44, 80, 10); q.fillRect(60, 60, 48, 6); } else { q.fillRect(16, 26, 60, 8); for (let k = 0; k < 3; k++) q.strokeRect(16 + k * 48, 50, 40, 36); }
      q.font = '400 11px "Martian Mono", monospace'; q.fillText(t.toUpperCase(), 14, 108);
    }) }), -0.5 + i * 0.5, 2.15, -2.28));
    draw();
  }
  const v = new THREE.Vector3(), scr = new THREE.Vector3();
  return {
    books, ways, openBook: open, get reading() { return openK; },
    found(id) { const w = ways.find((q) => q.id === id); w.found = true; w.flies.visible = false; },
    hover(i) { for (const [k, b] of books.entries()) b.want = k === i ? 1 : 0; },
    open(i) { want = i; },
    get opened() { return want; },
    // inside a secret: a click on one of its things. Returns true when something answered.
    press(ray, id) {
      if (id !== '201') return false;
      const hit = ray.intersectObjects(sketch.items)[0]; if (!hit) return false;
      const { kind, i } = hit.object.userData; sketch[kind] = i; sketch.draw(); return true;
    },
    over(ray, id) { return id === '201' ? ray.intersectObjects(sketch.items).length > 0 : id === 'lab' ? lab.brush(ray) : false; }, // the cursor over something live; in the Lab, brushing
    sketchName(t) { sketch.name = t; sketch.draw(); },
    dustLeft: () => lab.left(),
    // What a ray from the cursor is on: a book, a secret's way in, or nothing. Only things within reach of the camera count.
    pick(ray) {
      if (want >= 0 && open.visible && ray.intersectObject(open, true).length) return { book: want }; // a click on the open book closes it
      if (books[0].m.position.distanceTo(camera.position) < 7) { const hit = ray.intersectObjects(books.map((b) => b.m))[0]; if (hit) return { book: books.findIndex((b) => b.m === hit.object) }; } // the nearest one the ray meets
      for (const w of ways) if (w.id !== 'lab' && w.at.distanceTo(camera.position) < w.near && ray.ray.intersectsBox(w.box)) return { secret: w.id };
      return null;
    },
    update(t, dt, pointer) {
      // the open book: one value runs the whole path, 0 on the shelf to 1 open in front of the reader
      if (want !== shown && openK <= 0.001) { shown = want; if (shown >= 0) { for (const c of covers) c.material = coverMats[shown]; page.material.map = spreads[shown]; } }
      const target = want === shown && shown >= 0 ? 1 : 0;
      openK += Math.max(-dt * 1.5, Math.min(dt * 1.1, target - openK));
      const out = sstep(0, 0.28, openK), fly = sstep(0.28, 0.62, openK), spread = sstep(0.62, 0.95, openK);
      for (const [k, b] of books.entries()) {
        b.pull += (b.want - b.pull) * Math.min(1, dt * 9);
        const d = shown >= 0 ? k - shown : 0, lean = Math.abs(d) === 1 ? out : 0; // the neighbours lean into the gap
        b.m.position.set(b.home + 0.27 * b.pull + (d === 0 && shown >= 0 ? 0.62 * out : 0), L + 1.66, b.z - Math.sign(d) * 0.07 * lean);
        b.m.rotation.x = Math.sign(d) * 0.16 * lean; b.m.visible = !(d === 0 && shown >= 0 && fly > 0.02);
      }
      open.visible = shown >= 0 && fly > 0.02;
      if (open.visible) {
        const b = books[shown]; FLY.set(b.home + 0.62, L + 1.66, b.z);
        open.position.lerpVectors(FLY, READ, fly); open.position.y += Math.sin(fly * Math.PI) * 0.35 + Math.sin(t * 1.1) * 0.02 * spread; // an arc, then a gentle float
        open.rotation.set(0, Math.PI / 2 + Math.PI * (1 - fly), Math.sin(fly * Math.PI) * 0.25); open.scale.setScalar(1.05);
        const th0 = -(Math.PI / 2 + (Math.PI / 2 - 0.12) * spread), th1 = -(Math.PI / 2 - (Math.PI / 2 - 0.12) * spread);
        covers[0].rotation.y = th0; covers[1].rotation.y = th1;
        for (const [k, l] of leaves.entries()) { l.visible = spread > 0.05 && spread < 0.99; l.rotation.y = th1 + (th0 - th1) * sstep(0.15 + k * 0.15, 0.55 + k * 0.15, spread); } // a few leaves turn
        page.material.opacity = sstep(0.85, 1, spread);
      }
      ring.material.opacity = 0.35 + 0.2 * Math.sin(t * 1.6); ring.scale.setScalar(1 + 0.06 * Math.sin(t * 1.1));
      const d201 = ways[2]; door.rotation.y += ((d201.found ? 0.55 : 0) - door.rotation.y) * Math.min(1, dt * 3); doorGlow.material.opacity = d201.found ? 0.8 : 0; leaf.visible = true;
      for (const [k, w] of ways.entries()) {
        const close = w.at.distanceTo(camera.position) < w.near;
        w.flies.visible = close && !w.found; w.edge.visible = close;
        if (!close) continue;
        scr.copy(w.at).project(camera); // the outline shows only when the cursor is near it on the screen
        w.fade.value += ((scr.z < 1 ? sstep(0.45, 0.12, Math.hypot(scr.x - pointer.x, (scr.y + pointer.y) * 0.6)) : 0) - w.fade.value) * Math.min(1, dt * 6);
        for (let i = 0; i < 4; i++) { const a = t * (0.5 + i * 0.13) + i * 1.9 + k; v.set(Math.cos(a) * 0.45, Math.sin(a * 1.3) * 0.35 + 0.2, Math.sin(a) * 0.45); w.pos.set([v.x, v.y, v.z], i * 3); }
        w.flies.geometry.attributes.position.needsUpdate = true;
      }
      for (const m of sketch.items) { const on = sketch[m.userData.kind] === m.userData.i; m.position.y += ((m.userData.y + (on ? 0.06 : 0)) - m.position.y) * Math.min(1, dt * 8); }
      for (const f of tick) f(t);
    },
  };
}
