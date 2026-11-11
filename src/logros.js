// P7 LOGROS VISIBLES (Jorge 8-nov 23:32: "¿logros? no veo nada"): lo que el jugador ya ganó, a la vista.
// Casi todo se DERIVA de lo que ya existe (sellos de partida y nivel del Cuaderno en `moki.cuaderno`, nada se migra
// ni se pierde). Lo único propio va en `moki.logros`: 'todas' (100% de piezas), la cuenta del Reto en días seguidos,
// qué logros ya se avisaron (aviso con juice una sola vez) y cuáles ya vio en la pantalla (etiqueta "Nuevo" del menú).
// Sin cuenta regresiva ni culpa (gate de Hooked, DECISIONES 31-oct 14:55): faltante = pista en lápiz, nada más.
import { load, save } from './storage.js';
import { leerCuaderno, nivelDe } from './cuaderno.js';

const KEY = 'moki.logros';

// Orden = de lo más fácil a lo más largo: el primero sin ganar es "el que sigue".
// gana(c, l) con c = Cuaderno leído y l = estado propio.
export const LOGROS = [
  { id: 'llegue', gana: (c) => c.sellos.includes('llegue') },
  { id: 'arcos3', gana: (c) => c.sellos.includes('arcos3') },
  { id: 'sinCaerme', gana: (c) => c.sellos.includes('sinCaerme') },
  { id: 'coleccionista', gana: (c) => c.sellos.includes('coleccionista') },
  { id: 'todas', gana: (c, l) => l.ganados.includes('todas') },
  { id: 'reto3', gana: (c, l) => l.ganados.includes('reto3') },
  { id: 'nivel5', gana: (c) => nivelDe(c).hechos >= 4 },
  { id: 'cuaderno', gana: (c) => nivelDe(c).completo },
  { id: 'mega15', gana: (c, l) => l.ganados.includes('mega15') }, // P8: llegar a la meta en MODO MEGA x1.5
  { id: 'mega20', gana: (c, l) => l.ganados.includes('mega20') }, // P8b: llegar a la meta en MODO MEGA x2.0
];
const IDS = new Set(LOGROS.map((x) => x.id));

function leerPropio() {
  let d = null;
  try {
    d = JSON.parse(load(KEY, 'null'));
  } catch (e) {
    d = null;
  }
  const arr = (a) => (Array.isArray(a) ? a.filter((x) => IDS.has(x)) : []);
  const ent = (x) => (Number.isInteger(x) ? x : null);
  if (!d || typeof d !== 'object') return { nuevo: true, ganados: [], avisados: [], vistos: [], retoDia: null, retoN: 0 };
  return { nuevo: false, ganados: arr(d.ganados), avisados: arr(d.avisados), vistos: arr(d.vistos), retoDia: ent(d.retoDia), retoN: ent(d.retoN) || 0 };
}

export function guardar(l) {
  save(KEY, JSON.stringify({ v: 1, ganados: l.ganados, avisados: l.avisados, vistos: l.vistos, retoDia: l.retoDia, retoN: l.retoN }));
}

// Estado completo: lista con ganado/sigue, cuántos, y si hay ganados sin ver ("Nuevo" en el menú).
// Primera lectura de alguien con sellos de antes: lo ya ganado cuenta como avisado (no le salta un aviso viejo a media
// partida) pero NO como visto, así el menú le enseña "Nuevo" y descubre la pantalla.
export function leerLogros() {
  const c = leerCuaderno();
  const l = leerPropio();
  const lista = LOGROS.map((x) => ({ id: x.id, ganado: !!x.gana(c, l) }));
  if (l.nuevo) {
    l.avisados = lista.filter((x) => x.ganado).map((x) => x.id);
    l.nuevo = false;
    guardar(l); // siempre: si no, el primer logro de un jugador nuevo se tomaría como "de antes" y no se avisaría
  }
  const sigue = lista.find((x) => !x.ganado);
  if (sigue) sigue.sigue = true;
  const ganados = lista.filter((x) => x.ganado);
  return { lista, n: ganados.length, de: lista.length, sinVer: ganados.some((x) => !l.vistos.includes(x.id)), l };
}

// marcarVistos, revisarLogros y contarReto viven en ui/logrosUi.js (diferido): el JS inicial solo lee para el menú.
