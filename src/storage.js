// localStorage seguro: modo privado o sitio bloqueado no rompen el juego (UX.md, persistencia con try/catch).
const mem = {};

export function load(key, fallback = null) {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? (key in mem ? mem[key] : fallback) : v;
  } catch (e) {
    return key in mem ? mem[key] : fallback;
  }
}

export function save(key, value) {
  mem[key] = String(value);
  try {
    window.localStorage.setItem(key, String(value));
  } catch (e) {
    // sin almacenamiento: la sesión sigue con la copia en memoria
  }
}

export const num = (key, fallback = 0) => {
  const n = Number(load(key, fallback));
  return Number.isFinite(n) ? n : fallback;
};
