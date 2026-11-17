// The Gallery's "domain expansion": on its stop, each demo site opens from a flat card into a small world of its own.
// A lattice dome grows over it, a floor disc spreads, the page comes apart into its layers, and a few things of that trade stand up.
// Everything follows one focus value per card (0 to 1, from the scroll), so it folds away again when the walk moves on.
import * as THREE from 'three';
import { holoEdges, holoFill } from './holo.js';

// The five demo sites (all fictional businesses; see the wall of milestones).
// `page` is what the little phone in the dome shows: plain sample wording, no prices or claims. `ask` is a sample enquiry.
export const SITES = [
  { name: 'A café', accent: 0xc98b5a, floor: 0x6b4a3a, page: ['Café', 'Fresh filter coffee', ['Filter coffee', 'Bun maska', 'Cold coffee'], 'WhatsApp to order'], ask: 'Open today?' },
  { name: 'A gym', accent: 0x2f5fa8, floor: 0x2c3834, page: ['Gym', 'Train with us', ['Strength', 'Cardio', 'Personal training'], 'Book a trial'], ask: 'Trial this week?' },
  { name: 'A preschool', accent: 0xf2d98b, floor: 0xe8a89a, page: ['Preschool', 'Play. Learn. Grow.', ['Playgroup', 'Nursery', 'Day care'], 'Visit us'], ask: 'Can we visit?' },
  { name: 'A coaching centre', accent: 0x3f6e68, floor: 0xd8cdb8, page: ['Coaching centre', 'New exam batches', ['Maths', 'Science', 'English'], 'Enquire'], ask: 'Batch timings?' },
  { name: 'A real estate project', accent: 0xe8a89a, floor: 0x8c8a82, page: ['Homes', '2 and 3 BHK homes', ['Floor plans', 'Location', 'Site visit'], 'Book a site visit'], ask: 'Site visit Sunday?' },
];
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
// A tall strip of the demo site; the phone shows a window of it that scrolls on its own.
function pageStrip(site) {
  const [name, hero, items, cta] = site.page, acc = hex(site.accent);
  const t = tex(256, 1024, (x, w) => {
    x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, 1024);
    x.fillStyle = '#1e2a26'; x.fillRect(0, 0, w, 44); x.fillStyle = '#f7efe2'; x.font = '600 18px Fraunces, Georgia, serif'; x.fillText(name, 14, 29);
    x.fillStyle = acc; x.fillRect(0, 44, w, 210); x.fillStyle = '#1e2a26'; x.font = '600 28px Fraunces, Georgia, serif';
    const words = hero.split(' '); let line = '', y = 120; for (const wd of words) { if (x.measureText(line + wd).width > 220) { x.fillText(line, 14, y); y += 34; line = ''; } line += wd + ' '; } x.fillText(line, 14, y);
    x.fillStyle = '#25d366'; x.fillRect(14, 196, 170, 38); x.fillStyle = '#fff'; x.font = '600 14px Arial, sans-serif'; x.fillText(cta, 24, 220);
    items.forEach((it, k) => { const yy = 290 + k * 150; x.fillStyle = k % 2 ? '#efe6d6' : '#f6eee0'; x.fillRect(14, yy, w - 28, 130); x.fillStyle = acc; x.fillRect(26, yy + 14, 80, 80); x.fillStyle = '#1e2a26'; x.font = '600 17px Fraunces, Georgia, serif'; x.fillText(it, 118, yy + 46); x.fillStyle = '#b9ad98'; x.fillRect(118, yy + 60, 100, 6); x.fillRect(118, yy + 74, 70, 6); });
    x.fillStyle = '#1e2a26'; x.fillRect(0, 760, w, 264); x.fillStyle = '#f7efe2'; x.font = '600 20px Fraunces, Georgia, serif'; x.fillText('Find us', 14, 800);
    x.fillStyle = '#3f6e68'; x.fillRect(14, 816, w - 28, 120); x.fillStyle = '#f2d98b'; x.beginPath(); x.arc(128, 870, 12, 0, 7); x.fill();
    x.fillStyle = '#8c8a82'; x.font = '400 11px "Martian Mono", monospace'; x.fillText('DEMO · FICTIONAL BUSINESS', 14, 980);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 0.4); return t;
}

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
export function gallery({ scene, cards, lowQuality, camera }) {
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
    // The site itself, live on a phone in the middle of the dome, scrolling on its own; a sample enquiry pops up over it.
    const phone = new THREE.Group(); phone.position.y = 1.3; g.add(phone);
    const strip = pageStrip(site);
    phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x1e2a26, roughness: 0.4 })));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.98), new THREE.MeshBasicMaterial({ map: strip })); screen.position.z = 0.021; phone.add(screen);
    const bubble = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: tex(310, 100, (x) => {
      x.fillStyle = '#dcf8c6'; x.beginPath(); x.roundRect(4, 4, 302, 74, 18); x.fill(); x.beginPath(); x.moveTo(40, 76); x.lineTo(30, 96); x.lineTo(64, 76); x.fill();
      x.fillStyle = '#1e2a26'; x.font = '500 26px "Familjen Grotesk", Arial, sans-serif'; x.fillText(site.ask, 22, 50); x.fillStyle = '#34b7f1'; x.font = '600 18px Arial'; x.fillText('✓✓', 262, 66);
    }) }));
    bubble.position.set(0.25, 0.68, 0.06); phone.add(bubble);
    // Three people wander round the floor disc: a site is for the people who walk in.
    const walkers = lowQuality ? [] : [0xf2d98b, 0x3f6e68, 0x9e3b2c].map((col, k) => {
      const p = new THREE.Group(), body = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 8), lit(col)), head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), lit(0xd9a77c));
      body.position.y = 0.18; head.position.y = 0.4; p.add(body, head); g.add(p); return { p, k };
    });
    g.visible = false;
    return { g, fade, reveal, disc, layers, things, size, phone, strip, bubble, walkers };
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
      const live = sstep(0.55, 0.95, f);
      w.phone.scale.setScalar(Math.max(0.001, live * 1.4)); w.strip.offset.y = 0.6 - ((air * 0.05) % 0.6); // the page scrolls down and starts again
      if (camera) w.phone.rotation.y = Math.atan2(camera.position.x - w.g.position.x, camera.position.z - w.g.position.z);
      const b = (air * 0.35 + i * 0.3) % 1; w.bubble.material.opacity = live * sstep(0, 0.1, b) * (1 - sstep(0.6, 0.75, b)); w.bubble.position.y = 0.66 + 0.08 * sstep(0, 0.2, b);
      for (const { p, k } of w.walkers) { const a = air * 0.3 + (k * Math.PI * 2) / 3, r = 1.2 + 0.15 * Math.sin(air * 0.7 + k); p.position.set(Math.cos(a) * r, Math.abs(Math.sin(air * 5 + k)) * 0.03, Math.sin(a) * r); p.rotation.y = -a; p.scale.setScalar(Math.max(0.001, live)); }
      for (const [k, m] of w.things.entries()) { const u = sstep(0.4 + k * 0.15, 0.85 + k * 0.15, f); m.scale.setScalar(Math.max(0.001, u * (1 + 0.12 * Math.sin(Math.PI * u)))); m.rotation.y = air * 0.25 + k; }
    });
  };
}
