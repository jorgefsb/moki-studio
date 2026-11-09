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

// Notas del acorde hacia arriba (up) o hacia abajo desde midi, las dos más cercanas, entre Do5 y techo
function vecinas(midi, pcs, up, techo) {
  const out = [];
  for (let d = 1; d < 12 && out.length < 2; d++) {
    const n = midi + (up ? d : -d);
    if (pcs.includes(n % 12) && n >= 72 && n <= techo) out.push(n);
  }
  return out;
}

// Melodía de una vuelta: arreglo de 32 compases con sus notas [paso, midi, largo]
export function melodia(vuelta, seed) {
  if (!vuelta) return MELODY.map((m) => m.notes);
  return MELODY.map((m, b) => {
    if (PICKUP.includes(b)) return m.notes;
    const r = rng(seed ^ (vuelta * 9973) ^ (b * 131));
    const pcs = CHORDS[CHORD_OF_BAR[b]][2].map((n) => n % 12);
    const fuerza = (b + vuelta) % 2 === 0;
    const techo = m.aSection ? 88 : 91; // en A la capa 2 suma una octava: con 88 no pasa de 100
    const out = m.notes.map((x) => x.slice());
    // vecina válida: no repite la nota de al lado ni salta más de 7 semitonos; si ninguna sirve, queda la original
    const cambia = (i) => {
      const [, midi] = m.notes[i];
      const prev = out[i - 1][1];
      const sig = out[i + 1] && out[i + 1][1];
      const ok = (c) => c && c !== prev && c !== sig && Math.abs(c - prev) <= 7 && (!sig || Math.abs(sig - c) <= 7);
      const up = r() < 0.5;
      const a = vecinas(midi, pcs, up, techo);
      const z = vecinas(midi, pcs, !up, techo);
      const n = [a[0], z[0], a[1], z[1]].find(ok); // primero la vecina inmediata, luego la siguiente nota del acorde
      if (n) out[i][1] = n;
      return !!n;
    };
    let hubo = false;
    for (let i = 1; i < out.length; i++) if (r() < C.audio.variar) hubo = cambia(i) || hubo;
    // la mitad de los compases cambia sí o sí (la primera nota que pase las guardas): nada de tramos casi iguales
    // empieza en una nota distinta en cada vuelta: así las vueltas con los mismos compases forzados no coinciden
    const L = out.length - 1;
    for (let j = 0; fuerza && !hubo && j < L; j++) hubo = cambia(1 + ((j + vuelta) % L));
    // respiro: quita una nota corta de en medio (nunca la primera, la última ni una de 4 pasos o más)
    // y sin dejar juntas dos notas iguales o a más de 7 semitonos
    const cortas = out.map((x, i) => i).filter((i) => i && i < out.length - 1 && out[i][2] < 4 && out[i - 1][1] !== out[i + 1][1] && Math.abs(out[i - 1][1] - out[i + 1][1]) <= 7);
    if (out.length > 3 && cortas.length && r() < C.audio.respiro) out.splice(cortas[Math.floor(r() * cortas.length)], 1);
    return out;
  });
}

