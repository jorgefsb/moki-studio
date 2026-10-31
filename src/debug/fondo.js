// Traslapes en pantalla entre los pinos y postes de la capa media y la caja de colisión de los obstáculos (más 12 px de
// pantalla), contados por cuadro a lo largo de la partida completa (invulnerable, sin tocar). Solo con ?debug.
// clear: false mide el antes (los pinos y postes siempre dibujados, como cuando iban pintados en el mosaico).
import { CONFIG as C } from '../config.js';

const DT = 16.667;

export async function measureFondo(s, { seeds = [null], modo = null, clear = true, marginPx = 12, maxSec = 150 } = {}) {
  const M = C.art.midClear;
  const was = M.on;
  M.on = clear;
  const inter = (a, b) => a.left < b.r && a.right > b.l && a.top < b.b && a.bottom > b.t;
  const rows = [];
  try {
    for (const seed of seeds) {
      if (modo) s.modo = modo;
      s.startGame();
      if (seed) {
        s.resetRun(s.makeLevel(String(seed)), 0);
        s.speed = s.level.tramos[0].speed;
      }
      s.tut = { stage: 4, state: 'off' };
      s.god = true;
      const mg = marginPx / s.zoom;
      const pairs = new Set();
      let frames = 0;
      let hitFrames = 0;
      let shown = 0;
      let slots = 0;
      while (frames * DT < maxSec * 1000 && s.screen !== 'final' && s.screen !== 'dead') {
        s.update(0, DT);
        frames++;
        const boxes = s.obstacles.map((o) => {
          const b = s.obsBox(o.type, o.x);
          return { l: b.l - mg, r: b.r + mg, t: b.t - mg, b: b.b + mg, D: o.D };
        });
        let hit = false;
        for (let i = 0; i < (s.midPoolN || 0); i++) {
          const q = s.midPool[i];
          // solo cuenta lo que se ve: dentro de la pantalla y con alfa
          if (q.box.right < 0 || q.box.left > s.vw) continue;
          slots++;
          if (!q.body.visible || q.body.alpha < 0.05) continue;
          shown += q.a;
          for (const b of boxes) {
            if (inter(q.box, b)) {
              hit = true;
              pairs.add(`${q.inst}>${b.D}`);
            }
          }
        }
        if (hit) hitFrames++;
      }
      rows.push({
        seed: seed || (s.level && s.level.seed) || 'clasico',
        modo: (s.level && s.level.modo) || 'clasico',
        traslapes: pairs.size,
        cuadros: hitFrames,
        frames,
        visible: slots ? +(shown / slots).toFixed(3) : null, // fracción de pinos y postes en pantalla que se dibujan
        termino: s.screen === 'final',
      });
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    M.on = was;
    s.god = false;
  }
  return rows;
}
