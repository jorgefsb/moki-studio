// DIVERSIÓN 1 (caso-009): ¿dónde muere un jugador humano, por tramo y por obstáculo? Sin navegador.
// Es una copia de src/niveles/validar.js (misma física de jumpmodel y mismas cajas) con un bot "humano":
// cada salto despega con error de tiempo aleatorio y mantiene el botón un tiempo aleatorio (no los 16/400 ms perfectos).
// Dos medidas: (A) partida desde el inicio hasta el primer choque; (B) cada tramo desde su checkpoint (el reintento real).
// Uso: node scripts/muro-tramos.mjs <salida.json> [partidas por nivel=40]
// Semilla fija (mulberry32): mismo comando, mismas cifras. No toca el juego.
globalThis.__JORGE_INTERVENTIONS__ = 0;
import { writeFileSync } from 'node:fs';
const { CONFIG: C } = await import('../src/config.js');
const { simulateJump, simulateBounce, airTravel, vientoPaso } = await import('../src/jumpmodel.js');
const { GAME_LEVEL, TRAMP_PISA } = await import('../src/tramos.js');
const { generarNivel } = await import('../src/niveles/generar.js');

export { correr };
const [outPath = '/dev/null', nArg = '40'] = process.argv.slice(2);
const N = Number(nArg);
const DT = 1 / 60;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Perfiles (ms). tiempo: + = despega tarde. toque/mantener: cuánto deja apretado.
// Referencias de juego rítmico casual: error típico 30-60 ms; un toque humano dura 60-120 ms.
const PERFILES = {
  perfecto: null, // el bot adjust de validar.js (debe terminar todo)
  humano: { tiempo: [15, 40], toque: [75, 25, 16, 140], mantener: [320, 100, 60, 600] },
  novato: { tiempo: [25, 60], toque: [90, 35, 16, 160], mantener: [260, 110, 60, 600] },
  // igual que humano, pero apunta al centro del salto que de verdad va a hacer (cota optimista del sesgo de puntería)
  humanoApunta: { tiempo: [15, 40], toque: [75, 25, 16, 140], mantener: [320, 100, 60, 600], apunta: true },
};

function box(type, W) {
  if (type === 'zanja') return { half: W / 2 - (C.player.width - 6) / 2, lo: 0, hi: 0 };
  if (type === 'timbre') return { half: C.timbre.ancho / 2, lo: C.timbre.lo, hi: C.timbre.hi };
  const s = C.obstacleSizes[type];
  const hs = type === 'caja' ? C.hitboxShrinkCaja : C.hitboxShrink;
  const half = s.width / 2 - hs.x;
  if (type === 'viga') return { half, lo: s.hangBottom, hi: s.hangBottom + s.height };
  return { half, lo: 0, hi: s.height - hs.top };
}

// Corre el nivel desde el tramo t0 (checkpoint) hasta el primer choque o el final de ese tramo (soloTramo) o del nivel.
function correr(level, perfil, r, t0 = 0, soloTramo = false, enc = null) {
  const vientos = level.vientos || [];
  const kAt = (d) => (vientos.find((z) => d >= z.D0 && d <= z.D1) || { k: 1 }).k;
  const obs = level.entities.filter((e) => e.kind === 'obs').map((e) => ({ ...e, box: box(e.type, e.W), handled: false }));
  const tramps = obs.filter((o) => o.type === 'tramp');
  const planDe = (q) => (q.type === 'tramp' ? 'none' : q.plan); // ruta 'arriba': pisa el trampolín
  const salta = (q) => {
    if (q.caida) return false;
    if (q.type === 'timbre') return true;
    if (q.bajo || q.conTimbre) return false;
    const p = planDe(q);
    return p === 'tap' || p === 'hold';
  };
  const pw = C.player.width - 6;
  const ph = C.player.height - 6;
  let dist = level.starts[t0];
  let tramo = t0;
  let speed = level.tramos[t0].speed;
  let accel = 0;
  let jump = null;
  let kv = 1;
  let t = 0;
  let next = 0;
  let err = perfil ? perfil.tiempo[0] + perfil.tiempo[1] * normal(r) : 0; // error del próximo salto
  const apretar = (plan) => {
    const [m, s, a, b] = perfil[plan === 'hold' ? 'mantener' : 'toque'];
    return Math.round(clamp(m + s * normal(r), a, b));
  };
  let ms0 = perfil ? { tap: apretar('tap'), hold: apretar('hold') } : { tap: 16, hold: 400 }; // cuánto apretará el próximo salto
  const pasados = []; // [D, tipo] de lo último librado, para nombrar el patrón donde muere
  const pie = C.zanja.pie;
  const zanjas = level.zanjas || [];
  const fin = soloTramo && t0 + 1 < level.starts.length ? level.starts[t0 + 1] : level.end;
  for (const o of obs) if (o.D < dist - 80) o.handled = true;
  const muere = (cause, D) => {
    const ant = pasados.filter(([d]) => D - d > 0 && D - d < speed * 1.6).map(([d, ty]) => `${ty}@${((D - d) / speed).toFixed(2)}s`);
    return { ok: false, tramo, cause, D: Math.round(D), sec: +((D - level.starts[tramo]) / level.tramos[tramo].speed).toFixed(1), antes: ant.join(' ') };
  };
  while (dist < fin) {
    while (tramo + 1 < level.tramos.length && dist >= level.starts[tramo + 1]) tramo++;
    const target = level.tramos[tramo].speed;
    if (accel === 0 && speed !== target) accel = Math.abs(target - speed) / C.tramoEaseSec;
    speed = speed < target ? Math.min(target, speed + accel * DT) : Math.max(target, speed - accel * DT);
    if (speed === target) accel = 0;
    let rise = 0;
    let cae = !jump;
    if (jump) {
      const i = Math.round((t - jump.t0) * 240);
      if (i >= jump.pts.length - 1) {
        jump = null; // las reglas de salida (viento, caída, zanja, timbre) son del generador; aquí solo cuenta chocar
        cae = true;
      } else {
        rise = jump.pts[i].rise;
        cae = i > 0 && jump.pts[i].rise < jump.pts[i - 1].rise;
      }
    }
    if (rise === 0 && zanjas.some((z) => dist - pie >= z.H0 && dist + pie <= z.H1)) return muere('zanja', dist);
    if (cae && rise <= C.obstacleSizes.tramp.height) {
      const j = tramps.find((q) => !q.used && dist >= q.D - TRAMP_PISA && dist < q.D + q.box.half);
      if (j) {
        j.used = j.handled = true;
        jump = { t0: t, pts: simulateBounce().pts, k: 1 };
        rise = 0;
      }
    }
    if (!jump) {
      const o = obs.find((q) => !q.handled && q.D - dist > -4 && salta(q));
      if (o) {
        const pair = obs.some((q) => q.plan === 'skip' && q.D > o.D && q.D - o.D < 120) ? C.cajaPegadaGapPx / 2 : 0;
        const plan = o.type === 'timbre' ? 'hold' : planDe(o);
        const k = kAt(dist);
        const ms = ms0[plan];
        const aire = perfil && perfil.apunta ? ((simulateJump(ms).pts.length - 1) / 240) * speed * k : airTravel(plan, speed, k);
        if (o.D - dist <= aire / 2 - pair - (-err / 1000) * speed) {
          o.handled = true;
          if (perfil) {
            err = perfil.tiempo[0] + perfil.tiempo[1] * normal(r);
            ms0 = { tap: apretar('tap'), hold: apretar('hold') };
          }
          jump = { t0: t, pts: simulateJump(ms).pts, k };
        }
      }
    }
    while (next < obs.length && obs[next].D - dist < -80) next++;
    for (let q = next; q < obs.length && obs[q].D - dist < 120; q++) {
      const o = obs[q];
      if (o.type === 'tramp' || o.type === 'zanja' || o.caida) continue;
      const dx = Math.abs(o.D - dist);
      if (dx >= o.box.half + pw / 2) {
        if (o.D < dist && !o.lib) {
          o.lib = true;
          pasados.push([o.D, o.type]);
          if (enc) enc[o.type] = (enc[o.type] || 0) + 1;
        }
        continue;
      }
      const lo = rise + 2;
      const hi = rise + ph;
      if (o.type === 'timbre') {
        if (!o.sono && lo < o.box.hi && hi > o.box.lo) {
          o.sono = true;
          const tw = obs.find((w) => w.type === 'torre' && w.tid === o.tid);
          if (tw) tw.caida = true;
        }
        continue;
      }
      if (lo < o.box.hi && hi > o.box.lo) {
        if (enc) enc[o.type] = (enc[o.type] || 0) + 1;
        return muere(o.type, o.D);
      }
    }
    kv = vientoPaso(kv, jump ? jump.k : 1, DT);
    dist += speed * kv * DT;
    t += DT;
  }
  return { ok: true, tramo };
}

// Niveles que juega la gente hoy: Reto (por defecto; fechas desde hoy, incluye trampolín desde 9-nov),
// Libre de un jugador en nivel 2 del Cuaderno (sin trampolín, viento ni timbre; con zanja si bajó su módulo) y Clásico.
const fechas = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 10, 8 + i)).toISOString().slice(0, 10));
const grupos = {
  clasico: [GAME_LEVEL],
  reto: fechas.map((f) => generarNivel(f, 'reto')),
  libre: Array.from({ length: 14 }, (_, i) => generarNivel(String((i * 2654435761 + 7) >>> 0), 'libre', { mecanicas: C.zanja.on ? ['zanja'] : [] })),
};

if (process.env.SOLO_CORRER) { globalThis.__correr = correr; } else {
const out = { args: { N, fechas, perfiles: PERFILES }, resultados: {} };
for (const [gname, niveles] of Object.entries(grupos)) {
  for (const [pname, perfil] of Object.entries(PERFILES)) {
    const r = rng(0x9e3779b9 ^ gname.length * 131 ^ pname.length * 7);
    const reps = perfil ? N : 1;
    const A = { partidas: 0, llegan: [0, 0, 0, 0], ganan: 0, mueren: [0, 0, 0, 0], causas: {}, causaPorTramo: [{}, {}, {}, {}], patrones: {} };
    const B = { intentos: [0, 0, 0, 0], mueren: [0, 0, 0, 0], causaPorTramo: [{}, {}, {}, {}], encuentros: [{}, {}, {}, {}], segPorTramo: [[], [], [], []], patrones: {} };
    for (const L of niveles)
      for (let k = 0; k < reps; k++) {
        const a = correr(L, perfil, r, 0);
        A.partidas++;
        for (let i = 0; i <= (a.ok ? 3 : a.tramo); i++) A.llegan[i]++;
        if (a.ok) A.ganan++;
        else {
          A.mueren[a.tramo]++;
          A.causas[a.cause] = (A.causas[a.cause] || 0) + 1;
          A.causaPorTramo[a.tramo][a.cause] = (A.causaPorTramo[a.tramo][a.cause] || 0) + 1;
          const p = `T${a.tramo + 1} ${a.cause} <- ${a.antes || '(nada en 1.6 s)'}`;
          A.patrones[p] = (A.patrones[p] || 0) + 1;
        }
        for (let tr = 0; tr < 4; tr++) {
          const b = correr(L, perfil, r, tr, true, B.encuentros[tr]);
          B.intentos[tr]++;
          if (!b.ok) {
            B.mueren[tr]++;
            B.causaPorTramo[tr][b.cause] = (B.causaPorTramo[tr][b.cause] || 0) + 1;
            B.segPorTramo[tr].push(b.sec);
            const p = `T${tr + 1} ${b.cause} <- ${b.antes || '(nada en 1.6 s)'}`;
            B.patrones[p] = (B.patrones[p] || 0) + 1;
          }
        }
      }
    B.pctMuere = B.mueren.map((m, i) => +((100 * m) / B.intentos[i]).toFixed(1));
    B.segMediana = B.segPorTramo.map((v) => (v.length ? v.sort((x, y) => x - y)[v.length >> 1] : null));
    delete B.segPorTramo;
    B.muertePorEncuentroPct = B.encuentros.map((e, i) => Object.fromEntries(Object.entries(e).map(([ty, n]) => [ty, `${(B.causaPorTramo[i][ty] || 0)}/${n}=${((100 * (B.causaPorTramo[i][ty] || 0)) / n).toFixed(1)}`])));
    B.patronesTop = Object.entries(B.patrones).sort((x, y) => y[1] - x[1]).slice(0, 10);
    delete B.patrones;
    A.patronesTop = Object.entries(A.patrones).sort((x, y) => y[1] - x[1]).slice(0, 8);
    delete A.patrones;
    out.resultados[`${gname}/${pname}`] = { A, B };
    console.log(gname, pname, JSON.stringify({ llegan: A.llegan, ganan: A.ganan, de: A.partidas, causas: A.causas, pctMuereTramo: B.pctMuere, segMediana: B.segMediana, porEncuentro: B.muertePorEncuentroPct }));
  }
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
}
