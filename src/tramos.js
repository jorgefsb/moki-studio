// Guiones de los 4 tramos (DISENO.md §2) y del demo de 38 s (PROPUESTAS-FONDO-DEMO.md §1A).
// Cada patrón es [tiempo de llegada a Moki en s desde el inicio del tramo, código]. Sin azar: mismo tramo, mismos obstáculos.
//
// Obstáculos: C caja · T torre · CC dos cajas pegadas (un salto largo) · C.C dos cajas a 0.9 s · V viga ·
//   VC caja bajo viga · T.V torre y viga 1.0 s después · C.V caja y viga 0.9 s después · T.C torre y caja 0.9 s después ·
//   P5 fila de 5 piezas en el suelo · OLA 6 cajas cada 0.8 s con una pieza sobre cada una · U pop-up (caja que sale del suelo) ·
//   J trampolín de cartón (pisarlo lanza; solo bloques del generador con mecánica 'tramp').
//   Z zanja corta y ZZ zanja larga (hueco en el suelo, NIVELES.md §10; solo bloques con mecánica 'zanja', en Libre).
// Premios (con "+"): A3 arco corto de 3 · A3up arco alto de 3 · Aup arco alto de 5 · Adn arco bajo de 4 ·
//   Aup7 arco regalo de 7 · AupAmb arco alto con pieza ámbar · Aup7Amb arco de 7 con ámbar · P5 fila bajo la viga ·
//   Avu arco del vuelo del trampolín (5 piezas sobre la curva del lanzamiento).
// Viento: sufijo > (a favor) o < (en contra) sobre un código de OBS (C>, C<, T>): mismo obstáculo y una zona
//   { kind: 'viento', D0, D1, k } que estira o encoge el salto que despega dentro (arco con gap * k).
// Timbre (NIVELES.md §9): B timbre solo, +B timbre encima de una caja (C+B). buildLevel lo enlaza con la primera torre
//   a <= 1.2 s (mismo tid): el arco de esa torre lleva pie (se va si cae) y salen 5 piezas de piso con cae.
import { CONFIG as C } from './config.js';
import { simulateBounce } from './jumpmodel.js';

// Moki pisa el trampolín cuando su centro llega a TRAMP_PISA px antes del centro del trampolín (juego y validador).
export const TRAMP_PISA = 20;
const VUELO_T = [0.12, 0.3, 0.5, 0.7, 0.85]; // s desde que pisa: piezas del arco Avu

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
  // horquilla (P36b): dos carriles a ±60 px, el alto para quien mantiene y el bajo (a ras) para quien toca
  AupH: { h: [150, 172, 182, 172, 150], gap: 30 },
  AdnH: { h: [64, 80, 80, 64], gap: 32 }, // a ras: más bajo y junto que Adn, o quien mantiene lo cobra al subir y al bajar (sonda-p36b)
};

// EXT: mecánicas diferidas (EXT.z, src/zanja.js, solo Libre) registran aquí sus patrones y reglas
export const EXT = {};
export const OBS = {
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
  J: [{ type: 'tramp', at: 0, plan: 'none' }], // trampolín: el bot de "arriba" lo pisa, el de "abajo" lo salta (tap)
  B: [{ type: 'timbre', at: 0, plan: 'hold' }], // timbre: el bot de "arriba" lo toca (mantener), el de "abajo" no
};

// Convierte un patrón en entidades (D = px desde el inicio del tramo hasta que el centro llega a Moki).
function expand(code, t, speed, tramo, arcSeq) {
  const out = [];
  const [main0, ...rewards] = code.split('+');
  const reward = rewards[0];
  const sopla = /[<>]$/.test(main0) ? main0.slice(-1) : null;
  const main = sopla ? main0.slice(0, -1) : main0;
  const k = sopla === '>' ? C.viento.favor : sopla === '<' ? C.viento.contra : 1;
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
      out.push({ kind: 'obs', type: o.type, D, plan: holdForArc && o.plan === 'tap' && first === null ? 'hold' : main === 'V' && reward === 'Adn' ? 'tap' : o.plan, ...(o.pop && { pop: true }), ...(o.W && { W: o.W * speed }) });
      if (first === null) first = D;
    }
    hint.center = main === 'CC' ? base + C.cajaPegadaGapPx / 2 : base;
  }
  for (const reward of rewards) {
    if (reward === 'B') out.push({ kind: 'obs', type: 'timbre', D: base, plan: 'hold' }, Object.assign(out.pop(), { conTimbre: true }));
    else if (reward === 'Avu') {
      const b = simulateBounce();
      const id = `${tramo}:${arcSeq.n++}`;
      VUELO_T.forEach((vt, i) => {
        const rise = b.pts[Math.round(vt * 240)].rise;
        out.push({ kind: 'pick', D: base - TRAMP_PISA + vt * speed, h: Math.round(rise + C.pickupReach.bodyCenter), arc: id, arcN: VUELO_T.length, amber: false });
      });
    } else if (reward === 'P5') {
      for (let i = 0; i < 5; i++) out.push({ kind: 'pick', D: base + (i - 2) * 48, h: 46 });
    } else {
      const arc = ARCS[reward];
      const id = `${tramo}:${arcSeq.n++}`;
      const n = arc.h.length;
      for (let i = 0; i < n; i++) {
        out.push({ kind: 'pick', D: hint.center + (i - (n - 1) / 2) * arc.gap * k, h: arc.h[i], arc: id, arcN: n, amber: arc.amber === i });
      }
    }
  }
  if (sopla) {
    const obs = out.filter((e) => e.kind === 'obs').map((e) => e.D);
    out.push({ kind: 'viento', D0: Math.min(...obs) - C.viento.antesSec * speed, D1: Math.max(...obs) + C.viento.despuesSec * speed, k });
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
      for (const e of expand(code, t, tr.speed, i, arcSeq)) entities.push(e.kind === 'viento' ? { ...e, D: e.D0 + acc, D0: e.D0 + acc, D1: e.D1 + acc } : { ...e, D: e.D + acc });
    }
    acc += tr.len * tr.speed;
  });
  entities.sort((a, b) => a.D - b.D);
  // Viento: dos zonas seguidas con el mismo k y a menos de 0.3 s se juntan en una
  const zonas = [];
  for (const z of entities.filter((e) => e.kind === 'viento')) {
    const p = zonas[zonas.length - 1];
    let tr = 0;
    while (tr + 1 < starts.length && z.D0 >= starts[tr + 1]) tr++;
    if (p && p.k === z.k && z.D0 - p.D1 < 0.3 * tramos[tr].speed) p.D1 = Math.max(p.D1, z.D1);
    else zonas.push({ ...z });
  }
  // Lo que pasa bajo el vuelo de un trampolín (el "nudo"): en la ruta de arriba no se salta, se sobrevuela.
  entities.forEach((j) => {
    if (j.kind !== 'obs' || j.type !== 'tramp') return;
    let tr = 0;
    while (tr + 1 < starts.length && j.D >= starts[tr + 1]) tr++;
    const v = tramos[tr].speed;
    const air = simulateBounce().air;
    for (const o of entities) if (o.kind === 'obs' && o !== j && o.D > j.D && o.D - j.D + TRAMP_PISA < air * v - 30) o.bajo = true;
  });
  // Timbre: enlaza con la primera torre a <= 1.2 s; su arco se va si la torre cae y salen 5 piezas de piso (h 46, cada
  // 28 px, centradas en la torre acostada: gira sobre su pie delantero, así que queda de D + 30 a D + 122)
  let tid = 0;
  for (const b of entities.filter((e) => e.type === 'timbre')) {
    let tr = 0;
    while (tr + 1 < starts.length && b.D >= starts[tr + 1]) tr++;
    const t = entities.find((o) => o.type === 'torre' && o.D > b.D && o.D - b.D <= 1.2 * tramos[tr].speed);
    if (!t) continue;
    b.tid = t.tid = ++tid;
    for (const k of entities) if (k.kind === 'pick' && k.arc && Math.abs(k.D - t.D) < 100) k.pie = tid;
    for (let i = 0; i < 5; i++) entities.push({ kind: 'pick', D: t.D + 76 + (i - 2) * 28, h: 46, cae: tid });
  }
  if (tid) entities.sort((a, b) => a.D - b.D);
  return {
    tramos,
    starts, // distancia global de inicio de cada tramo (checkpoint)
    end: acc, // meta
    entities: entities.filter((e) => e.kind !== 'viento'),
    zanjas: entities.filter((e) => e.type === 'zanja').map((e) => ({ H0: e.D - e.W / 2, H1: e.D + e.W / 2 })), // sin zanjas (Clásico, Reto): vacío
    vientos: zonas,
    pieceTotal: entities.filter((e) => e.kind === 'pick' && !e.cae).length + 2 * tid, // con timbre, la ruta que más da (5 contra 3)
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
