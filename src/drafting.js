// 06 The Drafting Room: design comes first. A giant wireframe of a page stands across the room; the walk goes through it and it paints itself in colour, then scrolls like a live page.
// Drafting tables with their tools lifting off them, blueprints in the air (click one and the big page becomes that screen), a pinboard of choices on the back wall.
import * as THREE from 'three';
import { DRAFT, PAGE, DRAFT_TABLES, H } from './world.js';

const CREAM = '#f7efe2', INK = '#1e2a26', OXIDE = '#9e3b2c', BUTTER = '#f2d98b', TEAL = '#3f6e68', BLUE = '#2f5fa8', ROSE = '#e8a89a';
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const paint = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  paint(); document.fonts?.ready.then(paint);
  return t;
}

// Three screens of one made-up business, each drawn twice: as a wireframe with pencil notes, and finished. Tall, so the finished page can scroll.
export const SCREENS = [
  { name: 'Home', hero: ['Every business', 'has a story.'], blocks: ['Our story', 'What we do', 'Find us'], cta: 'WhatsApp us' },
  { name: 'Menu', hero: ['What we', 'make, and why.'], blocks: ['Breakfast', 'All day', 'To take home'], cta: 'Order on WhatsApp' },
  { name: 'Book', hero: ['Pick a day.', 'We will be ready.'], blocks: ['Choose a time', 'Tell us who', 'See you then'], cta: 'Book a visit' },
];
const PW = 768, PH = 1600; // page canvas: 6.2 m wide shows 768 px across, and 448 px of height at a time (3.6 m)
function wire(x, s) {
  x.fillStyle = '#eef3fb'; x.fillRect(0, 0, PW, PH);
  x.strokeStyle = 'rgba(47,95,168,0.12)'; x.lineWidth = 1; for (let g = 0; g < PW; g += 24) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, PH); x.stroke(); } for (let g = 0; g < PH; g += 24) { x.beginPath(); x.moveTo(0, g); x.lineTo(PW, g); x.stroke(); }
  x.strokeStyle = BLUE; x.lineWidth = 3; x.fillStyle = BLUE;
  const boxX = (bx, by, bw, bh) => { x.strokeRect(bx, by, bw, bh); x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + bw, by + bh); x.moveTo(bx + bw, by); x.lineTo(bx, by + bh); x.stroke(); };
  const note = (t, nx, ny) => { x.save(); x.fillStyle = OXIDE; x.font = 'italic 22px Fraunces, Georgia, serif'; x.fillText(t, nx, ny); x.restore(); };
  x.strokeRect(24, 20, PW - 48, 56); x.font = '500 18px "Martian Mono", monospace'; x.fillText('LOGO', 44, 55); for (let k = 0; k < 3; k++) x.strokeRect(PW - 300 + k * 90, 36, 70, 24);
  for (let k = 0; k < 2; k++) { x.fillRect(48, 130 + k * 64, [420, 330][k], 40); } note('hero: the one line', 520, 160);
  x.strokeRect(48, 270, 220, 52); note('the button a thumb finds', 290, 304);
  boxX(48, 360, PW - 96, 260); note(s.name === 'Book' ? 'calendar here' : 'one big photo', 60, 650);
  s.blocks.forEach((b, k) => { const by = 700 + k * 230; boxX(48, by, 200, 180); for (let l = 0; l < 4; l++) x.fillRect(280, by + 20 + l * 38, [380, 340, 360, 200][l], 14); x.font = '500 18px "Martian Mono", monospace'; x.fillText(b.toUpperCase(), 280, by + 190); });
  note('section 0' + 1 + ' to 0' + s.blocks.length + ': the story, in order', 60, 1395);
  x.strokeRect(24, 1430, PW - 48, 140); note('footer: phone, map, hours', 48, 1510);
  // dimension arrows, as on a drawing
  x.strokeStyle = OXIDE; x.lineWidth = 2; x.beginPath(); x.moveTo(24, 96); x.lineTo(PW - 24, 96); x.stroke(); x.fillStyle = OXIDE; x.font = '16px "Martian Mono", monospace'; x.fillText('1280', PW / 2 - 20, 116);
}
function done(x, s, i) {
  const acc = [OXIDE, TEAL, BLUE][i], soft = ['#f2c9a8', '#cfe3d8', '#d6e1f5'][i];
  x.fillStyle = '#fffaf0'; x.fillRect(0, 0, PW, PH);
  x.fillStyle = INK; x.fillRect(0, 0, PW, 96); x.fillStyle = CREAM; x.font = '500 34px Fraunces, Georgia, serif'; x.fillText('Your business', 44, 60);
  x.font = '500 18px "Familjen Grotesk", Arial, sans-serif'; ['Home', 'Menu', 'Book'].forEach((t, k) => { x.globalAlpha = t === s.name ? 1 : 0.6; x.fillText(t, PW - 290 + k * 90, 58); }); x.globalAlpha = 1;
  const g = x.createLinearGradient(0, 96, 0, 640); g.addColorStop(0, soft); g.addColorStop(1, '#fffaf0'); x.fillStyle = g; x.fillRect(0, 96, PW, 560);
  x.fillStyle = INK; x.font = '400 64px Fraunces, Georgia, serif'; x.fillText(s.hero[0], 48, 190); x.font = 'italic 400 64px Fraunces, Georgia, serif'; x.fillStyle = acc; x.fillText(s.hero[1], 48, 262);
  x.fillStyle = '#25d366'; x.beginPath(); x.roundRect(48, 290, 260, 56, 28); x.fill(); x.fillStyle = '#fff'; x.font = '600 22px "Familjen Grotesk", Arial, sans-serif'; x.fillText(s.cta, 72, 326);
  // the big picture: a drawn scene, not a photo
  x.fillStyle = acc; x.beginPath(); x.roundRect(48, 370, PW - 96, 250, 26); x.fill();
  x.fillStyle = BUTTER; x.beginPath(); x.arc(PW - 190, 450, 46, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,250,240,0.35)'; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(48 + k * 140, 620); x.lineTo(118 + k * 140, 500 - (k % 2) * 40); x.lineTo(188 + k * 140, 620); x.fill(); }
  s.blocks.forEach((b, k) => {
    const by = 700 + k * 230; x.fillStyle = k % 2 ? '#efe6d6' : '#f6eee0'; x.beginPath(); x.roundRect(36, by - 12, PW - 72, 204, 22); x.fill();
    x.fillStyle = [acc, BUTTER, ROSE][k]; x.beginPath(); x.roundRect(48, by, 200, 180, 18); x.fill();
    x.fillStyle = INK; x.font = '500 34px Fraunces, Georgia, serif'; x.fillText(b, 280, by + 48);
    x.fillStyle = '#5b625e'; x.font = '400 19px "Familjen Grotesk", Arial, sans-serif'; for (let l = 0; l < 3; l++) x.fillText(['Sample wording for this part', 'of the story, in plain words,', 'the way your customers speak.'][l], 280, by + 92 + l * 30);
  });
  x.fillStyle = INK; x.fillRect(0, 1430, PW, 170); x.fillStyle = BUTTER; x.font = '500 16px "Martian Mono", monospace'; x.fillText('DEMO PAGE · SAMPLE WORDING', 48, 1480); x.fillStyle = CREAM; x.font = '500 26px Fraunces, Georgia, serif'; x.fillText('Find us · Call · WhatsApp', 48, 1530);
}

export function drafting({ scene, lowQuality }) {
  const root = new THREE.Group(); scene.add(root);
  const Y = H.drafting, tick = [], std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  const put = (geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const brass = std(0xc9a24a, { metalness: 0.3, roughness: 0.4 }), ink = std(0x1e2a26, { roughness: 0.5 }), timber = std(0x9b6b42, { roughness: 0.6 }), paper = std(0xfbf6ea, { roughness: 0.9 });
  let hovers = 0;
  const hover = (g, amp = 0.05, rate = 0.5, tilt = 0.03) => { const y0 = g.position.y, r0 = g.rotation.clone(), ph = hovers++ * 1.7; tick.push((t) => { g.position.y = y0 + Math.sin(t * rate + ph) * amp; g.rotation.x = r0.x + Math.sin(t * rate * 0.8 + ph) * tilt; g.rotation.z = r0.z + Math.cos(t * rate * 0.7 + ph) * tilt; }); return g; };

  // ---------- the room: a pale parquet on the slab, a blue-grey back wall with a long window, a short west wall ----------
  const cx = (DRAFT.x0 + DRAFT.x1) / 2, cz = (DRAFT.z0 + DRAFT.z1) / 2, W = DRAFT.x1 - DRAFT.x0, D = DRAFT.z1 - DRAFT.z0;
  const parquet = canvas(512, 512, (x, w) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = ['#d9c3a0', '#cfb690', '#e0cba9', '#d3bb95'][(i + j * 3) % 4]; x.fillRect(j * 128 + ((i % 2) * 64), i * 32, 128, 32); x.strokeStyle = 'rgba(80,60,40,0.25)'; x.strokeRect(j * 128 + ((i % 2) * 64), i * 32, 128, 32); } });
  parquet.wrapS = parquet.wrapT = THREE.RepeatWrapping; parquet.repeat.set(W / 3, D / 3);
  put(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: parquet, roughness: 0.75 }), cx, Y + 0.005, cz).rotation.x = -Math.PI / 2;
  const wallMat = std(0xdfe5ee);
  put(new THREE.BoxGeometry(W, 3.4, 0.3), wallMat, cx, Y + 1.7, DRAFT.z0 - 0.15);
  put(new THREE.BoxGeometry(0.3, 3.4, 5.5), wallMat, DRAFT.x0 - 0.15, Y + 1.7, DRAFT.z0 + 2.75);
  put(new THREE.BoxGeometry(W + 0.1, 0.12, 0.36), ink, cx, Y + 3.46, DRAFT.z0 - 0.15); // a dark coping, like the frame of a drawing
  put(new THREE.BoxGeometry(W, 0.06, 0.04), brass, cx, Y + 1.0, DRAFT.z0 + 0.02); // the brass line at one metre, as downstairs
  // a long window in the back wall, the twilight through it
  const win = canvas(512, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6f6aa8'); g.addColorStop(1, '#f2b28c'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,248,230,0.8)'; for (let k = 0; k < 30; k++) x.fillRect((k * 71) % w, (k * 37) % (h * 0.6), 2, 2); });
  put(new THREE.PlaneGeometry(4.2, 0.9), new THREE.MeshBasicMaterial({ map: win }), -5.2, Y + 2.55, DRAFT.z0 + 0.01);
  for (let k = 0; k <= 6; k++) put(new THREE.BoxGeometry(0.04, 0.95, 0.04), ink, -7.3 + k * 0.7, Y + 2.55, DRAFT.z0 + 0.03);

  // ---------- the pinboard: the choices made before any page, pinned with string between them ----------
  const pins = [
    ['COLOUR', (x, w, h) => { [OXIDE, TEAL, BUTTER, BLUE, ROSE].forEach((c, k) => { x.fillStyle = c; x.fillRect(16 + k * 46, 40, 40, 110); }); }],
    ['TYPE', (x) => { x.fillStyle = INK; x.font = '400 92px Fraunces, Georgia, serif'; x.fillText('Aa', 30, 120); x.font = '500 20px "Martian Mono", monospace'; x.fillText('Fraunces', 150, 90); x.font = '400 20px "Familjen Grotesk", sans-serif'; x.fillText('Familjen', 150, 120); }],
    ['THE ONE LINE', (x) => { x.fillStyle = INK; x.font = 'italic 400 30px Fraunces, Georgia, serif'; x.fillText('Every business', 18, 80); x.fillText('has a story.', 18, 118); }],
    ['A PHONE FIRST', (x) => { x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(100, 30, 70, 130); for (let k = 0; k < 4; k++) x.fillRect(110, 50 + k * 24, 50, 12); }],
    ['THE ORDER', (x) => { x.fillStyle = INK; x.font = '500 20px "Martian Mono", monospace'; ['1 HELLO', '2 STORY', '3 PROOF', '4 ASK'].forEach((t, k) => x.fillText(t, 20, 56 + k * 32)); }],
  ];
  const pinned = [];
  pins.forEach(([label, draw], k) => {
    const tex = canvas(256, 190, (x, w, h) => { x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); draw(x, w, h); x.fillStyle = '#8c8a82'; x.font = '500 14px "Martian Mono", monospace'; x.fillText(label, 16, h - 14); });
    const px = -0.6 + k * 0.72, py = Y + 1.95 + ((k * 37) % 3) * 0.16, m = put(new THREE.PlaneGeometry(0.62, 0.46), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), px, py, DRAFT.z0 + 0.02);
    m.rotation.z = ((k * 53) % 7 - 3) * 0.02; pinned.push(m);
    put(new THREE.SphereGeometry(0.025, 8, 6), std(0x9e3b2c), px, py + 0.2, DRAFT.z0 + 0.04);
  });
  for (let k = 0; k < pinned.length - 1; k++) { const a = pinned[k].position, b = pinned[k + 1].position, s = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, a.distanceTo(b), 4), std(0x9e3b2c)); s.position.copy(a).add(b).multiplyScalar(0.5).setZ(DRAFT.z0 + 0.04); s.position.y += 0.2; s.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2; root.add(s); }

  // ---------- the giant page: a browser window's frame, the page inside painted by a shader ----------
  const shots = SCREENS.map((s, i) => ({ wire: canvas(PW, PH, (x) => wire(x, s)), done: canvas(PW, PH, (x) => done(x, s, i)) }));
  for (const sh of shots) for (const t of [sh.wire, sh.done]) t.wrapT = THREE.RepeatWrapping;
  const U = { wire: { value: shots[0].wire }, done: { value: shots[0].done }, paint: { value: 0 }, scroll: { value: 0 }, t: { value: 0 }, hole: { value: new THREE.Vector2(0.5, 0.375) } };
  const pageMat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.FrontSide, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D wire, done; uniform float paint, scroll, t; uniform vec2 hole; varying vec2 vUv;
      void main(){
        float view = ${(448 / PH).toFixed(4)};
        vec2 st = vec2(vUv.x, 1.0 - view + vUv.y * view - scroll);
        vec4 w = texture2D(wire, st), c = texture2D(done, st);
        // colour spreads out from where the walk went through, with a wet, uneven edge
        vec2 d = (vUv - hole) * vec2(${(PAGE.w / PAGE.h).toFixed(3)}, 1.0);
        float r = length(d) + 0.05 * sin(atan(d.y, d.x) * 7.0 + t) + 0.03 * sin(vUv.y * 40.0);
        float edge = paint * 1.4;
        float k = smoothstep(edge, edge - 0.08, r);
        vec3 col = mix(w.rgb, c.rgb, k);
        col += vec3(0.95, 0.75, 0.45) * (smoothstep(0.06, 0.0, abs(r - edge)) * step(0.001, paint) * step(paint, 0.999)) * 0.5; // a bright rim on the wet edge
        gl_FragColor = vec4(col, 0.97);
        #include <colorspace_fragment>
      }`,
  });
  const front = put(new THREE.PlaneGeometry(PAGE.w, PAGE.h), pageMat, PAGE.x, PAGE.y + PAGE.h / 2, PAGE.z + 0.01);
  const back = put(new THREE.PlaneGeometry(PAGE.w, PAGE.h), pageMat, PAGE.x, PAGE.y + PAGE.h / 2, PAGE.z - 0.01); back.rotation.y = Math.PI;
  // the frame: two posts, a top bar drawn as a browser's title bar, brass feet
  for (const sx of [-1, 1]) {
    put(new THREE.BoxGeometry(0.22, PAGE.h + 0.45, 0.22), ink, PAGE.x + sx * (PAGE.w / 2 + 0.06), Y + (PAGE.h + 0.45) / 2, PAGE.z);
    put(new THREE.BoxGeometry(0.5, 0.08, 0.6), brass, PAGE.x + sx * (PAGE.w / 2 + 0.06), Y + 0.04, PAGE.z);
  }
  const bar = canvas(1024, 40, (x, w, h) => { x.fillStyle = INK; x.fillRect(0, 0, w, h); [OXIDE, BUTTER, TEAL].forEach((c, k) => { x.fillStyle = c; x.beginPath(); x.arc(22 + k * 22, 20, 7, 0, 7); x.fill(); }); x.fillStyle = '#33403b'; x.beginPath(); x.roundRect(260, 8, 500, 24, 12); x.fill(); x.fillStyle = CREAM; x.font = '500 15px "Martian Mono", monospace'; x.fillText('your-business · draft 3', 300, 26); });
  for (const sz of [1, -1]) { const b = put(new THREE.BoxGeometry(PAGE.w + 0.34, 0.3, 0.02), new THREE.MeshBasicMaterial({ map: bar }), PAGE.x, PAGE.y + PAGE.h + 0.12, PAGE.z + sz * 0.12); if (sz < 0) b.rotation.y = Math.PI; }
  put(new THREE.BoxGeometry(PAGE.w + 0.34, 0.3, 0.22), ink, PAGE.x, PAGE.y + PAGE.h + 0.12, PAGE.z);

  // ---------- the drafting tables: boards on trestles. Nothing lies on them: the paper, the T-square and the lamp hover over each ----------
  const tables = [];
  for (const [i, T] of DRAFT_TABLES.entries()) {
    const g = new THREE.Group(); g.position.set(T.x, Y, T.z); g.rotation.y = T.ry; root.add(g);
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.45, 0.45]) { const leg = put(new THREE.BoxGeometry(0.06, 0.95, 0.06), timber, sx, 0.47, sz, g); leg.rotation.x = sz * 0.12; }
    put(new THREE.BoxGeometry(1.5, 0.04, 0.04), timber, 0, 0.3, 0, g);
    const board = put(new THREE.BoxGeometry(1.7, 0.05, 1.15), std(0xe9e1d2, { roughness: 0.6 }), 0, 1.0, 0, g); board.rotation.x = -0.3;
    put(new THREE.BoxGeometry(1.7, 0.02, 0.06), brass, 0, 1.0 - Math.sin(0.3) * 0.58, 0.58 * Math.cos(0.3), g);
    // the sheet, lifted off the board, with a line drawing itself on it
    const sheetTex = canvas(512, 360, (x, w, h) => { x.fillStyle = '#fbf6ea'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(47,95,168,0.18)'; for (let k = 0; k < w; k += 20) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, h); x.stroke(); } x.strokeStyle = BLUE; x.lineWidth = 3; x.strokeRect(40, 30, 140, 300); for (let k = 0; k < 5; k++) x.strokeRect(54, 50 + k * 54, 112, 40); x.font = 'italic 22px Fraunces, Georgia, serif'; x.fillStyle = OXIDE; x.fillText(i ? 'menu, on a phone' : 'home, on a phone', 220, 70); });
    const sheet = put(new THREE.PlaneGeometry(1.2, 0.85), new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.9, side: THREE.DoubleSide }), 0, 1.35, 0.05, g); sheet.rotation.x = -Math.PI / 2 + 0.3; hover(sheet, 0.04, 0.6, 0.02);
    const tsq = new THREE.Group(); tsq.position.set(-0.1, 1.5, 0.15); g.add(tsq);
    put(new THREE.BoxGeometry(1.0, 0.012, 0.06), std(0x2f5fa8, { roughness: 0.4 }), 0, 0, 0, tsq); put(new THREE.BoxGeometry(0.06, 0.03, 0.3), std(0x2f5fa8, { roughness: 0.4 }), -0.5, 0, 0, tsq); tsq.rotation.x = -0.3;
    tick.push((t) => { tsq.position.x = -0.1 + Math.sin(t * 0.4 + i * 2) * 0.18; tsq.position.y = 1.5 + Math.sin(t * 0.7 + i) * 0.03; }); // sliding up and down the sheet on its own
    const pencil = new THREE.Group(); g.add(pencil); put(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), std(0xf2d98b), 0, 0.11, 0, pencil); put(new THREE.ConeGeometry(0.012, 0.04, 6), ink, 0, -0.02, 0, pencil).rotation.x = Math.PI;
    tick.push((t) => { const u = (t * 0.25 + i * 0.5) % 1; pencil.position.set(-0.35 + u * 0.7, 1.55, 0.05 + Math.sin(u * 12) * 0.04); pencil.rotation.z = 0.5; });
    // a lamp on an arm, floating beside the board, with a warm pool of light on the sheet
    const lamp = new THREE.Group(); lamp.position.set(0.95, 1.7, -0.2); g.add(lamp);
    put(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), brass, 0, 0.25, 0, lamp).rotation.z = 0.6;
    const shade = put(new THREE.ConeGeometry(0.12, 0.16, 16, 1, true), std(0x3f6e68, { side: THREE.DoubleSide }), -0.2, 0.48, 0, lamp); shade.rotation.z = 0.9;
    put(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffc070, emissiveIntensity: 2.5 }), -0.24, 0.43, 0, lamp);
    hover(lamp, 0.03, 0.45, 0.02);
    tables.push(g);
  }

  // ---------- blueprints in the air, one per screen. Click one: the big page becomes that screen and paints in again ----------
  const bps = SCREENS.map((s, i) => {
    const tex = canvas(384, 280, (x, w, h) => {
      x.fillStyle = '#1f4f96'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,0.18)'; for (let k = 0; k < w; k += 16) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, h); x.stroke(); } for (let k = 0; k < h; k += 16) { x.beginPath(); x.moveTo(0, k); x.lineTo(w, k); x.stroke(); }
      x.strokeStyle = '#eaf2ff'; x.lineWidth = 3; x.strokeRect(24, 24, 150, 230); for (let k = 0; k < 4; k++) x.strokeRect(36, 44 + k * 50, 126, 34);
      x.fillStyle = '#eaf2ff'; x.font = '500 46px Fraunces, Georgia, serif'; x.fillText(s.name, 200, 120); x.font = '500 16px "Martian Mono", monospace'; x.fillText('SCREEN 0' + (i + 1), 202, 160); x.fillText('CLICK TO SHOW', 202, 236);
      x.strokeRect(6, 6, w - 12, h - 12);
    });
    const m = put(new THREE.PlaneGeometry(0.9, 0.66), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x2f5fa8, emissiveIntensity: 0 }), 0, 0, 0);
    const T = DRAFT_TABLES[i % 2], an = i * 2.1;
    m.position.set(T.x + Math.cos(an) * 0.5, Y + 2.0 + (i % 2) * 0.35, T.z + Math.sin(an) * 0.4); m.rotation.y = i === 1 ? -0.4 : 0.5 - i * 0.2; m.userData = { i, y0: m.position.y };
    hover(m, 0.06, 0.4 + i * 0.07, 0.05);
    return m;
  });
  // compass and set square, turning in the air between the tables
  const compass = new THREE.Group(); compass.position.set(-3.8, Y + 2.6, -39.6); root.add(compass);
  for (const s of [-1, 1]) { const leg = put(new THREE.CylinderGeometry(0.01, 0.006, 0.42, 6), brass, s * 0.07, -0.2, 0, compass); leg.rotation.z = s * 0.35; }
  put(new THREE.TorusGeometry(0.03, 0.01, 6, 12), brass, 0, 0.01, 0, compass);
  const setsq = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 0.35)])), new THREE.MeshStandardMaterial({ color: 0xcfe3e6, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); setsq.position.set(-4.6, Y + 2.2, -40.4); root.add(setsq);
  tick.push((t) => { compass.rotation.y = t * 0.3; compass.rotation.z = Math.sin(t * 0.5) * 0.3; setsq.rotation.set(Math.sin(t * 0.3) * 0.4, t * 0.2, 0.2); });

  // ---------- rolled drawings standing in a tall basket, and loose sheets drifting near the floor ----------
  const basket = put(new THREE.CylinderGeometry(0.28, 0.24, 0.7, 16, 1, true), std(0x9b7a55, { side: THREE.DoubleSide }), -8.3, Y + 0.35, -32.2);
  for (let k = 0; k < 6; k++) { const r = put(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 10), k % 2 ? paper : std(0xdfe9ff), -8.3 + Math.cos(k * 1.1) * 0.12, Y + 0.75, -32.2 + Math.sin(k * 1.1) * 0.12); r.rotation.set(Math.sin(k) * 0.15, 0, Math.cos(k * 2) * 0.15); }
  basket.userData.k = 0;
  const N = lowQuality ? 4 : 9, sheetGeo = new THREE.PlaneGeometry(0.42, 0.3);
  for (let k = 0; k < N; k++) { const s = put(sheetGeo, new THREE.MeshStandardMaterial({ color: k % 3 ? 0xfbf6ea : 0xdfe9ff, side: THREE.DoubleSide, roughness: 0.9 }), -7.5 + ((k * 0.618) % 1) * 9.5, Y + 0.25 + (k % 3) * 0.12, -33.2 - ((k * 0.383) % 1) * 7.5); s.rotation.set(-Math.PI / 2 + 0.2, k, 0.1); hover(s, 0.08, 0.3 + k * 0.05, 0.15); }

  // ---------- the wax-sealed blueprint (a secret), low among the others over the west table ----------
  const sealTex = canvas(320, 240, (x, w, h) => { x.fillStyle = '#1f4f96'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,0.25)'; for (let k = 0; k < w; k += 16) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, h); x.stroke(); } x.fillStyle = '#eaf2ff'; x.font = '500 14px "Martian Mono", monospace'; x.fillText('NOT FOR CLIENTS', 20, 30); });
  const sealed = put(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshStandardMaterial({ map: sealTex, side: THREE.DoubleSide }), -6.2, Y + 1.2, -37.7); sealed.rotation.y = 0.63; // among the others over the west table, turned to the walk
  const wax = put(new THREE.CylinderGeometry(0.08, 0.085, 0.025, 18), new THREE.MeshStandardMaterial({ color: 0x9e1f1f, roughness: 0.35, emissive: 0x9e1f1f, emissiveIntensity: 0 }), 0, 0, 0.02, sealed); wax.rotation.x = Math.PI / 2;
  hover(sealed, 0.05, 0.35, 0.04);

  // the secret: the seal cracks, and the blueprint shows three ideas that get dropped on the way to a good page
  const dropped = canvas(320, 240, (x, w, h) => {
    x.fillStyle = '#1f4f96'; x.fillRect(0, 0, w, h); x.fillStyle = '#eaf2ff'; x.font = '500 13px "Martian Mono", monospace'; x.fillText('IDEAS WE DROP, AND WHY', 14, 24);
    ['Too loud for the story', 'Looked like a template', 'No one found the phone'].forEach((t, k) => {
      const bx = 14 + k * 102; x.strokeStyle = '#eaf2ff'; x.lineWidth = 2; x.strokeRect(bx, 40, 90, 120); for (let l = 0; l < 4; l++) x.fillRect(bx + 10, 52 + l * 24, 70 - (l % 2) * 25, 10);
      x.strokeStyle = '#ff8a7a'; x.lineWidth = 4; x.beginPath(); x.moveTo(bx, 40); x.lineTo(bx + 90, 160); x.moveTo(bx + 90, 40); x.lineTo(bx, 160); x.stroke();
      x.fillStyle = '#eaf2ff'; x.font = 'italic 15px Fraunces, Georgia, serif'; const ws = t.split(' '); x.fillText(ws.slice(0, 2).join(' '), bx, 182); x.fillText(ws.slice(2).join(' '), bx, 200);
    });
    x.font = '500 11px "Martian Mono", monospace'; x.fillText('EXAMPLES, NOT CLIENT WORK', 14, h - 12);
  });
  let screen = 0, repaint = 1, live = 0, hot = -1, opened = -1;
  const show = (i) => { if (i === screen) return; screen = i; U.wire.value = shots[i].wire; U.done.value = shots[i].done; repaint = 0; };
  return {
    openSeal(t) { if (opened < 0) { opened = t; sealed.material.map = dropped; sealed.material.needsUpdate = true; } },
    over(ray) { const h = ray.intersectObjects(bps)[0]; hot = h ? h.object.userData.i : -1; return hot >= 0; },
    pick(ray) { const h = ray.intersectObjects(bps)[0]; if (!h) return false; show(h.object.userData.i); return true; },
    // paint: 0 wireframe, 1 finished (from the scroll). The page scrolls itself once it is finished.
    update(t, dt, paint) {
      repaint = Math.min(1, repaint + dt / 1.6);
      if (opened >= 0) { const u = Math.min(1, (t - opened) / 0.8); wax.scale.setScalar(1 - u); wax.visible = u < 1; sealed.scale.setScalar(1 + 0.6 * Math.min(1, (t - opened) / 1.2)); }
      const p = Math.min(paint, repaint);
      live = p > 0.98 ? live + dt : 0; // the page starts scrolling from its top once it is finished, down and back up
      U.paint.value = p; U.t.value = t; U.scroll.value = ((1 - Math.cos(live * 0.16)) / 2) * (1 - 448 / PH);
      for (const b of bps) b.material.emissiveIntensity = b.userData.i === hot ? 0.6 : b.userData.i === screen ? 0.25 : 0;
      for (const f of tick) f(t, dt);
    },
  };
}
