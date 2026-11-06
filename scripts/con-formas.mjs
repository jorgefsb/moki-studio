// Corre otro script de scripts/ con las formas de página prendidas en Libre, sin tocar el juego ni el medidor:
//   node scripts/con-formas.mjs flow-medir 50 tramp,viento,timbre,zanja - 2026-11-09:30 variedad
//   node scripts/con-formas.mjs niveles 50 tramp,viento,timbre,zanja
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { INTERRUPTOR } = await import('../src/niveles/formas.js');
INTERRUPTOR.libre = true;
const [, , nombre] = process.argv;
process.argv.splice(2, 1);
if (nombre === 'niveles' && (process.argv[3] || '').includes('zanja')) await import('../src/zanja.js'); // flow-medir ya lo carga solo
await import(`./${nombre}.mjs`);
