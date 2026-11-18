// The Gallery: a row of framed screens on the west wall, one per site, each showing that site's real landing page.
// Two are live projects (Bhumi Insurance for a client; G-Thriftz a prototype for a friend's BBA project); five are concept demos for made-up businesses, hosted with this site (public/demos).
// The walk goes along the wall and stops square in front of each; the one in front lights up and the others dim. G-Thriftz, the best piece, is kept for last.
import * as THREE from 'three';

// `shot` is a still of the landing page (public/shots, 1024 by 640), `url` where its button goes.
// The demos' lines describe what the demo page does (rahul-context/projects/demo-sites.md); the businesses are made up.
export const SITES = [
  { name: 'Bhumi Insurance', live: true, shot: 'bhumi', url: 'https://bhumiinsurance.com/', accent: 0xb8202a, line: 'An insurance brokerage in Hyderabad. Its page compares partner insurers and puts one call to an advisor first.' },
  { name: 'Shutter Café', shot: 'shutter-cafe', url: 'demos/shutter-cafe.html', accent: 0x2f6b4f, line: 'The shutter rolls up as you scroll, onto a letterboard menu. Order on WhatsApp.' },
  { name: 'Round Zero Fitness', shot: 'round-zero-gym', url: 'demos/round-zero-gym.html', accent: 0xc8202a, line: 'A gym as a boxing ring: a round clock and a sliding week of classes. Book a free trial.' },
  { name: 'Little Banyan Preschool', shot: 'little-banyan-preschool', url: 'demos/little-banyan-preschool.html', accent: 0x2f6b3a, line: 'A banyan tree grows as you scroll, and the sun crosses the school day. Book a visit.' },
  { name: 'Axiom Academy', shot: 'axiom-academy', url: 'demos/axiom-academy.html', accent: 0xe0b23a, line: 'Coaching on a chalkboard, equations writing themselves. Book a free demo class.' },
  { name: 'Aaranya Residences', shot: 'aaranya-residences', url: 'demos/aaranya-residences.html', accent: 0xe8a070, line: "Homes in an architect's line drawing, dawn to dusk, windows lighting up. Book a site visit." },
  { name: 'G-Thriftz', live: true, best: true, shot: 'gthriftz', url: 'https://g-thriftz.vercel.app/', accent: 0xb86b7e, line: 'An online thrift store you walk into by scrolling, built as a prototype for a BBA entrepreneurship project.' },
];
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// The screen's picture: the landing page, with a tag in its corner saying whether it is a live project or a demo.
export function siteTexture(i) {
  const s = SITES[i], c = document.createElement('canvas'); c.width = 1024; c.height = 640;
  const x = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const tag = () => {
    const txt = s.live ? 'LIVE PROJECT' : 'CONCEPT DEMO';
    x.font = '600 26px "Martian Mono", monospace'; const w = x.measureText(txt).width + 64;
    x.fillStyle = 'rgba(20,24,22,0.86)'; x.beginPath(); x.roundRect(24, 24, w, 50, 25); x.fill();
    x.fillStyle = s.live ? '#3ddc84' : '#cdbbff'; x.beginPath(); x.arc(50, 49, 8, 0, 7); x.fill();
    x.fillStyle = '#f7efe2'; x.fillText(txt, 68, 58);
  };
  x.fillStyle = hex(s.accent); x.fillRect(0, 0, 1024, 640); tag(); // until the still arrives
  const img = new Image(); img.onload = () => { x.drawImage(img, 0, 0, 1024, 640); tag(); t.needsUpdate = true; }; img.src = `shots/${s.shot}.jpg`;
  return t;
}

const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// cards: [{ m }] from main.js, in walk order. Returns update(focus[]).
export function gallery({ scene, cards }) {
  const frame = new THREE.MeshStandardMaterial({ color: 0x1b1f22, roughness: 0.5 });
  const worlds = cards.map((card, i) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(2.14, 1.39, 0.05), frame); f.position.z = -0.035; card.m.add(f); // a dark frame round the screen
    // a soft light behind the screen in the site's colour, so the one in front is where the eye goes
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), new THREE.MeshBasicMaterial({ color: SITES[i].accent, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: haloTex }));
    halo.position.z = -0.07; card.m.add(halo);
    return { card, halo };
  });

  // ---------- the way in: on the west wall where the Lobby turn ends, the Gallery's sign, with the seven pages small along its foot ----------
  {
    const sign = new THREE.Group(); sign.position.set(-11.97, 0, 9.2); sign.rotation.y = Math.PI / 2; scene.add(sign);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 820; const x = c.getContext('2d');
    x.fillStyle = '#1b1f22'; x.fillRect(0, 0, 1024, 820); x.strokeStyle = '#c9a24a'; x.lineWidth = 6; x.strokeRect(14, 14, 996, 792);
    x.fillStyle = '#c9a24a'; x.font = '500 30px "Martian Mono", monospace'; x.fillText('ROOM 02', 64, 96);
    x.fillStyle = '#f7efe2'; x.font = 'italic 400 120px Fraunces, Georgia, serif'; x.fillText('The Gallery', 60, 220);
    x.fillStyle = '#cdbbff'; x.font = '400 40px "Familjen Grotesk", Arial, sans-serif'; x.fillText('Two live sites. Five concept demos.', 64, 292);
    x.fillStyle = '#8c8a82'; x.font = '400 24px "Martian Mono", monospace'; x.fillText('DEMOS ARE FOR MADE-UP BUSINESSES', 64, 770);
    const board = new THREE.CanvasTexture(c); board.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.56), new THREE.MeshBasicMaterial({ map: board })); face.position.y = 2.15; sign.add(face);
    cards.forEach((card, k) => { const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshBasicMaterial({ map: card.m.material.uniforms.map.value })); scr.position.set(-1.35 + k * 0.45, 1.5, 0.01); sign.add(scr); });
    const lamp = new THREE.PointLight(0xffd9a0, 6, 5, 2); lamp.position.set(0, 3.7, 0.8); sign.add(lamp); // a picture light over it
  }

  return function update(focus) {
    const any = Math.max(0, ...focus);
    for (const [i, w] of worlds.entries()) {
      const f = focus[i] || 0, grow = sstep(0, 0.6, f);
      w.card.m.material.uniforms.uK.value = 1 - 0.55 * Math.max(0, any - f); // the others dim while one is in front
      w.card.m.scale.setScalar(1 + 0.04 * grow);
      w.halo.material.opacity = 0.35 * grow;
    }
  };
}
