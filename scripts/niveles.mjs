// Valida niveles sin navegador: node scripts/niveles.mjs [semillas libres=500]
// 365 fechas del Reto + N semillas libres: el bot adjust debe terminar, tap y hold deben morir; reporta % de respaldo.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { GAME_LEVEL } = await import('../src/tramos.js');
const { validateLevel } = await import('../src/niveles/validar.js');
const { generarNivel } = await import('../src/niveles/generar.js');

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
  // uso de sorpresas/bloques: firma del guion por tramo
  L.tramos.forEach((tr) => tr.script.forEach(([, c]) => (uso[c] = (uso[c] || 0) + 1)));
}
// mismo seed = mismo nivel
const same = JSON.stringify(generarNivel('2026-10-29').entities) === JSON.stringify(generarNivel('2026-10-29').entities);
const diff = JSON.stringify(generarNivel('2026-10-29').entities) !== JSON.stringify(generarNivel('2026-10-30').entities);
console.log({ niveles: seeds.length, fallos: bad.length, respaldoTramos: fb, holguraMinPx: minClear, tapMuereSeg: [Math.min(...tapAt), Math.max(...tapAt)], holdMuereEnTramo: holdTramo, mismaSemillaMismoNivel: same, otraFechaOtroNivel: diff });
if (bad.length) console.log(bad.slice(0, 10));
console.log('codigos', uso);
process.exit(bad.length || !same || !diff ? 1 : 0);
