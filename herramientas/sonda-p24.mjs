// Sonda P24 CÁMARA CON ADELANTO: con el bot adjust, por obstáculo, ms REALES (reloj de pantalla, no el de MEGA) desde que
// su borde izquierdo entra en la vista (x - W/2 <= vw) hasta que toca el frente de Moki (x - W/2 <= px + ancho/2).
// Además: cambio máximo de px por cuadro en px de pantalla y px mínimo (margen izquierdo de Moki) por caso.
// Casos: 1280x720 base (clásico) y x2.0 (?ir=mega2) y x1.5; 390x844 base y x2.0. Edge headless; con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p24.mjs <url-base> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const casos = [];
async function corre(nombre, w, h, q) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('moki.primera', '1');
    localStorage.setItem('moki.tutorial', '1');
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?debug${q}`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const s = window.__moki.scene.scenes[0];
    const orig = s.update.bind(s);
    let real = 0;
    let lastPx = null;
    let maxDpx = 0;
    let minPx = 1e9;
    const vis = new Map();
    const SZ = { caja: 60, torre: 60, viga: 91, tramp: 88 };
    s.update = (t, d) => {
      orig(t, d);
      if (s.screen !== 'play') return;
      real += Math.min(d, 50);
      if (lastPx !== null) maxDpx = Math.max(maxDpx, Math.abs(s.px - lastPx) * s.zoom);
      lastPx = s.px;
      minPx = Math.min(minPx, s.px);
      for (const o of s.obstacles) {
        const W = o.W || SZ[o.type] || 60;
        const left = o.x - W / 2;
        let v = vis.get(o);
        if (!v) vis.set(o, (v = { type: o.type, tIn: null, tHit: null }));
        if (v.tIn === null && left <= s.vw) v.tIn = real;
        if (v.tHit === null && left <= s.px + 19) v.tHit = real;
      }
    };
    const res = await window.__moki.moki.bot('adjust', 60, null);
    s.update = orig;
    const ms = [...vis.values()].filter((v) => v.tIn !== null && v.tHit !== null && v.tIn > 0).map((v) => v.tHit - v.tIn);
    ms.sort((a, b) => a - b);
    const med = ms.length ? ms[Math.floor(ms.length / 2)] : null;
    const prom = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null;
    return { result: res.result, score: res.score, n: ms.length, medMs: med, promMs: prom, primeros: ms.slice(0, 3), maxDpxPantalla: maxDpx, minPx, pxFinal: s.px, pxBase: s.pxBase, zoom: s.zoom, vw: s.vw, mega: s.megaOn };
  });
  console.log(nombre, JSON.stringify(r));
  casos.push({ caso: nombre, ...r });
  await ctx.close();
}
try {
  await corre('1280 base', 1280, 720, '&nivel=clasico');
  await corre('1280 x1.5', 1280, 720, '&ir=mega');
  await corre('1280 x2.0', 1280, 720, '&ir=mega2');
  await corre('390 base', 390, 844, '&nivel=clasico');
  await corre('390 x2.0', 390, 844, '&ir=mega2');
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify({ base, casos, errores }, null, 1));
console.log('errores', errores.length);
