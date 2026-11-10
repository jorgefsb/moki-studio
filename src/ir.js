// LO NUEVO SE JUEGA (canon de Jorge 8-nov 21:56): ligas directas ?ir=<destino> que abren la partida donde vive lo nuevo,
// sin jugar horas ni subir el Cuaderno. La partida de una liga vive en memoria (storage.js SOLO_MEMORIA): nunca toca el
// Cuaderno, la racha ni las marcas guardadas del jugador. El botón "Pruébalo" del cartel "Lo nuevo de hoy" usa estas ligas.
// Sin imports a propósito: storage.js lo lee al cargar.
//   modo: 'reto' | 'libre' · tramo: página donde arranca (0-3) · nivel: nivel del Cuaderno de la partida (null = el del jugador)
//   mec: mecánicas que Libre destraba aunque el Cuaderno no llegue (trampolín 3, viento 5, timbre 9)
export const DESTINOS = {
  nivel1: { modo: 'reto', tramo: 0, nivel: 1 }, // nodo 1 de la Ruta: el atardecer del nivel 1
  nivel2: { modo: 'reto', tramo: 0, nivel: 2 }, // la hora vuelve a moverse: día, tarde y noche
  noche: { modo: 'reto', tramo: 3, nivel: 2 }, // la noche del nivel 2 (estrella de papel, faroles)
  libre: { modo: 'libre', tramo: 0, nivel: null },
  reto: { modo: 'reto', tramo: 0, nivel: null },
  ciudad: { modo: 'libre', tramo: 1, nivel: 1 }, // paisaje Ciudad de cartón: página 2 de Libre en el nivel 1
  trampolin: { modo: 'libre', tramo: 1, nivel: null, mec: ['tramp'] },
  viento: { modo: 'libre', tramo: 1, nivel: null, mec: ['viento'] },
  timbre: { modo: 'libre', tramo: 1, nivel: null, mec: ['timbre'] },
  zanja: { modo: 'reto', tramo: 1, nivel: 2, mec: ['zanja'] }, // P5c: primer nivel del Cuaderno con mecánica nueva (Reto nivel 2)
  formas: { modo: 'reto', tramo: 0, nivel: null }, // formas de página: Libre siempre y el Reto desde hoy
  // P3e (7): Libre escoge paisaje. Fila del nivel 1 del mapa de arte (paisajes.js RUTA[0]): Atardecer, Ciudad, Playa, Noche
  'libre-atardecer': { modo: 'libre', tramo: 0, nivel: 1 },
  'libre-playa': { modo: 'libre', tramo: 2, nivel: 1 },
  'libre-noche': { modo: 'libre', tramo: 3, nivel: 1 },
};
const ALIAS = { tramp: 'trampolin', 'trampolín': 'trampolin', campana: 'timbre', 'libre-ciudad': 'ciudad' };

// Encargos del nivel 1 del Cuaderno (cuaderno.js NIVELES[0]); hechos = nivel 2. Copiados para no importar cuaderno.js aquí.
const NIVEL1 = ['cajas3', 'cajas5', 'piezas15'];

const pide = (() => {
  try {
    const v = (new URLSearchParams(window.location.search).get('ir') || '').toLowerCase();
    return ALIAS[v] || v;
  } catch (e) {
    return '';
  }
})();

export const IR = Object.hasOwn(DESTINOS, pide) ? { id: pide, ...DESTINOS[pide] } : null;
// P7: ?ir=logros no es una partida: abre la pantalla de Logros con lo guardado del propio jugador (no pasa a memoria).
export const IR_PANTALLA = pide === 'logros' ? 'logros' : null;

// Estado con el que nace la memoria de una liga: sin tutorial ni partida clásica obligatoria, en el modo del destino
// y, si el destino lo pide, en ese nivel del Cuaderno. Lo demás (sonido, juice, Cuaderno propio) se copia del jugador.
export function estadoIr(guardado) {
  if (!IR) return {};
  const e = { ...guardado, 'moki.primera': '1', 'moki.tutorial': '1', 'moki.modo': IR.modo, 'moki.paseo': '0', 'moki.vuelta': '0' };
  if (IR.nivel === 1) e['moki.cuaderno'] = JSON.stringify({ v: 2, notas: [], sellos: [] });
  if (IR.nivel === 2) e['moki.cuaderno'] = JSON.stringify({ v: 2, notas: NIVEL1, sellos: [] });
  return e;
}
