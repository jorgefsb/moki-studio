// Sonda P23 vuelta 2: congela las animaciones de la tarjeta final y la de fallo (document.getAnimations(), pause y
// currentTime) a +0/+20/+40/+120/+250 ms y lee la opacidad EFECTIVA del botón principal (producto de su opacidad y la
// de sus ancestros) y del resto de botones. Además: fin de la última animación/transición de la tarjeta (endTime),
// color de fondo de la pastilla bloqueada y errores de consola. Edge headless 390x844; con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p23b.mjs <url-base> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const out = {};
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
  await page.evaluate(() => window.__moki.scene.scenes[0].game.loop.sleep());
  for (const tipo of ['final', 'fallo']) {
    out[tipo] = await page.evaluate(async (tipo) => {
      const s = window.__moki.scene.scenes[0];
      if (s.screen === 'final' || s.screen === 'dead') try { s.playAgain(); } catch (e) {}
      s.startGame();
      if (tipo === 'final') {
        s.dist = 43200;
        s.finish();
        for (let f = 0; f < 140 && !s.finalShown; f++) s.update(0, 16.667);
      } else {
        s.god = false;
        s.tut = { stage: 4, state: 'off' };
        for (let f = 0; f < 900 && !s.cardShown; f++) s.update(f * 16.667, 16.667);
      }
      const card = [...document.querySelectorAll('.ui-card')].pop();
      // dos cuadros para que arranquen las transiciones puestas en rAF
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      const anims = () => document.getAnimations().filter((a) => card.contains(a.effect && a.effect.target));
      const fin = Math.max(0, ...anims().map((a) => a.effect.getComputedTiming().endTime));
      const efectiva = (n) => {
        let o = 1;
        for (let x = n; x && x !== document.body; x = x.parentElement) o *= +getComputedStyle(x).opacity;
        return +o.toFixed(3);
      };
      const prim = card.querySelector('.ui-pill, .ui-btn.primary');
      const r = { rev: card.classList.contains('rev'), principal: prim.textContent.trim(), bloqueado: prim.disabled, fondoPrincipal: getComputedStyle(prim).backgroundColor, colorPrincipal: getComputedStyle(prim).color, finUltimaAnimMs: Math.round(fin), cortes: [] };
      for (const T of [0, 20, 40, 120, 250]) {
        anims().forEach((a) => { a.pause(); a.currentTime = T; });
        r.cortes.push({ T, principal: efectiva(prim), botones: [...card.querySelectorAll('button')].map(efectiva) });
      }
      anims().forEach((a) => { try { a.finish(); } catch (e) {} });
      r.trasFin = { principal: efectiva(prim), botones: [...card.querySelectorAll('button')].map(efectiva) };
      return r;
    }, tipo);
    console.log(tipo, JSON.stringify(out[tipo]));
  }
  await ctx.close();
} finally {
  out.errores = errores;
  writeFileSync(salida, JSON.stringify(out, null, 1));
  console.log('errores', errores.length, errores.slice(0, 5));
  await browser.close();
}
