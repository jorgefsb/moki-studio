// Sonda P34b: trampa de Tab en la tarjeta de fallo. 1280x720, jugador nuevo, headless.
// Por vuelta: provoca el fallo, espera el candado, pulsa Tab 4 veces y Shift+Tab 2 (anota el foco tras cada una),
// y en otra vuelta prueba que Enter / Espacio con el foco inicial reintentan y no abren pestañas.
// Uso: node herramientas/sonda-p34b-tab.mjs <url-base> [vueltas]
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, n = '3'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const foco = (page) => page.evaluate(() => { const a = document.activeElement; return `${a.tagName}.${(a.className || '').toString().split(' ')[0]}|${(a.textContent || '').trim().slice(0, 14)}`; });
async function tarjeta(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await page.route('https://moki.jorgesuarez.com.mx/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
  await page.goto(`${base}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const s = window.__moki.scene.scenes[0];
    s.startGame(); s.tut = { stage: 4, state: 'off' }; s.god = false;
    let f = 0;
    for (; f < 900 && !s.cardShown; f++) s.update(f * 16.667, 16.667);
    for (let k = 0; k < 40; k++, f++) s.update(f * 16.667, 16.667); // pasa el candado (550 ms)
    window.__pump = () => { for (let k = 0; k < 5; k++, f++) s.update(f * 16.667, 16.667); }; // headless no corre el bucle: lo empujo yo
  });
  await page.waitForTimeout(300);
  return page;
}
try {
  for (let i = 0; i < Number(n); i++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { localStorage.clear(); localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.tutorial', '1'); });
    let pestañas = 0; ctx.on('page', () => pestañas++);
    const page = await tarjeta(ctx);
    const seq = [await foco(page)];
    for (let k = 0; k < 4; k++) { await page.keyboard.press('Tab'); await page.evaluate(() => window.__pump()); await page.waitForTimeout(100); seq.push(await foco(page)); }
    for (let k = 0; k < 2; k++) { await page.keyboard.press('Shift+Tab'); await page.evaluate(() => window.__pump()); await page.waitForTimeout(100); seq.push(await foco(page)); }
    console.log(JSON.stringify({ vuelta: i, tab: seq }));
    for (const tecla of ['Enter', 'Space']) {
      const p2 = await tarjeta(ctx);
      const antes = await p2.evaluate(() => window.__moki.scene.scenes[0].screen);
      const f0 = await foco(p2);
      await p2.keyboard.press(tecla); await p2.waitForTimeout(600);
      const despues = await p2.evaluate(() => window.__moki.scene.scenes[0].screen);
      console.log(JSON.stringify({ vuelta: i, tecla, f0, antes, despues }));
      await p2.close();
    }
    console.log(JSON.stringify({ vuelta: i, pestañasNoPedidas: pestañas - 3 }));
    await ctx.close();
  }
} finally { await browser.close(); }
console.log('errores', errores.length, errores.slice(0, 5));
