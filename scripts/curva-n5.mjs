// CURVA DEL NIVEL 5 CON BOTS (orden del director 9-nov 05:42Z, insumo de P3b). Solo mide; no toca src.
// Reusa el bot humano de scripts/muro-tramos.mjs (misma física y cajas de choque) y juega una PARTIDA COMPLETA como el
// juego: tramo por tramo, y tras un choque reintenta desde el checkpoint (inicio del tramo) hasta pasarlo.
// Niveles del Cuaderno (src/cuaderno.js): 4 = llegar a página 3 + 2 vigas; 5 = sinCaerP1 + meta + sinCaer (cero choques
// en la partida); 6 = cinta2 (5 seguidas) + 30 piezas + 3 arcos en P1. El bot no junta piezas ni hace arcos: eso NO se mide.
// Uso: node scripts/curva-n5.mjs <salida.json> [partidas=2000]   · Semilla fija: mismo comando, mismas cifras.
globalThis.__JORGE_INTERVENTIONS__ = 0;
process.env.SOLO_CORRER = '1';
import { writeFileSync } from 'node:fs';
const { CONFIG: C } = await import('../src/config.js');
await import('./muro-tramos.mjs');
const correr = globalThis.__correr;
const { GAME_LEVEL } = await import('../src/tramos.js');
const { generarNivel } = await import('../src/niveles/generar.js');

const [outPath = '/dev/null', nArg = '2000'] = process.argv.slice(2);
const N = Number(nArg);
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
const PERFILES = {
  humano: { tiempo: [15, 40], toque: [75, 25, 16, 140], mantener: [320, 100, 60, 600] },
  novato: { tiempo: [25, 60], toque: [90, 35, 16, 160], mantener: [260, 110, 60, 600] },
  humanoApunta: { tiempo: [15, 40], toque: [75, 25, 16, 140], mantener: [320, 100, 60, 600], apunta: true },
};
const fechas = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 10, 9 + i)).toISOString().slice(0, 10));
const grupos = {
  clasico: [GAME_LEVEL],
  reto: fechas.map((f) => generarNivel(f, 'reto')),
  libre: Array.from({ length: 14 }, (_, i) => generarNivel(String((i * 2654435761 + 7) >>> 0), 'libre', { mecanicas: C.zanja.on ? ['zanja'] : [] })),
};
const TOPE = 80; // reintentos por tramo antes de rendirse (cuenta como "no pasa")

// Una partida: devuelve choques por tramo, por (tramo,tipo), intentos, si hubo racha >= 5 en algún intento, si terminó.
function partida(L, perfil, r) {
  const P = { choques: [0, 0, 0, 0], porTipo: [{}, {}, {}, {}], enc: [{}, {}, {}, {}], rachaMax: 0, termino: true };
  for (let tr = 0; tr < 4; tr++) {
    let ok = false;
    for (let k = 0; k <= TOPE && !ok; k++) {
      const enc = {};
      const res = correr(L, perfil, r, tr, true, enc);
      for (const [ty, n] of Object.entries(enc)) P.enc[tr][ty] = (P.enc[tr][ty] || 0) + n;
      const libradas = Object.values(enc).reduce((a, b) => a + b, 0) - (res.ok ? 0 : 1);
      P.rachaMax = Math.max(P.rachaMax, libradas);
      if (res.ok) ok = true;
      else {
        P.choques[tr]++;
        P.porTipo[tr][res.cause] = (P.porTipo[tr][res.cause] || 0) + 1;
      }
    }
    if (!ok) {
      P.termino = false;
      break;
    }
  }
  return P;
}

const out = { args: { partidas: N, fechas, tope: TOPE }, resultados: {} };
let h = 0;
for (const [gname, niveles] of Object.entries(grupos)) {
  for (const [pname, perfil] of Object.entries(PERFILES)) {
    h += 1;
    const r = rng(0xc0ffee ^ (h * 2654435761));
    const per = Math.ceil(N / niveles.length);
    const S = { partidas: 0, terminan: 0, limpiaT1: 0, limpia: 0, cinta2: 0, choquesTramo: [0, 0, 0, 0], porTipo: [{}, {}, {}, {}], enc: [{}, {}, {}, {}], choquesHastaP3: 0, choquesTotal: 0, sinChoqueT1a2: 0 };
    for (const L of niveles)
      for (let k = 0; k < per; k++) {
        const p = partida(L, perfil, r);
        S.partidas++;
        if (p.termino) S.terminan++;
        if (p.choques[0] === 0) S.limpiaT1++;
        if (p.termino && p.choques.every((c) => c === 0)) S.limpia++;
        if (p.rachaMax >= 5) S.cinta2++;
        p.choques.forEach((c, i) => {
          S.choquesTramo[i] += c;
          S.choquesTotal += c;
          for (const [ty, n] of Object.entries(p.porTipo[i])) S.porTipo[i][ty] = (S.porTipo[i][ty] || 0) + n;
          for (const [ty, n] of Object.entries(p.enc[i])) S.enc[i][ty] = (S.enc[i][ty] || 0) + n;
        });
        S.choquesHastaP3 += p.choques[0] + p.choques[1];
      }
    const m = (x) => +(x / S.partidas).toFixed(2);
    const pc = (x) => +((100 * x) / S.partidas).toFixed(1);
    const R = {
      partidas: S.partidas,
      terminanPct: pc(S.terminan),
      limpiaT1Pct: pc(S.limpiaT1),
      limpiaPct: pc(S.limpia),
      partidasParaLimpia: S.limpia ? +(S.partidas / S.limpia).toFixed(1) : null,
      cinta2ProxyPct: pc(S.cinta2),
      choquesMediosHastaP3: m(S.choquesHastaP3),
      choquesMediosTotal: m(S.choquesTotal),
      choquesMediosPorTramo: S.choquesTramo.map(m),
      tasaPorEncuentro: S.porTipo.map((t, i) => Object.fromEntries(Object.entries(S.enc[i]).map(([ty, e]) => [ty, `${t[ty] || 0}/${e}=${(((t[ty] || 0) * 100) / e).toFixed(1)}%`]))),
    };
    out.resultados[`${gname}/${pname}`] = R;
    console.log(gname, pname, JSON.stringify(R));
  }
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
