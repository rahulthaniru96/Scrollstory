// 08 Extras grows a map room: being found. A brass relief map of Hyderabad on a table beside the departures board.
// As each add-on flips in on the board, a pin rises on the map; at the map's own stop a QR code unfolds in the air like origami, beside a business profile card.
// The map is drawn, not surveyed: a few real landmarks for orientation, and no real business on it. The QR is a made-up pattern; it opens nothing.
import * as THREE from 'three';
import { MAP, H, EXTRAS } from './world.js';

const CREAM = '#f7efe2', INK = '#1e2a26', OXIDE = '#9e3b2c', BUTTER = '#f2d98b', TEAL = '#3f6e68';
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const paint = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  paint(); document.fonts?.ready.then(paint);
  return t;
}

export function mapRoom({ scene, lowQuality }) {
  const root = new THREE.Group(); root.position.set(MAP.x, H.extras, MAP.z); scene.add(root);
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  const put = (geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const brass = std(0xc9a24a, { metalness: 0.3, roughness: 0.35 }), timber = std(0x6b4a32, { roughness: 0.6 }), ink = std(0x1e2a26, { roughness: 0.5 });
  const W = MAP.w, D = MAP.d, TOP = 0.95;

  // ---------- the table: dark timber, turned legs, a brass rim round the map ----------
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { put(new THREE.CylinderGeometry(0.06, 0.045, TOP - 0.08, 10), timber, sx * (W / 2 - 0.15), (TOP - 0.08) / 2, sz * (D / 2 - 0.15)); put(new THREE.SphereGeometry(0.07, 10, 8), timber, sx * (W / 2 - 0.15), 0.4, sz * (D / 2 - 0.15)); }
  put(new THREE.BoxGeometry(W, 0.08, D), timber, 0, TOP - 0.04, 0);
  for (const [w, d, x, z] of [[W + 0.06, 0.06, 0, D / 2], [W + 0.06, 0.06, 0, -D / 2], [0.06, D, W / 2, 0], [0.06, D, -W / 2, 0]]) put(new THREE.BoxGeometry(w, 0.1, d), brass, x, TOP + 0.02, z);

  // ---------- the map: brass, with the lake sunk in resin, the river cut in, the roads raised, a few low hills ----------
  const mapTex = canvas(1024, 820, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#d9b77a'); g.addColorStop(1, '#b8914f'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(90,60,20,0.08)'; for (let i = 0; i < 1400; i++) x.fillRect((i * 733) % w, (i * 389) % h, 2, 2);
    x.strokeStyle = 'rgba(80,55,20,0.35)'; x.lineWidth = 6; x.beginPath(); x.ellipse(w * 0.5, h * 0.52, w * 0.43, h * 0.42, 0, 0, 7); x.stroke(); // the outer ring road
    x.lineWidth = 4; for (let k = 0; k < 8; k++) { const an = (k / 8) * Math.PI * 2 + 0.3; x.beginPath(); x.moveTo(w * 0.5, h * 0.52); x.lineTo(w * 0.5 + Math.cos(an) * w * 0.47, h * 0.52 + Math.sin(an) * h * 0.46); x.stroke(); } // roads going out of town
    x.strokeStyle = '#4f7f86'; x.lineWidth = 12; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, h * 0.68); x.bezierCurveTo(w * 0.3, h * 0.6, w * 0.45, h * 0.78, w * 0.7, h * 0.66); x.bezierCurveTo(w * 0.85, h * 0.6, w * 0.9, h * 0.72, w, h * 0.7); x.stroke(); // the Musi
    x.fillStyle = INK; x.font = 'italic 500 30px Fraunces, Georgia, serif'; x.fillText('Musi', w * 0.18, h * 0.7);
    x.fillText('Hussain Sagar', w * 0.47, h * 0.3); x.fillText('Secunderabad', w * 0.6, h * 0.14);
    x.font = '500 18px "Martian Mono", monospace'; x.fillStyle = 'rgba(30,42,38,0.7)'; x.fillText('HYDERABAD · DRAWN, NOT TO SCALE', 30, h - 26);
    // the compass rose
    x.save(); x.translate(w - 90, h - 100); x.fillStyle = INK; x.beginPath(); x.moveTo(0, -50); x.lineTo(10, 0); x.lineTo(0, 50); x.lineTo(-10, 0); x.fill(); x.font = '600 22px Fraunces, serif'; x.fillText('N', -8, -58); x.restore();
  });
  put(new THREE.PlaneGeometry(W - 0.1, D - 0.1), new THREE.MeshStandardMaterial({ map: mapTex, metalness: 0.25, roughness: 0.45 }), 0, TOP + 0.005, 0).rotation.x = -Math.PI / 2;
  // the lake: a teardrop of blue-green resin set just above the brass
  const lake = new THREE.Shape(); lake.moveTo(0, 0.2); lake.bezierCurveTo(0.2, 0.18, 0.24, -0.1, 0.05, -0.22); lake.bezierCurveTo(-0.12, -0.2, -0.2, 0.05, 0, 0.2);
  const lk = put(new THREE.ShapeGeometry(lake), new THREE.MeshStandardMaterial({ color: 0x5f9aa0, roughness: 0.15, metalness: 0.1 }), 0.05, TOP + 0.012, -0.25); lk.rotation.x = -Math.PI / 2; lk.scale.setScalar(1.4);
  for (const [x, z, r] of [[-0.9, -0.6, 0.22], [-1.1, 0.5, 0.16], [1.0, 0.6, 0.18], [0.7, -0.75, 0.12]]) put(new THREE.SphereGeometry(r, 14, 8), std(0xb8914f, { metalness: 0.25, roughness: 0.5 }), x, TOP, z).scale.y = 0.25; // low hills
  // the clock tower, small, in brass, at Secunderabad
  put(new THREE.BoxGeometry(0.05, 0.22, 0.05), brass, 0.35, TOP + 0.11, -0.86); put(new THREE.ConeGeometry(0.045, 0.06, 4), brass, 0.35, TOP + 0.25, -0.86);

  // ---------- the pins: one rises for each add-on as the board flips it. A coloured head and a small flag with its name ----------
  const COLORS = [0x9e3b2c, 0x2f5fa8, 0x3f6e68, 0xe8a89a], SPOTS = [[-0.6, -0.2], [0.55, 0.15], [-0.25, 0.55], [0.85, -0.45]];
  const pins = EXTRAS.map((e, i) => {
    const g = new THREE.Group(); g.position.set(SPOTS[i][0], TOP, SPOTS[i][1]); root.add(g);
    put(new THREE.CylinderGeometry(0.008, 0.002, 0.42, 6), brass, 0, 0.21, 0, g);
    put(new THREE.SphereGeometry(0.05, 14, 10), std(COLORS[i], { roughness: 0.35 }), 0, 0.44, 0, g);
    const flag = canvas(256, 64, (x, w, h) => { x.fillStyle = CREAM; x.fillRect(0, 0, w, h); x.fillStyle = '#' + COLORS[i].toString(16).padStart(6, '0'); x.fillRect(0, 0, 14, h); x.fillStyle = INK; x.font = '600 26px "Familjen Grotesk", Arial, sans-serif'; x.fillText(e.title, 26, 42); });
    const f = put(new THREE.PlaneGeometry(0.36, 0.09), new THREE.MeshStandardMaterial({ map: flag, side: THREE.DoubleSide }), 0.19, 0.36, 0, g);
    const ring = put(new THREE.RingGeometry(0.04, 0.06, 24), new THREE.MeshBasicMaterial({ color: COLORS[i], transparent: true, opacity: 0, depthWrite: false }), 0, 0.003, 0, g); ring.rotation.x = -Math.PI / 2;
    return { g, f, ring };
  });

  // ---------- the QR code, folded like paper: four flaps open out of a small square, then it hangs in the air over the map ----------
  const qr = canvas(256, 256, (x, w) => {
    x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, w); const N = 25, s = (w - 32) / N;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = INK; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (rnd() > 0.52) x.fillRect(16 + i * s, 16 + j * s, s, s);
    for (const [fx, fy] of [[0, 0], [N - 7, 0], [0, N - 7]]) { x.fillStyle = '#fffaf0'; x.fillRect(16 + fx * s - s, 16 + fy * s - s, 9 * s, 9 * s); x.fillStyle = INK; x.fillRect(16 + fx * s, 16 + fy * s, 7 * s, 7 * s); x.fillStyle = '#fffaf0'; x.fillRect(16 + (fx + 1) * s, 16 + (fy + 1) * s, 5 * s, 5 * s); x.fillStyle = INK; x.fillRect(16 + (fx + 2) * s, 16 + (fy + 2) * s, 3 * s, 3 * s); }
    x.fillStyle = OXIDE; x.fillRect(w / 2 - 34, w / 2 - 12, 68, 24); x.fillStyle = '#fff'; x.font = '600 14px "Martian Mono", monospace'; x.fillText('SAMPLE', w / 2 - 28, w / 2 + 5);
  });
  // the square cut in a 3 x 3 grid: the middle stays, the four edges fold up, the four corners fold behind them
  const qrRoot = new THREE.Group(); qrRoot.position.set(-0.1, 1.95, 0.05); root.add(qrRoot);
  const S = 0.75 / 3, flaps = [];
  const tile = (i, j) => { const geo = new THREE.PlaneGeometry(S, S), uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, (i + uv.getX(k)) / 3, (j + uv.getY(k)) / 3); return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: qr, side: THREE.DoubleSide, roughness: 0.9 })); };
  qrRoot.add(tile(1, 1));
  for (const [i, j, ax, sign] of [[1, 2, 'x', -1], [1, 0, 'x', 1], [0, 1, 'y', 1], [2, 1, 'y', -1]]) { // top, bottom, left, right
    const hinge = new THREE.Group(); hinge.position.set((i - 1) * S / 2, (j - 1) * S / 2, 0); qrRoot.add(hinge);
    const m = tile(i, j); m.position.set((i - 1) * S / 2, (j - 1) * S / 2, 0); hinge.add(m);
    for (const ci of i === 1 ? [0, 2] : []) { const c = tile(ci, j); c.position.set((ci - 1) * S, (j - 1) * S / 2, 0); hinge.add(c); } // the corners ride on the top and bottom flaps
    flaps.push({ hinge, ax, sign });
  }
  // a business profile card, as on a map app: made up, and it says so
  const prof = canvas(512, 300, (x, w, h) => {
    x.fillStyle = '#fffaf0'; x.beginPath(); x.roundRect(0, 0, w, h, 26); x.fill();
    x.fillStyle = INK; x.font = '500 38px Fraunces, Georgia, serif'; x.fillText('Your business', 28, 62);
    x.fillStyle = '#2f9e5a'; x.font = '600 22px "Familjen Grotesk", Arial, sans-serif'; x.fillText('Open now', 28, 100); x.fillStyle = '#5b625e'; x.fillText('· Secunderabad', 130, 100);
    ['Directions', 'Call', 'WhatsApp'].forEach((t, k) => { x.fillStyle = k === 2 ? '#25d366' : '#efe6d6'; x.beginPath(); x.roundRect(28 + k * 158, 130, 146, 50, 25); x.fill(); x.fillStyle = k === 2 ? '#fff' : INK; x.font = '600 20px "Familjen Grotesk", Arial, sans-serif'; x.fillText(t, 46 + k * 158, 162); });
    x.fillStyle = '#8c8a82'; x.font = '500 15px "Martian Mono", monospace'; x.fillText('BUSINESS PROFILE · SET UP IN EVERY PLAN', 28, 236); x.fillText('SAMPLE CARD · NOT A REAL LISTING', 28, 266);
  });
  const card = put(new THREE.PlaneGeometry(0.86, 0.5), new THREE.MeshStandardMaterial({ map: prof, transparent: true, side: THREE.DoubleSide }), 0.75, 1.75, 0.2); card.rotation.y = -0.35;

  root.rotation.y = Math.PI / 2; // the walk looks at it from the east: the map's north is to the right, as the room's is
  return {
    update(t, dt, u, open) { // u: each add-on's flip, 0 to 1; open: 0 to 1 at the map's stop
      pins.forEach((p, i) => {
        const k = sstep(0.4, 1, u[i]);
        p.g.position.y = TOP + (1 - k) * -0.44; p.g.visible = k > 0.01; p.f.rotation.y = Math.sin(t * 2 + i) * 0.25;
        const r = (t * 0.6 + i * 0.25) % 1; p.ring.scale.setScalar(1 + r * 4); p.ring.material.opacity = k * (1 - r) * 0.6;
      });
      const o = sstep(0, 0.8, open);
      qrRoot.visible = card.visible = open > 0.01;
      qrRoot.scale.setScalar(0.3 + 0.7 * o); qrRoot.rotation.y = (1 - o) * 2.5 + Math.sin(t * 0.5) * 0.1; qrRoot.position.y = 1.4 + o * 0.55 + Math.sin(t * 0.8) * 0.03;
      flaps.forEach((f, k) => { const a = (1 - sstep(k * 0.12, 0.5 + k * 0.12, o)) * Math.PI * 0.98; if (f.ax === 'x') f.hinge.rotation.x = f.sign * a; else f.hinge.rotation.y = f.sign * a; });
      card.material.opacity = sstep(0.5, 1, open); card.position.y = 1.6 + sstep(0.5, 1, open) * 0.15;
    },
  };
}
