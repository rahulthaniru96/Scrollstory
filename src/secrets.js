// The Landing's bookshelf ("How we work" in five volumes), and the three v1 secrets: The Lab behind volume five,
// Door 201, and the mirror in the Lobby's water. The secret rooms are built far under the lake; main.js fades the
// camera in and out of them, so the walk's rail stays one line.
import * as THREE from 'three';
import { holoEdges, holoFill } from './holo.js';
import { H } from './world.js';
import renders from '../blender/renders/all-components.jpg';

// From the brief (world-v3-changes.md, item 12).
export const BOOKS = [
  { title: 'Story', line: 'We learn your business and find its story.' },
  { title: 'Design', line: 'You see every screen before code.' },
  { title: 'Build', line: 'Hand-checked code, fast on phones.' },
  { title: 'Launch', line: 'Domain, hosting, Google profile.' },
  { title: 'Care', line: 'Backups, updates, small changes.' },
];
const DEEP = -60; // the floor of the secret rooms
// pose: where the camera stands inside. flip: no room, the walk's own view turned upside down.
export const SECRETS = [
  { id: 'lab', name: 'The Lab', text: "Experiments, Blender renders, and a kids' game prototype: brush it clean.", pose: { pos: [60, DEEP + 1.6, 1.9], yaw: 0, pitch: -3 } },
  { id: 'mirror', name: 'The mirror', text: 'An upside-down copy of the room, where the sky is underwater.', flip: true },
  { id: '201', name: 'Door 201', text: 'A tiny 2012 bedroom, and the desk where it started.', pose: { pos: [80, DEEP + 1.5, 1.4], yaw: 0, pitch: -4 } },
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
  // the open book: two covers and a few pages that turn, in the air in front of the shelf
  const open = new THREE.Group(); open.position.set(SHELF.x + 0.8, L + 2.74, SHELF.z); open.rotation.y = Math.PI / 2; open.visible = false; scene.add(open); // it floats over the shelf, so the other volumes stay in view
  const coverMats = COLORS.map((c) => lit(c, { side: THREE.DoubleSide })), leafGeo = new THREE.PlaneGeometry(0.5, 0.72).translate(0.25, 0, 0);
  const coverGeo = new THREE.PlaneGeometry(0.57, 0.82).translate(0.285, 0, 0); // the covers stand proud of the pages, so the book reads against a pale wall
  const pageTex = canvasTex(160, 230, (x, w, h) => { x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); x.fillStyle = '#b9ad98'; for (let r = 0; r < 12; r++) x.fillRect(18, 26 + r * 15, r % 4 === 3 ? 70 : 124, 4); });
  const covers = [-1, 1].map(() => mesh(coverGeo, coverMats[0], 0, 0, 0, open)), pages = [0, 1, 2, 3, 4].map((k) => mesh(leafGeo, basic(0xffffff, { map: pageTex, side: THREE.DoubleSide }), 0, 0, 0.002 * (k + 1), open));
  let opened = -1, openK = 0;

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
  {
    const g = new THREE.Group(); g.position.set(60, DEEP, 0); scene.add(g);
    mesh(new THREE.BoxGeometry(6.4, 3.3, 6.4), lit(0x25302e, { side: THREE.BackSide }), 0, 1.65, 0, g);
    mesh(new THREE.PlaneGeometry(6.4, 6.4).rotateX(-Math.PI / 2), lit(0x3a4744), 0, 0.01, 0, g);
    box(3.4, 0.07, 0.9, lit(0x9b7a55), 0, 0.82, -2.5, g); for (const s of [-1.5, 1.5]) box(0.07, 0.8, 0.8, lit(0x6b4a32), s, 0.4, -2.5, g);
    const tex = new THREE.TextureLoader().load(renders); tex.colorSpace = THREE.SRGBColorSpace;
    box(3.3, 1.9, 0.05, lit(0x1c2124), 0, 2.05, -3.14, g); mesh(new THREE.PlaneGeometry(3.14, 1.76), basic(0xffffff, { map: tex }), 0, 2.05, -3.1, g); // the real Blender render of every prop in the building
    const tablet = canvasTex(512, 320, (x) => {
      x.fillStyle = '#f7efe2'; x.fillRect(0, 0, 512, 320); x.fillStyle = '#bfe3f2'; x.fillRect(0, 0, 512, 70);
      x.fillStyle = '#1e2a26'; x.textAlign = 'center'; x.font = '500 58px Fraunces, Georgia, serif'; x.fillText('brush it clean', 256, 170);
      x.font = '400 22px "Martian Mono", monospace'; x.fillText("KIDS' GAME · PROTOTYPE", 256, 226);
      x.fillStyle = '#3f6e68'; x.fillRect(206, 262, 100, 10); x.fillRect(306, 250, 46, 34);
    });
    const slate = box(0.8, 0.5, 0.03, lit(0x1c2124), -0.9, 1.16, -2.45, g); slate.rotation.x = -0.35; mesh(new THREE.PlaneGeometry(0.74, 0.46), basic(0xffffff, { map: tablet }), 0, 0, 0.017, slate);
    // experiments: wireframe shapes turning in the air
    const shapes = [[new THREE.IcosahedronGeometry(0.36, 0), 1.7, 1.5, -1.6], [new THREE.TorusKnotGeometry(0.24, 0.07, 48, 8), -2.1, 1.9, -0.9], [new THREE.OctahedronGeometry(0.3, 0), 0.9, 1.2, -2.3]].map(([geo, x, y, z]) => {
      const m = mesh(geo, holoFill({ opacity: 0.2 }), x, y, z, g); m.add(holoEdges(geo, { angle: 1, everywhere: true })); return m;
    });
    tick.push((t) => { if (camera.position.y > DEEP + 10) return; for (const [k, m] of shapes.entries()) { m.rotation.set(t * 0.3 + k, t * 0.4 + k * 2, 0); m.position.y += Math.sin(t * 0.8 + k) * 0.0008; } });
  }
  // ---------- Door 201's room: a tiny 2012 bedroom ----------
  {
    const g = new THREE.Group(); g.position.set(80, DEEP, 0); scene.add(g);
    mesh(new THREE.BoxGeometry(4.2, 2.8, 4.2), lit(0xe6d6b4, { side: THREE.BackSide }), 0, 1.4, 0, g);
    mesh(new THREE.PlaneGeometry(4.2, 4.2).rotateX(-Math.PI / 2), lit(0x9b7a55), 0, 0.01, 0, g);
    box(1.0, 0.3, 2.0, lit(0x6b4a32), -1.5, 0.25, -0.9, g); box(0.96, 0.14, 1.96, lit(0x2f5fa8), -1.5, 0.47, -0.9, g); box(0.7, 0.12, 0.4, lit(0xf7efe2), -1.5, 0.6, -1.65, g); // the bed
    box(1.5, 0.06, 0.7, lit(0x9b7a55), 0.7, 0.76, -1.7, g); for (const s of [0.05, 1.35]) box(0.06, 0.76, 0.6, lit(0x6b4a32), s, 0.38, -1.7, g); // the desk
    box(0.56, 0.46, 0.5, lit(0xd8cdb8), 0.7, 1.05, -1.75, g); // a CRT monitor
    const screen = canvasTex(256, 200, (x) => {
      x.fillStyle = '#10161a'; x.fillRect(0, 0, 256, 200); x.font = '500 17px "Martian Mono", monospace'; x.fillStyle = '#9fe8a8';
      ['<html>', ' <body>', '  <h1>my first', '  website</h1>', ' </body>', '</html>'].forEach((l, k) => x.fillText(l, 18, 40 + k * 26));
    });
    mesh(new THREE.PlaneGeometry(0.44, 0.34), basic(0xffffff, { map: screen }), 0.7, 1.07, -1.495, g);
    box(0.5, 0.03, 0.18, lit(0xc9bfae), 0.7, 0.81, -1.42, g); mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), lit(0x6b4a32), 0.7, 0.48, -1.0, g); // keyboard, stool
    for (const s of [-0.12, 0.12]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 8), lit(0x2c3834), 0.7 + s, 0.23, -1.0, g);
    mesh(new THREE.PlaneGeometry(0.5, 0.6), basic(0xffffff, { map: canvasTex(200, 240, (x) => { x.fillStyle = '#f7efe2'; x.fillRect(0, 0, 200, 240); x.fillStyle = '#9e3b2c'; x.fillRect(0, 0, 200, 62); x.fillStyle = '#f7efe2'; x.textAlign = 'center'; x.font = '600 40px "Martian Mono", monospace'; x.fillText('2012', 100, 46); x.fillStyle = '#8c8a82'; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) x.fillRect(22 + c * 28, 86 + r * 36, 16, 16); }) }), -0.6, 1.7, -2.09, g);
    mesh(new THREE.PlaneGeometry(0.9, 1.0), basic(0x2a2f5a), 1.5, 1.75, -2.09, g); // the window: night
    mesh(new THREE.SphereGeometry(0.07, 12, 10), basic(0xfff0c4), 0.2, 2.35, -0.6, g);
  }

  const v = new THREE.Vector3(), scr = new THREE.Vector3();
  return {
    books, ways, openBook: open,
    found(id) { const w = ways.find((q) => q.id === id); w.found = true; w.flies.visible = false; },
    hover(i) { for (const [k, b] of books.entries()) b.want = k === i ? 1 : 0; },
    open(i) { opened = i; if (i >= 0) for (const c of covers) c.material = coverMats[i]; },
    get opened() { return opened; },
    // What a ray from the cursor is on: a book, a secret's way in, or nothing. Only things within reach of the camera count.
    pick(ray) {
      if (books[0].m.position.distanceTo(camera.position) < 7) { const hit = ray.intersectObjects(books.map((b) => b.m))[0]; if (hit) return { book: books.findIndex((b) => b.m === hit.object) }; } // the nearest one the ray meets
      for (const w of ways) if (w.id !== 'lab' && w.at.distanceTo(camera.position) < w.near && ray.ray.intersectsBox(w.box)) return { secret: w.id };
      return null;
    },
    update(t, dt, pointer) {
      for (const b of books) { b.pull += (b.want - b.pull) * Math.min(1, dt * 9); b.m.position.x = b.home + 0.27 * b.pull; b.m.visible = books.indexOf(b) !== opened || openK < 0.3; }
      openK += ((opened >= 0 ? 1 : 0) - openK) * Math.min(1, dt * 4); open.visible = openK > 0.02; open.scale.setScalar(0.3 + 0.55 * openK);
      if (open.visible) {
        covers[0].rotation.y = -(Math.PI - 0.35 - (1 - openK) * 1.2); covers[1].rotation.y = -(0.35 + (1 - openK) * 1.2);
        for (const [k, p] of pages.entries()) { const u = sstep(0, 1, ((t * 0.35 + k * 0.2) % 1.6) / 1.0); p.rotation.y = -(0.4 + u * (Math.PI - 0.8)); } // pages keep turning
        open.position.y = L + 2.74 + Math.sin(t * 1.1) * 0.03;
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
      for (const f of tick) f(t);
    },
  };
}
