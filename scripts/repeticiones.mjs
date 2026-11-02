// Repeticiones (NIVELES.md flow, "No repetir"): node scripts/repeticiones.mjs
// Entre fechas seguidas del Reto (365 días desde 2026-10-29), misma página: firma del pico (patrones de 14 a 24 s,
// sin filas), final (patrón@segundo de 24 a 30 s) y página entera iguales. Dentro de cada nivel (Reto 365 + Libre 100
// con trampolín): regla (b), el pico repite la firma del pico de la página anterior; regla (c), un bloque sale en la
// misma fase de dos páginas seguidas (solo si el generador expone bloquesFase).
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { generarNivel } = await import('../src/niveles/generar.js');

const principal = (c) => c.split('+')[0];
const enRango = (script, a, b) => [...script].sort((x, y) => x[0] - y[0]).filter(([t, c]) => t >= a && t < b && principal(c) !== 'P5');
const firmaPico = (script) => enRango(script, 14, 24).map(([, c]) => principal(c)).join(' ');
const final = (script) => enRango(script, 24, 30).map(([t, c]) => `${principal(c)}@${t}`).join(' ');
const finalPatrones = (script) => enRango(script, 24, 30).map(([, c]) => principal(c)).join(' '); // sin tiempos: la jugada, no el reloj
const pagina = (script) => [...script].sort((x, y) => x[0] - y[0]).map(([t, c]) => `${c}@${t}`).join(' ');

const fechas = [];
for (let i = 0; i < 365; i++) {
  const d = new Date(2026, 9, 29 + i);
  fechas.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
}
const retos = fechas.map((f) => generarNivel(f, 'reto'));
const libres = Array.from({ length: 100 }, (_, i) => generarNivel(String((i * 2654435761) >>> 0), 'libre', { mecanicas: ['tramp'] }));

const entreFechas = { pares: 0, paginas: 0, mismoPico: 0, mismoFinal: 0, mismoFinalPatrones: 0, mismoPicoYFinalPatrones: 0, mismaPagina: 0, porPagina: { 1: 0, 2: 0, 3: 0, 4: 0 } };
for (let i = 1; i < retos.length; i++) {
  entreFechas.pares++;
  for (let p = 0; p < 4; p++) {
    const a = retos[i - 1].tramos[p].script;
    const b = retos[i].tramos[p].script;
    entreFechas.paginas++;
    const pico = firmaPico(a) === firmaPico(b);
    const fin = final(a) === final(b);
    if (pico) entreFechas.mismoPico++;
    if (fin) entreFechas.mismoFinal++;
    const finP = finalPatrones(a) === finalPatrones(b);
    if (finP) entreFechas.mismoFinalPatrones++;
    if (finP && pico) entreFechas.mismoPicoYFinalPatrones++;
    if (pico && fin) entreFechas.porPagina[p + 1]++;
    if (pagina(a) === pagina(b)) entreFechas.mismaPagina++;
  }
}

const dentro = (niveles) => {
  const r = { niveles: niveles.length, paginasSeguidas: 0, reglaB: 0, reglaC: null };
  for (const L of niveles) {
    for (let p = 1; p < L.tramos.length; p++) {
      r.paginasSeguidas++;
      if (firmaPico(L.tramos[p].script) === firmaPico(L.tramos[p - 1].script)) r.reglaB++;
      if (L.bloquesFase) {
        const antes = new Set(L.bloquesFase[p - 1].filter(([, id]) => id !== 'relleno').map(([f, id]) => `${f}:${id}`));
        r.reglaC = (r.reglaC || 0) + L.bloquesFase[p].filter(([f, id]) => id !== 'relleno' && antes.has(`${f}:${id}`)).length;
      }
    }
  }
  return r;
};
const usoDoble = libres.reduce((n, L) => n + L.bloques.flat().filter((id) => id === 'tramp-doble').length, 0);
console.log(JSON.stringify({ entreFechasReto: entreFechas, dentroReto: dentro(retos), dentroLibreTramp: dentro(libres), trampDobleEnLibre100: usoDoble }, null, 1));
