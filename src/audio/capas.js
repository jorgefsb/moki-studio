// Capas del Cuaderno (AUDIO-CAPAS.md): la música crece con el nivel del Cuaderno, de 2 a 6, y el timbre de bici.
// Módulo diferido: audio.js lo pide con import() después del gesto, con nivel >= 2 o en el primer timbre. Sin nivel
// (clásico, demo) ni se descarga. Todo es (ctx, destino, t, ...) como voices.js, para renderizarlo offline y medirlo.
// Es un eje aparte de la energía (E1 a E3 por tramo y racha): no la toca, salvo bajar E3 y el bus cuando hay capas.
import { pulso, bajo, tok, campana, voiceTools, mtof } from './voices.js';

const { noise, osc, lp, shape } = voiceTools;
const M = 0.78; // la melodía de la base (0.3 x MID): las capas se miden contra ella
const pc = (n) => n % 12;
const arriba = (n, base) => base + ((pc(n) - pc(base) + 12) % 12); // la nota n en la primera octava desde base

// Notas del acorde para las capas: fundamental, quinta y tercera. De noche sin tercera (escala abierta).
function notas(ch, noche) {
  const r = ch[0];
  const t = ch[2].find((n) => pc(n) !== pc(r) && pc(n) !== pc(ch[1]));
  return noche ? [r, ch[1], r] : [r, ch[1], t];
}

function ruido(ctx, dest, t, dur, f, q, peak, atk) {
  const nz = noise(ctx, t, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = f;
  bp.Q.value = q;
  const g = ctx.createGain();
  shape(g, t, atk, peak, t + dur);
  nz.connect(bp);
  bp.connect(g);
  g.connect(dest);
  return { nz, bp };
}

// Colchón: triangular con ataque lento (120 ms) y cola larga
function colchon(ctx, dest, t, midi, dur, peak, atk = 0.12) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + atk);
  g.gain.setValueAtTime(peak, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.4);
  osc(ctx, 'triangle', mtof(midi), t, t + dur + 0.4).connect(g);
  g.connect(dest);
}

// Cada capa: (ctx, destino, paso, compás, acorde, t, noche)
const CAPA = {
  // 2 Percusión de papel: frote en 4 y 12, semicorcheas suaves en los impares, tok sordo en el 14
  2(ctx, d, s, bar, ch, t, noche) {
    if (s === 4 || s === 12) ruido(ctx, d, t, 0.13, 4500, 1.4, 0.4, 0.025);
    else if (!noche && s % 2) ruido(ctx, d, t, 0.035, 4500, 2, 0.16, 0.003);
    if (!noche && s === 14) tok(ctx, d, t, 0.3);
  },
  // 3 Contracanto: dos notas largas y sostenidas por compás (pasos 4 y 10), abajo de la melodía, en sus huecos
  3(ctx, d, s, bar, ch, t, noche) {
    if (s !== 4 && s !== 10) return;
    const n = notas(ch, noche);
    colchon(ctx, d, t, arriba(s === 4 ? n[2] : n[1], 64), 5 * 0.15625, 0.55 * M * 0.45, 0.03);
  },
  // 4 Colchón: fundamental y quinta, una vez por compás
  4(ctx, d, s, bar, ch, t) {
    if (s) return;
    colchon(ctx, d, t, arriba(ch[0], 53), 2.3, 0.4 * M * 0.3);
    colchon(ctx, d, t, arriba(ch[1], 60), 2.3, 0.4 * M * 0.22);
  },
  // 5 Bajo caminante (negras: fundamental, quinta, fundamental, tercera) y soplo que barre en 2 compases
  5(ctx, d, s, bar, ch, t, noche) {
    if (s % 4 === 0) {
      const n = notas(ch, noche);
      bajo(ctx, d, t, arriba([n[0], n[1], n[0], n[2]][s / 4], 36), 3 * 0.15625, 0.3 * M * 0.16);
    }
    if (s || bar % 2) return;
    const k = noche ? 0.7 : 1;
    const { nz, bp } = ruido(ctx, d, t, 5, 500 * k, 1.1, 0.12 * M, 1.2);
    nz.loop = true;
    bp.frequency.setValueAtTime(500 * k, t);
    bp.frequency.exponentialRampToValueAtTime(1600 * k, t + 2.5);
    bp.frequency.exponentialRampToValueAtTime(500 * k, t + 5);
  },
  // 6 Brillo: campanitas en 2, 9 y 13 (de noche una octava abajo y solo 2 y 9) y un pulso estrecho a contratiempo
  6(ctx, d, s, bar, ch, t, noche) {
    const n = ch[2][(s + bar) % 4];
    if (s === 2 || s === 9 || (!noche && s === 13)) campana(ctx, d, t, arriba(n, noche ? 79 : 91), 0.3 * M, { tail: 0.28 });
    if (!noche && (s === 7 || s === 15)) pulso(ctx, d, t, arriba(n, 79), 0.3 * M * 0.5);
  },
};

// Las capas: una ganancia por nivel hacia un filtro propio (día 8 kHz, noche 3.2 kHz) y de ahí a musicMix.
// o.fijo (render offline): nivel y noche quedan puestos desde el primer paso.
export function createCapas(ctx, bus, cfg, o = {}) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 8000;
  f.connect(bus.musicMix);
  const g = [];
  for (let k = 2; k <= 6; k++) {
    g[k] = ctx.createGain();
    g[k].gain.value = 0;
    g[k].connect(f);
  }
  const S = { nivel: 1, on: 1, noche: false, reduced: false, nt: () => 0 };
  const rampa = (p, v, t, sec) => {
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(v, t + sec);
  };
  // Al inicio de compás: capas nuevas por rampa, noche por el fondo, y la mezcla se hace lugar
  function compas(t) {
    const noche = S.nt() > 0.5;
    if (noche !== S.noche) {
      S.noche = noche;
      const hz = noche ? (S.reduced ? 4500 : 3200) : 8000;
      f.frequency.cancelScheduledValues(t);
      f.frequency.setValueAtTime(f.frequency.value, t);
      f.frequency.exponentialRampToValueAtTime(hz, t + (S.reduced ? 8 : 4));
    }
    if (S.on === S.nivel) return;
    S.on = S.nivel;
    for (let k = 2; k <= 6; k++) rampa(g[k].gain, S.nivel >= k ? 1 : 0, t, S.reduced ? 1.5 : 0.4);
    // el bus de música x0.9 por cada dos capas (0.9 en 4 y 5, 0.81 en 6); E3 a 0.7 desde el 4 lo pone music.js
    rampa(bus.musicBus.gain, cfg.musicBus * (S.nivel >= 6 ? 0.81 : S.nivel >= 4 ? 0.9 : 1), t, S.reduced ? 1.5 : 0.4);
  }
  if (o.fijo) {
    S.nivel = S.on = o.nivel;
    S.noche = !!o.noche;
    for (let k = 2; k <= 6; k++) g[k].gain.value = o.nivel >= k ? 1 : 0;
    f.frequency.value = o.noche ? 3200 : 8000;
    bus.musicBus.gain.value = cfg.musicBus * (o.nivel >= 6 ? 0.81 : o.nivel >= 4 ? 0.9 : 1);
  }
  return {
    state: S,
    e3: () => (S.nivel >= 4 ? 0.7 : 1),
    set(n) {
      S.nivel = Math.max(1, Math.min(6, n));
    },
    // el secuenciador llama aquí en cada paso (después de la base y la energía)
    step(s, bar, ch, t) {
      if (!o.fijo && s === 0) compas(t);
      for (let k = 2; k <= Math.max(S.nivel, S.on); k++) CAPA[k](ctx, g[k], s, bar, ch, t, S.noche);
    },
  };
}

// Timbre de bici de juguete (nivel 9): dos parciales inarmónicos (razón 2.76) con caída rápida, "ring-ring" a 0 y
// 55 ms, cola 140 ms, y un clic de ruido de 8 ms. Movimiento reducido: un golpe y lowpass 3.5 kHz.
export function timbre(ctx, dest, t, o = {}) {
  let out = dest;
  if (o.reduced) {
    out = lp(ctx, 3500, 0.5);
    out.connect(dest);
  }
  for (const d of o.reduced ? [0] : [0, 0.055]) {
    const a = t + d;
    const end = a + (d ? 0.085 : 0.06);
    for (const [hz, pk] of [[1568, 0.25], [4330, 0.075]]) {
      const g = ctx.createGain();
      shape(g, a, o.reduced ? 0.008 : 0.002, pk * (d ? 0.85 : 1), end);
      osc(ctx, 'sine', hz, a, end).connect(g);
      g.connect(out);
    }
  }
  ruido(ctx, out, t, 0.008, 3000, 0.8, 0.12, 0.001);
}
