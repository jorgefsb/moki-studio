// Capturas P29 para el ciego: pantalla de Logros (?ir=logros) con los dos sellos faltantes y ganados, 390x844 y 1280x720.
// Uso: node herramientas/captura-p29.mjs <url-base> <carpeta>
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, dir] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const ganados = JSON.stringify({ v: 1, ganados: ['disenador', 'embajador'], avisados: ['disenador', 'embajador'], vistos: [] });
try {
  for (const [w, h] of [[390, 844], [1280, 720]]) for (const [nom, l] of [['faltan', null], ['ganados', ganados]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await ctx.addInitScript((l) => { localStorage.clear(); localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.tutorial', '1'); if (l) localStorage.setItem('moki.logros', l); }, l);
    const page = await ctx.newPage();
    await page.goto(`${base}/?ir=logros`);
    await page.waitForSelector('.ui-logros', { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${dir}/logros-${nom}-${w}.png` });
    await ctx.close();
  }
} finally { await browser.close(); }
