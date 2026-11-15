// P42c paso 0 (15-nov): ¿Moki corre pegado al borde izquierdo y lo que ya pasó sale cortado junto a él?
// La sonda de P42 (sonda-p42.mjs:56) solo contaba objetos cortados que TODAVÍA no pasaban a Moki; esta cuenta los que ya pasó.
// Cada CADA cuadros de partida (bot adjust), sin renders extra:
//  - silL: borde izquierdo de la silueta de Moki en px de pantalla (alfa > 40 de sus piezas, no getBounds, que trae relleno).
//  - altura de la silueta en px de pantalla (cuánto mide Moki).
//  - cortadoCerca: hay una caja o moneda ya pasada (o.x < px) que el borde izquierdo corta (left < worldView.x) y cuyo
//    borde derecho queda a menos de 40 px de pantalla de silL.
//  - anticipación: lo que se ve delante de Moki (worldView.right - px), en mundo y en pantalla.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p42c.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const CORRIDAS = [
  { nombre: 'reto 2026-11-14', modo: 'reto', seed: '2026-11-14' },
  { nombre: 'libre 1037', modo: 'libre', seed: '1037' },
  { nombre: 'primera 404164866', modo: 'primera', seed: '404164866' },
];
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, corridas: [], errores: [] };
try {
  for (const c of CORRIDAS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript((modo) => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.tutorial', '1'); localStorage.setItem('moki.modo', modo); }, c.modo);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${c.nombre} ${String(e).slice(0, 300)}`));
    page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && out.errores.push(`${c.nombre} ${m.text().slice(0, 300)}`));
    await page.goto(`${url}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async ({ seed, cada }) => {
      const sc = window.__moki.scene.scenes[0], orig = sc.update.bind(sc);
      const r = { muestras: 0, silL: [], alto: [], mx: [], cortCerca: 0, cortPasado: 0, adMundo: [], adPant: [] };
      let fr = 0;
      sc.update = (a, b) => {
        const ret = orig(a, b);
        if (sc.screen !== 'play' || sc.dead || ++fr % cada) return ret;
        const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView;
        const piezas = [], junta = (o) => { if (!o || !o.visible) return; if (o.type === 'Image') piezas.push(o); else if (o.list) o.list.forEach(junta); };
        if (sc.poses && sc.poses.sprite && sc.poses.sprite.visible) piezas.push(sc.poses.sprite); else junta(sc.rig.container);
        if (!piezas.length) return ret;
        let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
        for (const p of piezas) { const b = p.getBounds(); bx0 = Math.min(bx0, b.x); by0 = Math.min(by0, b.y); bx1 = Math.max(bx1, b.right); by1 = Math.max(by1, b.bottom); }
        const x0 = Math.floor((bx0 - v.x) * z), y0 = Math.floor((by0 - v.y) * z);
        const w = Math.ceil((bx1 - bx0) * z) + 2, h = Math.ceil((by1 - by0) * z) + 2;
        const tmp = { x: 0, y: 0 };
        let L = 1e9, T = 1e9, B = -1e9;
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
          const sx = x0 + xx, sy = y0 + yy;
          if (sx >= L && sy >= T && sy <= B) continue;
          for (const p of piezas) {
            const M = p.getWorldTransformMatrix();
            M.applyInverse(v.x + (sx + 0.5) / z, v.y + (sy + 0.5) / z, tmp);
            const lx = tmp.x + p.displayOriginX, ly = tmp.y + p.displayOriginY;
            if (lx >= 0 && ly >= 0 && lx < p.width && ly < p.height && sc.textures.getPixelAlpha(lx | 0, ly | 0, p.texture.key, p.frame.name) > 40) { L = Math.min(L, sx); T = Math.min(T, sy); B = Math.max(B, sy); break; }
          }
        }
        if (L > 1e8) return ret;
        r.muestras++; r.silL.push(L); r.alto.push(B - T + 1); r.mx.push((sc.px - v.x) * z);
        r.adMundo.push(v.right - sc.px); r.adPant.push((v.right - sc.px) * z);
        let cerca = false, pasado = false;
        for (const o of [...sc.obstacles, ...sc.pickups]) {
          const s = o.sprite; if (!s || !s.visible || o.taken || !s.getBounds || o.x >= sc.px) continue;
          const b = s.getBounds(); if (b.x >= v.x || b.right <= v.x) continue;
          pasado = true; if (L - (b.right - v.x) * z < 40) cerca = true;
        }
        if (pasado) r.cortPasado++; if (cerca) r.cortCerca++;
        return ret;
      };
      await window.__moki.moki.bot('adjust', 200, seed);
      sc.update = orig;
      const n = r.muestras || 1, med = (a) => { const s = [...a].sort((x, y) => x - y); return Math.round(s[s.length >> 1] * 10) / 10; }, mn = (a) => Math.round(Math.min(...a) * 10) / 10;
      return { zoom: Math.round(sc.cameras.main.zoom * 1000) / 1000, muestras: r.muestras, xMokiPant: med(r.mx), silL: { min: mn(r.silL), mediana: med(r.silL) }, altoMoki: med(r.alto), anticipacion: { mundo: med(r.adMundo), pantalla: med(r.adPant) }, pctCortadoPasado: Math.round((1000 * r.cortPasado) / n) / 10, pctCortadoCerca40: Math.round((1000 * r.cortCerca) / n) / 10 };
    }, { seed: c.seed, cada: Number(process.env.CADA || 10) });
    out.corridas.push({ ...c, ...r });
    console.log(tam, c.nombre, JSON.stringify(r));
    await ctx.close();
  }
} finally { await browser.close(); }
writeFileSync(salida, JSON.stringify(out, null, 1));
console.log('errores', out.errores.length, out.errores.slice(0, 3).join(' | '));
