// Travel to a stop, for the keys and the pips (the wheel scrolls freely). Pure logic, so scripts/check.mjs can test it.
// go(i) starts the travel to stop i; the caller reports the end of the travel with arrived(). Nothing queues.
export function stepper(stops, go) {
  let dest = 0, travelling = false;
  const clamp = (i) => Math.min(stops.length - 1, Math.max(0, i));
  const start = (i) => { dest = i; travelling = true; go(i); };
  const api = {
    get dest() { return dest; },
    get travelling() { return travelling; },
    nearest: (p) => stops.reduce((b, s, i) => (Math.abs(s - p) < Math.abs(stops[b] - p) ? i : b), 0),
    first: (p) => Math.max(0, stops.findIndex((s) => s >= p - 1)), // the first stop at or after p
    step(dir) { if (travelling) return; const i = clamp(dest + dir); if (i !== dest) start(i); },
    goto(i) { start(clamp(i)); },
    arrived() { travelling = false; },
    land(i) { dest = clamp(i); travelling = false; }, // a jump put the walk on stop i directly
    sync(p) { if (!travelling) dest = api.nearest(p); }, // after a scrollbar drag or a jump
  };
  return api;
}
