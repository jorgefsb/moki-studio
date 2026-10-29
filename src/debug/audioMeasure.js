// Mediciones de audio con OfflineAudioContext (AUDIO.md §11, criterios 3, 8, 9, 23 y 24). Solo con ?debug.
import { CONFIG as C } from '../config.js';
import { createBuses } from '../audio/audio.js';
import { createMusic } from '../audio/music.js';
import { SFX, STINGERS } from '../audio/sfx.js';
import { STEP, LOOP_STEPS } from '../audio/theme.js';
import { carton } from '../audio/voices.js';

const SR = 22050; // alcanza para medir energía sobre 4 kHz (Nyquist 11 kHz) y rinde rápido
const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));

async function renderWith(seconds, build, cfg = C.audio, sr = SR) {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * sr), sr);
  const bus = createBuses(ctx, cfg);
  bus.duckGain.gain.value = 1;
  build(ctx, bus);
  const buf = await ctx.startRendering();
  return buf.getChannelData(0);
}

export const peakDb = (d) => {
  let p = 0;
  for (let i = 0; i < d.length; i++) p = Math.max(p, Math.abs(d[i]));
  return db(p);
};
const rmsDb = (d, a = 0, b = d.length) => {
  let s = 0;
  for (let i = a; i < b; i++) s += d[i] * d[i];
  return db(Math.sqrt(s / Math.max(1, b - a)));
};

// FFT radix-2 mínima para la parte de energía sobre 4 kHz (criterio 23)
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j];
        const ui = im[i + j];
        const vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci;
        const vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ur + vr;
        im[i + j] = ui + vi;
        re[i + j + len / 2] = ur - vr;
        im[i + j + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

export function highShare(d, sr = SR, cut = 4000) {
  const N = 4096;
  let total = 0;
  let high = 0;
  let maxHighDb = -200;
  const step = Math.floor(d.length / 60);
  for (let off = 0; off + N < d.length; off += Math.max(N, step)) {
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = d[off + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let k = 1; k < N / 2; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      const f = (k * sr) / N;
      total += p;
      if (f > cut) high += p;
      if (f > 6000) maxHighDb = Math.max(maxHighDb, db(Math.sqrt(p) / (N / 4)));
    }
  }
  return { highPct: +((100 * high) / total).toFixed(2), maxAbove6kDb: +maxHighDb.toFixed(1) };
}

export function tailMs(d, sr = SR, below = -40) {
  const pk = Math.max(...d.map(Math.abs));
  const lim = pk * Math.pow(10, below / 20);
  let last = 0;
  let first = d.findIndex((v) => Math.abs(v) > lim);
  for (let i = d.length - 1; i >= 0; i--) {
    if (Math.abs(d[i]) > lim) {
      last = i;
      break;
    }
  }
  return Math.round(((last - Math.max(0, first)) / sr) * 1000);
}

function wavBytes(d, sr) {
  const n = d.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
  return buf;
}

async function renderTheme(level, seconds, cfg) {
  return renderWith(
    seconds,
    (ctx, bus) => {
      for (let k = 1; k <= 3; k++) bus.layer[k].gain.value = level >= k ? 1 : 0;
      const music = createMusic(ctx, bus, { level });
      const steps = Math.ceil(seconds / STEP);
      for (let s = 0; s < steps; s++) music.scheduleStep(s % LOOP_STEPS, s * STEP);
    },
    cfg
  );
}

const SFX_CASES = {
  jump: (c, d, t, bus) => SFX.jump(c, d, t, { echo: bus.echoIn }),
  jumpHigh: (c, d, t, bus) => SFX.jumpHigh(c, d, t, { holdMs: 140, echo: bus.echoIn }),
  land: (c, d, t) => SFX.land(c, d, t, { fall: 1 }),
  pickup: (c, d, t) => SFX.pickup(c, d, t, { index: 2 }),
  stumble: (c, d, t) => SFX.stumble(c, d, t),
  ui: (c, d, t) => SFX.ui(c, d, t, {}),
};

export async function measureSfx(cfg = C.audio) {
  const out = {};
  for (const [name, fn] of Object.entries(SFX_CASES)) {
    const d = await renderWith(0.9, (ctx, bus) => fn(ctx, bus.sfxMix, 0.05, bus), cfg);
    out[name] = { peakDb: +peakDb(d).toFixed(1), tailMs: tailMs(d) };
  }
  return out;
}

export async function measureAll(cfg = C.audio) {
  const sfx = await measureSfx(cfg);
  const full = await renderTheme(3, 80, cfg);
  const base = await renderTheme(0, 20, cfg);
  const e1 = await renderTheme(1, 20, cfg);
  const e2 = await renderTheme(2, 20, cfg);
  const mus = { base: +peakDb(base).toFixed(1), e1: +peakDb(e1).toFixed(1), e2: +peakDb(e2).toFixed(1), todas80s: +peakDb(full).toFixed(1) };
  const stingers = {};
  for (const [n, fn] of Object.entries(STINGERS)) {
    const d = await renderWith(4, (ctx, bus) => fn(ctx, bus.sfxMix, 0.05, { echo: bus.echoIn }), cfg);
    stingers[n] = { peakDb: +peakDb(d).toFixed(1), tailMs: tailMs(d) };
  }
  return { cfg, sfx, music: mus, hf: highShare(full), stingers, rmsDbFull: +rmsDb(full).toFixed(1) };
}

// Eco: una nota sola, picos de cada repetición (cada 3 pasos = 0.469 s)
export async function measureEcho(cfg = C.audio) {
  const d = await renderWith(3, (ctx, bus) => carton(ctx, bus.musicMix, 0.1, 79, 0.15, 0.3, { echo: bus.echoIn, send: 0.5 }), cfg);
  const rep = [];
  const win = 0.12 * SR;
  for (let i = 0; i < 6; i++) {
    const a = Math.floor((0.1 + i * 3 * STEP - 0.02) * SR);
    let p = 0;
    for (let j = a; j < Math.min(d.length, a + win); j++) p = Math.max(p, Math.abs(d[j]));
    rep.push(+db(p).toFixed(1));
  }
  return { peaksDb: rep, feedback: cfg.echoFeedback };
}

// Costura del loop: renderiza 2 vueltas con la misma función de pasos y mide saltos y RMS alrededor de la vuelta (criterio 3)
export async function measureSeam(cfg = C.audio) {
  // Se renderizan 8 compases continuos alrededor de la vuelta (compases 28 a 32 y 1 a 3), con el mismo secuenciador:
  // la costura es la misma que en las 2 vueltas completas, y el eco cruza porque el contexto es uno solo.
  const secs = 5 * 16 * STEP; // la vuelta cae a los 5 compases del render
  const first = LOOP_STEPS - 5 * 16;
  const d = await renderWith(
    8 * 16 * STEP,
    (ctx, bus) => {
      for (let k = 1; k <= 3; k++) bus.layer[k].gain.value = 1;
      const music = createMusic(ctx, bus, { level: 3 });
      for (let s = 0; s < 8 * 16; s++) music.scheduleStep((first + s) % LOOP_STEPS, s * STEP);
    },
    cfg
  );
  const at = Math.round(secs * SR);
  let maxJump = 0;
  for (let i = at - Math.round(0.01 * SR); i < at + Math.round(0.01 * SR); i++) maxJump = Math.max(maxJump, Math.abs(d[i + 1] - d[i]));
  const bar = Math.round(2.5 * SR);
  const rmsEnd = rmsDb(d, at - bar, at);
  const rmsStart = rmsDb(d, at, at + bar);
  // el silencio más largo (< -60 dBFS) en la región de la vuelta
  let longest = 0;
  let run = 0;
  for (let i = at - 2 * SR; i < at + 2 * SR; i++) {
    if (Math.abs(d[i]) < 0.001) run++;
    else {
      longest = Math.max(longest, run);
      run = 0;
    }
  }
  return { loopSeconds: +(LOOP_STEPS * STEP).toFixed(2), maxSampleJumpAtSeam: +maxJump.toFixed(3), rmsLastBarDb: +rmsEnd.toFixed(1), rmsFirstBarDb: +rmsStart.toFixed(1), longestSilenceMs: Math.round((longest / SR) * 1000) };
}

// Guarda un .wav en evidencia/ (solo vite dev: /__save)
export async function saveWav(name, level = 2, seconds = 40, cfg = C.audio) {
  const d = await renderTheme(level, seconds, cfg);
  const body = wavBytes(d, SR);
  const r = await fetch(`/__save?name=${encodeURIComponent(name)}`, { method: 'POST', body });
  return { ok: r.ok, bytes: body.byteLength, peakDb: +peakDb(d).toFixed(1) };
}
