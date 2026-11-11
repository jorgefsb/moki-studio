// P3c VOTO DEL DÍA (propuestas/p3c-voto.md): liga al tablero de ideas del sitio. Aquí no se vota ni se guarda nada
// de la persona: solo el día en que se enseñó la liga al final y cuántas veces seguidas no se tocó. El menú la trae siempre.
import { ESCAPARATE } from './escaparate.js';

const liga = (desde) => `https://moki.jorgesuarez.com.mx/ideas/?ref=juego&desde=juego-${desde}`;

let partidas = 0; // partidas empezadas en esta visita (memoria, como el contador)
export const contarPartida = () => partidas++;

// P28 (Jorge, 11-nov): el voto va siempre en la tarjeta final y en la de fallo, arriba del pliegue
export const votoTarjeta = (desde) => (ESCAPARATE ? null : { href: liga(desde) });

export const votoMenu = () => (ESCAPARATE ? null : { href: liga('menu') });
