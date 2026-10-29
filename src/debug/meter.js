// Medidor de pico en vivo sobre la salida real (después del master y el compresor). Solo con ?debug.
// start(): empieza; read(): { peakDb, clippedWindows, seconds }. Muestrea el analizador cada 20 ms (la ventana de 2048 muestras cubre el hueco).
let state = null;
const wrapped = [];

export function startMeter(audio) {
  stopMeter();
  const ctx = audio.ctx;
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  audio.bus.comp.connect(an);
  const buf = new Float32Array(an.fftSize);
  state = { an, comp: audio.bus.comp, peak: 0, clipped: 0, t0: performance.now(), timer: 0, events: [], top: [] };
  // registra qué efectos y stingers se pidieron, para atribuir los picos
  for (const k of ['sfx', 'stinger']) {
    const orig = audio[k].bind(audio);
    wrapped.push([k, audio[k]]);
    audio[k] = (n, o) => {
      state && state.events.push([performance.now(), `${k}:${n}`]);
      return orig(n, o);
    };
  }
  state.timer = setInterval(() => {
    an.getFloatTimeDomainData(buf);
    let m = 0;
    for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i]));
    if (m > state.peak) state.peak = m;
    if (m > 0.35) {
      const now = performance.now();
      const near = state.events.filter((e) => now - e[0] < 350).map((e) => e[1]);
      state.top.push([+(20 * Math.log10(m)).toFixed(1), +((now - state.t0) / 1000).toFixed(1), near.join('+')]);
      if (state.top.length > 400) state.top.shift();
    }
    if (m >= 0.999) state.clipped++;
  }, 20);
  return true;
}

export function readMeter() {
  if (!state) return null;
  // los 6 picos más altos distintos (por segundo) con lo que sonaba
  const best = {};
  for (const [db, t, near] of state.top) {
    const k = Math.round(t);
    if (!best[k] || db > best[k][0]) best[k] = [db, t, near];
  }
  const top = Object.values(best).sort((a, b) => b[0] - a[0]).slice(0, 6);
  return { peakDb: +(20 * Math.log10(Math.max(state.peak, 1e-6))).toFixed(2), clippedWindows: state.clipped, seconds: +((performance.now() - state.t0) / 1000).toFixed(1), top };
}

export function stopMeter() {
  if (!state) return;
  clearInterval(state.timer);
  for (const [k, f] of wrapped.splice(0)) state.audioRef && (state.audioRef[k] = f);
  try {
    state.comp.disconnect(state.an);
  } catch (e) {
    // ya desconectado
  }
  state = null;
}
