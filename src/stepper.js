// Scroll to checkpoint: one gesture moves the walk exactly one stop. Pure logic, so scripts/check.mjs can test it.
// go(i) starts the travel to stop i; the caller reports the end of the travel with arrived().
export function stepper(stops, go) {
  let dest = 0, travelling = false, queued = 0, lastWheel = -1e9;
  const clamp = (i) => Math.min(stops.length - 1, Math.max(0, i));
  const start = (i) => { dest = i; travelling = true; go(i); };
  const api = {
    get dest() { return dest; },
    get travelling() { return travelling; },
    nearest: (p) => stops.reduce((b, s, i) => (Math.abs(s - p) < Math.abs(stops[b] - p) ? i : b), 0),
    step(dir) { // during a travel, one more step waits its turn; a third is dropped
      if (travelling) { queued = dir; return; }
      const i = clamp(dest + dir); if (i !== dest) start(i);
    },
    // shortcut: a gesture is a run of wheel events with no gap over 0.18 s, so a second swipe made inside a trackpad's coasting tail is missed. Upgrade to delta-peak detection if that is felt.
    wheel(dir, t) { const fresh = t - lastWheel > 0.18; lastWheel = t; if (fresh) api.step(dir); },
    goto(i) { queued = 0; start(clamp(i)); },
    arrived() { travelling = false; if (queued) { const d = queued; queued = 0; api.step(d); } },
    sync(p) { if (!travelling) dest = api.nearest(p); }, // after a scrollbar drag or a jump
  };
  return api;
}
