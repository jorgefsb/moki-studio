// P3b: ¿en cuántos minutos llena la barra (CONFIG.barra) un bot de habilidad media? Puerta: <= 5 min.
// Reusa el bot de scripts/muro-tramos.mjs y juega partidas completas como curva-n5 (reintento desde la bandera del
// tramo). Reloj de juego: segundos corridos + por choque (tarjeta 0.25 s + bloqueo + toque 0.6 s + rampa de 1 s a 85%)
// y por partida terminada (frenado y tarjeta final 1.2 s + 3 s leyendo + 1 s al volver). Metros = px / 100. El bot
// NO junta piezas: cuenta 0 (cota pesimista; un jugador real llena antes).
// Uso: node scripts/barra-medir.mjs [partidas=300]   · Semilla fija.
globalThis.__JORGE_INTERVENTIONS__ = 0;
process.env.SOLO_CORRER = '1';
const { CONFIG: C } = await import('../src/config.js');
await import('./muro-tramos.mjs');
const correr = globalThis.__correr;
const { GAME_LEVEL } = await import('../src/tramos.js');
const { generarNivel } = await import('../src/niveles/generar.js');

const N = Number(process.argv[2] || 300);
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
};
const grupos = {
  clasico: [GAME_LEVEL],
  reto: Array.from({ length: 7 }, (_, i) => generarNivel(new Date(Date.UTC(2026, 10, 9 + i)).toISOString().slice(0, 10), 'reto')),
  libre: Array.from({ length: 7 }, (_, i) => generarNivel(String((i * 2654435761 + 7) >>> 0), 'libre', { mecanicas: [] })),
};
const PEN_CHOQUE = 0.25 + C.retryLockoutMs / 1000 + 0.6 + 0.15 * C.respawnEaseSec;
const PEN_META = 1.2 + 3 + 1;
const TOPE = 80;

for (const [g, niveles] of Object.entries(grupos))
  for (const [pn, perfil] of Object.entries(PERFILES)) {
    const r = rng(0xba22a ^ (g.length * 977 + pn.length));
    const mins = [];
    let pts = 0;
    let seg = 0;
    let k = 0;
    while (mins.length < N) {
      const L = niveles[k++ % niveles.length];
      for (let tr = 0; tr < 4; tr++) {
        let ok = false;
        for (let i = 0; i <= TOPE && !ok; i++) {
          const res = correr(L, perfil, r, tr, true);
          const fin = res.ok ? (tr + 1 < L.starts.length ? L.starts[tr + 1] : L.end) : res.D;
          const px = fin - L.starts[tr];
          seg += px / L.tramos[tr].speed + (res.ok ? 0 : PEN_CHOQUE);
          pts += px / 100;
          ok = res.ok;
          if (pts >= C.barra.meta) {
            mins.push(seg / 60);
            pts = 0;
            seg = 0;
          }
        }
        if (!ok) break;
      }
      seg += PEN_META;
    }
    mins.sort((a, b) => a - b);
    const q = (p) => mins[Math.min(mins.length - 1, Math.floor(p * mins.length))].toFixed(2);
    console.log(`${g}/${pn} meta=${C.barra.meta} m · minutos por regalo: mediana ${q(0.5)} · p90 ${q(0.9)} · máx ${q(0.999)}`);
  }
