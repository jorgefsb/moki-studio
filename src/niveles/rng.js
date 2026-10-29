// Semillas de nivel. El azar es el mulberry32 que ya usa el fondo (art/palette.js): misma semilla, mismo nivel.
export { rng } from '../art/palette.js';

// Texto -> entero de 32 bits (FNV-1a): "2026-10-29" da la misma semilla en cualquier navegador.
export function hashSeed(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Fecha local AAAA-MM-DD: el Reto del día cambia a medianoche de quien juega.
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
