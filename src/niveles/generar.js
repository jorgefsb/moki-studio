// Generador de niveles por bloques (NIVELES.md §4-§7). Cada tramo de 30 s se arma con bloques escritos a mano,
// sorteados con su propia semilla; el validador lo corre con la física real y, si no pasa, se re-sortea (8 veces)
// y al final se usa el guion clásico. Todo determinista: misma semilla, mismo nivel.
import { CONFIG as C } from '../config.js';
import { buildLevel, SCRIPTS } from '../tramos.js';
import { BLOQUES, T1_INTRO, SORPRESAS } from './bloques.js';

// Respiro sin nada (antes una fila de 5 piezas): con fila, las páginas pasaban de 35% de filas de piezas (tope 20%)
const RELLENO = (dur) => ({ id: 'relleno', dur, ev: [], dif: 1, tags: ['descanso'] });
import { rng, hashSeed, todayKey } from './rng.js';
import { validateLevel, popupFalla } from './validar.js';

const LEN = 30;
const BY_ID = Object.fromEntries(BLOQUES.map((b) => [b.id, b]));
const SORPRESA_EN = { 1: [19, 24], 2: [10, 22], 3: [12, 22], 4: [6, 18] }; // segundo de inicio de la sorpresa (§4)
const VENTANA = { 1: [1, 2], 2: [1, 3], 3: [2, 4], 4: [2, 4] };
const PESO_DIF = { 1: { 1: 3, 2: 1 }, 2: { 1: 1, 2: 3, 3: 1 }, 3: { 2: 2, 3: 3, 4: 1 }, 4: { 2: 1, 3: 3, 4: 2 } };
export const BIOMAS = ['kraft', 'cuaderno', 'periodico', 'cartulina'];
const INTENTOS = 8;

const hasP5 = (code) => code.includes('P5');
const hasPiezas = (code) => code.includes('P5') || code.includes('+'); // G3: fila o arco de piezas cortan la racha
const TOPE_FILAS = 0.2; // director: máximo 20% de filas de piezas por página
const MAX_FILAS = 2; // presupuesto al sortear: con ~10-12 patrones por página, 2 filas quedan en el tope
const filasDe = (b) => b.ev.filter(([, c]) => hasP5(c)).length;
const HOLD_HOLD_SEC = 1.0;
const JITTER_MS = [-40, 40];
const MIN_CLEAR_PX = 4;
const isDescanso = (b) => b.tags.includes('descanso');

function pick(r, items) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [it, w] of items) if ((x -= w) < 0) return it;
  return items[items.length - 1][0];
}

// Contador G3 tras pasar por un bloque; Infinity si en algún momento pasa de 4 patrones seguidos sin P5.
function runP5(count, b) {
  for (const [, code] of b.ev) {
    count = hasPiezas(code) ? 0 : count + 1;
    if (count > 4) return Infinity;
  }
  return count;
}

// Llena [ctx.pos, hasta) con bloques que cumplen G1-G6 y cierra con RELLENO (§4 fill, relleno acortado a 3 s).
function fill(r, hasta, ctx, tramo) {
  const [lo, hi] = VENTANA[tramo];
  for (;;) {
    const rem = hasta - ctx.pos;
    // RELLENO cierra solo huecos cortos (1.5-3 s): con 4.5 los tramos quedaban con el doble de filas que el clásico
    if (rem <= 3 + 1e-9) {
      put(ctx, RELLENO(rem));
      return;
    }
    const cands = BLOQUES.filter((b) => {
      if (b.tags.includes('sorpresa')) return false; // G5
      if (tramo < b.min || tramo > b.max) return false; // G1
      if (b.dur > rem - 1.5 + 1e-9) return false;
      if (!isDescanso(b) && (b.dif < lo || b.dif > hi)) return false; // G6
      if (ctx.prev && ctx.prev.dif >= 3 && b.dif >= 3) return false; // G2
      if (ctx.prev && ctx.prev.dif >= 4 && !isDescanso(b)) return false;
      if (ctx.prev && ctx.prev.id === b.id) return false; // G4
      if (b.id !== 'respiro' && (ctx.used[b.id] || 0) >= 2) return false;
      if (ctx.filas + ctx.reserva + filasDe(b) > ctx.maxFilas) return false; // tope de filas de piezas por página
      return runP5(ctx.p5, b) !== Infinity; // G3
    });
    // sin candidatos: un respiro vacío (corta la racha de G3 sin gastar filas de piezas)
    if (!cands.length) {
      put(ctx, RELLENO(rem < 4.5 ? rem : Math.min(3, rem - 1.5)));
      if (rem < 4.5) return;
      continue;
    }
    put(ctx, pick(r, cands.map((q) => [q, (isDescanso(q) ? 1 : PESO_DIF[tramo][q.dif] || 1) * (tramo === 3 && q.tags.includes('viga') ? 2 : 1) * (ctx.used[q.id] ? 0.5 : 1)])));
  }
}

function put(ctx, b) {
  for (const [t, code] of b.ev) ctx.script.push([+(ctx.pos + t).toFixed(3), code]);
  ctx.pos += b.dur;
  ctx.p5 = b.id === 'relleno' || runP5(ctx.p5, b) === Infinity ? 0 : runP5(ctx.p5, b);
  ctx.filas += filasDe(b);
  ctx.used[b.id] = (ctx.used[b.id] || 0) + 1;
  ctx.prev = b;
  ctx.ids.push(b.id);
}

// Curva de flow, paso 4 (NIVELES.md "Flow y mecánicas", director 1-nov): calma y respiro no son aire vacío, son
// decisiones fáciles. Donde quedan más de HUECO_MAX s sin decidir nada (filas P5 sueltas, relleno, colas de bloque),
// entra una decisión fácil de tocar o de no saltar (nunca mantener: mantener->mantener pide 1 s). Primero un patrón
// que la página todavía no tiene (sube F1). No toca la intro del tutorial (T1 0-12 s) ni pone nada después del 28.
// El validador de siempre (física real, ±40 ms) decide si la página queda; si no, se re-sortea.
const HUECO_MAX = 2.5;
const FIN = { 'C.C': C.pairGapSec, 'T.C': C.pairGapSec, 'C.V': C.pairGapSec, 'T.V': 1.0, OLA: 5 * C.waveGapSec };
const FACILES = { 1: ['C+A3', 'C'], 2: ['U', 'C+A3', 'C.C', 'C'], 3: ['V', 'U', 'C.V', 'C+A3', 'VC', 'C.C', 'C'], 4: ['V', 'U', 'C.V', 'VC', 'C+A3', 'C.C', 'C'] };
const principal = (code) => code.split('+')[0];
function densificar(script, tramo, r) {
  const ev = [...script].sort((a, b) => a[0] - b[0]);
  const filas = ev.filter(([, c]) => principal(c) === 'P5').map(([t]) => t);
  const dec = ev.filter(([, c]) => principal(c) !== 'P5');
  const vistos = new Set(dec.map(([, c]) => principal(c)));
  const desde = tramo === 1 ? 12 : 0;
  const nuevos = [];
  const pon = (t) => {
    const libres = FACILES[tramo].filter((c) => !vistos.has(principal(c)));
    const code = libres.length ? libres[0] : FACILES[tramo][Math.floor(r() * FACILES[tramo].length)];
    vistos.add(principal(code));
    nuevos.push([+t.toFixed(2), code]);
  };
  // Huecos entre decisiones seguidas, más los dos de la orilla de la página: el hueco que cruza el checkpoint es
  // (30 - última) + (primera de la siguiente - 2), así que la página arranca a más tardar en 2.5 s (ancla en 0) y
  // termina no antes de 27.5 (ancla en 30). Nada antes del segundo 2 ni después del 28.
  const puntos = dec.map(([t, c]) => ({ t, fin: t + (FIN[principal(c)] || 0) }));
  for (let i = 0; i <= puntos.length; i++) {
    const a = i ? puntos[i - 1].fin : tramo === 1 ? null : 0; // T1 empieza con la intro del tutorial
    const b = i < puntos.length ? puntos[i].t : LEN;
    if (a === null || a < desde || b - a <= HUECO_MAX) continue;
    const k = Math.ceil((b - a) / HUECO_MAX) - 1;
    for (let j = 1; j <= k; j++) {
      let t = a + ((b - a) * j) / (k + 1);
      // lejos de una fila de piezas en el suelo (la caja la taparía)
      const fila = filas.find((f) => Math.abs(f - t) < 0.5);
      if (fila !== undefined) t = fila + (t >= fila ? 0.5 : -0.5);
      t = Math.min(28, Math.max(2, t));
      if ((i && t - a < C.minGapSec) || (i < puntos.length && b - t < C.minGapSec)) continue;
      pon(t);
    }
  }
  return [...ev, ...nuevos].sort((x, y) => x[0] - y[0]);
}

// Un tramo (1-4) como guion [[s, código]] de 30 s.
export function generarTramo(seed, tramo, intento = 0) {
  const r = rng(hashSeed(`${seed}:${tramo}:${intento}`));
  const ctx = { pos: 2, script: [], p5: 0, used: {}, prev: null, ids: [], filas: 0, reserva: 0, maxFilas: MAX_FILAS };
  if (tramo === 1) {
    ctx.script.push(...T1_INTRO); // el tutorial depende de este inicio
    ctx.filas = T1_INTRO.filter(([, c]) => hasP5(c)).length;
    ctx.pos = 12;
  } else if (tramo === 3) {
    put(ctx, BY_ID['viga-intro']); // la viga se enseña siempre igual
  }
  const sorpresa = BY_ID[pick(r, SORPRESAS[tramo])];
  ctx.reserva = filasDe(sorpresa); // la sorpresa aparta sus filas antes del sorteo
  if (sorpresa.id === 'ola') ctx.maxFilas = 1; // la ola es un solo patrón de 6.5 s: la página queda con ~8 patrones
  const [a, b] = SORPRESA_EN[tramo];
  const S = a + Math.floor(r() * ((b - a) * 2 + 1)) / 2;
  fill(r, S, ctx, tramo);
  ctx.reserva = 0;
  put(ctx, sorpresa);
  fill(r, LEN, ctx, tramo);
  return Object.assign(densificar(ctx.script, tramo, r), { ids: ctx.ids });
}

// V4 legibilidad: entre obstáculos distintos >= minGapSec (mismo punto en VC; la segunda caja de CC no cuenta).
export function legible(level) {
  const obs = level.entities.filter((e) => e.kind === 'obs' && e.plan !== 'skip');
  const v = level.tramos[0].speed;
  for (let i = 1; i < obs.length; i++) {
    const gap = (obs[i].D - obs[i - 1].D) / v;
    if (gap > 1e-6 && gap < C.minGapSec - 1e-6) return false;
  }
  return true;
}

// % de filas de piezas (P5) entre los patrones de la página
export const filasPiezas = (script) => script.filter(([, c]) => hasP5(c)).length / Math.max(1, script.length);

// mantener -> mantener >= 1.0 s entre llegadas (el dedo necesita soltar y volver a mantener)
export function holdHold(level) {
  const v = level.tramos[0].speed;
  const holds = level.entities.filter((e) => e.kind === 'obs' && e.plan === 'hold');
  for (let i = 1; i < holds.length; i++) if ((holds[i].D - holds[i - 1].D) / v < HOLD_HOLD_SEC - 1e-6) return false;
  return true;
}

// Página justa: legible, mantener->mantener >= 1 s, filas <= 20% y el bot la libra con holgura >= 4 px despegando a tiempo y ±40 ms
export function tramoValido(script, speed) {
  const level = buildLevel([{ speed, len: LEN, script }]);
  if (!legible(level) || !holdHold(level) || popupFalla(level) || filasPiezas(script) > TOPE_FILAS + 1e-9) return false;
  return [0, ...JITTER_MS].every((j) => {
    const r = validateLevel(level, null, j);
    return r.ok && r.minClear >= MIN_CLEAR_PX;
  });
}

// seed: texto ("2026-10-29") o número. Devuelve el nivel de buildLevel más { seed, modo, biomas, fallbacks }.
export function generarNivel(seed, modo = 'reto') {
  const fallbacks = [];
  const tramos = C.tramos.map((tr, i) => {
    for (let k = 0; k < INTENTOS; k++) {
      const script = generarTramo(seed, i + 1, k);
      if (tramoValido(script, tr.speed)) return { speed: tr.speed, len: LEN, script, ids: script.ids };
    }
    fallbacks.push(i + 1);
    return { speed: tr.speed, len: LEN, script: SCRIPTS[i], ids: ['clasico'] };
  });
  const r = rng(hashSeed(`${seed}:bioma`));
  const biomas = [...BIOMAS];
  for (let i = biomas.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [biomas[i], biomas[j]] = [biomas[j], biomas[i]];
  }
  return { ...buildLevel(tramos), seed: String(seed), modo, biomas, fallbacks, bloques: tramos.map((t) => t.ids) };
}

export const semillaReto = () => todayKey();
export function semillaLibre() {
  try {
    return String(crypto.getRandomValues(new Uint32Array(1))[0]);
  } catch (e) {
    return String(Date.now() >>> 0);
  }
}
