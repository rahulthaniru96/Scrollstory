// The Gallery's "domain expansion": on its stop, each demo site opens from a flat card into a small world of its own.
// A lattice dome grows over it, a floor disc spreads, the page comes apart into its layers, and a few things of that trade stand up.
// Everything follows one focus value per card (0 to 1, from the scroll), so it folds away again when the walk moves on.
import * as THREE from 'three';
import { holoEdges, holoFill } from './holo.js';
import { CARDS } from './world.js';

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

const entranceStrips = []; // the five small screens on the Gallery's sign
const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

// cards: [{ m, c }] from main.js, in walk order; c is the CARDS entry (where it is and its world's form). Returns update(focus[], air).
export function gallery({ scene, cards, lowQuality, camera }) {
  const lit = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const flat = (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const hemi = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), ball = new THREE.SphereGeometry(1, 14, 10), disc = new THREE.CircleGeometry(1, 48);
  const worlds = cards.map((card, i) => {
    const site = SITES[i], c = CARDS[i], R = c.r, g = new THREE.Group(); scene.add(g);
    // the card faces the camera's resting spot; `toward` and `side` are that facing and its right hand
    const yaw = card.m.rotation.y, toward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const fade = { value: 0 }, reveal = { value: 0 };
    const geo = c.form === 'air' ? ball : hemi;
    const lattice = holoEdges(geo, { angle: 1, everywhere: true, fade }), shell = new THREE.Mesh(geo, holoFill({ reveal, opacity: 0.08 }));
    const floor = new THREE.Mesh(c.form === 'air' ? new THREE.TorusGeometry(1.15, 0.012, 6, 64) : disc, new THREE.MeshStandardMaterial({ color: site.floor, roughness: 0.6, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    const world = new THREE.Group(); world.add(lattice, shell, floor); g.add(world); world.scale.setScalar(R);
    if (c.form === 'ground') { g.position.set(c.x, 0, c.z); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.03 / R; }
    else if (c.form === 'air') { g.position.set(c.x, c.y, c.z); floor.rotation.x = Math.PI / 2 - 0.35; } // a ring round the sphere, like an orbit
    else { g.position.set(-11.98, c.y, c.z); world.rotation.z = -Math.PI / 2; floor.position.y = 0.002; floor.rotation.x = -Math.PI / 2; } // a portal: the dome bulges out of the wall
    // The page's layers, laid where the card's picture has them: [w, h, x, y, colour, how far it comes forward]
    const layers = [[1.6, 0.11, 0, 0.445, 0x1e2a26, 0.5], [1.36, 0.39, 0, 0.085, site.accent, 0.32], [0.75, 0.05, -0.305, -0.215, 0x8c8a82, 0.16], [0.48, 0.05, -0.44, -0.315, 0x8c8a82, 0.16], [0.4, 0.13, 0.5, -0.29, 0x9e3b2c, 0.7]]
      .map(([w, h, x, y, color, out]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), flat(color)); m.position.set(x, y, 0.004); card.m.add(m); return { m, x, y, out }; });
    // a soft light behind the page, in the site's colour, so the page is what the eye goes to
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.9), new THREE.MeshBasicMaterial({ color: site.accent, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: haloTex }));
    halo.position.z = -0.05; card.m.add(halo);
    // things of the trade: on the floor for a dome, drifting inside a sphere, on the floor in front of a portal
    const things = lowQuality ? [] : props(i, lit).map(([m, x, z], k) => {
      if (c.form === 'air') { const o = new THREE.Group(); o.add(m); m.position.set(0, -0.3, 0); m.scale.setScalar(0.6); g.add(o); o.userData.orbit = k; return o; }
      if (c.form === 'wall') m.position.set(0.9 + k * 0.4, -c.y, k ? 0.9 : -0.9); else m.position.copy(side).multiplyScalar(x * R * 0.6).addScaledVector(toward, R * 0.45);
      g.add(m); return m;
    });
    // the site, live on a small phone beside the page, with a sample enquiry over it
    const phone = new THREE.Group(); scene.add(phone);
    phone.position.copy(card.m.position).addScaledVector(side, 0.66).addScaledVector(toward, 0.4); phone.position.y -= 0.42; phone.rotation.y = yaw; // small, low and to one side, inside the world
    const strip = pageStrip(site);
    phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x1e2a26, roughness: 0.4 })));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.98), new THREE.MeshBasicMaterial({ map: strip })); screen.position.z = 0.021; phone.add(screen);
    const bubble = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: tex(310, 100, (x) => {
      x.fillStyle = '#dcf8c6'; x.beginPath(); x.roundRect(4, 4, 302, 74, 18); x.fill(); x.beginPath(); x.moveTo(40, 76); x.lineTo(30, 96); x.lineTo(64, 76); x.fill();
      x.fillStyle = '#1e2a26'; x.font = '500 26px "Familjen Grotesk", Arial, sans-serif'; x.fillText(site.ask, 22, 50); x.fillStyle = '#34b7f1'; x.font = '600 18px Arial'; x.fillText('✓✓', 262, 66);
    }) }));
    bubble.position.set(0.35, 0.68, 0.06); phone.add(bubble);
    const walkers = lowQuality || c.form !== 'ground' ? [] : [0xf2d98b, 0x3f6e68, 0x9e3b2c].map((col) => {
      const p = new THREE.Group(), body = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 8), lit(col)), head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), lit(0xd9a77c));
      body.position.y = 0.18; head.position.y = 0.4; p.add(body, head); g.add(p); return p;
    });
    g.visible = phone.visible = false;
    return { g, world, fade, reveal, floor, layers, things, phone, strip, bubble, walkers, card, halo, home: card.m.position.clone(), toward, form: c.form, R };
  });

  // ---------- the way in: on the west wall where the Lobby turn ends, the Gallery's sign and five small screens, one per site ----------
  {
    const sign = new THREE.Group(); sign.position.set(-11.97, 0, 9.2); sign.rotation.y = Math.PI / 2; scene.add(sign);
    const board = tex(1024, 820, (x, w, h) => {
      x.fillStyle = '#1b1f22'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c9a24a'; x.lineWidth = 6; x.strokeRect(14, 14, w - 28, h - 28);
      x.fillStyle = '#c9a24a'; x.font = '500 30px "Martian Mono", monospace'; x.fillText('ROOM 02', 64, 96);
      x.fillStyle = '#f7efe2'; x.font = 'italic 400 120px Fraunces, Georgia, serif'; x.fillText('The Gallery', 60, 220);
      x.fillStyle = '#cdbbff'; x.font = '400 40px "Familjen Grotesk", Arial, sans-serif'; x.fillText('Five sites. Five small worlds. Walk in.', 64, 292);
      x.fillStyle = '#8c8a82'; x.font = '400 24px "Martian Mono", monospace'; x.fillText('DEMO SITES · FICTIONAL BUSINESSES', 64, 770);
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.56), new THREE.MeshBasicMaterial({ map: board })); face.position.y = 2.15; sign.add(face);
    SITES.forEach((s, k) => { // five small screens across the bottom of the board, each scrolling its own site
      const t = pageStrip(s); t.repeat.set(1, 0.3);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.62), new THREE.MeshBasicMaterial({ map: t })); scr.position.set(-1.2 + k * 0.6, 1.6, 0.01); sign.add(scr);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.09), new THREE.MeshBasicMaterial({ transparent: true, map: tex(250, 45, (x) => { x.fillStyle = '#f2d98b'; x.font = '500 22px "Martian Mono", monospace'; x.textAlign = 'center'; x.fillText(`0${k + 1} ${s.page[0].toUpperCase()}`, 125, 30); }) }));
      lbl.position.set(-1.2 + k * 0.6, 1.22, 0.01); sign.add(lbl); entranceStrips.push(t);
    });
    const lamp = new THREE.PointLight(0xffd9a0, 6, 5, 2); lamp.position.set(0, 3.7, 0.8); sign.add(lamp); // a picture light over it
  }

  return function update(focus, air) {
    for (const [k, t] of entranceStrips.entries()) t.offset.y = 0.7 - ((air * 0.04 + k * 0.13) % 0.7);
    const any = Math.max(0, ...focus);
    worlds.forEach((w, i) => {
      const f = focus[i] || 0, on = f > 0.004;
      w.card.m.material.uniforms.uK.value = 1 - 0.65 * Math.max(0, any - f); // the others dim while one is open
      w.g.visible = w.phone.visible = on; for (const l of w.layers) l.m.visible = on;
      const grow = sstep(0, 0.6, f);
      w.card.m.scale.setScalar(1 + 0.06 * grow);
      w.halo.material.opacity = 0.35 * grow;
      if (!on) return;
      w.fade.value = 0.8 * grow; w.reveal.value = sstep(0.2, 1, f);
      w.world.scale.setScalar(w.R * (0.05 + 0.95 * grow)); w.floor.material.opacity = (w.form === 'air' ? 0.9 : 0.75) * grow;
      if (w.form === 'air') w.floor.rotation.z = air * 0.2;
      for (const [k, l] of w.layers.entries()) { const u = sstep(0.25 + k * 0.05, 0.85 + k * 0.03, f); l.m.position.set(l.x * (1 + 0.06 * u), l.y * (1 + 0.1 * u), 0.004 + l.out * 0.45 * u); } // the page comes apart a little, not into the room
      for (const [k, m] of w.things.entries()) {
        const u = sstep(0.4 + k * 0.15, 0.85 + k * 0.15, f);
        m.scale.setScalar(Math.max(0.001, u * (1 + 0.12 * Math.sin(Math.PI * u))));
        if (m.userData.orbit !== undefined) { const a = air * 0.4 + k * Math.PI; m.position.set(Math.cos(a) * w.R * 0.75, Math.sin(air * 0.7 + k) * 0.25, Math.sin(a) * w.R * 0.75); m.rotation.y = air * 0.5; }
        else m.rotation.y = air * 0.25 + k;
      }
      const live = sstep(0.55, 0.95, f);
      w.phone.scale.setScalar(Math.max(0.001, live * 0.5)); w.strip.offset.y = 0.6 - ((air * 0.05) % 0.6); // the page scrolls down and starts again
      const b = (air * 0.35 + i * 0.3) % 1; w.bubble.material.opacity = live * sstep(0, 0.1, b) * (1 - sstep(0.6, 0.75, b)); w.bubble.position.y = 0.66 + 0.08 * sstep(0, 0.2, b);
      for (const [k, p] of w.walkers.entries()) { const a = air * 0.3 + (k * Math.PI * 2) / 3, r = w.R * 0.95; p.position.set(Math.cos(a) * r, Math.abs(Math.sin(air * 5 + k)) * 0.03, Math.sin(a) * r); p.rotation.y = -a; p.scale.setScalar(Math.max(0.001, live)); }
    });
  };
}
