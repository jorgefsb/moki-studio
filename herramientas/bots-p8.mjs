// Bots P8 MODO MEGA: los 6 casos de bots-p15 (modos viejos) + Clásico en MEGA x1.5 por la liga ?ir=mega (adjust, tap, hold, pasivo).
// más tap/hold/pasivo en Clásico. Edge headless 1280x720; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/bots-p8.mjs <url-base> <salida.json> [mega]
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
async function corre(nombre, q, ls, kind, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, { 'moki.primera': '1', 'moki.tutorial': '1', ...ls });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?debug${q}`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async ([k, sd]) => { const r = await window.__moki.moki.bot(k, 200, sd); const sc = window.__moki.scene.scenes[0]; return { ...r, mega: !!sc.megaRun, best: sc.bestMode() }; }, [kind, seed]);
  console.log(nombre, JSON.stringify({ result: r.result, cause: r.cause, score: r.score, pieces: r.pieces, seconds: r.seconds, mega: r.mega, best: r.best }));
  casos.push({ caso: nombre, ...r });
  await ctx.close();
}
try {
  await corre('clasico adjust', '&nivel=clasico', {}, 'adjust', null);
  await corre('reto 2026-10-31', '', { 'moki.modo': 'reto' }, 'adjust', '2026-10-31');
  await corre('libre 1037', '', { 'moki.modo': 'libre' }, 'adjust', '1037');
  for (const k of ['tap', 'hold', 'pasivo']) await corre(`clasico ${k}`, '&nivel=clasico', {}, k, null);
  if (process.argv[4] === 'mega') for (const k of ['adjust', 'tap', 'hold', 'pasivo']) await corre(`mega ${k}`, '&ir=mega', {}, k, null);
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify({ base, casos, errores }, null, 1));
console.log('errores', errores.length);
