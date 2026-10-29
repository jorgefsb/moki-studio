// Validador sin navegador: un bot "adjust" (el mismo plan que src/debug/bots.js) corre el nivel con la física de
// jumpmodel y las cajas de colisión de RunScene. Si choca, el nivel no es pasable. Puro JS: corre en Node y en el juego.
import { CONFIG as C } from '../config.js';
import { simulateJump, airTravel } from '../jumpmodel.js';

const DT = 1 / 60;
const HOLD_MS = { tap: 16, hold: 400 };

// Caja de colisión de un obstáculo en coordenadas de suelo (altura sobre el suelo, x relativa a su centro).
function box(type) {
  const s = C.obstacleSizes[type];
  const hs = type === 'caja' ? C.hitboxShrinkCaja : C.hitboxShrink;
  const half = s.width / 2 - hs.x;
  if (type === 'viga') return { half, lo: s.hangBottom, hi: s.hangBottom + s.height };
  return { half, lo: 0, hi: s.height - hs.top };
}

// level: salida de buildLevel. Devuelve { ok, sec, tramo, cause, D, minClear } (minClear: px de holgura más justa).
// force: 'tap' | 'hold' juega todo con ese salto (prueba del instrumento: el de solo toque debe morir en la primera torre).
// jitterMs: el bot despega ese tanto antes (-) o después (+) del punto ideal (NIVELES: todo se libra con ±40 ms).
export function validateLevel(level, force = null, jitterMs = 0) {
  const obs = level.entities.filter((e) => e.kind === 'obs').map((e) => ({ ...e, box: box(e.type), handled: false }));
  const pw = C.player.width - 6;
  const ph = C.player.height - 6;
  let dist = 0;
  let speed = level.tramos[0].speed;
  let accel = 0;
  let tramo = 0;
  let jump = null; // { t0, pts }
  let t = 0;
  let minClear = Infinity;
  let next = 0;
  while (dist < level.end) {
    while (tramo + 1 < level.tramos.length && dist >= level.starts[tramo + 1]) tramo++;
    const target = level.tramos[tramo].speed;
    if (accel === 0 && speed !== target) accel = Math.abs(target - speed) / C.tramoEaseSec;
    speed = speed < target ? Math.min(target, speed + accel * DT) : Math.max(target, speed - accel * DT);
    if (speed === target) accel = 0;

    let rise = 0;
    if (jump) {
      const i = Math.round((t - jump.t0) * 240);
      if (i >= jump.pts.length - 1) jump = null;
      else rise = jump.pts[i].rise;
    }
    // Bot: en el suelo, despega cuando el siguiente obstáculo que se salta queda a la mitad del recorrido aéreo
    if (!jump) {
      const o = obs.find((q) => !q.handled && q.D - dist > -4 && (q.plan === 'tap' || q.plan === 'hold' || (force && q.plan !== 'skip')));
      if (o) {
        const pair = obs.some((q) => q.plan === 'skip' && q.D > o.D && q.D - o.D < 120) ? C.cajaPegadaGapPx / 2 : 0;
        const plan = force || o.plan;
        if (o.D - dist <= airTravel(plan, speed) / 2 - pair - (jitterMs / 1000) * speed) {
          o.handled = true;
          jump = { t0: t, pts: simulateJump(HOLD_MS[plan]).pts };
        }
      }
    }
    // Colisión: cuerpo [rise+2, rise+ph] contra la caja del obstáculo
    while (next < obs.length && obs[next].D - dist < -80) next++;
    for (let k = next; k < obs.length && obs[k].D - dist < 120; k++) {
      const o = obs[k];
      const dx = Math.abs(o.D - dist);
      if (dx >= o.box.half + pw / 2) continue;
      const lo = rise + 2;
      const hi = rise + ph;
      if (lo < o.box.hi && hi > o.box.lo) {
        return { ok: false, sec: +t.toFixed(2), tramo: tramo + 1, cause: o.type, D: Math.round(o.D) };
      }
      minClear = Math.min(minClear, o.type === 'viga' ? o.box.lo - hi : lo - o.box.hi);
    }
    dist += speed * DT;
    t += DT;
  }
  return { ok: true, sec: +t.toFixed(1), minClear: +minClear.toFixed(1) };
}
