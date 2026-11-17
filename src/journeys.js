// The rides between rooms, drawn around the fixed camera path (rail.js).
//   doors  : five free-standing door frames the camera walks through
//   rope   : a swaying rope bridge
//   car    : a funicular whose cabin carries the camera
//   boat   : a sky canal, water running uphill, a reverse waterfall, a paper boat that carries the camera
//   kites  : five kites on one handle bar for the lift to the Rooftop
// Everything is derived from BRIDGES, GREEN and H. Each ride gets a group `g` at the bridge's `a` end, floor height ya,
// turned so that local +x runs along the bridge on the flat, local z across it, local y up.
import * as THREE from 'three';
import { BRIDGES, GREEN, H, EYE } from './world.js';

const COL = { cream: 0xf7efe2, ink: 0x1e2a26, oxide: 0x9e3b2c, butter: 0xf2d98b, teal: 0x3f6e68, brass: 0xc9a24a, rose: 0xe8a89a, sky: 0x2f5fa8, lav: 0xcdbbff, timber: 0x9b6b42 };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const rnd = (i) => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
const fract = (x) => x - Math.floor(x);

// scratch objects, reused so that nothing is allocated per frame
const dm = new THREE.Object3D(), A3 = new THREE.Vector3(), B3 = new THREE.Vector3(), D3 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), TC = new THREE.Color();

const M = (color, o) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
const box = (w, h, d, mat, x, y, z, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); p.add(m); return m; };
const cyl = (r, h, n, mat, x, y, z, p, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, n), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); p.add(m); return m; };
const inst = (geo, mat, n, p) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; p.add(m); return m; };
// instance i = a unit cylinder/box stretched from a to b with diameter th
function seg(m, i, ax, ay, az, bx, by, bz, th) {
  A3.set(ax, ay, az); B3.set(bx, by, bz); D3.subVectors(B3, A3);
  const len = D3.length() || 1e-6;
  dm.position.copy(A3).add(B3).multiplyScalar(0.5);
  dm.quaternion.setFromUnitVectors(UP, D3.multiplyScalar(1 / len));
  dm.scale.set(th, len, th); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix);
}
function put(m, i, x, y, z, rx, ry, rz) {
  dm.position.set(x, y, z); dm.rotation.set(rx, ry, rz); dm.scale.set(1, 1, 1); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix);
}
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function signTex(text) {
  return canvasTex(512, 128, (q, w, h) => {
    q.fillStyle = '#3f6e68'; q.fillRect(0, 0, w, h);
    q.strokeStyle = '#c9a24a'; q.lineWidth = 6; q.strokeRect(10, 10, w - 20, h - 20);
    q.fillStyle = '#f7efe2'; q.font = '700 46px "Martian Mono", monospace'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(text, w / 2, h / 2 + 2);
  }, false);
}

export function journeys({ scene, lowQuality }) {
  const low = !!lowQuality;
  const root = new THREE.Group(); root.name = 'journeys'; scene.add(root);

  // A ride: its bridge, its lengths and its frame group (see the header).
  function ride(name) {
    const b = BRIDGES.find((q) => q.ride === name);
    const dx = b.b[0] - b.a[0], dz = b.b[1] - b.a[1], L = Math.hypot(dx, dz), rise = b.yb - b.ya;
    const g = new THREE.Group(); g.name = 'ride ' + name; g.position.set(b.a[0], b.ya, b.a[1]); g.rotation.y = Math.atan2(-dz, dx); root.add(g);
    return { b, dx, dz, L, rise, S: Math.hypot(L, rise), pitch: Math.atan2(rise, L), g, off: 0, on: false, active: false,
      cx: (b.a[0] + b.b[0]) / 2, cz: (b.a[1] + b.b[1]) / 2, cy: (b.ya + b.yb) / 2 };
  }
  // same maths as world.js onBridge, without the array; r.off gets the sideways distance
  function proj(r, x, z) {
    const px = x - r.b.a[0], pz = z - r.b.a[1];
    r.off = (px * r.dz - pz * r.dx) / r.L;
    return (px * r.dx + pz * r.dz) / (r.L * r.L);
  }
  // where a vehicle should sit: under the camera while it is on the ride, else at the nearer end
  function follow(r, cam) {
    r.active = Math.hypot(cam.x - r.cx, cam.z - r.cz) < 70 && Math.abs(cam.y - r.cy) < 60;
    const u = proj(r, cam.x, cam.z), fy = r.b.ya + r.rise * clamp01(u);
    if (u > -0.12 && u < 1.12 && Math.abs(r.off) < 1.6 && Math.abs(cam.y - fy - EYE) < 2.5) { r.on = true; return clamp01(u); }
    r.on = false;
    return Math.hypot(cam.x - r.b.a[0], cam.z - r.b.a[1]) < Math.hypot(cam.x - r.b.b[0], cam.z - r.b.b[1]) ? 0 : 1;
  }

  const cream = M(COL.cream), teal = M(COL.teal), ink = M(COL.ink), oxide = M(COL.oxide), butter = M(COL.butter);
  const brass = M(COL.brass, { metalness: 0.3, roughness: 0.55 }), timber = M(COL.timber), dark = M(0x6b4a32), steel = M(0x5a6168, { metalness: 0.3, roughness: 0.6 });
  const lampMat = M(COL.butter, { emissive: COL.butter, emissiveIntensity: 0.9 });

  // ============ 1. doors: Landing to HOME ============
  const doors = (() => {
    const R = ride('doors'), list = [];
    const shape = (hw0, hw1, y1, y2) => { // a U: two jambs and a lintel, open at the bottom
      const s = new THREE.Shape();
      s.moveTo(-hw1, 0); s.lineTo(-hw1, y2); s.lineTo(hw1, y2); s.lineTo(hw1, 0); s.lineTo(hw0, 0); s.lineTo(hw0, y1); s.lineTo(-hw0, y1); s.lineTo(-hw0, 0); s.closePath();
      return s;
    };
    const ext = (s, depth, bev) => { const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1 }); g.translate(0, 0, -depth / 2); return g; };
    const coreG = ext(shape(0.9, 1.08, 2.6, 2.78), 0.16, 0.012); // inner opening 1.8 x 2.6
    const mouldG = ext(shape(0.9, 1.0, 2.6, 2.7), 0.26, 0.01); // the architrave, standing proud of the core
    const corniceG = new THREE.BoxGeometry(2.46, 0.09, 0.34), bossG = new THREE.CylinderGeometry(0.075, 0.075, 0.3, 14), plinthG = new THREE.BoxGeometry(0.24, 0.14, 0.3);
    const style = [[COL.oxide, COL.cream], [COL.teal, COL.butter], [COL.butter, COL.ink], [COL.sky, COL.cream], [COL.lav, COL.ink]];
    const yaw = [-7, 5, -3, 8, -6].map((d) => d * Math.PI / 180), roll = [0.03, -0.035, 0.02, -0.03, 0.035], pitch = [-0.02, 0.03, 0.035, -0.03, 0.02];
    [0.12, 0.3, 0.5, 0.7, 0.88].forEach((u, i) => {
      const f = new THREE.Group(); f.rotation.order = 'YXZ'; R.g.add(f);
      const [c, t] = style[i];
      f.add(new THREE.Mesh(coreG, M(c)), new THREE.Mesh(mouldG, M(t)));
      const cor = new THREE.Mesh(corniceG, M(c)); cor.position.set(0, 2.825, 0); f.add(cor);
      const boss = new THREE.Mesh(bossG, brass); boss.rotation.x = Math.PI / 2; boss.position.set(0, 2.65, 0); f.add(boss);
      for (const s of [-1, 1]) { const p = new THREE.Mesh(plinthG, brass); p.position.set(s * 1.01, 0.07, 0); f.add(p); }
      list.push({ f, u, base: R.rise * u + 0.1, i });
      f.position.set(u * R.L, R.rise * u + 0.1, 0);
      f.rotation.set(pitch[i], Math.PI / 2 + yaw[i], roll[i]); // local z (the frame's face) points along the ramp
    });
    return { list };
  })();

  // ============ 2. rope bridge: HOME to the Drafting Room ============
  const rope = (() => {
    const R = ride('rope'), { g, L, rise, S } = R, hw = 0.84, w = R.b.width;
    const n = Math.round(S / (low ? 0.35 : 0.22)), NS = low ? 10 : 16, nh = low ? 0 : Math.round(S / 0.6);
    const slats = inst(new THREE.BoxGeometry(0.14, 0.045, w + 0.12), M(COL.timber), n, g);
    for (let i = 0; i < n; i++) { TC.setScalar(0.7 + rnd(i) * 0.4); slats.setColorAt(i, TC); }
    const ropes = inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 5), M(0x8a6b44), 4 * NS, g);
    const hangers = nh ? inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 4), M(0x7a5c3a), 2 * nh, g) : null;
    // end posts with brass caps and a rope wrap, anchor beams under the slats
    const postG = new THREE.BoxGeometry(0.14, 1.8, 0.14), capG = new THREE.SphereGeometry(0.1, 10, 8), wrapG = new THREE.TorusGeometry(0.09, 0.022, 6, 12);
    for (const e of [0, 1]) {
      const x = e * L, y = e * rise;
      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(postG, timber); p.position.set(x, y + 0.4, s * 0.9); g.add(p);
        const c = new THREE.Mesh(capG, brass); c.position.set(x, y + 1.33, s * 0.9); g.add(c);
        for (const wy of [0.95, 1.05]) { const q = new THREE.Mesh(wrapG, M(0x8a6b44)); q.rotation.x = Math.PI / 2; q.position.set(x, y + wy, s * 0.9); g.add(q); }
      }
      box(0.2, 0.18, w + 0.6, dark, x + (e ? 0.1 : -0.1), y - 0.18, 0, g);
    }
    const st = { amp: 0.03, s1: 0, s2: 0, camOn: 0 };
    const sw = (u) => st.amp * (0.75 * Math.sin(Math.PI * u) * st.s1 + 0.25 * Math.sin(2 * Math.PI * u) * st.s2);
    const railY = (u) => rise * u + 1.0 - 0.4 * u * (1 - u); // 1.0 m above the slats, sagging 0.1 m in the middle
    function update(time, dt) {
      st.camOn += ((R.on ? 1 : 0) - st.camOn) * Math.min(1, dt * 2);
      st.amp = 0.03 + 0.02 * st.camOn; st.s1 = Math.sin(time * 0.9); st.s2 = Math.sin(time * 1.4 + 1.0);
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; put(slats, i, u * L, rise * u - 0.0225, sw(u), 0, (rnd(i + 9) - 0.5) * 0.05, R.pitch); }
      slats.instanceMatrix.needsUpdate = true;
      for (let r = 0; r < 4; r++) {
        const z0 = [hw, -hw, 0.72, -0.72][r], top = r < 2;
        for (let j = 0; j < NS; j++) {
          const u0 = j / NS, u1 = (j + 1) / NS;
          seg(ropes, r * NS + j, u0 * L, top ? railY(u0) : rise * u0 - 0.1, z0 + sw(u0), u1 * L, top ? railY(u1) : rise * u1 - 0.1, z0 + sw(u1), top ? 0.05 : 0.065);
        }
      }
      ropes.instanceMatrix.needsUpdate = true;
      if (hangers) {
        for (let k = 0; k < nh; k++) {
          const u = (k + 0.5) / nh;
          for (let s = 0; s < 2; s++) { const z = (s ? -hw : hw) + sw(u); seg(hangers, k * 2 + s, u * L, rise * u, z, u * L, railY(u), z, 0.016); }
        }
        hangers.instanceMatrix.needsUpdate = true;
      }
    }
    update(0, 1);
    return { R, update };
  })();

  // ============ 3. funicular: Drafting Room to the Signal Cabin ============
  const funi = (() => {
    const R = ride('car'), { g, L, rise, S, pitch } = R, tanp = Math.tan(pitch), line = (x) => rise * x / L;
    // sleepers and steel rails
    const ns = Math.round(S / (low ? 0.9 : 0.5));
    const sleepers = inst(new THREE.BoxGeometry(0.18, 0.1, 1.9), dark, ns, g);
    for (let i = 0; i < ns; i++) { const t = (i + 0.5) / ns, x = t * L; put(sleepers, i, x, line(x) - 0.3, 0, 0, 0, pitch); }
    for (const s of [-1, 1]) {
      const r = box(S, 0.09, 0.07, steel, L / 2, rise / 2 - 0.2, s * 0.6, g); r.rotation.z = pitch;
      const cap = box(S, 0.02, 0.09, brass, L / 2, rise / 2 - 0.15, s * 0.6, g); cap.rotation.z = pitch; // polished running surface
    }
    // trestles that hang into the sky: two splayed legs, a head beam, cross and diagonal braces
    const tu = [0.12, 0.3, 0.5, 0.7, 0.88], tr = inst(new THREE.BoxGeometry(1, 1, 1), dark, tu.length * 7, g);
    tu.forEach((u, k) => {
      const x = u * L, yt = line(x) - 0.36, lat = (d) => 0.85 + 0.65 * d / 18, o = k * 7;
      seg(tr, o, x, yt, 0.85, x, yt - 18, 1.5, 0.16); seg(tr, o + 1, x, yt, -0.85, x, yt - 18, -1.5, 0.16);
      seg(tr, o + 2, x, yt + 0.05, -1.05, x, yt + 0.05, 1.05, 0.2);
      seg(tr, o + 3, x, yt - 4, -lat(4), x, yt - 4, lat(4), 0.1); seg(tr, o + 4, x, yt - 9, -lat(9), x, yt - 9, lat(9), 0.1);
      seg(tr, o + 5, x, yt - 4, -lat(4), x, yt - 9, lat(9), 0.08); seg(tr, o + 6, x, yt - 4, lat(4), x, yt - 9, -lat(9), 0.08);
    });
    // haul cable above the car, over a sheave at each station
    const cab = cyl(0.018, S, 6, steel, L / 2, rise / 2 + 3.3, 0, g, 0, Math.PI / 2 + pitch); cab.rotation.z = pitch - Math.PI / 2;
    for (const x of [0.3, L - 0.3]) cyl(0.24, 0.06, 18, steel, x, line(x) + 3.3, 0, g, Math.PI / 2, 0);
    cyl(0.1, 0.07, 14, brass, 0.3, line(0.3) + 3.3, 0, g, Math.PI / 2, 0); cyl(0.1, 0.07, 14, brass, L - 0.3, line(L - 0.3) + 3.3, 0, g, Math.PI / 2, 0);
    const sheaves = low ? 0 : 7, shm = sheaves ? inst(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), brass, sheaves, g) : null; // little rollers between the rails
    for (let i = 0; i < sheaves; i++) { const x = ((i + 0.5) / sheaves) * L; put(shm, i, x, line(x) - 0.17, 0, Math.PI / 2, 0, 0); }
    // a canopy at each end
    [[0 + 1.15, 'DRAFTING ROOM'], [L - 1.15, 'SIGNAL CABIN']].forEach(([xc, label]) => {
      const can = new THREE.Group(); can.position.set(xc, line(xc), 0); g.add(can);
      const rf = new THREE.Group(); rf.position.y = 3.0; rf.rotation.z = pitch; can.add(rf);
      box(2.5, 0.09, 2.8, cream, 0, 0, 0, rf); box(2.56, 0.04, 2.86, brass, 0, 0.065, 0, rf);
      for (const s of [-1, 1]) box(2.5, 0.2, 0.06, teal, 0, -0.11, s * 1.4, rf);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const top = 3.0 + sx * 1.0 * tanp; box(0.12, top + 0.95, 0.12, teal, sx * 1.0, (top - 0.95) / 2, sz * 1.15, can); }
      for (const s of [-1, 1]) { cyl(0.006, 0.22, 4, ink, 0, 2.86, s * 0.7, can); box(0.14, 0.2, 0.14, lampMat, 0, 2.7, s * 0.7, can); box(0.18, 0.03, 0.18, brass, 0, 2.82, s * 0.7, can); }
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshBasicMaterial({ map: signTex(label) }));
      sg.rotation.y = -Math.PI / 2; sg.position.set(1.15 * (xc < L / 2 ? 1 : -1), 2.78 + 1.15 * (xc < L / 2 ? 1 : -1) * tanp, 0); can.add(sg); // faces back toward the rider
      box(0.05, 0.4, 1.5, teal, sg.position.x + 0.03, sg.position.y, 0, can);
    });

    // the car: floor top at the track line, 2.4 long, 1.9 wide, 2.5 high inside, ends open for the camera
    const car = new THREE.Group(); car.rotation.z = pitch; g.add(car);
    box(2.4, 0.08, 1.9, timber, 0, -0.03, 0, car); box(2.5, 0.14, 1.96, teal, 0, -0.15, 0, car); box(2.52, 0.02, 1.98, brass, 0, -0.075, 0, car);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.14, 0.06, 14, steel, sx * 0.8, -0.3, sz * 0.6, car, Math.PI / 2, 0);
    const plate = new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (q, w, h) => {
      q.fillStyle = '#c9a24a'; q.fillRect(0, 0, w, h); q.fillStyle = '#1e2a26'; q.font = '700 22px "Martian Mono", monospace'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('MAX 4 PERSONS', w / 2, h / 2 + 1);
    }, false) });
    for (const s of [-1, 1]) {
      box(2.4, 0.55, 0.06, teal, 0, 0.285, s * 0.92, car); box(2.4, 0.35, 0.06, cream, 0, 0.735, s * 0.92, car); box(2.44, 0.04, 0.1, brass, 0, 0.935, s * 0.92, car);
      box(2.4, 0.4, 0.06, cream, 0, 2.3, s * 0.92, car); box(2.4, 0.03, 0.09, brass, 0, 2.1, s * 0.92, car);
      for (const mx of [-0.4, 0.4]) box(0.07, 1.14, 0.07, teal, mx, 1.53, s * 0.92, car);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), plate); pl.position.set(0.1, 2.3, s * 0.887); if (s > 0) pl.rotation.y = Math.PI; car.add(pl);
      for (const sx of [-1, 1]) box(0.1, 2.5, 0.1, teal, sx * 1.15, 1.26, s * 0.9, car);
      box(2.54, 0.03, 0.04, brass, 0, 2.5, s * 1.04, car);
      cyl(0.015, 2.0, 8, brass, 0, 2.36, s * 0.62, car, 0, Math.PI / 2); // roof grab rail
    }
    box(2.5, 0.07, 2.1, cream, 0, 2.535, 0, car); box(2.4, 0.05, 0.5, teal, 0, 2.6, 0, car);
    for (const sx of [-1, 1]) box(0.08, 0.1, 1.9, ink, sx * 1.2, 2.45, 0, car); // end headers, 0.85 m over the eye
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lampMat); lamp.position.y = 2.5; car.add(lamp);
    // a bench along one side
    box(1.7, 0.04, 0.2, timber, 0, 0.46, 0.57, car); box(1.7, 0.04, 0.2, timber, 0, 0.46, 0.79, car);
    box(1.7, 0.1, 0.03, timber, 0, 0.72, 0.85, car); box(1.7, 0.1, 0.03, timber, 0, 0.88, 0.85, car);
    for (const sx of [-1, 1]) box(0.05, 0.44, 0.4, teal, sx * 0.7, 0.23, 0.68, car);
    // grip: a pole from the roof to the haul cable
    box(0.2, 0.08, 0.3, brass, 0, 2.64, 0, car); cyl(0.03, 0.7, 8, steel, 0, 2.97, 0, car); box(0.14, 0.1, 0.14, brass, 0, 3.3, 0, car);
    // two hanging straps
    const straps = [];
    for (const [x, z] of [[-0.55, 0.62], [0.45, -0.62]]) {
      const p = new THREE.Group(); p.position.set(x, 2.36, z); car.add(p);
      box(0.05, 0.03, 0.03, brass, 0, 0, 0, p); box(0.04, 0.34, 0.012, M(COL.oxide), 0, -0.19, 0, p);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 14), brass); ring.position.y = -0.4; p.add(ring);
      straps.push(p);
    }
    function update(time, dt, u) {
      car.position.set(u * L, rise * u, 0);
      straps[0].rotation.set(Math.sin(time * 1.5) * 0.08, 0, Math.sin(time * 1.1) * 0.12); straps[1].rotation.set(Math.sin(time * 1.3 + 2) * 0.08, 0, Math.sin(time * 1.7 + 1) * 0.12);
    }
    update(0, 1, 0);
    return { R, update };
  })();

  // ============ 4. sky canal: Extras to the Greenhouse ============
  const canal = (() => {
    const R = ride('boat'), { g, L, rise, S, pitch } = R, ext = 0.8, W = 1.8;
    // water: a ribbon that carries a scrolling ripple map with chevrons pointing uphill
    const waterTex = canvasTex(256, 128, (q, w, h) => {
      const gr = q.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3f6e68'); gr.addColorStop(0.5, '#4f857d'); gr.addColorStop(1, '#3f6e68'); q.fillStyle = gr; q.fillRect(0, 0, w, h);
      q.lineCap = 'round'; q.strokeStyle = 'rgba(224,246,240,0.38)'; q.lineWidth = 2.5;
      for (let k = 0; k < 24; k++) { const x = rnd(k) * w, y = rnd(k + 50) * h, l = 26 + rnd(k + 90) * 60; for (const o of [-w, 0, w]) { q.beginPath(); q.moveTo(x + o, y); q.lineTo(x + o + l, y); q.stroke(); } }
      q.strokeStyle = 'rgba(247,239,226,0.6)'; q.lineWidth = 4; q.lineJoin = 'round';
      for (const [cx, cy] of [[70, 34], [200, 64], [70, 100]]) { q.beginPath(); q.moveTo(cx - 15, cy - 15); q.lineTo(cx, cy); q.lineTo(cx - 15, cy + 15); q.stroke(); }
    });
    waterTex.repeat.set((S + 2 * ext) / 3.6, 1);
    const wGeo = new THREE.PlaneGeometry(S + 2 * ext, W); wGeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({ map: waterTex, color: 0xffffff, roughness: 0.25, metalness: 0.1, emissive: 0x1f4a46, emissiveIntensity: 0.5, transparent: true, opacity: 0.92 }));
    water.position.set(L / 2, rise / 2 - 0.05, 0); water.rotation.z = pitch; g.add(water);
    const bed = new THREE.Mesh(wGeo, M(0x24403d)); bed.position.set(L / 2, rise / 2 - 0.4, 0); bed.rotation.z = pitch; g.add(bed);
    // low stone kerbs, block by block
    const bl = low ? 0.9 : 0.72, nk = Math.ceil((S + 2 * ext) / bl), kerb = inst(new THREE.BoxGeometry(bl - 0.03, 0.5, 0.24), M(0xffffff), nk * 2, g);
    for (let s = 0; s < 2; s++) for (let k = 0; k < nk; k++) {
      const i = s * nk + k, t = -ext + (k + 0.5) * bl, x = t * L / S, jit = (rnd(i) - 0.5) * 0.06;
      put(kerb, i, x, rise * x / L - 0.1 + jit, (s ? -1 : 1) * 1.02, 0, (rnd(i + 5) - 0.5) * 0.03, pitch);
      TC.setHex(rnd(i + 20) < 0.5 ? 0xb8b0a2 : 0xa59d8d).multiplyScalar(0.9 + rnd(i + 30) * 0.2); kerb.setColorAt(i, TC);
    }
    // the waterfall in reverse: a column rising 30 m into the lower end, with spray
    const xc = 0.4, yTop = rise * xc / L - 0.06, colH = 30;
    const streak = (a) => canvasTex(64, 256, (q, w, h) => {
      q.clearRect(0, 0, w, h); q.lineCap = 'round';
      for (let k = 0; k < 40; k++) { const x = rnd(k + a) * w, y = rnd(k + a + 70) * h, l = 30 + rnd(k + a + 120) * 90; q.strokeStyle = `rgba(235,250,246,${0.25 + rnd(k + a + 9) * 0.5})`; q.lineWidth = 1.5 + rnd(k + a + 33) * 2.5; for (const o of [-h, 0, h]) { q.beginPath(); q.moveTo(x, y + o); q.lineTo(x, y + o + l); q.stroke(); } }
    });
    const colTex = streak(0), coreTex = low ? null : streak(300);
    colTex.repeat.set(3, 5);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, colH, 18, 1, true), new THREE.MeshBasicMaterial({ map: colTex, color: 0xbfe6e0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    col.position.set(xc, yTop - colH / 2, 0); g.add(col);
    let core = null;
    if (coreTex) { coreTex.repeat.set(2, 3); core = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, colH, 14, 1, true), new THREE.MeshBasicMaterial({ map: coreTex, color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); core.position.set(xc, yTop - colH / 2, 0); g.add(core); }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.86, 24), new THREE.MeshBasicMaterial({ color: 0xf7efe2, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(xc, yTop + 0.02, 0); g.add(ring);
    const NP = low ? 48 : 150, pp = new Float32Array(NP * 3), pa = new Float32Array(NP), ps = new Float32Array(NP), pf = new Float32Array(NP), pr = new Float32Array(NP);
    for (let i = 0; i < NP; i++) { pa[i] = rnd(i) * 6.283; ps[i] = 0.25 + rnd(i + 200) * 0.35; pf[i] = rnd(i + 400); pr[i] = 0.4 + rnd(i + 600) * 0.6; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const spr = new THREE.Points(pg, new THREE.PointsMaterial({ size: low ? 0.2 : 0.15, color: 0xe4f6f2, transparent: true, opacity: 0.7, depthWrite: false, map: canvasTex(32, 32, (q, w) => {
      const r = q.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = r; q.fillRect(0, 0, w, w);
    }, false) }));
    spr.frustumCulled = false; g.add(spr);

    // the paper boat: a folded hull, open ends rising to points, floor at the water line + 0.05
    const hl = 0.8, bl2 = 0.5, fw = 0.28, tw = 0.5, hh = 0.5, tip = 0.95, P = [];
    const quad = (a, b, c, d) => P.push(...a, ...b, ...c, ...a, ...c, ...d);
    quad([-bl2, 0, -fw], [bl2, 0, -fw], [bl2, 0, fw], [-bl2, 0, fw]);
    for (const s of [-1, 1]) quad([-bl2, 0, s * fw], [bl2, 0, s * fw], [hl, hh, s * tw], [-hl, hh, s * tw]);
    for (const e of [-1, 1]) { quad([e * bl2, 0, -fw], [e * bl2, 0, fw], [e * hl, hh, tw], [e * hl, hh, -tw]); P.push(e * hl, hh, -tw, e * hl, hh, tw, e * (hl - 0.04), tip, 0); }
    const uv = []; for (let i = 0; i < P.length; i += 3) uv.push(P[i] / 1.6 + 0.5, (P[i + 2] + P[i + 1] * 0.7) + 0.5);
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); hg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); hg.computeVertexNormals();
    const paper = canvasTex(256, 256, (q, w, h) => {
      q.fillStyle = '#f7efe2'; q.fillRect(0, 0, w, h);
      for (let k = 0; k < 500; k++) { q.fillStyle = `rgba(158,140,110,${rnd(k) * 0.09})`; q.fillRect(rnd(k + 1) * w, rnd(k + 2) * h, 1 + rnd(k + 3) * 5, 1); }
      q.strokeStyle = 'rgba(47,95,168,0.3)'; q.lineWidth = 1; for (let y = 24; y < h; y += 20) { q.beginPath(); q.moveTo(0, y); q.lineTo(w, y); q.stroke(); }
      q.strokeStyle = 'rgba(158,59,44,0.5)'; q.beginPath(); q.moveTo(36, 0); q.lineTo(36, h); q.stroke();
      q.fillStyle = 'rgba(30,42,38,0.55)'; q.font = '16px "Courier New", monospace'; for (let y = 38; y < h - 10; y += 40) q.fillText('draw the line here', 46, y);
    });
    const boat = new THREE.Group(); boat.rotation.order = 'ZXY'; g.add(boat);
    boat.add(new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9, side: THREE.DoubleSide })));
    boat.add(new THREE.LineSegments(new THREE.EdgesGeometry(hg, 5), new THREE.LineBasicMaterial({ color: COL.ink, transparent: true, opacity: 0.4 })));
    function update(time, dt, u) {
      waterTex.offset.x = -time * 0.35; colTex.offset.y = -time * 1.6; if (coreTex) coreTex.offset.y = -time * 2.4; // everything runs up
      ring.scale.setScalar(1 + Math.sin(time * 2.4) * 0.04);
      const pos = pg.attributes.position.array;
      for (let i = 0; i < NP; i++) {
        const f = fract(time * ps[i] + pf[i]), rad = 0.1 + f * 0.8 * pr[i], a = pa[i] + time * 0.4;
        pos[i * 3] = xc + Math.cos(a) * rad; pos[i * 3 + 1] = yTop - 2.2 + f * 2.8; pos[i * 3 + 2] = Math.sin(a) * rad;
      }
      pg.attributes.position.needsUpdate = true;
      boat.position.set(u * L, rise * u + Math.sin(time * 1.7) * 0.015, 0);
      boat.rotation.set(Math.sin(time * 1.3) * 0.025, 0, pitch + Math.sin(time * 1.1 + 1) * 0.012);
    }
    update(0, 1, 0);
    return { R, update };
  })();

  // ============ 5. kites: the lift from the Greenhouse to the Rooftop ============
  const kites = (() => {
    const grp = new THREE.Group(); root.add(grp);
    const tether = new THREE.Vector3(GREEN.x0 + 1.6, H.greenhouse + 2.2, 2.2), bar = new THREE.Vector3(), last = new THREE.Vector3().copy(tether);
    const kc = [COL.oxide, COL.butter, COL.teal, COL.rose, COL.sky];
    const flyH = [4.4, 5.6, 4.0, 5.2, 6.0], waitH = [3.0, 3.8, 2.6, 3.4, 3.9], flyX = [-1.8, -0.9, 0, 0.9, 1.8], flyZ = [0.4, -0.6, 0.2, -0.3, 0.5];
    const NT = 7, fades = [];
    // diamond: four triangles from the shoulder, lit a little differently
    const kg = new THREE.BufferGeometry(), V = [[0, 0.65, 0], [0.5, 0.1, 0], [0, -0.65, 0], [-0.5, 0.1, 0]], C0 = [0, 0.1, 0], shade = [1.0, 0.82, 0.68, 0.88], kp = [], kcol = [];
    for (let i = 0; i < 4; i++) { kp.push(...C0, ...V[i], ...V[(i + 1) % 4]); const s = shade[i]; kcol.push(1, 1, 1, s, s, s, s, s, s); }
    kg.setAttribute('position', new THREE.Float32BufferAttribute(kp, 3)); kg.setAttribute('color', new THREE.Float32BufferAttribute(kcol, 3)); kg.computeVertexNormals();
    const spar = new THREE.BoxGeometry(0.014, 1.3, 0.014), spar2 = new THREE.BoxGeometry(1.0, 0.014, 0.014);
    const ks = kc.map((c, i) => {
      const k = new THREE.Group(); grp.add(k);
      const mat = new THREE.MeshStandardMaterial({ color: c, vertexColors: true, side: THREE.DoubleSide, roughness: 0.8, emissive: c, emissiveIntensity: 0.12, transparent: true });
      fades.push(mat); k.add(new THREE.Mesh(kg, mat));
      if (!low) { const sm = M(0x6b4a32, { transparent: true }); fades.push(sm); const a = new THREE.Mesh(spar, sm), b = new THREE.Mesh(spar2, sm); a.position.set(0, 0, 0.006); b.position.set(0, 0.1, 0.006); k.add(a, b); }
      return k;
    });
    // handle bar
    const hb = new THREE.Group(); grp.add(hb);
    const wood = M(COL.timber, { transparent: true }), wrap = M(COL.oxide, { transparent: true }); fades.push(wood, wrap);
    box(0.36, 0.035, 0.035, wood, 0, 0, 0, hb);
    for (const s of [-1, 1]) { const kn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), wood); kn.position.x = s * 0.185; hb.add(kn); box(0.09, 0.042, 0.042, wrap, s * 0.09, 0, 0, hb); }
    // strings and tails as line segments
    const sg = new THREE.BufferGeometry(), sp = new Float32Array(5 * 2 * 3); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const tg = new THREE.BufferGeometry(), tp = new Float32Array(5 * NT * 2 * 3); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    const sm = new THREE.LineBasicMaterial({ color: COL.cream, transparent: true, opacity: 0.8 }), tm = new THREE.LineBasicMaterial({ color: COL.ink, transparent: true, opacity: 0.7 });
    const sl = new THREE.LineSegments(sg, sm), tl = new THREE.LineSegments(tg, tm); sl.frustumCulled = tl.frustumCulled = false; grp.add(sl, tl);
    // bows on the tails (desktop)
    const bowG = new THREE.BufferGeometry(); bowG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.09, 0.05, 0, 0.09, -0.05, 0, 0, 0, 0, -0.09, 0.05, 0, -0.09, -0.05, 0], 3));
    const bowM = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true }); fades.push(bowM);
    const bows = low ? null : inst(bowG, bowM, 5 * 3, grp);
    if (bows) for (let i = 0; i < 15; i++) { TC.setHex(kc[(Math.floor(i / 3) + (i % 3) + 1) % 5]); bows.setColorAt(i, TC); }
    let after = 0;
    function update(time, dt, cam, kite) {
      let fade = 1, w = 0;
      if (kite >= 0 && kite <= 1) {
        w = sstep(0, 0.08, kite); bar.set(cam.x, cam.y + 0.6, cam.z).lerp(tether, 1 - w); // bar rides 0.6 m over the eye
        last.copy(bar); after = 0;
      } else if (kite < 0) { bar.copy(tether); after = 0; }
      else { after += dt; const t = after; bar.set(last.x + t * 0.9, last.y + t * 2.2 + t * t * 0.5, last.z + t * 0.5); fade = 1 - sstep(0.4, 3.5, t); w = 1; }
      const dx = cam.x - bar.x, dy = cam.y - bar.y, dz = cam.z - bar.z;
      const show = fade > 0.003 && dx * dx + dy * dy + dz * dz < 150 * 150;
      grp.visible = show; if (!show) return;
      for (const m of fades) m.opacity = fade;
      sm.opacity = 0.8 * fade; tm.opacity = 0.7 * fade;
      hb.position.copy(bar); hb.rotation.y = Math.sin(time * 0.7) * 0.15;
      for (let i = 0; i < 5; i++) {
        const k = ks[i], h = waitH[i] + (flyH[i] - waitH[i]) * w, spread = 0.5 + 0.5 * w;
        k.position.set(bar.x + flyX[i] * spread + Math.sin(time * 0.8 + i * 1.7) * 0.35, bar.y + h + Math.sin(time * 1.1 + i * 2.3) * 0.15, bar.z + flyZ[i] + Math.sin(time * 0.6 + i * 0.9) * 0.3);
        k.rotation.set(Math.PI / 2 - 0.35 + Math.sin(time * 1.1 + i) * 0.12, 0, Math.sin(time * 0.9 + i * 2) * 0.15);
        const o = i * 6;
        sp[o] = bar.x + (i - 2) * 0.07; sp[o + 1] = bar.y + 0.03; sp[o + 2] = bar.z; sp[o + 3] = k.position.x; sp[o + 4] = k.position.y; sp[o + 5] = k.position.z;
        A3.set(0, -0.65, 0).applyEuler(k.rotation).add(k.position); // the kite's lower tip
        let px = A3.x, py = A3.y, pz = A3.z;
        for (let j = 0; j < NT; j++) {
          const q = (i * NT + j) * 6, kk = j + 1, nx = A3.x + Math.sin(time * 2.2 + kk * 0.9 + i) * 0.1 * kk, ny = A3.y - 0.14 * kk, nz = A3.z - 0.2 * kk;
          tp[q] = px; tp[q + 1] = py; tp[q + 2] = pz; tp[q + 3] = nx; tp[q + 4] = ny; tp[q + 5] = nz;
          if (bows && (j === 1 || j === 3 || j === 5)) put(bows, i * 3 + (j - 1) / 2, nx, ny, nz, 0, 0, Math.sin(time * 3 + j + i) * 0.6);
          px = nx; py = ny; pz = nz;
        }
      }
      sg.attributes.position.needsUpdate = true; tg.attributes.position.needsUpdate = true;
      if (bows) bows.instanceMatrix.needsUpdate = true;
    }
    return { update };
  })();

  // ============ per-frame ============
  let meshes = 0; root.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine) meshes++; });
  function update(time, dt, cam, kite) {
    const R = rope.R;
    follow(R, cam);
    if (R.active) rope.update(time, dt);
    for (const d of doors.list) d.f.position.y = d.base + Math.sin(time * 0.6 + d.i * 1.3) * 0.04;
    const uc = follow(funi.R, cam); if (funi.R.active) funi.update(time, dt, uc);
    const ub = follow(canal.R, cam); if (canal.R.active) canal.update(time, dt, ub);
    kites.update(time, dt, cam, kite);
  }
  return { update, meshes };
}
