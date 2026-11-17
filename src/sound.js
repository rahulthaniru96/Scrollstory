// Sound, synthesised in code: no files to load. Off until the visitor turns it on; the AudioContext is made on that click.
// shortcut: every sound is a few oscillators or a noise burst, not recorded audio, and nothing is panned to its source. Replace with a recorded pack if Rahul supplies one.
export function sound() {
  let ctx = null, out = null, drone = null, on = false;
  const noise = (dur) => { const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(); s.buffer = b; return s; };
  const env = (peak, attack, dur) => { const g = ctx.createGain(), t = ctx.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(out); return g; };
  const tone = (type, f0, f1, peak, dur, attack = 0.01) => { const o = ctx.createOscillator(), t = ctx.currentTime; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); o.connect(env(peak, attack, dur)); o.start(t); o.stop(t + dur + 0.05); };
  const burst = (dur, type, freq, q, peak) => { const s = noise(dur), f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; s.connect(f); f.connect(env(peak, 0.005, dur)); s.start(); };
  const play = (fn) => (...a) => { if (on && ctx) fn(...a); };
  return {
    get on() { return on; },
    toggle() {
      on = !on;
      if (on && !ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)(); out = ctx.createGain(); out.gain.value = 0.5; out.connect(ctx.destination);
        // the building hums: two detuned low notes through a filter that each room retunes
        const g = ctx.createGain(), f = ctx.createBiquadFilter(), a = ctx.createOscillator(), b = ctx.createOscillator();
        g.gain.value = 0.05; f.type = 'lowpass'; f.frequency.value = 300; a.type = 'sawtooth'; b.type = 'triangle'; a.frequency.value = 55; b.frequency.value = 82.6;
        a.connect(f); b.connect(f); f.connect(g); g.connect(out); a.start(); b.start(); drone = { a, b, f };
      }
      if (ctx) { on ? ctx.resume() : ctx.suspend(); }
      return on;
    },
    level: play((i) => { const t = ctx.currentTime, root = [55, 55, 61.7, 65.4, 73.4, 82.4, 87.3, 98, 110, 123.5][i % 10]; drone.a.frequency.linearRampToValueAtTime(root, t + 2); drone.b.frequency.linearRampToValueAtTime(root * 1.502, t + 2); drone.f.frequency.linearRampToValueAtTime(240 + i * 60, t + 2); }),
    tick: play(() => tone('sine', 880, 660, 0.05, 0.09)), // arriving at a stop
    gloop: play(() => tone('sine', 300, 70, 0.22, 0.4, 0.03)), // through a membrane
    blip: play(() => burst(0.14, 'highpass', 1800, 0.7, 0.12)), // the TV changes channel
    page: play(() => burst(0.22, 'bandpass', 2600, 1.2, 0.08)), // a book
    whoosh: play(() => burst(0.9, 'bandpass', 500, 0.8, 0.14)), // the hat
    chime: play((n) => { for (const [k, m] of [1, 1.25, 1.5].entries()) setTimeout(() => on && tone('sine', 660 * m * 2 ** (n / 6), 660 * m * 2 ** (n / 6), 0.12, 1.1, 0.01), k * 90); }), // a secret found: higher each time
  };
}
