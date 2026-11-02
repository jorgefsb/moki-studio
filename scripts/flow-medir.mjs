// MEDIR FLOW (NIVELES.md "Flow y mecánicas (plan 1-nov)", punto 1): cuánta variedad tiene una partida, sin navegador.
//   node scripts/flow-medir.mjs [semillas libres=10] [mecánica: tramp] > evidencia/v2-flow-base.json
//   (con mecánica, Libre se genera con ella destrabada; Clásico y Reto nunca la llevan)
// Instrumento fuera del paquete del juego (como scripts/inventario-encargos.mjs): lee el nivel que arma el juego
// (GAME_LEVEL y generarNivel) y su guion por tramo [segundo, código]; no cambia nada del juego. Determinista: misma
// semilla, mismo número.
//
// Decisión = obstáculo donde algún plan de {none, tap, hold} cambia el resultado: C, T, V, U, VC (1), CC (1), cada
// obstáculo de los pares (C.C, T.C, T.V, C.V) y cada caja de OLA; el arco (A3, Aup...) va con el obstáculo de su
// bloque. Las filas P5 solas no cuentan. Tiempo = llegada a la x de Moki (inicio del tramo + segundo + desfase).
// Patrón = el código sin piezas (C+A3 -> C).
//   F1  patrones distintos por ventana de 60 s (promedio); F1b tipos base distintos por ventana
//   F2a hueco más largo entre dos decisiones (sin los 2 s tras cada checkpoint); F2b % de la partida en huecos > 2.5 s
//   F3  secuencia más larga de fichas patrón@hueco(0.25 s) que sale 2 veces o más sin encimarse (segundos);
//       F3b veces que una secuencia de 2+ fichas se repite pegada a sí misma
//   F4  % de decisiones con elección real: 2+ planes sobreviven (a -40, 0 y +40 ms del despegue) y cobran distintas
//       piezas; F4b promedio de planes que sobreviven
//   F6  segundos más largos sin un patrón nuevo en la partida
// F4 es un MODELO: simulateJump (mismas ecuaciones que el juego) contra cajas de choque aproximadas con config.js
// (caja libra con 38 px, torre con 78, la viga castiga arriba de 94). Se revisa contra el nivel: el plan que el nivel
// asigna a cada obstáculo tiene que sobrevivir en el modelo (campo "modeloCoincide").
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { CONFIG: C } = await import('../src/config.js');
const { GAME_LEVEL, SCRIPTS } = await import('../src/tramos.js');
const { generarNivel } = await import('../src/niveles/generar.js');
const { simulateJump, simulateBounce } = await import('../src/jumpmodel.js');

const N_LIBRES = Number(process.argv[2]) || 10;
const MEC = process.argv[3] ? [process.argv[3]] : [];
const LIBRES = Array.from({ length: N_LIBRES }, (_, i) => String((i * 2654435761) >>> 0));
const RETOS = Array.from({ length: 10 }, (_, i) => {
  const d = new Date(2026, 10, 1 + i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

// Desfases (s) de cada obstáculo dentro de su bloque, como OBS de tramos.js
const PARTES = {
  C: [['caja', 0]],
  T: [['torre', 0]],
  U: [['caja', 0]],
  V: [['viga', 0]],
  VC: [['vc', 0]],
  CC: [['cc', 0]],
  'C.C': [['caja', 0], ['caja', C.pairGapSec]],
  'T.C': [['torre', 0], ['caja', C.pairGapSec]],
  'T.V': [['torre', 0], ['viga', 1.0]],
  'C.V': [['caja', 0], ['viga', C.pairGapSec]],
  OLA: Array.from({ length: 6 }, (_, i) => ['caja', i * C.waveGapSec]),
  J: [['tramp', 0]],
};
const BASE = { caja: 'caja', torre: 'torre', viga: 'viga', vc: 'viga', cc: 'salto largo', tramp: 'trampolín' };
const tipoBase = (patron, tipo) => (patron === 'U' ? 'pop-up' : patron === 'OLA' ? 'ola' : BASE[tipo]);

const ARCS = {
  A3: { h: [91, 113, 91], gap: 48 },
  A3up: { h: [104, 146, 104], gap: 44 },
  Aup: { h: [104, 146, 164, 146, 104], gap: 44 },
  Adn: { h: [91, 113, 113, 91], gap: 48 },
  Aup7: { h: [100, 120, 146, 164, 146, 120, 100], gap: 30 },
  AupAmb: { h: [104, 146, 164, 146, 104], gap: 44 },
  Aup7Amb: { h: [100, 120, 146, 164, 146, 120, 100], gap: 30 },
};

// Modelo de paso: Moki despega para centrar el salto en el obstáculo (como el bot), con un corrimiento de dms.
const PLANES = { none: 0, tap: 16, hold: Infinity };
const PW = (C.player.width - 6) / 2;
const media = (w, sx) => (w - 2 * sx) / 2 + PW; // medio ancho de la zona de choque
const ZONA = {
  caja: { medio: media(C.obstacleSizes.caja.width, C.hitboxShrinkCaja.x), min: 38 },
  torre: { medio: media(C.obstacleSizes.torre.width, C.hitboxShrink.x), min: 78 },
  viga: { medio: media(C.obstacleSizes.viga.width, C.hitboxShrink.x), max: 94 },
};
function altura(plan, xPx, v) {
  if (plan === 'none') return 0;
  const j = simulateJump(PLANES[plan]);
  const t = xPx / v;
  if (t <= 0 || t >= j.air) return 0;
  return j.pts[Math.min(j.pts.length - 1, Math.round(t * 240))].rise;
}
// x = distancia del despegue al centro del obstáculo (px). Devuelve si sobrevive.
function pasa(tipo, plan, x, v) {
  const prueba = (z, cx) => {
    for (let dx = -z.medio; dx <= z.medio; dx += 2) {
      const r = altura(plan, cx + dx, v);
      if (z.min !== undefined && r < z.min) return false;
      if (z.max !== undefined && r > z.max) return false;
    }
    return true;
  };
  if (tipo === 'vc') return prueba(ZONA.caja, x) && prueba(ZONA.viga, x);
  if (tipo === 'cc') return prueba(ZONA.caja, x - C.cajaPegadaGapPx / 2) && prueba(ZONA.caja, x + C.cajaPegadaGapPx / 2);
  return prueba(ZONA[tipo], x);
}
function piezas(plan, x, v, arco) {
  if (!arco) return 0;
  const R = C.pickupReach;
  let n = 0;
  arco.h.forEach((h, i) => {
    const px = x + (i - (arco.h.length - 1) / 2) * arco.gap;
    let ok = false;
    for (let dx = -R.dx; dx <= R.dx && !ok; dx += 2) if (Math.abs(h - (altura(plan, px + dx, v) + R.bodyCenter)) < R.dy) ok = true;
    if (ok) n++;
  });
  return n;
}
function evaluar(tipo, v, arco) {
  const lead = (plan) => (plan === 'none' ? 0 : (simulateJump(PLANES[plan]).air * v) / 2);
  const vivos = [];
  const cobro = {};
  for (const plan of Object.keys(PLANES)) {
    const x0 = lead(plan);
    const ok = [-0.04, 0, 0.04].every((dt) => pasa(tipo, plan, x0 + dt * v, v));
    if (ok) {
      vivos.push(plan);
      cobro[plan] = piezas(plan, x0, v, arco);
    }
  }
  const resultados = new Set(vivos.map((p) => cobro[p]));
  return { vivos, eleccion: vivos.length >= 2 && resultados.size >= 2, cobro };
}

function medir(L) {
  const decisiones = [];
  const eventos = [];
  let t0 = 0;
  L.tramos.forEach((tr, i) => {
    for (const [t, code] of tr.script) {
      const [main, reward] = code.split('+');
      if (main === 'P5') continue;
      const partes = PARTES[main];
      if (!partes) throw new Error(`código sin parte: ${code}`);
      eventos.push({ t: t0 + t, patron: main });
      partes.forEach(([tipo, at], k) => {
        const arco = k === 0 && reward && ARCS[reward] ? ARCS[reward] : null;
        // trampolín: pisarlo (none) vuela y cobra el arco del vuelo; saltarlo (tap) no lo cobra. Ambos sobreviven
        // (el validador lo prueba con las dos rutas y ±40 ms).
        const ev = tipo === 'tramp' ? { vivos: ['none', 'tap'], eleccion: reward === 'Avu', cobro: { none: reward === 'Avu' ? 5 : 0, tap: 0 } } : evaluar(tipo, tr.speed, arco);
        decisiones.push({ t: +(t0 + t + at).toFixed(3), tipo, patron: main, base: tipoBase(main, tipo), tramo: i, ...ev });
      });
    }
    t0 += tr.len;
  });
  const dur = t0;
  // Bajo el vuelo de un trampolín (el nudo) también se pasa volando: plan 'vuelo', que no cobra el arco del nudo.
  const vuelo = simulateBounce().air;
  for (const j of decisiones.filter((d) => d.tipo === 'tramp')) {
    for (const d of decisiones) {
      if (d === j || d.t <= j.t || d.t - j.t > vuelo - 0.1) continue;
      d.vivos = [...d.vivos, 'vuelo'];
      d.cobro = { ...d.cobro, vuelo: 0 };
      d.eleccion = d.vivos.length >= 2 && new Set(d.vivos.map((p) => d.cobro[p] || 0)).size >= 2;
    }
  }
  const cps = L.tramos.map((_, i) => i * L.tramos[0].len);
  decisiones.sort((a, b) => a.t - b.t);

  // F1 / F1b: ventanas de 60 s
  const ventanas = [];
  for (let w = 0; w < dur; w += 60) {
    const en = decisiones.filter((d) => d.t >= w && d.t < w + 60);
    ventanas.push({ desde: w, patrones: new Set(en.map((d) => d.patron)).size, tipos: new Set(en.map((d) => d.base)).size });
  }
  const prom = (a) => +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2);

  // F2: huecos (desde el arranque y hasta la meta), sin los 2 s tras cada checkpoint
  const ts = [0, ...decisiones.map((d) => d.t), dur];
  let f2a = 0;
  let largos = 0;
  const huecos = [];
  for (let i = 1; i < ts.length; i++) {
    let g = ts[i] - ts[i - 1];
    for (const c of cps) g -= Math.max(0, Math.min(ts[i], c + 2) - Math.max(ts[i - 1], c));
    huecos.push({ desde: +ts[i - 1].toFixed(2), s: +g.toFixed(2) });
    f2a = Math.max(f2a, g);
    if (g > 2.5) largos += g;
  }

  // F3: fichas patrón@hueco por evento
  eventos.sort((a, b) => a.t - b.t);
  const fichas = eventos.map((e, i) => `${e.patron}@${i ? (Math.round(((e.t - eventos[i - 1].t) * 4)) / 4).toFixed(2) : '0'}`);
  let f3 = { fichas: 0, s: 0, ejemplo: null };
  const n = fichas.length;
  for (let len = 2; len <= n / 2; len++) {
    for (let i = 0; i + len <= n; i++) {
      for (let j = i + len; j + len <= n; j++) {
        let igual = true;
        for (let k = 0; k < len && igual; k++) igual = fichas[i + k] === fichas[j + k];
        if (igual) {
          const s = +(eventos[i + len - 1].t - eventos[i].t).toFixed(2);
          if (len > f3.fichas || (len === f3.fichas && s > f3.s)) f3 = { fichas: len, s, ejemplo: fichas.slice(i, i + len).join(' '), en: [+eventos[i].t.toFixed(2), +eventos[j].t.toFixed(2)] };
          break;
        }
      }
    }
  }
  let f3b = 0;
  for (let len = 2; len <= n / 2; len++)
    for (let i = 0; i + 2 * len <= n; i++) {
      let igual = true;
      for (let k = 0; k < len && igual; k++) igual = fichas[i + k] === fichas[i + len + k];
      if (igual) f3b++;
    }

  // F6: segundos más largos sin un patrón nuevo
  const vistos = new Set();
  let ultimo = 0;
  let f6 = 0;
  for (const e of eventos) {
    if (!vistos.has(e.patron)) {
      f6 = Math.max(f6, e.t - ultimo);
      ultimo = e.t;
      vistos.add(e.patron);
    }
  }
  f6 = Math.max(f6, dur - ultimo);

  // FP (fases, pedido 2-nov): por página 2-4, % de obstáculos duros (torre, viga, caja+viga, caja doble: mantener o
  // pasar por debajo) en el pico (14-24 s) contra calma+respiro (0-4 y 24-30 s); contraste = pico - suave.
  const DUROS = new Set(['torre', 'viga', 'vc', 'cc']);
  const fp = [];
  for (let p = 1; p < L.tramos.length; p++) {
    const loc = decisiones.filter((d) => d.tramo === p).map((d) => ({ s: d.t - cps[p], duro: DUROS.has(d.tipo) }));
    const pico = loc.filter((d) => d.s >= 14 && d.s < 24);
    const suave = loc.filter((d) => d.s < 4 || d.s >= 24);
    const pct = (a) => (a.length ? (100 * a.filter((d) => d.duro).length) / a.length : 0);
    fp.push({ pagina: p + 1, duroPico: +pct(pico).toFixed(1), duroSuave: +pct(suave).toFixed(1), contraste: +(pct(pico) - pct(suave)).toFixed(1), decPico: pico.length, decSuave: suave.length });
  }

  // F4 y chequeo del modelo contra el plan del nivel
  const conEleccion = decisiones.filter((d) => d.eleccion).length;
  const planNivel = (d) => (d.tipo === 'viga' ? 'none' : d.tipo === 'torre' || d.tipo === 'cc' ? 'hold' : 'tap');
  const desacuerdos = decisiones.filter((d) => !d.vivos.includes(planNivel(d)) && !(d.tipo === 'caja' && d.vivos.includes('hold')));

  // formas de pasar cada bloque (patrón -> planes que sobreviven)
  const formas = {};
  for (const d of decisiones) {
    const k = d.patron;
    formas[k] = formas[k] || { veces: 0, planes: {} };
    formas[k].veces++;
    const key = d.vivos.join('|') || 'ninguno';
    formas[k].planes[key] = (formas[k].planes[key] || 0) + 1;
  }

  return {
    decisiones: decisiones.length,
    duracion: dur,
    F1: prom(ventanas.map((v) => v.patrones)),
    F1b: prom(ventanas.map((v) => v.tipos)),
    ventanas,
    F2a: +f2a.toFixed(2),
    F2b: +((100 * largos) / dur).toFixed(1),
    F3: f3,
    F3b: f3b,
    F4: +((100 * conEleccion) / decisiones.length).toFixed(1),
    F4b: prom(decisiones.map((d) => d.vivos.length)),
    F6: +f6.toFixed(2),
    FP: fp.length ? prom(fp.map((x) => x.contraste)) : 0,
    FPmin: fp.length ? Math.min(...fp.map((x) => x.contraste)) : 0,
    duroPico: fp.length ? prom(fp.map((x) => x.duroPico)) : 0,
    fases: fp,
    patrones: [...new Set(eventos.map((e) => e.patron))],
    formas,
    modeloCoincide: { decisiones: decisiones.length, desacuerdos: desacuerdos.length, ejemplos: desacuerdos.slice(0, 3).map((d) => ({ t: d.t, tipo: d.tipo, patron: d.patron, vivos: d.vivos })) },
    conEleccion: decisiones.filter((d) => d.eleccion).map((d) => ({ t: d.t, patron: d.patron, vivos: d.vivos, cobro: d.cobro })),
  };
}

const resumen = (rs) => {
  const k = (f) => rs.map(f);
  const st = (a) => ({ min: Math.min(...a), prom: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2), max: Math.max(...a) });
  return { partidas: rs.length, F1: st(k((r) => r.F1)), F1b: st(k((r) => r.F1b)), F2a: st(k((r) => r.F2a)), F2b: st(k((r) => r.F2b)), F3s: st(k((r) => r.F3.s)), F3b: st(k((r) => r.F3b)), F4: st(k((r) => r.F4)), F4b: st(k((r) => r.F4b)), F6: st(k((r) => r.F6)), FP: st(k((r) => r.FP)), FPmin: st(k((r) => r.FPmin)), duroPico: st(k((r) => r.duroPico)), desacuerdosModelo: rs.reduce((s, r) => s + r.modeloCoincide.desacuerdos, 0) };
};

const clasico = medir(GAME_LEVEL);
const retos = RETOS.map((s) => ({ semilla: s, ...medir(generarNivel(s, 'reto')) }));
const libres = LIBRES.map((s) => ({ semilla: s, ...medir(generarNivel(s, 'libre', { mecanicas: MEC })) }));
const vara = { F1: '>= 7', F2a: '<= 4.5 s', F2b: '<= 12 %', F3: '<= 4 s', F3b: '0', F4: '>= 20 %', F6: '<= 30 s' };
console.log(JSON.stringify({ fecha: '2026-11-01', libres: N_LIBRES, mecanicas: MEC, vara, resumen: { clasico: resumen([clasico]), reto: resumen(retos), libre: resumen(libres) }, clasico, retos, libres }, null, 1));
