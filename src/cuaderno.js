// Cuaderno de Moki (GDD §3): banco fijo de 9 notas, 3 activas a la vez, sellos de cartón. Todo en localStorage, sin cuentas.
// Solo lee el estado de la partida: no toca física, semilla, azar ni puntaje (clásico, bots y determinismo intactos).
// Las notas se cumplen dentro de UNA partida (de "Jugar"/"Otra vez" a la meta; los reintentos desde checkpoint siguen
// en la misma). Se revisan al caer y al llegar; la tira de la tarjeta enseña las activas y el sello nuevo.
import { load, save } from './storage.js';

const KEY = 'moki.cuaderno';

// Orden fijo, de fácil a difícil. goal = meta numérica; val(st) = avance de la partida.
export const NOTAS = [
  { id: 'cajas5', goal: 5, val: (st) => st.passed.caja },
  { id: 'pagina2', goal: 1, val: (st) => (st.maxTramo >= 1 ? 1 : 0) },
  { id: 'racha5', goal: 5, val: (st) => st.maxCombo },
  { id: 'torres3', goal: 3, val: (st) => st.passed.torre },
  { id: 'piezas30', goal: 30, val: (st) => st.maxPieces },
  { id: 'arcoP2', goal: 1, val: (st) => st.arcsByTramo[1] || 0 },
  { id: 'vigas3', goal: 3, val: (st) => st.passed.viga },
  { id: 'ambar', goal: 1, val: (st) => st.amber },
  { id: 'sinCaer', goal: 1, val: (st) => (st.finished && st.crashes === 0 ? 1 : 0) },
];

// Sellos de partida (DISENO §4): además de uno por nota cumplida.
export const SELLOS = [
  { id: 'llegue', ok: (st) => st.finished },
  { id: 'sinCaerme', ok: (st) => st.finished && st.crashes === 0 },
  { id: 'coleccionista', ok: (st) => st.finished && st.pieceTotal > 0 && st.maxPieces >= 0.8 * st.pieceTotal },
  { id: 'arcos3', ok: (st) => st.arcs >= 3 },
];

export const TOTAL_SELLOS = NOTAS.length + SELLOS.length;
const NOTA_IDS = new Set(NOTAS.map((n) => n.id));
const SELLO_IDS = new Set(SELLOS.map((s) => s.id));

// Lo guardado puede venir roto, viejo o de otra versión: se filtra a ids conocidos y nunca truena.
export function leerCuaderno() {
  let d = null;
  try {
    d = JSON.parse(load(KEY, 'null'));
  } catch (e) {
    d = null;
  }
  const arr = (a, ok) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string' && ok.has(x)))] : []);
  return { notas: arr(d && d.notas, NOTA_IDS), sellos: arr(d && d.sellos, SELLO_IDS) };
}

function guardar(c) {
  save(KEY, JSON.stringify({ v: 1, notas: c.notas, sellos: c.sellos }));
}

export const activas = (c) => NOTAS.filter((n) => !c.notas.includes(n.id)).slice(0, 3);

export function nuevaPartida() {
  return { passed: { caja: 0, torre: 0, viga: 0 }, maxTramo: 0, maxCombo: 0, maxPieces: 0, arcs: 0, arcsByTramo: {}, amber: 0, crashes: 0, crashesByTramo: {}, finished: false, pieceTotal: 0 };
}

// Revisa la partida contra las notas activas (en orden: al cumplir una entra la siguiente y también se revisa)
// y los sellos de partida. Devuelve la tira: notas activas con avance y lo nuevo de esta revisión.
export function revisar(st) {
  const c = leerCuaderno();
  const nuevasNotas = [];
  for (;;) {
    const hecha = activas(c).find((n) => n.val(st) >= n.goal);
    if (!hecha) break;
    c.notas.push(hecha.id);
    nuevasNotas.push(hecha.id);
  }
  const nuevosSellos = SELLOS.filter((s) => !c.sellos.includes(s.id) && s.ok(st)).map((s) => s.id);
  c.sellos.push(...nuevosSellos);
  if (nuevasNotas.length || nuevosSellos.length) guardar(c);
  return {
    activas: activas(c).map((n) => ({ id: n.id, goal: n.goal, val: Math.min(n.goal, n.val(st)) })),
    nuevasNotas,
    nuevosSellos,
    total: c.notas.length + c.sellos.length,
    de: TOTAL_SELLOS,
  };
}
