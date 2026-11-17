// 07 The Signal Cabin: it runs the business too. An old railway signal box; each brass lever is an admin action.
// Enquiry cards ride in on little rails from the east windows. Pull a lever (or walk on) and its card goes from "New" to done, its lamp turns from red to green,
// the semaphore arm outside drops, and the admin panel on the north wall updates. All the data is made up and says so.
// Also here: the route map painted on the back of the Extras board wall, which the funicular passes.
import * as THREE from 'three';
import { CABIN, LEVERS, SIGNAL, H, BOARD } from './world.js';

const CREAM = '#f7efe2', INK = '#1e2a26', OXIDE = '#9e3b2c', BUTTER = '#f2d98b', TEAL = '#3f6e68', GREEN = '#2f9e5a';
function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const paint = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  paint(); document.fonts?.ready.then(paint);
  return Object.assign(t, { repaint: paint });
}
// What each lever does, as plain demo rows. Nothing here is a real customer or a real number.
export const JOBS = [
  { lever: 'ENQUIRY', card: ['New enquiry', 'Is the café open on Sunday?'], done: 'Replied' },
  { lever: 'BOOKING', card: ['New booking', 'Table for 4 · Saturday 8 pm'], done: 'Booked' },
  { lever: 'STOCK', card: ['Running low', 'Milk · 2 litres left'], done: 'Reordered' },
  { lever: 'BILLING', card: ['Bill due', 'Invoice 0042'], done: 'Paid' },
];

export function signalCabin({ scene, lowQuality }) {
  const root = new THREE.Group(); scene.add(root);
  const Y = H.signal, C = CABIN, tick = [], std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  const put = (geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const brass = std(0xc9a24a, { metalness: 0.3, roughness: 0.35 }), ink = std(0x1e2a26, { roughness: 0.5 }), teal = std(0x3f6e68, { roughness: 0.6 }), cream = std(0xf1e8d8), oxide = std(0x9e3b2c, { roughness: 0.7 }), timber = std(0x7a5536, { roughness: 0.7 });
  const cx = (C.x0 + C.x1) / 2, cz = (C.z0 + C.z1) / 2, W = C.x1 - C.x0, D = C.z1 - C.z0;

  // ---------- the platform: stone setts, a yellow edge line, a little station lamp ----------
  const setts = canvas(256, 256, (x, w) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = ['#bfb6a6', '#b3aa99', '#c8bfae'][(i * 3 + j) % 3]; x.fillRect(j * 32 + 1, i * 32 + 1, 30, 30); } });
  setts.wrapS = setts.wrapT = THREE.RepeatWrapping; setts.repeat.set((SIGNAL.x1 - SIGNAL.x0) / 2, (SIGNAL.z1 - SIGNAL.z0) / 2);
  put(new THREE.PlaneGeometry(SIGNAL.x1 - SIGNAL.x0, SIGNAL.z1 - SIGNAL.z0), new THREE.MeshStandardMaterial({ map: setts, roughness: 0.9 }), (SIGNAL.x0 + SIGNAL.x1) / 2, Y + 0.004, (SIGNAL.z0 + SIGNAL.z1) / 2).rotation.x = -Math.PI / 2;
  put(new THREE.BoxGeometry(0.18, 0.01, SIGNAL.z1 - SIGNAL.z0 - 0.4), std(0xe0b84a), SIGNAL.x0 + 0.35, Y + 0.01, (SIGNAL.z0 + SIGNAL.z1) / 2);

  // ---------- the cabin: a cream base, teal trim, windows all round the top, a hipped roof of red tiles ----------
  const floor = canvas(256, 256, (x, w) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#8a6040' : '#7a5536'; x.fillRect(0, i * 32, w, 32); x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(0, i * 32, w, 2); } });
  floor.wrapS = floor.wrapT = THREE.RepeatWrapping; floor.repeat.set(W / 2, D / 2);
  put(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floor, roughness: 0.7 }), cx, Y + 0.008, cz).rotation.x = -Math.PI / 2;
  const SILL = 1.25, HEAD = 3.2;
  // walls as a base, a sill and a head with mullions between: north (x along), east (z along), south (x along, from x0 + 1)
  const wall = (x0, x1, z0, z1, along) => {
    const len = along === 'x' ? x1 - x0 : z1 - z0, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, T = 0.3;
    const geo = (h) => (along === 'x' ? new THREE.BoxGeometry(len, h, T) : new THREE.BoxGeometry(T, h, len));
    put(geo(SILL), cream, mx, Y + SILL / 2, mz); put(geo(0.08), teal, mx, Y + SILL + 0.04, mz); put(geo(0.05), teal, mx, Y + 0.12, mz);
    put(geo(C.h - HEAD), cream, mx, Y + (HEAD + C.h) / 2, mz);
    const n = Math.round(len / 0.75);
    for (let k = 0; k <= n; k++) { const u = -len / 2 + (k * len) / n; put(along === 'x' ? new THREE.BoxGeometry(0.07, HEAD - SILL, 0.12) : new THREE.BoxGeometry(0.12, HEAD - SILL, 0.07), teal, along === 'x' ? mx + u : mx, Y + (SILL + HEAD) / 2, along === 'x' ? mz : mz + u); }
    put(along === 'x' ? new THREE.BoxGeometry(len, 0.04, 0.1) : new THREE.BoxGeometry(0.1, 0.04, len), teal, mx, Y + 2.3, mz); // the transom
  };
  wall(C.x0, C.x1 + 0.3, C.z0 - 0.3, C.z0, 'x');
  wall(C.x1, C.x1 + 0.3, C.z0, C.z1 + 0.3, 'z');
  wall(C.x0 + 1, C.x1, C.z1, C.z1 + 0.3, 'x');
  put(new THREE.BoxGeometry(0.24, C.h, 0.24), teal, C.x0, Y + C.h / 2, C.z0);
  // the roof: a low hip of oxide tiles with deep eaves and a white fascia
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4, 1), oxide); roof.rotation.y = Math.PI / 4; roof.scale.set((W + 1.6) / Math.SQRT2, 1.3, (D + 1.6) / Math.SQRT2); roof.position.set(cx + 0.1, Y + C.h + 0.25 + 0.65, cz); root.add(roof);
  put(new THREE.BoxGeometry(W + 1.2, 0.2, D + 1.2), cream, cx + 0.1, Y + C.h + 0.15, cz);
  put(new THREE.BoxGeometry(0.12, 0.6, 0.12), ink, cx + 0.1, Y + C.h + 1.6, cz); // a finial
  // the name board, as on any station: white, black letters
  const nameTex = canvas(512, 96, (x, w, h) => { x.fillStyle = '#fbf8f0'; x.fillRect(0, 0, w, h); x.strokeStyle = INK; x.lineWidth = 6; x.strokeRect(4, 4, w - 8, h - 8); x.fillStyle = INK; x.font = '600 46px "Familjen Grotesk", Arial, sans-serif'; x.textAlign = 'center'; x.fillText('SIGNAL CABIN', w / 2, 64); });
  put(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshStandardMaterial({ map: nameTex }), cx, Y + C.h - 0.15, C.z1 + 0.32);
  put(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshStandardMaterial({ map: nameTex }), C.x0 - 0.02, Y + C.h - 0.15, cz).rotation.y = -Math.PI / 2;

  // ---------- the lever frame: four tall levers on the east side, each with a brass number plate and a lamp over it ----------
  const levers = [], lamps = [], cards = [], rails = [];
  const frameX = C.x1 - 0.55;
  put(new THREE.BoxGeometry(0.9, 0.5, 4.8), ink, frameX, Y + 0.25, -28); // the frame's iron bed
  put(new THREE.BoxGeometry(0.95, 0.06, 4.9), brass, frameX, Y + 0.52, -28);
  for (const [k, L] of LEVERS.entries()) {
    const pivot = new THREE.Group(); pivot.position.set(frameX, Y + 0.5, L.z); root.add(pivot);
    put(new THREE.BoxGeometry(0.07, 1.25, 0.09), k % 2 ? oxide : std(0x2f5fa8, { roughness: 0.5 }), 0, 0.62, 0, pivot); // a coloured lever, as on a real frame
    put(new THREE.BoxGeometry(0.1, 0.16, 0.12), brass, 0, 1.25, 0, pivot);
    put(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 10), brass, 0, 1.36, 0, pivot).rotation.x = Math.PI / 2;
    pivot.rotation.z = -0.35; // forward: "on"
    const plate = canvas(256, 64, (x, w, h) => { x.fillStyle = '#c9a24a'; x.fillRect(0, 0, w, h); x.fillStyle = INK; x.font = '600 30px "Martian Mono", monospace'; x.fillText(`${k + 1} ${L.name}`, 14, 44); });
    put(new THREE.PlaneGeometry(0.62, 0.16), new THREE.MeshStandardMaterial({ map: plate, metalness: 0.2, roughness: 0.4 }), frameX - 0.46, Y + 0.32, L.z).rotation.y = -Math.PI / 2;
    // the lamp: a little railway lamp on the window head, red until the job is done
    const lamp = put(new THREE.SphereGeometry(0.08, 14, 10), new THREE.MeshStandardMaterial({ color: 0x601010, emissive: 0xff3020, emissiveIntensity: 1.6 }), C.x1 - 0.2, Y + HEAD + 0.12, L.z);
    put(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 14), ink, C.x1 - 0.2, Y + HEAD + 0.22, L.z);
    // a little rail from the window down to the lever: the card rides in on it
    const r0 = new THREE.Vector3(C.x1 - 0.15, Y + 2.7, L.z), r1 = new THREE.Vector3(frameX - 0.6, Y + 1.85, L.z);
    const rail = put(new THREE.CylinderGeometry(0.008, 0.008, r0.distanceTo(r1), 5), brass, 0, 0, 0); rail.position.copy(r0).add(r1).multiplyScalar(0.5); rail.lookAt(r1); rail.rotateX(Math.PI / 2);
    const job = JOBS[k];
    const card = canvas(320, 200, (x, w, h, done = cards[k]?.userData.done) => {
      x.fillStyle = '#fffaf0'; x.beginPath(); x.roundRect(0, 0, w, h, 18); x.fill(); x.strokeStyle = 'rgba(30,42,38,0.2)'; x.lineWidth = 3; x.stroke();
      x.fillStyle = done ? GREEN : OXIDE; x.beginPath(); x.roundRect(16, 16, done ? 150 : 170, 36, 18); x.fill(); x.fillStyle = '#fff'; x.font = '600 20px "Familjen Grotesk", Arial, sans-serif'; x.fillText(done ? '✓ ' + job.done : job.card[0], 32, 41);
      x.fillStyle = INK; x.font = '500 27px Fraunces, Georgia, serif'; const words = job.card[1]; x.fillText(words.length > 18 ? words.slice(0, words.lastIndexOf(' ', 18)) : words, 18, 104); if (words.length > 18) x.fillText(words.slice(words.lastIndexOf(' ', 18) + 1), 18, 138);
      x.fillStyle = '#8c8a82'; x.font = '500 14px "Martian Mono", monospace'; x.fillText('DEMO DATA', 18, 182);
    });
    const cm = put(new THREE.PlaneGeometry(0.62, 0.39), new THREE.MeshStandardMaterial({ map: card, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.15, emissiveMap: card }), 0, 0, 0);
    cm.rotation.y = -Math.PI / 2 + 0.25; cm.userData = { tex: card, done: false, r0, r1 };
    levers.push(pivot); lamps.push(lamp); cards.push(cm); rails.push(rail);
  }

  // ---------- the semaphore outside the north-east corner: its arm drops a notch for every job done ----------
  const post = new THREE.Group(); post.position.set(C.x1 + 0.9, Y, C.z0 - 0.9); root.add(post);
  put(new THREE.CylinderGeometry(0.07, 0.1, 5.2, 10), cream, 0, 2.6, 0, post);
  put(new THREE.BoxGeometry(0.5, 0.06, 0.5), ink, 0, 5.25, 0, post);
  const arm = new THREE.Group(); arm.position.set(0.12, 4.6, 0); post.add(arm);
  put(new THREE.BoxGeometry(1.2, 0.2, 0.04), oxide, -0.6, 0, 0, arm); put(new THREE.BoxGeometry(0.1, 0.22, 0.05), cream, -0.95, 0, 0.01, arm);
  const semLamp = put(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0x601010, emissive: 0xff3020, emissiveIntensity: 1.6 }), 0.15, -0.05, 0.08, arm);
  for (let k = 0; k < 9; k++) put(new THREE.BoxGeometry(0.4, 0.03, 0.03), ink, 0, 0.4 + k * 0.5, 0.12, post); // the ladder

  // ---------- the admin panel on the north wall, between the windows: the same four jobs as a dashboard ----------
  const done = [0, 0, 0, 0];
  const panel = canvas(1024, 576, (x, w, h) => {
    x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); x.fillStyle = INK; x.fillRect(0, 0, w, 64); x.fillStyle = CREAM; x.font = '500 30px Fraunces, Georgia, serif'; x.fillText('Admin', 28, 43);
    x.fillStyle = BUTTER; x.font = '500 18px "Martian Mono", monospace'; x.fillText('DEMO DATA · NOTHING HERE IS REAL', 560, 40);
    const n = done.filter(Boolean).length;
    [['New enquiries', 1 - done[0]], ['Bookings to confirm', 1 - done[1]], ['Stock running low', 1 - done[2]], ['Bills due', 1 - done[3]]].forEach(([t, v], k) => {
      const bx = 28 + k * 246; x.fillStyle = v ? '#f6e3dd' : '#dcefe2'; x.beginPath(); x.roundRect(bx, 90, 226, 130, 16); x.fill();
      x.fillStyle = INK; x.font = '500 64px Fraunces, Georgia, serif'; x.fillText(String(v), bx + 20, 170); x.font = '500 18px "Familjen Grotesk", Arial, sans-serif'; x.fillText(t, bx + 20, 202);
    });
    JOBS.forEach((j, k) => {
      const by = 250 + k * 70; x.fillStyle = k % 2 ? '#f6eee0' : '#efe6d6'; x.fillRect(28, by, w - 56, 60);
      x.fillStyle = INK; x.font = '500 24px "Familjen Grotesk", Arial, sans-serif'; x.fillText(j.card[1], 48, by + 39);
      x.fillStyle = done[k] ? GREEN : OXIDE; x.beginPath(); x.roundRect(w - 230, by + 12, 180, 36, 18); x.fill(); x.fillStyle = '#fff'; x.font = '600 18px "Familjen Grotesk", Arial, sans-serif'; x.fillText(done[k] ? j.done : j.card[0], w - 212, by + 37);
    });
    x.fillStyle = '#8c8a82'; x.font = '500 16px "Martian Mono", monospace'; x.fillText(`${n} OF 4 DONE · STAFF LOGIN · BACKUPS EVERY DAY`, 28, h - 22);
  });
  put(new THREE.BoxGeometry(2.25, 1.3, 0.06), ink, 29.6, Y + 2.0, C.z0 + 0.04);
  const screen = put(new THREE.PlaneGeometry(2.15, 1.21), new THREE.MeshBasicMaterial({ map: panel }), 29.6, Y + 2.0, C.z0 + 0.08);
  screen.userData.k = 0;

  // ---------- the desk on the south wall: a logbook, a telegraph key and a cup of tea, all floating just over it ----------
  put(new THREE.BoxGeometry(2.4, 0.06, 0.75), timber, 29.4, Y + 0.88, C.z1 - 0.38);
  for (const sx of [-1.1, 1.1]) put(new THREE.BoxGeometry(0.06, 0.85, 0.6), timber, 29.4 + sx, Y + 0.43, C.z1 - 0.38);
  const desk = new THREE.Group(); desk.position.set(29.4, Y + 1.05, C.z1 - 0.38); root.add(desk);
  const book = new THREE.Group(); book.position.set(-0.6, 0, 0); desk.add(book);
  put(new THREE.BoxGeometry(0.42, 0.06, 0.3), std(0x6b2a22), 0, 0, 0, book); put(new THREE.BoxGeometry(0.4, 0.05, 0.28), std(0xf6eee0), 0.01, 0.002, 0, book);
  const key = new THREE.Group(); key.position.set(0.1, 0, 0); desk.add(key);
  put(new THREE.BoxGeometry(0.2, 0.03, 0.12), timber, 0, 0, 0, key); const knob = put(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 10), ink, 0.05, 0.06, 0, key);
  const cup = new THREE.Group(); cup.position.set(0.7, 0, 0); desk.add(cup);
  put(new THREE.CylinderGeometry(0.045, 0.035, 0.08, 14), cream, 0, 0.04, 0, cup); put(new THREE.TorusGeometry(0.025, 0.008, 6, 10), cream, 0.05, 0.04, 0, cup);
  tick.push((t) => { book.position.y = 0.03 + Math.sin(t * 0.6) * 0.02; book.rotation.z = Math.sin(t * 0.4) * 0.05; cup.position.y = 0.05 + Math.sin(t * 0.8 + 1) * 0.025; key.position.y = 0.02 + Math.sin(t * 0.7 + 2) * 0.015; knob.position.y = 0.06 - (Math.sin(t * 9) > 0.7 ? 0.012 : 0); }); // the key taps out something now and then
  // a pendant lamp in the middle of the room
  put(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 4), ink, cx, Y + C.h - 0.35, cz);
  put(new THREE.ConeGeometry(0.25, 0.18, 18, 1, true), teal, cx, Y + C.h - 0.75, cz);
  put(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc070, emissiveIntensity: 2 }), cx, Y + C.h - 0.82, cz);

  // ---------- the route map painted on the back of the Extras board wall: the whole Sky Quarter, and the next stop ----------
  const route = canvas(1536, 640, (x, w, h) => {
    x.fillStyle = '#f1e6cf'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(120,90,60,0.08)'; for (let i = 0; i < 500; i++) x.fillRect((i * 733) % w, (i * 389) % h, 3, 3);
    x.fillStyle = OXIDE; x.fillRect(0, 0, w, 110); x.fillStyle = CREAM; x.font = '500 64px Fraunces, Georgia, serif'; x.fillText('The Sky Quarter', 50, 78); x.font = '500 26px "Martian Mono", monospace'; x.fillText('ROUTE OF THE WALK', w - 420, 70);
    const stops = ['Landing', 'Home', 'Drafting Room', 'Signal Cabin', 'Extras', 'Greenhouse', 'Rooftop'];
    x.strokeStyle = INK; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.moveTo(120, 380); x.lineTo(w - 120, 380); x.stroke();
    stops.forEach((s, k) => {
      const px = 120 + (k * (w - 240)) / (stops.length - 1), next = s === 'Signal Cabin';
      x.fillStyle = next ? OXIDE : CREAM; x.strokeStyle = INK; x.lineWidth = 8; x.beginPath(); x.arc(px, 380, next ? 34 : 24, 0, 7); x.fill(); x.stroke();
      x.fillStyle = INK; x.font = `${next ? 600 : 400} 34px "Familjen Grotesk", Arial, sans-serif`; x.textAlign = 'center'; x.fillText(s, px, k % 2 ? 460 : 320);
      if (next) { x.fillStyle = OXIDE; x.font = '500 22px "Martian Mono", monospace'; x.fillText('NEXT STOP', px, 270 - 0); }
    });
    x.textAlign = 'left'; x.fillStyle = TEAL; x.font = 'italic 400 34px Fraunces, Georgia, serif'; x.fillText('Every stop is a little higher than the last.', 50, h - 50);
  });
  put(new THREE.PlaneGeometry(11.4, 4.75), new THREE.MeshStandardMaterial({ map: route, roughness: 0.95 }), BOARD.x, H.extras + 2.5, -24.31).rotation.y = Math.PI;

  // ---------- state: a lever is pulled by a click, or by the walk going on to the panel ----------
  const clicked = [false, false, false, false], shown = [0, 0, 0, 0], arrive = [0, 0, 0, 0];
  const pivotOf = (o) => { while (o && !levers.includes(o)) o = o.parent; return o; };
  const hit = (ray) => { const h = ray.intersectObjects(levers, true)[0]; return h ? levers.indexOf(pivotOf(h.object)) : -1; };
  let hot = -1;
  return {
    over(ray) { hot = hit(ray); return hot >= 0; },
    pick(ray) { const k = hit(ray); if (k < 0) return false; clicked[k] = !clicked[k]; return true; },
    // inCards: 0..1 the cards riding in (the walk arriving); auto: 0..1 the walk going on to the panel, which pulls any lever not yet pulled, one after another
    update(t, dt, inCards, auto) {
      let changed = false;
      for (let k = 0; k < 4; k++) {
        const on = clicked[k] || auto > (k + 0.5) / 4.5;
        shown[k] += ((on ? 1 : 0) - shown[k]) * Math.min(1, dt * 6);
        levers[k].rotation.z = -0.35 + shown[k] * 0.75 + (k === hot ? Math.sin(t * 6) * 0.02 : 0);
        lamps[k].material.color.setHex(on ? 0x106030 : 0x601010); lamps[k].material.emissive.setHex(on ? 0x30ff70 : 0xff3020);
        if (on !== done[k] > 0) { done[k] = on ? 1 : 0; changed = true; }
        const c = cards[k]; arrive[k] = Math.min(1, Math.max(0, inCards * 1.6 - k * 0.2));
        c.position.lerpVectors(c.userData.r0, c.userData.r1, arrive[k]); c.position.y += 0.22 + Math.sin(t * 1.2 + k) * 0.015; c.visible = arrive[k] > 0.01;
        if (c.userData.done !== on) { c.userData.done = on; c.userData.tex.repaint(); }
      }
      if (changed) panel.repaint();
      arm.rotation.z = -(shown.reduce((a, b) => a + b, 0) / 4) * 0.7; // all four done: the arm is down, the line is clear
      semLamp.material.emissive.setHex(done.every(Boolean) ? 0x30ff70 : 0xff3020);
      for (const f of tick) f(t, dt);
    },
  };
}
