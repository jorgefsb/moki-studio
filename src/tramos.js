// Guiones de los 4 tramos (DISENO.md §2) y del demo de 38 s (PROPUESTAS-FONDO-DEMO.md §1A).
// Cada patrón es [tiempo de llegada a Moki en s desde el inicio del tramo, código]. Sin azar: mismo tramo, mismos obstáculos.
//
// Obstáculos: C caja · T torre · CC dos cajas pegadas (un salto largo) · C.C dos cajas a 0.9 s · V viga ·
//   VC caja bajo viga · T.V torre y viga 1.0 s después · C.V caja y viga 0.9 s después · T.C torre y caja 0.9 s después ·
//   P5 fila de 5 piezas en el suelo · OLA 6 cajas cada 0.8 s con una pieza sobre cada una · U pop-up (caja que sale del suelo).
// Premios (con "+"): A3 arco corto de 3 · A3up arco alto de 3 · Aup arco alto de 5 · Adn arco bajo de 4 ·
//   Aup7 arco regalo de 7 · AupAmb arco alto con pieza ámbar · Aup7Amb arco de 7 con ámbar · P5 fila bajo la viga.
import { CONFIG as C } from './config.js';

export const TRAMO_SPEEDS = C.tramos.map((t) => t.speed);

// T1 (decisión tras T3a): la lección "Mantén" llega pronto, con la torre de 7.5 s (arco alto de 3 piezas); la de 21 s se queda.
const T1 = [[2.5, 'C+A3'], [5, 'C'], [7.5, 'T+A3up'], [10, 'P5'], [12.5, 'C+Aup'], [15.5, 'C'], [18, 'C'], [21, 'T'], [23.5, 'T'], [26, 'T+Aup7'], [28, 'P5']];
const T2 = [[2, 'C'], [4, 'T'], [6, 'C.C'], [9, 'T'], [11, 'CC+Aup'], [13.5, 'P5'], [15.5, 'T.C'], [18, 'CC'], [20.5, 'C'], [22, 'T+AupAmb'], [24.5, 'C.C'], [27, 'T']];
const T3 = [[2, 'V'], [4.5, 'VC'], [7, 'V+P5'], [9.5, 'T'], [11.5, 'T.V'], [14.5, 'C.V'], [17, 'VC'], [19.5, 'P5'], [21.5, 'V+Adn'], [24, 'CC'], [26, 'T.C']];
const T4 = [[2, 'VC'], [4, 'T.V'], [6.5, 'CC'], [8.5, 'OLA'], [15.5, 'P5'], [17.5, 'T'], [19.5, 'C.V'], [22, 'P5'], [24, 'T.C'], [26, 'VC'], [27.5, 'P5']];

export const SCRIPTS = [T1, T2, T3, T4]; // guion clásico: respaldo del generador y ?nivel=clasico

// Arcos: alturas de las piezas sobre el suelo (DISENO §4) y separación.
const ARCS = {
  A3: { h: [91, 113, 91], gap: 48 },
  A3up: { h: [104, 146, 104], gap: 44 },
  Aup: { h: [104, 146, 164, 146, 104], gap: 44 },
  Adn: { h: [91, 113, 113, 91], gap: 48 },
  // el arco de 7 va más junto (30 px): con un salto largo el cuerpo de Moki solo alcanza ±100 px alrededor del apex
  Aup7: { h: [100, 120, 146, 164, 146, 120, 100], gap: 30 },
  AupAmb: { h: [104, 146, 164, 146, 104], gap: 44, amber: 2 },
  Aup7Amb: { h: [100, 120, 146, 164, 146, 120, 100], gap: 30, amber: 3 },
};

const OBS = {
  C: [{ type: 'caja', at: 0, plan: 'tap' }],
  T: [{ type: 'torre', at: 0, plan: 'hold' }],
  CC: [{ type: 'caja', at: 0, plan: 'hold' }, { type: 'caja', atPx: C.cajaPegadaGapPx, plan: 'skip' }],
  'C.C': [{ type: 'caja', at: 0, plan: 'tap' }, { type: 'caja', at: C.pairGapSec, plan: 'tap' }],
  V: [{ type: 'viga', at: 0, plan: 'none' }],
  VC: [{ type: 'caja', at: 0, plan: 'tap' }, { type: 'viga', at: 0, plan: 'none' }],
  'T.V': [{ type: 'torre', at: 0, plan: 'hold' }, { type: 'viga', at: 1.0, plan: 'none' }],
  'C.V': [{ type: 'caja', at: 0, plan: 'tap' }, { type: 'viga', at: C.pairGapSec, plan: 'none' }],
  'T.C': [{ type: 'torre', at: 0, plan: 'hold' }, { type: 'caja', at: C.pairGapSec, plan: 'tap' }],
  U: [{ type: 'caja', at: 0, plan: 'tap', pop: true }], // pop-up: caja que sale del suelo (solo en bloques del generador)
};

// Convierte un patrón en entidades (D = px desde el inicio del tramo hasta que el centro llega a Moki).
function expand(code, t, speed, tramo, arcSeq) {
  const out = [];
  const [main, reward] = code.split('+');
  const base = speed * t;
  const hint = {};
  if (main === 'P5') {
    for (let i = 0; i < 5; i++) out.push({ kind: 'pick', D: base + (i - 2) * 48, h: 46 });
  } else if (main === 'OLA') {
    for (let i = 0; i < 6; i++) {
      const D = base + i * C.waveGapSec * speed;
      out.push({ kind: 'obs', type: 'caja', D, plan: 'tap' });
      out.push({ kind: 'pick', D, h: 95 });
    }
  } else {
    let first = null;
    // Un arco alto sobre una caja solo se cobra completo manteniendo: el bot que busca las piezas mantiene (se libra igual tocando)
    const holdForArc = reward && reward.startsWith('Aup');
    for (const o of OBS[main]) {
      const D = base + (o.atPx !== undefined ? o.atPx : o.at * speed);
      out.push({ kind: 'obs', type: o.type, D, plan: holdForArc && o.plan === 'tap' && first === null ? 'hold' : main === 'V' && reward === 'Adn' ? 'tap' : o.plan, ...(o.pop && { pop: true }) });
      if (first === null) first = D;
    }
    hint.center = main === 'CC' ? base + C.cajaPegadaGapPx / 2 : base;
  }
  if (reward) {
    if (reward === 'P5') {
      for (let i = 0; i < 5; i++) out.push({ kind: 'pick', D: base + (i - 2) * 48, h: 46 });
    } else {
      const arc = ARCS[reward];
      const id = `${tramo}:${arcSeq.n++}`;
      const n = arc.h.length;
      for (let i = 0; i < n; i++) {
        out.push({ kind: 'pick', D: hint.center + (i - (n - 1) / 2) * arc.gap, h: arc.h[i], arc: id, arcN: n, amber: arc.amber === i });
      }
    }
  }
  return out;
}

// Un nivel = lista de tramos { speed, len (s), script } -> entidades globales ordenadas por D.
export function buildLevel(tramos) {
  const starts = [];
  let acc = 0;
  const entities = [];
  const arcSeq = { n: 0 };
  tramos.forEach((tr, i) => {
    starts.push(acc);
    for (const [t, code] of tr.script) {
      for (const e of expand(code, t, tr.speed, i, arcSeq)) entities.push({ ...e, D: e.D + acc });
    }
    acc += tr.len * tr.speed;
  });
  entities.sort((a, b) => a.D - b.D);
  return {
    tramos,
    starts, // distancia global de inicio de cada tramo (checkpoint)
    end: acc, // meta
    entities,
    pieceTotal: entities.filter((e) => e.kind === 'pick').length,
  };
}

export const GAME_LEVEL = buildLevel(C.tramos.map((tr, i) => ({ speed: tr.speed, len: C.checkpointEverySec, script: SCRIPTS[i] })));

// ---------- Demo (38 s, determinista; variantes A, B, C rotan por vuelta) ----------
const DEMO_VARIANTS = {
  A: { s95: 'T', s13: 'C+Aup', s18: 'V+P5' },
  B: { s95: 'CC', s13: 'C+Aup', s18: 'VC' },
  C: { s95: 'T', s13: 'T+Aup', s18: 'V+Adn' },
};

// reduced: con movimiento reducido el demo se queda a la velocidad del tramo 1 todo el tiempo (UX)
export function buildDemo(variant = 'A', reduced = false) {
  const v = DEMO_VARIANTS[variant];
  const a = [[2.5, 'C'], [5, 'C'], [7, 'P5'], [9.5, v.s95], [13, v.s13], [15.5, 'P5'], [18, v.s18], [21.5, 'C.C'], [25, 'T+Aup7Amb']];
  const b = [[3, 'C']];
  return buildLevel([
    { speed: 320, len: 30, script: a },
    { speed: reduced ? 320 : 350, len: 6.4, script: b },
  ]);
}
