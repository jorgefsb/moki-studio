// MECÁNICAS AL RETO (DECISIONES 5-nov 09:05): el Reto por fecha, sin navegador.
//   node scripts/reto-fechas.mjs <carpeta de master>
// (1) Antes de la fecha: entities byte a byte iguales a master en 30 fechas, hoy incluido; también con el módulo de la
//     zanja cargado (quien ya abrió Libre juega el mismo Reto).
// (2) Desde la fecha, 30 fechas: mismo nivel con y sin la zanja; justicia con las dos rutas a -40, 0 y +40 ms con holgura
//     >= 4 px; el pasivo, el de solo toque y el de solo mantener mueren; sin páginas de respaldo.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const MASTER = process.argv[2];
if (!MASTER) throw new Error('falta la carpeta de master');
const { generarNivel } = await import('../src/niveles/generar.js');
const { validateLevel } = await import('../src/niveles/validar.js');
const { CONFIG: C } = await import('../src/config.js');
const { generarNivel: enMaster } = await import(`${MASTER}/src/niveles/generar.js`);

const FECHA = C.tramp.reto;
const fechas = (y, m, d, n) => Array.from({ length: n }, (_, i) => {
  const x = new Date(y, m - 1, d + i);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
});
const ANTES = fechas(2026, 10, 10, 30); // hasta el 8-nov; incluye el 5-nov
const DESDE = fechas(2026, 11, 9, 30);
const json = (L) => JSON.stringify(L.entities);

const difieren = ANTES.filter((s) => json(generarNivel(s, 'reto')) !== json(enMaster(s, 'reto')));
const sinZanja = Object.fromEntries(DESDE.map((s) => [s, json(generarNivel(s, 'reto'))]));

await import('../src/zanja.js'); // de aquí en adelante, como quien ya abrió Libre
const difierenConZanja = ANTES.filter((s) => json(generarNivel(s, 'reto')) !== json(enMaster(s, 'reto')));
const zanjaCambia = DESDE.filter((s) => json(generarNivel(s, 'reto')) !== sinZanja[s]);

const j = { niveles: 0, trampolines: 0, zonasViento: 0, respaldo: 0, rutaArribaFalla: 0, rutaAbajoFalla: 0, pasivoTermina: 0, tapTermina: 0, holdTermina: 0, causas: {}, holguraMin: Infinity, sinTrampolin: [], sinViento: [] };
for (const s of DESDE) {
  const L = generarNivel(s, 'reto');
  const tr = L.entities.filter((e) => e.type === 'tramp').length;
  const vi = (L.vientos || []).length;
  j.niveles++;
  j.trampolines += tr;
  j.zonasViento += vi;
  if (!tr) j.sinTrampolin.push(s);
  if (!vi) j.sinViento.push(s);
  j.respaldo += L.fallbacks.length;
  for (const ruta of ['arriba', 'abajo'])
    for (const ms of [0, -40, 40]) {
      const r = validateLevel(L, null, ms, ruta);
      if (r.ok) j.holguraMin = Math.min(j.holguraMin, r.minClear);
      if (!r.ok || r.minClear < 4) {
        j[ruta === 'arriba' ? 'rutaArribaFalla' : 'rutaAbajoFalla']++;
        j.causas[r.cause || 'holgura'] = (j.causas[r.cause || 'holgura'] || 0) + 1;
      }
    }
  if (validateLevel(L, 'none').ok) j.pasivoTermina++;
  if (validateLevel(L, 'tap').ok) j.tapTermina++;
  if (validateLevel(L, 'hold').ok) j.holdTermina++;
}
const fallos = difieren.length + difierenConZanja.length + zanjaCambia.length + j.respaldo + j.rutaArribaFalla + j.rutaAbajoFalla + j.pasivoTermina + j.tapTermina + j.holdTermina;
console.log(JSON.stringify({ fecha: FECHA, antes: { fechas: `${ANTES[0]} a ${ANTES[29]}`, difieren, difierenConZanja }, desde: { fechas: `${DESDE[0]} a ${DESDE[29]}`, zanjaCambia, justicia: j }, fallos }, null, 1));
process.exit(fallos ? 1 : 0);
