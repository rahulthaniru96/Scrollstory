// The stair's detail: red-oxide nosings on the treads, brass beads of light that ride both handrails like a funicular,
// a slow pulse in the dark stretch under the stone, lanterns down the well, the wall of milestones, and a plant on the Landing.
import * as THREE from 'three';
import { STAIR, PHI_END, stairPt, stairY, MILESTONES, EYE, H } from './world.js';

const css = (c) => '#' + c.toString(16).padStart(6, '0');

export function stairs({ scene, camera, tick, mesh, basic, lit, glow, lowQuality }) {
  const span = PHI_END - STAIR.phi0;

  // ---------- red-oxide nosing on the leading edge of every tread ----------
  {
    const PER_TURN = 33, dPhi = (2 * Math.PI) / PER_TURN, n = Math.ceil(span / dPhi), rMid = (STAIR.rIn + STAIR.rOut) / 2;
    const nosings = new THREE.InstancedMesh(new THREE.BoxGeometry(STAIR.rOut - STAIR.rIn, 0.035, 0.07), lit(0x9e3b2c, { roughness: 0.6 }), n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const phi = STAIR.phi0 + i * dPhi;
      o.position.set(STAIR.cx - rMid * Math.sin(phi), stairY(Math.min(phi, PHI_END)) + 0.012, STAIR.cz + rMid * Math.cos(phi));
      o.rotation.set(0, Math.atan2(-Math.cos(phi), -Math.sin(phi)), 0); o.translateZ(-0.29); // local +z climbs, so the edge you meet first is at -z
      o.updateMatrix(); nosings.setMatrixAt(i, o.matrix);
    }
    scene.add(nosings);
  }

  // ---------- brass beads of light on both rails, out of step with each other, each with a short trail ----------
  {
    const N = lowQuality ? 5 : 12, TRAIL = lowQuality ? 2 : 4, beads = [];
    for (const [k, r] of [STAIR.rIn, STAIR.rOut].entries()) for (let b = 0; b < N; b++) for (let j = 0; j <= TRAIL; j++)
      beads.push([glow(0xffd27a, j ? 0.17 - j * 0.025 : 0.3, 0, 0, 0, scene, j ? 0.55 - j * 0.1 : 1), r, (b + k * 0.5) / N, j]);
    // in the dark stretch under the stone, one slow pulse of light per rail
    const pulses = [STAIR.rIn, STAIR.rOut].map((r, k) => [glow(0xffc978, 2.4, 0, 0, 0, scene, 0), r, k * 0.5]);
    const dark0 = STAIR.phi0 + (23.5 * 2 * Math.PI) / STAIR.rise, darkSpan = (3 * 2 * Math.PI) / STAIR.rise;
    tick.push((t, dt, env) => {
      for (const [s, r, off, j] of beads) {
        const phi = STAIR.phi0 + ((env.air * 0.012 + off) % 1) * span - j * 0.07;
        s.visible = phi > STAIR.phi0; if (s.visible) s.position.set(...stairPt(phi, r, 0.93));
      }
      for (const [s, r, off] of pulses) { const u = (env.air * 0.05 + off) % 1; s.position.set(...stairPt(dark0 + u * darkSpan, r, 0.93)); s.material.opacity = Math.sin(Math.PI * u) * 0.6; }
    });
  }

  // ---------- lanterns hanging in the open well ----------
  for (const [y, a] of [[4.2, 0.6], [7.6, 3.4]]) {
    const x = STAIR.cx + Math.cos(a) * 0.45, z = STAIR.cz + Math.sin(a) * 0.45;
    mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.24, 8), lit(0xc9a24a, { roughness: 0.4 }), x, y, z);
    mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.6, 4), lit(0x3a3530), x, y + 0.92, z);
    glow(0xffc978, 1.5, x, y - 0.05, z, scene, 0.85);
  }

  // ---------- the wall of milestones: framed pictures outside the rail, each lit as the camera passes it ----------
  {
    const frameMat = lit(0x2f6b63), tints = [0xe8a89a, 0x2f5fa8, 0x3f6e68, 0xc2387a, 0xf2d98b, 0xc9733f];
    const frames = MILESTONES.map((m, i) => {
      const g = new THREE.Group(); g.position.set(...m.at); g.lookAt(STAIR.cx, m.at[1], STAIR.cz); scene.add(g);
      mesh(new THREE.BoxGeometry(1.06, 0.8, 0.05), frameMat, 0, 0, 0, g);
      const c = document.createElement('canvas'); c.width = 376; c.height = 272;
      const x = c.getContext('2d');
      x.fillStyle = '#f7efe2'; x.fillRect(0, 0, 376, 272); x.fillStyle = css(tints[i]); x.fillRect(22, 22, 332, 150);
      x.fillStyle = 'rgba(247,239,226,0.85)'; x.fillRect(40, 40, 120, 12); x.fillRect(40, 62, 200, 8); x.fillRect(40, 78, 160, 8);
      x.fillStyle = '#1e2a26'; x.font = '500 30px Georgia, serif'; x.textAlign = 'center'; x.fillText(m.title, 188, 226);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const picture = basic(0xffffff, { map: tex }); mesh(new THREE.PlaneGeometry(0.94, 0.68), picture, 0, 0, 0.027, g);
      return [m, picture, glow(0xffe2a8, 1.7, 0, 0.5, 0.25, g, 0)];
    });
    tick.push(() => {
      const phi = STAIR.phi0 + ((camera.position.y - EYE) * 2 * Math.PI) / STAIR.rise; // where on the stair the camera is
      for (const [m, picture, lamp] of frames) { const w = Math.max(0, 1 - Math.abs(phi + 0.5 - m.phi) / 1.1); picture.color.setScalar(0.38 + 0.62 * w); lamp.material.opacity = 0.7 * w; }
    });
  }

  // ---------- a potted plant where the stair meets the Landing ----------
  {
    const g = new THREE.Group(); g.position.set(2.6, H.landing, 8.6); scene.add(g);
    mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.36, 12), lit(0x9e3b2c), 0, 0.18, 0, g);
    const leaf = new THREE.ConeGeometry(0.09, 0.85, 5), green = lit(0x4f7a52);
    for (let i = 0; i < 7; i++) { const m = mesh(leaf, green, 0, 0.7, 0, g); m.rotation.set(0.45 * Math.cos(i * 0.9), 0, 0.45 * Math.sin(i * 0.9)); m.position.set(Math.sin(i * 0.9) * -0.16, 0.72, Math.cos(i * 0.9) * 0.16); }
  }
}
