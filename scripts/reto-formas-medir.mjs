// RETO CON FORMAS, lo que niveles.mjs no mira: node scripts/reto-formas-medir.mjs <carpeta de master>
// (1) Reto antes de la fecha: 12 fechas iguales a master. (2) Libre con todas las mecánicas: N semillas iguales a master.
// (3) Aire real entre el último obstáculo de un bloque dif 4 y el trampolín que le sigue, en las páginas donde se metió.
// (4) Generar contra master, intercalado. (5) Variedad: fechas con formas, trampolines por partida, intentos de más.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const MASTER = process.argv[2];
if (!MASTER) throw new Error('falta la carpeta de master');
const N = Number(process.argv[3]) || 200;
const { generarNivel } = await import('../src/niveles/generar.js');
const { INTERRUPTOR } = await import('../src/niveles/formas.js');
const { BLOQUES } = await import('../src/niveles/bloques.js');
const { generarNivel: enMaster } = await import(`${MASTER}/src/niveles/generar.js`);
const { CONFIG: C } = await import('../src/config.js');
await import('../src/zanja.js');
await import(`${MASTER}/src/zanja.js`);
const B = Object.fromEntries(BLOQUES.map((b) => [b.id, b]));

const clave = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
const fechas = Array.from({ length: 365 }, (_, i) => clave(new Date(2026, 9, 29 + i)));
const json = (L) => JSON.stringify(L.entities);
const antes = fechas.filter((s) => s < INTERRUPTOR.reto);
const desde = fechas.filter((s) => s >= INTERRUPTOR.reto);

const retoDistintas = antes.filter((s) => json(generarNivel(s, 'reto')) !== json(enMaster(s, 'reto')));
const MEC = ['tramp', 'viento', 'timbre', 'zanja'];
const semillas = Array.from({ length: N }, (_, i) => String((i * 2654435761) >>> 0));
const libreDistintas = semillas.filter((s) => json(generarNivel(s, 'libre', { mecanicas: MEC })) !== json(enMaster(s, 'libre', { mecanicas: MEC })));

// Aire: de la última decisión antes del trampolín (con la cola de la ola) hasta el trampolín
const aire = { paginas: 0, min: Infinity, max: 0, conDecisionDentro: 0, ejemplos: [], dentro: [] };
const formas = {};
let trampolines = 0;
let sinFormas = 0;
for (const s of desde) {
  const L = generarNivel(s, 'reto');
  if (!L.formas) sinFormas++;
  else formas[L.formas.join(' ')] = (formas[L.formas.join(' ')] || 0) + 1;
  trampolines += L.entities.filter((e) => e.type === 'tramp').length;
  L.bloques.forEach((ids, k) => {
    const i = ids.findIndex((id, n) => n >= 2 && (id === 'tramp-intro' || id === 'tramp-nudo') && ids[n - 1] === 'relleno' && B[ids[n - 2]] && B[ids[n - 2]].dif >= 4);
    if (i < 0) return;
    const ev = [...L.tramos[k].script].sort((a, b) => a[0] - b[0]).filter(([, c]) => !c.startsWith('P5'));
    const j = ev.map(([, c]) => c).lastIndexOf('J+Avu');
    const [tp, cp] = ev[j - 1];
    const cola = cp.startsWith('OLA') ? 5 * C.waveGapSec : 0;
    const a = ev[j][0] - (tp + cola);
    if (ev.some(([t]) => t > ev[j][0] - 1.5 + 1e-6 && t < ev[j][0] - 1e-6)) {
      aire.conDecisionDentro++;
      const dentro = ev.filter(([t]) => t > ev[j][0] - 1.5 + 1e-6 && t < ev[j][0]).map(([t, c]) => `${c}@${t}`);
      if (aire.dentro.length < 6) aire.dentro.push(`${s} p${k + 1} ${L.formas[k]} ${ids.slice(Math.max(0, i - 3), i + 1).join(',')} ${dentro.join(' ')} J@${ev[j][0]}`);
    }
    aire.paginas++;
    aire.min = Math.min(aire.min, a);
    aire.max = Math.max(aire.max, a);
    if (aire.ejemplos.length < 3) aire.ejemplos.push(`${s} p${k + 1} ${ids[i - 2]} ${cp} @${tp} J @${ev[j][0]}`);
  });
}

// Generar: intercalado, misma fecha en los dos, solo fechas con formas
const ms = { rama: [], master: [] };
const reloj = (f) => {
  const t = performance.now();
  f();
  return performance.now() - t;
};
for (const s of desde) {
  ms.master.push(reloj(() => enMaster(s, 'reto')));
  ms.rama.push(reloj(() => generarNivel(s, 'reto')));
}
const stats = (a) => {
  const o = [...a].sort((x, y) => x - y);
  return { mediana: +o[o.length >> 1].toFixed(1), p95: +o[Math.floor(o.length * 0.95)].toFixed(1), max: +o[o.length - 1].toFixed(1), suma: +o.reduce((x, y) => x + y, 0).toFixed(0) };
};
const R = stats(ms.rama);
const M = stats(ms.master);

console.log(JSON.stringify({ fecha: INTERRUPTOR.reto, retoAntes: { fechas: antes.length, distintas: retoDistintas }, libre: { semillas: N, distintas: libreDistintas.length }, retoDesde: { fechas: desde.length, sinFormas, trampolinesPorPartida: +(trampolines / desde.length).toFixed(2), formasDistintas: Object.keys(formas).length }, aire, generarMs: { rama: R, master: M, xMediana: +(R.mediana / M.mediana).toFixed(2), xSuma: +(R.suma / M.suma).toFixed(2), xP95: +(R.p95 / M.p95).toFixed(2) } }, null, 1));
