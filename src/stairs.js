// The Hatter's stair: a short, slightly wrong spiral. Checkered treads with red-oxide nosings, brass beads of light on the rails,
// a pocket watch that runs backwards and a tower of teacups in the well, the milestones as playing cards, and at the top
// a giant top hat hanging upside down. The camera rises into the hat and comes out of another one on the Landing floor.
import * as THREE from 'three';
import { STAIR, PHI_END, stairPt, stairY, MILESTONES, EYE, H } from './world.js';

const css = (c) => '#' + c.toString(16).padStart(6, '0');
const INK = 0x1e2a26, CREAM = 0xf7efe2, OXIDE = 0x9e3b2c, BRASS = 0xc9a24a, TEAL = 0x3f6e68;

// The swirl inside the hat, also used full-screen by main.js while the camera is inside it. `c` is centred, `u` is how far through.
export const SWIRL = `
  vec3 swirl(vec2 c, float u, float time) {
    float r = length(c) + 1e-4, a = atan(c.y, c.x);
    float depth = 0.3 / r + u * 7.0 + time * 0.08, twist = a / 6.2832 * 10.0 + depth * 0.7;
    float chk = abs(step(0.5, fract(twist)) - step(0.5, fract(depth)));
    vec3 col = mix(vec3(0.118, 0.165, 0.149), vec3(0.969, 0.937, 0.886), chk);
    col = mix(col, vec3(0.62, 0.23, 0.17), step(0.75, fract(depth * 0.25)) * chk); // every fourth ring is red oxide
    col *= smoothstep(0.02, 0.4, r); // the far end is dark
    return col + vec3(1.0, 0.84, 0.55) * exp(-r * r * 60.0) * (0.25 + u); // and there is a light in it, brighter as it nears
  }`;

export function stairs({ scene, camera, tick, mesh, basic, lit, glow, lowQuality }) {
  const span = PHI_END - STAIR.phi0, top = stairPt(PHI_END, STAIR.rWalk, 0);
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

  // ---------- red-oxide nosing on the leading edge of every tread ----------
  {
    const PER_TURN = 33, dPhi = (2 * Math.PI) / PER_TURN, n = Math.ceil(span / dPhi), rMid = (STAIR.rIn + STAIR.rOut) / 2;
    const nosings = new THREE.InstancedMesh(new THREE.BoxGeometry(STAIR.rOut - STAIR.rIn, 0.035, 0.07), lit(OXIDE, { roughness: 0.6 }), n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const phi = STAIR.phi0 + i * dPhi;
      o.position.set(STAIR.cx - rMid * Math.sin(phi), stairY(Math.min(phi, PHI_END)) + 0.03, STAIR.cz + rMid * Math.cos(phi));
      o.rotation.set(0, Math.atan2(-Math.cos(phi), -Math.sin(phi)), 0); o.translateZ(-0.29); // local +z climbs, so the edge you meet first is at -z
      o.updateMatrix(); nosings.setMatrixAt(i, o.matrix);
    }
    scene.add(nosings);
  }

  // ---------- brass beads of light on both rails, out of step with each other, each with a short trail ----------
  {
    const N = lowQuality ? 3 : 6, TRAIL = lowQuality ? 2 : 4, beads = [];
    for (const [k, r] of [STAIR.rIn, STAIR.rOut].entries()) for (let b = 0; b < N; b++) for (let j = 0; j <= TRAIL; j++)
      beads.push([glow(0xffc27a, j ? 0.1 - j * 0.015 : 0.16, 0, 0, 0, scene, j ? 0.4 - j * 0.08 : 0.7), r, (b + k * 0.5) / N, j]); // small: brass sparks, not lamps
    tick.push((t, dt, env) => {
      for (const [s, r, off, j] of beads) {
        const phi = STAIR.phi0 + ((env.air * 0.03 + off) % 1) * span - j * 0.07;
        s.visible = phi > STAIR.phi0; if (s.visible) s.position.set(...stairPt(phi, r, 0.93));
      }
    });
  }

  // ---------- in the well: a pocket watch that runs backwards, a tower of teacups that should have fallen, a key ----------
  {
    const watch = new THREE.Group(); watch.position.set(STAIR.cx, 4.3, STAIR.cz); scene.add(watch);
    const brass = lit(BRASS, { roughness: 0.4 });
    mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.09, 40).rotateX(Math.PI / 2), brass, 0, 0, 0, watch);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12), brass, 0, 0.68, 0, watch);
    mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 20), brass, 0, 0.84, 0, watch);
    const dial = basic(0xffffff, { map: canvasTex(256, 256, (x) => {
      x.fillStyle = css(CREAM); x.beginPath(); x.arc(128, 128, 126, 0, 6.3); x.fill();
      x.fillStyle = css(INK); x.font = '500 30px Fraunces, Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let i = 1; i <= 12; i++) { const a = (-i / 12) * 6.2832 - Math.PI / 2; x.fillText(String(i), 128 + Math.cos(a) * 98, 128 + Math.sin(a) * 98); } // the hours run the wrong way round
    }) });
    const hands = [];
    for (const side of [1, -1]) {
      const f = mesh(new THREE.CircleGeometry(0.54, 40), dial, 0, 0, side * 0.047, watch); f.rotation.y = side > 0 ? 0 : Math.PI;
      for (const [len, w, rate] of [[0.4, 0.03, -1.1], [0.27, 0.045, -0.092]]) {
        const pivot = new THREE.Group(); pivot.position.z = side * 0.055; watch.add(pivot);
        mesh(new THREE.BoxGeometry(w, len, 0.008), lit(INK), 0, len / 2 - 0.03, 0, pivot); hands.push([pivot, rate * side]);
      }
    }
    glow(0xffe2a8, 2.6, 0, 0, 0, watch, 0.3);
    // teacups, each a little off the one below
    const cups = [], tints = [CREAM, TEAL, OXIDE, 0xf2d98b, CREAM];
    for (const [i, c] of tints.entries()) {
      const g = new THREE.Group(); scene.add(g); cups.push(g);
      const m = lit(c, { roughness: 0.5, side: THREE.DoubleSide });
      mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.014, 24), m, 0, 0, 0, g);
      mesh(new THREE.CylinderGeometry(0.15, 0.09, 0.15, 20, 1, true), m, 0, 0.09, 0, g);
      const handle = mesh(new THREE.TorusGeometry(0.05, 0.013, 6, 14), m, 0.17, 0.09, 0, g); handle.rotation.y = 0;
      g.rotation.y = i * 1.3;
    }
    const key = new THREE.Group(); scene.add(key);
    mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 18), brass, 0, 0.22, 0, key); mesh(new THREE.BoxGeometry(0.03, 0.34, 0.02), brass, 0, 0, 0, key); mesh(new THREE.BoxGeometry(0.1, 0.03, 0.02), brass, 0.05, -0.14, 0, key); mesh(new THREE.BoxGeometry(0.07, 0.03, 0.02), brass, 0.035, -0.08, 0, key);
    tick.push((t, dt, env) => {
      watch.position.y = 4.3 + Math.sin(env.air * 0.4) * 0.08; watch.rotation.y = env.air * 0.15;
      for (const [p, rate] of hands) p.rotation.z = env.air * rate;
      for (const [i, g] of cups.entries()) { const lean = Math.sin(env.air * 0.5 + i * 0.6) * 0.035 * (i + 1); g.position.set(STAIR.cx + lean, 0.45 + i * 0.27 + Math.sin(env.air * 0.7 + i) * 0.015, STAIR.cz + Math.cos(env.air * 0.4 + i * 0.6) * 0.03 * (i + 1)); g.rotation.z = -lean * 1.6; }
      key.position.set(STAIR.cx + Math.cos(env.air * 0.3) * 0.5, 6.4 + Math.sin(env.air * 0.5) * 0.1, STAIR.cz + Math.sin(env.air * 0.3) * 0.5); key.rotation.set(0, env.air * 0.6, 0.4);
    });
  }

  // ---------- the milestones as playing cards outside the rail, each lit as the camera passes it ----------
  {
    const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6'], tints = [0xe8a89a, 0x2f5fa8, 0x3f6e68, 0xc2387a, 0xf2d98b, 0xc9733f];
    const cards = MILESTONES.map((m, i) => {
      const g = new THREE.Group(); g.position.set(...m.at); g.lookAt(STAIR.cx, m.at[1], STAIR.cz); g.rotateZ(Math.sin(i * 2.4) * 0.14); scene.add(g);
      mesh(new THREE.BoxGeometry(0.86, 1.14, 0.03), lit(INK), 0, 0, 0, g);
      const red = i % 2 === 1, suit = SUITS[i % 4];
      const picture = basic(0xffffff, { map: canvasTex(320, 432, (x, w, h) => {
        x.fillStyle = css(CREAM); x.beginPath(); x.roundRect(0, 0, w, h, 26); x.fill();
        x.fillStyle = css(red ? OXIDE : INK); x.textAlign = 'center'; x.textBaseline = 'middle';
        for (const [cx, cy, flip] of [[40, 48, 0], [w - 40, h - 48, 1]]) { x.save(); x.translate(cx, cy); if (flip) x.rotate(Math.PI); x.font = '500 40px Fraunces, Georgia, serif'; x.fillText(RANKS[i], 0, -12); x.font = '30px Fraunces, Georgia, serif'; x.fillText(suit, 0, 24); x.restore(); }
        x.fillStyle = css(tints[i]); x.fillRect(64, 104, w - 128, 150);
        x.fillStyle = 'rgba(247,239,226,0.85)'; x.fillRect(82, 124, 90, 10); x.fillRect(82, 144, 140, 7); x.fillRect(82, 158, 110, 7);
        x.fillStyle = css(INK); x.font = '500 30px Fraunces, Georgia, serif';
        const words = m.title.split(' '), lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [m.title];
        for (const [k, l] of lines.entries()) x.fillText(l, w / 2, 306 + k * 36 - (lines.length - 1) * 14);
      }) });
      mesh(new THREE.PlaneGeometry(0.8, 1.08), picture, 0, 0, 0.017, g);
      return [m, picture, glow(0xffe2a8, 1.7, 0, 0.6, 0.25, g, 0)];
    });
    tick.push(() => {
      const phi = STAIR.phi0 + ((camera.position.y - EYE) * 2 * Math.PI) / STAIR.rise; // where on the stair the camera is
      for (const [m, picture, lamp] of cards) { const w = Math.max(0, 1 - Math.abs(phi + 0.5 - m.phi) / 1.0); picture.color.setScalar(0.42 + 0.58 * w); lamp.material.opacity = 0.7 * w; }
    });
  }

  // ---------- the top hat: upside down over the last tread, and its twin lying on the Landing where the camera comes out ----------
  {
    const felt = lit(INK, { roughness: 1, side: THREE.DoubleSide }), time = { value: 0 };
    const inside = new THREE.ShaderMaterial({
      uniforms: { time }, side: THREE.DoubleSide, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float time; varying vec2 vUv; ${SWIRL}
        void main(){ gl_FragColor = vec4(swirl((vUv - 0.5) * 1.2, 0.0, time), 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const hat = new THREE.Group(); hat.position.set(top[0], 8.0, top[2]); scene.add(hat);
    mesh(new THREE.RingGeometry(0.88, 1.45, 48).rotateX(Math.PI / 2), felt, 0, 0, 0, hat); // the brim
    mesh(new THREE.CylinderGeometry(0.98, 0.88, 1.25, 40, 1, true), felt, 0, 0.625, 0, hat); // the crown, wider at its closed end
    mesh(new THREE.CylinderGeometry(0.905, 0.895, 0.22, 40, 1, true), lit(OXIDE, { side: THREE.DoubleSide }), 0, 0.13, 0, hat); // the band
    mesh(new THREE.CircleGeometry(0.97, 40).rotateX(Math.PI / 2), inside, 0, 1.24, 0, hat);
    mesh(new THREE.CircleGeometry(0.99, 40).rotateX(-Math.PI / 2), felt, 0, 1.26, 0, hat);
    glow(0xffe2a8, 3.2, 0, 0.3, 0, hat, 0.35);
    // on the Landing only the brim shows: the rest of that hat is under the floor
    const out = new THREE.Group(); out.position.set(top[0], H.landing + 0.03, top[2]); scene.add(out);
    mesh(new THREE.RingGeometry(0.88, 1.3, 48).rotateX(-Math.PI / 2), felt, 0, 0, 0, out);
    mesh(new THREE.CircleGeometry(0.88, 40).rotateX(-Math.PI / 2), inside, 0, -0.005, 0, out);
    tick.push((t, dt, env) => { time.value = env.air; hat.position.y = 8.0 + Math.sin(env.air * 0.5) * 0.04; hat.rotation.y = env.air * 0.1; });
  }

  // ---------- a potted plant where the stair meets the Landing ----------
  {
    const g = new THREE.Group(); g.position.set(2.6, H.landing, 8.6); scene.add(g);
    mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.36, 12), lit(OXIDE), 0, 0.18, 0, g);
    const leaf = new THREE.ConeGeometry(0.09, 0.85, 5), green = lit(0x4f7a52);
    for (let i = 0; i < 7; i++) { const m = mesh(leaf, green, 0, 0.7, 0, g); m.rotation.set(0.45 * Math.cos(i * 0.9), 0, 0.45 * Math.sin(i * 0.9)); m.position.set(Math.sin(i * 0.9) * -0.16, 0.72, Math.cos(i * 0.9) * 0.16); }
  }
}
