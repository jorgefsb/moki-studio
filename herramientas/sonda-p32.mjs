// Sonda P32 'QUÉ SIGUE' VUELVE: tarjeta final por tamaño, jugador nuevo (sin localStorage previo). Mide si la línea
// 'Qué sigue' está y cabe entera, que la tarjeta no haga scroll, que Otra vez y Vota queden enteros en la primera
// vista, solapes por getBounds entre Qué sigue / Otra vez / Menú / Vota, y con Moki y HUD (saludoZonas).
// Con 3er argumento guarda captura de la final a 390x844. Edge headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p32.mjs <url-base> <salida.json> [captura.png]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida, captura] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const casos = [];
try {
  for (const [w, h, q] of [[390, 844, ''], [390, 700, ''], [375, 667, ''], [1280, 720, ''], [660, 372, '&embed=1'], [660, 372, '']]) {
    const tactil = w < 700 && h > w;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: tactil, isMobile: tactil });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      localStorage.setItem('moki.primera', '1');
      localStorage.setItem('moki.tutorial', '1');
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${w}x${h}${q} ${e}`));
    page.on('console', (m) => m.type() === 'error' && errores.push(`${w}x${h}${q} ${m.text()}`));
    await page.goto(`${base}/?debug&nivel=clasico${q}`);
    await page.waitForFunction(() => window.__moki && window.__moki.scene, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__moki.scene.scenes[0].game.loop.sleep());
    const r = await page.evaluate(async () => {
      const s = window.__moki.scene.scenes[0];
      s.startGame();
      s.tut = { stage: 4, state: 'off' };
      s.dist = 43200;
      s.finish();
      for (let f = 0; f < 140 && !s.finalShown; f++) s.update(0, 16.667);
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} });
      await new Promise((ok) => setTimeout(ok, 300));
      const card = [...document.querySelectorAll('.ui-card')].pop();
      const cb = card.getBoundingClientRect();
      const caja = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) }; };
      const entero = (b) => !!b && b.t >= Math.floor(cb.top) && b.b <= Math.ceil(cb.bottom) && b.t >= 0 && b.b <= innerHeight && b.l >= 0 && b.r <= innerWidth;
      const cruza = (a, b) => !!a && !!b && a.t < b.b && a.b > b.t && a.l < b.r && a.r > b.l;
      const sigue = caja(card.querySelector('.ui-sigue'));
      const otra = caja(card.querySelector('.ui-btn.primary'));
      const menu = caja([...card.querySelectorAll('.ui-btn.secondary')].find((n) => !n.classList.contains('ui-voto')));
      const voto = caja(card.querySelector('.ui-voto'));
      const z = s.saludoZonas();
      const solapes = [];
      const piezas = { sigue, otra, menu, voto };
      const nombres = Object.keys(piezas);
      for (let i = 0; i < nombres.length; i++) for (let j = i + 1; j < nombres.length; j++) if (cruza(piezas[nombres[i]], piezas[nombres[j]])) solapes.push(`${nombres[i]}-${nombres[j]}`);
      return {
        card: caja(card), sinScroll: card.scrollHeight <= card.clientHeight + 1, scrollH: card.scrollHeight, clientH: card.clientHeight, clases: card.className,
        sigue: sigue ? { caja: sigue, entero: entero(sigue), texto: card.querySelector('.ui-sigue').textContent } : null,
        otra: { caja: otra, entero: entero(otra), foco: document.activeElement === card.querySelector('.ui-btn.primary') },
        voto: voto ? { caja: voto, entero: entero(voto) } : null,
        menu: menu ? { caja: menu, entero: entero(menu) } : null,
        solapes,
        solapeMoki: cb.right > z.mokiL && cb.left < z.mokiR && cb.bottom > z.mokiT,
        solapeHud: cb.top < z.hudB,
      };
    });
    const caso = `${w}x${h}${q ? ' embed' : ''}`;
    console.log(caso, JSON.stringify(r));
    casos.push({ caso, ...r });
    if (captura && w === 390 && h === 844) await page.screenshot({ path: captura });
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify({ base, casos, errores }, null, 1));
console.log('errores', errores.length, errores.slice(0, 5));
