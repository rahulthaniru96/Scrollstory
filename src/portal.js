// The ride through the top hat: things from the walk below (playing cards, teacups, pocket watches, keys, books, little web pages)
// tumble past in the swirl, so the climb feels like falling up into another world. A scene of its own, drawn over the
// full-screen swirl with its own camera. Every position is a function of how far through the hat the scroll is, so it reverses.
import * as THREE from 'three';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const CREAM = '#f7efe2', INK = '#1e2a26', OXIDE = '#9e3b2c', BUTTER = '#f2d98b', TEAL = '#3f6e68', ROSE = '#e8a89a';

function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function portalRide({ lowQuality }) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2a40, 2.2));
  const sun = new THREE.DirectionalLight(0xffe2a8, 1.6); sun.position.set(0, 0, 1); scene.add(sun); // the light at the far end of the hat, behind the viewer's back

  const mat = (opts) => new THREE.MeshLambertMaterial({ transparent: true, ...opts });
  const card = (suit, rank, red) => tex(128, 180, (x, w, h) => {
    x.fillStyle = CREAM; x.fillRect(0, 0, w, h); x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12);
    x.fillStyle = red ? OXIDE : INK; x.font = '700 30px Georgia, serif'; x.fillText(rank, 14, 40); x.font = '80px Georgia, serif'; x.textAlign = 'center'; x.fillText(suit, w / 2, h / 2 + 28);
  });
  const page = (col) => tex(160, 120, (x, w, h) => {
    x.fillStyle = CREAM; x.fillRect(0, 0, w, h); x.fillStyle = INK; x.fillRect(0, 0, w, 14);
    x.fillStyle = col; x.fillRect(10, 24, 70, 44); x.fillStyle = '#8c8a82'; for (let k = 0; k < 4; k++) x.fillRect(90, 26 + k * 11, 58 - (k % 2) * 16, 5);
    x.fillStyle = BUTTER; x.fillRect(10, 80, 36, 14); for (let k = 0; k < 3; k++) { x.fillStyle = '#d8cfc0'; x.fillRect(10 + k * 48, 100, 42, 14); }
  });
  const face = tex(128, 128, (x, w) => {
    x.fillStyle = CREAM; x.beginPath(); x.arc(w / 2, w / 2, 60, 0, 7); x.fill(); x.fillStyle = INK;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; x.fillRect(w / 2 + Math.sin(a) * 48 - 2, w / 2 - Math.cos(a) * 48 - 2, 4, 4); }
    x.lineWidth = 4; x.strokeStyle = INK; x.beginPath(); x.moveTo(w / 2, w / 2); x.lineTo(w / 2 - 22, w / 2 - 30); x.moveTo(w / 2, w / 2); x.lineTo(w / 2 + 34, w / 2 + 4); x.stroke();
  });

  const KINDS = [
    () => new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.01), mat({ map: card('♥', 'A', true) })),
    () => new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.01), mat({ map: card('♠', 'K', false) })),
    () => new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.01), mat({ map: card('♦', 'Q', true) })),
    () => { // a teacup on its saucer
      const g = new THREE.Group(), m = mat({ color: CREAM }), rim = mat({ color: OXIDE });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.22, 20, 1, true), m), new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 24), m));
      g.children[1].position.y = -0.12; const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 12), rim); handle.position.x = 0.21; g.add(handle); return g;
    },
    () => { // a pocket watch
      const g = new THREE.Group(), gold = mat({ color: 0xc9a14a });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 28).rotateX(Math.PI / 2), gold));
      const f = new THREE.Mesh(new THREE.CircleGeometry(0.23, 28), mat({ map: face })); f.position.z = 0.032; g.add(f);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), gold); ring.position.y = 0.31; g.add(ring); return g;
    },
    () => { // a key
      const g = new THREE.Group(), gold = mat({ color: 0xd6b25e });
      g.add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 16), gold));
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), gold); shaft.position.x = 0.31; g.add(shaft);
      for (const dx of [0.42, 0.5]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), gold); b.position.set(dx, -0.06, 0); g.add(b); } return g;
    },
    (i) => new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.1), mat({ color: [TEAL, OXIDE, BUTTER][i % 3] })), // a book
    () => new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), mat({ map: page(ROSE), side: THREE.DoubleSide })), // a little web page
    () => new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), mat({ map: page(TEAL), side: THREE.DoubleSide })),
  ];
  const N = lowQuality ? 14 : 30;
  const items = Array.from({ length: N }, (_, i) => {
    const o = KINDS[i % KINDS.length](i); scene.add(o);
    const mats = []; o.traverse((m) => m.material && mats.push(m.material));
    const s = 1.1 + ((i * 7) % 5) * 0.22;
    return { o, mats, s, a: (i / N) * Math.PI * 2 * 3.7, r: 1.4 + ((i * 13) % 7) * 0.35, phase: (i * 0.61803) % 1, spin: [((i * 3) % 5) - 2, ((i * 5) % 7) - 3, ((i * 11) % 3) - 1] };
  });

  return {
    scene, camera,
    // u: 0 to 1 through the hat; time: the drift clock; aspect: the screen's
    update(u, time, aspect) {
      camera.aspect = aspect; camera.updateProjectionMatrix();
      const cover = sstep(0, 0.14, u) * (1 - sstep(0.8, 1, u)); // the same window as the swirl
      for (const it of items) {
        const d = (u * 2.6 + it.phase) % 1, z = -26 + d * 28; // from deep in the hat to past the viewer's shoulder
        const a = it.a + d * 2.4 + time * 0.05, r = it.r * (0.5 + d * 0.9);
        it.o.position.set(Math.cos(a) * r, Math.sin(a) * r, z);
        it.o.rotation.set(it.spin[0] * (d * 3 + time * 0.2), it.spin[1] * (d * 2 + time * 0.15), it.spin[2] * d * 2);
        it.o.scale.setScalar(it.s);
        const op = cover * sstep(0, 0.18, d) * (1 - sstep(0.88, 1, d));
        it.o.visible = op > 0.01; for (const m of it.mats) m.opacity = op;
      }
    },
  };
}
