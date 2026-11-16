// Entrance membranes: a sheet of gel fills each doorway. Before the camera crosses, the next room shows only blurred
// through it, with a faint outline of its shape. The sheet bulges toward the camera as it nears, and once the camera
// is through it has burst into drops that fall to the floor water. All of it follows the scroll, so it reverses.
import * as THREE from 'three';
import { holoEdges } from './holo.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// crossings: [{ x, z, turn, w, at }] — the doorway's middle, its turn about y, its width, and the scroll position where the rail crosses it.
export function membranes({ scene, camera, lowQuality, crossings }) {
  const H = 3, SEG = 22;
  // shortcut: phones get a frosted tint instead of live refraction (the brief asks for a pre-blurred texture). Upgrade if it reads flat on a real phone.
  const gel = lowQuality
    ? new THREE.MeshBasicMaterial({ color: 0xcfeae6, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({ color: 0xe6f6f3, transmission: 1, roughness: 0.6, thickness: 0.4, ior: 1.33, iridescence: 0.6, iridescenceIOR: 1.3, side: THREE.DoubleSide });
  const dropMat = new THREE.MeshBasicMaterial({ color: 0xd3efea, transparent: true, opacity: 0.8 }), dropGeo = new THREE.SphereGeometry(1, 10, 8);
  const local = new THREE.Vector3();
  const doors = crossings.map((c, k) => {
    const g = new THREE.Group(); g.position.set(c.x, 0, c.z); g.rotation.y = c.turn; scene.add(g);
    const geo = new THREE.PlaneGeometry(c.w, H, SEG, SEG), sheet = new THREE.Mesh(geo, gel); sheet.position.y = H / 2; g.add(sheet);
    const flat = geo.attributes.position.array.slice();
    const hint = holoEdges(new THREE.BoxGeometry(c.w * 1.7, 2.6, 3), { everywhere: true, opacity: 0.35 }); g.add(hint); // the next room, only as an outline
    const drops = Array.from({ length: 12 }, (_, i) => {
      const m = new THREE.Mesh(dropGeo, dropMat), s = 0.045 + ((i * 37 + k * 11) % 10) * 0.006;
      m.scale.set(s, s * 1.3, s); g.add(m);
      return [m, (((i * 53) % 12) / 11 - 0.5) * c.w * 0.9, 0.5 + ((i * 29) % 12) * 0.2, (i % 5) * 0.08];
    });
    return { c, g, sheet, geo, flat, hint, drops, bulged: false };
  });

  // Returns how far into a crossing the scroll is, 0 to 1, for the full-screen wobble.
  return function update(p, time) {
    let crossing = 0;
    for (const d of doors) {
      const before = p < d.c.at, far = d.g.position.distanceTo(camera.position) > 18;
      d.sheet.visible = d.hint.visible = before && !far;
      crossing = Math.max(crossing, Math.max(0, 1 - Math.abs(p - d.c.at) / 7) ** 2);
      const u = (p - d.c.at) / 24; // the burst: drops fall over the next 24 vh
      for (const [m, x, y0, lag] of d.drops) { const f = Math.min(1, Math.max(0, u * (1 + lag))); m.visible = u > 0 && f < 1; m.position.set(x * (1 + f * 0.25), y0 * (1 - f * f), 0.05 + f * 0.3); }
      if (!d.sheet.visible) continue;
      // the bulge: the sheet leans out toward the camera, most where the camera is about to touch it
      d.g.worldToLocal(local.copy(camera.position));
      const near = sstep(3.2, 0.5, Math.abs(local.z)), side = Math.sign(local.z) || 1;
      if (near === 0 && !d.bulged) continue;
      const pos = d.geo.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        const r2 = (d.flat[i] - local.x) ** 2 + (d.flat[i + 1] + H / 2 - local.y) ** 2, edge = Math.min(1, (d.c.w / 2 - Math.abs(d.flat[i])) * 3); // pinned at the jambs
        pos[i + 2] = side * near * edge * (0.38 * Math.exp(-r2 / 0.7) + 0.025 * Math.sin(Math.sqrt(r2) * 7 - time * 2.5));
      }
      d.geo.attributes.position.needsUpdate = true; d.geo.computeVertexNormals(); d.bulged = near > 0;
    }
    return crossing;
  };
}
