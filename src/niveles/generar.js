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
const VENTANA = { 1: [1, 2], 2: [1, 3], 3: [2, 4], 4: [2, 4] };
const PESO_DIF = { 1: { 1: 3, 2: 1 }, 2: { 1: 1, 2: 3, 3: 1 }, 3: { 2: 2, 3: 3, 4: 1 }, 4: { 2: 1, 3: 3, 4: 2 } };
export const BIOMAS = ['kraft', 'cuaderno', 'periodico', 'cartulina'];
const INTENTOS = 16; // con la curva de flow (fases cortas) 8 no alcanzaban en 4 de 1860 páginas de T3

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

// Tema de un bloque = su primer tag que no sea 'premio' (NIVELES.md flow, regla de no repetir a)
const tema = (b) => b.tags.find((t) => t !== 'premio');
// F1: pesa doble el bloque que trae un patrón que no salió ni en esta página ni en la anterior
const nuevo = (ctx, b) => b.ev.some(([, c]) => !c.startsWith('P5') && !ctx.vistos.has(c.split('+')[0]));

// Llena [ctx.pos, hasta) con bloques que cumplen G1-G6 y cierra con RELLENO (§4 fill, relleno acortado a 3 s).
// ventana = [lo, hi] de dificultad de la fase (curva de flow); por omisión la del tramo.
function fill(r, hasta, ctx, tramo, ventana = VENTANA[tramo]) {
  const [lo, hi] = ventana;
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
      if (b.dur > rem - 0.75 + 1e-9) return false; // 0.75 = minGapSec: con fases cortas, los bloques dif 4 de 5.5-6.5 s ya no cabían con 1.5
      if (!isDescanso(b) && (b.dif < lo || b.dif > hi)) return false; // G6
      if (ctx.prev && ctx.prev.dif >= 3 && b.dif >= 3) return false; // G2
      if (ctx.prev && ctx.prev.dif >= 4 && !isDescanso(b)) return false;
      if (ctx.prev && ctx.prev.id === b.id) return false; // G4
      if (ctx.prevTema && ctx.prevTema === tema(b)) return false; // flow (a): no dos temas iguales seguidos (el relleno no cuenta)
      if (ctx.fase === 'suave' && esDuro(b)) return false; // calma y respiro sin torre ni viga
      if (b.dif >= 4 && ctx.dif4) return false; // flow: un solo dif 4 por página
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
    put(ctx, pick(r, cands.map((q) => [q, (isDescanso(q) ? 1 : PESO_DIF[tramo][q.dif] || 1) * (tramo === 3 && q.tags.includes('viga') ? 2 : 1) * (ctx.used[q.id] ? 0.5 : 1) * (nuevo(ctx, q) ? 2 : 1) * (ctx.fase === 'pico' && esDuro(q) ? 3 : 1)])));
  }
}

function put(ctx, b) {
  for (const [t, code] of b.ev) ctx.script.push([+(ctx.pos + t).toFixed(3), code]);
  ctx.pos += b.dur;
  ctx.p5 = b.id === 'relleno' || runP5(ctx.p5, b) === Infinity ? 0 : runP5(ctx.p5, b);
  ctx.filas += filasDe(b);
  ctx.used[b.id] = (ctx.used[b.id] || 0) + 1;
  b.ev.forEach(([, c]) => ctx.vistos.add(c.split('+')[0]));
  if (b.dif >= 4) ctx.dif4 = true;
  if (b.id !== 'relleno') ctx.prevTema = tema(b);
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
// Decisiones fáciles por fase (RETO EN 4 FASES): calma, subida y respiro solo toque o pop-up; el pico pasa por debajo
// (viga) o mantiene (torre, caja doble). Antes las vigas caían en calma y respiro: el pico salía más suave que ellas.
const FACILES = { 1: ['C+A3', 'C'], 2: ['U', 'C+A3', 'C.C', 'C'], 3: ['U', 'C+A3', 'C.C', 'C'], 4: ['U', 'C+A3', 'C.C', 'C'] };
const DE_PICO = { 1: FACILES[1], 2: ['CC', 'T', 'U', 'C.C'], 3: ['V', 'VC', 'C.V', 'T', 'CC'], 4: ['V', 'VC', 'C.V', 'T', 'CC'] };
const DUROS = new Set(['T', 'V', 'VC', 'CC', 'T.C', 'T.V', 'C.V']);
const esDuro = (b) => b.ev.some(([, c]) => DUROS.has(c.split('+')[0]));
const principal = (code) => code.split('+')[0];
function densificar(script, tramo, r, antes0 = new Set(), global = new Set()) {
  const ev = [...script].sort((a, b) => a[0] - b[0]);
  const filas = ev.filter(([, c]) => principal(c) === 'P5').map(([t]) => t);
  const dec = ev.filter(([, c]) => principal(c) !== 'P5');
  const vistos = new Set(dec.map(([, c]) => principal(c)));
  const desde = tramo === 1 ? 12 : 0;
  const nuevos = [];
  // nunca el mismo patrón que la decisión de antes o la de después (C C C C se leía como tramo repetido, F3b)
  // el pop-up pide C.popup.minGapBeforeSec tras el obstáculo anterior (popupFalla); si no cabe, otra decisión fácil
  const pon = (t, antes, despues, previo) => {
    const F = (t >= 14 && t < 24 ? DE_PICO : FACILES)[tramo].filter((c) => principal(c) !== 'U' || t - previo >= C.popup.minGapBeforeSec);
    const ok = [F.filter((c) => principal(c) !== antes && principal(c) !== despues), F.filter((c) => principal(c) !== antes), F].find((x) => x.length);
    // Rota (al azar dentro de cada escalón, para no repetir el mismo toque cada página: F3) y gasta poca novedad
    // (F6 pide un patrón nuevo cada <= 30 s en toda la partida; las novedades se dejan a los bloques):
    // 1) ya salió en la partida pero no en esta página ni en la anterior (F1), 2) no salió en esta página,
    // 3) cualquiera menos la caja sola, 4) cualquiera.
    const p = (c) => principal(c);
    const escalones = [
      ok.filter((c) => global.has(p(c)) && !vistos.has(p(c)) && !antes0.has(p(c))),
      ok.filter((c) => global.has(p(c)) && !vistos.has(p(c))),
      ok.filter((c) => !vistos.has(p(c))),
      ok.filter((c) => p(c) !== 'C'),
      ok,
    ];
    const libres = escalones.find((x) => x.length);
    const code = libres[Math.floor(r() * libres.length)];
    vistos.add(principal(code));
    nuevos.push([+t.toFixed(2), code]);
    return principal(code);
  };
  // Huecos entre decisiones seguidas, más los dos de la orilla de la página: el hueco que cruza el checkpoint es
  // (30 - última) + (primera de la siguiente - 2), así que la página arranca a más tardar en 2.5 s (ancla en 0) y
  // termina no antes de 27.5 (ancla en 30). Nada antes del segundo 2 ni después del 28.
  const puntos = dec.map(([t, c]) => ({ t, fin: t + (FIN[principal(c)] || 0) }));
  for (let i = 0; i <= puntos.length; i++) {
    let a = i ? puntos[i - 1].fin : tramo === 1 ? null : 0; // T1 empieza con la intro del tutorial
    const b = i < puntos.length ? puntos[i].t : LEN;
    if (a === null || b <= desde) continue;
    let antes = i ? principal(dec[i - 1][1]) : null;
    const despues = i < puntos.length ? principal(dec[i][1]) : null;
    if (a < desde) {
      // en T1 se tapa desde el 12 (antes va la intro)
      if (b - a > HUECO_MAX && b - desde >= C.minGapSec) antes = pon(desde, antes, despues, a);
      a = desde;
    }
    if (b - a <= HUECO_MAX) continue;
    let previo = i ? a : -Infinity; // último obstáculo antes del que se mete (FIN ya cuenta la segunda caja de un par)
    const k = Math.ceil((b - a) / HUECO_MAX) - 1;
    for (let j = 1; j <= k; j++) {
      let t = a + ((b - a) * j) / (k + 1);
      // lejos de una fila de piezas en el suelo (la caja la taparía)
      const fila = filas.find((f) => Math.abs(f - t) < 0.5);
      if (fila !== undefined) t = fila + (t >= fila ? 0.5 : -0.5);
      t = Math.min(28, Math.max(2, t));
      if (despues === 'U' && b - t < C.popup.minGapBeforeSec) t = b - C.popup.minGapBeforeSec; // el pop-up de después también pide su aire
      if (t - previo < C.minGapSec || (i < puntos.length && b - t < C.minGapSec)) continue;
      antes = pon(t, antes, j === k ? despues : null, previo);
      previo = t;
    }
  }
  return [...ev, ...nuevos].sort((x, y) => x[0] - y[0]);
}

// Un tramo (1-4) como guion [[s, código]] de 30 s.
export function generarTramo(seed, tramo, intento = 0, patronesPrev = new Set(), global = new Set()) {
  const r = rng(hashSeed(`${seed}:${tramo}:${intento}`));
  const ctx = { pos: 2, script: [], p5: 0, used: {}, prev: null, ids: [], filas: 0, reserva: 0, maxFilas: MAX_FILAS, vistos: new Set(patronesPrev) };
  if (tramo === 1) {
    ctx.script.push(...T1_INTRO); // el tutorial depende de este inicio
    ctx.filas = T1_INTRO.filter(([, c]) => hasP5(c)).length;
    ctx.pos = 12;
  }
  const sorpresa = BY_ID[pick(r, SORPRESAS[tramo])];
  ctx.reserva = filasDe(sorpresa); // la sorpresa aparta sus filas antes del sorteo
  if (sorpresa.id === 'ola') ctx.maxFilas = 1; // la ola es un solo patrón de 6.5 s: la página queda con ~8 patrones
  // Curva de flow por página (NIVELES.md "Flow y mecánicas", §3): calma 0-4 (dif 1), subida 4-14 (lo a lo+1),
  // pico 14-24 (hi-1 a hi, con la sorpresa entre 14 y 20 y un solo dif 4), respiro 24-30 (dif 1). T1 conserva su
  // intro (0-12) y T3 empieza la subida con viga-intro. Calma y respiro llevan decisiones fáciles (densificar).
  const [lo, hi] = VENTANA[tramo];
  // una fase de menos de 3.5 s se junta con la siguiente (con 2 s solo cabía relleno: hueco sin decidir)
  const fase = (hasta, v, ultima) => ctx.pos < hasta - 1e-9 && (ultima || hasta - ctx.pos >= 3.5) && fill(r, hasta, ctx, tramo, v);
  // pico de hi-2 a hi: con hi-1 la regla G2 (nunca dos >= 3 seguidos) lo partía en 3, relleno, 3 y el relleno se
  // llenaba de toques; ahora alterna 3 y 2, y los bloques con torre o viga pesan triple
  const pico = [Math.max(lo, hi - 2), hi];
  ctx.fase = 'suave';
  fase(4, [1, 1], true); // la calma (2-4 s) es relleno que densificar llena con decisiones fáciles
  ctx.fase = 'subida';
  if (tramo === 3) put(ctx, BY_ID['viga-intro']); // la viga se enseña siempre igual, ahora al empezar la subida
  fase(14, [lo, Math.min(hi, lo + 1)]);
  const S = Math.max(ctx.pos, 14 + Math.floor(r() * 13) / 2);
  ctx.fase = 'pico';
  fase(S, pico);
  ctx.reserva = 0;
  put(ctx, sorpresa);
  fase(24, pico);
  // respiro: sin bloques sorteados (los pocos bloques suaves pasaban del 8 % de uso); queda relleno y densificar lo
  // llena con decisiones fáciles que rotan
  ctx.fase = 'suave';
  if (ctx.pos < LEN - 1e-9) put(ctx, RELLENO(LEN - ctx.pos));
  return Object.assign(densificar(ctx.script, tramo, r, patronesPrev, global), { ids: ctx.ids });
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

// Flow F3b: una secuencia de 2 fichas o más (patrón@hueco a 0.25 s) repetida pegada a sí misma se lee como tramo
// repetido. Mismo cálculo que scripts/flow-medir.mjs, dentro de la página.
export function repetidoPegado(script) {
  const ev = script.filter(([, c]) => principal(c) !== 'P5').sort((a, b) => a[0] - b[0]);
  const f = ev.map(([t, c], i) => `${principal(c)}@${i ? (Math.round((t - ev[i - 1][0]) * 4) / 4).toFixed(2) : '0'}`);
  for (let L = 2; L <= f.length / 2; L++)
    for (let i = 1; i + 2 * L <= f.length; i++) {
      let igual = true;
      for (let k = 0; k < L && igual; k++) igual = f[i + k] === f[i + L + k];
      if (igual) return true;
    }
  return false;
}

// Página justa: legible, mantener->mantener >= 1 s, filas <= 20%, sin tramo repetido pegado, y el bot la libra con
// holgura >= 4 px despegando a tiempo y ±40 ms
export function tramoValido(script, speed) {
  const level = buildLevel([{ speed, len: LEN, script }]);
  if (!legible(level) || !holdHold(level) || popupFalla(level) || filasPiezas(script) > TOPE_FILAS + 1e-9) return false;
  if (repetidoPegado(script)) return false;
  return [0, ...JITTER_MS].every((j) => {
    const r = validateLevel(level, null, j);
    return r.ok && r.minClear >= MIN_CLEAR_PX;
  });
}

// F6 por página: hueco más largo sin patrón nuevo desde ultimoNuevo (s de la partida), con los estrenos de esta
// página (inicio en s0), hasta `hasta` (fin de partida, o el segundo 14 de la página siguiente: ahí ya puede estrenar).
const NOVEDAD_MAX = 28;
// F3 entre páginas: ¿la página trae una secuencia de 2-4 fichas patrón@hueco (0.25 s) de más de F3_MAX s que ya salió
// antes en la partida? Mismo cálculo que scripts/flow-medir.mjs; 'antes' son los eventos [s de partida, patrón].
const F3_MAX = 4;
function repiteTramo(antes, script, s0) {
  const ev = [...antes, ...script.filter(([, c]) => principal(c) !== 'P5').map(([s, c]) => [s0 + s, principal(c)]).sort((a, b) => a[0] - b[0])];
  const f = ev.map(([t, p], i) => `${p}@${i ? (Math.round((t - ev[i - 1][0]) * 4) / 4).toFixed(2) : '0'}`);
  const k0 = antes.length;
  for (let len = 2; len <= 4; len++) {
    const vistas = new Set();
    for (let i = 0; i + len <= k0; i++) vistas.add(f.slice(i, i + len).join(' '));
    for (let i = Math.max(1, k0 - len + 1); i + len <= ev.length; i++) {
      if (ev[i + len - 1][0] - ev[i][0] <= F3_MAX) continue;
      if (vistas.has(f.slice(i, i + len).join(' '))) return true;
    }
  }
  return false;
}

function huecoNovedad(script, s0, ultimoNuevo, global, hasta) {
  const vistos = new Set(global);
  let u = ultimoNuevo;
  let h = 0;
  for (const [s, c] of [...script].sort((a, b) => a[0] - b[0])) {
    const p = principal(c);
    if (p === 'P5' || vistos.has(p)) continue;
    vistos.add(p);
    h = Math.max(h, s0 + s - u);
    u = s0 + s;
  }
  return Math.max(h, hasta - u);
}

// seed: texto ("2026-10-29") o número. Devuelve el nivel de buildLevel más { seed, modo, biomas, fallbacks }.
export function generarNivel(seed, modo = 'reto') {
  const fallbacks = [];
  let prev = new Set();
  const global = new Set();
  let ultimoNuevo = 0; // segundo de la partida del último patrón que no había salido (F6)
  const eventos = []; // [s de partida, patrón] de las páginas ya puestas (F3 entre páginas)
  const n = C.tramos.length;
  const tramos = C.tramos.map((tr, i) => {
    // De los intentos válidos gana el primero que mantiene F6 (<= NOVEDAD_MAX s sin patrón nuevo, contando hasta
    // donde la página siguiente puede estrenar uno); si ninguno, el de hueco más corto.
    let t = null;
    let mejor = Infinity;
    for (let k = 0; k < INTENTOS && mejor > NOVEDAD_MAX; k++) {
      const script = generarTramo(seed, i + 1, k, prev, global);
      if (!tramoValido(script, tr.speed)) continue;
      // repetir una secuencia larga de una página anterior cuenta como hueco de novedad perdido
      const h = huecoNovedad(script, i * LEN, ultimoNuevo, global, i === n - 1 ? n * LEN : (i + 1) * LEN + 14) + (repiteTramo(eventos, script, i * LEN) ? 100 : 0);
      if (h < mejor) {
        mejor = h;
        t = { speed: tr.speed, len: LEN, script, ids: script.ids };
      }
    }
    if (!t) {
      fallbacks.push(i + 1);
      t = { speed: tr.speed, len: LEN, script: SCRIPTS[i], ids: ['clasico'] };
    }
    for (const [s, c] of [...t.script].sort((a, b) => a[0] - b[0])) {
      const p = principal(c);
      if (p === 'P5' || global.has(p)) continue;
      global.add(p);
      ultimoNuevo = i * LEN + s;
    }
    for (const [s, c] of [...t.script].sort((a, b) => a[0] - b[0])) if (principal(c) !== 'P5') eventos.push([i * LEN + s, principal(c)]);
    prev = new Set(t.script.map(([, c]) => principal(c)));
    return t;
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
