// Sonda P33 QUE MOKI SE VEA: igual que sonda-p32 (Qué sigue y Vota enteros, sin scroll, solapes) y además mide en px
// cuánto tapa la tarjeta (o cualquier .ui-card abierta) la caja de Moki parado (saludoZonas: mokiL/R, mokiT..floorY).
// cabezaTorso = 55 % de arriba del títere; tapadoCT = px de alto de esa franja tapados por la tarjeta (0 = se ve).
// Con 3er argumento guarda captura por tamaño (sufijo -WxH). Edge headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p33.mjs <url-base> <salida.json> [captura-prefijo]
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
      const card = [...document.querySelectorAll('.ui-card:not(.ui-voto-pie)')].pop();
      const cb = card.getBoundingClientRect();
      const caja = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) }; };
      const entero = (b) => !!b && b.t >= Math.floor(cb.top) && b.b <= Math.ceil(cb.bottom) && b.t >= 0 && b.b <= innerHeight && b.l >= 0 && b.r <= innerWidth;
      const cruza = (a, b) => !!a && !!b && a.t < b.b && a.b > b.t && a.l < b.r && a.r > b.l;
      const sigue = caja(card.querySelector('.ui-sigue') || card.querySelector('.ui-voto'));
      const otra = caja(card.querySelector('.ui-btn.primary'));
      const menu = caja([...card.querySelectorAll('.ui-btn.secondary')].find((n) => !n.classList.contains('ui-voto')));
      const voto = caja(card.querySelector('.ui-voto') || document.querySelector('.ui-voto'));
      const z = s.saludoZonas();
      const mk = { t: Math.round(z.mokiT), b: Math.round(z.floorY), l: Math.round(z.mokiL), r: Math.round(z.mokiR) };
      const ctB = Math.round(z.mokiT + (z.floorY - z.mokiT) * 0.55);
      const tapa = (b, hasta) => (b.l < mk.r && b.r > mk.l ? Math.max(0, Math.min(b.b, hasta) - Math.max(b.t, mk.t)) : 0);
      const tarjetas = [...document.querySelectorAll('.ui-card')].map(caja);
      const tapadoCT = Math.max(0, ...tarjetas.map((b) => tapa(b, ctB)));
      const tapadoTodo = Math.max(0, ...tarjetas.map((b) => tapa(b, mk.b)));
      const solapes = [];
      const piezas = { sigue, otra, menu, voto };
      const nombres = Object.keys(piezas).filter((k) => k !== 'sigue' || !card.querySelector('.ui-voto small') && !document.querySelector('.ui-voto-pie'));
      for (let i = 0; i < nombres.length; i++) for (let j = i + 1; j < nombres.length; j++) if (cruza(piezas[nombres[i]], piezas[nombres[j]])) solapes.push(`${nombres[i]}-${nombres[j]}`);
      return {
        card: caja(card), sinScroll: card.scrollHeight <= card.clientHeight + 1, scrollH: card.scrollHeight, clientH: card.clientHeight, clases: card.className,
        moki: mk, cabezaTorsoB: ctB, cuaderno: caja(document.querySelector('.ui-cuaderno')), pie: caja(document.querySelector('.ui-voto-pie')), tapadoCT, tapadoTodo, tarjetas,
        sigue: sigue ? { caja: sigue, entero: entero(sigue) || !!document.querySelector('.ui-voto-pie .ui-voto'), texto: (card.querySelector('.ui-sigue') || document.querySelector('.ui-voto')).textContent } : null,
        otra: { caja: otra, entero: entero(otra), foco: document.activeElement === card.querySelector('.ui-btn.primary') },
        voto: voto ? { caja: voto, entero: entero(voto) || (voto.t >= 0 && voto.b <= innerHeight && voto.l >= 0 && voto.r <= innerWidth) } : null,
        menu: menu ? { caja: menu, entero: entero(menu) } : null,
        solapes,
        solapeMoki: cb.right > z.mokiL && cb.left < z.mokiR && cb.bottom > z.mokiT,
        solapeHud: cb.top < z.hudB,
      };
    });
    const caso = `${w}x${h}${q ? ' embed' : ''}`;
    console.log(caso, JSON.stringify(r));
    casos.push({ caso, ...r });
    if (captura) await page.screenshot({ path: `${captura}-${w}x${h}${q ? '-embed' : ''}.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify({ base, casos, errores }, null, 1));
console.log('errores', errores.length, errores.slice(0, 5));
