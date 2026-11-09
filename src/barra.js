// P3b SIEMPRE HAY ALGO CERCA (Jorge 8-nov 23:41: "pierdo y pierdo, me aburro, me vale lo que haya en el 9").
// Perder también avanza: cada intento (aunque choque) suma sus metros y sus piezas a una barra que se guarda entre
// partidas. Al llenarse abre el siguiente regalo de la lista aunque el Cuaderno no haya llegado a su nivel; luego
// se vacía y apunta al que sigue. Un regalo también se abre por su nivel del Cuaderno, como antes. Solo lee la
// partida: no toca física, semilla ni puntaje (Clásico, Reto y bots intactos).
import { load, save } from './storage.js';
import { CONFIG as C } from './config.js';
import { leerCuaderno, nivelDe } from './cuaderno.js';

const KEY = 'moki.barra';

// Orden = orden del Cuaderno. ir = liga 'Pruébalo' (ley de la última versión); sin liga se ve en cualquier partida.
export const REGALOS = [
  { id: 'tramp', nivel: () => C.tramp.nivel, ir: 'trampolin' },
  { id: 'pasos', nivel: () => 4 },
  { id: 'viento', nivel: () => C.viento.nivel, ir: 'viento' },
  { id: 'timbre', nivel: () => C.timbre.nivel, ir: 'timbre' },
  { id: 'estela', nivel: () => 8 },
];

// P5c (director 9-nov): lo ya hecho se juega en el Cuaderno. Mecánicas del Reto según el nivel.
// P5c2 (director 9-nov 12:52): el nivel 1 ya trae el trampolín por su fecha, así que N3 = trampolín era igual a N1.
// Ahora cada estreno sale SOLO (sin el trampolín de la fecha) y el nivel siguiente lo combina con lo ya visto:
// N1 trampolín (fecha, idéntico), N2 zanja, N3 viento, N4 zanja+tramp, N5 viento+tramp, N6 las tres,
// N7 (C.timbre.nivel) timbre, N8-10 todo. En Libre los regalos siguen abriendo por C.*.nivel (sin cambio).
const RETO_NIVELES = [[], [], ['zanja'], ['viento'], ['zanja', 'tramp'], ['viento', 'tramp'], ['zanja', 'tramp', 'viento']];
export function mecanicasDeNivel(nv) {
  if (nv === C.timbre.nivel) return ['timbre'];
  if (nv > C.timbre.nivel) return ['zanja', 'tramp', 'viento', 'timbre'];
  return RETO_NIVELES[Math.max(0, Math.min(nv, RETO_NIVELES.length - 1))] || [];
}
// Estreno = una sola mecánica en el nivel: sale sin las de la fecha
export const estrenoSolo = (mec) => mec.length === 1;

function leer() {
  let d = null;
  try {
    d = JSON.parse(load(KEY, 'null'));
  } catch (e) {
    d = null;
  }
  const pts = d && Number.isFinite(d.pts) ? Math.max(0, d.pts) : 0;
  const abiertos = d && Array.isArray(d.abiertos) ? d.abiertos.filter((x) => REGALOS.some((r) => r.id === x)) : [];
  return { pts, abiertos };
}

// ¿Está abierto? Por nivel del Cuaderno o por la barra.
export function abierto(id, nv = nivelDe(leerCuaderno()).nivel) {
  const r = REGALOS.find((g) => g.id === id);
  return !!r && (nv >= r.nivel() || leer().abiertos.includes(id));
}

// Siguiente regalo cerrado (null si ya están todos) y cuánto le falta a la barra.
export function siguiente() {
  const nv = nivelDe(leerCuaderno()).nivel;
  const b = leer();
  const r = REGALOS.find((g) => !(nv >= g.nivel() || b.abiertos.includes(g.id)));
  if (!r) return null;
  const falta = Math.max(0, C.barra.meta - b.pts);
  return { id: r.id, ir: r.ir, pts: b.pts, meta: C.barra.meta, faltaM: Math.ceil(falta), faltaP: Math.ceil(falta / C.barra.porPieza) };
}

// Suma un intento: metros + piezas x porPieza. Devuelve el id del regalo que se abrió (o null).
export function sumar(metros, piezas) {
  const pts = Math.max(0, metros) + Math.max(0, piezas) * C.barra.porPieza;
  if (!(pts > 0)) return null;
  const s = siguiente();
  if (!s) return null;
  const b = leer();
  b.pts = Math.round(b.pts + pts);
  let abrio = null;
  if (b.pts >= C.barra.meta) {
    b.abiertos.push(s.id);
    b.pts = 0; // lo que sobra no se arrastra: cada regalo se gana con su barra entera
    abrio = s.id;
  }
  save(KEY, JSON.stringify(b));
  return abrio;
}
