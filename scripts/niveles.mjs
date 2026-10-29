// Valida niveles sin navegador: node scripts/niveles.mjs [semillas=500]
globalThis.__JORGE_INTERVENTIONS__ = 0;
const { GAME_LEVEL } = await import('../src/tramos.js');
const { validateLevel } = await import('../src/niveles/validar.js');
console.log('fijo adjust', validateLevel(GAME_LEVEL));
console.log('fijo tap  ', validateLevel(GAME_LEVEL, 'tap'));
console.log('fijo hold ', validateLevel(GAME_LEVEL, 'hold'));
