// Racha con perdón (GDD §3): días jugados seguidos, contados por día LOCAL; 1 perdón por semana salva UN día perdido.
// Sin cuenta regresiva ni culpa: si la racha se rompe, Moki solo dice que le da gusto verte. Todo en localStorage.
// La lógica es pura (recibe el día) para probarla con reloj simulado; solo leer/registrar tocan el almacenamiento.
import { load, save } from './storage.js';

const KEY = 'moki.racha';
const PERDON_DIAS = 7; // el perdón se renueva 7 días después de usarse

// Día local como número entero (días desde 1970 en el calendario del jugador, sin horario de verano de por medio)
export const diaLocal = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);

const vacia = () => ({ ultimo: null, racha: 0, perdon: null });

// Lo guardado puede venir roto u otro formato: se limpia y nunca truena.
export function leerRacha() {
  let d = null;
  try {
    d = JSON.parse(load(KEY, 'null'));
  } catch (e) {
    d = null;
  }
  const ent = (x) => (Number.isInteger(x) ? x : null);
  if (!d || ent(d.ultimo) === null) return vacia();
  return { ultimo: d.ultimo, racha: Math.max(1, ent(d.racha) || 1), perdon: ent(d.perdon) };
}

const perdonListo = (st, hoy) => st.perdon === null || hoy - st.perdon >= PERDON_DIAS;

// Jugar el día `hoy`: mismo día no cambia nada; día siguiente suma; un día perdido con perdón listo suma y gasta el
// perdón; más hueco (o sin perdón) empieza de nuevo en 1. Reloj atrasado: se trata como el mismo día.
export function jugar(st, hoy) {
  if (st.ultimo === null) return { st: { ultimo: hoy, racha: 1, perdon: st.perdon }, cambio: 'nueva' };
  const gap = hoy - st.ultimo;
  if (gap <= 0) return { st, cambio: 'igual' };
  if (gap === 1) return { st: { ...st, ultimo: hoy, racha: st.racha + 1 }, cambio: 'sigue' };
  if (gap === 2 && perdonListo(st, hoy)) return { st: { ultimo: hoy, racha: st.racha + 1, perdon: hoy }, cambio: 'perdon' };
  return { st: { ...st, ultimo: hoy, racha: 1 }, cambio: 'vuelve' };
}

// Racha que verías hoy sin haber jugado aún (para el saludo del título): no guarda nada.
export function vistaHoy(st, hoy) {
  if (st.ultimo === null) return { racha: 0, tipo: 'nuevo' };
  const gap = hoy - st.ultimo;
  if (gap <= 1) return { racha: st.racha, tipo: gap <= 0 ? 'hoy' : 'sigue' };
  if (gap === 2 && perdonListo(st, hoy)) return { racha: st.racha, tipo: 'sigue' };
  return { racha: 0, tipo: 'vuelve' };
}

// Se llama al empezar una partida real (no el demo). Devuelve la racha ya contada con hoy.
export function registrarDia(hoy = diaLocal()) {
  const r = jugar(leerRacha(), hoy);
  if (r.cambio !== 'igual') save(KEY, JSON.stringify({ v: 1, ...r.st }));
  return r;
}

// Clave de i18n del saludo de Moki y su número; solo texto.
export function saludo(hoy = diaLocal()) {
  const v = vistaHoy(leerRacha(), hoy);
  if (v.tipo === 'nuevo') return { key: 'racha.hola.nuevo', n: 0 };
  if (v.tipo === 'vuelve') return { key: 'racha.hola.vuelve', n: 0 };
  // Si ya jugó hoy, la racha ya cuenta hoy; si no, hoy sería el día racha+1
  const n = v.tipo === 'hoy' ? v.racha : v.racha + 1;
  if (n <= 1) return { key: 'racha.hola.uno', n };
  if (n < 7) return { key: 'racha.hola.pocos', n };
  return { key: 'racha.hola.muchos', n };
}
