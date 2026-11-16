// The world outside the building: an endless mirror lake with broken islands far off, flocks of paper kites that
// swim through the air like fish, and the stone the building stands on. From the street the building sits in the
// water; once the camera climbs above the roof the lake falls away and shows it standing on roots of rock.
import * as THREE from 'three';
import { FOOTPRINT } from './world.js';

const V3 = THREE.Vector3;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export function lake({ scene, camera, tick, mesh, lit, basic, lowQuality, water }) {
  const rock = lit(0x9a8f7e, { flatShading: true }), rnd = rng(41);

  // ---------- small broken islands, far off. Every third one has left the water. ----------
  {
    const adrift = [];
    for (let i = 0; i < 15; i++) {
      const an = (i / 15) * Math.PI * 2 + rnd() * 0.3, dist = 120 + rnd() * 210, r = 6 + rnd() * 14, h = 3 + rnd() * 7;
      const g = new THREE.Group(); g.position.set(Math.sin(an) * dist, 0, Math.cos(an) * dist); g.rotation.y = rnd() * 6; scene.add(g);
      mesh(new THREE.ConeGeometry(r, h, 7), rock, 0, h / 2 - 0.4, 0, g);
      mesh(new THREE.ConeGeometry(r * 0.45, h * 1.5, 5), rock, r * 0.5, h * 0.6, r * 0.2, g).rotation.z = -0.25; // a broken shard beside it
      if (i % 3 === 0) { mesh(new THREE.ConeGeometry(r, h * 1.4, 7), rock, 0, -h * 0.7 - 0.4, 0, g).rotation.x = Math.PI; adrift.push([g, 5 + rnd() * 6, i]); }
    }
    tick.push((t, dt, env) => { for (const [g, y, i] of adrift) g.position.y = y + Math.sin(env.air * 0.12 + i) * 0.8; });
  }

  // ---------- what the building stands on: a plinth, its own still water, and roots of rock under it ----------
  const F = FOOTPRINT, cx = (F.x0 + F.x1) / 2, cz = (F.z0 + F.z1) / 2;
  mesh(new THREE.BoxGeometry(F.x1 - F.x0, 0.5, F.z1 - F.z0), lit(0x8c8a82), cx, -0.31, cz);
  mesh(new THREE.PlaneGeometry(F.x1 - F.x0, F.z1 - F.z0).rotateX(-Math.PI / 2), lit(0x6f9b95, { roughness: 0.15 }), cx, -0.03, cz); // under the lake's mirror until the lake drops
  for (const x of [-9, 0, 9]) for (const z of [-18, -7, 4, 14]) {
    const r = 6 + rnd() * 3, h = 6 + rnd() * 5, m = mesh(new THREE.ConeGeometry(r, h, 7), rock, x + rnd() * 2 - 1, -0.55 - h / 2, z + rnd() * 2 - 1);
    m.rotation.set(Math.PI, rnd() * 6, 0);
  }
  // slow drips off the plinth's edge, down to the lake
  const DRIPS = lowQuality ? 24 : 60, dripPos = new Float32Array(DRIPS * 3), dripAt = [];
  for (let i = 0; i < DRIPS; i++) {
    const side = i % 4, u = rnd();
    dripAt.push([side < 2 ? F.x0 + (F.x1 - F.x0) * u : side === 2 ? F.x0 : F.x1, side === 0 ? F.z0 : side === 1 ? F.z1 : F.z0 + (F.z1 - F.z0) * u, rnd()]);
  }
  const dripGeo = new THREE.BufferGeometry(); dripGeo.setAttribute('position', new THREE.BufferAttribute(dripPos, 3));
  const drips = new THREE.Points(dripGeo, new THREE.PointsMaterial({ size: 0.12, color: 0xd6efea, transparent: true, opacity: 0.85, depthWrite: false }));
  drips.frustumCulled = false; scene.add(drips);
  tick.push((t, dt, env) => {
    const drop = 2.6 * sstep(8.8, 11.6, env.h); // the lake falls away as the camera rises above the roof
    water.position.y = -drop; drips.visible = drop > 0.2 && env.h < 15;
    if (!drips.visible) return;
    for (const [i, [x, z, ph]] of dripAt.entries()) { const u = (t * 0.35 + ph) % 1; dripPos.set([x, -0.56 - u * u * (drop - 0.56), z], i * 3); }
    dripGeo.attributes.position.needsUpdate = true;
  });

  // ---------- kite-fish: Hyderabad paper kites in flocks. They follow each other, dip to the water, and scatter from the cursor. ----------
  {
    const FLOCKS = 3, PER = lowQuality ? 8 : 22, N = FLOCKS * PER;
    const geo = new THREE.BufferGeometry(); // a diamond, nose toward +z, with a short tail
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.5, 0.36, 0, 0, 0, 0.06, 0, 0, 0, 0.5, 0, 0.06, 0, -0.36, 0, 0, 0.36, 0, 0, 0, 0, -0.6, 0, 0.06, 0, -0.36, 0, 0, 0, 0.06, 0, 0, 0, -0.6, 0.05, 0, -0.6, 0, 0, -1.1, -0.05, 0, -0.6], 3));
    geo.computeVertexNormals();
    const kites = new THREE.InstancedMesh(geo, lit(0xffffff, { side: THREE.DoubleSide, roughness: 0.7 }), N);
    kites.frustumCulled = false; scene.add(kites);
    const colours = [0xc2387a, 0xe2b54a, 0x2f5fa8, 0xe8a89a, 0xf7efe2, 0x3f6e68].map((c) => new THREE.Color(c));
    const P = [], Vl = [], o = new THREE.Object3D(), goal = new V3(), mid = new V3(), avg = new V3(), d = new V3(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    for (let i = 0; i < N; i++) {
      const f = Math.floor(i / PER), an = f * 2.1 + rnd();
      P.push(new V3(Math.sin(an) * 36 + rnd() * 6, 3 + rnd() * 4, Math.cos(an) * 36 + rnd() * 6)); Vl.push(new V3(rnd() - 0.5, 0, rnd() - 0.5).multiplyScalar(3));
      kites.setColorAt(i, colours[(i * 7 + f) % colours.length]);
    }
    const CENTRE = new V3(0, 0, -2), KEEP_OUT = 27; // the flocks circle the building and never come in over it
    tick.push((t, dt, env) => {
      kites.visible = env.h < 16; if (!kites.visible) return;
      const step = Math.min(dt, 0.05) * env.wind, scare = env.wind > 1.05;
      if (scare) { ndc.set(env.pointer.sx, -env.pointer.sy); ray.setFromCamera(ndc, camera); }
      for (let f = 0; f < FLOCKS; f++) {
        const a = env.air * (0.05 + f * 0.012) + f * 2.1, rad = 38 + 7 * Math.sin(env.air * 0.07 + f * 3);
        goal.set(CENTRE.x + Math.sin(a) * rad, 4.5 + 3.3 * Math.sin(env.air * 0.16 + f * 1.9), CENTRE.z + Math.cos(a) * rad); // the goal dips toward the water and climbs again
        mid.set(0, 0, 0); avg.set(0, 0, 0);
        for (let i = f * PER; i < (f + 1) * PER; i++) { mid.add(P[i]); avg.add(Vl[i]); }
        mid.multiplyScalar(1 / PER); avg.multiplyScalar(1 / PER);
        for (let i = f * PER; i < (f + 1) * PER; i++) {
          const p = P[i], v = Vl[i];
          v.addScaledVector(d.subVectors(goal, p), 0.35 * step).addScaledVector(d.subVectors(mid, p), 0.25 * step).addScaledVector(d.subVectors(avg, v), 0.8 * step);
          for (let j = f * PER; j < (f + 1) * PER; j++) { if (j === i) continue; d.subVectors(p, P[j]); const l = d.length(); if (l < 1.6 && l > 1e-4) v.addScaledVector(d, ((1.6 - l) / l) * 4 * step); } // keep apart
          d.subVectors(p, camera.position); let l = d.length(); if (l < 6) v.addScaledVector(d, ((6 - l) / l) * 6 * step); // never on the lens
          d.set(p.x - CENTRE.x, 0, p.z - CENTRE.z); l = d.length(); if (l < KEEP_OUT) v.addScaledVector(d, ((KEEP_OUT - l) / l) * 3 * step);
          if (scare) { ray.ray.closestPointToPoint(p, d); d.subVectors(p, d); l = d.length(); if (l < 5 && l > 1e-4) v.addScaledVector(d, ((5 - l) / l) * 22 * step); } // scatter from the cursor
          if (p.y < 0.9) v.y += (0.9 - p.y) * 8 * step;
          const sp = v.length(); if (sp > 6) v.multiplyScalar(6 / sp); else if (sp < 2.2) v.multiplyScalar(2.2 / (sp || 1));
          p.addScaledVector(v, step);
          o.position.copy(p); o.lookAt(d.addVectors(p, v)); o.rotateZ(Math.PI / 2 + Math.sin(env.air * 2.2 + i) * 0.35); // on edge like a fish, with a little flutter
          o.updateMatrix(); kites.setMatrixAt(i, o.matrix);
        }
      }
      kites.instanceMatrix.needsUpdate = true;
    });
  }
}
