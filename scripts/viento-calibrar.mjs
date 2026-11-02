// Calibración del viento (NIVELES.md "#2 Viento", punto 4): node scripts/viento-calibrar.mjs [contra]
// C<, C>, T> (y C<+Aup, C>+Aup, T>+Aup) aislados a 320, 350, 385, 420 y 470 px/s (vuelta rápida x1.12):
// el bot con viento los libra a -40, 0 y +40 ms (holgura en px); el bot ciego al viento debe chocar con C< a 320 y 350.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { CONFIG: C } = await import('../src/config.js');
if (process.argv[2]) C.viento.contra = Number(process.argv[2]);
const { buildLevel } = await import('../src/tramos.js');
const { validateLevel } = await import('../src/niveles/validar.js');

const VEL = [320, 350, 385, 420, 470];
const CODIGOS = ['C<', 'C>', 'T>', 'C>+Aup', 'T>+Aup', 'C'];
const out = { contra: C.viento.contra, favor: C.viento.favor, casos: {}, ciego: {} };
let fallos = 0;
for (const code of CODIGOS) {
  out.casos[code] = {};
  for (const v of VEL) {
    const L = buildLevel([{ speed: v, len: 8, script: [[3, code]] }]);
    const r = [-40, 0, 40].map((j) => {
      const x = validateLevel(L, null, j);
      if (!x.ok || x.minClear < 4) fallos++;
      return x.ok ? Math.round(x.minClear) : x.cause;
    });
    out.casos[code][v] = r.join('/');
  }
}
for (const v of VEL) {
  const L = buildLevel([{ speed: v, len: 8, script: [[3, 'C<']] }]);
  const r = [-40, 0, 40].map((j) => validateLevel(L, null, j, 'arriba', { ciego: true }));
  out.ciego[v] = r.map((x) => (x.ok ? `libra ${Math.round(x.minClear)}` : `choca ${x.cause}`)).join(' / ');
}
const ciegoChoca = [320, 350].every((v) => out.ciego[v].split(' / ')[1].startsWith('choca'));
out.fallosConViento = fallos;
out.ciegoChocaA320y350 = ciegoChoca;
console.log(JSON.stringify(out, null, 1));
