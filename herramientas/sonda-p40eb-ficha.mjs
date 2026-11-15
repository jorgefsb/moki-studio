// P40e-b (15-nov): la ficha '+N' (píldora del cobro con moneda) cabe entera en pantalla.
// Cada cuadro visible mide el papel de la ficha (ancho = 12 + moneda + 8 + texto + 12, alto 40, sombra +3 a la derecha y +5 abajo)
// en px de pantalla y lo compara con el lienzo. Pasa si en todos los cuadros queda >= 4 px dentro de cada borde.
// También mide el hueco vertical con el letrero 'Si chocas, sigues aquí' cuando conviven (informativo).
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p40eb-ficha.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, corridas: [], errores: [] };
const CORRIDAS = [
  { nombre: 'nuevo 1a partida adjust', ls: null, bot: 'adjust', seed: null },
  { nombre: 'nuevo 1a partida abajo', ls: null, bot: 'abajo', seed: null },
  { nombre: 'libre 1037 adjust', ls: { 'moki.modo': 'libre' }, bot: 'adjust', seed: '1037' },
  { nombre: 'clasico adjust', ls: {}, bot: 'adjust', seed: null, q: '&nivel=clasico' },
];
try {
  for (const c of CORRIDAS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript((ls) => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      localStorage.setItem('moki.tutorial', '1');
      if (ls) { localStorage.setItem('moki.primera', '1'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); }
    }, c.ls);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${c.nombre} ${String(e).slice(0, 300)}`));
    page.on('console', (m) => m.type() === 'error' && out.errores.push(`${c.nombre} ${m.text().slice(0, 300)}`));
    await page.goto(`${url}/?debug${c.q || ''}`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async ([bot, seed]) => {
      const sc = window.__moki.scene.scenes[0];
      const cv = sc.game.canvas.getBoundingClientRect();
      const r = { lienzo: [Math.round(cv.width), Math.round(cv.height)], ventana: [innerWidth, innerHeight], cuadros: 0, cortes: 0, peor: null, fichas: {}, huecoCp: null, fallos: [] };
      const oStep = sc.stepPago.bind(sc);
      sc.stepPago = (dt) => {
        const x = oStep(dt);
        const p = sc.pago;
        if (!p || !p.visible) return x;
        const cam = sc.cameras.main, z = cam.zoom, wv = cam.worldView, s = p.scaleX;
        const icon = p.list.find((o) => o.type === 'Image'), tx = p.list.find((o) => o.type === 'Text');
        const w = 24 + (icon ? icon.displayWidth + 8 : 0) + tx.width;
        const k = cam.width / cv.width; // px de juego por px CSS
        const L = ((p.x - (w * s) / 2 - wv.x) * z) / k, R = ((p.x + (w * s) / 2 + 3 * s - wv.x) * z) / k;
        const T = ((p.y - wv.y) * z) / k, B = ((p.y + 45 * s - wv.y) * z) / k;
        const m = { izq: L, der: cv.width - R, arr: T, aba: cv.height - B };
        const min = Math.min(m.izq, m.der, m.arr, m.aba);
        r.cuadros++;
        r.fichas[tx.text] = Math.min(r.fichas[tx.text] ?? 1e9, Math.round(min * 10) / 10);
        if (!r.peor || min < r.peor.min) r.peor = { min: Math.round(min * 10) / 10, tx: tx.text, caja: [L, T, R, B].map((v) => Math.round(v)), t: Math.round(sc.t) };
        if (min < 4 && r.cortes++ < 5) r.fallos.push({ que: 'ficha a < 4 px del borde', tx: tx.text, m: Object.fromEntries(Object.entries(m).map(([a, b]) => [a, Math.round(b)])), t: Math.round(sc.t) });
        const bt = sc.banner && sc.hudC.visible && sc.hudC.alpha > 0.05 && sc.hudC.list.find((o) => o.type === 'Text');
        if (bt && /chocas/.test(bt.text)) {
          const bB = ((sc.hudC.y + 40 * sc.hudC.scaleY - wv.y) * z) / k, bL = ((sc.hudC.x - ((bt.width + 24) * sc.hudC.scaleX) / 2 - wv.x) * z) / k, bR = bL + (((bt.width + 24) * sc.hudC.scaleX) * z) / k;
          const bT = ((sc.hudC.y - wv.y) * z) / k;
          if (R > bL && L < bR) { const g = Math.max(T - bB, bT - B); if (r.huecoCp == null || g < r.huecoCp) r.cpDet = { ficha: [L, T, R, B], cp: [bL, bT, bR, bB], tx: tx.text, t: Math.round(sc.t) }; r.huecoCp = r.huecoCp == null ? g : Math.min(r.huecoCp, g); }
        }
        return x;
      };
      const res = await window.__moki.moki.bot(bot, 200, seed);
      sc.stepPago = oStep;
      r.res = { result: res.result, meters: res.meters, pieces: res.pieces };
      if (r.huecoCp != null) r.huecoCp = Math.round(r.huecoCp);
      return r;
    }, [c.bot, c.seed]);
    out.corridas.push({ nombre: c.nombre, ...r });
    await ctx.close();
  }
} catch (e) {
  out.errores.push(String(e).slice(0, 500));
} finally {
  await browser.close();
}
const cortes = out.corridas.reduce((a, c) => a + c.cortes, 0), cuadros = out.corridas.reduce((a, c) => a + c.cuadros, 0);
out.resumen = { cuadros, cortes, peor: Math.min(...out.corridas.map((c) => (c.peor ? c.peor.min : 1e9))), errores: out.errores.length, pasa: cortes === 0 && cuadros > 0 && !out.errores.length };
writeFileSync(salida, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.resumen), out.corridas.map((c) => `${c.nombre}: ${c.cuadros} cuadros, peor ${c.peor && c.peor.min} (${c.peor && c.peor.tx}), hueco cp ${c.huecoCp}`).join(' | '));
