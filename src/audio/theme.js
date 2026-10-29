// Tema "Un saltito más" (AUDIO.md §4). Solo datos: Do mayor, 96 BPM, 32 compases = 80 s, rejilla de 16 pasos por compás.
export const BPM = 96;
export const STEP = 60 / BPM / 4; // 0.15625 s
export const BAR_STEPS = 16;
export const BARS = 32;
export const LOOP_STEPS = BAR_STEPS * BARS; // 512
export const SKELETON = [0, 3, 6, 8, 11, 14]; // tresillo juguetón 3+3+2+3+3+2

// Cada nota es [paso, midi, largoEnPasos]
const A = [
  [[0, 76, 2], [3, 79, 2], [6, 84, 2], [8, 79, 2], [11, 76, 4]],
  [[0, 81, 2], [3, 79, 2], [6, 76, 2], [8, 72, 3], [12, 76, 2]],
  [[0, 81, 2], [3, 84, 2], [6, 81, 2], [8, 77, 3], [11, 81, 4]],
  [[0, 83, 2], [3, 86, 2], [6, 83, 2], [8, 79, 3], [12, 79, 1], [14, 83, 2]],
  [[0, 84, 3], [3, 83, 2], [6, 79, 2], [8, 76, 3], [11, 79, 4]],
  [[0, 81, 2], [3, 84, 2], [6, 88, 2], [8, 86, 2], [10, 84, 2], [12, 81, 3]],
  [[0, 81, 2], [3, 79, 2], [6, 77, 2], [8, 81, 3], [11, 84, 4]],
  [[0, 86, 2], [3, 83, 2], [6, 79, 4], [12, 74, 2], [14, 79, 2]],
];
const A24 = [[0, 86, 2], [3, 83, 2], [6, 79, 2], [8, 74, 2], [11, 79, 2], [14, 83, 2]];

const B = [
  [[0, 84, 4], [4, 81, 4], [8, 77, 4], [12, 81, 4]],
  [[0, 86, 4], [4, 83, 4], [8, 79, 4], [12, 83, 4]],
  [[0, 88, 4], [4, 83, 4], [8, 79, 4], [12, 83, 4]],
  [[0, 84, 4], [4, 88, 4], [8, 81, 3], [12, 84, 3]],
  [[0, 81, 2], [3, 84, 2], [6, 89, 2], [8, 88, 2], [10, 84, 2], [12, 81, 3]],
  [[0, 83, 2], [3, 86, 2], [6, 91, 2], [8, 89, 2], [10, 86, 2], [12, 83, 3]],
  [[0, 88, 4], [4, 84, 4], [8, 79, 4], [12, 76, 4]],
  [[0, 72, 6], [12, 72, 2], [14, 74, 2]], // pickup hacia el Mi5 del compás 17
];

const Bp = [
  [[0, 86, 2], [3, 81, 2], [6, 77, 2], [8, 81, 3], [11, 86, 4]],
  [[0, 83, 2], [3, 86, 2], [6, 79, 2], [8, 83, 3], [12, 89, 3]],
  [[0, 84, 2], [3, 88, 2], [6, 91, 2], [8, 88, 2], [12, 84, 4]],
  [[0, 86, 2], [3, 83, 2], [6, 79, 4], [12, 72, 2], [14, 74, 2]], // pickup Do5, Re5 hacia el Mi5 del compás 1
];

// Acordes por compás (1 a 32)
const PROG_A = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'];
const PROG_B = ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'];
const PROG_Bp = ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'G7'];
export const CHORD_OF_BAR = [...PROG_A, ...PROG_B, ...PROG_A, ...PROG_Bp];

// Melodía por compás y voz: 'carton' (A), 'cuadrada' (B, B'); 'a2' = A' (suma cuadrada a la misma altura en energía 2+)
export const MELODY = [];
for (let b = 0; b < BARS; b++) {
  let notes;
  let voice = 'carton';
  let layer2 = false;
  if (b < 8) notes = A[b];
  else if (b < 16) {
    notes = B[b - 8];
    voice = 'cuadrada';
  } else if (b < 24) {
    notes = b === 23 ? A24 : A[b - 16];
    layer2 = true;
  } else if (b < 28) {
    notes = B[b - 24];
    voice = 'cuadrada';
  } else {
    notes = Bp[b - 28];
    voice = 'cuadrada';
  }
  MELODY.push({ notes, voice, layer2, aSection: b < 8 || (b >= 16 && b < 24) });
}

// Bajo y acorde de pulso (4.3): [bajo, quinta, [acorde de abajo hacia arriba]]
export const CHORDS = {
  C: [48, 55, [60, 64, 67, 72]],
  Am: [45, 52, [57, 60, 64, 69]],
  F: [41, 48, [57, 60, 65, 69]],
  G: [43, 50, [59, 62, 67, 71]],
  Em: [40, 47, [59, 64, 67, 71]],
  Dm: [38, 45, [57, 62, 65, 69]],
  G7: [43, 50, [59, 62, 65, 67]],
};

// Grado mínimo de energía por tramo (0 = solo base) y por racha
export const TRAMO_LEVEL = [0, 1, 2, 3];
export const streakLevel = (n) => (n >= 6 ? 2 : n >= 3 ? 1 : 0);
// Pentatónica ascendente de las piezas (AUDIO §5): Do6, Re6, Mi6, Sol6, La6
export const PICKUP_SCALE = [84, 86, 88, 91, 93];
