// P36k: valida la 1.ª partida (GAME_PRIMERA) contra el Clásico (GAME_LEVEL) sin navegador.
// Rutas arriba y abajo, con y sin jitter; y huella de GAME_LEVEL (debe ser igual a master).
// Uso: node herramientas/validar-p36k.mjs
import { createHash } from 'node:crypto';
globalThis.__JORGE_INTERVENTIONS__ = 0; // lo pone vite al compilar
const { GAME_LEVEL, GAME_PRIMERA } = await import('../src/tramos.js');
const { validateLevel } = await import('../src/niveles/validar.js');

const huella = (lv) => createHash('md5').update(JSON.stringify(lv)).digest('hex').slice(0, 12);
const corre = (nombre, lv) => {
  for (const ruta of ['arriba', 'abajo'])
    for (const j of [0, 60]) {
      const r = validateLevel(lv, null, j, ruta);
      console.log(nombre, ruta, `jitter${j}`, JSON.stringify({ ok: r.ok, deaths: r.deaths, cause: r.cause, minClear: r.minClear && +r.minClear.toFixed(1) }));
    }
};
console.log('huella GAME_LEVEL', huella(GAME_LEVEL), 'horq', JSON.stringify(GAME_LEVEL.horq || null));
console.log('huella GAME_PRIMERA', huella(GAME_PRIMERA), 'horq', JSON.stringify(GAME_PRIMERA.horq));
const caja = GAME_PRIMERA.entities.filter((e) => e.kind === 'obs' && Math.abs(e.D - 4000) < 1);
console.log('caja a 4000 px:', caja.length, 'piezas extra vs Clásico:', GAME_PRIMERA.pieceTotal - GAME_LEVEL.pieceTotal);
corre('clasico', GAME_LEVEL);
corre('primera', GAME_PRIMERA);
