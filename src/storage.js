// localStorage seguro: modo privado o sitio bloqueado no rompen el juego (UX.md, persistencia con try/catch).
const mem = {};

// ?escaparate (pantalla de Jorge, BITACORA 31-oct 15:10): todo vive en memoria; nunca lee ni escribe el localStorage
// del jugador (cuaderno, racha, marcas y opciones quedan intactos).
export const SOLO_MEMORIA = new URLSearchParams(window.location.search).has('escaparate');

export function load(key, fallback = null) {
  if (SOLO_MEMORIA) return key in mem ? mem[key] : fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? (key in mem ? mem[key] : fallback) : v;
  } catch (e) {
    return key in mem ? mem[key] : fallback;
  }
}

export function save(key, value) {
  mem[key] = String(value);
  if (SOLO_MEMORIA) return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch (e) {
    // sin almacenamiento: la sesión sigue con la copia en memoria
  }
}

// Solo para el escaparate: borra la memoria y la deja con un estado inventado (cada vuelta del guion empieza igual).
export function sembrarMemoria(estado) {
  if (!SOLO_MEMORIA) return;
  Object.keys(mem).forEach((k) => delete mem[k]);
  Object.entries(estado).forEach(([k, v]) => (mem[k] = String(v)));
}

export const num = (key, fallback = 0) => {
  const n = Number(load(key, fallback));
  return Number.isFinite(n) ? n : fallback;
};
