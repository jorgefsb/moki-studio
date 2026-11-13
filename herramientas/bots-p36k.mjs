// P36k: bots en la 1.ª partida de la vida (moki.primera sin poner, sin tutorial para que el bot juegue solo).
// adjust = mantiene en la caja del arco (ruta de arriba); tap = toca todo (ruta de abajo); hold = mantiene todo.
// Mismo navegador y pasos que bots-p15. Correr contra master y contra la rama y comparar muertes.
// abajo (solo en la rama, src/debug/bots.js): como adjust, pero toca en la caja de la horquilla.
// Uso: flock /tmp/moki-pesado.lock node herramientas/bots-p36k.mjs <url-base> <salida.json> [adjust,abajo,tap,hold]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const casos = [];
const SEMBRAR = (o) => {
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
async function corre(nombre, kind) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, { 'moki.tutorial': '1' }); // sin moki.primera: la 1.ª partida
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async (k) => {
    const out = await window.__moki.moki.bot(k, 200);
    const s = window.__moki.scene.scenes[0];
    const altos = new Set((s.level.entities || []).filter((p) => p.alto).map((p) => p.arc));
    const altosCerrados = Object.entries(s.arcGot || {}).filter(([id, n]) => altos.has(id) && n >= 5).length;
    return { result: out.result, cause: out.cause, tramo: out.tramo, meters: out.meters, score: out.score, pieces: out.pieces, pieceTotal: out.pieceTotal, seconds: out.seconds, horq: (s.level.horq || []).length, altosCerrados };
  }, kind);
  console.log(nombre, JSON.stringify(r));
  casos.push({ caso: nombre, ...r });
  await ctx.close();
}
try {
  for (const k of (process.argv[4] || 'adjust,tap,hold').split(',')) await corre(`primera ${k}`, k);
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify({ base, casos, errores }, null, 1));
console.log('errores', errores.length);
