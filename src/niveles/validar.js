// Validador sin navegador: un bot "adjust" (el mismo plan que src/debug/bots.js) corre el nivel con la física de
// jumpmodel y las cajas de colisión de RunScene. Si choca, el nivel no es pasable. Puro JS: corre en Node y en el juego.
import { CONFIG as C } from '../config.js';
import { simulateJump, simulateBounce, airTravel } from '../jumpmodel.js';
import { TRAMP_PISA } from '../tramos.js';

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
// force 'none' = bot pasivo (nunca salta): debe morir; pisar un trampolín no le alcanza para pasar una página.
// ruta (trampolín): 'arriba' lo pisa y sobrevuela el nudo; 'abajo' lo salta con un toque y pasa el nudo a mano.
// Al caer del vuelo, el siguiente obstáculo queda a >= C.tramp.caidaLibreSec (si no: cause 'caida').
export function validateLevel(level, force = null, jitterMs = 0, ruta = 'arriba') {
  const obs = level.entities.filter((e) => e.kind === 'obs').map((e) => ({ ...e, box: box(e.type), handled: false }));
  const tramps = obs.filter((o) => o.type === 'tramp');
  const planDe = (q) => (q.type === 'tramp' ? (ruta === 'abajo' ? 'tap' : 'none') : q.plan);
  const salta = (q) => {
    if (force === 'none') return false;
    if (force) return q.plan !== 'skip';
    if (ruta === 'arriba' && q.bajo) return false;
    const p = planDe(q);
    return p === 'tap' || p === 'hold';
  };
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
    let cae = !jump;
    if (jump) {
      const i = Math.round((t - jump.t0) * 240);
      if (i >= jump.pts.length - 1) {
        if (jump.vuelo) {
          const sig = obs.find((q) => q.type !== 'tramp' && q.plan !== 'skip' && q.D - dist > -(q.box.half + pw / 2));
          if (sig && (sig.D - (sig.box.half + pw / 2) - dist) / speed < C.tramp.caidaLibreSec - 1e-6) {
            return { ok: false, sec: +t.toFixed(2), tramo: tramo + 1, cause: 'caida', D: Math.round(sig.D) };
          }
        }
        jump = null;
        cae = true;
      } else {
        rise = jump.pts[i].rise;
        cae = i > 0 && jump.pts[i].rise < jump.pts[i - 1].rise;
      }
    }
    // Trampolín: en el suelo o cayendo, con los pies a su altura, al llegar a TRAMP_PISA antes de su centro
    if (cae && rise <= C.obstacleSizes.tramp.height) {
      const j = tramps.find((q) => !q.used && dist >= q.D - TRAMP_PISA && dist < q.D + q.box.half);
      if (j) {
        j.used = true;
        j.handled = true;
        jump = { t0: t, pts: simulateBounce().pts, vuelo: true };
        rise = 0;
      }
    }
    // Bot: en el suelo, despega cuando el siguiente obstáculo que se salta queda a la mitad del recorrido aéreo
    if (!jump) {
      const o = obs.find((q) => !q.handled && q.D - dist > -4 && salta(q));
      if (o) {
        const pair = obs.some((q) => q.plan === 'skip' && q.D > o.D && q.D - o.D < 120) ? C.cajaPegadaGapPx / 2 : 0;
        const plan = force || planDe(o);
        if (o.D - dist <= airTravel(plan, speed) / 2 - pair - (jitterMs / 1000) * speed) {
          o.handled = true;
          // Pop-up: al despegar ya debe estar arriba y el aviso debe llevar >= reactSec en pantalla
          if (o.pop) {
            const lead = (o.D - dist) / speed;
            if (lead > C.popup.solidSec + 1e-6 || C.popup.warnSec - lead < C.popup.reactSec - 1e-6) {
              return { ok: false, sec: +t.toFixed(2), tramo: tramo + 1, cause: 'popup-tiempo', D: Math.round(o.D) };
            }
          }
          jump = { t0: t, pts: simulateJump(HOLD_MS[plan]).pts };
        }
      }
    }
    // Colisión: cuerpo [rise+2, rise+ph] contra la caja del obstáculo
    while (next < obs.length && obs[next].D - dist < -80) next++;
    for (let k = next; k < obs.length && obs[k].D - dist < 120; k++) {
      const o = obs[k];
      if (o.type === 'tramp') continue; // no choca: se pisa o se salta
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

// Pop-up justo (NIVELES / GDD §4): el aviso dura >= 450 ms antes de que sea sólido, empieza con la caja entera dentro de
// lo que se ve delante de Moki con minVisibleWidth y nunca antes de minGapBeforeSec del obstáculo anterior. Devuelve la primera falla o null.
export function popupFalla(level) {
  const P = C.popup;
  const ahead = C.world.minVisibleWidth - Math.min(C.player.xMax, C.world.minVisibleWidth * C.player.xRatio);
  if (P.warnSec - P.solidSec < 0.45 - 1e-9) return 'aviso < 450 ms';
  const obs = level.entities.filter((e) => e.kind === 'obs');
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    if (!o.pop) continue;
    let tr = 0;
    while (tr + 1 < level.starts.length && o.D >= level.starts[tr + 1]) tr++;
    const v = level.tramos[tr].speed;
    if (P.warnSec * v + C.obstacleSizes.caja.width / 2 > ahead + 1e-6) return `aviso fuera de pantalla a ${v} px/s`;
    const prev = obs.slice(0, i).reverse().find((q) => q.D < o.D - 1e-6);
    if (prev && (o.D - prev.D) / v < P.minGapBeforeSec - 1e-6) return `pop-up a ${((o.D - prev.D) / v).toFixed(2)} s del anterior`;
  }
  return null;
}
