// Sonda P36b: cobros de la horquilla de dos carriles. node scripts/sonda-p36b.mjs [libres=50] [fechas=30]
// Por cada horquilla (level.horq) en Libre y Reto, a -40, 0 y +40 ms: 'arriba' (mantener) debe cobrar las 5 del arco
// alto (AupH) y a lo más 1 del bajo (AdnH); 'abajo' (toque) las 4 del bajo y 0 del alto. Mismo bot que validar.js
// (despega a la mitad del recorrido aéreo), misma caja de recogida que RunScene (|dx| < 30, |h - (rise + 46)| < 34).
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { CONFIG: C } = await import('../src/config.js');
const { simulateJump, airTravel } = await import('../src/jumpmodel.js');
const { generarNivel } = await import('../src/niveles/generar.js');

const NL = Number(process.argv[2]) || 50;
const NF = Number(process.argv[3]) || 30;
const HOLD_MS = { tap: 16, hold: 400 };
const R = C.pickupReach;
const DT = 1 / 60;

function cobra(D, v, plan, jitterMs, picks) {
  const pts = simulateJump(HOLD_MS[plan]).pts;
  let dist = D - 700;
  while (!(D - dist <= airTravel(plan, v, 1) / 2 - (jitterMs / 1000) * v)) dist += v * DT;
  const tomadas = new Set();
  for (let i = 0; ; i++) {
    const j = Math.round(i * DT * 240);
    if (j >= pts.length - 1) break;
    const body = pts[j].rise + R.bodyCenter;
    for (const p of picks) if (Math.abs(p.D - dist) < R.dx && Math.abs(p.h - body) < R.dy) tomadas.add(p);
    dist += v * DT;
  }
  return tomadas;
}

const casos = [];
for (let i = 0; i < NL; i++) casos.push(['libre', String((i * 2654435761) >>> 0)]);
const d0 = new Date(2026, 10, 12);
for (let i = 0; i < NF; i++) {
  const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
  casos.push(['reto', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`]);
}

let n = 0;
const fallas = [];
const peor = { arribaAlto: 5, arribaBajo: 0, abajoBajo: 4, abajoAlto: 0 };
const porTramo = [0, 0, 0, 0];
for (const [modo, seed] of casos) {
  const L = generarNivel(seed, modo);
  if (!L.horq) continue;
  const arcos = {};
  for (const e of L.entities) if (e.kind === 'pick' && e.arc) (arcos[e.arc] = arcos[e.arc] || []).push(e);
  for (const D of L.horq) {
    let tr = 0;
    while (tr + 1 < L.starts.length && D >= L.starts[tr + 1]) tr++;
    const v = L.tramos[tr].speed;
    const cerca = Object.values(arcos).filter((a) => Math.abs(a.reduce((s, p) => s + p.D, 0) / a.length - D) < 1);
    const alto = cerca.find((a) => a.length === 5);
    const bajo = cerca.find((a) => a.length === 4);
    if (!alto || !bajo) {
      fallas.push(`${modo} ${seed} D${Math.round(D)}: sin los dos carriles`);
      continue;
    }
    n++;
    porTramo[tr]++;
    for (const jit of [-40, 0, 40]) {
      const up = cobra(D, v, 'hold', jit, [...alto, ...bajo]);
      const dn = cobra(D, v, 'tap', jit, [...alto, ...bajo]);
      const r = { arribaAlto: alto.filter((p) => up.has(p)).length, arribaBajo: bajo.filter((p) => up.has(p)).length, abajoBajo: bajo.filter((p) => dn.has(p)).length, abajoAlto: alto.filter((p) => dn.has(p)).length };
      peor.arribaAlto = Math.min(peor.arribaAlto, r.arribaAlto);
      peor.arribaBajo = Math.max(peor.arribaBajo, r.arribaBajo);
      peor.abajoBajo = Math.min(peor.abajoBajo, r.abajoBajo);
      peor.abajoAlto = Math.max(peor.abajoAlto, r.abajoAlto);
      if (r.arribaAlto < 5 || r.arribaBajo > 1 || r.abajoBajo < 4 || r.abajoAlto > 0) fallas.push(`${modo} ${seed} T${tr + 1} v${v} ${jit}ms: ${JSON.stringify(r)}`);
    }
  }
}
console.log(`horquillas ${n} (por tramo ${porTramo.join('/')}) x 3 tiempos; peor caso`, peor);
console.log(`fallas ${fallas.length}`);
for (const f of fallas.slice(0, 20)) console.log(' ', f);
process.exit(fallas.length ? 1 : 0);
