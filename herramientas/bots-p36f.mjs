// P36f: bot adjust (mantiene en la horquilla: ruta de arriba) en Retos con horquilla (desde 2026-11-12) y Libre,
// mismo navegador y pasos que bots-p15. Reporta puntaje, piezas y arcos altos cerrados. Edge headless 1280x720.
// Uso: flock /tmp/moki-pesado.lock node herramientas/bots-p36f.mjs <url-base> <salida.json>
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
async function corre(nombre, ls, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, { 'moki.primera': '1', 'moki.tutorial': '1', ...ls });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async (sd) => {
    const out = await window.__moki.moki.bot('adjust', 200, sd);
    const s = window.__moki.scene.scenes[0];
    const altos = new Set((s.level.entities || []).filter((p) => p.alto).map((p) => p.arc));
    const altosCerrados = Object.entries(s.arcGot || {}).filter(([id, n]) => altos.has(id) && n >= 5).length;
    return { ...out, horq: (s.level.horq || []).length, altosCerrados };
  }, seed);
  console.log(nombre, JSON.stringify(r));
  casos.push({ caso: nombre, ...r });
  await ctx.close();
}
try {
  for (const d of ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']) await corre(`reto ${d}`, { 'moki.modo': 'reto' }, d);
  for (const sd of ['1037', '1001', '1002']) await corre(`libre ${sd}`, { 'moki.modo': 'libre' }, sd);
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify({ base, casos, errores }, null, 1));
console.log('errores', errores.length);
