// Páginas con pico débil: node scripts/fp-paginas.mjs [umbral=10]
// FP por página 2-4 (como scripts/flow-medir.mjs): % de obstáculos duros (torre, viga, caja+viga, caja doble) en el
// pico (14-24 s) menos el % en calma+respiro (0-4 y 24-30 s). Cuenta páginas con FP < umbral en 100 Retos (desde
// 2026-11-01), 100 Libres sin mecánica y 100 Libres con trampolín.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { generarNivel, fpPagina } = await import('../src/niveles/generar.js');
const U = Number(process.argv[2]) || 10;

const fechas = Array.from({ length: 100 }, (_, i) => {
  const d = new Date(2026, 10, 1 + i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});
const semillas = Array.from({ length: 100 }, (_, i) => String((i * 2654435761) >>> 0));
const grupos = {
  reto: fechas.map((f) => generarNivel(f, 'reto')),
  libre: semillas.map((s) => generarNivel(s, 'libre')),
  libreTramp: semillas.map((s) => generarNivel(s, 'libre', { mecanicas: ['tramp'] })),
};
const out = { umbral: U };
for (const [k, niveles] of Object.entries(grupos)) {
  const bajas = [];
  let paginas = 0;
  let suma = 0;
  niveles.forEach((L) => {
    L.tramos.slice(1).forEach((tr, p) => {
      paginas++;
      const fp = fpPagina(tr.script);
      suma += fp;
      if (fp < U) bajas.push(`${L.seed} p${p + 2} ${fp.toFixed(1)}`);
    });
  });
  out[k] = { paginas, bajoUmbral: bajas.length, fpPromedio: +(suma / paginas).toFixed(1), respaldo: niveles.reduce((n, L) => n + L.fallbacks.length, 0), ejemplos: bajas.slice(0, 8) };
}
console.log(JSON.stringify(out, null, 1));
