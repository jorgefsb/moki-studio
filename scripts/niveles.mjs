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
const gramNueva = () => ({ paginas: 0, dosDuros: 0, sinRespiroTras4: 0, repetidoSeguido: 0, masDe2: 0, filasSobre20: 0 });
const gram = gramNueva();
// Niveles con mecánicas (el Reto desde su fecha; DECISIONES 5-nov 09:30): 8 % y respiro tras un 4 no son estrictos, se miden aparte
const gramMec = gramNueva();
const usoMec = {};
// Con mecánicas, tramp-intro cuenta como respiro (dif 1, pisarlo es descansar; DECISIONES 5-nov 09:35), pero puede salir
// sorteado: se cuenta aparte. Las fechas son fijas, así que este número solo sube si cambia el generador.
// Era 16 con trampolín y viento. Se movió a 21 DESPUÉS de ver 21 con viento.reto = null (DECISIONES 5-nov, director): es alarma de
// que el generador cambió, no juicio de que 21 esté bien. Cualquier otro valor regresa al director.
const TOPE_DIF4_TRAMP_INTRO = 21;
let dif4TrampIntro = 0;
const justicia = { fechas: 0, corridas: 0, trampolines: 0, zonasViento: 0, fechasConFallo: [] };
for (const s of seeds) {
  const L = generarNivel(s);
  const conMec = L.mecanicas.length > 0;
  const gr = conMec ? gramMec : gram;
  const us = conMec ? usoMec : uso;
  if (conMec) {
    // Las dos rutas (pisar y saltar) a -40, 0 y +40 ms con holgura >= 4 px, en cada fecha
    justicia.fechas++;
    justicia.trampolines += L.entities.filter((e) => e.type === 'tramp').length;
    justicia.zonasViento += (L.vientos || []).length;
    for (const ruta of ['arriba', 'abajo'])
      for (const j of [0, -40, 40]) {
        justicia.corridas++;
        const r = validateLevel(L, null, j, ruta);
        if (!r.ok || r.minClear < 4) justicia.fechasConFallo.push({ fecha: s, ruta, ms: j, causa: r.cause || 'holgura', sec: r.sec, holgura: r.minClear });
      }
  }
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
  L.bloques.forEach((ids) => ids.forEach((id) => (us[id] = (us[id] || 0) + 1)));
  // Gramática GDD §4 por página: nunca dos >=3 seguidos, respiro tras un 4, nada repetido seguido, máx 2 por página
  L.bloques.forEach((ids, k) => {
    gr.paginas++;
    if (filasPiezas(L.tramos[k].script) > 0.2 + 1e-9) gr.filasSobre20++;
    const veces = {};
    ids.forEach((id, i) => {
      if (id !== 'relleno' && id !== 'respiro' && (veces[id] = (veces[id] || 0) + 1) === 3) gr.masDe2++;
      if (!i) return;
      const p = ids[i - 1];
      if (dif(p) >= 3 && dif(id) >= 3) gr.dosDuros++;
      if (dif(p) >= 4 && !descanso(id)) {
        if (conMec && id === 'tramp-intro') dif4TrampIntro++;
        else gr.sinRespiroTras4++;
      }
      if (p === id && id !== 'relleno') gr.repetidoSeguido++;
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

// Con mecánicas: rojo si un bloque que no sea tramp-intro o tramp-nudo pasa de 10 %, o sin respiro tras un 4 pasa de 1 % de
// las páginas (el trampolín forzado del respiro los sube a propósito). Las demás reglas siguen estrictas.
const escritosMec = Object.entries(usoMec).filter(([id]) => id !== 'relleno' && id !== 'clasico');
const totalMec = escritosMec.reduce((a, [, n]) => a + n, 0);
const pctMec = escritosMec.map(([id, n]) => [id, +((100 * n) / totalMec).toFixed(2)]).sort((a, b) => b[1] - a[1]);
const sobre10 = pctMec.filter(([id, p]) => p > 10 && id !== 'tramp-intro' && id !== 'tramp-nudo');
const pctSinRespiro = gramMec.paginas ? +((100 * gramMec.sinRespiroTras4) / gramMec.paginas).toFixed(2) : 0;
console.log('conMecanicas', JSON.stringify({ gramatica: gramMec, sinRespiroPct: pctSinRespiro, topeSinRespiroPct: 1, dif4TrampIntro, topeDif4TrampIntro: TOPE_DIF4_TRAMP_INTRO, sobre10, tramp: pctMec.filter(([id]) => id === 'tramp-intro' || id === 'tramp-nudo'), masUsados: pctMec.slice(0, 5) }));
console.log({ justiciaConMecanicas: justicia });
const gramMecMal = gramMec.dosDuros + gramMec.repetidoSeguido + gramMec.masDe2 + gramMec.filasSobre20 + sobre10.length + (pctSinRespiro > 1 ? 1 : 0) + (dif4TrampIntro > TOPE_DIF4_TRAMP_INTRO ? 1 : 0);

// Libre con trampolín y viento (mecánicas 'tramp' y 'viento'): las N semillas libres. Las dos rutas forzadas (pisar siempre / saltar
// siempre) terminan con ±40 ms y holgura >= 4 px; el pasivo (nunca salta), el de solo toque y el de solo mantener mueren.
const tr = { niveles: 0, trampolines: 0, respaldoTramos: 0, rutaArribaFalla: 0, rutaAbajoFalla: 0, pasivoTermina: 0, tapTermina: 0, holdTermina: 0, causas: {} };
for (let i = 0; i < N; i++) {
  const L = generarNivel(String((i * 2654435761) >>> 0), 'libre', { mecanicas: process.argv[3] ? process.argv[3].split(',') : ['tramp', 'viento'] }); // 3er argumento: mecánicas (tramp,viento,timbre)
  tr.timbres = (tr.timbres || 0) + L.entities.filter((e) => e.type === 'timbre').length;
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
const rojo = { fallos: bad.length, jitFail, respaldo: fb, mismoNivel: !same, otroNivel: !diff, gramMal, sobre8: sobre8.length, trMal, gramMecMal, justiciaMec: justicia.fechasConFallo.length };
const razones = Object.entries(rojo).filter(([, v]) => v);
console.log(razones.length ? `ROJO ${JSON.stringify(Object.fromEntries(razones))}` : 'VERDE');
process.exit(razones.length ? 1 : 0);
