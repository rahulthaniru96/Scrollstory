// The street front: 1940s Secunderabad art deco, composed off-centre. A tall rounded corner tower on the east,
// a long low wing on the west, sunshade bands that wrap the curve, a stepped entrance going down into the water.
// The bottom half is solid; above HOLO.boundary the building is still being imagined (holo.js).
// The solid parts the camera could meet are declared in world.js.
import * as THREE from 'three';
import { HOLO, holoEdges, holoFill } from './holo.js';
import { H, TOWER } from './world.js';

export function facade({ scene, tick, mesh, basic, lit, glow }) {
  const G = new THREE.Group(); scene.add(G);
  const F = 12.3; // the front face of the lobby and the wings
  const M = {
    lime: lit(0xf3ead6), pista: lit(0xbcd2ae), pink: lit(0xe8a89a), oxide: lit(0x9e3b2c), teal: lit(0x2f6b63),
    brass: lit(0xc9a24a, { roughness: 0.35 }), terrazzo: lit(0xd9d2c4, { roughness: 0.5 }), warm: basic(0xffe2a8),
    shade: basic(0x4a2f28, { transparent: true, opacity: 0.22, depthWrite: false }),
  };
  // The parts that are still half imagined: a little see-through, with a faint iridescent tint.
  const upper = [];
  const dream = (color) => { const m = lit(color, { transparent: true, opacity: 0.7, emissive: 0x8f7fd0, emissiveIntensity: 0.18 }); upper.push(m); return m; };
  const D = { lime: dream(0xf3ead6), pista: dream(0xbcd2ae), pink: dream(0xe8a89a) };
  const edged = [];
  const bx = (x0, x1, y0, y1, z0, z1, mat) => { const m = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, G); edged.push(m); return m; };
  const cy = (r, y0, y1, mat, x, z) => { const m = mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 40), mat, x, (y0 + y1) / 2, z, G); edged.push(m); return m; };
  const mirror = (fn) => { fn(-1); fn(1); };

  // ---------- colour bands and the sunshades (chajjas) that throw a line of shadow under them ----------
  mirror((s) => { // lobby front, either side of the entrance
    const x0 = s < 0 ? -6.3 : 2.1, x1 = s < 0 ? -2.1 : 5.2; // the east end runs into the tower
    bx(x0, x1, 0, 0.55, F, F + 0.08, M.oxide);
    bx(x0, x1, 3.2, 3.34, F, F + 0.55, M.lime); bx(x0, x1, 2.85, 3.2, F + 0.01, F + 0.02, M.shade);
    bx(x0, x1, 3.34, 3.8, F, F + 0.05, M.pista);
  });
  bx(-6.3, 5.2, 6.3, 6.44, F, F + 0.55, M.lime); bx(-6.3, 5.2, 5.95, 6.3, F + 0.01, F + 0.02, M.shade);
  // the long low west wing: plinth, three round-headed panels, one unbroken sunshade, a limewash top
  bx(-12.3, -6.3, 0, 0.55, F, F + 0.08, M.oxide);
  bx(-12.6, -6.3, 3.2, 3.34, F, F + 0.55, M.lime); bx(-12.3, -6.3, 2.85, 3.2, F + 0.01, F + 0.02, M.shade);
  bx(-12.3, -6.3, 3.34, 4.8, F, F + 0.05, M.lime);
  for (const x of [-11, -9.3, -7.6]) {
    bx(x - 0.55, x + 0.55, 0.75, 2.2, F, F + 0.04, M.pista);
    const top = mesh(new THREE.CircleGeometry(0.55, 24, 0, Math.PI), M.pista, x, 2.2, F + 0.041, G); top.userData.flat = true;
  }
  bx(8.9, 12.3, 0, 0.55, F, F + 0.08, M.oxide); // what shows of the east wing past the tower
  bx(8.9, 12.6, 3.2, 3.34, F, F + 0.55, M.lime); bx(8.9, 12.3, 3.34, 4.8, F, F + 0.05, M.lime);

  // ---------- the rounded corner tower: bands of colour, sunshade rings, porthole windows with sunburst grills ----------
  {
    const { x, z, r } = TOWER, ring = (y, mat = M.lime) => cy(r + 0.55, y, y + 0.14, mat, x, z);
    cy(r, 0, 0.55, M.oxide, x, z); cy(r, 0.55, 3.2, M.pink, x, z); ring(3.2);
    cy(r, 3.34, 6.3, M.lime, x, z); ring(6.3);
    cy(r, 6.44, 9.3, M.pista, x, z); ring(9.3, D.lime);
    cy(r, 9.44, 12.6, D.lime, x, z); ring(12.6, D.pink);
    cy(r - 0.5, 12.74, 13.3, D.lime, x, z);
    bx(x - 0.07, x + 0.07, 13.3, 14.9, z - 0.35, z + 0.35, D.pink); // the finial fin
    const grill = new THREE.BoxGeometry(0.98, 0.035, 0.03);
    for (const [y, glass] of [[4.8, M.warm], [7.9, M.warm], [11, basic(0xffe2a8, { transparent: true, opacity: 0.6 })]]) for (const a of [-0.8, 0, 0.8]) {
      const p = new THREE.Group(); p.position.set(x + Math.sin(a) * (r + 0.012), y, z + Math.cos(a) * (r + 0.012)); p.rotation.y = a; G.add(p);
      mesh(new THREE.CircleGeometry(0.5, 28), glass, 0, 0, 0, p);
      mesh(new THREE.TorusGeometry(0.52, 0.07, 8, 32), M.oxide, 0, 0, 0.02, p);
      for (let k = 0; k < 6; k++) mesh(grill, M.teal, 0, 0, 0.03, p).rotation.z = (k * Math.PI) / 6; // the sunburst
      mesh(new THREE.CircleGeometry(0.11, 16), M.teal, 0, 0, 0.05, p);
    }
    const slit = new THREE.Group(); slit.position.set(x, 1.9, z + r + 0.012); G.add(slit); // a tall slit window at street level
    mesh(new THREE.PlaneGeometry(0.36, 1.8), M.warm, 0, 0, 0, slit); mesh(new THREE.BoxGeometry(0.05, 1.8, 0.03), M.teal, 0, 0, 0.02, slit);
  }

  // ---------- stepped parapet, and vertical fins rising to the plaque and past it ----------
  for (const [w, y0, y1] of [[4.6, 9.3, 10], [3, 10, 10.7], [1.5, 10.7, 11.3]]) bx(-w, w, y0, y1, F - 0.3, F, D.pink);
  for (const [i, top] of [10.4, 9.9, 9.4].entries()) mirror((s) => { const x = s * (3.75 + i * 0.45); bx(x - 0.07, x + 0.07, 3.34, 6.6, F, F + 0.4, M.lime); bx(x - 0.07, x + 0.07, 6.6, top, F, F + 0.4, D.lime); });
  for (const [x, top] of [[-0.6, 12], [0, 12.6], [0.6, 12]]) bx(x - 0.07, x + 0.07, 8.95, top, F, F + 0.4, D.lime);

  // ---------- the transition band: some bricks are real, the ones beside them are only outlines ----------
  {
    const real = lit(0xd98f80), ghost = holoFill({ opacity: 0.22 }), geo = new THREE.BoxGeometry(0.5, 0.18, 0.07);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) mirror((s) => {
      const x = s * (3.72 + k * 0.56 + (row % 2) * 0.14);
      if (x > 4.9) return; // the tower stands there
      const solid = Math.sin(row * 7.3 + k * 3.1 + s * 1.7) > 0.1, m = mesh(geo, solid ? real : ghost, x, 6.62 + row * 0.22, F + 0.035, G);
      if (!solid) m.add(holoEdges(geo, { everywhere: true }));
    });
  }

  // ---------- the entrance: a stepped arch, double teal doors standing open, terrazzo steps down into the water ----------
  for (const [i, mat] of [M.oxide, M.lime, M.teal].entries()) {
    const a = 1.2 + i * 0.28, b = a + 0.28, top = 3 + i * 0.2, d = F + 0.48 - i * 0.16;
    mirror((s) => bx(Math.min(s * a, s * b), Math.max(s * a, s * b), 0, top + 0.2, F, d, mat));
    bx(-a, a, top, top + 0.2, F, d, mat);
  }
  bx(-2.3, 2.3, 3.8, 3.95, F, F + 0.9, M.lime); bx(-2.3, 2.3, 3.5, 3.8, F + 0.01, F + 0.02, M.shade); // the canopy over the door
  mirror((s) => {
    bx(s * 1.23 - 0.03, s * 1.23 + 0.03, 0.12, 2.95, F + 0.5, F + 1.6, M.teal); // a door leaf, swung open
    bx(s * 1.23 - 0.05, s * 1.23 + 0.05, 1.55, 2.6, F + 0.68, F + 1.42, M.warm); // its glass
    bx(s * 1.18 - 0.03, s * 1.18 + 0.03, 1.1, 1.35, F + 1.45, F + 1.5, M.brass); // its handle
    // a brass handrail down the steps, its last post standing in the water
    const rail = mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.05, 8), M.brass, s * 1.95, 0.95, F + 1.62, G); rail.rotation.x = Math.PI / 2 - 0.05;
    for (const z of [F + 0.65, F + 1.6, F + 2.6]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), M.brass, s * 1.95, 0.475 + (F + 1.6 - z) * 0.05, z, G);
  });
  for (const [i, w] of [1.8, 2.3, 2.8].entries()) bx(-w, w, -0.2, 0.12 - i * 0.04, F + i * 0.8, F + (i + 1) * 0.8, M.terrazzo); // the lowest step is at the waterline

  // ---------- evening uplights, so the front glows on the water ----------
  {
    const c = document.createElement('canvas'); c.width = 32; c.height = 128;
    const g2 = c.getContext('2d'), gr = g2.createLinearGradient(0, 128, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, 32, 128);
    const wash = basic(0xffc078, { map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const [x, h] of [[-4.9, 6], [-2.75, 6], [2.75, 6], [-10.2, 4.2], [-8.4, 4.2], [10.6, 4.2]]) {
      mesh(new THREE.PlaneGeometry(1.7, h), wash, x, h / 2, F + 0.1, G);
      glow(0xffc978, 1.3, x, 0.35, F + 0.5, G, 0.8);
    }
    glow(0xffc978, 1.6, TOWER.x, 0.4, TOWER.z + TOWER.r + 0.4, G, 0.8);
  }

  // ---------- holographic outlines: on everything built here, and on the two big blocks behind it ----------
  for (const m of edged) m.add(holoEdges(m.geometry));
  for (const [x0, x1, y1, z0] of [[-6.3, 6.3, H.roof + 0.3, -0.15], [-12.3, 12.3, H.wing + 0.3, -22.3]]) {
    const e = holoEdges(new THREE.BoxGeometry(x1 - x0, y1, F - z0)); e.position.set((x0 + x1) / 2, y1 / 2, (z0 + F) / 2); G.add(e);
  }
  tick.push((t, dt, env) => {
    HOLO.time.value = t; HOLO.flip.value = env.dusk;
    HOLO.boundary.value = 6.6 + 0.3 * Math.sin((t * Math.PI * 2) / 8); // the line between real and imagined breathes, 0.3 m over 8 s
    for (const m of upper) m.opacity = 0.7 + 0.3 * env.dusk; // against the dark sky the top turns solid
  });
}
