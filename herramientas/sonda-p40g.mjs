// P40g (16-nov): LA PÍLDORA SE VA SIN GRIS NI GOLPE, en números. Engancha stepPago y mide, por cuadro visible de cada píldora:
// (a) alfa = 1.000 mientras escala/s0 > 0.45; alfa >= 0.6 mientras la x-height en pantalla sea >= 8 px;
// (d) salto entre cuadros consecutivos en pantalla <= 70 px a 1280 y <= 40 a 390 (y normalizado a 16.7 ms);
// (e) el último cuadro visible cae a <= 12 px de pantalla del centro del contador (hudR).
// Cuenta también cobros que interrumpen un vuelo (caso: si pasan del 5 % de los cobros, la vieja termina en otro contenedor).
// (b) velo gris y (c) texto oscuro van por pixeles en el ciego del líder; aquí no se miden.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p40g.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const SALTO = W < 500 ? 40 : 70;
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, corridas: [], errores: [] };
const CORRIDAS = [
  { nombre: 'libre 1037 adjust', ls: { 'moki.modo': 'libre' }, bot: 'adjust', seed: '1037' },
  { nombre: 'libre 1037 abajo', ls: { 'moki.modo': 'libre' }, bot: 'abajo', seed: '1037' },
  { nombre: 'reto 2026-11-14 adjust', ls: { 'moki.modo': 'reto' }, bot: 'adjust', seed: '2026-11-14' },
  { nombre: 'nuevo 1a partida adjust', ls: null, bot: 'adjust', seed: null },
  { nombre: 'nuevo 1a partida abajo', ls: null, bot: 'abajo', seed: null },
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
    await page.goto(`${url}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async ([bot, seed, SALTO]) => {
      const sc = window.__moki.scene.scenes[0];
      const g2 = document.createElement('canvas').getContext('2d');
      const xh = (sc0) => { g2.font = `700 ${22 * sc0 * sc.cameras.main.zoom}px Outfit, sans-serif`; return g2.measureText('x').actualBoundingBoxAscent; };
      const r = { pild: 0, cuadros: 0, fallos: [], interrumpidas: 0, cobros: 0, saltoMax: 0, salto16Max: 0, llegadaMax: 0, alfaMinGrande: 1, pasos: [], intT: [] };
      let cur = null;
      const cierra = (porCobro) => {
        if (!cur || !cur.last) return (cur = null);
        r.pild++;
        if (porCobro && cur.last.t >= 520) { r.interrumpidas++; if (r.intT.length < 5) r.intT.push({ tJuego: Math.round(sc.t), pagoT: Math.round(cur.last.t), tx: cur.tx }); }
        else if (!porCobro && !sc.reduced) {
          const d = Math.hypot(cur.last.x - cur.last.hx, cur.last.y - cur.last.hy);
          r.llegadaMax = Math.max(r.llegadaMax, d);
          if (d > 12) r.fallos.push({ que: 'llegada > 12 px del contador', d: +d.toFixed(1), tx: cur.tx });
        }
        cur = null;
      };
      const oPago = sc.showPago.bind(sc);
      sc.showPago = (...a) => { r.cobros++; cierra(true); const x = oPago(...a); cur = { s0: sc.pago.scaleX, last: null, tx: (sc.pago.list.find((o) => o.type === 'Text') || {}).text }; return x; };
      const oStep = sc.stepPago.bind(sc);
      sc.stepPago = (dt) => {
        const x = oStep(dt);
        const cam = sc.cameras.main, z = cam.zoom;
        if (sc.pago && sc.pago.visible && cur) {
          const b = sc.hudR.getBounds();
          const f = { t: sc.pagoT, x: (sc.pago.x - cam.worldView.x) * z, y: (sc.pago.y - cam.worldView.y) * z, hx: (b.centerX - cam.worldView.x) * z, hy: (b.centerY - cam.worldView.y) * z, a: sc.pago.alpha, e: sc.pago.scaleX / cur.s0 };
          r.cuadros++;
          if (f.e > 0.45 && f.a < 0.9995 && r.fallos.length < 30) r.fallos.push({ que: 'alfa < 1 con escala > 0.45', ...f });
          if (f.e > 0.45) r.alfaMinGrande = Math.min(r.alfaMinGrande, f.a);
          if (xh(sc.pago.scaleX) >= 8 && f.a < 0.6 && r.fallos.length < 30) r.fallos.push({ que: 'alfa < 0.6 con x-height >= 8 px', ...f });
          if (cur.last) {
            const d = Math.hypot(f.x - cur.last.x, f.y - cur.last.y);
            r.saltoMax = Math.max(r.saltoMax, d);
            r.salto16Max = Math.max(r.salto16Max, (d * 16.7) / Math.max(dt, 1));
            if (d > SALTO && r.fallos.length < 30) r.fallos.push({ que: `salto > ${SALTO} px`, d: +d.toFixed(1), t: f.t, dt });
          }
          if (r.pasos.length < 70) r.pasos.push([Math.round(f.t), Math.round(f.x), Math.round(f.y), +f.a.toFixed(3), +f.e.toFixed(3)]);
          cur.last = f;
        } else if (cur && cur.last) cierra(false);
        return x;
      };
      const res = await window.__moki.moki.bot(bot, 200, seed);
      for (let i = 0; i < 80; i++) sc.stepPago(16.7);
      r.res = { result: res.result, meters: res.meters, pieces: res.pieces };
      sc.showPago = oPago;
      sc.stepPago = oStep;
      return r;
    }, [c.bot, c.seed, SALTO]);
    const fila = { nombre: c.nombre, ...r, saltoMax: +r.saltoMax.toFixed(1), salto16Max: +r.salto16Max.toFixed(1), llegadaMax: +r.llegadaMax.toFixed(1), nFallos: r.fallos.length };
    out.corridas.push(fila);
    console.log(c.nombre, JSON.stringify({ cobros: r.cobros, pild: r.pild, cuadros: r.cuadros, interrumpidas: r.interrumpidas, saltoMax: fila.saltoMax, salto16Max: fila.salto16Max, llegadaMax: fila.llegadaMax, alfaMinGrande: r.alfaMinGrande, intT: r.intT, nFallos: r.fallos.length, fallos: r.fallos.slice(0, 3) }));
    await ctx.close();
  }
  const S = (k) => out.corridas.reduce((a, x) => a + x[k], 0);
  const M = (k) => Math.max(...out.corridas.map((x) => x[k]));
  out.veredicto = { cobros: S('cobros'), pildoras: S('pild'), interrumpidas: S('interrumpidas'), saltoMax: M('saltoMax'), llegadaMax: M('llegadaMax'), fallos: S('nFallos'), consola: out.errores.length };
  out.veredicto.ok = out.veredicto.pildoras >= 20 && out.veredicto.fallos === 0 && out.veredicto.consola === 0;
  console.log('veredicto', JSON.stringify(out.veredicto));
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
