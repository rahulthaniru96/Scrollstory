// The Gallery's "domain expansion": on its stop, each demo site opens from a flat card into a small world of its own.
// A lattice dome grows over it, a floor disc spreads, the page comes apart into its layers, and a few things of that trade stand up.
// Everything follows one focus value per card (0 to 1, from the scroll), so it folds away again when the walk moves on.
import * as THREE from 'three';
import { holoEdges, holoFill } from './holo.js';

// The five demo sites (all fictional businesses; see the wall of milestones).
export const SITES = [
  { name: 'A café', accent: 0xc98b5a, floor: 0x6b4a3a },
  { name: 'A gym', accent: 0x2f5fa8, floor: 0x2c3834 },
  { name: 'A preschool', accent: 0xf2d98b, floor: 0xe8a89a },
  { name: 'A coaching centre', accent: 0x3f6e68, floor: 0xd8cdb8 },
  { name: 'A real estate project', accent: 0xe8a89a, floor: 0x8c8a82 },
];

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const R = 1.8, MID = -9; // the dome's radius, and the middle of the Gallery: each dome sits a metre toward it, so it clears the wall behind its card

// Things of each trade, from primitives. Each returns a list of [mesh, x, z] standing on the floor around the card.
function props(i, lit) {
  const M = (geo, color, y = 0) => { const m = new THREE.Mesh(geo, lit(color)); m.position.y = y; return m; };
  const G = (...parts) => { const g = new THREE.Group(); g.add(...parts); return g; };
  const cyl = (r, h, color, y) => M(new THREE.CylinderGeometry(r, r, h, 18), color, y), box = (w, h, d, color, y) => M(new THREE.BoxGeometry(w, h, d), color, y);
  if (i === 0) { // a table with a cup on it, and a second cup
    const handle = M(new THREE.TorusGeometry(0.05, 0.014, 8, 14), 0xf7efe2, 0.83); handle.position.x = 0.09;
    const cup2 = G(cyl(0.11, 0.16, 0xe8a89a, 0.08)), steam = M(new THREE.SphereGeometry(0.035, 10, 8), 0xffffff, 1.0);
    return [[G(cyl(0.32, 0.04, 0x9b7a55, 0.72), cyl(0.03, 0.72, 0x2c3834, 0.36), cyl(0.2, 0.03, 0x2c3834, 0.015), cyl(0.07, 0.11, 0xf7efe2, 0.8), handle, steam), -0.9, 0.5], [cup2, 0.9, 0.7]];
  }
  if (i === 1) { // a dumbbell and a kettlebell
    const bar = cyl(0.03, 0.6, 0x8c8a82, 0.14); bar.rotation.z = Math.PI / 2;
    const w1 = cyl(0.14, 0.1, 0x2c3834, 0.14), w2 = cyl(0.14, 0.1, 0x2c3834, 0.14); w1.rotation.z = w2.rotation.z = Math.PI / 2; w1.position.x = -0.3; w2.position.x = 0.3;
    const grip = M(new THREE.TorusGeometry(0.1, 0.025, 8, 16), 0x2c3834, 0.36);
    return [[G(bar, w1, w2), -0.9, 0.6], [G(M(new THREE.SphereGeometry(0.17, 16, 12), 0x2f5fa8, 0.17), grip), 0.9, 0.6]];
  }
  if (i === 2) { // building blocks and a ball
    const b3 = box(0.2, 0.2, 0.2, 0x3f6e68, 0.5); b3.rotation.y = 0.5;
    return [[G(box(0.26, 0.2, 0.26, 0x9e3b2c, 0.1), box(0.22, 0.2, 0.22, 0xf2d98b, 0.3), b3), -0.9, 0.6], [M(new THREE.SphereGeometry(0.18, 16, 12), 0x2f5fa8, 0.18), 0.9, 0.7]];
  }
  if (i === 3) { // a stack of books and a pencil
    const b2 = box(0.4, 0.07, 0.3, 0xf2d98b, 0.105), b3 = box(0.38, 0.07, 0.27, 0x3f6e68, 0.175); b2.rotation.y = 0.2; b3.rotation.y = -0.15;
    const tip = M(new THREE.ConeGeometry(0.035, 0.1, 12), 0x2c3834, 0.75), pencil = G(cyl(0.035, 0.7, 0xf2d98b, 0.35), tip); pencil.rotation.z = 0.25;
    return [[G(box(0.42, 0.07, 0.3, 0x9e3b2c, 0.035), b2, b3), -0.9, 0.6], [pencil, 0.9, 0.6]];
  }
  const roof = M(new THREE.ConeGeometry(0.34, 0.25, 4), 0x9e3b2c, 0.52); roof.rotation.y = Math.PI / 4; // a house and a tower
  return [[G(box(0.42, 0.4, 0.42, 0xf7efe2, 0.2), roof), -0.9, 0.6], [G(box(0.3, 1.0, 0.3, 0xd8cdb8, 0.5), box(0.32, 0.03, 0.32, 0x3f6e68, 1.015)), 0.9, 0.6]];
}

// cards: [{ m, z }] from main.js, in walk order. Returns update(focus[]).
export function gallery({ scene, cards, lowQuality }) {
  const lit = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const flat = (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const domeGeo = new THREE.SphereGeometry(R, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), discGeo = new THREE.CircleGeometry(R, 40).rotateX(-Math.PI / 2);
  const worlds = cards.map((card, i) => {
    const site = SITES[i], g = new THREE.Group(), size = i === cards.length - 1 ? 0.55 : 1; // the last one opens 2 m from the camera, so it is smaller
    g.position.set(card.m.position.x + Math.sign(MID - card.m.position.x) * size, 0, card.m.position.z); scene.add(g);
    const fade = { value: 0 }, reveal = { value: 0 };
    const lattice = holoEdges(domeGeo, { angle: 1, everywhere: true, fade }), shell = new THREE.Mesh(domeGeo, holoFill({ reveal, opacity: 0.1 }));
    const disc = new THREE.Mesh(discGeo, new THREE.MeshStandardMaterial({ color: site.floor, roughness: 0.6, transparent: true, opacity: 0 })); disc.position.y = 0.03;
    g.add(lattice, shell, disc);
    // The page's layers, laid where the card's picture has them: [w, h, x, y, colour, how far it comes forward]
    const layers = [[1.6, 0.11, 0, 0.445, 0x1e2a26, 0.5], [1.36, 0.39, 0, 0.085, site.accent, 0.32], [0.75, 0.05, -0.305, -0.215, 0x8c8a82, 0.16], [0.48, 0.05, -0.44, -0.315, 0x8c8a82, 0.16], [0.4, 0.13, 0.5, -0.29, 0x9e3b2c, 0.7]]
      .map(([w, h, x, y, color, out]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), flat(color)); m.position.set(x, y, 0.004); card.m.add(m); return { m, x, y, out }; });
    const things = lowQuality ? [] : props(i, lit).map(([m, x, z]) => { m.position.x = x; m.position.z = -z; g.add(m); return m; }); // -z: toward the camera, which has just backed past
    g.visible = false;
    return { g, fade, reveal, disc, layers, things, size };
  });
  return function update(focus, air) {
    worlds.forEach((w, i) => {
      const f = focus[i] || 0, on = f > 0.004;
      w.g.visible = on; for (const l of w.layers) l.m.visible = on;
      if (!on) return;
      const grow = sstep(0, 0.6, f);
      w.fade.value = 0.8 * grow; w.reveal.value = sstep(0.2, 1, f);
      w.g.scale.setScalar(w.size * (0.05 + 0.95 * grow)); w.disc.material.opacity = 0.85 * grow;
      for (const [k, l] of w.layers.entries()) { const u = sstep(0.25 + k * 0.05, 0.85 + k * 0.03, f); l.m.position.set(l.x * (1 + 0.12 * u), l.y * (1 + 0.18 * u), 0.004 + l.out * u); }
      for (const [k, m] of w.things.entries()) { const u = sstep(0.4 + k * 0.15, 0.85 + k * 0.15, f); m.scale.setScalar(Math.max(0.001, u * (1 + 0.12 * Math.sin(Math.PI * u)))); m.rotation.y = air * 0.25 + k; }
    });
  };
}
