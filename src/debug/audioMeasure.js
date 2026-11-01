// Mediciones de audio con OfflineAudioContext (AUDIO.md §11, criterios 3, 8, 9, 23 y 24). Solo con ?debug.
import { CONFIG as C } from '../config.js';
import { createBuses, routeSfx } from '../audio/audio.js';
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
    const d = await renderWith(4, (ctx, bus) => fn(ctx, bus.sfxMix, 0.05, { echo: bus.stingerEcho }), cfg);
    stingers[n] = { peakDb: +peakDb(d).toFixed(1), tailMs: tailMs(d) };
  }
  return { cfg, sfx, music: mus, hf: highShare(full), stingers, rmsDbFull: +rmsDb(full).toFixed(1) };
}

// Eco: una nota sola, picos de cada repetición (cada 3 pasos = 0.469 s)
export async function measureEcho(cfg = C.audio) {
  const d = await renderWith(3, (ctx, bus) => carton(ctx, bus.musicMix, 0.1, 79, 0.15, 0.3, { echo: bus.echoIn, send: 0.7 }), cfg);
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

// ---- T3c3: música con y sin bajo (pasa-altos de 300 Hz), con todas las capas y con la base sola ----
function highpass300(d, sr = SR) {
  const w0 = (2 * Math.PI * 300) / sr;
  const alpha = Math.sin(w0) / (2 * 0.7071);
  const cs = Math.cos(w0);
  const b0 = (1 + cs) / 2;
  const b1 = -(1 + cs);
  const b2 = b0;
  const a0 = 1 + alpha;
  const a1 = -2 * cs;
  const a2 = 1 - alpha;
  const out = new Float32Array(d.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const y = (b0 * d[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[i] = y;
    x2 = x1;
    x1 = d[i];
    y2 = y1;
    y1 = y;
  }
  return out;
}

export async function measureMusic(cfg = C.audio, seconds = 40) {
  const out = {};
  for (const [name, level] of [['base', 0], ['todas', 3]]) {
    const d = await renderTheme(level, seconds, cfg);
    out[name] = { mezcla: +peakDb(d).toFixed(1), pasaAltos300: +peakDb(highpass300(d)).toFixed(1) };
  }
  return out;
}

export async function measureLoud(cfg = C.audio) {
  const out = {};
  const amber = await renderWith(1, (ctx, bus) => SFX.amber(ctx, bus.sfxMix, 0.05, { echo: bus.stingerEcho }), cfg);
  out.ambar = +peakDb(amber).toFixed(1);
  for (const tier of [0, 1, 2]) {
    const d = await renderWith(0.6, (ctx, bus) => SFX.pickup(ctx, bus.sfxMix, 0.05, { index: 4, tier }), cfg);
    out[`pieza_racha${tier}`] = +peakDb(d).toFixed(1);
  }
  const hi = await renderWith(0.6, (ctx, bus) => SFX.jumpHigh(ctx, bus.sfxMix, 0.05, {}), cfg);
  out.bipAlto = +peakDb(hi).toFixed(1);
  const echo = await measureEcho(cfg);
  out.eco = echo.peaksDb.slice(0, 4);
  return out;
}


// ---- T3g2: pilas de efectos con música (los escenarios que dan los picos de sesión), con el encime controlado ----
// Cada escenario: [segundo, nombre, opciones]. Devuelve el pico (dBFS, salida después del compresor) de música sola y con el escenario.
const STACKS = {
  arco_racha_alta: [[0, 'pickup', { index: 5, tier: 2 }], [0.14, 'pickup', { index: 6, tier: 2 }], [0.28, 'pickup', { index: 7, tier: 2 }], [0.42, 'pickup', { index: 8, tier: 2 }], [0.56, 'pickup', { index: 9, tier: 2 }], [0.56, 'arc', {}]],
  arco_racha_media: [[0, 'pickup', { index: 2, tier: 1 }], [0.14, 'pickup', { index: 3, tier: 1 }], [0.28, 'pickup', { index: 4, tier: 1 }], [0.28, 'arc', {}]],
  salto_piezas_bip: [[0, 'jump', {}], [0.1, 'pickup', { index: 0, tier: 0 }], [0.17, 'jumpHigh', {}], [0.24, 'pickup', { index: 1, tier: 0 }], [0.38, 'pickup', { index: 2, tier: 1 }]],
  salto_bip: [[0, 'jump', {}], [0.12, 'jumpHigh', {}]],
  aterrizaje: [[0, 'land', {}]],
  pieza_sola: [[0, 'pickup', { index: 0, tier: 0 }]],
};

export async function measureStacks(cfg = C.audio) {
  const out = {};
  const music = await renderWith(
    6,
    (ctx, bus) => {
      for (let k = 1; k <= 3; k++) bus.layer[k].gain.value = k <= 2 ? 1 : 0;
      const m = createMusic(ctx, bus, { level: 2 });
      for (let s = 0; s < Math.ceil(6 / STEP); s++) m.scheduleStep(s % LOOP_STEPS, s * STEP);
    },
    cfg
  );
  out.musica = +peakDb(music).toFixed(1);
  for (const [name, evs] of Object.entries(STACKS)) {
    const d = await renderWith(
      6,
      (ctx, bus) => {
        for (let k = 1; k <= 3; k++) bus.layer[k].gain.value = k <= 2 ? 1 : 0;
        const m = createMusic(ctx, bus, { level: 2 });
        for (let s = 0; s < Math.ceil(6 / STEP); s++) m.scheduleStep(s % LOOP_STEPS, s * STEP);
        const st = {};
        for (const [t, n, o] of evs) routeSfx(ctx, bus, st, n, SFX[n], 3 + t, { ...o, echo: bus.echoIn }, cfg);
      },
      cfg
    );
    out[name] = +peakDb(d).toFixed(1);
  }
  return out;
}

// WAV de evidencia (T3g2): música E2 + una tanda de saltos, arcos de 5 piezas con racha creciente (x2 y x3), una pieza ámbar y sonido de arco,
// pasado por routeSfx (encime controlado) y el limitador. 20 s a 22 kHz mono.
export async function saveSessionWav(name = 't3g2-audio-piezas-20s.wav', seconds = 20, cfg = C.audio) {
  const d = await renderWith(
    seconds,
    (ctx, bus) => {
      for (let k = 1; k <= 3; k++) bus.layer[k].gain.value = k <= 2 ? 1 : 0;
      const m = createMusic(ctx, bus, { level: 2 });
      for (let s = 0; s < Math.ceil(seconds / STEP); s++) m.scheduleStep(s % LOOP_STEPS, s * STEP);
      const st = {};
      let n = 0;
      for (let k = 0; k < 5; k++) {
        const t0 = 1.4 + k * 3.6;
        routeSfx(ctx, bus, st, 'jump', SFX.jump, t0 - 0.35, { echo: bus.echoIn }, cfg);
        if (k % 2) routeSfx(ctx, bus, st, 'jumpHigh', SFX.jumpHigh, t0 - 0.23, { echo: bus.echoIn }, cfg);
        for (let i = 0; i < 5; i++) {
          n += 1;
          const tier = n >= 6 ? 2 : n >= 3 ? 1 : 0;
          const amber = k === 2 && i === 2;
          routeSfx(ctx, bus, st, amber ? 'amber' : 'pickup', SFX[amber ? 'amber' : 'pickup'], t0 + i * 0.14, { index: n - 1, tier, echo: bus.echoIn }, cfg);
        }
        routeSfx(ctx, bus, st, 'arc', SFX.arc, t0 + 4 * 0.14, { echo: bus.echoIn }, cfg);
        routeSfx(ctx, bus, st, 'land', SFX.land, t0 + 0.9, { echo: bus.echoIn }, cfg);
        // pop-up: el tic del aviso encima del peor momento (salto y arco completo), y otro suelto
        if (pop) {
          routeSfx(ctx, bus, st, 'popAviso', SFX.popAviso, t0 - 0.35, { echo: bus.echoIn }, cfg);
          routeSfx(ctx, bus, st, 'popAviso', SFX.popAviso, t0 + 4 * 0.14, { echo: bus.echoIn }, cfg);
          routeSfx(ctx, bus, st, 'popAviso', SFX.popAviso, t0 + 2, { echo: bus.echoIn }, cfg);
        }
      }
    },
    cfg
  );
  const body = wavBytes(d, SR);
  const r = await fetch(`/__save?name=${encodeURIComponent(name)}`, { method: 'POST', body });
  return { ok: r.ok, bytes: body.byteLength, peakDb: +peakDb(d).toFixed(1) };
}

// ---- Pieza 6 v2: timbre por papel y stinger de pasar página ----
// Centroide espectral medio (Hz), ponderado por potencia, en ventanas de 4096 con Hann
export function centroidHz(d, sr = SR) {
  const N = 4096;
  let num = 0;
  let den = 0;
  for (let off = 0; off + N < d.length; off += N) {
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = d[off + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let k = 1; k < N / 2; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      num += p * ((k * sr) / N);
      den += p;
    }
  }
  return Math.round(num / Math.max(den, 1e-12));
}

const b64 = (buf) => {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};

async function renderPapelTheme(papel, level, seconds, cfg) {
  const { createPapel } = await import('../audio/papel.js');
  return renderWith(
    seconds,
    (ctx, bus) => {
      for (let k = 1; k <= 3; k++) bus.layer[k].gain.value = level >= k ? 1 : 0;
      const p = createPapel(ctx, bus, cfg);
      if (papel) p.set(papel, 0, 0.001);
      const music = createMusic(ctx, bus, { level, papel: p });
      const steps = Math.ceil(seconds / STEP);
      for (let s = 0; s < steps; s++) music.scheduleStep(s % LOOP_STEPS, s * STEP);
    },
    cfg
  );
}

// Sesión con papel: música E2, saltos y piezas con racha, y una página nueva cada 6 s (stinger + cambio de papel).
async function renderPapelSession(order, seconds, cfg, pop = false) {
  const { createPapel, stingerPagina } = await import('../audio/papel.js');
  return renderWith(
    seconds,
    (ctx, bus) => {
      for (let k = 1; k <= 3; k++) bus.layer[k].gain.value = k <= 2 ? 1 : 0;
      const p = createPapel(ctx, bus, cfg);
      p.set(order[0], 0, 0.001);
      const m = createMusic(ctx, bus, { level: 2, papel: p });
      // cada página se programa en su momento (suspend del render): el papel de cada nota es el de su página
      const page = (i) => {
        const a = i * 6;
        if (i) {
          p.set(order[i], a, 0.4);
          stingerPagina(ctx, bus.sfxMix, a + 0.005, { papel: order[i] });
        }
        for (let s = Math.ceil(a / STEP); s * STEP < Math.min(seconds, a + 6); s++) m.scheduleStep(s % LOOP_STEPS, s * STEP);
      };
      page(0);
      order.forEach((_, i) => i && ctx.suspend(i * 6 - 0.1).then(() => (page(i), ctx.resume())));
      const st = {};
      let n = 0;
      for (let k = 0; k < Math.floor(seconds / 3) - 1; k++) {
        const t0 = 1.4 + k * 3;
        routeSfx(ctx, bus, st, 'jump', SFX.jump, t0 - 0.35, { echo: bus.echoIn }, cfg);
        if (k % 2) routeSfx(ctx, bus, st, 'jumpHigh', SFX.jumpHigh, t0 - 0.23, { echo: bus.echoIn }, cfg);
        for (let i = 0; i < 5; i++) {
          n += 1;
          routeSfx(ctx, bus, st, 'pickup', SFX.pickup, t0 + i * 0.14, { index: n - 1, tier: n >= 6 ? 2 : n >= 3 ? 1 : 0, echo: bus.echoIn }, cfg);
        }
        routeSfx(ctx, bus, st, 'arc', SFX.arc, t0 + 4 * 0.14, { echo: bus.echoIn }, cfg);
        routeSfx(ctx, bus, st, 'land', SFX.land, t0 + 0.9, { echo: bus.echoIn }, cfg);
        // pop-up: el tic del aviso encima del peor momento (salto y arco completo), y otro suelto
        if (pop) {
          routeSfx(ctx, bus, st, 'popAviso', SFX.popAviso, t0 - 0.35, { echo: bus.echoIn }, cfg);
          routeSfx(ctx, bus, st, 'popAviso', SFX.popAviso, t0 + 4 * 0.14, { echo: bus.echoIn }, cfg);
          routeSfx(ctx, bus, st, 'popAviso', SFX.popAviso, t0 + 2, { echo: bus.echoIn }, cfg);
        }
      }
    },
    cfg
  );
}

// Eco con el papel puesto: una nota sola de melodía y el pico de sus 3 primeras repeticiones (dB contra la nota)
async function echoPapel(papel, cfg) {
  const { createPapel } = await import('../audio/papel.js');
  const d = await renderWith(2, (ctx, bus) => {
    const p = createPapel(ctx, bus, cfg);
    if (papel) p.set(papel, 0, 0.001);
    carton(ctx, bus.musicMix, 0.1, 79, 0.15, 0.3, { echo: bus.echoIn, send: 0.7 });
  }, cfg);
  const pk = (a) => {
    let m = 0;
    for (let j = Math.floor(a * SR); j < Math.min(d.length, Math.floor((a + 0.12) * SR)); j++) m = Math.max(m, Math.abs(d[j]));
    return m;
  };
  const n0 = pk(0.08);
  return [1, 2, 3].map((i) => +(db(pk(0.08 + i * 3 * STEP)) - db(n0)).toFixed(1));
}

// Devuelve números por papel y, con wav: true, los wav en base64 (el script los escribe en evidencia/).
export async function measurePapel({ wav = false, cfg = C.audio } = {}) {
  const { stingerPagina, PAPELES } = await import('../audio/papel.js');
  const out = { papeles: {}, stinger: {}, wavs: {} };
  const names = [null, ...Object.keys(PAPELES)];
  for (const name of names) {
    const d = await renderPapelTheme(name, 1, 20, cfg);
    const key = name || 'sin_papel';
    out.papeles[key] = { centroideHz: centroidHz(d), centroideSobre300Hz: centroidHz(highpass300(d)), picoDb: +peakDb(d).toFixed(1), rmsDb: +rmsDb(d).toFixed(1), eco: await echoPapel(name, cfg) };
    if (wav) out.wavs[`v2-audio-papel-${key}-20s.wav`] = b64(wavBytes(d, SR));
  }
  // la misma partitura sin la capa (createMusic sin papel) para confirmar que "sin papel" es el tema de siempre
  const plain = await renderTheme(1, 20, cfg);
  out.papeles.sin_papel.picoTemaDeSiempreDb = +peakDb(plain).toFixed(1);
  for (const name of Object.keys(PAPELES)) {
    const d = await renderWith(1.5, (ctx, bus) => stingerPagina(ctx, bus.sfxMix, 0.05, { papel: name }), cfg);
    out.stinger[name] = { picoDb: +peakDb(d).toFixed(1), duracionMs: tailMs(d) };
    if (wav && name === 'cartulina') out.wavs['v2-audio-pagina-stinger.wav'] = b64(wavBytes(d, SR));
  }
  const order = ['kraft', 'cuaderno', 'periodico', 'cartulina'];
  const ses = await renderPapelSession(order, 24, cfg);
  out.sesion = { orden: order, segundos: 24, picoDb: +peakDb(ses).toFixed(1) };
  if (wav) out.wavs['v2-audio-sesion-papeles-24s.wav'] = b64(wavBytes(ses, SR));
  return out;
}

// Pop-up (pieza POP-UP): pico de la misma sesión de 24 s con y sin el tic del aviso, y el tic solo
export async function measurePopup({ wav = false, cfg = C.audio } = {}) {
  const order = ['kraft', 'periodico', 'cartulina', 'cuaderno'];
  const sin = await renderPapelSession(order, 24, cfg, false);
  const con = await renderPapelSession(order, 24, cfg, true);
  const solo = await renderWith(0.5, (ctx, bus) => routeSfx(ctx, bus, {}, 'popAviso', SFX.popAviso, 0.05, { echo: bus.echoIn }, cfg), cfg);
  const out = { sesionSinPopDb: +peakDb(sin).toFixed(1), sesionConPopDb: +peakDb(con).toFixed(1), ticSoloDb: +peakDb(solo).toFixed(1), ticMs: tailMs(solo), wavs: {} };
  if (wav) {
    out.wavs['v2-popup-tic.wav'] = b64(wavBytes(solo, SR));
    out.wavs['v2-popup-sesion-24s.wav'] = b64(wavBytes(con, SR));
  }
  return out;
}
