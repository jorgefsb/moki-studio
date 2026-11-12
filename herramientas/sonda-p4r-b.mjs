// P4r-b cinta de combo en crema con canto naranja. Mismo bot, azar y arranque que sonda-p4q.mjs (god, Mucho, 60 fps con
// sys.step). Cada 3 cuadros con la cinta visible (len >= 2) pinta a mano con y sin sc.cinta.gfx y mide solo los px que
// cambian: cuántos son "café" (el palito kraft de antes), cuántos crema y cuántos naranja, y el contraste WCAG de cada px
// contra lo que había detrás en el mismo cuadro (relleno crema y canto naranja por separado).
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p4r-b.mjs <url> <salida.json> [segundos]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, outFile, segs = '20'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const PRE = (o) => {
  let a = 12345;
  Math.random = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
async function caso(nombre, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, ...(w < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(PRE, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': '2' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`.slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403/.test(m.text()) && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${url}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene.scenes[0].poses, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  return page.evaluate((frames) => {
    const sc = window.__moki.scene.scenes[0];
    sc.startGame(); sc.god = true; sc.tut = { stage: 4, state: 'off' }; sc.game.loop.sleep();
    const dt = 1000 / 60; let tt = performance.now();
    const cv = sc.game.canvas, c2 = document.createElement('canvas');
    c2.width = cv.width; c2.height = cv.height;
    const g2 = c2.getContext('2d', { willReadFrequently: true });
    const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const repinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); };
    const esNar = (r, g, b) => r >= 205 && g >= 75 && g <= 130 && b <= 80 && r - g >= 100;
    const esCafe = (r, g, b) => r >= 120 && r <= 205 && r - b >= 45 && r - b <= 110 && g >= 85 && g <= 165 && r > g && g > b;
    const esCrema = (r, g, b) => r >= 215 && g >= 195 && b >= 160 && r - b <= 70;
    const tot = { cuadros: 0, cafe: 0, crema: 0, nar: 0, otros: 0, cRelleno: [], cCanto: [], multMax: 0 };
    let mantener = false, suelta = -1;
    for (let f = 0; f < frames; f++) {
      if (sc.grounded && suelta < 0) {
        const o = sc.obstacles.find((q) => q.x > sc.px && q.x - sc.px < sc.speed * 0.42);
        if (o) { sc.press(); mantener = !mantener; suelta = f + (mantener ? 19 : 4); }
      }
      if (suelta >= 0 && f >= suelta) { sc.release(); suelta = -1; }
      tt += dt; sc.sys.step(tt, dt);
      if (f % 3 || sc.cinta.len < 2) continue;
      sc.cinta.gfx.visible = false; repinta(); g2.drawImage(cv, 0, 0);
      const f0 = g2.getImageData(0, 0, cv.width, cv.height).data;
      sc.cinta.gfx.visible = true; repinta(); g2.drawImage(cv, 0, 0);
      const d = g2.getImageData(0, 0, cv.width, cv.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (f0[i] === d[i] && f0[i + 1] === d[i + 1] && f0[i + 2] === d[i + 2]) continue;
        n++;
        const c = cr(L(d[i], d[i + 1], d[i + 2]), L(f0[i], f0[i + 1], f0[i + 2]));
        if (esCafe(d[i], d[i + 1], d[i + 2])) tot.cafe++;
        else if (esCrema(d[i], d[i + 1], d[i + 2])) { tot.crema++; if (tot.cRelleno.length < 200000) tot.cRelleno.push(c); }
        else if (esNar(d[i], d[i + 1], d[i + 2])) { tot.nar++; if (tot.cCanto.length < 200000) tot.cCanto.push(c); }
        else tot.otros++;
      }
      if (n) { tot.cuadros++; tot.multMax = Math.max(tot.multMax, sc.cinta.mult); }
    }
    const res = (a) => { a.sort((x, y) => x - y); return a.length ? { n: a.length, p25: +a[a.length >> 2].toFixed(2), med: +a[a.length >> 1].toFixed(2), pasa15: +(a.filter((v) => v >= 1.5).length / a.length).toFixed(2), pasa2: +(a.filter((v) => v >= 2).length / a.length).toFixed(2) } : null; };
    return { zoom: sc.cameras.main.zoom, cuadros: tot.cuadros, multMax: tot.multMax, px: { cafe: tot.cafe, crema: tot.crema, naranja: tot.nar, otros: tot.otros }, relleno: res(tot.cRelleno), canto: res(tot.cCanto) };
  }, Math.round(+segs * 60)).finally(() => ctx.close());
}
const out = { url, errores };
try {
  out['390'] = await caso('390', 390, 844);
  out['1280'] = await caso('1280', 1280, 720);
} finally {
  await browser.close();
}
writeFileSync(outFile, JSON.stringify(out, null, 1));
for (const k of ['390', '1280']) console.log(k, JSON.stringify(out[k]));
console.log('errores', errores.length, errores.slice(0, 4).join(' | '));
