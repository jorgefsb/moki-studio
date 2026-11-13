// P36i (probador, 13-nov): el Cuaderno al empezar, para el ciego "¿qué te pide el Cuaderno?". ?ir=elige sin tocar nada, 3 s tras cargar.
// Uso: flock /tmp/moki-pesado.lock node herramientas/captura-p36i-cuaderno.mjs <url-base> <carpeta> <etiqueta>
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
  await page.waitForTimeout(3000);
  const tira = await page.evaluate(() => [...document.querySelectorAll('.cu-txt')].map((e) => e.textContent));
  await page.screenshot({ path: `${dir}/${tag}-${W}x${H}.png` });
  console.log(tag, W, JSON.stringify(tira));
  await ctx.close();
}
console.log('errores', errores.length, JSON.stringify(errores));
await browser.close();
