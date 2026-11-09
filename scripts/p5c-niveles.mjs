// P5c (director 9-nov): mecánicas por nivel del Cuaderno en el Reto. Sin navegador.
//   node scripts/p5c-niveles.mjs [fechas=60]
// Por nivel 1-10: mecánicas, fallbacks, muertes inevitables del validador (bot medio a ±0 y ±40 ms), apariciones de cada
// mecánica y el mínimo garantizado de lo que piden los encargos de ese nivel. Nivel 1 debe ser idéntico al Reto de master.
globalThis.__JORGE_INTERVENTIONS__ = 0;
globalThis.window = globalThis.window || { location: { search: '' } }; // barra.js lee storage.js
await import('../src/zanja.js'); // registra la zanja (en el juego baja en diferido)
const { generarNivel } = await import('../src/niveles/generar.js');
const { validateLevel } = await import('../src/niveles/validar.js');
const { mecanicasDeNivel } = await import('../src/barra.js');
const { CONFIG: C } = await import('../src/config.js');
// racha posible: piezas seguidas a <= windowMs (como scripts/inventario-encargos.mjs)
const racha = (L, es, i) => {
  const v = L.tramos[i].speed;
  let best = 0, run = 0, prev = null;
  for (const p of es.filter((e) => e.kind === 'pick').sort((x, y) => x.D - y.D)) {
    run = prev !== null && ((p.D - prev) / v) * 1000 <= C.combo.windowMs ? run + 1 : 1;
    best = Math.max(best, run);
    prev = p.D;
  }
  return best;
};

const N = Number(process.argv[2]) || 60;
const fechas = [];
for (let i = 0; i < N; i++) {
  const d = new Date(2026, 10, 1 + i);
  fechas.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
}
const tipos = (L) => {
  const o = {};
  for (const e of L.entities) if (e.kind === 'obs') o[e.type] = (o[e.type] || 0) + 1;
  if (L.vientos) o.viento = L.vientos.length;
  return o;
};
const pagina = (L, i) => L.entities.filter((e) => e.D >= L.starts[i] && e.D < (i + 1 < L.starts.length ? L.starts[i + 1] : L.end));
const arcos = (es) => new Set(es.filter((e) => e.kind === 'pick' && e.arc).map((e) => e.arc)).size;

const fuera = [];
for (let nv = 1; nv <= 10; nv++) {
  const mec = mecanicasDeNivel(nv);
  let fb = 0, muertes = 0, conMec = 0;
  const apar = {};
  const min = { caja: Infinity, torre: Infinity, viga: Infinity, piezas: Infinity, arcos: Infinity, arcoP1: Infinity, arcoP2: Infinity, arcoP3: Infinity, ambar: Infinity, rachaP1: Infinity, rachaMax: Infinity };
  for (const f of fechas) {
    const L = generarNivel(f, 'reto', mec.length ? { nivelMec: mec, nivel: nv } : {});
    if (nv === 1) {
      const base = generarNivel(f, 'reto');
      if (JSON.stringify(base.entities) !== JSON.stringify(L.entities)) fuera.push(f);
    }
    fb += L.fallbacks.length;
    for (const j of [0, 40, -40]) if (!validateLevel(L, null, j).ok) muertes++;
    const t = tipos(L);
    let alguna = false;
    for (const m of ['zanja', 'tramp', 'viento', 'timbre']) if (t[m]) { apar[m] = (apar[m] || 0) + 1; if (mec.includes(m)) alguna = true; }
    if (alguna) conMec++;
    min.caja = Math.min(min.caja, t.caja || 0);
    min.torre = Math.min(min.torre, t.torre || 0);
    min.viga = Math.min(min.viga, t.viga || 0);
    min.piezas = Math.min(min.piezas, L.pieceTotal);
    min.arcos = Math.min(min.arcos, arcos(L.entities));
    min.arcoP1 = Math.min(min.arcoP1, arcos(pagina(L, 0)));
    min.arcoP2 = Math.min(min.arcoP2, arcos(pagina(L, 1)));
    min.arcoP3 = Math.min(min.arcoP3, arcos(pagina(L, 2)));
    min.rachaP1 = Math.min(min.rachaP1, racha(L, pagina(L, 0), 0));
    min.rachaMax = Math.min(min.rachaMax, Math.max(...[0, 1, 2, 3].map((i) => racha(L, pagina(L, i), i))));
    min.ambar = Math.min(min.ambar, L.entities.filter((e) => e.kind === 'pick' && e.amber).length);
  }
  console.log(JSON.stringify({ nivel: nv, mec, fechas: N, conMecNueva: conMec, apariciones: apar, fallbacks: fb, muertesValidador: muertes, min }));
}
console.log(JSON.stringify({ nivel1IdenticoAMaster: fuera.length === 0, distintas: fuera }));
