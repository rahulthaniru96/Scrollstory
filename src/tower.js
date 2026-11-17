// The clock tower in the middle of the floating fragments: a Secunderabad-style stone tower (1896) on a stepped plinth, a clock on each
// face, a lantern and a teal cupola with a brass finial and a little flag, rooted below in rough hanging rock with roots, plant strands and slow drips.
// Everything is positioned from HUB. Almost all the stone is merged into one mesh per material; there are no lights, only emissive
// materials and additive sprites. The hands show the walk: the hour hand goes once round, the minute hand twelve times.
import * as THREE from 'three';
import { HUB } from './world.js';

const TAU = Math.PI * 2;

function merge(list, flat) {
  if (!list.length) return null;
  const gs = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const n = gs.reduce((s, g) => s + g.attributes.position.count, 0);
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
  let o = 0;
  for (const g of gs) {
    P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); U.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  if (flat) geo.computeVertexNormals();
  return geo;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function tower({ scene, lowQuality, glowTexture }) {
  const low = !!lowQuality;
  const root = new THREE.Group(); root.position.set(HUB.x, 0, HUB.z); scene.add(root);
  let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const glowMap = glowTexture || canvasTex(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  });

  // ---------- materials ----------
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
  const lampMat = std(0x1e2a26, { emissive: 0xffd27a, emissiveIntensity: 0 });
  const crystalMat = std(0xcdbbff, { emissive: 0xcdbbff, emissiveIntensity: 0.6, roughness: 0.4 });
  const MAT = {
    plinth: std(0x8c8a82), cream: std(0xd8cdb8), ink: std(0x1e2a26, { roughness: 0.95 }),
    brass: std(0xc9a24a, { roughness: 0.35, metalness: 0.3, emissive: 0x2a1d05 }), teal: std(0x3f6e68, { roughness: 0.6 }),
    rock: std(0xa89c88, { flatShading: true }), root: std(0x6b5440, { roughness: 0.95 }), lamp: lampMat, crystal: crystalMat,
  };
  const bucket = {}; for (const k in MAT) bucket[k] = [];

  const A = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  const put = (key, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    A.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz)); bucket[key].push(geo.clone().applyMatrix4(A));
  };
  // Place something on all four faces: local +z points out of the face, so face 0 is south (+z), then east, north, west.
  const onFaces = (key, geo, lx, ly, lz) => {
    for (let i = 0; i < 4; i++) { const ry = i * Math.PI / 2, c = Math.cos(ry), s = Math.sin(ry); put(key, geo, lx * c + lz * s, ly, -lx * s + lz * c, 0, ry, 0); }
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const arch = (w, h) => { // an arched opening: flat bottom, round top
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
    return new THREE.ShapeGeometry(s, 8);
  };

  const { y0, y1, face } = HUB;
  const SH = 1.3, ST = 1.45; // half width of the shaft and of the clock stage
  const shaftY0 = y0 + 1.8, stageY0 = face - 1.7, stageY1 = face + 1.7;

  // ---------- plinth: three steps, with a little plinth cap ----------
  [3.4, 3.1, 2.8].forEach((w, i) => put('plinth', box(w, 0.6, w), 0, y0 + 0.3 + i * 0.6, 0));
  put('cream', box(2.95, 0.1, 2.95), 0, y0 + 1.85, 0);

  // ---------- the shaft: ashlar blocks drawn once on a canvas ----------
  const ashlar = canvasTex(256, 256, (x) => {
    x.fillStyle = '#b9ad98'; x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) {
      const off = r % 2 ? 64 : 0, tone = 200 + Math.floor(rnd() * 28);
      x.fillStyle = `rgb(${tone + 14},${tone + 4},${tone - 22})`; x.fillRect(((k * 128 + off) % 256) + 2, r * 64 + 2, 124, 60);
      if (off) { x.fillRect(2, r * 64 + 2, 62, 60); }
    }
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(80,60,40,${0.04 + rnd() * 0.06})`; x.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 1 + rnd() * 3); }
  });
  ashlar.wrapS = ashlar.wrapT = THREE.RepeatWrapping; ashlar.repeat.set(2, (stageY0 - shaftY0) / 2);
  const shaft = new THREE.Mesh(box(SH * 2, stageY0 - shaftY0, SH * 2), std(0xffffff, { map: ashlar }));
  shaft.position.set(0, (stageY0 + shaftY0) / 2, 0); root.add(shaft);

  // corner pilasters with bases and capitals
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    put('cream', box(0.3, stageY0 - shaftY0, 0.3), sx * SH, (stageY0 + shaftY0) / 2, sz * SH);
    put('plinth', box(0.4, 0.2, 0.4), sx * SH, shaftY0 + 0.1, sz * SH);
    put('plinth', box(0.4, 0.14, 0.4), sx * SH, stageY0 - 0.07, sz * SH);
  }
  // string courses: a thin double band at each level
  for (const y of [27.5, 31.3, 35.1, 38.7]) { put('cream', box(2.95, 0.12, 2.95), 0, y, 0); put('plinth', box(2.78, 0.08, 2.78), 0, y - 0.09, 0); }
  put('plinth', box(3.05, 0.2, 3.05), 0, stageY0 - 0.1, 0);

  // ---------- tall narrow arched windows: surround, dark recess, sill, a cross bar; a few come on at dusk ----------
  const levels = [24.8, 28.6, 32.4, 36.2].map((y) => y + (y0 - 22));
  const lamps = low ? [[0, 1], [2, 0]] : [[0, 1], [1, 2], [2, 0], [3, 3]], lampSprites = [];
  const winSur = arch(0.62, 1.7), winHole = arch(0.46, 1.55), winLamp = arch(0.36, 1.4);
  levels.forEach((wy, li) => {
    for (let f = 0; f < 4; f++) {
      const ry = f * Math.PI / 2, c = Math.cos(ry), s = Math.sin(ry);
      const lit = lamps.some(([lf, ll]) => lf === f && ll === li);
      const at = (lz) => [lz * s, 0, lz * c];
      put('cream', winSur, at(SH + 0.012)[0], wy - 0.05, at(SH + 0.012)[2], 0, ry, 0);
      put('ink', winHole, at(SH + 0.03)[0], wy, at(SH + 0.03)[2], 0, ry, 0);
      if (lit) put('lamp', winLamp, at(SH + 0.045)[0], wy + 0.05, at(SH + 0.045)[2], 0, ry, 0);
      put('cream', box(0.72, 0.07, 0.14), at(SH + 0.06)[0], wy - 0.08, at(SH + 0.06)[2], 0, ry, 0); // sill
      put('cream', box(0.46, 0.04, 0.05), at(SH + 0.06)[0], wy + 0.7, at(SH + 0.06)[2], 0, ry, 0); // transom
      if (lit && !low) lampSprites.push([f, wy + 0.7, SH + 0.3]);
    }
  });

  // ---------- clock stage: a slightly wider drum, a square surround behind each dial ----------
  put('cream', box(ST * 2, stageY1 - stageY0, ST * 2), 0, (stageY0 + stageY1) / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put('plinth', box(0.24, stageY1 - stageY0, 0.24), sx * ST, (stageY0 + stageY1) / 2, sz * ST);
  const rimG = new THREE.TorusGeometry(0.99, 0.055, 8, 48), stud = new THREE.SphereGeometry(0.04, 6, 4), boss = new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12).rotateX(Math.PI / 2);
  const dialZ = ST + 0.045;
  onFaces('cream', box(2.3, 2.3, 0.05), 0, face, ST + 0.012);
  onFaces('brass', rimG, 0, face, dialZ);
  onFaces('brass', boss, 0, face, dialZ + 0.055);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) onFaces('brass', stud, sx * 1.08, face + sy * 1.08, ST + 0.05);
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12; onFaces('brass', stud, Math.sin(a) * 0.99, face + Math.cos(a) * 0.99, dialZ + 0.04); } // studs on the rim

  // ---------- cornice with dentils, the balcony rail, four pinnacles ----------
  const cy = stageY1;
  put('cream', box(3.15, 0.14, 3.15), 0, cy + 0.07, 0); put('plinth', box(3.4, 0.16, 3.4), 0, cy + 0.22, 0); put('cream', box(3.25, 0.1, 3.25), 0, cy + 0.35, 0);
  const dent = box(0.13, 0.1, 0.14); for (let x = -1.35; x <= 1.36; x += 0.27) onFaces('cream', dent, x, cy - 0.04, ST + 0.06);
  const railY = cy + 0.4, post = new THREE.CylinderGeometry(0.022, 0.022, 0.5, 5), step = low ? 0.5 : 0.28;
  for (let x = -1.4; x <= 1.41; x += step) onFaces('brass', post, x, railY + 0.25, 1.5);
  onFaces('brass', box(3.1, 0.05, 0.06), 0, railY + 0.52, 1.5); onFaces('brass', box(3.1, 0.04, 0.05), 0, railY + 0.06, 1.5);
  const pin = new THREE.ConeGeometry(0.1, 0.55, 6), ball = new THREE.SphereGeometry(0.07, 8, 6);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    put('cream', box(0.22, 0.3, 0.22), sx * 1.52, railY + 0.15, sz * 1.52); put('cream', pin, sx * 1.52, railY + 0.55, sz * 1.52); put('brass', ball, sx * 1.52, railY + 0.86, sz * 1.52);
  }

  // ---------- lantern: four arched openings between little columns, a slab, the cupola ----------
  const lanY0 = cy + 0.4, lanY1 = y1 - 1.9;
  put('cream', box(2, lanY1 - lanY0, 2), 0, (lanY0 + lanY1) / 2, 0);
  const lanHole = arch(0.62, 1.05); onFaces('ink', lanHole, 0, lanY0 + 0.15, 1.012);
  const lanTop = arch(0.8, 1.15); onFaces('cream', lanTop, 0, lanY0 + 0.1, 1.006);
  const col = new THREE.CylinderGeometry(0.08, 0.1, lanY1 - lanY0, 8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put('cream', col, sx * 1.0, (lanY0 + lanY1) / 2, sz * 1.0);
  put('plinth', box(2.4, 0.12, 2.4), 0, lanY1 + 0.06, 0);
  const cupY = lanY1 + 0.12, cupH = y1 - 0.7 - cupY, R = 1.15;
  const prof = [[1, 0], [1.05, 0.08], [1.0, 0.22], [0.8, 0.42], [0.5, 0.62], [0.28, 0.78], [0.16, 0.88], [0.08, 0.96], [0.03, 1]].map(([r, t]) => new THREE.Vector2(r * R, t * cupH));
  put('teal', new THREE.LatheGeometry(prof, low ? 12 : 20), 0, cupY, 0);
  put('brass', new THREE.TorusGeometry(1.08, 0.04, 6, low ? 16 : 28), 0, cupY + 0.1, 0, Math.PI / 2, 0, 0);
  // finial: ball, pole, tip
  put('brass', new THREE.SphereGeometry(0.1, 10, 8), 0, cupY + cupH + 0.05, 0);
  put('brass', new THREE.CylinderGeometry(0.014, 0.02, y1 - (cupY + cupH), 5), 0, (y1 + cupY + cupH) / 2, 0);
  put('brass', new THREE.ConeGeometry(0.03, 0.12, 5), 0, y1 - 0.02, 0);

  // ---------- rooted in rock below y0: an upside-down rough cone, loose chunks, roots, glowing crystals ----------
  const coneH = 6.15, coneTop = y0 + 0.15;
  const rr = (d) => 2.6 * Math.max(0, 1 - d / coneH); // radius of the cone at a depth below its top
  const coneG = new THREE.ConeGeometry(2.6, coneH, low ? 8 : 11, 5);
  const cp = coneG.attributes.position;
  for (let i = 0; i < cp.count; i++) { // position-based noise, so the seam stays closed
    const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i), n = 1 + 0.2 * Math.sin(x * 2.3 + z * 1.9 + y * 1.1) * Math.min(1, (coneH / 2 - y) / 1.5 + 0.2) + 0.08 * Math.sin(y * 4.1 + x * 3.3);
    cp.setXYZ(i, x * n, y + 0.12 * Math.sin(x * 5 + z * 4), z * n);
  }
  put('rock', coneG, 0, coneTop - coneH / 2, 0, Math.PI, 0, 0);
  for (let i = 0; i < (low ? 3 : 5); i++) { // satellite spurs hanging off the rim
    const a = i * 2.4 + 0.5, h = 2 + rnd() * 1.6, r = 0.6 + rnd() * 0.4, d = 0.4 + rnd() * 0.8;
    put('rock', new THREE.ConeGeometry(r, h, 6), Math.cos(a) * (rr(d) - 0.2), coneTop - d - h / 2, Math.sin(a) * (rr(d) - 0.2), Math.PI, a, 0.1);
  }
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + 1; put('rock', new THREE.IcosahedronGeometry(0.28 + rnd() * 0.2, 0), Math.cos(a) * 1.1, coneTop - 4.6 - i * 1.1, Math.sin(a) * 1.1, rnd(), rnd(), 0, 1, 0.8, 0.9); } // chunks that have let go
  const rootG = new THREE.CylinderGeometry(0.07, 0.015, 1, 5); rootG.translate(0, -0.5, 0);
  for (let i = 0; i < (low ? 4 : 8); i++) {
    const a = rnd() * TAU, d = 0.4 + rnd() * 3.2, len = 1.4 + rnd() * 1.8, r0 = rr(d) * 0.95;
    put('root', rootG, Math.cos(a) * r0, coneTop - d, Math.sin(a) * r0, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35, 1, len, 1);
  }
  const cryst = new THREE.ConeGeometry(0.09, 0.5, 5);
  for (let i = 0; i < 3; i++) { const a = i * 2.1; put('crystal', cryst, Math.cos(a) * 0.35, coneTop - 5.55 - i * 0.05, Math.sin(a) * 0.35, Math.PI, 0, 0.25); }

  for (const k in bucket) {
    const g = merge(bucket[k], k === 'rock'); if (!g) continue;
    root.add(new THREE.Mesh(g, MAT[k]));
  }

  // ---------- the clock faces: drawn once, glowing from inside at dusk ----------
  const dialTex = canvasTex(512, 512, (x) => {
    x.fillStyle = '#f7efe2'; x.beginPath(); x.arc(256, 256, 256, 0, TAU); x.fill();
    x.strokeStyle = '#1e2a26'; x.lineWidth = 5; x.beginPath(); x.arc(256, 256, 240, 0, TAU); x.stroke();
    x.lineWidth = 2; x.beginPath(); x.arc(256, 256, 170, 0, TAU); x.stroke();
    x.fillStyle = '#1e2a26'; for (let m = 0; m < 60; m++) { const a = m * TAU / 60; x.beginPath(); x.arc(256 + Math.sin(a) * 224, 256 - Math.cos(a) * 224, m % 5 ? 3 : 0.1, 0, TAU); x.fill(); }
    x.strokeStyle = '#1e2a26'; x.lineCap = 'butt';
    for (let h = 0; h < 12; h++) {
      const a = h * TAU / 12, main = h % 3 === 0; x.lineWidth = main ? 15 : 8;
      x.beginPath(); x.moveTo(256 + Math.sin(a) * 178, 256 - Math.cos(a) * 178); x.lineTo(256 + Math.sin(a) * 214, 256 - Math.cos(a) * 214); x.stroke();
    }
    x.fillStyle = '#9e3b2c'; x.beginPath(); x.moveTo(256, 120); x.lineTo(266, 135); x.lineTo(256, 150); x.lineTo(246, 135); x.closePath(); x.fill(); // a small oxide diamond under 12
  });
  const faceMat = std(0xffffff, { map: dialTex, emissiveMap: dialTex, emissive: 0xffe6b0, emissiveIntensity: 0.03, roughness: 0.6 });
  const inkMat = std(0x1e2a26, { side: THREE.DoubleSide, roughness: 0.6 });
  const faceGeo = new THREE.CircleGeometry(0.95, 48);
  const mkHand = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return new THREE.ShapeGeometry(s); };
  const hourG = mkHand([[-0.045, -0.12], [0.045, -0.12], [0.06, 0.2], [0, 0.55], [-0.06, 0.2]]);
  const minG = mkHand([[-0.03, -0.18], [0.03, -0.18], [0.022, 0.75], [0, 0.88], [-0.022, 0.75]]);
  const hourHands = [], minHands = [], haloMat = new THREE.SpriteMaterial({ map: glowMap, color: 0xffe2a8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let f = 0; f < 4; f++) {
    const g = new THREE.Group(); g.rotation.y = f * Math.PI / 2; root.add(g);
    const fm = new THREE.Mesh(faceGeo, faceMat); fm.position.set(0, face, dialZ); g.add(fm);
    const hh = new THREE.Mesh(hourG, inkMat); hh.position.set(0, face, dialZ + 0.015); g.add(hh); hourHands.push(hh);
    const mh = new THREE.Mesh(minG, inkMat); mh.position.set(0, face, dialZ + 0.03); g.add(mh); minHands.push(mh);
    const halo = new THREE.Sprite(haloMat); halo.scale.set(3.6, 3.6, 1); halo.position.set(0, face, dialZ + 0.35); g.add(halo);
  }

  // ---------- keyhole: a brass plate under the south dial, a click target ----------
  const keyhole = new THREE.Mesh(box(0.06, 0.1, 0.02), std(0xc9a24a, { roughness: 0.4, metalness: 0.3, emissive: 0xffb347, emissiveIntensity: 0 }));
  keyhole.position.set(ST + 0.02, face - 1.3, 0); keyhole.rotation.y = Math.PI / 2; keyhole.scale.setScalar(3); root.add(keyhole); // on the east face, which the map room looks at; big enough to find
  const slotMat = new THREE.MeshBasicMaterial({ color: 0x1e2a26 });
  const kc = new THREE.Mesh(new THREE.CircleGeometry(0.013, 10), slotMat); kc.position.set(0, 0.015, 0.0105); keyhole.add(kc);
  const ks = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.035), slotMat); ks.position.set(0, -0.012, 0.0105); keyhole.add(ks);

  // ---------- window glow sprites, rock glow, flag ----------
  const lampSpriteMat = new THREE.SpriteMaterial({ map: glowMap, color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const [f, y, z] of lampSprites) { const sp = new THREE.Sprite(lampSpriteMat); const ry = f * Math.PI / 2; sp.position.set(Math.sin(ry) * z, y, Math.cos(ry) * z); sp.scale.set(1.6, 1.6, 1); root.add(sp); }
  const tipMat = new THREE.SpriteMaterial({ map: glowMap, color: 0xcdbbff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
  const tip = new THREE.Sprite(tipMat); tip.scale.set(4, 4, 1); tip.position.set(0, coneTop - coneH + 0.2, 0); root.add(tip);

  const flagG = new THREE.PlaneGeometry(0.5, 0.22, 6, 1).translate(0.25, 0, 0);
  const flagPos = flagG.attributes.position, flagX = Float32Array.from(flagPos.array.filter((_, i) => i % 3 === 0));
  const flag = new THREE.Mesh(flagG, std(0x9e3b2c, { side: THREE.DoubleSide })); flag.position.set(0.02, y1 - 0.2, 0); root.add(flag);

  // ---------- hanging plant strands that sway ----------
  const leafMat = std(0x4f7a4a, { roughness: 0.9, side: THREE.DoubleSide }), strands = [];
  const strandGeo = (len) => {
    const parts = [new THREE.CylinderGeometry(0.02, 0.012, len, 5).translate(0, -len / 2, 0)], leaf = new THREE.OctahedronGeometry(0.09);
    for (let k = 1; k <= 4; k++) { const l = leaf.clone().scale(1, 0.55, 0.25).rotateZ(k % 2 ? 0.7 : -0.7).translate((k % 2 ? 1 : -1) * 0.07, -len * k / 5, 0); parts.push(l); }
    return merge(parts);
  };
  const geos = [strandGeo(2.2), strandGeo(3.1), strandGeo(4)];
  for (let i = 0; i < (low ? 3 : 6); i++) {
    const a = i * 1.05 + 0.3, d = 0.2 + rnd() * 1.4, m = new THREE.Mesh(geos[i % 3], leafMat);
    m.position.set(Math.cos(a) * rr(d) * 0.97, coneTop - d, Math.sin(a) * rr(d) * 0.97); m.userData.ph = rnd() * TAU; root.add(m); strands.push(m);
  }

  // ---------- slow drips: fall from the underside, accelerate, fade about 25 m down, loop ----------
  const G = 6, FALL = 25, TF = Math.sqrt((2 * FALL) / G), SWELL = 0.9, dropGeo = new THREE.SphereGeometry(0.055, 8, 6), drops = [];
  for (let i = 0; i < (low ? 6 : 14); i++) {
    const a = rnd() * TAU, d = 2.8 + rnd() * 3.0, r = rr(d) * 0.8;
    const m = new THREE.Mesh(dropGeo, new THREE.MeshBasicMaterial({ color: 0xcfe9f2, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.set(Math.cos(a) * r, coneTop - d - 0.1, Math.sin(a) * r); root.add(m);
    drops.push({ m, ys: m.position.y, cyc: SWELL + TF + 0.5 + rnd() * 3, off: rnd() * 10 });
  }

  // ---------- per-frame ----------
  let shown = null;
  function update(time, dt, progress, dusk) {
    root.position.y = Math.sin((time * TAU) / 8) * 0.08; // everything bobs together
    const p = Math.min(1, Math.max(0, progress || 0)), d = Math.min(1, Math.max(0, dusk || 0));
    shown = shown === null ? p : shown + (p - shown) * (1 - Math.exp(-Math.min(dt, 0.1) * 6)); // eased: the hands never jump
    const ah = -shown * TAU, am = -shown * TAU * 12;
    for (let i = 0; i < 4; i++) { hourHands[i].rotation.z = ah; minHands[i].rotation.z = am; }
    faceMat.emissiveIntensity = 0.03 + d * 0.65; haloMat.opacity = d * 0.35; lampMat.emissiveIntensity = d * 1.6; lampSpriteMat.opacity = d * 0.6;
    crystalMat.emissiveIntensity = 0.5 + d * 0.8; tipMat.opacity = 0.2 + d * 0.3;
    for (let i = 0; i < flagX.length; i++) flagPos.setZ(i, Math.sin(flagX[i] * 12 - time * 6) * 0.05 * (flagX[i] / 0.5));
    flagPos.needsUpdate = true; flag.rotation.y = Math.sin(time * 1.3) * 0.25;
    for (let i = 0; i < strands.length; i++) { const s = strands[i]; s.rotation.z = Math.sin(time * 0.7 + s.userData.ph) * 0.08; s.rotation.x = Math.cos(time * 0.55 + s.userData.ph) * 0.06; }
    for (let i = 0; i < drops.length; i++) {
      const o = drops[i], t = (time + o.off) % o.cyc, m = o.m;
      if (t < SWELL) { const s = t / SWELL; m.visible = true; m.position.y = o.ys; m.scale.set(s, s * 1.4, s); m.material.opacity = 0.9; continue; }
      const u = t - SWELL;
      if (u > TF) { m.visible = false; continue; }
      const fell = 0.5 * G * u * u;
      m.visible = true; m.position.y = o.ys - fell; m.scale.set(1, 1.6, 1); m.material.opacity = 0.9 * Math.min(1, Math.max(0, 1 - (fell - 8) / (FALL - 8)));
    }
  }
  update(0, 0, 0, 0);
  return { update, keyhole };
}
