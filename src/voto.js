// P3c VOTO DEL DÍA (propuestas/p3c-voto.md): liga al tablero de ideas del sitio. Aquí no se vota ni se guarda nada
// de la persona: solo cuándo se enseñó la liga al final y si se tocó. El menú la trae siempre.
import { load, save } from './storage.js';
import { diaLocal } from './racha.js';
import { ESCAPARATE } from './escaparate.js';

const IDEAS = 'https://moki.jorgesuarez.com.mx/ideas/';
export const ligaIdeas = (desde) => `${IDEAS}?desde=${desde}`;

let partidas = 0; // partidas empezadas en esta visita (memoria, como el contador)
export const contarPartida = () => (partidas += 1);

const leer = () => {
  try {
    const v = JSON.parse(load('moki.voto') || '{}');
    return { dia: v.dia | 0, clic: !!v.clic, ign: v.ign | 0 };
  } catch {
    return { dia: 0, clic: false, ign: 0 };
  }
};
const guardar = (v) => save('moki.voto', JSON.stringify(v));

const hayStorage = () => {
  try {
    localStorage.setItem('moki.voto.t', '1');
    localStorage.removeItem('moki.voto.t');
    return true;
  } catch {
    return false;
  }
};

// Al final: desde la 2.ª partida de la visita, una vez al día. 3 veces sin tocarla: el final la apaga 7 días.
// Regresa { href, onClick } o null. Marca el día al enseñarla.
export function votoFinal() {
  if (ESCAPARATE || partidas < 2 || !hayStorage()) return null;
  const v = leer();
  const hoy = diaLocal();
  if (v.dia === hoy) return null;
  if (v.ign >= 3 && hoy - v.dia < 7) return null;
  const ign = v.ign >= 3 ? 1 : v.ign + 1; // se cuenta como ignorada hasta que haya clic
  guardar({ dia: hoy, clic: false, ign });
  return { href: ligaIdeas('juego-fin'), onClick: () => guardar({ dia: hoy, clic: true, ign: 0 }) };
}

export const votoMenu = () => (ESCAPARATE ? null : { href: ligaIdeas('juego-menu') });
