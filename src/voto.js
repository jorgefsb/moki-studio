// P3c VOTO DEL DÍA (propuestas/p3c-voto.md): liga al tablero de ideas del sitio. Aquí no se vota ni se guarda nada
// de la persona: solo el día en que se enseñó la liga al final y cuántas veces seguidas no se tocó. El menú la trae siempre.
import { load, save } from './storage.js';
import { diaLocal } from './racha.js';
import { ESCAPARATE } from './escaparate.js';

const liga = (desde) => `https://moki.jorgesuarez.com.mx/ideas/?desde=juego-${desde}`;

let partidas = 0; // partidas empezadas en esta visita (memoria, como el contador)
export const contarPartida = () => partidas++;

// Al final: desde la 2.ª partida de la visita, una vez al día. 3 veces sin tocarla: el final la apaga 7 días.
// moki.voto = "dia:ign" (dia = diaLocal). Sin localStorage no sale (no sabría que ya salió hoy).
export function votoFinal() {
  if (ESCAPARATE || partidas < 2) return null;
  try {
    localStorage.getItem('moki.voto');
  } catch {
    return null;
  }
  const [dia, ign] = (load('moki.voto') || '0:0').split(':').map(Number);
  const hoy = diaLocal();
  if (dia === hoy || (ign >= 3 && hoy - dia < 7)) return null;
  save('moki.voto', `${hoy}:${ign >= 3 ? 1 : ign + 1}`); // cuenta como no tocada hasta el clic
  return { href: liga('fin'), onClick: () => save('moki.voto', `${hoy}:0`) };
}

export const votoMenu = () => (ESCAPARATE ? null : { href: liga('menu') });
