// Efectos y stingers (AUDIO.md §5 y §6). (ctx, destino, tiempo, opciones); sin globales, renderizables offline.
// Cola audible < 150 ms salvo los marcados "especial". Aleatorio: ±3% de afinación y ±8% de volumen.
import { carton, cuadrada, pulso, campana, tok, shaker, tic, voiceTools, pulseWave } from './voices.js';
import { PICKUP_SCALE } from './theme.js';

const { noise, osc, lp, shape } = voiceTools;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// T3g2: el bus de efectos volvió a 5.7; los picos se controlan con routeSfx (audio.js), no con volumen
const JUMP_BOOST = 1; // (T3g subió +3 dB al bajar el bus; con el bus de vuelta en 5.7 vuelve a 1)

// Opciones comunes: reduced baja picos 20%, sube el ataque mínimo a 8 ms y pasa todo por lowpass de 3.5 kHz
function prep(ctx, dest, o) {
  const r = o && o.reduced;
  let out = dest;
  if (r) {
    out = lp(ctx, 3500, 0.5);
    out.connect(dest);
  }
  const jitter = (a) => (r ? 1 : 1 + (Math.random() * 2 - 1) * a);
  return { out, r, pk: r ? 0.8 : 1, atkMin: r ? 0.008 : 0, v: jitter(0.08), d: jitter(0.03) };
}

const gl = (ctx, out, t, type, f0, f1, ms, peak, atk, tail, extra) => {
  const g = ctx.createGain();
  shape(g, t, atk, peak, t + tail);
  const os = osc(ctx, type, f0, t, t + tail);
  os.frequency.exponentialRampToValueAtTime(f1, t + ms / 1000);
  os.connect(g);
  g.connect(extra || out);
  return g;
};

export function jump(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const a = Math.max(0.003, P.atkMin);
  // despegue: triangular de 330 a 520 Hz en 90 ms
  gl(ctx, P.out, t, 'triangle', 330 * P.d, 520 * P.d, 90, 0.35 * JUMP_BOOST * P.pk * P.v, a, 0.11);
  // "bip" de juguete: pulso 25% una octava arriba, al 20%, detrás de lowpass 2.5 kHz
  const f = lp(ctx, 2500, 0.5);
  const g = ctx.createGain();
  shape(g, t, a, 0.35 * JUMP_BOOST * P.pk * P.v * 0.2, t + 0.11);
  const os = ctx.createOscillator();
  os.setPeriodicWave(pulseWave(ctx));
  os.frequency.setValueAtTime(660 * P.d, t);
  os.frequency.exponentialRampToValueAtTime(1040 * P.d, t + 0.09);
  os.start(t);
  os.stop(t + 0.15);
  os.connect(f);
  f.connect(g);
  g.connect(P.out);
  // susurro de papel
  const nz = noise(ctx, t, 0.012);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2500;
  bp.Q.value = 1;
  const ng = ctx.createGain();
  shape(ng, t, 0.003, 0.04 * JUMP_BOOST * P.pk, t + 0.012);
  nz.connect(bp);
  bp.connect(ng);
  ng.connect(P.out);
}

// segundo "bip" ascendente a los 140 ms de mantener: sube con el tiempo mantenido (tope 780 Hz)
// Segundo "bip" que enseña a mantener: nace al inicio de la rampa (120 ms de mantener) y sube de ~540 a 780 Hz
// mientras se mantiene (hasta los 170 ms).
export function jumpHigh(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const g = ctx.createGain();
  shape(g, t, Math.max(0.003, P.atkMin), 0.4 * JUMP_BOOST * P.pk * P.v, t + 0.17);
  const os = osc(ctx, 'triangle', 540 * P.d, t, t + 0.17);
  os.frequency.exponentialRampToValueAtTime(780 * P.d, t + 0.05);
  os.connect(g);
  g.connect(P.out);
}

export function land(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const k = clamp(o.fall === undefined ? 1 : o.fall, 0.5, 1);
  const a = Math.max(0.002, P.atkMin);
  const nz = noise(ctx, t, 0.12);
  const f = lp(ctx, 1800, 0.5);
  f.frequency.setValueAtTime(1800, t);
  f.frequency.exponentialRampToValueAtTime(600, t + 0.09);
  const g = ctx.createGain();
  shape(g, t, a, 0.35 * k * P.pk * P.v, t + 0.1);
  nz.connect(f);
  f.connect(g);
  g.connect(P.out);
  gl(ctx, P.out, t, 'triangle', 140, 90, 60, 0.4 * k * P.pk * P.v, a, 0.09);
}

// Pieza recogida: sube en pentatónica con la racha (índice 0 a 4, luego se queda arriba)
export function pickup(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const midi = PICKUP_SCALE[clamp(o.index || 0, 0, PICKUP_SCALE.length - 1)];
  const lpf = lp(ctx, 3500, 0.5);
  lpf.connect(P.out);
  const opt = { atkMin: P.atkMin, vol: P.v * P.pk, detune: P.d };
  carton(ctx, lpf, t, midi, 0.04, 0.22, opt);
  cuadrada(ctx, lpf, t, midi, 0.04, 0.22 * 0.25, opt);
  // racha x2 / x3: la quinta y la octava, solo en Mucho o más
  if (o.tier >= 1) carton(ctx, lpf, t, midi + 7, 0.04, 0.05, opt);
  if (o.tier >= 2) carton(ctx, lpf, t, midi + 12, 0.04, 0.04, opt);
}

// Pieza ámbar (especial): campana Sol5 y 80 ms después Do6 + Mi6, con eco
export function amber(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const e = { echo: o.echo, send: 0.3, atkMin: P.atkMin, vol: P.pk, tail: 0.3 };
  campana(ctx, P.out, t, 79, 0.16, e);
  campana(ctx, P.out, t + 0.08, 84, 0.14, e);
  campana(ctx, P.out, t + 0.08, 88, 0.14, e);
}

// Tropiezo amable: "tum" de cartón, sin agudos
export function stumble(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const nz = noise(ctx, t, 0.16);
  const f = lp(ctx, 900, 0.5);
  f.frequency.setValueAtTime(900, t);
  f.frequency.exponentialRampToValueAtTime(300, t + 0.13);
  const g = ctx.createGain();
  shape(g, t, Math.max(0.005, P.atkMin), 0.3 * P.pk, t + 0.13);
  nz.connect(f);
  f.connect(g);
  g.connect(P.out);
  gl(ctx, P.out, t, 'triangle', 110, 70, 120, 0.36 * P.pk, Math.max(0.004, P.atkMin), 0.12);
}

// Botón de UI: glissando corto; 'up' sube (activar), 'down' baja (apagar)
export function ui(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const dir = o.dir || 'press';
  const [f0, f1] = dir === 'up' ? [520, 700] : dir === 'down' ? [700, 400] : [700, 520];
  gl(ctx, P.out, t, 'triangle', f0, f1, 40, 0.2 * P.pk, Math.max(0.003, P.atkMin), 0.06);
}

export function pause(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const [a, b] = o.resume ? [76, 79] : [79, 76];
  const opt = { atkMin: P.atkMin, vol: P.pk };
  carton(ctx, P.out, t, a, 0.06, 0.2, opt);
  carton(ctx, P.out, t + 0.12, b, 0.06, 0.2, opt);
}

// Tarjeta de lección entra (especial, 200 ms): papel que se desliza
export function card(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  if (P.r) return; // en movimiento reducido no hay barrido
  const nz = noise(ctx, t, 0.25);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1;
  bp.frequency.setValueAtTime(1000, t);
  bp.frequency.exponentialRampToValueAtTime(2500, t + 0.2);
  const g = ctx.createGain();
  shape(g, t, 0.02, 0.08, t + 0.2);
  nz.connect(bp);
  bp.connect(g);
  g.connect(P.out);
}

export function eso(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const opt = { atkMin: P.atkMin, vol: P.pk };
  carton(ctx, P.out, t, 79, 0.04, 0.28, opt);
  carton(ctx, P.out, t + 0.12, 84, 0.04, 0.28, opt);
}

export function handTic(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  tic(ctx, P.out, t, 0.1, { atkMin: P.atkMin, vol: P.pk });
}

// Aviso del pop-up: un tic corto y más bajo que el de la mano (secundario, AUDIO §3)
export function popAviso(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  tic(ctx, P.out, t, 0.08, { atkMin: P.atkMin, vol: P.pk * P.v });
}

// Arco completo (especial): Do6, Mi6, Sol6
export function arc(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const opt = { atkMin: P.atkMin, vol: P.pk };
  [84, 88, 91].forEach((n, i) => carton(ctx, P.out, t + i * 0.06, n, 0.05, 0.25, opt));
}

// ---------- Stingers (pentatónica de Do) ----------

export function stingerCheckpoint(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const opt = { atkMin: P.atkMin, vol: P.pk };
  [67, 72, 76, 79].forEach((n, i) => carton(ctx, P.out, t + i * 0.07, n, 0.1, 0.3, opt));
  const end = t + 4 * 0.07;
  campana(ctx, P.out, end, 84, 0.18, { ...opt, tail: 0.6, echo: o.echo, send: 0.3 });
  [60, 64, 67].forEach((n, i) => pulso(ctx, P.out, end + i * 0.014, n, 0.05, opt));
  if (!P.r) {
    // barrido de papel sincronizado con la bandera que se despliega
    const nz = noise(ctx, t, 0.3);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1;
    bp.frequency.setValueAtTime(1500, t);
    bp.frequency.exponentialRampToValueAtTime(3500, t + 0.28);
    const g = ctx.createGain();
    shape(g, t, 0.02, 0.08, t + 0.28);
    nz.connect(bp);
    bp.connect(g);
    g.connect(P.out);
  }
}

// Fallo amable: baja hacia la fundamental, sin tono menor ("ya casi")
export function stingerFail(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const opt = { atkMin: P.atkMin };
  [[79, 0.7], [76, 0.55], [72, 0.45]].forEach(([n, v], i) => carton(ctx, P.out, t + i * 0.15, n, 0.4 + i * 0.1, 0.3 * v, { ...opt, vol: P.pk * 1.45 }));
  tok(ctx, P.out, t + 0.3, 0.1, { atkMin: P.atkMin, vol: P.pk });
}

export function stingerRecord(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const opt = { atkMin: P.atkMin, vol: P.pk * 0.33 };
  [72, 76, 79, 81, 84, 88].forEach((n, i) => carton(ctx, P.out, t + i * 0.06, n, 0.08, 0.28, opt));
  const c = t + 6 * 0.06;
  [79, 84, 88].forEach((n) => {
    cuadrada(ctx, P.out, c, n, 0.9, 0.14, opt);
    carton(ctx, P.out, c, n, 0.9, 0.2, opt);
  });
  campana(ctx, P.out, c + 0.05, 88, 0.12, { ...opt, tail: 0.5, echo: o.echo, send: 0.3 });
  campana(ctx, P.out, c + 0.12, 91, 0.1, { ...opt, tail: 0.5, echo: o.echo, send: 0.3 });
  if (!P.r) {
    let when = t + 0.2;
    let gap = 0.09;
    for (let i = 0; i < 8; i++) {
      shaker(ctx, P.out, when, 0.027);
      when += gap;
      gap = Math.max(0.04, gap - 0.0065);
    }
  }
}

export function stingerFinal(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const opt = { atkMin: P.atkMin, vol: P.pk };
  [[76, 0], [79, 0.18], [84, 0.36], [79, 0.54], [88, 0.9]].forEach(([n, d]) => carton(ctx, P.out, t + d, n, 0.3, 0.3, opt));
  const end = t + 1.3;
  [60, 64, 67, 72].forEach((n, i) => pulso(ctx, P.out, end + i * 0.014, n, 0.05, opt));
  carton(ctx, P.out, end, 48, 1.0, 0.2, opt);
  [84, 88, 91].forEach((n, i) => campana(ctx, P.out, end + 0.1 + i * 0.12, n, 0.14, { ...opt, tail: 1.2, echo: o.echo, send: 0.3 }));
}

// Trampolín (placeholder para audio): golpe de cartón grave y un "oing" triangular que sube con vibrato. Cola 140 ms.
export function boing(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const a = Math.max(0.003, P.atkMin);
  gl(ctx, P.out, t, 'sine', 120 * P.d, 70 * P.d, 60, 0.3 * P.pk * P.v, a, 0.07);
  const g = gl(ctx, P.out, t + 0.01, 'triangle', 170 * P.d, 470 * P.d, 130, 0.3 * P.pk * P.v, a, 0.14);
  void g;
  if (!P.r) {
    const lfo = osc(ctx, 'sine', 28, t, t + 0.15);
    const d = ctx.createGain();
    d.gain.value = 0.08 * P.pk * P.v;
    lfo.connect(d);
    d.connect(g.gain);
  }
}

// Viento (placeholder para audio): ruido filtrado de 260 ms, el filtro sube a favor (800 -> 2000 Hz) y baja en contra
// (2000 -> 700 Hz), 6 dB bajo el boing.
export function soplido(ctx, dest, t, o = {}) {
  const P = prep(ctx, dest, o);
  const nz = noise(ctx, t, 0.27);
  const f = lp(ctx, o.favor ? 800 : 2000, 0.9);
  f.frequency.setValueAtTime(o.favor ? 800 : 2000, t);
  f.frequency.exponentialRampToValueAtTime(o.favor ? 2000 : 700, t + 0.24);
  const g = ctx.createGain();
  shape(g, t, Math.max(0.02, P.atkMin), 0.15 * P.pk * P.v, t + 0.26);
  nz.connect(f);
  f.connect(g);
  g.connect(P.out);
}

export const SFX = { jump, jumpHigh, land, pickup, amber, stumble, ui, pause, card, eso, handTic, arc, popAviso, boing, soplido };
export const STINGERS = { checkpoint: stingerCheckpoint, fail: stingerFail, record: stingerRecord, final: stingerFinal };
