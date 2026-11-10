// Bots de prueba (DISENO.md §11): solo se cargan con ?debug o en dev. Juegan con la misma física, en pasos fijos de 16.7 ms.
//   tap    solo toca (salta todo con toque): debe morir en la primera torre (~21 s)
//   hold   siempre mantiene (salta todo, también la viga): debe morir en T3 (viga), antes de ~70 s
//   pasivo nunca salta: con Paseo debe llegar a la meta sin un choque (pieza 4)
//   adjust ajusta la altura por obstáculo según el guion (toque, mantener o nada): debe terminar los 120 s
import { airTravel, simulateJump } from '../jumpmodel.js';
import { CONFIG as C } from '../config.js';

const DT = 16.667;

// P15: el bucle del bot llama a s.update() a mano y el gestor de tweens de Phaser (que mide con el reloj real) no corre:
// cada pieza cobrada se quedaba con su tween de cobro congelado, a escala 1 y pegada a Moki. Aquí cada tween avanza el
// mismo DT que el juego, igual que haría TweenManager.step. Solo cosmético: no toca física, puntaje ni azar.
function pasoTweens(s, dt) {
  const m = s.tweens;
  if (m.paused) return;
  const list = m.tweens;
  const fin = [];
  m.processing = true;
  for (let i = 0; i < list.length; i++) if (list[i].update(dt * m.timeScale)) fin.push(list[i]);
  m.processing = false;
  for (const tw of fin) {
    const i = list.indexOf(tw);
    if (i > -1 && (tw.isPendingRemove() || tw.isDestroyed())) {
      list.splice(i, 1);
      tw.destroy();
    }
  }
}

// seed (opcional): juega ese nivel generado (NIVELES.md §10), p.ej. '2026-10-29' o '123'
export function runBot(s, kind, maxSec = 150, seed = null) {
  s.startGame();
  if (seed) {
    s.resetRun(s.makeLevel(String(seed)), 0);
    s.speed = s.tramoSpeed(0); // con Vuelta rápida, el tramo ya sale x1.12
  }
  s.tut = { stage: 4, state: 'off' }; // sin tutorial: el bot no necesita la mano
  s.god = false;
  let releaseAt = -1;
  let frames = 0;
  const hit = { type: null };
  while (frames * DT < maxSec * 1000 && s.screen !== 'dead' && s.screen !== 'final') {
    frames += 1;
    if (releaseAt > 0 && s.t >= releaseAt) {
      releaseAt = -1;
      s.release();
    }
    if (releaseAt < 0 && s.grounded && kind !== 'pasivo') {
      const o = s.obstacles.find((q) => !q.handled && q.x > s.px - 4 && q.plan !== 'skip' && (kind !== 'adjust' || q.plan === 'tap' || q.plan === 'hold'));
      if (o) {
        const mode = kind === 'tap' ? 'tap' : kind === 'hold' ? 'hold' : o.plan;
        // Dos cajas pegadas: un solo salto largo centrado en el par (a media distancia de las dos)
        const pair = s.obstacles.some((q) => q.plan === 'skip' && q.D > o.D && q.D - o.D < 120) ? C.cajaPegadaGapPx / 2 : 0;
        const lead = airTravel(mode, s.speed, s.zonaK ? s.zonaK(s.dist) : 1) / 2 - pair; // despega más tarde: el apex cae en el centro del par (con viento, k)
        if (o.x - s.px <= lead) {
          o.handled = true;
          s.press();
          releaseAt = s.t + (mode === 'tap' ? 16 : 400);
        }
      }
    }
    // los obstáculos "skip" (segunda caja pegada) ya los cubre el salto largo
    s.obstacles.forEach((q) => {
      if (q.plan === 'skip' && q.x < s.px + 400) q.handled = true;
    });
    s.update(0, DT);
    pasoTweens(s, DT);
  }
  if (s.screen === 'dead') hit.type = s.cause;
  return {
    bot: kind,
    seconds: +(frames * DT / 1000).toFixed(1),
    result: s.screen === 'final' ? 'termino' : s.screen === 'dead' ? 'murio' : 'tiempo',
    cause: hit.type,
    tramo: s.tramoIdx + 1,
    meters: Math.floor(s.dist / 100),
    pieces: s.pieces,
    pieceTotal: s.level.pieceTotal,
    score: s.score,
  };
}

// Margen del toque contra la torre con las ecuaciones del motor (jumpmodel = mismo cálculo que stepJump/release).
export function jumpTable() {
  const need = C.obstacleSizes.torre.height - C.hitboxShrink.top - 2; // altura mínima que libra la torre
  const caja = C.obstacleSizes.caja.height - C.hitboxShrinkCaja.top - 2;
  const rows = [];
  for (const h of [16, 33, 50, 66, 80, 100, 120, 140, 160, 200, 260]) {
    const p = simulateJump(h).peak;
    rows.push({ holdMs: h, peakPx: +p.toFixed(1), liberaCaja: p >= caja + 4, liberaTorre: p >= need + 2, bajoLaTorrePx: +(need - p).toFixed(1), vigaChoca: p > C.obstacleSizes.viga.hangBottom - (C.player.height - 6) });
  }
  return { torreExige: need, cajaExige: caja, vigaChocaSobre: C.obstacleSizes.viga.hangBottom - (C.player.height - 6), rows };
}
