// P43 (15-nov): Moki más grande en vertical. Parte de sonda-p42 (P42) y agrega:
//  - alto: filas de la silueta de Moki en px de pantalla (en el suelo, corriendo); mediana y máx.
//  - suela: fila más baja de la silueta contra la línea del suelo en pantalla, por pose (en el suelo): min y max.
//  - roces: % de muestras con pixeles de una caja (solo su sprite, sin sombra) dentro de la silueta, sin choque.
// P42 corte 1 (14-nov): ¿a 390 a Moki lo tapan más cosas que a 1280? Sonda en juego, sin tocar src.
// Cada 20 cuadros de partida (bot adjust; Reto 2026-11-14 y Libre 1037):
//  - x de Moki en pantalla ((px - worldView.x) * zoom).
//  - Silueta de Moki en px de lienzo: alfa > 40 de su sprite de poses o de las piezas del títere (getPixelAlpha, no getBounds).
//  - Para cada categoría (cinta, arco P4q, partículas, cajas, monedas): pinta el cuadro sin Moki y luego sin Moki ni esa
//    categoría; los pixeles que cambian son lo que esa categoría cubre, aunque quede bajo Moki. "encima" = esos pixeles
//    dentro de la silueta. "tapa" = solo de las categorías que van arriba de Moki (partículas, profundidad 13).
//  - Cortados: cajas o monedas que tocan el borde izquierdo y todavía no pasan a Moki (x > px).
// Reporta el % de muestras con Moki encimado por categoría y los pixeles medios encimados (sobre la silueta).
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p42.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const CORRIDAS = [
  { nombre: 'reto 2026-11-14 adjust', modo: 'reto', seed: '2026-11-14' },
  { nombre: 'libre 1037 adjust', modo: 'libre', seed: '1037' },
];
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', ...(process.env.SW ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])] });
const out = { url, tam, corridas: [], errores: [] };
try {
  for (const c of CORRIDAS) {
    if (process.env.SOLO && !c.nombre.includes(process.env.SOLO)) continue;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript((n) => { window.__cada = n; }, Number(process.env.CADA || 20));
    await ctx.addInitScript((modo) => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.tutorial', '1'); localStorage.setItem('moki.modo', modo); }, c.modo);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${c.nombre} ${String(e).slice(0, 300)}`));
    page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && out.errores.push(`${c.nombre} ${m.text().slice(0, 300)}`));
    await page.goto(`${url}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async (seed) => {
      const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, orig = sc.update.bind(sc), R = sc.game.renderer;
      const tmpC = document.createElement('canvas'), g2 = tmpC.getContext('2d', { willReadFrequently: true });
      const leer = (x, y, w, h) => { R.preRender(); sc.sys.render(R); R.postRender(); tmpC.width = w; tmpC.height = h; g2.drawImage(cv, x, y, w, h, 0, 0, w, h); return g2.getImageData(0, 0, w, h).data; };
      const CATS = {
        cinta: () => [sc.cinta && sc.cinta.gfx],
        arco: () => [sc.arcoG],
        particulas: () => sc.particles ? sc.particles.items.map((p) => p.sprite) : [],
        cajas: () => sc.obstacles.flatMap((o) => [o.sprite, o.shadow]),
        roces: () => sc.obstacles.map((o) => o.sprite),
        monedas: () => sc.pickups.flatMap((k) => [k.sprite, k.shadow]),
      };
      const ARRIBA = { particulas: true };
      const altos = [], suela = {};
      const r = { muestras: 0, xMin: 1e9, xMax: -1, xSum: 0, cortados: 0, encima: {}, tapa: 0, pxEncima: {}, silMedia: 0 };
      for (const k in CATS) (r.encima[k] = 0), (r.pxEncima[k] = 0);
      let fr = 0;
      sc.update = (a, b) => {
        const ret = orig(a, b);
        if (sc.screen !== 'play' || sc.dead || ++fr % (+(window.__cada || 20))) return ret; // 3 muestras por segundo (la máquina va cargada)
        const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView;
        const mx = (sc.px - v.x) * z;
        r.muestras++; r.xMin = Math.min(r.xMin, mx); r.xMax = Math.max(r.xMax, mx); r.xSum += mx;
        for (const o of [...sc.obstacles, ...sc.pickups]) { const s = o.sprite; if (!s || !s.visible || o.taken || !s.getBounds) continue; const b = s.getBounds(); if (b.x < v.x && o.x > sc.px) { r.cortados++; break; } }
        // Moki: piezas visibles
        const piezas = [], junta = (o) => { if (!o || !o.visible) return; if (o.type === 'Image') piezas.push(o); else if (o.list) o.list.forEach(junta); };
        if (sc.poses && sc.poses.sprite && sc.poses.sprite.visible) piezas.push(sc.poses.sprite); else junta(sc.rig.container);
        if (!piezas.length) return ret;
        let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
        for (const p of piezas) { const b = p.getBounds(); bx0 = Math.min(bx0, b.x); by0 = Math.min(by0, b.y); bx1 = Math.max(bx1, b.right); by1 = Math.max(by1, b.bottom); }
        const x0 = Math.max(0, Math.floor((bx0 - v.x) * z)), y0 = Math.max(0, Math.floor((by0 - v.y) * z));
        const w = Math.min(cv.width - x0, Math.ceil((bx1 - bx0) * z) + 2), h = Math.min(cv.height - y0, Math.ceil((by1 - by0) * z) + 2);
        if (w < 2 || h < 2) return ret;
        const sil = new Uint8Array(w * h), tmp = { x: 0, y: 0 }; let nSil = 0;
        for (const p of piezas) {
          const M = p.getWorldTransformMatrix();
          for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
            const i = yy * w + xx; if (sil[i]) continue;
            M.applyInverse(v.x + (x0 + xx + 0.5) / z, v.y + (y0 + yy + 0.5) / z, tmp);
            const lx = tmp.x + p.displayOriginX, ly = tmp.y + p.displayOriginY;
            if (lx >= 0 && ly >= 0 && lx < p.width && ly < p.height && sc.textures.getPixelAlpha(lx | 0, ly | 0, p.texture.key, p.frame.name) > 40) (sil[i] = 1), nSil++;
          }
        }
        r.silMedia += nSil;
        let fy0 = -1, fy1 = -1;
        for (let yy = 0; yy < h; yy++) { let a = false; for (let xx = 0; xx < w; xx++) if (sil[yy * w + xx]) { a = true; break; } if (a) { if (fy0 < 0) fy0 = yy; fy1 = yy; } }
        if (sc.grounded && fy0 >= 0) {
          const pk = sc.poses && sc.poses.sprite && sc.poses.sprite.visible ? sc.poses.pose : 'titere';
          if (pk === 'pose-run') altos.push(fy1 - fy0 + 1);
          const suelo = (sc.y - v.y) * z; // en el suelo, sc.y es la línea del suelo (o la tapa de la caja)
          const d = Math.round((y0 + fy1 + 1 - suelo) * 10) / 10;
          const e = (suela[pk] = suela[pk] || { min: 1e9, max: -1e9, n: 0 }); e.min = Math.min(e.min, d); e.max = Math.max(e.max, d); e.n++;
        }
        // Solo se pintan las categorías con algo cerca de Moki (caja de mundo con 4 px de margen); sin nada cerca no hay render
        const cerca = (o) => { if (!o || !o.visible) return false; if (o.type === 'Graphics') return true; if (!o.getBounds) return false; const b = o.getBounds(); return b.x < bx1 + 4 && b.right > bx0 - 4 && b.y < by1 + 4 && b.bottom > by0 - 4; };
        const grupos = Object.entries(CATS).map(([k, f]) => [k, f().filter(cerca)]).filter(([, l]) => l.length);
        if (!grupos.length) return ret;
        const vis = piezas.map((p) => [p, p.visible]); const mokiOff = () => { if (sc.poses && sc.poses.sprite) sc.poses.sprite.visible = false; sc.rig.container.visible = false; };
        const posesV = sc.poses && sc.poses.sprite ? sc.poses.sprite.visible : null, rigV = sc.rig.container.visible;
        mokiOff();
        const A = leer(x0, y0, w, h);
        let tapo = false;
        for (const [k, objs] of grupos) {
          objs.forEach((o) => (o.visible = false));
          const B = leer(x0, y0, w, h);
          objs.forEach((o) => (o.visible = true));
          let n = 0;
          for (let i = 0; i < w * h; i++) if (sil[i] && Math.abs(A[i * 4] - B[i * 4]) + Math.abs(A[i * 4 + 1] - B[i * 4 + 1]) + Math.abs(A[i * 4 + 2] - B[i * 4 + 2]) > 24) n++;
          if (n > 0) { r.encima[k]++; r.pxEncima[k] += n; if (ARRIBA[k]) tapo = true; }
        }
        if (tapo) r.tapa++;
        if (sc.poses && sc.poses.sprite) sc.poses.sprite.visible = posesV; sc.rig.container.visible = rigV;
        vis.length = 0;
        return ret;
      };
      await window.__moki.moki.bot('adjust', 200, seed);
      sc.update = orig;
      const n = r.muestras || 1;
      const pct = {}; for (const k in r.encima) pct[k] = Math.round((1000 * r.encima[k]) / n) / 10;
      const pxm = {}; for (const k in r.pxEncima) pxm[k] = r.encima[k] ? Math.round(r.pxEncima[k] / r.encima[k]) : 0;
      return { zoom: Math.round(sc.cameras.main.zoom * 1000) / 1000, muestras: r.muestras, xPantalla: { min: Math.round(r.xMin), media: Math.round(r.xSum / n), max: Math.round(r.xMax) }, silueta: Math.round(r.silMedia / n), pctEncima: pct, pxMedioEncima: pxm, pctTapaArriba: Math.round((1000 * r.tapa) / n) / 10, pctCortados: Math.round((1000 * r.cortados) / n) / 10, alto: altos.length ? { mediana: altos.sort((a, b) => a - b)[altos.length >> 1], max: altos[altos.length - 1], n: altos.length } : null, suela, mokiF: sc.mokiF };
    }, c.seed);
    out.corridas.push({ ...c, ...r });
    console.log(tam, c.nombre, JSON.stringify(r));
    await ctx.close();
  }
} finally { await browser.close(); }
writeFileSync(salida, JSON.stringify(out, null, 1));
console.log('errores', out.errores.length);
