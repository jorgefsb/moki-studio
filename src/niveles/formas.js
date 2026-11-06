// Formas de página (previz/mundo-que-cambia/D2-gramatica.md, corte 1a): cada página de Libre sortea el orden de sus
// fases en vez de tener la calma, la subida, el pico y el respiro siempre en el mismo segundo. El sorteo usa su propia
// semilla (seed:forma), así que no mueve el azar de los bloques. Apagado no se llama nada de aquí.
import { rng, hashSeed } from './rng.js';

// Interruptor por modo y fecha. libre: true o false. reto: fecha AAAA-MM-DD desde la que entra, o null. Para apagar: { libre: false, reto: null }.
export const INTERRUPTOR = { libre: true, reto: null };
export const formasActivas = (seed, modo) => (modo === 'libre' ? INTERRUPTOR.libre : modo === 'reto' && !!INTERRUPTOR.reto && /^\d{4}-\d\d-\d\d$/.test(seed) && seed >= INTERRUPTOR.reto);

// Un valor al azar de a a b en pasos de 0.25 s
const c = (r, a, b) => a + Math.floor(r() * ((b - a) * 4 + 1)) / 4;
const TOPE_PICO = 25; // el trampolín del respiro pide empezar a más tardar en el 25
// Tanda (corte 1a2): huecos de min a max s entre decisiones. Un hueco de hasta deja s se queda como está (partirlo daría < 1 s)
export const TANDA = { min: 1.2, max: 1.6, deja: 2 };

// Cada forma da [fase, hasta, tanda] en s de la página. El aire no lleva decisiones entre sus dos orillas.
const FORMAS = {
  // tarde: nada apretado hasta la tanda larga del final
  cuesta(r) {
    const pico = c(r, 15, 17);
    return [['suave', c(r, 4, 6)], ['subida', pico], ['pico', Math.min(TOPE_PICO, pico + c(r, 7, 8)), true], ['suave', 30]];
  },
  // temprano: tanda corta, 4.25 s de aire y un segundo pico sin apretar
  dosPicos(r) {
    const ini = c(r, 5, 6.5);
    const aire = ini + c(r, 5, 6);
    return [['suave', c(r, 2.5, 3.5)], ['subida', ini], ['pico', aire, true], ['aire', aire + 4.25], ['pico', Math.min(TOPE_PICO, aire + 4.25 + c(r, 5, 6.5))], ['suave', 30]];
  },
  // 3 tandas cortas con 3 s de aire entre ellas
  rafagas(r) {
    const a1 = c(r, 8, 9.5);
    const t2 = a1 + 3 + c(r, 4, 5);
    return [['suave', c(r, 2.5, 3.5)], ['subida', a1, true], ['aire', a1 + 3], ['pico', t2, true], ['aire', t2 + 3], ['pico', Math.min(TOPE_PICO, t2 + 3 + c(r, 4, 5)), true], ['suave', 30]];
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
