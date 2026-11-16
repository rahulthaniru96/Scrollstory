// The intro: the building builds itself in front of the visitor, once per session.
//   1 water only  2 holographic outlines rise out of the water  3 each piece fits into place with a small overshoot
//   4 the outlines fill in as a clean iridescent model  5 a scan line turns it real from the bottom up  6 the plaque lights last
// Stage 5 waits for the room models, so this is also the loader. Any scroll, click or key jumps to the end.
import * as THREE from 'three';
import gsap from 'gsap';
import { HOLO, holoFill } from './holo.js';

// shell: the blockout's meshes. parts: the facade's pieces, each with its outline as a child. freezeAt: seconds, for screenshots.
export function intro({ scene, renderer, shell, parts, outlines, plaque, ready, ripple, freezeAt = null, onEnd }) {
  const scanPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1); // keeps what is below the scan line
  const reveal = { value: 0 }, floor = { value: -1e3 }, S = { scan: -1 };
  const fill = holoFill({ reveal, floor, opacity: 0.55 }), unseen = new THREE.MeshBasicMaterial({ visible: false });
  const body = [...shell, ...parts].map((m) => ({ m, real: m.material }));
  const v = new THREE.Vector3(), box = new THREE.Box3();

  // Everything solid near the building waits under the scan line. Shader-drawn things (window skies) wait for the line to reach them.
  const clipped = new Set(), waiting = [], met = new WeakSet();
  const gather = () => scene.traverse((o) => {
    if (met.has(o)) return; met.add(o);
    if (!o.material || o.isLineSegments2 || o.isReflector || o.renderOrder === -10) return;
    o.getWorldPosition(v);
    if (Math.hypot(v.x, v.z) > 60 || (v.y > 13 && !o.isInstancedMesh && o.geometry?.type !== 'TubeGeometry')) return; // far islands, clouds, the upper floor
    if (o.material.isShaderMaterial) { waiting.push([o, v.y]); o.visible = S.scan > v.y; }
    else if (!clipped.has(o.material)) { clipped.add(o.material); o.material.clippingPlanes = [scanPlane]; o.material.needsUpdate = true; }
  });
  gather();
  const late = setInterval(gather, 150); // the room models arrive while this plays; they wait under the line too
  renderer.localClippingEnabled = true;
  for (const b of body) b.m.material = unseen; // a hidden mesh still draws its outline
  plaque.visible = false;
  HOLO.base.value = HOLO.dream.value = 1; // every outline shows, not only the ones above the dream line
  document.body.classList.add('intro');

  const tl = gsap.timeline({ paused: true, onComplete: end });
  // 2 and 3: the facade's pieces rise from under the water, lowest first, and settle with an overshoot
  const order = [...parts, ...outlines].map((m) => { box.setFromObject(m); return { m, y0: m.position.y, top: box.max.y, x: (box.min.x + box.max.x) / 2, z: (box.min.z + box.max.z) / 2, wet: false }; }).sort((a, b) => a.top - b.top);
  for (const [i, q] of order.entries()) {
    q.m.position.y = q.y0 - q.top - 1.5;
    tl.to(q.m.position, { y: q.y0, duration: 1.1, ease: 'back.out(1.5)', onUpdate() { if (!q.wet && q.m.position.y > q.y0 - q.top) { q.wet = true; ripple(q.x, q.z); } } }, 0.9 + (i / order.length) * 2);
  }
  // 4: the plain structure
  tl.call(() => { for (const b of body) b.m.material = fill; }, null, 4);
  tl.to(reveal, { value: 1, duration: 1, ease: 'none' }, 4);
  // 5: real, from the bottom up, once the models are in
  if (freezeAt === null) tl.addPause(5, () => ready.then(() => tl.play()));
  const twins = [];
  tl.call(() => { for (const b of body) { b.m.material = b.real; const t = new THREE.Mesh(b.m.geometry, fill); b.m.add(t); twins.push(t); } }, null, 5);
  tl.to(S, { scan: 16, duration: 1.6, ease: 'power1.inOut', onUpdate() { scanPlane.constant = floor.value = S.scan; for (const [o, y] of waiting) o.visible = S.scan > y; } }, 5);
  // 6: the plaque lights last
  tl.call(() => { plaque.visible = true; }, null, 6.6);
  tl.fromTo(plaque.scale, { x: 0.92, y: 0.92, z: 0.92 }, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(2.5)' }, 6.6);
  tl.to(HOLO.base, { value: 0, duration: 0.6, ease: 'none', onUpdate() { HOLO.dream.value = HOLO.base.value; } }, 6.6);
  tl.to('#dusk', { opacity: 0, duration: 6.6, ease: 'power1.in' }, 0);

  function end() {
    for (const b of body) b.m.material = b.real;
    for (const t of twins) t.removeFromParent();
    for (const q of order) q.m.position.y = q.y0;
    for (const m of clipped) { m.clippingPlanes = null; m.needsUpdate = true; }
    for (const [o] of waiting) o.visible = true;
    renderer.localClippingEnabled = false; plaque.visible = true; plaque.scale.setScalar(1);
    HOLO.base.value = HOLO.dream.value = 0;
    fill.dispose(); unseen.dispose();
    document.body.classList.remove('intro');
    clearInterval(late);
    for (const ev of SKIP) removeEventListener(ev, skip);
    onEnd?.();
  }
  const SKIP = ['wheel', 'touchstart', 'keydown', 'pointerdown'], skip = () => tl.progress(1);
  if (freezeAt !== null) tl.time(freezeAt);
  else { for (const ev of SKIP) addEventListener(ev, skip, { passive: true }); tl.play(); }
}
