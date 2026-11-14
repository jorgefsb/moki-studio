// P40 paso 1: horquillas alcanzadas y subidas por partida, por modo, con los bots de P15 (adjust) y más semillas.
// Edge headless 1280x720; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/bots-p40-paso1.mjs <url-base> <salida.json>
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
async function corre(modo, nombre, q, ls, kind, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, { 'moki.primera': '1', 'moki.tutorial': '1', ...ls });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?debug${q}`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(async ([k, sd]) => window.__moki.moki.bot(k, 200, sd), [kind, seed]);
  console.log(modo, nombre, JSON.stringify({ result: r.result, cause: r.cause, meters: r.meters, s: r.seconds, horqNivel: r.horqNivel, horq: r.horq, altos: r.altos }));
  casos.push({ modo, caso: nombre, ...r });
  await ctx.close();
}
try {
  for (const k of ['adjust', 'tap', 'hold']) await corre('clasico', `clasico ${k}`, '&nivel=clasico', {}, k, null);
  for (let d = 1; d <= 14; d++) {
    const sd = `2026-11-${String(d).padStart(2, '0')}`;
    await corre('reto', `reto ${sd}`, '', { 'moki.modo': 'reto' }, 'adjust', sd);
  }
  for (const sd of ['1037', '42', '777', '2024', '9']) await corre('libre', `libre ${sd}`, '', { 'moki.modo': 'libre' }, 'adjust', sd);
} finally {
  await browser.close();
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null; };
const resumen = {};
for (const m of ['clasico', 'reto', 'libre']) {
  const c = casos.filter((x) => x.modo === m);
  resumen[m] = { n: c.length, horqNivelMed: med(c.map((x) => x.horqNivel)), alcanzadasMed: med(c.map((x) => x.horq)), subidasMed: med(c.map((x) => x.altos)), segMed: med(c.map((x) => x.seconds)) };
}
console.log('resumen', JSON.stringify(resumen));
writeFileSync(salida, JSON.stringify({ base, resumen, casos, errores }, null, 1));
console.log('errores', errores.length);
