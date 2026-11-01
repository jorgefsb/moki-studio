// Timbre por papel y stinger de pasar página (pieza 6 de la v2). Se carga bajo demanda desde audio.js
// (import dinámico en el primer cambio de papel después del gesto): no suma al JS inicial.
// Sin papel (clásico, demo) este módulo ni se descarga y la mezcla queda igual.
// Todo es (ctx, destino, tiempo, ...) como en voices.js, para poder renderizarlo offline y medirlo.
import { carton, campana, voiceTools, mtof } from './voices.js';

const { noise, osc, lp, shape } = voiceTools;

// Cada papel dobla la melodía con su color y mueve el eco. No toca tempo, notas ni capas del tema.
//   kraft      cálido: triangular una octava abajo, lowpass 1.3 kHz (cartón grueso)
//   cuaderno   lápiz: campanita corta una octava arriba solo en los tiempos fuertes
//   periodico  más seco: punteo corto al mismo tono, sin cola, y el eco baja a menos de la mitad
//   cartulina  más brillante: campanita una octava arriba en cada nota y un poco más de eco
export const PAPELES = {
  kraft: { wet: 1, fb: 1 },
  cuaderno: { wet: 1, fb: 1 },
  periodico: { wet: 0.35, fb: 0.5 },
  cartulina: { wet: 1.15, fb: 1 },
};

// La voz de color de cada papel. peak llega ya escalado por el secuenciador (melodía x MID x vel).
const COLOR = {
  kraft(ctx, dest, t, midi, dur, peak) {
    const end = t + dur + 0.1;
    const g = ctx.createGain();
    const f = lp(ctx, 1300, 0.5);
    shape(g, t, 0.006, peak * 0.55, end, 0.5, 0.08);
    osc(ctx, 'triangle', mtof(midi - 12), t, end).connect(g);
    g.connect(f);
    f.connect(dest);
  },
  cuaderno(ctx, dest, t, midi, dur, peak, strong) {
    if (!strong) return;
    campana(ctx, dest, t, midi + 12, peak * 0.2, { tail: 0.16 });
  },
  periodico(ctx, dest, t, midi, dur, peak) {
    const end = t + Math.min(dur, 0.06) + 0.05;
    const g = ctx.createGain();
    const f = lp(ctx, 1000, 0.6);
    shape(g, t, 0.003, peak * 0.6, end);
    osc(ctx, 'triangle', mtof(midi), t, end).connect(g);
    g.connect(f);
    f.connect(dest);
  },
  cartulina(ctx, dest, t, midi, dur, peak, strong) {
    campana(ctx, dest, t, midi + 12, peak * (strong ? 0.5 : 0.36), { tail: 0.3 });
  },
};

// Capa de papel: una ganancia por papel hacia musicMix; al pasar de página se cruzan en 0.4 s.
// echoWet/fb del bus se mueven al valor del papel (y vuelven al de config con set(null)).
export function createPapel(ctx, bus, cfg) {
  const gains = {};
  for (const k of Object.keys(PAPELES)) {
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(bus.musicMix);
    gains[k] = g;
  }
  const S = { name: null };
  const ramp = (param, v, time, sec) => {
    param.cancelScheduledValues(time);
    param.setValueAtTime(param.value, time);
    param.linearRampToValueAtTime(v, time + sec);
  };
  return {
    state: S,
    set(name, time = ctx.currentTime, sec = 0.4) {
      const p = name && PAPELES[name];
      S.name = p ? name : null;
      for (const [k, g] of Object.entries(gains)) ramp(g.gain, k === S.name ? 1 : 0, time, sec);
      ramp(bus.echoWet.gain, cfg.echoWet * (p ? p.wet : 1), time, sec);
      ramp(bus.fb.gain, cfg.echoFeedback * (p ? p.fb : 1), time, sec);
    },
    // El secuenciador llama aquí con cada nota de melodía; strong = tiempo fuerte del esqueleto
    note(t, midi, dur, peak, strong) {
      if (!S.name) return;
      COLOR[S.name](ctx, gains[S.name], t, midi, dur, peak, strong);
    },
  };
}

// Stinger de pasar página (< 600 ms, seco: no va al eco para que la cola no se alargue).
// Hoja que se levanta (ruido por bandpass de 900 a 3.2 kHz), hoja que se asienta (ruido grave corto)
// y dos notas Sol5-Do6 con el color del papel nuevo.
export function stingerPagina(ctx, dest, t, o = {}) {
  const r = !!o.reduced;
  let out = dest;
  if (r) {
    out = lp(ctx, 3500, 0.5);
    out.connect(dest);
  }
  const pk = r ? 0.8 : 1;
  const a = r ? 0.008 : 0.004;
  // levantar
  const nz = noise(ctx, t, 0.2);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(900, t);
  bp.frequency.exponentialRampToValueAtTime(3200, t + 0.17);
  const g = ctx.createGain();
  shape(g, t, 0.03, 0.1 * pk, t + 0.18);
  nz.connect(bp);
  bp.connect(g);
  g.connect(out);
  // asentar
  const t2 = t + 0.17;
  const nz2 = noise(ctx, t2, 0.08);
  const f2 = lp(ctx, 900, 0.7);
  const g2 = ctx.createGain();
  shape(g2, t2, 0.004, 0.16 * pk, t2 + 0.06);
  nz2.connect(f2);
  f2.connect(g2);
  g2.connect(out);
  // dos notas con el color del papel nuevo
  const n0 = t + 0.2;
  const opt = { atkMin: a, vol: pk };
  [79, 84].forEach((n, i) => {
    const tn = n0 + i * 0.08;
    carton(ctx, out, tn, n, 0.07, 0.26, opt);
    if (o.papel && COLOR[o.papel]) COLOR[o.papel](ctx, out, tn, n, 0.07, 0.26 * pk, true);
  });
}
