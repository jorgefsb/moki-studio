// Ventanas de despegue medidas con el motor real (RunScene a 60 Hz, 320 px/s, barrido de 1 px). Solo con ?debug.
// Devuelve, por caso, cuántos px (y ms) de posición de despegue libran el obstáculo.
const CASES = [
  ['caja_toque', ['caja'], 16],
  ['dos_cajas_mantener', ['caja', 'caja'], 400],
  ['torre_mantener_150', ['torre'], 150],
  ['torre_toque', ['torre'], 16],
];

export async function measureWindows(s, speed = 320) {
  const DT = 16.667;
  const trial = (types, d, hold) => {
    s.screen = 'play';
    s.startGame();
    s.tut = { stage: 4, state: 'off' };
    s.god = false;
    s.speed = speed;
    s.obstacles.forEach((o) => o.destroy());
    s.obstacles = [];
    s.pickups.forEach((o) => o.destroy());
    s.pickups = [];
    s.nextEnt = 1e9;
    types.forEach((t, i) => s.spawnObstacle({ kind: 'obs', type: t, D: s.dist + d + i * 84, plan: 'hold' }));
    s.rampT = 1e9;
    for (let f = 0; f < 3; f++) s.update(0, DT);
    const o = s.obstacles[0];
    s.dist += o.x - s.px - d;
    s.placeEntities();
    const n = Math.max(1, Math.round(hold / DT));
    s.press();
    for (let f = 0; f < 160; f++) {
      if (f === n) s.release();
      s.update(0, DT);
      if (s.screen === 'dead') return false;
      if (s.obstacles[s.obstacles.length - 1].x < s.px - 80) break;
    }
    return true;
  };
  const out = {};
  for (const [name, types, hold] of CASES) {
    const ok = [];
    for (let d = 30; d <= 330; d++) if (trial(types, d, hold)) ok.push(d);
    out[name] = { px: ok.length, ms: Math.round((ok.length / speed) * 1000), de: ok[0] || null, a: ok[ok.length - 1] || null };
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}
