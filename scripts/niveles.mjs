// Valida niveles sin navegador: node scripts/niveles.mjs [semillas libres=500]
// 365 fechas del Reto + N semillas libres: el bot adjust debe terminar, tap y hold deben morir; reporta % de respaldo.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { GAME_LEVEL } = await import('../src/tramos.js');
const { validateLevel } = await import('../src/niveles/validar.js');
const { generarNivel, filasPiezas } = await import('../src/niveles/generar.js');
const { BLOQUES } = await import('../src/niveles/bloques.js');
const B = Object.fromEntries(BLOQUES.map((b) => [b.id, b]));
const dif = (id) => (B[id] ? B[id].dif : 1); // relleno = dif 1, descanso
const descanso = (id) => id === 'relleno' || (B[id] && B[id].tags.includes('descanso'));

console.log('clasico', validateLevel(GAME_LEVEL), validateLevel(GAME_LEVEL, 'tap').sec, validateLevel(GAME_LEVEL, 'hold').tramo);

const N = Number(process.argv[2]) || 500;
const seeds = [];
const d0 = new Date(2026, 9, 29);
for (let i = 0; i < 365; i++) {
  const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
  seeds.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
}
for (let i = 0; i < N; i++) seeds.push(String((i * 2654435761) >>> 0));

const bad = [];
let fb = 0;
let minClear = Infinity;
const tapAt = [];
const holdTramo = {};
const uso = {};
const filas = [];
let jitFail = 0;
const gram = { paginas: 0, dosDuros: 0, sinRespiroTras4: 0, repetidoSeguido: 0, masDe2: 0, filasSobre20: 0 };
for (const s of seeds) {
  const L = generarNivel(s);
  fb += L.fallbacks.length;
  const a = validateLevel(L);
  if (!a.ok) bad.push([s, a]);
  else minClear = Math.min(minClear, a.minClear);
  const t = validateLevel(L, 'tap');
  if (t.ok) bad.push([s, 'tap termina']);
  else tapAt.push(t.sec);
  const h = validateLevel(L, 'hold');
  if (h.ok) bad.push([s, 'hold termina']);
  else holdTramo[h.tramo] = (holdTramo[h.tramo] || 0) + 1;
  for (const j of [-40, 40]) {
    const r = validateLevel(L, null, j);
    if (!r.ok || r.minClear < 4) jitFail++;
  }
  L.tramos.forEach((tr) => filas.push(filasPiezas(tr.script)));
  L.bloques.forEach((ids) => ids.forEach((id) => (uso[id] = (uso[id] || 0) + 1)));
  // Gramática GDD §4 por página: nunca dos >=3 seguidos, respiro tras un 4, nada repetido seguido, máx 2 por página
  L.bloques.forEach((ids, k) => {
    gram.paginas++;
    if (filasPiezas(L.tramos[k].script) > 0.2 + 1e-9) gram.filasSobre20++;
    const veces = {};
    ids.forEach((id, i) => {
      if (id !== 'relleno' && id !== 'respiro' && (veces[id] = (veces[id] || 0) + 1) === 3) gram.masDe2++;
      if (!i) return;
      const p = ids[i - 1];
      if (dif(p) >= 3 && dif(id) >= 3) gram.dosDuros++;
      if (dif(p) >= 4 && !descanso(id)) gram.sinRespiroTras4++;
      if (p === id && id !== 'relleno') gram.repetidoSeguido++;
    });
  });
}
// mismo seed = mismo nivel
const same = JSON.stringify(generarNivel('2026-10-29').entities) === JSON.stringify(generarNivel('2026-10-29').entities);
const diff = JSON.stringify(generarNivel('2026-10-29').entities) !== JSON.stringify(generarNivel('2026-10-30').entities);
filas.sort((a, b) => a - b);
console.log({ niveles: seeds.length, fallosConJitter40: jitFail, filasPiezasPorPagina: { media: +(filas.reduce((a, b) => a + b, 0) / filas.length).toFixed(3), max: +filas[filas.length - 1].toFixed(3) }, fallos: bad.length, respaldoTramos: fb, holguraMinPx: minClear, tapMuereSeg: [Math.min(...tapAt), Math.max(...tapAt)], holdMuereEnTramo: holdTramo, mismaSemillaMismoNivel: same, otraFechaOtroNivel: diff });
if (bad.length) console.log(bad.slice(0, 10));
const escritos = Object.entries(uso).filter(([id]) => id !== 'relleno' && id !== 'clasico');
const total = escritos.reduce((a, [, n]) => a + n, 0);
const pct = escritos.map(([id, n]) => [id, +((100 * n) / total).toFixed(2)]).sort((a, b) => b[1] - a[1]);
const sobre8 = pct.filter(([, p]) => p > 8);
const sinUso = BLOQUES.filter((b) => !uso[b.id]).map((b) => b.id);
console.log({ gramatica: gram, apariciones: total, relleno: uso.relleno || 0, bloquesSobre8pct: sobre8, bloquesSinUso: sinUso });
console.log('bloques (% de apariciones, sin relleno)', Object.fromEntries(pct));
const gramMal = gram.dosDuros + gram.sinRespiroTras4 + gram.repetidoSeguido + gram.masDe2 + gram.filasSobre20;

// Libre con trampolín y viento (mecánicas 'tramp' y 'viento'): las N semillas libres. Las dos rutas forzadas (pisar siempre / saltar
// siempre) terminan con ±40 ms y holgura >= 4 px; el pasivo (nunca salta), el de solo toque y el de solo mantener mueren.
const tr = { niveles: 0, trampolines: 0, respaldoTramos: 0, rutaArribaFalla: 0, rutaAbajoFalla: 0, pasivoTermina: 0, tapTermina: 0, holdTermina: 0, causas: {} };
for (let i = 0; i < N; i++) {
  const L = generarNivel(String((i * 2654435761) >>> 0), 'libre', { mecanicas: ['tramp', 'viento'] });
  tr.zonasViento = (tr.zonasViento || 0) + (L.vientos || []).length;
  tr.niveles++;
  tr.trampolines += L.entities.filter((e) => e.type === 'tramp').length;
  tr.respaldoTramos += L.fallbacks.length;
  for (const ruta of ['arriba', 'abajo']) {
    for (const j of [0, -40, 40]) {
      const r = validateLevel(L, null, j, ruta);
      if (!r.ok || r.minClear < 4) {
        tr[ruta === 'arriba' ? 'rutaArribaFalla' : 'rutaAbajoFalla']++;
        tr.causas[r.cause || 'holgura'] = (tr.causas[r.cause || 'holgura'] || 0) + 1;
      }
    }
  }
  if (validateLevel(L, 'none').ok) tr.pasivoTermina++;
  if (validateLevel(L, 'tap').ok) tr.tapTermina++;
  if (validateLevel(L, 'hold').ok) tr.holdTermina++;
}
console.log({ libreConTrampolin: tr });
const trMal = tr.respaldoTramos + tr.rutaArribaFalla + tr.rutaAbajoFalla + tr.pasivoTermina + tr.tapTermina + tr.holdTermina;
process.exit(bad.length || jitFail || fb || !same || !diff || gramMal || sobre8.length || trMal ? 1 : 0);
