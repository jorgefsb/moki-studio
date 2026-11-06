// MUNDO 1a2 al Reto (DECISIONES 6-nov 10:15): el Reto por fecha con formas de página, sin navegador.
//   node scripts/reto-formas.mjs <carpeta de master>
// (1) Antes de la fecha del interruptor: entities byte a byte iguales a master en 30 fechas, hoy incluido; también con el
//     módulo de la zanja cargado (quien ya abrió Libre juega el mismo Reto).
// (2) Desde la fecha, 30 fechas: lleva formas; mismo nivel con y sin la zanja; justicia con las dos rutas a -40, 0 y +40 ms
//     con holgura >= 4 px; el pasivo, el de solo toque y el de solo mantener mueren; sin páginas de respaldo.
// (3) Clásico no pasa por aquí (RunScene.makeLevel regresa GAME_LEVEL); eso lo prueba la regresión en navegador.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const MASTER = process.argv[2];
if (!MASTER) throw new Error('falta la carpeta de master');
const { generarNivel } = await import('../src/niveles/generar.js');
const { validateLevel } = await import('../src/niveles/validar.js');
const { INTERRUPTOR } = await import('../src/niveles/formas.js');
const { generarNivel: enMaster } = await import(`${MASTER}/src/niveles/generar.js`);

const FECHA = INTERRUPTOR.reto;
if (!FECHA) throw new Error('el interruptor del Reto está apagado');
const clave = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
const [y, m, d] = FECHA.split('-').map(Number);
const ANTES = Array.from({ length: 30 }, (_, i) => clave(new Date(y, m - 1, d - 30 + i)));
const DESDE = Array.from({ length: 30 }, (_, i) => clave(new Date(y, m - 1, d + i)));
const json = (L) => JSON.stringify(L.entities);

const difieren = ANTES.filter((s) => json(generarNivel(s, 'reto')) !== json(enMaster(s, 'reto')));
const conFormasAntes = ANTES.filter((s) => generarNivel(s, 'reto').formas);
const sinZanja = Object.fromEntries(DESDE.map((s) => [s, json(generarNivel(s, 'reto'))]));

await import('../src/zanja.js'); // de aquí en adelante, como quien ya abrió Libre
const difierenConZanja = ANTES.filter((s) => json(generarNivel(s, 'reto')) !== json(enMaster(s, 'reto')));
const zanjaCambia = DESDE.filter((s) => json(generarNivel(s, 'reto')) !== sinZanja[s]);

const j = { niveles: 0, sinFormas: [], respaldo: 0, rutaArribaFalla: 0, rutaAbajoFalla: 0, pasivoTermina: 0, tapTermina: 0, holdTermina: 0, causas: {}, holguraMin: Infinity, formas: {} };
for (const s of DESDE) {
  const L = generarNivel(s, 'reto');
  j.niveles++;
  if (!L.formas) j.sinFormas.push(s);
  else j.formas[s] = L.formas.join(' ');
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
const fallos = difieren.length + conFormasAntes.length + difierenConZanja.length + zanjaCambia.length + j.sinFormas.length + j.respaldo + j.rutaArribaFalla + j.rutaAbajoFalla + j.pasivoTermina + j.tapTermina + j.holdTermina;
console.log(JSON.stringify({ fecha: FECHA, antes: { fechas: `${ANTES[0]} a ${ANTES[29]}`, difieren, conFormasAntes, difierenConZanja }, desde: { fechas: `${DESDE[0]} a ${DESDE[29]}`, zanjaCambia, justicia: j }, fallos }, null, 1));
process.exit(fallos ? 1 : 0);
