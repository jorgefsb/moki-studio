// Inventario de Encargos (E1): qué garantiza cada tramo en Clásico, Reto y Libre, sin navegador.
//   node scripts/inventario-encargos.mjs [semillas libres=500] > evidencia/v2-e1-inventario.json
// "Garantiza" = mínimo sobre todas las semillas del modo. Clásico = GAME_LEVEL (un solo nivel).
// Reto = 365 fechas desde el 1-nov-2026. Libre = N semillas como las de scripts/niveles.mjs.
// Solo cuenta lo que el nivel pone; si el bot lo cumple lo dice la prueba en navegador.
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { CONFIG: C } = await import('../src/config.js');
const { GAME_LEVEL } = await import('../src/tramos.js');
const { generarNivel } = await import('../src/niveles/generar.js');

const N = Number(process.argv[2]) || 500;
const fechas = [];
for (let i = 0; i < 365; i++) {
  const d = new Date(2026, 10, 1 + i);
  fechas.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
}
const libres = Array.from({ length: N }, (_, i) => String((i * 2654435761) >>> 0));

// Cuenta un tramo (i) del nivel: lo que el jugador pasa y lo que puede recoger.
function contar(L, i) {
  const a = L.starts[i];
  const b = i + 1 < L.starts.length ? L.starts[i + 1] : L.end;
  const es = L.entities.filter((e) => e.D >= a && e.D < b);
  const obs = es.filter((e) => e.kind === 'obs');
  const picks = es.filter((e) => e.kind === 'pick');
  const arcos = new Map();
  for (const p of picks) if (p.arc) arcos.set(p.arc, p.arcN);
  // racha posible: piezas seguidas con menos de windowMs entre una y otra a la velocidad del tramo
  const v = L.tramos[i].speed;
  let racha = 0;
  let run = 0;
  let prev = null;
  for (const p of [...picks].sort((x, y) => x.D - y.D)) {
    run = prev !== null && ((p.D - prev) / v) * 1000 <= C.combo.windowMs ? run + 1 : 1;
    racha = Math.max(racha, run);
    prev = p.D;
  }
  return {
    cajas: obs.filter((e) => e.type === 'caja').length,
    torres: obs.filter((e) => e.type === 'torre').length,
    vigas: obs.filter((e) => e.type === 'viga').length,
    cajasPegadas: obs.filter((e) => e.plan === 'skip').length, // saltos largos (CC)
    vigaConCajaDebajo: obs.filter((e) => e.type === 'viga' && obs.some((q) => q.type === 'caja' && q.D === e.D)).length,
    piezas: picks.length,
    ambar: picks.filter((e) => e.amber).length,
    arcos: arcos.size,
    arcos5omas: [...arcos.values()].filter((n) => n >= 5).length,
    filasP5: es.length ? Math.round(picks.filter((p) => !p.arc && p.h === 46).length / 5) : 0,
    rachaPosible: racha,
  };
}

const CAMPOS = ['cajas', 'torres', 'vigas', 'cajasPegadas', 'vigaConCajaDebajo', 'piezas', 'ambar', 'arcos', 'arcos5omas', 'filasP5', 'rachaPosible'];

// min / max por tramo y acumulado hasta el final de cada tramo, sobre un conjunto de niveles
function resumir(niveles) {
  const out = { niveles: niveles.length, fallbacksTramos: niveles.reduce((s, L) => s + (L.fallbacks ? L.fallbacks.length : 0), 0), porTramo: [], acumulado: [] };
  for (let i = 0; i < 4; i++) {
    const tr = {};
    const ac = {};
    for (const k of CAMPOS) {
      const vals = niveles.map((L) => contar(L, i)[k]);
      tr[k] = { min: Math.min(...vals), max: Math.max(...vals) };
      if (k !== 'rachaPosible') {
        const acv = niveles.map((L) => Array.from({ length: i + 1 }, (_, j) => contar(L, j)[k]).reduce((s, x) => s + x, 0));
        ac[k] = { min: Math.min(...acv), max: Math.max(...acv) };
      }
    }
    out.porTramo.push(tr);
    out.acumulado.push(ac);
  }
  const tot = niveles.map((L) => L.pieceTotal);
  out.pieceTotal = { min: Math.min(...tot), max: Math.max(...tot) };
  return out;
}

const clasico = resumir([GAME_LEVEL]);
const reto = resumir(fechas.map((s) => generarNivel(s, 'reto')));
const libre = resumir(libres.map((s) => generarNivel(s, 'libre')));
console.log(JSON.stringify({ generado: new Date().toISOString(), semillas: { reto: `${fechas[0]}..${fechas[fechas.length - 1]}`, libre: N }, clasico, reto, libre }, null, 1));
