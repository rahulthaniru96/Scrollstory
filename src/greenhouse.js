// 09 The Greenhouse: care plans. "We don't launch and leave. We look after it."
// A deco glasshouse at the end of a terrace. Five potted plants on the staging are one site at five ages of care, from week 1 to year 1.
// The gardener's tools are a care plan's parts (business-and-pricing.md): a watering can that tips by itself (updates), a seed vault that glows (backups),
// a gauge with a steady heartbeat (uptime), a ledger whose pages turn (a few small changes a month). Click any of them and it does its job.
import * as THREE from 'three';
import { GREEN, H } from './world.js';
// One site in care, seen at five ages: the longer it is looked after, the bigger it grows.
const AGES = [['Week 1', 0xc46f4f], ['Month 1', 0xe8a89a], ['Month 3', 0xf2d98b], ['Month 6', 0xcdbbff], ['Year 1', 0x3f6e68]];

const CREAM = '#f7efe2', INK = '#1e2a26', OXIDE = '#9e3b2c', BUTTER = '#f2d98b', TEAL = '#3f6e68';
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const paint = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  paint(); document.fonts?.ready.then(paint);
  return t;
}
export const VAULT_X = 29, LECTERN = [32.1, -2.9]; // the glass vault starts here; the ledger stands by the vault (world.js keeps their solid parts)

export function greenhouse({ scene, lowQuality }) {
  const root = new THREE.Group(); scene.add(root);
  const Y = H.greenhouse, G = GREEN, tick = [], std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  const put = (geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const brass = std(0xc9a24a, { metalness: 0.3, roughness: 0.35 }), iron = std(0xf4f1e8, { roughness: 0.5 }), timber = std(0x8a6040, { roughness: 0.7 }), ink = std(0x1e2a26, { roughness: 0.5 });
  const leafMat = std(0x5f8f5a, { roughness: 0.7 }), leaf2 = std(0x7fae7a, { roughness: 0.7 });
  const cz = (G.z0 + G.z1) / 2, D = G.z1 - G.z0, WALL = 3.0;

  // ---------- floor: terracotta tiles with a cream path down the middle; the terrace part is plain stone ----------
  const tiles = canvas(256, 256, (x, w) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = ['#c46f4f', '#b8644a', '#cf7b58'][(i + j * 2) % 3]; x.fillRect(j * 32 + 1, i * 32 + 1, 30, 30); } });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set((G.x1 - VAULT_X) / 1.6, D / 1.6);
  put(new THREE.PlaneGeometry(G.x1 - VAULT_X, D), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.85 }), (VAULT_X + G.x1) / 2, Y + 0.006, cz).rotation.x = -Math.PI / 2;
  put(new THREE.PlaneGeometry(G.x1 - VAULT_X, 1.2), std(0xe9e1d2), (VAULT_X + G.x1) / 2, Y + 0.01, cz - 0.6).rotation.x = -Math.PI / 2;
  put(new THREE.PlaneGeometry(VAULT_X - G.x0, D), std(0xcfc6b4), (G.x0 + VAULT_X) / 2, Y + 0.006, cz).rotation.x = -Math.PI / 2;

  // ---------- the glasshouse: white iron ribs in low arches, glass between, a fan window in the east gable ----------
  const glass = new THREE.MeshStandardMaterial({ color: 0xd9efe8, transparent: true, opacity: 0.16, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const ARCH = 2.4, ribs = Math.round((G.x1 - VAULT_X) / 1.5);
  const archCurve = () => new THREE.EllipseCurve(0, 0, D / 2, ARCH, 0, Math.PI);
  for (let k = 0; k <= ribs; k++) {
    const x = VAULT_X + (k * (G.x1 - VAULT_X)) / ribs, pts = archCurve().getPoints(lowQuality ? 16 : 28).map((p) => new THREE.Vector3(x, Y + WALL + p.y, cz + p.x));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.045, 6), iron));
    for (const z of [G.z0, G.z1]) put(new THREE.BoxGeometry(0.09, WALL, 0.09), iron, x, Y + WALL / 2, z);
  }
  for (const z of [G.z0, G.z1]) { // the long walls: glass over a low brick base, with an iron rail at the top
    put(new THREE.BoxGeometry(G.x1 - VAULT_X, 0.5, 0.18), std(0xb8644a), (VAULT_X + G.x1) / 2, Y + 0.25, z);
    put(new THREE.PlaneGeometry(G.x1 - VAULT_X, WALL - 0.5), glass, (VAULT_X + G.x1) / 2, Y + 0.5 + (WALL - 0.5) / 2, z);
    put(new THREE.BoxGeometry(G.x1 - VAULT_X, 0.08, 0.1), iron, (VAULT_X + G.x1) / 2, Y + WALL, z);
    // the terrace: a glass balustrade with a brass handrail
    put(new THREE.PlaneGeometry(VAULT_X - G.x0, 1.0), glass, (G.x0 + VAULT_X) / 2, Y + 0.5, z);
    put(new THREE.CylinderGeometry(0.03, 0.03, VAULT_X - G.x0, 8), brass, (G.x0 + VAULT_X) / 2, Y + 1.02, z).rotation.z = Math.PI / 2;
  }
  // the vault's glass skin: a half cylinder squashed to the arch
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, G.x1 - VAULT_X, lowQuality ? 16 : 32, 1, true, -Math.PI / 2, Math.PI), glass);
  skin.rotation.z = Math.PI / 2; skin.scale.set(ARCH, 1, D / 2); skin.position.set((VAULT_X + G.x1) / 2, Y + WALL, cz); root.add(skin);
  // the east gable: glass with a fan of iron in the arch and a brass sunburst at its foot
  const gable = new THREE.Shape(); gable.moveTo(-D / 2, 0); gable.lineTo(D / 2, 0); gable.lineTo(D / 2, WALL); gable.absellipse(0, WALL, D / 2, ARCH, 0, Math.PI, false); gable.lineTo(-D / 2, 0);
  const gm = put(new THREE.ShapeGeometry(gable), glass, G.x1, Y, cz); gm.rotation.y = -Math.PI / 2;
  for (let k = 0; k <= 8; k++) { const an = (k / 8) * Math.PI, r = put(new THREE.BoxGeometry(0.04, 0.04, 1), iron, G.x1 - 0.02, 0, 0); const len = Math.hypot(Math.cos(an) * D / 2, Math.sin(an) * ARCH); r.scale.z = len; r.position.set(G.x1 - 0.02, Y + WALL + (Math.sin(an) * ARCH) / 2, cz + (Math.cos(an) * D) / 4); r.rotation.x = -Math.atan2(Math.sin(an) * ARCH, Math.cos(an) * D / 2); }
  put(new THREE.CircleGeometry(0.5, 24, 0, Math.PI), brass, G.x1 - 0.03, Y + WALL, cz).rotation.y = -Math.PI / 2;
  // hanging baskets from the ribs, trailing leaves
  for (let k = 1; k < ribs; k += 1) for (const s of [-1, 1]) {
    const x = VAULT_X + (k * (G.x1 - VAULT_X)) / ribs, z = cz + s * 2.6, y = Y + WALL + 0.6;
    put(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 4), ink, x, y + 0.6, z);
    put(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0x9b6b42), x, y, z);
    for (let j = 0; j < (lowQuality ? 3 : 6); j++) { const l = put(new THREE.SphereGeometry(0.07, 8, 6), j % 2 ? leafMat : leaf2, x + Math.cos(j * 2.1) * 0.15, y - 0.08 - j * 0.09, z + Math.sin(j * 2.1) * 0.15); l.scale.set(1, 0.5, 1.6); }
  }

  // ---------- the staging and the five plants: one site at five ages of care. Each is bigger than the one before, and the older ones flower ----------
  for (let s = 0; s < 3; s++) put(new THREE.BoxGeometry(1.8 - s * 0.55, 0.05, 8.4), timber, 34 + s * 0.27, Y + 0.45 + s * 0.42, 1);
  for (const z of [-3.1, 1, 5.1]) put(new THREE.BoxGeometry(1.7, 1.3, 0.06), timber, 34, Y + 0.65, z);
  const plants = AGES.map(([age, accent], i) => {
    const z = -2.4 + i * 1.7, step = i % 2 ? 1 : 2, x = 34 + step * 0.27 - 0.1, y = Y + 0.5 + step * 0.42;
    const g = new THREE.Group(); g.position.set(x, y, z); root.add(g);
    put(new THREE.CylinderGeometry(0.24, 0.18, 0.36, 16), std([0x9e3b2c, 0xc46f4f, 0xe8a89a, 0x3f6e68, 0xd8cdb8][i]), 0, 0.18, 0, g);
    put(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16), std(0x4a3626), 0, 0.35, 0, g);
    const tag = canvas(256, 96, (x, w, h) => { x.fillStyle = CREAM; x.fillRect(0, 0, w, h); x.fillStyle = INK; x.font = '600 40px Fraunces, Georgia, serif'; x.fillText(age, 14, 50); x.fillStyle = '#8c8a82'; x.font = '500 15px "Martian Mono", monospace'; x.fillText('YOUR SITE, IN CARE', 14, 82); });
    const t = put(new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshStandardMaterial({ map: tag }), -0.25, 0.2, 0, g); t.rotation.y = -Math.PI / 2;
    const stem = new THREE.Group(); stem.position.y = 0.36; g.add(stem);
    const leaves = [];
    for (let k = 0; k < (lowQuality ? 5 : 9); k++) { const an = k * 2.4, l = put(new THREE.SphereGeometry(0.11, 10, 8), k % 2 ? leafMat : leaf2, Math.cos(an) * 0.12, 0.12 + k * 0.1, Math.sin(an) * 0.12, stem); l.scale.set(1, 0.45, 1.8); l.rotation.set(0.4, an, 0.3); l.userData.k = k; leaves.push(l); }
    put(new THREE.CylinderGeometry(0.015, 0.02, 1.0, 6), std(0x4f6e42), 0, 0.5, 0, stem);
    const bloom = new THREE.Group(); bloom.position.y = 1.05; stem.add(bloom);
    for (let k = 0; k < 6; k++) { const p = put(new THREE.SphereGeometry(0.07, 10, 8), std(accent, { roughness: 0.5, emissive: accent, emissiveIntensity: 0.15 }), Math.cos(k) * 0.07, 0, Math.sin(k) * 0.07, bloom); p.scale.set(1, 0.4, 1.5); p.rotation.y = k; }
    put(new THREE.SphereGeometry(0.04, 8, 6), std(0xf2d98b), 0, 0.02, 0, bloom);
    return { stem, leaves, bloom, ph: i * 1.3 };
  });

  // ---------- the tools of a care plan, each with a small brass label ----------
  const label = (text, sub, x, y, z, ry) => {
    const tex = canvas(320, 96, (c, w, h) => { c.fillStyle = '#c9a24a'; c.beginPath(); c.roundRect(0, 0, w, h, 14); c.fill(); c.fillStyle = INK; c.font = '600 30px Fraunces, Georgia, serif'; c.fillText(text, 16, 44); c.font = '500 15px "Martian Mono", monospace'; c.fillText(sub, 16, 76); });
    const m = put(new THREE.PlaneGeometry(0.8, 0.24), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.2, roughness: 0.4 }), x, y, z); m.rotation.y = ry; return m; // big enough to read from the walk
  };
  const pickables = [];
  // Updates: a watering can that tips by itself and waters the plants
  const can = new THREE.Group(); can.position.set(32.2, Y + 2.4, -1.6); root.add(can);
  put(new THREE.CylinderGeometry(0.16, 0.18, 0.3, 16), std(0x3f6e68, { roughness: 0.45, metalness: 0.2 }), 0, 0, 0, can);
  const spout = put(new THREE.CylinderGeometry(0.02, 0.035, 0.45, 8), std(0x3f6e68, { roughness: 0.45 }), 0.26, 0.08, 0, can); spout.rotation.z = -0.9;
  put(new THREE.TorusGeometry(0.11, 0.018, 6, 14, Math.PI), brass, -0.04, 0.17, 0, can);
  const rose = put(new THREE.CylinderGeometry(0.05, 0.025, 0.05, 10), brass, 0.44, 0.24, 0, can); rose.rotation.z = -0.9;
  const drops = [...Array(lowQuality ? 8 : 18)].map((_, k) => { const d = put(new THREE.SphereGeometry(0.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0xbfe6f0, transparent: true, opacity: 0.8 }), 0, 0, 0); d.userData.ph = k / 18; return d; });
  label('Updates', 'SECURITY, EVERY MONTH', 32.2, Y + 1.95, -1.55, -Math.PI / 2);
  pickables.push([can, 'can']);
  // Backups: a small bank vault in the north wall, glowing at its seams; inside, rows of seed packets, one for each day
  const vault = new THREE.Group(); vault.position.set(30.2, Y + 1.0, G.z0 + 0.72); root.add(vault);
  put(new THREE.BoxGeometry(1.8, 2.0, 0.7), std(0x8c8a82, { metalness: 0.3, roughness: 0.4 }), 0, 0, -0.35, vault);
  const hinge = new THREE.Group(); hinge.position.set(-0.55, 0, 0.02); vault.add(hinge);
  const doorMat = std(0xb8914f, { metalness: 0.3, roughness: 0.3 });
  put(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 32), doorMat, 0.55, 0, 0.06, hinge).rotation.x = Math.PI / 2;
  const wheel = new THREE.Group(); wheel.position.set(0.55, 0, 0.14); hinge.add(wheel);
  for (let k = 0; k < 3; k++) put(new THREE.BoxGeometry(0.5, 0.03, 0.03), brass, 0, 0, 0, wheel).rotation.z = (k * Math.PI) / 3;
  put(new THREE.TorusGeometry(0.25, 0.02, 6, 24), brass, 0, 0, 0, wheel);
  const seam = put(new THREE.TorusGeometry(0.57, 0.015, 6, 40), new THREE.MeshStandardMaterial({ color: 0xffe6a0, emissive: 0xffc860, emissiveIntensity: 1.6 }), 0, 0, 0.03, vault);
  const packets = new THREE.Group(); packets.position.set(0, 0, -0.2); vault.add(packets);
  ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach((d, k) => {
    const tex = canvas(96, 128, (c, w, h) => { c.fillStyle = ['#f2d98b', '#e8a89a', '#cdbbff', '#cfe3d8'][k % 4]; c.fillRect(0, 0, w, h); c.fillStyle = INK; c.font = '600 26px "Martian Mono", monospace'; c.fillText(d, 14, 50); c.font = '500 14px "Martian Mono", monospace'; c.fillText('BACKUP', 14, 90); });
    put(new THREE.PlaneGeometry(0.16, 0.22), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveIntensity: 0.2, emissiveMap: tex }), -0.42 + (k % 4) * 0.28, k < 4 ? 0.18 : -0.18, 0, packets);
  });
  label('Backups', 'KEPT SAFE, OFF SITE', 31.35, Y + 2.2, G.z0 + 0.74, 0);
  pickables.push([vault, 'vault']);
  // Uptime: a brass gauge on the wall, its needle steady at UP, and a lamp that beats like a heart
  const gauge = new THREE.Group(); gauge.position.set(29.0, Y + 1.7, G.z0 + 0.12); root.add(gauge);
  const dial = canvas(256, 256, (c, w) => { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill(); c.strokeStyle = INK; c.lineWidth = 4; for (let k = 0; k <= 10; k++) { const an = Math.PI * (0.8 + (k / 10) * 1.4); c.beginPath(); c.moveTo(128 + Math.cos(an) * 100, 128 + Math.sin(an) * 100); c.lineTo(128 + Math.cos(an) * 116, 128 + Math.sin(an) * 116); c.stroke(); } c.fillStyle = '#2f9e5a'; c.font = '600 30px "Martian Mono", monospace'; c.fillText('UP', 108, 200); c.fillStyle = OXIDE; c.font = '500 18px "Martian Mono", monospace'; c.fillText('DOWN', 30, 200); });
  put(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 32), brass, 0, 0, 0, gauge).rotation.x = Math.PI / 2;
  put(new THREE.CircleGeometry(0.26, 32), new THREE.MeshStandardMaterial({ map: dial }), 0, 0, 0.035, gauge);
  const needleG = new THREE.Group(); needleG.position.set(0, 0, 0.045); gauge.add(needleG); put(new THREE.BoxGeometry(0.02, 0.22, 0.01), std(0x9e3b2c), 0, 0.1, 0, needleG);
  const heart = put(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshStandardMaterial({ color: 0x106030, emissive: 0x30ff70, emissiveIntensity: 1 }), 0.42, 0.2, 0.05, gauge);
  label('Uptime', 'WATCHED DAY AND NIGHT', 29.0, Y + 1.15, G.z0 + 0.13, 0);
  pickables.push([gauge, 'gauge']);
  // A few small changes a month: a gardener's ledger on a lectern, turning its pages
  const lect = new THREE.Group(); lect.position.set(LECTERN[0], Y, LECTERN[1]); lect.rotation.y = -0.7; root.add(lect);
  put(new THREE.CylinderGeometry(0.05, 0.08, 1.05, 10), timber, 0, 0.52, 0, lect); put(new THREE.CylinderGeometry(0.25, 0.28, 0.05, 16), timber, 0, 0.025, 0, lect);
  const desk = put(new THREE.BoxGeometry(0.6, 0.04, 0.42), timber, 0, 1.1, 0, lect); desk.rotation.x = 0.35;
  const book = new THREE.Group(); book.position.set(0, 1.16, 0); book.rotation.x = 0.35; lect.add(book);
  const pageTex = canvas(256, 320, (c, w, h) => { c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(30,42,38,0.15)'; for (let k = 40; k < h; k += 26) { c.beginPath(); c.moveTo(16, k); c.lineTo(w - 16, k); c.stroke(); } c.fillStyle = INK; c.font = 'italic 22px Fraunces, Georgia, serif'; ['new photo on the menu', 'Sunday hours', 'one price changed', 'a festival banner'].forEach((t, k) => c.fillText('· ' + t, 18, 64 + k * 52)); c.fillStyle = '#8c8a82'; c.font = '500 13px "Martian Mono", monospace'; c.fillText('SAMPLE ENTRIES', 18, h - 18); });
  const pageMat = new THREE.MeshStandardMaterial({ map: pageTex, side: THREE.DoubleSide, roughness: 0.9 });
  for (const s of [-1, 1]) put(new THREE.PlaneGeometry(0.26, 0.34), pageMat, s * 0.135, 0.01, 0, book).rotation.x = -Math.PI / 2;
  const leafPage = new THREE.Group(); book.add(leafPage); put(new THREE.PlaneGeometry(0.26, 0.34), pageMat, 0.13, 0.012, 0, leafPage).rotation.x = -Math.PI / 2;
  label('Small changes', 'A FEW EVERY MONTH', LECTERN[0] - 0.35, Y + 0.75, LECTERN[1] + 0.35, -0.7 - Math.PI / 2 + Math.PI / 2);
  pickables.push([lect, 'ledger']);
  // Hosting: a plate on the vault's arch, because the glasshouse itself is the thing being looked after
  label('Hosting', 'THIS GLASSHOUSE, KEPT', VAULT_X + 0.02, Y + WALL + 0.25, cz - 2.7, Math.PI / 2);

  // ---------- the sign over the staging: what this room is. A care plan is the site's maintenance (business-and-pricing.md) ----------
  {
    const tex = canvas(1024, 300, (c, w, h) => {
      c.fillStyle = '#1e2a26'; c.beginPath(); c.roundRect(0, 0, w, h, 26); c.fill(); c.strokeStyle = '#c9a24a'; c.lineWidth = 6; c.beginPath(); c.roundRect(10, 10, w - 20, h - 20, 20); c.stroke();
      c.textAlign = 'center'; c.fillStyle = '#c9a24a'; c.font = '500 30px "Martian Mono", monospace'; c.fillText('CHAPTER 5 · CARE PLAN', w / 2, 70);
      c.fillStyle = CREAM; c.font = '500 104px Fraunces, Georgia, serif'; c.fillText('Maintenance', w / 2, 175);
      c.fillStyle = '#cfe3d8'; c.font = '400 32px "Familjen Grotesk", Arial, sans-serif'; c.fillText('Hosting care · Backups · Uptime · Security updates · Small changes', w / 2, 245); // hosting itself is billed at cost (rate card): the plan manages it
    });
    const sign = put(new THREE.PlaneGeometry(3.0, 0.88), new THREE.MeshBasicMaterial({ map: tex }), G.x1 - 0.15, Y + 3.45, cz); sign.rotation.y = -Math.PI / 2;
    for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 4), ink, G.x1 - 0.15, Y + 4.45, cz + s * 1.3); // hung from the arch
  }

  // ---------- a little life: paper butterflies, motes in the light ----------
  const flies = [...Array(lowQuality ? 3 : 6)].map((_, k) => {
    const g = new THREE.Group(); root.add(g); const m = std([0xf2d98b, 0xe8a89a, 0xcdbbff][k % 3], { side: THREE.DoubleSide });
    for (const s of [-1, 1]) { const w = put(new THREE.PlaneGeometry(0.1, 0.08), m, s * 0.05, 0, 0, g); w.userData.s = s; }
    g.userData.ph = k * 1.9; return g;
  });

  const act = { can: -9, vault: -9, gauge: -9, ledger: -9 }; // when each was last clicked
  const hit = (ray) => { for (const [o, id] of pickables) if (ray.intersectObject(o, true).length) return id; return null; };
  return {
    over(ray) { return !!hit(ray); },
    pick(ray) { const id = hit(ray); if (!id) return false; act[id] = performance.now() / 1000; return true; },
    update(t, dt, grow, tools) { // grow: 0 to 1 as the walk comes in; tools: 0 to 1 at the tools' stop (the vault opens a crack, the ledger turns)
      const now = performance.now() / 1000, fresh = (id) => Math.max(0, 1 - (now - act[id]) / 3);
      plants.forEach((p, i) => {
        const g = sstep(i * 0.08, 0.6 + i * 0.08, grow) * (0.4 + 0.15 * i); // older in care, bigger
        p.stem.scale.set(0.5 + 0.5 * g, 0.25 + 0.75 * g, 0.5 + 0.5 * g); p.stem.rotation.z = Math.sin(t * 0.6 + p.ph) * 0.04;
        p.bloom.scale.setScalar(sstep(0.55, 0.9, g) * (1 + 0.15 * fresh('can')));
        p.leaves.forEach((l) => { l.visible = l.userData.k < 3 + g * 6; });
      });
      // the can tips every few seconds by itself, or at once when clicked
      const cycle = (t * 0.18) % 1, pour = Math.max(sstep(0.55, 0.65, cycle) * (1 - sstep(0.85, 0.95, cycle)), fresh('can'));
      can.rotation.z = -pour * 0.75; can.position.y = Y + 2.4 + Math.sin(t * 0.7) * 0.05;
      drops.forEach((d) => { const u = (t * 0.9 + d.userData.ph) % 1; d.visible = pour > 0.3; d.position.set(32.2 + 0.5 + u * 0.4, Y + 2.25 - u * u * 1.1, -1.6 + (d.userData.ph - 0.5) * 0.25); });
      const open = Math.max(sstep(0.2, 1, tools) * 0.35, fresh('vault'));
      hinge.rotation.y = -open * 1.6; wheel.rotation.z = t * 0.3 + fresh('vault') * 6; seam.material.emissiveIntensity = 1.2 + Math.sin(t * 1.5) * 0.4;
      const beat = Math.pow(Math.max(0, Math.sin(t * 2.4)), 12); heart.material.emissiveIntensity = 0.4 + beat * 2.2 + fresh('gauge') * 2;
      needleG.rotation.z = -0.5 + Math.sin(t * 3) * 0.015 + fresh('gauge') * Math.sin(now * 20) * 0.3; // steady at UP; tapped, it shivers and settles
      leafPage.rotation.z = -((t * 0.25 + fresh('ledger') * 2) % 1) * Math.PI;
      flies.forEach((f, k) => { const a = t * 0.4 + f.userData.ph; f.position.set(31.5 + Math.sin(a) * 2.2, Y + 1.8 + Math.sin(a * 1.7) * 0.5, cz + Math.cos(a * 0.8) * 3); f.rotation.y = a; f.children.forEach((w) => { w.rotation.y = w.userData.s * Math.sin(t * 14 + k) * 0.9; }); });
      for (const f of tick) f(t, dt);
    },
  };
}
