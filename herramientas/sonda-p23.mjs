// Sonda P23 tarjeta final que se revela: ms de toque en "Otra vez" (clic real de ratón en el cuadro en que aparece la
// tarjeta, sin esperar la animación) hasta que la partida corre; 5 medidas. Además lee el estado de la revelación a
// +0/+120/+300 ms (transform de la marca, de los números y opacidad de los botones) y los errores de consola.
// Edge headless 390x844; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p23.mjs <url-base> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const errores = [];
const out = { toques: [], revela: [] };
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('moki.primera', '1');
    localStorage.setItem('moki.tutorial', '1');
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await page.goto(`${base}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  // 1) estado de la revelación: la tarjeta sale y se lee en la MISMA tarea (+0) y luego a +120/+300/+700 ms.
  //    Puntaje alto para que salga "Nueva mejor marca".
  out.revela = await page.evaluate(async () => {
    const s = window.__moki.scene.scenes[0];
    s.startGame();
    s.dist = 43200; // 432 m: puntaje > marca 0, sale 'Nueva mejor marca'
    s.finish();
    for (let f = 0; f < 120 && !s.finalShown; f++) s.update(0, 16.667);
    const card = document.querySelector('.ui-card:has(.ui-btn.primary)');
    const t0 = performance.now();
    const lee = () => {
      const tag = card.querySelector('.ui-tag');
      const as = card.querySelector('.as');
      const bs = [...card.querySelectorAll('button')].map((b) => +(+getComputedStyle(b).opacity).toFixed(2));
      return { ms: Math.round(performance.now() - t0), rev: card.classList.contains('rev'), tag: tag && getComputedStyle(tag).transform, num: as && getComputedStyle(as).transform, botones: bs };
    };
    const r = [lee()];
    for (const w of [120, 300, 700]) {
      await new Promise((ok) => setTimeout(ok, Math.max(0, w - (performance.now() - t0))));
      r.push(lee());
    }
    s.playAgain();
    // cuadro 0: una tarjeta nueva y el clic en "Otra vez" en la misma tarea; la partida arranca sin esperar animación
    s.startGame();
    s.finish();
    for (let f = 0; f < 120 && !s.finalShown; f++) s.update(0, 16.667);
    document.querySelector('.ui-card .ui-btn.primary').click();
    r.push({ clic0: s.screen });
    return r;
  });
  await page.waitForTimeout(400);
  for (let i = 1; i < 6; i++) {
    await page.evaluate(() => {
      const s = window.__moki.scene.scenes[0];
      if (s.screen === 'final') s.playAgain();
      s.startGame();
      s.finish();
      // headless: el bucle real va lento; se dan los cuadros a mano hasta que sale la tarjeta (1200 ms de juego)
      for (let f = 0; f < 120 && !s.finalShown; f++) s.update(0, 16.667);
      window.__ta = performance.now();
    });
    // clic real en el centro de "Otra vez" en cuanto existe (el control no espera a la animación)
    const box = await page.locator('.ui-card .ui-btn.primary').boundingBox();
    await page.evaluate(() => {
      window.__t = null;
      addEventListener('click', (e) => { window.__t0 = performance.now(); }, { capture: true, once: true });
      const s = window.__moki.scene.scenes[0];
      // sondeo con setTimeout(0): el rAF headless va estrangulado y mediría el estrangulador, no el toque
      const mira = () => (s.screen === 'final' ? setTimeout(mira, 0) : (window.__t = performance.now() - window.__t0));
      setTimeout(mira, 0);
    });
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(() => window.__t != null, null, { timeout: 5000 });
    const ms = await page.evaluate(() => ({ ms: Math.round(window.__t * 10) / 10, desdeTarjeta: Math.round(window.__t0 - window.__ta), screen: window.__moki.scene.scenes[0].screen }));
    out.toques.push(ms);
    console.log('toque', JSON.stringify(ms));
    await page.waitForTimeout(400);
  }
  console.log('revela', JSON.stringify(out.revela));
  await ctx.close();
} finally {
  out.errores = errores;
  writeFileSync(salida, JSON.stringify(out, null, 1));
  console.log('errores', errores.length, errores.slice(0, 5));
  await browser.close();
}
