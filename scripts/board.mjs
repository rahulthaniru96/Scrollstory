// Draws two design-board artboards straight from the world data and the camera rail,
// so the board and the walkthrough cannot drift apart.
//   node scripts/board.mjs <design-board/source folder>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRail } from '../src/rail.js';
import { COLLIDERS, CARDS, SHOPS, COUNTERS, BRIDGES, STAIR, PHI_END, stairPt, H, SKY_BY_HEIGHT } from '../src/world.js';

const out = process.argv[2];
if (!out) { console.error('usage: node scripts/board.mjs <design-board/source folder>'); process.exit(1); }
const rail = buildRail();

const INK = '#1E2A26', OXIDE = '#9E3B2C', TEAL = '#3F6E68', MUTED = '#4A4238';
const MONO = "font-family=\"IBM Plex Mono, monospace\"";
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const f = (n) => (+n.toFixed(1)).toString();
const boxes = COLLIDERS.filter((c) => c.t === 'box');
const byName = (n) => COLLIDERS.find((c) => c.name === n);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const page = (title, w, h, svg, html) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Inter:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap" rel="stylesheet">
<style>
body{margin:0}
a{color:inherit}
</style>
</helmet>
<div style="width: ${w}px; height: ${h}px; position: relative; overflow: hidden; background: #F4EDE0; font-family: Inter, system-ui, sans-serif; color: ${INK}">
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="position: absolute; inset: 0">
${svg}
</svg>
${html}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
class Component extends DCLogic {
  renderVals() {
    return {};
  }
}
</script>
</body>
</html>
`;
const heading = (label, title, em, body, maxw = 560) => `<div style="position: absolute; left: 60px; top: 44px; max-width: 900px; display: flex; flex-direction: column; gap: 10px">
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.18em; color: ${OXIDE}">${label}</span>
<h1 style="margin: 0; font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: 44px; line-height: 1.05; letter-spacing: -0.01em">${title} <em>${em}</em></h1>
<p style="margin: 0; font-size: 14px; line-height: 1.5; color: ${MUTED}; max-width: ${maxw}px">${body}</p>
</div>`;
const label = (x, y, num, name, sub, anchor = 'start') =>
  `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" ${MONO} font-size="10" letter-spacing="1.5" fill="${OXIDE}">${num}</text>` +
  `<text x="${f(x)}" y="${f(y + 20)}" text-anchor="${anchor}" font-family="Instrument Serif, Georgia, serif" font-size="21" fill="${INK}">${esc(name)}</text>` +
  (sub ? `<text x="${f(x)}" y="${f(y + 36)}" text-anchor="${anchor}" font-family="Inter, sans-serif" font-size="11.5" fill="${MUTED}">${esc(sub)}</text>` : '');

// Rail samples: [progress, x, y, z, yaw]
const samples = [];
for (let p = 0; p <= rail.total; p += 2) { const q = rail.pos(p); samples.push([p, q[0], q[1], q[2], rail.yaw(p)]); }
const dashed = (pts, extra = '') => `<polyline points="${pts.map((q) => f(q[0]) + ',' + f(q[1])).join(' ')}" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="7 5" stroke-linejoin="round" ${extra}></polyline>`;

// =====================================================================================
// 1. The building, cut open: side view from the east. Street on the left; height is true to scale.
// =====================================================================================
{
  const S = 17, X0 = 60, YG = 826;
  const px = (z) => X0 + (34 - z) * S, py = (y) => YG - y * S;
  const rect = (z0, z1, y0, y1, fill, extra = '') => `<rect x="${f(px(Math.max(z0, z1)))}" y="${f(py(Math.max(y0, y1)))}" width="${f(Math.abs(z1 - z0) * S)}" height="${f(Math.abs(y1 - y0) * S)}" fill="${fill}" ${extra}></rect>`;
  let g = '';
  // sky by height
  const top = 38, stops = SKY_BY_HEIGHT.map(([h, c]) => `<stop offset="${f(1 - h / top)}" stop-color="${hex(c)}"></stop>`).reverse().join('');
  g += `<defs><linearGradient id="sky" x1="0" y1="${f(py(top))}" x2="0" y2="${f(py(0))}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>
<filter id="soft"><feGaussianBlur stdDeviation="5"></feGaussianBlur></filter><clipPath id="panel"><rect x="${X0}" y="${f(py(top))}" width="${62 * S}" height="${f(top * S + 14)}" rx="6"></rect></clipPath></defs>`;
  g += `<g clip-path="url(#panel)"><rect x="${X0}" y="${f(py(top))}" width="${62 * S}" height="${top * S}" fill="url(#sky)"></rect>`;
  // thin water over the ground, inside and out
  g += `<rect x="${X0}" y="${YG}" width="${62 * S}" height="14" fill="#7FB0A8"></rect>`;
  // wings behind the lobby (Gallery / Worth it run the full depth; Workshop closes the back)
  g += rect(12.3, -22.3, 0, H.wing + 0.3, '#DDCFB3');
  for (const z of [-2, -5, -8, -11, -14]) g += rect(z + 0.25, z - 0.25, 0, 3.6, '#C9B08A');
  g += rect(0, -16, 0, 3.6, '#BFD8D0', 'opacity="0.55"'); // the water courtyard seen through the arcade
  g += rect(-16, -22.3, 0, H.wing + 0.3, '#EDBFB4', 'opacity="0.8"');
  // compound wall and gate
  g += rect(18.15, 17.85, 0, 1.8, '#8C8A82');
  // lobby, cut open
  g += rect(12.3, -0.15, 0, H.roof + 0.3, '#EFE3C8');
  g += rect(12, 0.15, 0, H.roof, '#F7EFE2');
  g += rect(12.3, 12, 0, 3, '#F7EFE2'); // front door
  g += rect(0.15, -0.15, 0, H.roof, '#BFD8D0', 'opacity="0.8"'); // glass to the courtyard
  g += rect(STAIR.cz + 3.2, STAIR.cz - 3.2, H.roof, H.roof + 0.3, '#F2C08E'); // the opening in the roof
  g += `<rect x="${f(px(12))}" y="${f(py(H.roof + 1.3))}" width="${f(3.9 * S)}" height="${f(0.9 * S)}" rx="2" fill="${OXIDE}"></rect><text x="${f(px(10.05))}" y="${f(py(H.roof + 0.62))}" text-anchor="middle" ${MONO} font-size="7.5" letter-spacing="1" fill="#F4EFE6">SCROLLSTORY</text>`;
  // floating pieces that sit behind (Extras, Rooftop), then the ones in front (Landing, HOME)
  const slab = (name, col, dark) => {
    const c = byName(name), z0 = c.min[2], z1 = c.max[2], y1 = c.max[1], y0 = c.min[1];
    return `<polygon points="${f(px(z1))},${f(py(y1))} ${f(px(z0))},${f(py(y1))} ${f(px(z0 + 1.2))},${f(py(y0))} ${f(px((z0 + z1) / 2))},${f(py(y0 - 1.6))} ${f(px(z1 - 1.5))},${f(py(y0))}" fill="${dark}"></polygon>` + rect(z1, z0, y1 - 0.35, y1, col);
  };
  g += slab('extras slab', '#E8A89A', '#B9968C') + rect(-23.7, -24, H.extras, H.extras + 5, '#D9A79A') + rect(-23.6, -23.9, H.extras + 1.2, H.extras + 4, '#1C2124');
  g += slab('rooftop slab', '#D9C6A0', '#A9987A');
  g += rect(8, 7, H.rooftop, H.rooftop + 1, '#8C6F4E') + rect(9.9, 8.3, H.rooftop, H.rooftop + 1.6, '#2E2B27');
  g += `<line x1="${f(px(6.4))}" y1="${f(py(H.rooftop))}" x2="${f(px(6.4))}" y2="${f(py(H.rooftop + 2.4))}" stroke="${INK}" stroke-width="2"></line><path d="M${f(px(7.9))} ${f(py(H.rooftop + 2.3))} Q${f(px(6.4))} ${f(py(H.rooftop + 3.3))} ${f(px(4.9))} ${f(py(H.rooftop + 2.3))} Z" fill="${OXIDE}"></path>`;
  g += `<path d="M${f(px(3.6))} ${f(py(H.rooftop + 1.9))} Q${f(px(1.8))} ${f(py(H.rooftop + 1.4))} ${f(px(0))} ${f(py(H.rooftop + 1.9))}" fill="none" stroke="${INK}" stroke-width="1"></path>` +
    [[3, '#F2D98B'], [2.2, '#EDBFB4'], [1.3, '#BFD8B0']].map(([z, c]) => rect(z, z - 0.6, H.rooftop + 0.85, H.rooftop + 1.65, c)).join('');
  // the stair: a helix seen from the side. Far half first, near half on top.
  for (const near of [false, true]) {
    let d = '';
    for (let phi = STAIR.phi0, pen = false; phi <= PHI_END; phi += 0.06) {
      const q = stairPt(phi, STAIR.rOut - 0.4), isNear = Math.sin(phi) < 0; // east side faces the viewer
      if (isNear === near) { d += `${pen ? 'L' : 'M'}${f(px(q[2]))} ${f(py(q[1]))} `; pen = true; } else pen = false;
    }
    g += `<path d="${d}" fill="none" stroke="${near ? '#EFE3C8' : '#BFA57C'}" stroke-width="${near ? 7 : 4.5}" stroke-linecap="round"></path>`;
    if (near) g += `<path d="${d}" fill="none" stroke="${TEAL}" stroke-width="1.4" transform="translate(0,-7)"></path>`;
  }
  // cloud sea
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g += `<g fill="#FFF8EF">`;
  for (let i = 0; i < 46; i++) {
    const z = 34 - rnd() * 62, y = H.cloud0 + 1 + rnd() * (H.cloud1 - H.cloud0 - 2), w = 5 + rnd() * 8;
    g += `<ellipse cx="${f(px(z))}" cy="${f(py(y))}" rx="${f(w * S * 0.5)}" ry="${f((1.1 + rnd() * 1.4) * S * 0.5)}" opacity="${f(0.78 + rnd() * 0.2)}"></ellipse>`;
  }
  g += `</g>`;
  // Landing and HOME in front
  g += slab('landing slab', '#B65E3C', '#8C8A82');
  g += rect(10.3, 10, H.landing, H.landing + 3.2, '#EFE3C8');
  g += `<polygon points="${f(px(5.4))},${f(py(H.landing + 3))} ${f(px(1.6))},${f(py(H.landing + 3))} ${f(px(0.4))},${f(py(H.landing))} ${f(px(4.6))},${f(py(H.landing))}" fill="#F7D9A0" opacity="0.55"></polygon>` +
    rect(5.4, 1.6, H.landing + 0.9, H.landing + 3.1, '#FFF3D6', `stroke="${TEAL}" stroke-width="2"`);
  g += slab('home slab', '#C9B08A', '#9B8A70');
  g += rect(-15.5, -16.5, H.home, H.home + 0.9, '#3F6E68') + rect(-19, -19.6, H.home, H.home + 1.5, '#2E2B27') + rect(-23, -23.3, H.home, H.home + 3.5, '#EFE3C8');
  // bridges as stepping slabs
  for (const b of BRIDGES.filter((b) => b.axis === 'z')) for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9, z = b.a + (b.b - b.a) * u, y = b.ya + (b.yb - b.ya) * u;
    g += rect(z + 0.36, z - 0.36, y - 0.2, y, '#D9C6A0');
  }
  // floating objects
  for (const c of COLLIDERS.filter((c) => c.kind === 'floating' && c.shape !== 'card')) {
    g += `<g transform="translate(${f(px(c.z))},${f(py(c.y))}) rotate(${f(rnd() * 50 - 25)})"><rect x="-7" y="-5" width="14" height="10" fill="#F7EFE2" stroke="${INK}" stroke-width="0.8"></rect></g>`;
  }
  // the visitor's walk
  g += dashed(samples.map((q) => [px(q[3]), py(q[2])]), 'opacity="0.85"');
  const end = samples[samples.length - 1];
  g += `<circle cx="${f(px(samples[0][3]))}" cy="${f(py(samples[0][2]))}" r="4" fill="${INK}"></circle><circle cx="${f(px(end[3]))}" cy="${f(py(end[2]))}" r="5" fill="${OXIDE}"></circle>`;
  g += `</g>`;
  // labels
  g += label(px(33), py(-1.4), '00', 'Arrival', 'street, gate');
  g += label(px(11.5), py(-1.4), '01', 'Lobby', 'tall, spiral stair inside');
  g += label(px(-1), py(-1.4), '02 · 04', 'Water courtyard', 'Gallery left, Worth it right');
  g += label(px(-16.4), py(-1.4), '03', 'Workshop', 'three shops');
  g += label(px(32.6), py(19.6), '', 'Cloud sea', 'hides each half from the other');
  g += label(px(11.4), py(29.8), '', 'Landing', 'core memory: sun, dust, tiles', 'end');
  g += label(px(-12.6), py(26.3), '', 'HOME', '2012 living room', 'end');
  g += label(px(-12.4), py(37.6), '05', 'Extras', 'station board', 'end');
  g += label(px(16), py(37.6), '06', 'Rooftop front desk', 'the highest piece');
  // right column: sky by height, and the five stair beats at their true heights
  const BX = 1146;
  g += `<rect x="${BX}" y="${f(py(top))}" width="34" height="${top * S}" rx="4" fill="url(#sky)" stroke="${INK}" stroke-opacity="0.25"></rect>`;
  g += `<text x="${BX}" y="${f(py(top) - 12)}" ${MONO} font-size="10" letter-spacing="1.5" fill="${OXIDE}">SKY BY HEIGHT</text>`;
  for (const [h, c] of SKY_BY_HEIGHT) {
    if (h > top) continue;
    g += `<line x1="${BX + 34}" y1="${f(py(h))}" x2="${BX + 44}" y2="${f(py(h))}" stroke="${INK}" stroke-width="1"></line>` +
      `<text x="${BX + 50}" y="${f(py(h) + 4)}" ${MONO} font-size="10" fill="${MUTED}">${h} m  ${hex(c).toUpperCase()}</text>`;
  }
  const beats = [[1.2, '1 Look up', 'water'], [6.5, '2 Spiral up', 'footsteps on stone'], [11, '3 Through the roof', 'wind, birds'], [24.3, '4 Dark beat', 'under the stone · hush'], [27.6, '5 Landing: hold', 'ceiling fan']];
  for (const [h, name, sound] of beats) {
    g += `<text x="${BX + 152}" y="${f(py(h))}" font-family="Instrument Serif, Georgia, serif" font-size="16" fill="${INK}">${name}</text>` +
      `<text x="${BX + 152}" y="${f(py(h) + 14)}" ${MONO} font-size="9.5" fill="${MUTED}">${sound}</text>`;
  }
  const html = heading('THE BUILDING · CUT OPEN · V2', 'Two halves,', 'one walk.',
    `Seen from the side, street on the left. The ground half stands in thin water. A spiral stair leaves the lobby roof and climbs ${H.landing} m through a cloud sea to four floating pieces. Drawn from the walkthrough's own measurements; heights are to scale.`, 900) +
    `<div style="position: absolute; right: 60px; top: 52px; display: flex; flex-direction: column; gap: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: ${MUTED}; text-align: right">
<span>- - -  the visitor's walk (${Math.round(rail.length)} m of rail)</span><span>cloud sea ${H.cloud0} to ${H.cloud1} m</span><span>each floating piece a little higher</span></div>`;
  writeFileSync(join(out, 'Building-Cutaway.dc.html'), page('The building · cut open · v2', 1440, 900, g, html));
}

// =====================================================================================
// 2. Plans: ground floor 10 + 1 and the upper floor (memory fragments), with the real camera lane.
// =====================================================================================
{
  const W = 1920, Hh = 1200;
  let g = `<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${INK}"></path></marker></defs>`;
  const plan = (S, ox, oz, X0, Y0) => ({ px: (x) => X0 + (x - ox) * S, py: (z) => Y0 + (z - oz) * S, S });
  const rectP = (P, x0, x1, z0, z1, fill, extra = '') => `<rect x="${f(P.px(Math.min(x0, x1)))}" y="${f(P.py(Math.min(z0, z1)))}" width="${f(Math.abs(x1 - x0) * P.S)}" height="${f(Math.abs(z1 - z0) * P.S)}" fill="${fill}" ${extra}></rect>`;
  // Camera lane with numbered moves and "where it looks" fans.
  const lane = (P, keep) => {
    let s = '';
    const pts = samples.filter(keep);
    s += `<polyline points="${pts.map((q) => f(P.px(q[1])) + ',' + f(P.py(q[3]))).join(' ')}" fill="none" stroke="#F2D98B" stroke-width="${f(1.2 * P.S)}" stroke-linejoin="round" stroke-linecap="round" opacity="0.55"></polyline>`;
    s += dashed(pts.map((q) => [P.px(q[1]), P.py(q[3])]), 'marker-end="url(#arr)"');
    let lastFan = -1e9;
    for (const q of pts) {
      if (q[0] - lastFan < 46) continue; lastFan = q[0];
      const a = (q[4] * Math.PI) / 180, dx = -Math.sin(a), dz = -Math.cos(a), r = 1.7 * P.S, sp = 0.36;
      const cx = P.px(q[1]), cy = P.py(q[3]);
      const e = (da) => `${f(cx + r * (dx * Math.cos(da) - dz * Math.sin(da)))},${f(cy + r * (dz * Math.cos(da) + dx * Math.sin(da)))}`;
      s += `<polygon points="${f(cx)},${f(cy)} ${e(-sp)} ${e(sp)}" fill="${OXIDE}" opacity="0.32"></polygon>`;
    }
    return s;
  };
  const stairPlan = (P) => {
    let s = `<circle cx="${f(P.px(STAIR.cx))}" cy="${f(P.py(STAIR.cz))}" r="${f(STAIR.rOut * P.S)}" fill="#F7EFE2" stroke="${OXIDE}" stroke-width="1.5"></circle>`;
    for (let i = 0; i < 33; i++) {
      const a = (i / 33) * Math.PI * 2;
      s += `<line x1="${f(P.px(STAIR.cx - STAIR.rIn * Math.sin(a)))}" y1="${f(P.py(STAIR.cz + STAIR.rIn * Math.cos(a)))}" x2="${f(P.px(STAIR.cx - STAIR.rOut * Math.sin(a)))}" y2="${f(P.py(STAIR.cz + STAIR.rOut * Math.cos(a)))}" stroke="${OXIDE}" stroke-width="0.8" opacity="0.7"></line>`;
    }
    return s + `<circle cx="${f(P.px(STAIR.cx))}" cy="${f(P.py(STAIR.cz))}" r="${f(STAIR.rIn * P.S)}" fill="#F4EDE0" stroke="${OXIDE}" stroke-width="1.5"></circle>`;
  };
  const tag = (P, x, z, text, fill = INK, size = 11) => `<text x="${f(P.px(x))}" y="${f(P.py(z))}" text-anchor="middle" ${MONO} font-size="${size}" letter-spacing="1.5" fill="${fill}">${esc(text)}</text>`;

  const rot = (P, x, z, text) => `<text transform="rotate(-90 ${f(P.px(x))} ${f(P.py(z))})" x="${f(P.px(x))}" y="${f(P.py(z))}" text-anchor="middle" ${MONO} font-size="11" letter-spacing="1.5" fill="${INK}">${esc(text)}</text>`;
  // ---- ground floor ----
  const G = plan(15.3, -17, -25, 70, 262);
  g += `<rect x="${f(G.px(-17))}" y="${f(G.py(-25))}" width="${f(34 * G.S)}" height="${f(58 * G.S)}" rx="10" fill="#BFD8D0"></rect>`; // thin water everywhere
  g += rectP(G, -6, 6, 0, 12, '#9DC3B8') + rectP(G, -12, -6, -16, 12, '#D9C6A0') + rectP(G, -12, 12, -22, -16, '#EDBFB4') + rectP(G, 6, 12, -16, 12, '#F2D98B') + rectP(G, -6, 6, -16, 0, '#6FA39B');
  for (let r = 1; r <= 3; r++) g += `<ellipse cx="${f(G.px(0))}" cy="${f(G.py(-8))}" rx="${f(r * 1.5 * G.S)}" ry="${f(r * 0.9 * G.S)}" fill="none" stroke="#F7F1E6" stroke-width="1" opacity="0.5"></ellipse>`;
  for (const c of boxes) {
    if (c.min[1] > 0.5 || c.max[1] > 12) continue; // only what stands on the ground floor
    const fill = c.kind === 'furniture' ? '#8C6F4E' : c.kind === 'glass' ? '#EAF4F1' : INK;
    g += rectP(G, c.min[0], c.max[0], c.min[2], c.max[2], fill);
  }
  g += stairPlan(G);
  for (const c of CARDS) g += rectP(G, c.x - 0.8, c.x + 0.8, c.z - 0.08, c.z + 0.08, '#E8A89A', `stroke="${INK}" stroke-width="0.8"`);
  g += lane(G, (q) => q[2] < 2.2 && q[0] < rail.moves.find((m) => m.name === 'Step onto the stair').s1);
  g += tag(G, -3.6, 11.4, '01 LOBBY') + rot(G, -14.7, -2, '02 GALLERY') + tag(G, 0, -6.4, 'WATER COURTYARD', '#F7F1E6') + tag(G, 0, -16.9, '03 WORTH IT') + rot(G, 16, -2, '04 WORKSHOP') + tag(G, 0, 27, 'STREET', MUTED) + tag(G, 0, 19.6, 'GATE', MUTED, 9);
  for (const c of COUNTERS) g += tag(G, c.x, -22.9, c.name.toUpperCase(), MUTED, 8.5);
  for (const c of SHOPS) g += `<text x="${f(G.px(12.9))}" y="${f(G.py(c.z) + 3)}" ${MONO} font-size="7.5" letter-spacing="0.5" fill="${MUTED}">${c.name.toUpperCase()}</text>`;
  g += `<line x1="${f(G.px(-16))}" y1="${f(G.py(31.6))}" x2="${f(G.px(-11))}" y2="${f(G.py(31.6))}" stroke="${INK}" stroke-width="2"></line><text x="${f(G.px(-16))}" y="${f(G.py(31.6) - 6)}" ${MONO} font-size="9" fill="${MUTED}">5 m</text>`;

  // ---- upper floor ----
  const U = plan(15.5, -16, -27, 700, 330);
  g += `<rect x="${f(U.px(-16))}" y="${f(U.py(-27))}" width="${f(41 * U.S)}" height="${f(40 * U.S)}" rx="10" fill="#F2A766" opacity="0.45"></rect>`;
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) g += `<ellipse cx="${f(U.px(-15 + rnd() * 39))}" cy="${f(U.py(-26 + rnd() * 38))}" rx="${f((2 + rnd() * 4) * U.S)}" ry="${f((0.8 + rnd() * 1) * U.S)}" fill="#FFF8EF" opacity="0.55"></ellipse>`;
  const piece = (name, fill) => { const c = byName(name); return rectP(U, c.min[0], c.max[0], c.min[2], c.max[2], fill, `rx="6" stroke="${INK}" stroke-width="1.2"`); };
  g += piece('landing slab', '#D8A07E') + piece('home slab', '#D9C6A0') + piece('extras slab', '#EDBFB4') + piece('rooftop slab', '#F2D98B');
  for (const b of BRIDGES) for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9, al = b.a + (b.b - b.a) * u;
    g += b.axis === 'z' ? rectP(U, b.c - b.width / 2, b.c + b.width / 2, al - 0.3, al + 0.3, '#F7EFE2', `stroke="${INK}" stroke-width="0.8"`) : rectP(U, al - 0.3, al + 0.3, b.c - b.width / 2, b.c + b.width / 2, '#F7EFE2', `stroke="${INK}" stroke-width="0.8"`);
  }
  for (const c of boxes) {
    if (c.min[1] < H.landing - 0.1 || c.kind === 'floor') continue;
    g += rectP(U, c.min[0], c.max[0], c.min[2], c.max[2], c.kind === 'furniture' ? '#8C6F4E' : c.kind === 'sign' ? '#1C2124' : INK);
  }
  for (const c of COLLIDERS.filter((c) => c.t === 'cyl')) g += `<circle cx="${f(U.px(c.x))}" cy="${f(U.py(c.z))}" r="${f(Math.max(c.r, 0.25) * U.S)}" fill="#2E2B27"></circle>`;
  g += stairPlan(U);
  g += `<polygon points="${f(U.px(-11))},${f(U.py(1.6))} ${f(U.px(-11))},${f(U.py(5.4))} ${f(U.px(-6.6))},${f(U.py(4.9))} ${f(U.px(-6.6))},${f(U.py(2.4))}" fill="#FFF3D6" opacity="0.9"></polygon>`; // sun through the crystal window
  g += lane(U, (q) => q[2] > H.landing + 1 && q[0] > rail.moves.find((m) => m.name === 'Arrive at the Landing').s0);
  g += tag(U, -6.5, 8.6, `LANDING  +${H.landing} M`) + tag(U, -6.5, -21.6, `HOME  +${H.home} M`) + tag(U, 15, -22.4, `05 EXTRAS  +${H.extras} M`) + tag(U, 12.6, 10.2, `06 ROOFTOP  +${H.rooftop} M`) + tag(U, -8.6, 3.7, 'SUN', OXIDE, 8.5) + tag(U, 15, 6.4, 'DESK', '#F7F1E6', 8.5) + tag(U, -6.5, -19.9, 'TV', MUTED, 8.5);

  // ---- move list, with the real scroll each move takes ----
  const LX = 1400; let ly = 252;
  g += `<text x="${LX}" y="${ly - 26}" ${MONO} font-size="11" letter-spacing="2" fill="${OXIDE}">THE WALK · ${rail.moves.length} MOVES · ${rail.total} VH</text>`;
  for (const [i, m] of rail.moves.entries()) {
    g += `<text x="${LX}" y="${ly}" ${MONO} font-size="10" fill="${MUTED}">${String(i).padStart(2, '0')}</text>` +
      `<text x="${LX + 30}" y="${ly}" font-family="Inter, sans-serif" font-size="12.5" font-weight="${m.hold ? 600 : 400}" fill="${INK}">${esc(m.name)}</text>` +
      `<text x="${LX + 440}" y="${ly}" text-anchor="end" ${MONO} font-size="10" fill="${MUTED}">${Math.round(m.s1 - m.s0)}</text>`;
    ly += 24.5;
  }
  g += `<text x="${LX + 440}" y="${ly + 6}" text-anchor="end" ${MONO} font-size="10" fill="${MUTED}">scroll, in vh · bold = hold frame</text>`;
  g += `<text x="${f(G.px(-17))}" y="248" ${MONO} font-size="11" letter-spacing="2" fill="${OXIDE}">GROUND FLOOR · 10 + 1 · CHOSEN</text><text x="${f(U.px(-16))}" y="310" ${MONO} font-size="11" letter-spacing="2" fill="${OXIDE}">UPPER FLOOR · C · MEMORY FRAGMENTS · ABOVE THE CLOUDS</text>`;
  g += `<g transform="translate(${f(U.px(-16))},1010)"><line x1="0" y1="0" x2="46" y2="0" stroke="${INK}" stroke-width="2" stroke-dasharray="7 5"></line><text x="58" y="4" font-family="Inter, sans-serif" font-size="12.5" fill="${MUTED}">camera path</text>` +
    `<rect x="170" y="-8" width="46" height="16" fill="#F2D98B" opacity="0.6"></rect><text x="228" y="4" font-family="Inter, sans-serif" font-size="12.5" fill="${MUTED}">safe lane: nothing solid within 0.66 m</text>` +
    `<polygon points="500,0 536,-11 536,11" fill="${OXIDE}" opacity="0.4"></polygon><text x="548" y="4" font-family="Inter, sans-serif" font-size="12.5" fill="${MUTED}">where the camera looks</text></g>`;
  const html = heading('PLANS · V2 · FROM THE WALKTHROUGH', 'Water in the middle,', 'a memory above.',
    'Both floors seen from above, drawn from the same measurements the 3D walkthrough uses. The street is at the bottom. The dashed line is the real camera rail; the build fails if it comes closer than 0.66 m to anything solid.', 760);
  writeFileSync(join(out, 'World-v2-Plans.dc.html'), page('Plans · ground floor 10 + 1 and memory fragments', W, Hh, g, html));
}
console.log('wrote Building-Cutaway.dc.html and World-v2-Plans.dc.html');
