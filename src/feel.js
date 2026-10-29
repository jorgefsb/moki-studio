// Game feel (FEEL.md): nivel de juice que elige el jugador y háptica en móvil.
// El juice es solo visual y háptico: no toca física, hitboxes, tiempos ni sonido (el sonido va aparte, decisión del líder).
import { CONFIG as C } from './config.js';
import { load, save } from './storage.js';

const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarse = window.matchMedia('(pointer: coarse)').matches;
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const JUICE_NAMES = ['nada', 'poquito', 'mucho', 'hardcore'];

export const feel = {
  gestured: false, // la háptica solo después del primer gesto (los navegadores la bloquean antes)
  hardcoreOpen() {
    return load('moki.done') === '1';
  },
  // Nivel efectivo: el guardado, sin Hardcore si aún está cerrado.
  get level() {
    return C.juice;
  },
  setLevel(l) {
    C.juice = l;
    save('moki.juice', l);
    document.documentElement.dataset.juice = String(l);
  },
  // Menú: Nada, Poquito, Mucho y Hardcore (si ya se abrió)
  cycle() {
    const top = this.hardcoreOpen() && !mq.matches ? 3 : 2;
    this.setLevel(C.juice >= top ? 0 : C.juice + 1);
    return C.juice;
  },
  // Háptica corta: Poquito no vibra, Mucho vibra en momentos importantes y Hardcore también en lo chico.
  // minLevel: nivel mínimo para que suene. Movimiento reducido la apaga.
  buzz(pattern, minLevel = 2) {
    // Poquito nunca vibra (decisión del director): el mínimo es Mucho
    if (!canVibrate || !coarse || !this.gestured || mq.matches || C.juice < Math.max(2, minLevel)) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // sin háptica: no pasa nada
    }
  },
};

// Nivel guardado al arrancar (Hardcore solo si ya llegó a la meta)
{
  const saved = Number(load('moki.juice', C.juice));
  if (Number.isInteger(saved) && saved >= 0 && saved <= 3) C.juice = saved === 3 && !feel.hardcoreOpen() ? 2 : saved;
  document.documentElement.dataset.juice = String(C.juice);
}
window.addEventListener('pointerdown', () => (feel.gestured = true), { once: true, capture: true });
window.addEventListener('keydown', () => (feel.gestured = true), { once: true, capture: true });
