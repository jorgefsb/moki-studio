// Generador de niveles por bloques (NIVELES.md §4-§7). Cada tramo de 30 s se arma con bloques escritos a mano,
// sorteados con su propia semilla; el validador lo corre con la física real y, si no pasa, se re-sortea (8 veces)
// y al final se usa el guion clásico. Todo determinista: misma semilla, mismo nivel.
import { CONFIG as C } from '../config.js';
import { buildLevel, SCRIPTS, EXT } from '../tramos.js';
import { BLOQUES, T1_INTRO, SORPRESAS, HORQ } from './bloques.js';

// Respiro sin nada (antes una fila de 5 piezas): con fila, las páginas pasaban de 35% de filas de piezas (tope 20%)
const RELLENO = (dur) => ({ id: 'relleno', dur, ev: [], dif: 1, tags: ['descanso'] });
import { rng, hashSeed, todayKey } from './rng.js';
import { validateLevel, popupFalla } from './validar.js';
import { formasActivas, formasDePartida, fasesDeForma, TANDA } from './formas.js';

const LEN = 30;
const BY_ID = Object.fromEntries(BLOQUES.map((b) => [b.id, b]));
const VENTANA = { 1: [1, 2], 2: [1, 3], 3: [2, 4], 4: [2, 4] };
const PESO_DIF = { 1: { 1: 3, 2: 1 }, 2: { 1: 1, 2: 3, 3: 1 }, 3: { 2: 2, 3: 3, 4: 1 }, 4: { 2: 1, 3: 3, 4: 2 } };
export const BIOMAS = ['kraft', 'cuaderno', 'periodico', 'cartulina'];
const INTENTOS = 16; // con la curva de flow (fases cortas) 8 no alcanzaban en 4 de 1860 páginas de T3
const INTENTOS_RETO = 48; // con 16, la página 3 del 2027-03-31 caía al guion clásico

const hasP5 = (code) => code.includes('P5');
const hasPiezas = (code) => code.includes('P5') || code.includes('+'); // G3: fila o arco de piezas cortan la racha
const TOPE_FILAS = 0.2; // director: máximo 20% de filas de piezas por página
const MAX_FILAS = 2; // presupuesto al sortear: con ~10-12 patrones por página, 2 filas quedan en el tope
const filasDe = (b) => b.ev.filter(([, c]) => hasP5(c)).length;
const HOLD_HOLD_SEC = 1.0;
const JITTER_MS = [-40, 40];
const MIN_CLEAR_PX = 4;
const isDescanso = (b) => b.tags.includes('descanso');
// P36 horquilla (bloques elige): Libre siempre; el Reto desde la fecha del estreno (los Retos de antes no cambian)
export const ELIGE = { libre: true, reto: '2026-11-12' };
const eligeEn = (seed, modo) => (modo === 'libre' ? ELIGE.libre : modo === 'reto' && /^\d{4}-\d\d-\d\d$/.test(seed) && seed >= ELIGE.reto);
const PESO_ELIGE = 3;
// P36d F6 del Reto de nivel 1: la caja-viga (C.V) se guarda para T4 y la estrena cv-torre al abrir su subida
export const GUARDA = { reto: '2026-11-12', patron: 'C.V', tramo: 4, bloque: 'cv-torre' };
const guardaEn = (seed, modo, mecanicas) => modo === 'reto' && /^\d{4}-\d\d-\d\d$/.test(seed) && seed >= GUARDA.reto && mecanicas.length > 0 && mecanicas.every((m) => m === 'tramp');
const guardado = (ctx, tramo, c) => ctx.guarda && tramo < GUARDA.tramo && principal(c) === GUARDA.patron;

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
      if (b.elige && !ctx.elige) return false; // horquilla: solo con ELIGE
      if (b.ev.some(([, c]) => guardado(ctx, tramo, c))) return false; // P36d: C.V guardada hasta T4
      if (b.mec && !ctx.mecanicas.includes(b.mec)) return false; // mecánica no destrabada (o Reto/Clásico)
      if (b.soloPico && ctx.fase !== 'pico') return false; // viento-par y viento-ritmo: solo en el pico
      if (b.mec === 'viento' && ctx.nViento >= 2) return false; // máx. 2 bloques de viento por página
      if (b.cabe && !b.cabe(ctx, b)) return false; // reglas propias de una mecánica diferida (zanja)
      if (b.mec === 'timbre' && (ctx.nTimbre || b.soloEstreno || C.tramos[tramo - 1].speed > C.timbre.vMax || ctx.fase !== 'pico' && ctx.fase !== 'subida')) return false; // timbre: máx. 1 por página, nunca en calma ni respiro; la intro no se sortea
      if (tramo < b.min || tramo > b.max) return false; // G1
      if (ctx.tanda && conCompas(b)) return false; // en una tanda no entra el compás de 2 a 2.5 s de los bloques
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
    // horquilla garantizada: la primera de la página en el pico (en la subida empujaba el trampolín del respiro: F6 de Libre)
    const horq = ctx.elige && !ctx.nElige && ctx.fase === 'pico' ? cands.filter((b) => b.elige) : [];
    if (horq.length) {
      put(ctx, pick(r, horq.map((q) => [q, 1])));
      continue;
    }
    // sin candidatos: un respiro vacío (corta la racha de G3 sin gastar filas de piezas)
    if (!cands.length) {
      put(ctx, RELLENO(rem < 4.5 ? rem : Math.min(3, rem - 1.5)));
      if (rem < 4.5) return;
      continue;
    }
    put(ctx, pick(r, cands.map((q) => [q, (isDescanso(q) ? 1 : PESO_DIF[tramo][q.dif] || 1) * (tramo === 3 && q.tags.includes('viga') ? 2 : 1) * (ctx.used[q.id] ? 0.5 : 1) * (nuevo(ctx, q) ? 2 : 1) * (ctx.fase === 'pico' && esDuro(q) ? 3 : 1) * (q.mec ? q.peso || PESO_MEC : 1) * (q.elige ? PESO_ELIGE : 1)])));
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
  if (b.mec === 'viento') ctx.nViento = (ctx.nViento || 0) + 1;
  if (b.mec === 'timbre') ctx.nTimbre = 1;
  if (b.elige) (ctx.nElige = (ctx.nElige || 0) + 1), b.ev.forEach(([t, c]) => c === HORQ && ctx.horq.push(+(ctx.pos - b.dur + t).toFixed(3)));
  if (b.put) b.put(ctx, b);
  ctx.fasesIds.push([ctx.fase || 'intro', b.id]); // regla (c): qué bloque cayó en qué fase
}

// Curva de flow, paso 4 (NIVELES.md "Flow y mecánicas", director 1-nov): calma y respiro no son aire vacío, son
// decisiones fáciles. Donde quedan más de HUECO_MAX s sin decidir nada (filas P5 sueltas, relleno, colas de bloque),
// entra una decisión fácil de tocar o de no saltar (nunca mantener: mantener->mantener pide 1 s). Primero un patrón
// que la página todavía no tiene (sube F1). No toca la intro del tutorial (T1 0-12 s) ni pone nada después del 28.
// El validador de siempre (física real, ±40 ms) decide si la página queda; si no, se re-sortea.
const HUECO_MAX = 2.5;
// J: el vuelo y los 0.75 s libres al caer (lo siguiente a >= 2.2 s del trampolín, con minGapSec de densificar)
// Peso de los bloques de una mecánica destrabada: que salga de 2 a 4 veces por partida (F4 >= 20 % en Libre)
const PESO_MEC = 5;
// viento: aterrizar + C.viento.salidaSec libres (C< cae ~0.2 s tras la caja; C> y T> con salto mantenido, ~0.42 s)
const FIN = { 'C.C': C.pairGapSec, 'T.C': C.pairGapSec, 'C.V': C.pairGapSec, 'T.V': 1.0, OLA: 5 * C.waveGapSec, J: 2.2 - C.minGapSec, 'C<': 0.25, 'C>': 0.45, 'T>': 0.45 };
// Decisiones fáciles por fase (RETO EN 4 FASES): calma, subida y respiro solo toque o pop-up; el pico pasa por debajo
// (viga) o mantiene (torre, caja doble). Antes las vigas caían en calma y respiro: el pico salía más suave que ellas.
const FACILES = { 1: ['C+A3', 'C'], 2: ['U', 'C+A3', 'C.C', 'C'], 3: ['U', 'C+A3', 'C.C', 'C'], 4: ['U', 'C+A3', 'C.C', 'C'] };
const DE_PICO = { 1: FACILES[1], 2: ['CC', 'T', 'U', 'C.C'], 3: ['V', 'VC', 'C.V', 'T', 'CC'], 4: ['V', 'VC', 'C.V', 'T', 'CC'] };
const DUROS = new Set(['T', 'V', 'VC', 'CC', 'T.C', 'T.V', 'C.V']);
const principal = (code) => code.split('+')[0];
const base = (code) => principal(code).replace(/[<>]$/, ''); // sin el viento (C> -> C)
const patronDe = (code) => (code.endsWith('+B') ? `${principal(code)}B` : principal(code)); // C+B es su propio patrón (CB), como en flow-medir
const esDuro = (b) => b.ev.some(([, c]) => DUROS.has(base(c)));
const enZona = (zonas, t) => zonas.some(([a, b]) => t >= a && t < b);
// Tanda: solo jugadas de un golpe (un par no cabe en 1.2 a 1.6 s); la caja sola deja que no todo sea duro
const DE_TANDA = Object.fromEntries([2, 3, 4].map((tr) => [tr, [...DE_PICO[tr], 'C'].filter((c) => !FIN[principal(c)])]));
const conCompas = (b) => b.ev.filter(([, c]) => principal(c) !== 'P5').some(([t], i, ev) => i && t - ev[i - 1][0] > TANDA.max && t - ev[i - 1][0] <= HUECO_MAX);

// Viento que no se mezcla (NIVELES.md §3): de 0.7 s antes a 1.15 s después de cada obstáculo con viento no van vigas,
// pop-ups, filas P5, trampolines ni OLA; ningún trampolín a menos de su vuelo + 0.75 s (2.2 s) antes de la zona.
const NO_VIENTO = new Set(['V', 'VC', 'C.V', 'T.V', 'U', 'OLA', 'P5']);
const ventanasViento = (script) => script.filter(([, c]) => /[<>]$/.test(principal(c))).map(([t]) => [t - C.viento.antesSec, t + C.viento.despuesSec + 1]);
// Timbre (NIVELES.md §9): ni dentro de una zona de viento ni 1 s después (el viento mueve la x del toque), ni bajo el
// vuelo de un trampolín (>= 2.2 s después de un J)
const esTimbre = (c) => principal(c) === 'B' || c.endsWith('+B');
function timbreMezcla(script) {
  const bs = script.filter(([, c]) => esTimbre(c)).map(([t]) => t);
  if (!bs.length) return false;
  const vs = ventanasViento(script);
  return bs.some((t) => vs.some(([a, b]) => t >= a - 0.4 && t <= b) || script.some(([tj, c]) => principal(c) === 'J' && t > tj && t - tj < 2.2));
}
function vientoMezcla(script) {
  const vs = ventanasViento(script);
  if (!vs.length) return false;
  return script.some(([t, c]) => {
    const p = base(c);
    const fin = p === 'OLA' ? t + 5 * C.waveGapSec : t;
    if ((NO_VIENTO.has(p) || c.includes('+P5')) && vs.some(([a, b]) => fin >= a - 0.3 && t <= b)) return true;
    return p === 'J' && vs.some(([a, b]) => t >= a - 2.2 && t <= b);
  });
}
// estricto (con viento destrabado): un par de cajas no se mete si su segunda caja no deja minGapSec antes de lo
// siguiente. Sin viento queda como antes, para que el Reto y el Libre de siempre no cambien.
// zonas (con forma de página, armarForma): dónde está el pico, dónde empieza el respiro y las ventanas de aire. Sin
// ellas, las de siempre.
function densificar(script, tramo, r, antes0 = new Set(), global = new Set(), estricto = false, zonas = null, elige = false, guarda = false) {
  const picos = zonas ? zonas.picos : [[14, 24]];
  const respiro = zonas ? zonas.respiro : 24;
  const ev = [...script].sort((a, b) => a[0] - b[0]);
  const filas = ev.filter(([, c]) => principal(c) === 'P5').map(([t]) => t);
  const vientos = ventanasViento(script); // ahí no se meten vigas, pop-ups ni filas
  const dec = ev.filter(([, c]) => principal(c) !== 'P5');
  const vistos = new Set(dec.map(([, c]) => principal(c)));
  const desde = tramo === 1 ? 12 : 0;
  const nuevos = [];
  // con forma: de la decisión a su última caja, para contar bien el aire que pide un pop-up después (la caja pegada de CC también)
  const cola = (p) => (p === 'CC' ? C.cajaPegadaGapPx / C.tramos[tramo - 1].speed : FIN[p] || 0);
  // nunca el mismo patrón que la decisión de antes o la de después (C C C C se leía como tramo repetido, F3b)
  // el pop-up pide C.popup.minGapBeforeSec tras el obstáculo anterior (popupFalla); si no cabe, otra decisión fácil
  const pon = (t, antes, despues, previo, hasta = Infinity) => {
    const enViento = vientos.some(([a, b]) => t >= a - 0.3 && t <= b);
    const T = zonas && enZona(zonas.tandas, t) ? DE_TANDA : enZona(picos, t) ? DE_PICO : FACILES;
    // horquilla en calma y respiro (P36): la caja con arco alto, máx. 2 por página (T1 desde el 12, tras el tutorial)
    const F = (elige && T === FACILES && nuevos.filter(([, c]) => c === HORQ).length < 2 ? [...T[tramo], HORQ] : T[tramo]).filter((c) => (principal(c) !== 'U' || t - previo >= C.popup.minGapBeforeSec) && !(enViento && NO_VIENTO.has(principal(c))) && !guardado({ guarda }, tramo, c));
    const F2 = estricto ? F.filter((c) => hasta - t >= (FIN[principal(c)] || 0) + C.minGapSec) : F;
    const ok = [F2.filter((c) => principal(c) !== antes && principal(c) !== despues), F2.filter((c) => principal(c) !== antes), F2, F].find((x) => x.length);
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
    // respiro (>= 24 s): al azar entre las fáciles que no repiten vecino; con la escalera, el final salía con la misma jugada entre fechas
    const libres = t >= respiro ? ok : escalones.find((x) => x.length);
    const code = libres[Math.floor(r() * libres.length)];
    vistos.add(principal(code));
    nuevos.push([+t.toFixed(2), code]);
    return principal(code);
  };
  // El aire se mide de decisión a decisión: cada orilla lleva una, salvo que ya haya otra a menos de minGapSec.
  // Las tandas también: así ningún hueco queda mitad dentro y mitad fuera.
  for (const [x, y] of zonas ? [...zonas.aires, ...zonas.tandas] : []) {
    for (const t of [x, y]) {
      const a = dec.filter(([s]) => s <= t).reduce((m, d) => (!m || d[0] > m[0] ? d : m), null);
      const b = dec.filter(([s]) => s > t).reduce((m, d) => (!m || d[0] < m[0] ? d : m), null);
      if ((a && t - a[0] < C.minGapSec) || (b && b[0] - t < C.minGapSec)) continue;
      pon(t, a ? principal(a[1]) : null, b ? principal(b[1]) : null, a ? a[0] + cola(principal(a[1])) : -Infinity, b ? b[0] : Infinity);
      dec.push(nuevos[nuevos.length - 1]);
    }
  }
  dec.sort((a, b) => a[0] - b[0]);
  // Huecos entre decisiones seguidas, más los dos de la orilla de la página: el hueco que cruza el checkpoint es
  // (30 - última) + (primera de la siguiente - 2), así que la página arranca a más tardar en 2.5 s (ancla en 0) y
  // termina no antes de 27.5 (ancla en 30). Nada antes del segundo 2 ni después del 28.
  // med: desde dónde se mide el hueco (la decisión y la cola de su par); libre: desde dónde se puede meter algo
  // (la cola más larga hasta ahí: el vuelo del trampolín y su caída libre cubren al nudo). Sin trampolín son iguales.
  let medMax = -Infinity;
  let libMax = -Infinity;
  const puntos = dec.map(([t, c]) => {
    const p = principal(c);
    if (p !== 'J') medMax = Math.max(medMax, t + (FIN[p] || 0));
    libMax = Math.max(libMax, t + (FIN[p] || 0));
    return { t, fin: Math.max(medMax, t), libre: libMax };
  });
  for (let i = 0; i <= puntos.length; i++) {
    let a = i ? puntos[i - 1].fin : tramo === 1 ? null : 0; // T1 empieza con la intro del tutorial
    const b = i < puntos.length ? puntos[i].t : LEN;
    if (a === null || b <= desde) continue;
    if (zonas && zonas.aires.some(([x, y]) => a < y - 1e-9 && b > x + 1e-9)) continue; // el aire se queda vacío
    let antes = i ? principal(dec[i - 1][1]) : null;
    const despues = i < puntos.length ? principal(dec[i][1]) : null;
    if (a < desde) {
      // en T1 se tapa desde el 12 (antes va la intro)
      if (b - a > HUECO_MAX && b - desde >= C.minGapSec) antes = pon(desde, antes, despues, a);
      a = desde;
    }
    const enTanda = zonas && enZona(zonas.tandas, (a + b) / 2);
    if (b - a <= (enTanda ? TANDA.deja : HUECO_MAX)) continue;
    // tras un trampolín: la primera decisión va en cuanto se puede (vuelo + caída libre); lo demás se reparte igual
    if (i && puntos[i - 1].libre > a) {
      const t1 = puntos[i - 1].libre + C.minGapSec;
      if (b - t1 < C.minGapSec) continue;
      antes = pon(t1, antes, b - t1 <= HUECO_MAX ? despues : null, puntos[i - 1].libre);
      a = t1 + (FIN[antes] || 0); // la segunda caja de un par también cuenta
      if (b - a < C.minGapSec) nuevos.pop(); // no cupo el par: se quita (el validador decide el resto)
      if (b - a < C.minGapSec) continue;
      if (b - a <= HUECO_MAX) continue;
    }
    let previo = i ? a : -Infinity; // último obstáculo antes del que se mete (FIN ya cuenta la segunda caja de un par)
    if (zonas && antes === 'CC') previo += cola('CC');
    const k = enTanda ? Math.max(1, Math.floor((b - a) / TANDA.min) - 1) : Math.ceil((b - a) / HUECO_MAX) - 1;
    for (let j = 1; j <= k; j++) {
      let t = a + ((b - a) * j) / (k + 1);
      if (enTanda) t += (r() - 0.5) * 0.2; // sin esto, una tanda es otro metrónomo
      // lejos de una fila de piezas en el suelo (la caja la taparía)
      const fila = filas.find((f) => Math.abs(f - t) < 0.5);
      if (fila !== undefined) t = fila + (t >= fila ? 0.5 : -0.5);
      // respiro: la posición varía (el final se repetía entre fechas) dentro de lo que sobra del espaciado: ningún hueco > HUECO_MAX
      if (t >= respiro) t += (r() - 0.5) * 2 * Math.min(0.25, Math.max(0, (HUECO_MAX - (b - a) / (k + 1)) / 2));
      t = Math.min(28, Math.max(2, t));
      if (despues === 'U' && b - t < C.popup.minGapBeforeSec) t = b - C.popup.minGapBeforeSec; // el pop-up de después también pide su aire
      if (t - previo < C.minGapSec || (i < puntos.length && b - t < C.minGapSec)) continue;
      antes = pon(t, antes, j === k ? despues : null, previo, i < puntos.length ? b : Infinity);
      previo = zonas ? t + cola(antes) : t;
    }
  }
  return [...ev, ...nuevos].sort((x, y) => x[0] - y[0]);
}

// horquillas de la página: las de los bloques y las cajas con arco alto que puso densificar
function conHorq(script, ctx, extra = {}) {
  const horq = ctx.elige ? [...ctx.horq, ...script.filter(([t, c]) => c === HORQ && !ctx.script.some(([s, d]) => s === t && d === c)).map(([t]) => t)] : ctx.horq;
  return Object.assign(script, { ids: ctx.ids, fases: ctx.fasesIds, ...extra, horq });
}

// Página con forma (formas.js): recorre las fases de la tabla con las mismas reglas de bloques que la curva fija.
// Devuelve las zonas reales: un estreno largo puede empujar lo que sigue, y el aire se recorre con él.
const AIRE_TRAS_4 = 1.5; // s sin nada entre un bloque de dificultad 4 y el trampolín del respiro (solo Reto)
function armarForma(r, ctx, tramo, segs, sorpresa, estrenos, abrePico) {
  const [lo, hi] = VENTANA[tramo];
  const V = { suave: [1, 1], subida: [lo, Math.min(hi, lo + 1)], pico: [Math.max(lo, hi - 2), hi] };
  const zonas = { picos: [], suaves: [], aires: [], tandas: [], respiro: LEN };
  const rangos = segs.map(([f, hasta, tanda], i) => [f, i ? segs[i - 1][1] : ctx.pos, hasta, tanda]);
  // la sorpresa va en el primer pico donde cabe; si no cabe en ninguno (la ola en Ráfagas), se sortea otra que sí
  const dondeCabe = (b) => rangos.findIndex(([f, a, z]) => f === 'pico' && z - a >= b.dur);
  // Reto: en T4 la lista de reserva era solo viga-arco, y pasaba de su tope de uso
  const ok = (ctx.ajusteReto && tramo === 4 ? [...SORPRESAS[4], ['regalo-ambar', 1]] : SORPRESAS[tramo]).filter(([id]) => dondeCabe(BY_ID[id]) >= 0);
  const sorp = dondeCabe(sorpresa) >= 0 || !ok.length ? sorpresa : BY_ID[pick(r, ok)];
  const iS = Math.max(dondeCabe(sorp), rangos.findIndex(([f]) => f === 'pico'));
  ctx.reserva = filasDe(sorp);
  ctx.maxFilas = sorp.id === 'ola' ? 1 : MAX_FILAS;
  let ySubida = false;
  let yPico = false;
  rangos.forEach(([f, a, z, tanda], i) => {
    ctx.fase = f;
    ctx.tanda = tanda;
    const ini = ctx.pos;
    if (f === 'aire') {
      put(ctx, RELLENO(z - a));
      zonas.aires.push([ini, ctx.pos]);
      return;
    }
    if (f === 'subida' && !ySubida) {
      ySubida = true;
      estrenos();
    }
    if (f === 'pico' && !yPico) {
      yPico = true;
      abrePico();
    }
    if (i === iS) {
      const S = ctx.pos + Math.floor(r() * (Math.max(0, z - sorp.dur - ctx.pos) * 2 + 1)) / 2;
      if (S > ctx.pos + 1e-9) fill(r, S, ctx, tramo, V[f]);
      ctx.reserva = 0;
      put(ctx, sorp);
    }
    if (i === rangos.length - 1) {
      zonas.respiro = ini;
      // el trampolín de la curva fija, en el segundo donde la forma deja empezar su respiro
      const tramp = tramo === 3 ? 'tramp-nudo' : 'tramp-intro';
      if (ctx.mecanicas.includes('tramp') && tramo > 1 && ctx.pos <= 25 + 1e-9 && ctx.prevTema !== 'trampolin' && !(ctx.ajusteReto && ctx.used[tramp] >= 2)) {
        // Reto: la ola del último pico caía pegada al trampolín. Va como aire para que densificar no le meta decisiones
        if (ctx.ajusteReto && ctx.prev && ctx.prev.dif >= 4) {
          put(ctx, RELLENO(AIRE_TRAS_4));
          zonas.aires.push([ctx.pos - AIRE_TRAS_4, ctx.pos]);
        }
        put(ctx, BY_ID[tramp]);
      }
      if (ctx.pos < LEN - 1e-9) put(ctx, RELLENO(LEN - ctx.pos));
    } else if (ctx.pos < z - 1e-9) fill(r, z, ctx, tramo, V[f]);
    if (f === 'pico') zonas.picos.push([ini, ctx.pos]);
    if (tanda) zonas.tandas.push([ini, ctx.pos]);
    if (f === 'suave') zonas.suaves.push([i ? ini : 0, ctx.pos]);
  });
  return zonas;
}

// Un tramo (1-4) como guion [[s, código]] de 30 s. forma: nombre de formas.js; sin ella, la curva fija de siempre.
// ajusteReto: reglas de las formas que solo aplican al Reto (Libre se queda como está).
export function generarTramo(seed, tramo, intento = 0, patronesPrev = new Set(), global = new Set(), mecanicas = [], forma = null, ajusteReto = false, elige = false, guarda = false) {
  const r = rng(hashSeed(`${seed}:${tramo}:${intento}`));
  const ctx = { pos: 2, script: [], p5: 0, used: {}, prev: null, ids: [], filas: 0, reserva: 0, maxFilas: MAX_FILAS, vistos: new Set(patronesPrev), mecanicas, fasesIds: [], global, ajusteReto, elige, guarda, horq: [] };
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
  const estrenaViento = tramo === 2 && ctx.mecanicas.includes('viento');
  const estrenos = () => {
    if (tramo === 3) put(ctx, BY_ID['viga-intro']); // la viga se enseña siempre igual, ahora al empezar la subida
    if (ctx.guarda && tramo === GUARDA.tramo) put(ctx, BY_ID[GUARDA.bloque]); // P36d: estreno seguro de C.V en T4
    if (estrenaViento) put(ctx, BY_ID['viento-intro']); // la primera página con viento lo enseña al abrir la subida
    // el timbre se estrena al abrir la subida de la primera página libre de estrenos (la 2 si no hay viento, si no la 3)
    if (ctx.mecanicas.includes('timbre') && tramo === (ctx.mecanicas.includes('viento') ? 3 : 2)) put(ctx, BY_ID['timbre-intro']);
    if (EXT.z) EXT.z.estreno(ctx, tramo, global, put); // la zanja (src/zanja.js) se estrena al abrir la subida
  };
  const abrePico = () => {
    if (estrenaViento) put(ctx, BY_ID['viento-contra']); // ...y el contrario abre el pico de esa misma página
  };
  if (forma) {
    const zonas = armarForma(r, ctx, tramo, fasesDeForma(seed, tramo, intento, forma), sorpresa, estrenos, abrePico);
    return conHorq(densificar(ctx.script, tramo, r, patronesPrev, global, ctx.mecanicas.includes('viento'), zonas, ctx.elige, ctx.guarda), ctx, { zonas });
  }
  ctx.fase = 'suave';
  fase(4, [1, 1], true); // la calma (2-4 s) es relleno que densificar llena con decisiones fáciles
  ctx.fase = 'subida';
  estrenos();
  fase(14, [lo, Math.min(hi, lo + 1)]);
  ctx.fase = 'pico';
  abrePico();
  // la sorpresa empieza entre 14 y 20 y termina antes del 24 (la ola de 6.5 s en el 14 dejaba el pico en relleno)
  const sMax = Math.max(14, Math.min(20, 24 - sorpresa.dur));
  const S = Math.max(ctx.pos, 14 + Math.floor(r() * ((sMax - 14) * 2 + 1)) / 2);
  fase(S, pico);
  ctx.reserva = 0;
  put(ctx, sorpresa);
  fase(24, pico);
  // respiro: sin bloques sorteados (los pocos bloques suaves pasaban del 8 % de uso); queda relleno y densificar lo
  // llena con decisiones fáciles que rotan
  ctx.fase = 'suave';
  // con trampolín destrabado, el respiro abre con uno sin nudo: pisarlo es descansar y cobra el arco (elección real, F4)
  // regla (c): alterna sin nudo (T2, T4) y con nudo suave (T3) para no repetir bloque en la misma fase
  if (ctx.mecanicas.includes('tramp') && tramo > 1 && ctx.pos <= 25 + 1e-9 && ctx.prevTema !== 'trampolin') put(ctx, BY_ID[tramo === 3 ? 'tramp-nudo' : 'tramp-intro']);
  if (ctx.pos < LEN - 1e-9) put(ctx, RELLENO(LEN - ctx.pos));
  return conHorq(densificar(ctx.script, tramo, r, patronesPrev, global, ctx.mecanicas.includes('viento'), null, ctx.elige, ctx.guarda), ctx);
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
  const holds = level.entities.filter((e) => e.kind === 'obs' && e.plan === 'hold' && e.type !== 'timbre'); // el timbre y su torre nunca se mantienen en la misma ruta
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
  if (script.horq && script.horq.length) level.horq = script.horq.map((t) => speed * t); // horquilla: abajo la toca
  if (!legible(level) || !holdHold(level) || popupFalla(level) || filasPiezas(script) > TOPE_FILAS + 1e-9) return false;
  if (repetidoPegado(script)) return false;
  if (vientoMezcla(script) || timbreMezcla(script) || EXT.z && EXT.z.mezcla(script)) return false;
  // con trampolín, las dos rutas (pisarlo y saltarlo) se libran con ±40 ms
  const rutas = level.horq || script.some(([, c]) => principal(c) === 'J' || esTimbre(c)) ? ['arriba', 'abajo'] : ['arriba']; // y con timbre: tocarlo y a mano
  return rutas.every((ruta) =>
    [0, ...JITTER_MS].every((j) => {
      const r = validateLevel(level, null, j, ruta);
      return r.ok && r.minClear >= MIN_CLEAR_PX;
    }),
  );
}

// F6 por página: hueco más largo sin patrón nuevo desde ultimoNuevo (s de la partida), con los estrenos de esta
// página (inicio en s0), hasta `hasta` (fin de partida, o el segundo 14 de la página siguiente: ahí ya puede estrenar).
const NOVEDAD_MAX = 28;
// F3 entre páginas: ¿la página trae una secuencia de 2-4 fichas patrón@hueco (0.25 s) de más de F3_MAX s que ya salió
// antes en la partida? Mismo cálculo que scripts/flow-medir.mjs; 'antes' son los eventos [s de partida, patrón].
const F3_MAX = 4;
// max (con timbre destrabado, 3.85): flow-medir mide la primera aparición y aquí se mide la repetición; con fichas
// redondeadas a 0.25 s las dos difieren hasta ~0.15 (C@1.75 U@4.00 era 4.11 antes y 4.0 aquí). Sin timbre, F3_MAX.
function repiteTramo(antes, script, s0, max = F3_MAX) {
  const ev = [...antes, ...script.filter(([, c]) => principal(c) !== 'P5').map(([s, c]) => [s0 + s, patronDe(c)]).sort((a, b) => a[0] - b[0])];
  const f = ev.map(([t, p], i) => `${p}@${i ? (Math.round((t - ev[i - 1][0]) * 4) / 4).toFixed(2) : '0'}`);
  const k0 = antes.length;
  for (let len = 2; len <= 4; len++) {
    const vistas = new Set();
    for (let i = 0; i + len <= k0; i++) vistas.add(f.slice(i, i + len).join(' '));
    for (let i = Math.max(1, k0 - len + 1); i + len <= ev.length; i++) {
      if (ev[i + len - 1][0] - ev[i][0] <= max) continue;
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
    const p = patronDe(c);
    if (p === 'P5' || vistos.has(p)) continue;
    vistos.add(p);
    h = Math.max(h, s0 + s - u);
    u = s0 + s;
  }
  return Math.max(h, hasta - u);
}

// FP de una página (scripts/flow-medir.mjs): % de obstáculos duros (torre, viga, caja+viga, caja doble) en el pico
// (14-24 s) menos el % en calma+respiro (0-4 y 24-30 s). Cada obstáculo de un par cuenta aparte, la ola son 6 cajas.
const PARTES_FP = {
  T: [[1, 0]], V: [[1, 0]], VC: [[1, 0]], CC: [[1, 0]], C: [[0, 0]], U: [[0, 0]], J: [[0, 0]],
  'C.C': [[0, 0], [0, C.pairGapSec]], 'T.C': [[1, 0], [0, C.pairGapSec]], 'T.V': [[1, 0], [1, 1.0]], 'C.V': [[0, 0], [1, C.pairGapSec]],
  OLA: Array.from({ length: 6 }, (_, i) => [0, i * C.waveGapSec]),
};
export function fpPagina(script, zonas = { picos: [[14, 24]], suaves: [[0, 4], [24, 30]] }) {
  let pd = 0, pn = 0, sd = 0, sn = 0;
  for (const [t, c] of script) {
    for (const [duro, at] of PARTES_FP[base(c)] || []) {
      const x = t + at;
      if (enZona(zonas.picos, x)) (pn++, (pd += duro));
      else if (enZona(zonas.suaves, x)) (sn++, (sd += duro));
    }
  }
  return (pn ? (100 * pd) / pn : 0) - (sn ? (100 * sd) / sn : 0);
}
const FP_MIN = 10; // pico al menos 10 puntos más duro que calma y respiro (director, 1-nov 23:30)

// Firma del pico (regla b): patrones de 14 a 24 s (o de los picos de la forma), sin filas de piezas
const firmaPico = (script, picos = [[14, 24]]) => [...script].sort((a, b) => a[0] - b[0]).filter(([t, c]) => enZona(picos, t) && principal(c) !== 'P5').map(([, c]) => principal(c)).join(' ');

// Con forma: el hueco más largo entre dos decisiones de la página, desde que acaba la anterior (vara F2a <= 4.5)
const F2A_MAX = 4.5;
function huecoForma(script) {
  const ev = script.filter(([, c]) => principal(c) !== 'P5').sort((a, b) => a[0] - b[0]);
  return Math.max(0, ...ev.slice(1).map(([t], i) => t - ev[i][0] - (FIN[principal(ev[i][1])] || 0)));
}

// seed: texto ("2026-10-29") o número. Devuelve el nivel de buildLevel más { seed, modo, biomas, fallbacks }.
// opts.mecanicas: mecánicas destrabadas (['tramp']); solo las pasa Libre. Sin ellas, el nivel es el de siempre.
// El Reto las toma de su fecha (la semilla es la fecha, no el reloj ni el nivel de nadie: igual para todos ese día).
const mecanicasReto = (seed) => (/^\d{4}-\d\d-\d\d$/.test(seed) ? ['tramp', 'viento'].filter((m) => C[m].reto && seed >= C[m].reto) : []);
export function generarNivel(seed, modo = 'reto', opts = {}) {
  // P5c: opts.nivelMec = mecánicas del nivel del Cuaderno (barra.js mecanicasDeNivel) que el Reto suma a las de su
  // fecha. Misma semilla del día dentro de cada nivel; sin ellas (nivel 1) el Reto es el de siempre.
  // P5c2: opts.nivelSola = el nivel estrena su mecánica: sale SOLA, sin el trampolín de la fecha (si no, N3 = N1).
  const deFecha = opts.nivelSola ? [] : mecanicasReto(seed);
  const mecanicas = opts.mecanicas || (modo === 'reto' ? [...new Set([...deFecha, ...(opts.nivelMec || [])])] : []);
  const k0 = opts.salto || 0; // P5c2: intentos desplazados al regenerar un Reto por nivel que no pasa entero
  const formas = formasActivas(seed, modo) ? formasDePartida(seed) : null;
  const ajusteReto = !!formas && modo === 'reto';
  const elige = eligeEn(String(seed), modo);
  const guarda = guardaEn(String(seed), modo, mecanicas);
  const fallbacks = [];
  let prev = new Set();
  const global = new Set();
  let ultimoNuevo = 0; // segundo de la partida del último patrón que no había salido (F6)
  const eventos = []; // [s de partida, patrón] de las páginas ya puestas (F3 entre páginas)
  let prevPico = null;
  let prevFases = new Set();
  const n = C.tramos.length;
  const tramos = C.tramos.map((tr, i) => {
    // con viento hay 3 patrones nuevos que repartir: el tope baja a 22 s (vara F6 <= 24 en Libre con viento)
    const novedadMax = mecanicas.includes('viento') ? 22 : NOVEDAD_MAX;
    // De los intentos válidos gana el primero que mantiene F6 (<= NOVEDAD_MAX s sin patrón nuevo, contando hasta
    // donde la página siguiente puede estrenar uno); si ninguno, el de hueco más corto.
    let t = null;
    let mejor = Infinity;
    // Reto con formas: una página sin ningún intento válido sigue probando antes de caer al guion clásico
    for (let k = k0; (k < k0 + INTENTOS || (ajusteReto && !t && k < k0 + INTENTOS_RETO)) && mejor > novedadMax; k++) {
      const script = generarTramo(seed, i + 1, k, prev, global, mecanicas, formas && formas[i], ajusteReto, elige, guarda);
      if (!ajusteReto && !tramoValido(script, tr.speed)) continue;
      // repetir una secuencia larga de una página anterior cuenta como hueco de novedad perdido
      // reglas de no repetir (NIVELES.md flow): (b) el pico no repite la firma del pico anterior; (c) un bloque no
      // sale en la misma fase de dos páginas seguidas. Castigan como un hueco de novedad: se elige otro intento.
      const reglaB = !!prevPico && firmaPico(script, script.zonas ? script.zonas.picos : undefined) === prevPico;
      // (c) y, para el timbre, el mismo id tampoco en otra fase de la página siguiente
      const reglaC = script.fases.some(([fa, id]) => id !== 'relleno' && (prevFases.has(`${fa}:${id}`) || (id.startsWith('timbre') && [...prevFases].some((f) => f.endsWith(`:${id}`)))));
      const h = huecoNovedad(script, i * LEN, ultimoNuevo, global, i === n - 1 ? n * LEN : (i + 1) * LEN + 14) + (repiteTramo(eventos, script, i * LEN, mecanicas.includes('timbre') ? 3.85 : F3_MAX) ? 100 : 0) + (reglaB || reglaC ? 50 : 0) + (i > 0 && fpPagina(script, script.zonas || undefined) < FP_MIN ? 100 : 0) + (formas && huecoForma(script) > F2A_MAX + 1e-9 ? 100 : 0) + (mecanicas.includes('timbre') && i >= 1 && tr.speed <= C.timbre.vMax && !script.ids.some((id) => id.startsWith('timbre')) ? 6 : 0); // con timbre, las páginas que pueden llevarlo prefieren uno (F4) // pico más suave que el respiro: otro intento
      // Reto: la física corre al final y solo si el intento puede ganar; el elegido es el mismo, Generar baja
      if (h < mejor && (!ajusteReto || tramoValido(script, tr.speed))) {
        mejor = h;
        t = { speed: tr.speed, len: LEN, script, ids: script.ids, fases: script.fases, horq: script.horq };
      }
    }
    if (!t) {
      fallbacks.push(i + 1);
      t = { speed: tr.speed, len: LEN, script: SCRIPTS[i], ids: ['clasico'] };
    }
    for (const [s, c] of [...t.script].sort((a, b) => a[0] - b[0])) {
      const p = patronDe(c);
      if (p === 'P5' || global.has(p)) continue;
      global.add(p);
      ultimoNuevo = i * LEN + s;
    }
    for (const [s, c] of [...t.script].sort((a, b) => a[0] - b[0])) if (principal(c) !== 'P5') eventos.push([i * LEN + s, patronDe(c)]);
    prev = new Set(t.script.map(([, c]) => principal(c)));
    prevPico = firmaPico(t.script, t.script.zonas ? t.script.zonas.picos : undefined);
    prevFases = new Set((t.fases || []).map(([fa, id]) => `${fa}:${id}`));
    return t;
  });
  const r = rng(hashSeed(`${seed}:bioma`));
  const biomas = [...BIOMAS];
  for (let i = biomas.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [biomas[i], biomas[j]] = [biomas[j], biomas[i]];
  }
  const L0 = buildLevel(tramos);
  const horq = tramos.flatMap((t, i) => (t.horq || []).map((s) => L0.starts[i] + t.speed * s));
  const nivel = { ...L0, ...(horq.length ? { horq } : {}), seed: String(seed), modo, mecanicas, ...(opts.nivel ? { nivel: opts.nivel } : {}), biomas, fallbacks, bloques: tramos.map((t) => t.ids), bloquesFase: tramos.map((t) => t.fases || []), ...(formas ? { formas } : {}) };
  // P5c2: cada página pasa sola, pero en el Reto por nivel (zanja+trampolín) el nivel entero podía no pasar a +40 ms
  // (10-dic N4: zanja-larga y luego tramp-nudo). Se revisa entero y, si falla, se regenera con otros intentos
  // (igual para todos ese día y nivel). Sin opts.nivelMec (nivel 1, Clásico, Libre) no corre: nada cambia.
  const salto = opts.salto || 0;
  if (modo === 'reto' && opts.nivelMec && salto < 3 * INTENTOS && ![0, 40, -40].every((j) => validateLevel(nivel, null, j).ok))
    return generarNivel(seed, modo, { ...opts, salto: salto + INTENTOS });
  return nivel;
}

export const semillaReto = () => todayKey();
export function semillaLibre() {
  try {
    return String(crypto.getRandomValues(new Uint32Array(1))[0]);
  } catch (e) {
    return String(Date.now() >>> 0);
  }
}
