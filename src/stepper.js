// Scroll to checkpoint: one gesture moves the walk exactly one stop. Pure logic, so scripts/check.mjs can test it.
// go(i) starts the travel to stop i; the caller reports the end of the travel with arrived().
// Nothing queues: input during a travel is dropped, so a flick can never carry the walk two or three stops.
const GAP = 0.25; // seconds of wheel silence that end a gesture
const SMALL = 4; // a wheel delta under this (the end of a trackpad's coasting) never starts a gesture
const LONG = 0.6; // after this much silence any wheel event is a new gesture
export function stepper(stops, go) {
  let dest = 0, travelling = false, lastWheel = -1e9, lastMag = 0;
  const clamp = (i) => Math.min(stops.length - 1, Math.max(0, i));
  const start = (i) => { dest = i; travelling = true; go(i); };
  const api = {
    get dest() { return dest; },
    get travelling() { return travelling; },
    nearest: (p) => stops.reduce((b, s, i) => (Math.abs(s - p) < Math.abs(stops[b] - p) ? i : b), 0),
    first: (p) => Math.max(0, stops.findIndex((s) => s >= p - 1)), // the first stop at or after p
    step(dir) { if (travelling) return; const i = clamp(dest + dir); if (i !== dest) start(i); },
    // every wheel event, even one dropped during a travel, extends the gesture, so a coasting tail that outlasts the travel stays part of it
    // a gap alone is not enough: a coasting tail can stutter (a busy frame, a slow device) but its deltas only shrink, while a new flick starts bigger
    wheel(dir, t, mag = 100) {
      const gap = t - lastWheel, fresh = mag >= SMALL && (gap > LONG || (gap > GAP && mag > lastMag * 1.3 + 2));
      lastWheel = t; lastMag = mag; if (fresh) api.step(dir);
    },
    goto(i) { start(clamp(i)); },
    arrived() { travelling = false; },
    land(i) { dest = clamp(i); travelling = false; }, // a jump put the walk on stop i directly
    sync(p) { if (!travelling) dest = api.nearest(p); }, // after a scrollbar drag or a jump
  };
  return api;
}
