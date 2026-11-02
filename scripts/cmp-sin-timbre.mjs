// Niveles sin timbre idénticos a otra copia del repo (NIVELES.md §9: "sin timbre los niveles idénticos a master"):
//   node scripts/cmp-sin-timbre.mjs <otra carpeta del repo>
// Compara entidades, tramos y zonas de viento del Clásico, 365 fechas del Reto y 100 semillas de Libre con
// [], [tramp] y [tramp, viento]. Sale 1 si alguno difiere.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const otra = process.argv[2];
const aqui = new URL('..', import.meta.url).pathname;
const cargar = async (raiz) => ({
  gen: (await import(`${raiz}/src/niveles/generar.js`)).generarNivel,
  clasico: (await import(`${raiz}/src/tramos.js`)).GAME_LEVEL,
});
const A = await cargar(aqui);
const B = await cargar(otra);
const firma = (L) => JSON.stringify({ e: L.entities, t: L.tramos, v: L.vientos || [] });
const casos = [['clasico', (X) => X.clasico]];
for (let d = 0; d < 365; d++) {
  const f = new Date(2026, 0, 1 + d);
  const s = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  casos.push([`reto ${s}`, (X) => X.gen(s, 'reto')]);
}
for (const mec of [[], ['tramp'], ['tramp', 'viento']]) {
  for (let i = 0; i < 100; i++) {
    const s = String((i * 2654435761) >>> 0);
    casos.push([`libre ${s} ${mec.join('+') || '-'}`, (X) => X.gen(s, 'libre', { mecanicas: mec })]);
  }
}
const distintos = casos.filter(([, f]) => firma(f(A)) !== firma(f(B))).map(([n]) => n);
console.log(JSON.stringify({ niveles: casos.length, distintos: distintos.length, ejemplos: distintos.slice(0, 5) }));
process.exit(distintos.length ? 1 : 0);
