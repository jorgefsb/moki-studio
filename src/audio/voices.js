// Voces de "cozy chiptune" (AUDIO.md §3.1): notas de juguete de cartón. Todas son (ctx, destino, tiempo, ...) y no leen
// nada global, para que se puedan renderizar con OfflineAudioContext. Reglas: sin sawtooth; square/pulso 25% siempre
// detrás de un lowpass <= 2.5 kHz; ataque >= 2 ms; release >= 40 ms.
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const pulseWaves = new WeakMap();
const noiseBufs = new WeakMap();

// Pulso al 25%: armónicos b_n = (2/(n*pi)) * sin(n*pi*0.25), n hasta 12
export function pulseWave(ctx) {
  let w = pulseWaves.get(ctx);
  if (!w) {
    const N = 13;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    for (let n = 1; n < N; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25);
    w = ctx.createPeriodicWave(real, imag);
    pulseWaves.set(ctx, w);
  }
  return w;
}

function noise(ctx, t, dur) {
  let buf = noiseBufs.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0; // ruido repetible
      d[i] = (seed / 4294967296) * 2 - 1;
    }
    noiseBufs.set(ctx, buf);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.start(t, 0.05 + ((t * 7.31) % 0.9), dur);
  return src;
}

const osc = (ctx, type, f, t, end) => {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.start(t);
  o.stop(end + 0.03);
  return o;
};

const lp = (ctx, f, q = 0.5) => {
  const n = ctx.createBiquadFilter();
  n.type = 'lowpass';
  n.frequency.value = f;
  n.Q.value = q;
  return n;
};

// ataque lineal corto, caída exponencial hasta 0.001 en endT
function shape(g, t, atk, peak, endT, toPct, toSec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + atk);
  let at = t + atk;
  if (toPct !== undefined) {
    at = t + toSec;
    g.gain.exponentialRampToValueAtTime(Math.max(0.0005, peak * toPct), at);
  }
  g.gain.exponentialRampToValueAtTime(0.001, Math.max(endT, at + 0.01));
}

// salida: al destino y, si hay eco, un envío
function route(ctx, node, dest, o) {
  node.connect(dest);
  if (o && o.echo && o.send > 0) {
    const s = ctx.createGain();
    s.gain.value = o.send;
    node.connect(s);
    s.connect(o.echo);
  }
}

const atk = (o, base) => Math.max(base, (o && o.atkMin) || 0);
const vol = (o) => (o && o.vol !== undefined ? o.vol : 1);

// carton: triangular con "tin" una octava arriba (melodía A, notas de efectos)
export function carton(ctx, dest, t, midi, dur, peak = 0.3, o = {}) {
  const f = mtof(midi) * (o.detune || 1);
  const a = atk(o, 0.004);
  const p = peak * vol(o);
  const end = t + dur + 0.08;
  const g = ctx.createGain();
  const filt = lp(ctx, 3000, 0.5);
  shape(g, t, a, p, end, 0.35, 0.06);
  osc(ctx, 'triangle', f, t, end).connect(g);
  g.connect(filt);
  if (!o.noTin) {
    // el "tin" de juguete: la misma nota una octava arriba al 12%
    const g2 = ctx.createGain();
    shape(g2, t, a, p * 0.12, t + (dur + 0.08) * 0.6, 0.35, 0.04);
    osc(ctx, 'triangle', f * 2, t, end).connect(g2);
    g2.connect(filt);
  }
  route(ctx, filt, dest, o);
}

// cuadrada: cuadrada suave detrás de lowpass 2 kHz, mezclada 70/30 con triangular
export function cuadrada(ctx, dest, t, midi, dur, peak = 0.14, o = {}) {
  const f = mtof(midi) * (o.detune || 1);
  const a = atk(o, 0.005);
  const p = peak * vol(o);
  const end = t + dur + 0.06;
  const g = ctx.createGain();
  const filt = lp(ctx, 2000, 0.7);
  shape(g, t, a, p, end, 0.3, 0.08);
  const sq = ctx.createGain();
  sq.gain.value = 0.7;
  osc(ctx, 'square', f, t, end).connect(sq);
  const tr = ctx.createGain();
  tr.gain.value = 0.3;
  osc(ctx, 'triangle', f, t, end).connect(tr);
  sq.connect(filt);
  tr.connect(filt);
  filt.connect(g);
  route(ctx, g, dest, o);
}

// pulso 25% detrás de lowpass 2.2 kHz (acordes de energía, arpegio)
export function pulso(ctx, dest, t, midi, peak = 0.1, o = {}) {
  const f = mtof(midi);
  const a = atk(o, 0.004);
  const end = t + a + 0.12;
  const g = ctx.createGain();
  const filt = lp(ctx, 2200, 0.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak * vol(o), t + a);
  g.gain.exponentialRampToValueAtTime(0.001, end + 0.04);
  const os = ctx.createOscillator();
  os.setPeriodicWave(pulseWave(ctx));
  os.frequency.setValueAtTime(f, t);
  os.start(t);
  os.stop(end + 0.08);
  os.connect(filt);
  filt.connect(g);
  route(ctx, g, dest, o);
}

// bajo: triangular + seno una octava abajo (40%), lowpass 700 Hz
export function bajo(ctx, dest, t, midi, dur, peak = 0.38, o = {}) {
  const f = mtof(midi);
  const end = t + dur + 0.08;
  const g = ctx.createGain();
  const filt = lp(ctx, 700, 0.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak * vol(o), t + atk(o, 0.006));
  g.gain.setValueAtTime(peak * vol(o) * 0.9, t + dur);
  g.gain.exponentialRampToValueAtTime(0.001, end);
  osc(ctx, 'triangle', f, t, end).connect(g);
  const sub = ctx.createGain();
  sub.gain.value = 0.4;
  osc(ctx, 'sine', f / 2, t, end).connect(sub);
  sub.connect(g);
  g.connect(filt);
  route(ctx, filt, dest, o);
}

// tok de cartón: triangular que cae de 190 a 70 Hz + clic de ruido
export function tok(ctx, dest, t, peak = 0.3, o = {}) {
  const a = atk(o, 0.002);
  const g = ctx.createGain();
  shape(g, t, a, peak * vol(o), t + 0.09 + a);
  const os = osc(ctx, 'triangle', 190, t, t + 0.1);
  os.frequency.exponentialRampToValueAtTime(70, t + 0.07);
  os.connect(g);
  const nz = noise(ctx, t, 0.02);
  const nf = lp(ctx, 1200, 0.5);
  const ng = ctx.createGain();
  shape(ng, t, 0.002, peak * vol(o) * 0.2, t + 0.01);
  nz.connect(nf);
  nf.connect(ng);
  ng.connect(dest);
  route(ctx, g, dest, o);
}

// shaker de papel: ruido por bandpass 3 kHz y lowpass 4 kHz
export function shaker(ctx, dest, t, peak = 0.08, o = {}) {
  const a = atk(o, 0.003);
  const nz = noise(ctx, t, 0.08);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3000;
  bp.Q.value = 0.8;
  const l = lp(ctx, 4000, 0.5);
  const g = ctx.createGain();
  shape(g, t, a, peak * vol(o), t + 0.045 + a);
  nz.connect(bp);
  bp.connect(l);
  l.connect(g);
  g.connect(dest);
}

// tic: pulso 25% de 880 a 800 Hz
export function tic(ctx, dest, t, peak = 0.1, o = {}) {
  const a = atk(o, 0.003);
  const g = ctx.createGain();
  const filt = lp(ctx, 2500, 0.5);
  shape(g, t, a, peak * vol(o), t + 0.04 + a);
  const os = ctx.createOscillator();
  os.setPeriodicWave(pulseWave(ctx));
  os.frequency.setValueAtTime(880, t);
  os.frequency.linearRampToValueAtTime(800, t + 0.04);
  os.start(t);
  os.stop(t + 0.12);
  os.connect(filt);
  filt.connect(g);
  route(ctx, g, dest, o);
}

// campana: triangular en octava 6 + seno a 3x (15%), cae en 350 ms
export function campana(ctx, dest, t, midi, peak = 0.1, o = {}) {
  const f = mtof(midi);
  const a = atk(o, 0.003);
  const end = t + (o.tail || 0.35) + a;
  const g = ctx.createGain();
  const filt = lp(ctx, 4000, 0.5);
  shape(g, t, a, peak * vol(o), end);
  osc(ctx, 'triangle', f, t, end).connect(g);
  const g3 = ctx.createGain();
  g3.gain.value = 0.15;
  osc(ctx, 'sine', f * 3, t, end).connect(g3);
  g3.connect(g);
  g.connect(filt);
  route(ctx, filt, dest, o);
}

export const voiceTools = { noise, osc, lp, shape, atk, vol };
