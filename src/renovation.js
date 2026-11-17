// 03 The Renovation: a glass pavilion on the courtyard water. The fictional demo café's old site fills the north wall, and its old shop stands in front of it.
// A line of light sweeps across the room as the walk crosses it: west of the line (behind the walker) everything is the new Scrollstory version, east of it the old one.
// Every old and new piece shares one place; a shader shows each only on its side of the line.
import * as THREE from 'three';
import { RENO } from './world.js';
import { SITES } from './gallery.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const CREAM = '#f7efe2', INK = '#1e2a26', OXIDE = '#9e3b2c', BUTTER = '#f2d98b', TEAL = '#3f6e68';
export const WIPE = { value: -99 }; // world x of the line

// side +1: the old version, seen east of the line. side -1: the new version, seen west of it. A thin lavender seam glows where they meet.
function split(mat, side) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWipe = WIPE;
    sh.vertexShader = 'varying float vWX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWX = (modelMatrix * vec4(transformed, 1.0)).x;');
    sh.fragmentShader = 'uniform float uWipe; varying float vWX;\n' + sh.fragmentShader
      .replace('void main() {', `void main() { if (${side.toFixed(1)} * (vWX - uWipe) < 0.0) discard;`)
      .replace('#include <fog_fragment>', '#include <fog_fragment>\ngl_FragColor.rgb += vec3(0.78, 0.68, 1.0) * (1.0 - smoothstep(0.0, 0.035, abs(vWX - uWipe))) * 1.6;');
  };
  mat.customProgramCacheKey = () => 'split' + side;
  return mat;
}

function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const paint = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  paint(); document.fonts?.ready.then(paint); // again once the web fonts are in
  return t;
}

// The café's site as it was: a free template from years ago. Grey, crowded, shouting, unfinished.
function oldSite(x, w, h) {
  x.fillStyle = '#c9c4b8'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#9a958a'; for (let i = 0; i < 900; i++) x.fillRect((i * 733) % w, (i * 389) % h, 2, 2); // grime
  x.fillStyle = '#6d7a86'; x.fillRect(0, 0, w, 150); // the header bar
  x.fillStyle = '#e9e6dd'; x.font = 'bold 82px "Times New Roman", Times, serif'; x.fillText('Welcome to Our Cafe Website!!!', 60, 105);
  // bevelled buttons
  ['Home', 'About Us', 'Menu', 'Gallery', 'Contact Us'].forEach((t, i) => {
    const bx = 60 + i * 380; x.fillStyle = '#b4b0a6'; x.fillRect(bx, 175, 340, 70); x.fillStyle = '#e4e1d9'; x.fillRect(bx, 175, 340, 6); x.fillRect(bx, 175, 6, 70);
    x.fillStyle = '#7b776e'; x.fillRect(bx, 239, 340, 6); x.fillRect(bx + 334, 175, 6, 70);
    x.fillStyle = '#2b3a8f'; x.font = '44px "Times New Roman", serif'; x.fillText(t, bx + 30, 225);
    x.fillRect(bx + 30, 232, x.measureText(t).width, 3); // underlined, like links once were
  });
  // a marquee that never finished scrolling
  x.fillStyle = '#7a1f1f'; x.fillRect(0, 280, w, 70); x.fillStyle = '#ffd400'; x.font = 'bold 50px "Courier New", monospace'; x.fillText('*** SPECIAL OFFER *** SPECIAL OFF', 300, 333);
  // stock photo boxes that never loaded
  for (let i = 0; i < 3; i++) {
    const bx = 60 + i * 640, by = 400; x.fillStyle = '#a7a297'; x.fillRect(bx, by, 580, 380); x.strokeStyle = '#6b675f'; x.lineWidth = 6; x.strokeRect(bx, by, 580, 380);
    x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + 580, by + 380); x.moveTo(bx + 580, by); x.lineTo(bx, by + 380); x.stroke();
    x.fillStyle = '#4b4842'; x.font = '36px Arial, sans-serif'; x.fillText(['image1.jpg', 'coffee_stock.jpg', 'IMG_0042.JPG'][i], bx + 30, by + 430);
  }
  // under construction
  x.save(); x.beginPath(); x.rect(60, 900, 900, 120); x.clip();
  for (let i = -4; i < 30; i++) { x.fillStyle = i % 2 ? '#1f1f1f' : '#e8c21a'; x.beginPath(); x.moveTo(60 + i * 60, 900); x.lineTo(120 + i * 60, 900); x.lineTo(60 + i * 60, 1020); x.lineTo(i * 60, 1020); x.fill(); }
  x.restore(); x.fillStyle = '#fff'; x.fillRect(250, 925, 520, 70); x.fillStyle = '#1f1f1f'; x.font = 'bold 50px Arial, sans-serif'; x.fillText('UNDER CONSTRUCTION', 262, 980);
  // a hit counter and the date it stopped
  x.fillStyle = '#111'; x.fillRect(1100, 910, 520, 100); x.fillStyle = '#39ff14'; x.font = 'bold 66px "Courier New", monospace'; x.fillText('000127', 1190, 985);
  x.fillStyle = '#3b3934'; x.font = '34px "Times New Roman", serif'; x.fillText('You are visitor number', 1100, 895); x.fillText('Best viewed at 1024 x 768', 1100, 1060); x.fillText('Copyright 2015. All rights reserved.', 60, 1100);
  // a cobweb in each top corner
  x.strokeStyle = 'rgba(245,245,240,0.75)'; x.lineWidth = 2;
  for (const [cx, sx] of [[0, 1], [w, -1]]) {
    for (let a = 0; a <= 6; a++) { const an = (a / 6) * Math.PI / 2; x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx + sx * Math.cos(an) * 420, Math.sin(an) * 420); x.stroke(); }
    for (let r = 70; r <= 420; r += 70) { x.beginPath(); for (let a = 0; a <= 6; a++) { const an = (a / 6) * Math.PI / 2, rr = r * (a % 2 ? 0.9 : 1); x[a ? 'lineTo' : 'moveTo'](cx + sx * Math.cos(an) * rr, Math.sin(an) * rr); } x.stroke(); }
  }
  // yellowed, as if the page has been in the sun for years
  x.fillStyle = 'rgba(160,140,90,0.16)'; x.fillRect(0, 0, w, h);
}

// The same café, the Scrollstory way: one story, room to breathe, the order button where a thumb finds it.
function newSite(x, w, h) {
  const site = SITES[0], [, hero, items, cta] = site.page, acc = '#' + site.accent.toString(16).padStart(6, '0');
  x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h);
  x.fillStyle = INK; x.fillRect(0, 0, w, 120);
  x.fillStyle = CREAM; x.font = '500 64px Fraunces, Georgia, serif'; x.fillText('Café', 70, 82);
  x.font = '500 30px "Familjen Grotesk", Arial, sans-serif'; ['Menu', 'Visit', 'Order'].forEach((t, i) => x.fillText(t, w - 560 + i * 170, 76));
  // hero: a warm panel, big serif words, a cup drawn in a few strokes
  const g = x.createLinearGradient(0, 120, 0, 640); g.addColorStop(0, acc); g.addColorStop(1, '#e9b98a'); x.fillStyle = g; x.fillRect(0, 120, w, 520);
  x.fillStyle = INK; x.font = '400 150px Fraunces, Georgia, serif'; x.fillText(hero.split(' ').slice(0, 2).join(' '), 70, 330); x.font = 'italic 400 150px Fraunces, Georgia, serif'; x.fillText(hero.split(' ').slice(2).join(' '), 70, 480);
  x.fillStyle = '#25d366'; x.beginPath(); x.roundRect(70, 530, 520, 84, 42); x.fill(); x.fillStyle = '#fff'; x.font = '600 40px "Familjen Grotesk", Arial, sans-serif'; x.fillText(cta, 116, 586);
  x.save(); x.translate(1330, 470); x.fillStyle = CREAM; x.beginPath(); x.ellipse(0, 40, 230, 40, 0, 0, 7); x.fill(); x.fillStyle = '#fffaf0'; x.beginPath(); x.moveTo(-150, -150); x.lineTo(150, -150); x.lineTo(110, 40); x.lineTo(-110, 40); x.fill();
  x.strokeStyle = '#fffaf0'; x.lineWidth = 26; x.beginPath(); x.arc(170, -60, 60, -1.2, 1.2); x.stroke(); x.fillStyle = '#6b4a3a'; x.beginPath(); x.ellipse(0, -150, 150, 22, 0, 0, 7); x.fill();
  x.strokeStyle = 'rgba(255,250,240,0.85)'; x.lineWidth = 12; x.lineCap = 'round'; for (const sx of [-60, 0, 60]) { x.beginPath(); x.moveTo(sx, -190); x.bezierCurveTo(sx - 40, -250, sx + 40, -290, sx, -350); x.stroke(); }
  x.restore();
  // the menu, three cards
  items.forEach((it, k) => {
    const bx = 70 + k * 640, by = 700; x.fillStyle = k % 2 ? '#efe6d6' : '#f6eee0'; x.beginPath(); x.roundRect(bx, by, 590, 300, 28); x.fill();
    x.fillStyle = [acc, BUTTER, TEAL][k]; x.beginPath(); x.arc(bx + 120, by + 150, 80, 0, 7); x.fill();
    x.fillStyle = INK; x.font = '500 52px Fraunces, Georgia, serif'; x.fillText(it, bx + 230, by + 140); x.font = '400 28px "Familjen Grotesk", Arial, sans-serif'; x.fillStyle = '#5b625e'; x.fillText('Sample wording', bx + 232, by + 190);
  });
  x.fillStyle = INK; x.fillRect(0, 1060, w, h - 1060); x.fillStyle = BUTTER; x.font = '500 30px "Martian Mono", monospace'; x.fillText('DEMO · FICTIONAL BUSINESS · BUILT BY SCROLLSTORY STUDIO', 70, 1120);
}

export function renovation({ scene, lowQuality }) {
  const root = new THREE.Group(); scene.add(root);
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  const pair = (oldMat, newMat) => [split(oldMat, 1), split(newMat, -1)];
  const put = (geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  // both versions of one piece, in the same place
  const both = (geo, mats, x, y, z) => mats.map((m) => put(geo, m, x, y, z));
  const R = RENO, cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2, W = R.x1 - R.x0, D = R.z1 - R.z0;
  const tick = [];

  // ---------- the pavilion: a deck on the water, a thin dark frame, glass on two sides, open to the east ----------
  both(new THREE.BoxGeometry(W + 0.3, 0.08, D + 0.3), pair(std(0x8f8a80, { roughness: 1 }), std(0xb88a5c, { roughness: 0.6 })), cx, 0.04, cz); // grey weathered boards, then warm oak
  const planks = new THREE.BoxGeometry(0.02, 0.01, D + 0.28);
  for (let k = 0; k < 24; k++) both(planks, pair(std(0x6f6a62), std(0x8a5f3a)), R.x0 - 0.12 + (k + 0.5) * (W + 0.24) / 24, 0.085, cz);
  const frame = std(0x1e2a26, { roughness: 0.5 });
  for (const [x, z] of [[R.x0, R.z0], [R.x0, R.z1], [R.x1, R.z1], [R.x0, -10.6], [R.x0, -7.9], [cx, R.z1]]) put(new THREE.BoxGeometry(0.1, R.h, 0.1), frame, x, R.h / 2, z);
  both(new THREE.BoxGeometry(W + 0.4, 0.15, D + 0.4), pair(std(0x9c968a), std(0xf4ecdd)), cx, R.h + 0.075, cz); // the roof
  put(new THREE.BoxGeometry(W + 0.44, 0.06, 0.06), std(0xc9a24a, { metalness: 0.3, roughness: 0.4 }), cx, R.h + 0.18, R.z1 + 0.2); // brass edge
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xe6f3f0, roughness: 0.08, transmission: lowQuality ? 0 : 0.9, transparent: true, opacity: lowQuality ? 0.18 : 1, thickness: 0.02 });
  put(new THREE.PlaneGeometry(-10.6 - R.z0, R.h), glass, R.x0 + 0.05, R.h / 2, (R.z0 - 10.6) / 2).rotation.y = Math.PI / 2;
  put(new THREE.PlaneGeometry(R.z1 + 7.9, R.h), glass, R.x0 + 0.05, R.h / 2, (R.z1 - 7.9) / 2).rotation.y = Math.PI / 2;
  put(new THREE.PlaneGeometry(W, R.h), glass, cx, R.h / 2, R.z1 - 0.05);
  put(new THREE.BoxGeometry(0.06, 0.06, 2.7), std(0xc9a24a, { metalness: 0.3, roughness: 0.4 }), R.x0 + 0.05, 2.75, -9.25); // the door head

  // ---------- the north wall: the café's website at the size of a room ----------
  const MW = 5.3, MH = 3.2, mx = -2.25, mz = R.z0 + 0.31;
  both(new THREE.BoxGeometry(MW, MH + 0.2, 0.3), pair(std(0xa9a397), std(0xefe3c8)), mx, MH / 2, R.z0 + 0.15);
  const oldTex = canvas(2048, 1236, oldSite), newTex = canvas(2048, 1236, newSite);
  const [oldWall, newWall] = both(new THREE.PlaneGeometry(MW - 0.2, MH - 0.2), pair(new THREE.MeshBasicMaterial({ map: oldTex }), new THREE.MeshBasicMaterial({ map: newTex })), mx, MH / 2 + 0.05, mz);

  // ---------- the counter: grey laminate with a chipped corner, then fluted oak with a stone top and a brass rail ----------
  const CX = -2.4, CZ = -11.8;
  const [oldCounter] = both(new THREE.BoxGeometry(2.0, 1.0, 0.6), pair(std(0x9d988c), std(0x9b6b42, { roughness: 0.55 })), CX, 0.5, CZ);
  both(new THREE.BoxGeometry(2.1, 0.06, 0.7), pair(std(0xb5b0a4), std(0xe9e1d2, { roughness: 0.3 })), CX, 1.03, CZ);
  const flute = new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), fluteMat = split(std(0x8a5c36, { roughness: 0.5 }), -1);
  for (let k = 0; k < 22; k++) put(flute, fluteMat, CX - 0.95 + k * 0.0905, 0.5, CZ + 0.3);
  const brass = split(std(0xc9a24a, { metalness: 0.3, roughness: 0.35 }), -1);
  put(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 8), brass, CX, 0.15, CZ + 0.45).rotation.z = Math.PI / 2;
  put(new THREE.BoxGeometry(0.25, 0.2, 0.1), split(std(0x7d786c), 1), CX + 0.95, 0.95, CZ + 0.26).rotation.z = 0.5; // the chipped corner, hanging off
  oldCounter.userData.k = 0;

  // On the counter: a dusty old monitor showing an error, then an espresso machine with steam.
  const crt = new THREE.Group(); crt.position.set(CX + 0.45, 1.06, CZ); root.add(crt);
  put(new THREE.BoxGeometry(0.5, 0.42, 0.45), split(std(0xb9b3a3), 1), 0, 0.21, 0, crt);
  const err = canvas(256, 192, (x, w, h) => { x.fillStyle = '#1b2a6b'; x.fillRect(0, 0, w, h); x.fillStyle = '#e6e6e6'; x.font = 'bold 56px "Courier New", monospace'; x.fillText('404', 70, 100); x.font = '20px "Courier New", monospace'; x.fillText('Page not found', 40, 150); });
  put(new THREE.PlaneGeometry(0.38, 0.3), split(new THREE.MeshBasicMaterial({ map: err }), 1), 0, 0.23, 0.226, crt);
  const machine = new THREE.Group(); machine.position.set(CX + 0.45, 1.06, CZ); root.add(machine);
  const cream = split(std(0xf4ecdd, { roughness: 0.4 }), -1);
  put(new THREE.BoxGeometry(0.55, 0.5, 0.42), cream, 0, 0.25, 0, machine);
  put(new THREE.BoxGeometry(0.58, 0.06, 0.45), brass, 0, 0.52, 0, machine);
  for (const sx of [-0.13, 0.13]) { put(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10), brass, sx, 0.2, 0.25, machine); put(new THREE.CylinderGeometry(0.05, 0.045, 0.08, 12), split(std(0xfffaf0), -1), sx, 0.05, 0.26, machine); }
  const steamMat = split(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }), -1);
  const puffs = [...Array(lowQuality ? 4 : 8)].map((_, k) => { const m = put(new THREE.SphereGeometry(0.05, 10, 8), steamMat, (k % 2 ? 0.13 : -0.13), 0.6, 0.26, machine); m.userData.ph = k / 8; return m; });
  tick.push((t) => { for (const p of puffs) { const u = (t * 0.35 + p.userData.ph) % 1; p.position.y = 0.15 + u * 0.8; p.scale.setScalar(0.4 + u * 0.9); p.position.x = (p.userData.ph > 0.5 ? 0.13 : -0.13) + Math.sin(t * 2 + p.userData.ph * 9) * 0.05 * u; } steamMat.opacity = 0.22; });

  // ---------- a plant: dry sticks in a cracked pot, then a full one ----------
  const PX = -4.35, PZ = -12.2;
  both(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 14), pair(std(0x8b8478), std(0x9e3b2c, { roughness: 0.6 })), PX, 0.25, PZ);
  const stick = split(std(0x6a5a46), 1);
  for (let k = 0; k < 5; k++) { const m = put(new THREE.CylinderGeometry(0.012, 0.02, 0.9, 5), stick, PX + (k - 2) * 0.05, 0.9, PZ); m.rotation.z = (k - 2) * 0.22; }
  const leaf = split(std(0x5f8f5a, { roughness: 0.7 }), -1), leaves = new THREE.Group(); leaves.position.set(PX, 0.5, PZ); root.add(leaves);
  for (let k = 0; k < (lowQuality ? 10 : 22); k++) { const an = k * 2.4, r = 0.1 + (k % 5) * 0.06; const m = put(new THREE.SphereGeometry(0.17, 10, 8), leaf, Math.cos(an) * r, 0.25 + (k % 7) * 0.17, Math.sin(an) * r * 0.7, leaves); m.scale.set(1, 0.55, 1.5); m.rotation.set(an, an * 0.5, 0.4); }
  tick.push((t) => { leaves.rotation.z = Math.sin(t * 0.7) * 0.04; });

  // ---------- light: a flickering tube, then three warm pendants ----------
  const tubeMat = split(new THREE.MeshStandardMaterial({ color: 0xdfe8ea, emissive: 0xcfe4ff, emissiveIntensity: 1 }), 1);
  put(new THREE.BoxGeometry(1.4, 0.06, 0.1), tubeMat, -2.4, R.h - 0.35, -10.6);
  for (const sx of [-0.6, 0.6]) put(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 4), split(std(0x555555), 1), -2.4 + sx, R.h - 0.18, -10.6);
  tick.push((t) => { const f = Math.sin(t * 37) * Math.sin(t * 11.3) > 0.55 ? 0.15 : 1; tubeMat.emissiveIntensity = f; }); // it never quite stays on
  const shade = split(std(0x1e2a26, { roughness: 0.4 }), -1), bulb = split(new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc070, emissiveIntensity: 2.2 }), -1);
  for (const px of [-4.0, -2.4, -0.8]) {
    put(new THREE.CylinderGeometry(0.005, 0.005, 1.1, 4), shade, px, R.h - 0.55, -11.3);
    put(new THREE.ConeGeometry(0.22, 0.2, 18, 1, true), shade, px, R.h - 1.15, -11.3);
    put(new THREE.SphereGeometry(0.08, 12, 10), bulb, px, R.h - 1.25, -11.3);
  }

  // ---------- the right-hand side: a crooked OPEN sign, then the menu floating, with the order button ----------
  const openTex = canvas(256, 96, (x, w, h) => { x.fillStyle = '#2a2a2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#b8352c'; x.font = 'bold 66px Arial, sans-serif'; x.fillText('OP N', 36, 72); });
  const sign = put(new THREE.PlaneGeometry(0.75, 0.28), split(new THREE.MeshBasicMaterial({ map: openTex }), 1), -0.3, 2.2, -12.4); sign.rotation.z = -0.18;
  const site = SITES[0], menu = [];
  site.page[2].forEach((it, k) => {
    const tex = canvas(384, 224, (x, w, h) => {
      x.fillStyle = '#fffaf0'; x.beginPath(); x.roundRect(0, 0, w, h, 26); x.fill();
      x.fillStyle = ['#c98b5a', BUTTER, TEAL][k]; x.beginPath(); x.arc(70, h / 2, 46, 0, 7); x.fill();
      x.fillStyle = INK; x.font = '500 38px Fraunces, Georgia, serif'; x.fillText(it, 134, h / 2 + 4); x.fillStyle = '#8c8a82'; x.font = '400 17px "Martian Mono", monospace'; x.fillText('DEMO MENU', 136, h / 2 + 40);
    });
    const m = put(new THREE.PlaneGeometry(0.72, 0.42), split(new THREE.MeshBasicMaterial({ map: tex, transparent: true }), -1), -0.45 + (k % 2) * 0.4, 1.45 + k * 0.52, -12.75 + k * 0.08);
    m.rotation.y = -0.2 + k * 0.08; // lifting off the page m.userData = { y: m.position.y, ph: k * 1.7 }; menu.push(m);
  });
  const orderTex = canvas(384, 96, (x, w, h) => { x.fillStyle = '#25d366'; x.beginPath(); x.roundRect(0, 0, w, h, 48); x.fill(); x.fillStyle = '#fff'; x.font = '600 34px "Familjen Grotesk", Arial, sans-serif'; x.fillText(site.page[3], 40, 60); });
  const order = put(new THREE.PlaneGeometry(0.86, 0.22), split(new THREE.MeshBasicMaterial({ map: orderTex, transparent: true }), -1), -0.75, 1.3, -11.75); order.rotation.y = -0.15;
  tick.push((t) => { for (const m of menu) m.position.y = m.userData.y + Math.sin(t * 0.9 + m.userData.ph) * 0.05; order.scale.setScalar(1 + Math.max(0, Math.sin(t * 2.4)) * 0.06); });

  // ---------- cobwebs in the old corners, dust over the old side ----------
  const webTex = canvas(256, 256, (x, w) => {
    x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 2;
    for (let a = 0; a <= 7; a++) { const an = (a / 7) * Math.PI / 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(an) * w, Math.sin(an) * w); x.stroke(); }
    for (let r = 30; r < w; r += 34) { x.beginPath(); for (let a = 0; a <= 7; a++) { const an = (a / 7) * Math.PI / 2, rr = r * (a % 2 ? 0.88 : 1); x[a ? 'lineTo' : 'moveTo'](Math.cos(an) * rr, Math.sin(an) * rr); } x.stroke(); }
  });
  const web = split(new THREE.MeshBasicMaterial({ map: webTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }), 1);
  for (const [x, y, z, ry, rz] of [[-4.95, 3.3, -12.9, 0.8, 0], [0.35, 3.3, -12.9, -0.8, Math.PI / 2], [-1.42, 0.95, -11.5, 0, -Math.PI / 2]]) { const m = put(new THREE.PlaneGeometry(0.9, 0.9), web, x, y, z); m.rotation.set(0, ry, rz); }
  const N = lowQuality ? 60 : 160, dustPos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { dustPos[i * 3] = R.x0 + ((i * 0.618) % 1) * W; dustPos[i * 3 + 1] = 0.2 + ((i * 0.381) % 1) * 3.2; dustPos[i * 3 + 2] = R.z0 + 0.4 + ((i * 0.233) % 1) * (D - 0.8); }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, split(new THREE.PointsMaterial({ color: 0xcfc8b8, size: 0.025, transparent: true, opacity: 0.8, depthWrite: false }), 1)); root.add(dust);

  // ---------- the line itself: a tall sheet of lavender light across the room, with sparks coming off it ----------
  const lineMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { t: { value: 0 }, k: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float t, k; varying vec2 vUv;
      void main(){ float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
        float shimmer = 0.6 + 0.4 * sin(vUv.y * 40.0 - t * 3.0 + sin(vUv.x * 9.0) * 2.0);
        gl_FragColor = vec4(vec3(0.72, 0.62, 1.0) * shimmer, 0.22 * edge * k); }`,
  });
  const sheet = put(new THREE.PlaneGeometry(D - 0.2, R.h - 0.1), lineMat, 0, R.h / 2, cz); sheet.rotation.y = Math.PI / 2;
  const SP = lowQuality ? 18 : 40, spPos = new Float32Array(SP * 3), spark = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xd9ccff, size: 0.05, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  spark.geometry.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); root.add(spark);

  // ---------- the clock on the wall (a secret): dusty and stopped on the old side, brass and ticking on the new. Click it and time runs back ----------
  const CLK = [0.05, 2.75, R.z0 + 0.34];
  both(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 28), pair(std(0x9a9488), std(0xc9a24a, { metalness: 0.3, roughness: 0.35 })), ...CLK).forEach((m) => { m.rotation.x = Math.PI / 2; });
  const clockFace = canvas(128, 128, (x, w) => { x.fillStyle = '#fbf6ea'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.fillStyle = INK; for (let k = 0; k < 12; k++) { const an = (k / 12) * Math.PI * 2; x.fillRect(64 + Math.cos(an) * 50 - 2, 64 + Math.sin(an) * 50 - 2, 4, 4); } });
  put(new THREE.CircleGeometry(0.2, 28), new THREE.MeshBasicMaterial({ map: clockFace }), CLK[0], CLK[1], CLK[2] + 0.03);
  const hands = [0.13, 0.18].map((len, k) => { const g = new THREE.Group(); g.position.set(CLK[0], CLK[1], CLK[2] + 0.04); root.add(g); put(new THREE.BoxGeometry(0.014, len, 0.005), std(0x1e2a26), 0, len / 2, 0, g); return g; });
  let back = -9;
  tick.push((t) => { const u = t - back, spin = u > 0 && u < 3.5 ? -Math.sin((u / 3.5) * Math.PI) * 40 : 0; hands[0].rotation.z = -t * 0.01 + spin * 0.08; hands[1].rotation.z = -t * 0.12 + spin; });
  // The wall reads as one surface: the line on it is the seam the shader draws. Nothing to pick on the wall itself.
  oldWall.userData.k = newWall.userData.k = 0;

  return {
    clock: CLK,
    turnBack(t) { back = t; },
    update(t, dt, wipe) {
      WIPE.value = wipe;
      const inside = wipe > R.x0 - 0.2 && wipe < R.x1 + 0.2;
      sheet.visible = spark.visible = inside; sheet.position.x = wipe; lineMat.uniforms.t.value = t; lineMat.uniforms.k.value = inside ? 1 : 0;
      if (inside) for (let i = 0; i < SP; i++) { const u = (t * 0.25 + i / SP) % 1; spPos[i * 3] = wipe - 0.05 - u * 0.5 * ((i % 3) / 2); spPos[i * 3 + 1] = (i * 0.37 % 1) * R.h * 0.95 + u * 0.4; spPos[i * 3 + 2] = R.z0 + 0.4 + ((i * 0.61) % 1) * (D - 0.8); }
      spark.geometry.attributes.position.needsUpdate = inside;
      for (const f of tick) f(t, dt);
      dust.position.y = Math.sin(t * 0.2) * 0.05;
    },
  };
}
