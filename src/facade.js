// The street front, modern: warm limewash and charcoal, a glass front behind slim vertical fins, a deep portal with a
// cantilevered canopy, jali screens on the low wings, and a round corner tower wrapped in louvres and glass ribbons.
// Same massing as before (the tower on the east, the long low wing on the west, steps down into the water), so the
// solid parts declared in world.js still hold. Above HOLO.boundary the building is still being imagined (holo.js).
import * as THREE from 'three';
import { HOLO, holoEdges, holoFill } from './holo.js';
import { H, TOWER } from './world.js';

export function facade({ scene, tick, mesh, basic, lit, glow }) {
  const G = new THREE.Group(); scene.add(G);
  const F = 12.3; // the front face of the lobby and the wings
  // the jali: a screen of small openings, lit warm from behind
  const jali = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#ece5d8'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#ffcf8a';
    for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) { x.save(); x.translate(8 + k * 16, 8 + r * 16); x.rotate(Math.PI / 4); x.fillRect(-4, -4, 8, 8); x.restore(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const M = {
    lime: lit(0xece5d8), char: lit(0x2b2f2e, { roughness: 0.55 }),
    brass: lit(0xc9a24a, { roughness: 0.3, metalness: 0.4 }), terrazzo: lit(0xd9d2c4, { roughness: 0.5 }), warm: basic(0xffe2a8),
    glass: lit(0x35535a, { roughness: 0.1, metalness: 0.3, emissive: 0xffc27a, emissiveIntensity: 0.1 }),
    shade: basic(0x3a2a24, { transparent: true, opacity: 0.25, depthWrite: false }),
  };
  // The parts that are still half imagined: a little see-through, with a faint iridescent tint.
  const upper = [];
  const dream = (color) => { const m = lit(color, { transparent: true, opacity: 0.7, emissive: 0x8f7fd0, emissiveIntensity: 0.18 }); upper.push(m); return m; };
  const D = { lime: dream(0xece5d8), char: dream(0x2b2f2e), glass: dream(0x34505a) };
  const edged = [];
  const bx = (x0, x1, y0, y1, z0, z1, mat) => { const m = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, G); edged.push(m); return m; };
  const cy = (r, y0, y1, mat, x, z, seg = 48) => { const m = mesh(new THREE.CylinderGeometry(r, r, y1 - y0, seg), mat, x, (y0 + y1) / 2, z, G); edged.push(m); return m; };
  const mirror = (fn) => { fn(-1); fn(1); };

  // ---------- the lobby front: a charcoal plinth, a glass front to 6 m, a limewash band above, and slim fins standing off it ----------
  mirror((s) => {
    const x0 = s < 0 ? -6.3 : 1.6, x1 = s < 0 ? -1.6 : 5.2; // the east end runs into the tower
    bx(x0, x1, 0, 0.4, F, F + 0.1, M.char);
    bx(x0, x1, 0.4, 6.0, F, F + 0.03, M.glass);
    for (let x = x0 + 0.9; x < x1 - 0.1; x += 0.9) bx(x - 0.025, x + 0.025, 0.4, 6.0, F, F + 0.08, M.char); // mullions
    bx(x0, x1, 3.15, 3.25, F, F + 0.08, M.char); // the transom at the first floor
    bx(x0, x1, 6.0, 6.6, F, F + 0.05, M.lime);
  });
  bx(-6.3, 5.2, 6.6, 9.3, F, F + 0.05, D.lime);
  bx(-6.3, 5.2, 9.3, 9.42, F, F + 0.15, M.brass); // a thin brass line at the roof
  for (const x of [-5.4, -4.2, -3.0, 2.4, 3.6]) { bx(x - 0.06, x + 0.06, 0.4, 6.6, F + 0.05, F + 0.6, M.char); bx(x - 0.06, x + 0.06, 6.6, 9.9, F + 0.05, F + 0.6, D.char); } // the fins, rising past the roof

  // ---------- the low wings: charcoal plinth, a jali screen glowing warm, a deep limewash fascia ----------
  for (const [x0, x1] of [[-12.3, -6.3], [8.9, 12.3]]) {
    bx(x0, x1, 0, 0.4, F, F + 0.1, M.char);
    const w = x1 - x0, t = jali.clone(); t.needsUpdate = true; t.repeat.set(w / 1.2, 3.0 / 1.2);
    const screen = mesh(new THREE.PlaneGeometry(w, 3.0), basic(0xffffff, { map: t }), (x0 + x1) / 2, 1.9, F + 0.04, G); screen.userData.flat = true;
    bx(x0, x1, 3.4, 4.6, F, F + 0.7, M.lime); bx(x0, x1, 3.1, 3.4, F + 0.01, F + 0.02, M.shade);
  }

  // ---------- the corner tower: glass ribbons between limewash bands, wrapped in vertical louvres, a brass crown and mast ----------
  {
    const { x, z, r } = TOWER;
    cy(r, 0, 0.4, M.char, x, z);
    for (const [y0, y1, solid] of [[0.4, 2.4, true], [2.4, 3.4, false], [3.4, 5.6, true], [5.6, 6.6, false], [6.6, 8.8, true], [8.8, 9.8, false], [9.8, 12.4, true]]) {
      const up = y0 > 6.5;
      cy(solid ? r : r - 0.05, y0, y1, solid ? (up ? D.lime : M.lime) : up ? D.glass : M.glass, x, z);
    }
    const fin = new THREE.BoxGeometry(0.04, 1, 0.26), louvre = lit(0xb9ab94, { roughness: 0.5 }), louvreUp = dream(0xb9ab94);
    for (let k = 0; k < 20; k++) { // the louvres stop short of the front, so the street-level slit shows
      const a = (k / 20) * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.25) continue;
      for (const [y0, y1, mat] of [[0.4, 6.6, louvre], [6.6, 12.4, louvreUp]]) {
        const m = mesh(fin, mat, x + Math.sin(a) * (r + 0.2), (y0 + y1) / 2, z + Math.cos(a) * (r + 0.2), G); m.scale.y = y1 - y0; m.rotation.y = a; edged.push(m);
      }
    }
    cy(r + 0.42, 12.4, 12.55, M.brass, x, z); cy(r - 0.4, 12.55, 13.3, D.lime, x, z);
    cy(0.05, 13.3, 15.4, M.brass, x, z, 8); // the mast
    const slit = new THREE.Group(); slit.position.set(x, 1.4, z + r + 0.012); G.add(slit); // a tall slit window at street level
    mesh(new THREE.PlaneGeometry(0.42, 2.0), M.warm, 0, 0, 0, slit); mesh(new THREE.BoxGeometry(0.04, 2.0, 0.03), M.char, 0, 0, 0.02, slit);
  }

  // ---------- the transition band: some blocks are real, the ones beside them are only outlines ----------
  {
    const real = lit(0xd9d2c4), ghost = holoFill({ opacity: 0.22 }), geo = new THREE.BoxGeometry(0.5, 0.18, 0.07);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) mirror((s) => {
      const x = s * (2.0 + k * 0.56 + (row % 2) * 0.14);
      if (x > 4.9 || Math.abs(x) < 1.7) return;
      const solid = Math.sin(row * 7.3 + k * 3.1 + s * 1.7) > 0.1, m = mesh(geo, solid ? real : ghost, x, 6.62 + row * 0.22, F + 0.07, G);
      if (!solid) m.add(holoEdges(geo, { everywhere: true }));
    });
  }

  // ---------- the entrance: a deep charcoal portal with a brass reveal, a thin cantilevered canopy, tall glass doors standing open ----------
  mirror((s) => { bx(Math.min(s * 1.25, s * 1.6), Math.max(s * 1.25, s * 1.6), 0, 3.9, F, F + 0.9, M.char); bx(Math.min(s * 1.2, s * 1.25), Math.max(s * 1.2, s * 1.25), 0.1, 3.5, F + 0.2, F + 0.9, M.brass); });
  bx(-1.6, 1.6, 3.5, 3.9, F, F + 0.9, M.char); bx(-1.2, 1.2, 3.45, 3.5, F + 0.2, F + 0.9, M.brass);
  bx(-3.2, 3.2, 3.9, 4.02, F, F + 2.4, M.char); // the canopy
  const strip = mesh(new THREE.PlaneGeometry(6.0, 0.08), M.warm, 0, 3.895, F + 2.2, G); strip.rotation.x = Math.PI / 2; // its light strip
  bx(-3.2, 3.2, 3.55, 3.9, F + 0.01, F + 0.02, M.shade);
  mirror((s) => {
    bx(s * 1.18 - 0.02, s * 1.18 + 0.02, 0.12, 3.3, F + 0.95, F + 2.05, basic(0xbfd8d2, { transparent: true, opacity: 0.35 })); // a glass leaf, pivoted open
    bx(s * 1.18 - 0.03, s * 1.18 + 0.03, 0.12, 3.3, F + 2.02, F + 2.07, M.brass); // its brass edge and pull
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
    for (const [x, h] of [[-5.4, 7], [-3.0, 7], [2.4, 7], [-10.2, 3.6], [-8.4, 3.6], [10.6, 3.6]]) {
      mesh(new THREE.PlaneGeometry(1.2, h), wash, x, h / 2, F + 0.62, G);
      glow(0xffc978, 1.3, x, 0.35, F + 0.7, G, 0.8);
    }
    glow(0xffc978, 1.6, TOWER.x, 0.4, TOWER.z + TOWER.r + 0.4, G, 0.8);
  }

  // ---------- holographic outlines: on everything built here, and on the two big blocks behind it ----------
  const blocks = [];
  for (const m of edged) m.add(holoEdges(m.geometry));
  for (const [x0, x1, y1, z0] of [[-6.3, 6.3, H.roof + 0.3, -0.15], [-12.3, 12.3, H.wing + 0.3, -22.3]]) {
    const e = holoEdges(new THREE.BoxGeometry(x1 - x0, y1, F - z0)); e.position.set((x0 + x1) / 2, y1 / 2, (z0 + F) / 2); G.add(e); blocks.push(e);
  }
  tick.push((t, dt, env) => {
    HOLO.time.value = t; HOLO.flip.value = env.dusk;
    HOLO.boundary.value = 6.6 + 0.3 * Math.sin((t * Math.PI * 2) / 8); // the line between real and imagined breathes, 0.3 m over 8 s
    for (const m of upper) m.opacity = 0.7 + 0.3 * env.dusk; // against the dark sky the top turns solid
  });
  return { parts: edged, blocks }; // what the intro builds: the pieces, and the outlines of the two blocks
}
