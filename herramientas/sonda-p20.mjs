// Sonda P20: en la pantalla de inicio, qué obstáculos del demo caen detrás de JUGAR / Vota / MEGA y cuándo.
// Muestra cada 200 ms durante N s la caja en pantalla (px CSS) de cada obstáculo y la cruza con las cajas del menú.
// Jugador nuevo (sin localStorage). Headless. Uso: node herramientas/sonda-p20.mjs <url-base> [seg=12] [tams=1280x720] [carpeta] [prefijo]
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, segArg, tamArg, capDir, pref] = process.argv.slice(2);
const SEG = Number(segArg || 12);
const TAMS = (tamArg || '1280x720').split(',').map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
try {
  for (const [W, H] of TAMS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${W}x${H}: ${e}`));
    page.on('console', (m) => m.type() === 'error' && errores.push(`${W}x${H}: ${m.text()}`));
    await page.route('https://moki.jorgesuarez.com.mx/**', (rt) => rt.fulfill({ status: 200, body: 'ok' }));
    await page.goto(`${base}/?debug`);
    await page.waitForSelector('.mn-hero', { timeout: 60000 });
    const t0 = Date.now();
    let tomada = false;
    while (Date.now() - t0 < SEG * 1000) {
      const m = await page.evaluate(() => {
        const s = window.__moki.scene.scenes[0];
        const cam = s.cameras.main;
        const cv = s.game.canvas.getBoundingClientRect();
        const k = cv.width / s.scale.width;
        const aPant = (b) => ({ x0: Math.round(cv.x + (b.x - cam.worldView.x) * cam.zoom * k), x1: Math.round(cv.x + (b.right - cam.worldView.x) * cam.zoom * k), y0: Math.round(cv.y + (b.y - cam.worldView.y) * cam.zoom * k), y1: Math.round(cv.y + (b.bottom - cam.worldView.y) * cam.zoom * k) });
        const menu = [...document.querySelectorAll('.ui-menu:not(.out)')].pop();
        const rr = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x0: Math.round(b.left), x1: Math.round(b.right), y0: Math.round(b.top), y1: Math.round(b.bottom) }; };
        const mega = [...document.querySelectorAll('.mn-card')].find((b) => /MEGA/.test(b.textContent));
        const cajas = { hero: rr(menu && menu.querySelector('.mn-hero')), voto: rr(menu && menu.querySelector('.mn-voto')), mega: rr(mega), menu: rr(menu) };
        const obs = s.obstacles.map((o) => ({ type: o.type, D: o.D, vis: o.sprite.visible, ...aPant(o.sprite.getBounds()) })).filter((o) => o.x1 > 0 && o.x0 < innerWidth);
        return { dist: Math.round(s.dist), px: Math.round(s.px), screen: s.screen, zoom: cam.zoom, k, cajas, obs };
      });
      const choca = (a, b) => a && b && a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
      const tapados = [];
      for (const o of m.obs.filter((q) => q.vis)) for (const c of ['hero', 'voto', 'mega']) if (choca(o, m.cajas[c])) {
        const parcial = o.x0 < m.cajas[c].x0 || o.x1 > m.cajas[c].x1 || o.y0 < m.cajas[c].y0 || o.y1 > m.cajas[c].y1;
        tapados.push(`${o.type}@D${o.D} tras ${c}${parcial ? ' (asoma)' : ''}`);
      }
      console.log(JSON.stringify({ tam: `${W}x${H}`, t: Date.now() - t0, ...m, tapados }));
      if (capDir && !tomada && Date.now() - t0 >= 1500) { await page.screenshot({ path: `${capDir}/${pref || 'x'}-${W}x${H}.png` }); tomada = true; }
      await page.waitForTimeout(200);
    }
    await ctx.close();
  }
} finally {
  console.log(JSON.stringify({ errores }));
  await browser.close();
}
