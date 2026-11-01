// Cuaderno de Moki (GDD §3, pilar Encargos E1): banco de 30 encargos en 10 niveles de tres, más 4 sellos de partida.
// Al completar los tres encargos de un nivel, Moki sube de nivel. Activos = lo pendiente del nivel actual. Todo en
// localStorage (`moki.cuaderno` v2), sin cuentas. Solo lee el estado de la partida: no toca física, semilla, azar ni
// puntaje (clásico, bots y determinismo intactos). Los encargos se cumplen dentro de UNA partida (de "Jugar"/"Otra vez"
// a la meta; los reintentos desde checkpoint siguen en la misma) y se revisan al caer y al llegar.
// Cada cantidad sale del inventario (evidencia/v2-e1-inventario.md): solo se pide lo que el tramo garantiza en
// Clásico, Reto y Libre. Páginas: tramo 0-3 = página 1-4.
import { load, save } from './storage.js';

const KEY = 'moki.cuaderno';

const cayoEn = (st, i) => (st.crashesByTramo[i] || 0) > 0;
// Página i (0-3) sin caerse: hay que haberla terminado (llegar a la siguiente o a la meta) sin choque en ella
const paginaLimpia = (st, i) => ((i < 3 ? st.maxTramo > i : st.finished) && !cayoEn(st, i) ? 1 : 0);

// goal = meta numérica; val(st) = avance de la partida. Niveles 1-5 enseñan; del 6 en adelante combinan.
export const NIVELES = [
  // 1 · cajas (saltar)
  [
    { id: 'cajas3', goal: 3, val: (st) => st.passed.caja },
    { id: 'cajas5', goal: 5, val: (st) => st.passed.caja },
    { id: 'piezas15', goal: 15, val: (st) => st.maxPieces },
  ],
  // 2 · torres (mantener)
  [
    { id: 'torre1', goal: 1, val: (st) => st.passed.torre },
    { id: 'torres3', goal: 3, val: (st) => st.passed.torre },
    { id: 'arco1', goal: 1, val: (st) => st.arcs },
  ],
  // 3 · página 2 (va antes que las vigas: la viga vive en la página 3)
  [
    { id: 'pagina2', goal: 1, val: (st) => (st.maxTramo >= 1 ? 1 : 0) },
    { id: 'ambar', goal: 1, val: (st) => st.amber },
    { id: 'arcoP2', goal: 1, val: (st) => st.arcsByTramo[1] || 0 },
  ],
  // 4 · vigas (pasar por debajo sin saltar)
  [
    { id: 'pagina3', goal: 1, val: (st) => (st.maxTramo >= 2 ? 1 : 0) },
    { id: 'viga1', goal: 1, val: (st) => st.passed.viga },
    { id: 'vigas2', goal: 2, val: (st) => st.passed.viga },
  ],
  // 5 · sin caerse
  [
    { id: 'sinCaerP1', goal: 1, val: (st) => paginaLimpia(st, 0) },
    { id: 'meta', goal: 1, val: (st) => (st.finished ? 1 : 0) },
    { id: 'sinCaer', goal: 1, val: (st) => (st.finished && st.crashes === 0 ? 1 : 0) },
  ],
  // 6 · encadenar y juntar
  [
    { id: 'racha5', goal: 5, val: (st) => st.maxCombo },
    { id: 'piezas30', goal: 30, val: (st) => st.maxPieces },
    { id: 'arcos3P1', goal: 3, val: (st) => st.arcsByTramo[0] || 0 },
  ],
  // 7
  [
    { id: 'sinCaerP2', goal: 1, val: (st) => paginaLimpia(st, 1) },
    { id: 'torres4', goal: 4, val: (st) => st.passed.torre },
    { id: 'racha7', goal: 7, val: (st) => st.maxCombo },
  ],
  // 8
  [
    { id: 'arcoP3', goal: 1, val: (st) => st.arcsByTramo[2] || 0 },
    { id: 'sinCaerP3', goal: 1, val: (st) => paginaLimpia(st, 2) },
    { id: 'cajas15', goal: 15, val: (st) => st.passed.caja },
  ],
  // 9
  [
    { id: 'piezas50', goal: 50, val: (st) => st.maxPieces },
    { id: 'arcos5', goal: 5, val: (st) => st.arcs },
    { id: 'ambarLimpia', goal: 1, val: (st) => (st.amber >= 1 && paginaLimpia(st, 1) ? 1 : 0) },
  ],
  // 10
  [
    { id: 'sinCaerP4', goal: 1, val: (st) => paginaLimpia(st, 3) },
    { id: 'cajas20', goal: 20, val: (st) => st.passed.caja },
    { id: 'metaRacha7', goal: 1, val: (st) => (st.finished && st.maxCombo >= 7 ? 1 : 0) },
  ],
];
export const NOTAS = NIVELES.flat();
export const NIVEL_MAX = NIVELES.length;

// Sellos de partida (DISENO §4): además de uno por encargo cumplido.
export const SELLOS = [
  { id: 'llegue', ok: (st) => st.finished },
  { id: 'sinCaerme', ok: (st) => st.finished && st.crashes === 0 },
  { id: 'coleccionista', ok: (st) => st.finished && st.pieceTotal > 0 && st.maxPieces >= 0.8 * st.pieceTotal },
  { id: 'arcos3', ok: (st) => st.arcs >= 3 },
];

// Día 2: un sello por nivel completo. Se deriva de las notas (no se guarda aparte): lo guardado no cambia de forma
// y la migración v1/v2 sigue igual.
export const TOTAL_SELLOS = NOTAS.length + SELLOS.length + NIVEL_MAX;
const NOTA_IDS = new Set(NOTAS.map((n) => n.id));
const SELLO_IDS = new Set(SELLOS.map((s) => s.id));
// v1 -> v2: lo ya cumplido se conserva aunque cambie la condición. 'Pasa 3 vigas' no estaba garantizado; queda como 'Pasa 2 vigas'.
const DE_V1 = { vigas3: 'vigas2' };

// Lo guardado puede venir roto, viejo (v1) o de otra versión: se filtra a ids conocidos y nunca truena.
// Un v1 se sube a v2 la primera vez que se lee (si no se puede escribir, la sesión sigue con la copia en memoria).
export function leerCuaderno() {
  let d = null;
  try {
    d = JSON.parse(load(KEY, 'null'));
  } catch (e) {
    d = null;
  }
  if (!d || typeof d !== 'object') d = null;
  const v1 = !!d && d.v !== 2;
  const arr = (a, ok, map = {}) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string').map((x) => map[x] || x).filter((x) => ok.has(x)))] : []);
  const c = { notas: arr(d && d.notas, NOTA_IDS, v1 ? DE_V1 : {}), sellos: arr(d && d.sellos, SELLO_IDS) };
  if (v1 && (c.notas.length || c.sellos.length)) guardar(c);
  return c;
}

function guardar(c) {
  save(KEY, JSON.stringify({ v: 2, notas: c.notas, sellos: c.sellos }));
}

// Nivel de Moki = niveles completos + 1 (tope NIVEL_MAX; completo = los 10 hechos).
export function nivelDe(c) {
  let n = 0;
  while (n < NIVEL_MAX && NIVELES[n].every((e) => c.notas.includes(e.id))) n += 1;
  return { nivel: Math.min(n + 1, NIVEL_MAX), completo: n >= NIVEL_MAX, hechos: n };
}

export const activas = (c) => {
  const { hechos } = nivelDe(c);
  return hechos >= NIVEL_MAX ? [] : NIVELES[hechos].filter((n) => !c.notas.includes(n.id));
};

// Sellos que lleva el Cuaderno: uno por encargo, los de partida y uno por nivel completo
export const contarSellos = (c) => c.notas.length + c.sellos.length + nivelDe(c).hechos;

// Tachado a media partida (Día 2): los encargos que esta partida puede cumplir (los activos del nivel con que
// empezó). Solo se lee al empezar; la escena avisa cuando uno llega a su meta y revisar() lo guarda al caer o llegar.
export function porTachar(st) {
  const c = leerCuaderno();
  return Number.isInteger(st.nivel) && nivelDe(c).hechos === st.nivel ? activas(c) : [];
}

// nivel = índice del nivel abierto al empezar: una partida solo cumple encargos de ese nivel (un nivel por partida,
// como Alto's). El set nuevo cuenta desde la siguiente partida; si no, una partida buena vaciaba el Cuaderno entero.
export function nuevaPartida() {
  return { passed: { caja: 0, torre: 0, viga: 0 }, maxTramo: 0, maxCombo: 0, maxPieces: 0, arcs: 0, arcsByTramo: {}, amber: 0, crashes: 0, crashesByTramo: {}, finished: false, pieceTotal: 0, nivel: nivelDe(leerCuaderno()).hechos };
}

// Revisa la partida contra los encargos activos del nivel con que empezó y los sellos de partida.
// Devuelve la tira: activos con avance (los de un nivel recién abierto salen en cero), lo nuevo de esta revisión y el nivel.
export function revisar(st) {
  const c = leerCuaderno();
  const antes = nivelDe(c).hechos;
  const abierto = Number.isInteger(st.nivel) ? st.nivel : antes;
  const nuevasNotas = [];
  for (;;) {
    const hecha = nivelDe(c).hechos === abierto && activas(c).find((n) => n.val(st) >= n.goal);
    if (!hecha) break;
    c.notas.push(hecha.id);
    nuevasNotas.push(hecha.id);
  }
  const nuevosSellos = SELLOS.filter((s) => !c.sellos.includes(s.id) && s.ok(st)).map((s) => s.id);
  c.sellos.push(...nuevosSellos);
  if (nuevasNotas.length || nuevosSellos.length) guardar(c);
  const nv = nivelDe(c);
  return {
    activas: activas(c).map((n) => ({ id: n.id, goal: n.goal, val: nv.hechos === abierto ? Math.min(n.goal, n.val(st)) : 0 })),
    nuevasNotas,
    nuevosSellos,
    total: contarSellos(c),
    de: TOTAL_SELLOS,
    nivel: nv.nivel,
    completo: nv.completo,
    subio: nv.hechos > antes, // Moki subió de nivel en esta revisión
    selloNivel: nv.hechos > antes ? nv.hechos : 0, // sello del nivel recién completo (1-10), 0 si no hubo
  };
}
