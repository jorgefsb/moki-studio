// Prueba del instrumento del timbre (NIVELES.md §9 punto 4): node scripts/timbre-calibrar.mjs
// Cada bloque de timbre aislado a 320, 350, 385, 420 y 470 px/s: ruta 'arriba' (lo toca) y 'abajo' (a mano) a -40, 0 y
// +40 ms (holgura en px o causa); el pasivo y el de solo toque deben morir (el toque nunca suena: cabeza a ~158 < lo).
// Además: altura de la cabeza en el pico del toque, del mantenido y de simulateJump(130) contra la caja del timbre.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { CONFIG: C } = await import('../src/config.js');
const { buildLevel } = await import('../src/tramos.js');
const { validateLevel } = await import('../src/niveles/validar.js');
const { BLOQUES } = await import('../src/niveles/bloques.js');
const { simulateJump } = await import('../src/jumpmodel.js');

const VEL = [320, 350, 385, 420, 470];
const ph = C.player.height - 6;
const cabeza = (ms) => Math.round(simulateJump(ms).peak + ph);
const T = C.timbre;
const out = { caja: [T.lo, T.hi], cabeza: { toque: cabeza(16), mantenido130: cabeza(130), mantenido: cabeza(Infinity) }, bloques: {} };
let fallos = 0;
for (const b of BLOQUES.filter((q) => q.mec === 'timbre')) {
  out.bloques[b.id] = {};
  for (const v of VEL) {
    const L = buildLevel([{ speed: v, len: 8, script: b.ev.map(([t, c]) => [2 + t, c]) }]);
    const r = {};
    for (const ruta of ['arriba', 'abajo']) {
      r[ruta] = [-40, 0, 40].map((j) => {
        const x = validateLevel(L, null, j, ruta);
        if (!x.ok || x.minClear < 4) fallos++;
        return x.ok ? Math.round(x.minClear) : x.cause;
      }).join('/');
    }
    r.pasivo = validateLevel(L, 'none').ok ? 'TERMINA' : 'muere';
    r.toque = validateLevel(L, 'tap').ok ? 'TERMINA' : validateLevel(L, 'tap').cause;
    out.bloques[b.id][v] = r;
  }
}
out.fallos = fallos;
console.log(JSON.stringify(out, null, 1));
