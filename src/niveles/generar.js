// Generador de niveles por bloques (NIVELES.md §4-§7). Cada tramo de 30 s se arma con bloques escritos a mano,
// sorteados con su propia semilla; el validador lo corre con la física real y, si no pasa, se re-sortea (8 veces)
// y al final se usa el guion clásico. Todo determinista: misma semilla, mismo nivel.
import { CONFIG as C } from '../config.js';
import { buildLevel, SCRIPTS } from '../tramos.js';
import { BLOQUES, T1_INTRO, RELLENO, SORPRESAS } from './bloques.js';
import { rng, hashSeed, todayKey } from './rng.js';
import { validateLevel } from './validar.js';

const LEN = 30;
const BY_ID = Object.fromEntries(BLOQUES.map((b) => [b.id, b]));
const SORPRESA_EN = { 1: [19, 24], 2: [10, 22], 3: [12, 22], 4: [6, 18] }; // segundo de inicio de la sorpresa (§4)
const VENTANA = { 1: [1, 2], 2: [1, 3], 3: [2, 4], 4: [2, 4] };
const PESO_DIF = { 1: { 1: 3, 2: 1 }, 2: { 1: 1, 2: 3, 3: 1 }, 3: { 2: 2, 3: 3, 4: 1 }, 4: { 2: 1, 3: 3, 4: 2 } };
export const BIOMAS = ['kraft', 'cuaderno', 'periodico', 'cartulina'];
const INTENTOS = 8;

const hasP5 = (code) => code.includes('P5');
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
    count = hasP5(code) ? 0 : count + 1;
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
      return runP5(ctx.p5, b) !== Infinity; // G3
    });
    if (!cands.length && rem < 4.5) {
      put(ctx, RELLENO(rem));
      return;
    }
    const b = cands.length
      ? pick(r, cands.map((q) => [q, (isDescanso(q) ? 1 : PESO_DIF[tramo][q.dif] || 1) * (tramo === 3 && q.tags.includes('viga') ? 2 : 1) * (ctx.used[q.id] ? 0.5 : 1)]))
      : BY_ID.respiro;
    put(ctx, b);
  }
}

function put(ctx, b) {
  for (const [t, code] of b.ev) ctx.script.push([+(ctx.pos + t).toFixed(3), code]);
  ctx.pos += b.dur;
  ctx.p5 = runP5(ctx.p5, b) === Infinity ? 0 : runP5(ctx.p5, b);
  ctx.used[b.id] = (ctx.used[b.id] || 0) + 1;
  ctx.prev = b;
}

// Un tramo (1-4) como guion [[s, código]] de 30 s.
export function generarTramo(seed, tramo, intento = 0) {
  const r = rng(hashSeed(`${seed}:${tramo}:${intento}`));
  const ctx = { pos: 2, script: [], p5: 0, used: {}, prev: null };
  if (tramo === 1) {
    ctx.script.push(...T1_INTRO); // el tutorial depende de este inicio
    ctx.pos = 12;
  } else if (tramo === 3) {
    put(ctx, BY_ID['viga-intro']); // la viga se enseña siempre igual
  }
  const sorpresa = BY_ID[pick(r, SORPRESAS[tramo])];
  const [a, b] = SORPRESA_EN[tramo];
  const S = a + Math.floor(r() * ((b - a) * 2 + 1)) / 2;
  fill(r, S, ctx, tramo);
  put(ctx, sorpresa);
  fill(r, LEN, ctx, tramo);
  return ctx.script;
}

// V4 legibilidad: entre obstáculos distintos >= minGapSec (mismo punto en VC; la segunda caja de CC no cuenta).
function legible(level) {
  const obs = level.entities.filter((e) => e.kind === 'obs' && e.plan !== 'skip');
  const v = level.tramos[0].speed;
  for (let i = 1; i < obs.length; i++) {
    const gap = (obs[i].D - obs[i - 1].D) / v;
    if (gap > 1e-6 && gap < C.minGapSec - 1e-6) return false;
  }
  return true;
}

export function tramoValido(script, speed) {
  const level = buildLevel([{ speed, len: LEN, script }]);
  return legible(level) && validateLevel(level).ok;
}

// seed: texto ("2026-10-29") o número. Devuelve el nivel de buildLevel más { seed, modo, biomas, fallbacks }.
export function generarNivel(seed, modo = 'reto') {
  const fallbacks = [];
  const tramos = C.tramos.map((tr, i) => {
    for (let k = 0; k < INTENTOS; k++) {
      const script = generarTramo(seed, i + 1, k);
      if (tramoValido(script, tr.speed)) return { speed: tr.speed, len: LEN, script };
    }
    fallbacks.push(i + 1);
    return { speed: tr.speed, len: LEN, script: SCRIPTS[i] };
  });
  const r = rng(hashSeed(`${seed}:bioma`));
  const biomas = [...BIOMAS];
  for (let i = biomas.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [biomas[i], biomas[j]] = [biomas[j], biomas[i]];
  }
  return { ...buildLevel(tramos), seed: String(seed), modo, biomas, fallbacks };
}

export const semillaReto = () => todayKey();
export function semillaLibre() {
  try {
    return String(crypto.getRandomValues(new Uint32Array(1))[0]);
  } catch (e) {
    return String(Date.now() >>> 0);
  }
}
