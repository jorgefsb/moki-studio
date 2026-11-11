// Sonda P28 VOTA ARRIBA: por tamaño (390x844, 390x700, 375x667, 1280x720) y tarjeta (final, fallo), sin localStorage previo
// (jugador nuevo, primera partida): scroll de la tarjeta, Puntaje entero, botón de voto entero dentro de tarjeta y
// viewport, solapes con Moki y HUD (saludoZonas), href del voto y textos. Edge headless; con flock /tmp/moki-pesado.lock.
// Vuelta 2: + embed 660x372 y 640x400, bloque gris arriba a la derecha (qué hay sobre el HUD) y teclado tras Vota.
// Uso: node herramientas/sonda-p28.mjs <url-base> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const casos = [];
try {
  for (const [w, h] of [[390, 844], [390, 700], [375, 667], [1280, 720], [660, 372], [640, 400]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 700 && h > w, isMobile: w < 700 && h > w });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      localStorage.setItem('moki.primera', '1');
      localStorage.setItem('moki.tutorial', '1');
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${w} ${e}`));
    page.on('console', (m) => m.type() === 'error' && errores.push(`${w} ${m.text()}`));
    await page.goto(`${base}/?debug&nivel=clasico`);
    await page.waitForFunction(() => window.__moki && window.__moki.scene, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__moki.scene.scenes[0].game.loop.sleep());
    for (const tipo of ['fallo', 'final']) {
      const r = await page.evaluate(async (tipo) => {
        const s = window.__moki.scene.scenes[0];
        if (s.screen === 'final' || s.screen === 'dead') try { s.playAgain(); } catch (e) {}
        s.startGame();
        s.tut = { stage: 4, state: 'off' };
        if (tipo === 'final') {
          s.dist = 43200;
          s.finish();
          for (let f = 0; f < 140 && !s.finalShown; f++) s.update(0, 16.667);
        } else {
          s.god = false;
          for (let f = 0; f < 900 && !s.cardShown; f++) s.update(f * 16.667, 16.667);
        }
        await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
        document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} });
        await new Promise((ok) => setTimeout(ok, 300));
        const card = [...document.querySelectorAll('.ui-card:not(.ui-voto-pie)')].pop();
        const cb = card.getBoundingClientRect();
        const caja = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) }; };
        const dentro = (b) => !!b && b.t >= Math.floor(cb.top) && b.b <= Math.ceil(cb.bottom) && b.t >= 0 && b.b <= innerHeight;
        const dts = [...card.querySelectorAll('dt')];
        const iScore = dts.findIndex((d) => /Puntaje|Score/.test(d.textContent));
        const score = iScore >= 0 ? caja(card.querySelectorAll('dd')[iScore]) : null;
        const scoreDt = iScore >= 0 ? caja(dts[iScore]) : null;
        const voto = document.querySelector('.ui-voto');
        const vb = caja(voto);
        const z = s.saludoZonas();
        const solapeMoki = cb.right > z.mokiL && cb.left < z.mokiR && cb.bottom > z.mokiT;
        const solapeHud = cb.top < z.hudB;
        const prim = card.querySelector('.ui-btn.primary, .ui-pill');
        return {
          card: caja(card), clientH: card.clientHeight, scrollH: card.scrollHeight, sinScroll: card.scrollHeight <= card.clientHeight + 1, clases: card.className,
          puntaje: scoreDt && score ? { dt: scoreDt, dd: score, entero: dentro(scoreDt) && dentro(score) } : null,
          voto: voto ? { caja: vb, entero: dentro(vb), href: voto.href, target: voto.target, texto: voto.textContent, sub: (document.querySelector('.ui-voto-sub') || {}).textContent } : null,
          principal: prim ? { texto: prim.textContent.trim(), caja: caja(prim), entero: dentro(caja(prim)), foco: document.activeElement === prim } : null,
          pie: (() => { const n = document.querySelector('.ui-voto-pie'); if (!n) return null; const b = caja(n); const pb = caja(prim); const btn = n.querySelector('.ui-voto'); const sub = n.querySelector('.ui-voto-sub');
            return { caja: b, enViewport: b.t >= 0 && b.b <= innerHeight && b.l >= 0 && b.r <= innerWidth, bajoPies: b.t >= z.floorY, solapeMoki: b.r > z.mokiL && b.l < z.mokiR && b.t < z.floorY && b.b > z.mokiT, solapePrincipal: !!pb && b.t < pb.b && b.b > pb.t, solapeTarjeta: b.t < cb.bottom, solapeHud: b.t < z.hudB, altoBoton: Math.round(btn.getBoundingClientRect().height), colorTexto: getComputedStyle(sub).color, fondo: getComputedStyle(n).backgroundColor, floorY: Math.round(z.floorY) }; })(),
          cuaderno: caja(document.querySelector('.ui-cuaderno')), cuadernoVisible: !!document.querySelector('.ui-cuaderno') && getComputedStyle(document.querySelector('.ui-cuaderno')).visibility !== 'hidden',
          gris: (() => { const out = []; for (const [fx, fy] of [[0.97, 0.05], [0.9, 0.08], [0.85, 0.12], [0.95, 0.15], [0.97, 0.3]]) { const n = document.elementFromPoint(innerWidth * fx, innerHeight * fy); if (!n) continue; const cs = getComputedStyle(n); out.push(`${n.tagName}.${n.className}|bg=${cs.backgroundColor}`); } return out; })(),
          barraScroll: card.offsetWidth - card.clientWidth - 2 * parseFloat(getComputedStyle(card).borderLeftWidth || 0),
          chicas: [...card.querySelectorAll('.ui-chica')].map((n) => n.textContent),
          zonas: { mokiL: Math.round(z.mokiL), mokiR: Math.round(z.mokiR), mokiT: Math.round(z.mokiT), hudB: Math.round(z.hudB) }, solapeMoki, solapeHud,
        };
      }, tipo);
      console.log(`${w}x${h} ${tipo}`, JSON.stringify(r));
      casos.push({ caso: `${w}x${h} ${tipo}`, ...r });
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify({ base, casos, errores }, null, 1));
console.log('errores', errores.length, errores.slice(0, 5));
