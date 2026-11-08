// MÚSICA QUE CAMBIA pieza 1 (antirrepetición, sin tema nuevo). La vuelta 0 es el tema tal cual. Desde la vuelta 1,
// cada compás cambia algunas notas por la nota del acorde vecina (arriba o abajo, en la misma rejilla y con el mismo
// largo) y a veces deja un respiro. La forma A B A' B', los acordes, las voces y los pickups (compases 16 y 32) no cambian.
// Con la semilla de la partida y la vuelta, ningún tramo de 8 compases vuelve a sonar igual en la sesión.
import { MELODY, CHORD_OF_BAR, CHORDS } from './theme.js';
import { CONFIG as C } from '../config.js';

const PICKUP = [15, 31]; // llevan al compás siguiente: se quedan tal cual

// mulberry32: números repetibles por semilla
function rng(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Nota del acorde más cercana a midi, hacia arriba (up) o hacia abajo, sin salir de Do5..Sol6
function vecina(midi, pcs, up) {
  for (let d = 1; d < 12; d++) {
    const n = midi + (up ? d : -d);
    if (pcs.includes(n % 12)) return n >= 72 && n <= 91 ? n : vecina(midi, pcs, !up);
  }
  return midi;
}

// Melodía de una vuelta: arreglo de 32 compases con sus notas [paso, midi, largo]
export function melodia(vuelta, seed) {
  if (!vuelta) return MELODY.map((m) => m.notes);
  return MELODY.map((m, b) => {
    if (PICKUP.includes(b)) return m.notes;
    const r = rng(seed ^ (vuelta * 9973) ^ (b * 131));
    const pcs = CHORDS[CHORD_OF_BAR[b]][2].map((n) => n % 12);
    const fuerza = (b + vuelta) % 2 === 0; // la mitad de los compases cambia sí o sí: nada de tramos casi iguales
    const out = m.notes.map(([st, midi, len], i) => (i && (r() < C.audio.variar || (fuerza && i === 1)) ? [st, vecina(midi, pcs, r() < 0.5), len] : [st, midi, len]));
    // respiro: quita una nota de en medio (nunca la primera ni la última)
    if (out.length > 3 && r() < C.audio.respiro) out.splice(1 + Math.floor(r() * (out.length - 2)), 1);
    return out;
  });
}

