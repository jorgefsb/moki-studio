// P36i (probador, 13-nov): la tira del Cuaderno bajo la tarjeta de FALLO (bot pasivo choca en la 1.ª caja, sin tachar nada), para el ciego
// "¿qué te pide el Cuaderno?". ?ir=elige, sin localStorage extra. Guarda captura 2.5 s tras la tarjeta.
// Uso: flock /tmp/moki-pesado.lock node herramientas/captura-p36i-fallo.mjs <url-base> <carpeta> <etiqueta>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, dir, tag] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
for (const [W, H] of [[390, 844], [1280, 720]]) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e).slice(0, 200)));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await page.goto(`${base}/?ir=elige&debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => { const o = await window.__moki.moki.bot('pasivo', 60, null); const s = window.__moki.scene.scenes[0]; return { result: o.result, cause: o.cause, porTachar: (s.porTachar || []).map((n) => n.id) }; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${dir}/${tag}-${W}x${H}.png` });
  console.log(tag, W, JSON.stringify(r));
  await ctx.close();
}
console.log('errores', errores.length, JSON.stringify(errores));
await browser.close();
