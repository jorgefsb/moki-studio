// Sonda P28 vuelta 2 (B): teclado. 1280x720 escritorio, jugador nuevo. Por tarjeta (final, fallo) y tecla (Espacio, Enter):
// si hay botón Vota, clic real en él (abre pestaña nueva, se cierra) y luego la tecla; si no hay (master), solo la tecla.
// Reporta foco tras el clic y si la pantalla pasó a 'play'. Uso: node herramientas/sonda-p28-teclado.mjs <url-base>
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
try {
  for (const tipo of ['final', 'fallo']) for (const tecla of ['Space', 'Enter']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.tutorial', '1'); });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${e}`));
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    await page.route('https://moki.jorgesuarez.com.mx/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
    await page.goto(`${base}/?debug&nivel=clasico`);
    await page.waitForFunction(() => window.__moki && window.__moki.scene, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(async (tipo) => {
      const s = window.__moki.scene.scenes[0];
      s.startGame(); s.tut = { stage: 4, state: 'off' };
      if (tipo === 'final') { s.dist = 43200; s.finish(); for (let f = 0; f < 140 && !s.finalShown; f++) s.update(0, 16.667); }
      else { s.god = false; for (let f = 0; f < 900 && !s.cardShown; f++) s.update(f * 16.667, 16.667); }
    }, tipo);
    await page.waitForTimeout(1500); // pasa el bloqueo de reintento
    const voto = await page.$('.ui-voto');
    let foco = null;
    if (voto) {
      const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), voto.click()]);
      if (pop) await pop.close();
      await page.bringToFront();
      await page.waitForTimeout(200);
      foco = await page.evaluate(() => `${document.activeElement.tagName}.${document.activeElement.className}`);
    }
    const antes = await page.evaluate(() => window.__moki.scene.scenes[0].screen);
    await page.keyboard.press(tecla);
    await page.waitForTimeout(600);
    const despues = await page.evaluate(() => window.__moki.scene.scenes[0].screen);
    console.log(JSON.stringify({ tipo, tecla, voto: !!voto, foco, antes, despues }));
    await ctx.close();
  }
} finally { await browser.close(); }
console.log('errores', errores.length, errores.slice(0, 5));
