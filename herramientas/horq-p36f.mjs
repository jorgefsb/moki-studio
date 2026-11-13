// P36f paso 0: cuántas horquillas hay por partida (Reto desde 2026-11-12 y Libre) y cuánto paga cada ruta con la
// racha real (modelo con config.js, mismas reglas que RunScene.js collect). Sin navegador; no toca el juego.
// Uso: node herramientas/horq-p36f.mjs [retos=30] [libres=50] > evidencia/p36f-horq.json
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { CONFIG: C } = await import('../src/config.js');
const { generarNivel } = await import('../src/niveles/generar.js');
const NR = Number(process.argv[2]) || 30;
const NL = Number(process.argv[3]) || 50;
const dia = (i) => new Date(Date.UTC(2026, 10, 12 + i)).toISOString().slice(0, 10);
const cuenta = (lv) => (lv.horq || []).length;
const retos = Array.from({ length: NR }, (_, i) => cuenta(generarNivel(dia(i), 'reto')));
const libres = Array.from({ length: NL }, (_, i) => cuenta(generarNivel(String(1000 + i), 'libre', { mecanicas: [] })));
const prom = (a) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
// valor de un arco de n piezas entrando con racha c0 (piezas seguidas dentro de la ventana)
function arco(n, c0, bono) {
  let v = 0;
  for (let i = 1; i <= n; i++) {
    let m = 1;
    for (const [from, x] of C.combo.steps) if (c0 + i >= from) m = x;
    v += m;
  }
  return v + bono;
}
const alto = C.arcBonusAlto ?? C.arcBonus;
const rutas = [0, 3, 6].map((c0) => {
  const a = arco(5, c0, alto), b = arco(4, c0, C.arcBonus);
  return { rachaAlEntrar: c0, arriba: a, abajo: b, ratio: +(a / b).toFixed(2), difPts: (a - b) * C.scorePerPiece };
});
console.log(JSON.stringify({ arcBonus: C.arcBonus, arcBonusAlto: alto, horqPorPartida: { reto: { prom: prom(retos), min: Math.min(...retos), max: Math.max(...retos) }, libre: { prom: prom(libres), min: Math.min(...libres), max: Math.max(...libres) } }, rutas, retos, libres }, null, 1));
