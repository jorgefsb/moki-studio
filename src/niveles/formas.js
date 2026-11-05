// Formas de página (previz/mundo-que-cambia/D2-gramatica.md, corte 1a): cada página de Libre sortea el orden de sus
// fases en vez de tener la calma, la subida, el pico y el respiro siempre en el mismo segundo. El sorteo usa su propia
// semilla (seed:forma), así que no mueve el azar de los bloques. Apagado no se llama nada de aquí.
import { rng, hashSeed } from './rng.js';

// Interruptor por modo y fecha. libre: true o false. reto: fecha AAAA-MM-DD desde la que entra, o null.
export const INTERRUPTOR = { libre: false, reto: null };
export const formasActivas = (seed, modo) => (modo === 'libre' ? INTERRUPTOR.libre : modo === 'reto' && !!INTERRUPTOR.reto && /^\d{4}-\d\d-\d\d$/.test(seed) && seed >= INTERRUPTOR.reto);

// Un valor al azar de a a b en pasos de 0.25 s
const c = (r, a, b) => a + Math.floor(r() * ((b - a) * 4 + 1)) / 4;
const TOPE_PICO = 25; // el trampolín del respiro pide empezar a más tardar en el 25

// Cada forma da [fase, hasta] en s de la página. El aire no lleva decisiones entre sus dos orillas.
const FORMAS = {
  // la de hoy: una sola subida y un solo pico, sin aire
  cuesta(r) {
    const pico = c(r, 12, 16);
    return [['suave', c(r, 3, 5)], ['subida', pico], ['pico', Math.min(TOPE_PICO, pico + c(r, 9, 10))], ['suave', 30]];
  },
  // aire real en medio: un pico corto, 4 s de aire y el pico largo
  dosPicos(r) {
    const aire = c(r, 11.5, 14);
    return [['suave', c(r, 3, 4.5)], ['subida', aire - c(r, 4, 5)], ['pico', aire], ['aire', aire + 4], ['pico', Math.min(TOPE_PICO, aire + 4 + c(r, 6.5, 7.5))], ['suave', 30]];
  },
  // 3 tandas cortas con 3 s de aire entre ellas
  rafagas(r) {
    const a1 = c(r, 7.5, 9.5);
    const t2 = a1 + 3 + c(r, 4.5, 5.5);
    return [['suave', c(r, 2.5, 3.5)], ['subida', a1], ['aire', a1 + 3], ['pico', t2], ['aire', t2 + 3], ['pico', Math.min(TOPE_PICO, t2 + 3 + c(r, 4, 5))], ['suave', 30]];
  },
};
// T1 conserva sus 12 s de tutorial y sortea entre 2 finales, sin aire: el aire va en 2 o 3 páginas, de T2 a T4
const FINALES_T1 = {
  cuesta: (r) => [['subida', c(r, 13, 15)], ['pico', c(r, 22, 24.5)], ['suave', 30]],
  temprano: (r) => [['pico', c(r, 17, 19)], ['subida', c(r, 22, 24)], ['suave', 30]],
};

// Nunca la misma forma dos páginas seguidas, ni más de una Cuesta por partida
const NOMBRES = Object.keys(FORMAS);
const ORDENES = NOMBRES.flatMap((a) => NOMBRES.flatMap((b) => NOMBRES.map((d) => [a, b, d]))).filter(([a, b, d]) => a !== b && b !== d && [a, b, d].filter((n) => n === 'cuesta').length <= 1);

// Las formas de una partida, de T1 a T4
export function formasDePartida(seed) {
  const r = rng(hashSeed(`${seed}:forma`));
  const finales = Object.keys(FINALES_T1);
  return [finales[Math.floor(r() * finales.length)], ...ORDENES[Math.floor(r() * ORDENES.length)]];
}

// Las fases de una página. Cambian con el intento: si una no pasa el validador, se prueba otra con la misma forma.
export function fasesDeForma(seed, tramo, intento, nombre) {
  const r = rng(hashSeed(`${seed}:forma:${tramo}:${intento}`));
  return (tramo === 1 ? FINALES_T1 : FORMAS)[nombre](r);
}
