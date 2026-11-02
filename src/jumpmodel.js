// Modelo del salto con las mismas ecuaciones de RunScene.stepJump/release (perillas de config.js).
// Sirve para colocar el paro del tutorial, el arco fantasma y el bot del demo sin números a mano.
import { CONFIG as C } from './config.js';

const cache = new Map();

// holdMs: tiempo con el botón presionado (Infinity = no se suelta). Devuelve { peak, air (s), pts [{t, rise}] }.
// bounce: vuelo del trampolín (vy C.tramp.velocity, gravedad * gravityK, sin corte al soltar).
export function simulateJump(holdMs, bounce = false) {
  const key = bounce ? 'tramp' : holdMs === Infinity ? 'inf' : Math.round(holdMs);
  if (cache.has(key)) return cache.get(key);
  const dt = 1 / 240;
  const g = C.gravity * (bounce ? C.tramp.gravityK : 1);
  let vy = bounce ? -C.tramp.velocity : -C.jumpVelocity;
  let rise = 0;
  let t = 0;
  let jumping = true;
  let released = false;
  let peak = 0;
  const pts = [{ t: 0, rise: 0 }];
  for (let i = 0; i < 2000; i++) {
    if (!bounce && !released && t * 1000 >= holdMs) {
      released = true;
      if (jumping && vy < 0 && t * 1000 < C.jumpHoldMaxMs) {
        const f = Math.min(1, Math.max(0, (t * 1000 - C.jumpHoldRamp.fromMs) / (C.jumpHoldRamp.toMs - C.jumpHoldRamp.fromMs)));
        let cut = vy * (C.jumpCutMultiplier + (1 - C.jumpCutMultiplier) * f);
        if (rise + (cut * cut) / (2 * g) < C.jumpMinPx) cut = -Math.sqrt(2 * g * (C.jumpMinPx - rise));
        vy = Math.max(vy, cut);
        jumping = false;
      }
    }
    vy += g * dt;
    rise -= vy * dt;
    t += dt;
    peak = Math.max(peak, rise);
    pts.push({ t, rise: Math.max(0, rise) });
    if (rise <= 0 && vy > 0) break;
  }
  const out = { peak, air: t, pts };
  cache.set(key, out);
  return out;
}

export const simulateBounce = () => simulateJump(0, true);

export const PLANS = {
  tap: { holdMs: 16 },
  hold: { holdMs: Infinity },
};

export const planJump = (kind) => simulateJump(PLANS[kind].holdMs);

// Distancia horizontal (px) del despegue al aterrizaje a velocidad v.
// k: viento (el salto avanza a v * k; la curva vertical no cambia)
export const airTravel = (kind, v, k = 1) => planJump(kind).air * v * k;

// Altura de Moki (pies) a x px del despegue, a velocidad v.
export function riseAt(kind, v, xPx, k = 1) {
  const p = planJump(kind);
  const t = xPx / (v * k);
  if (t <= 0 || t >= p.air) return 0;
  const i = Math.min(p.pts.length - 1, Math.round(t * 240));
  return p.pts[i].rise;
}
