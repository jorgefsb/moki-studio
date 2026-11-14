// P39 (13-nov): chip de combo 'x2 +N' / 'x3 +N' legible. Reto con bot; en cada cuadro con el chip (cinta.aviso) visible mide:
// gris = cuadros con alfa entre 0.05 y 0.95 (el fundido que se veía gris), letra = 22 px × escala × zoom en px de lienzo (solo
// cuadros a alto completo), tinta = alto en px de los pixeles de tinta del texto recortado del lienzo (toDataURL, no screenshot),
// moki/pildora = cuadros donde la caja del chip se encima con Moki o con la píldora '+12/+5'. Guarda la tira del 1.er chip
// (12 cuadros cada 66 ms desde que nace) como <prefijo>-tira.png.
// P39b (14-nov): además, al nacer cada chip (1.er cuadro a alto completo) mide en px de pantalla la distancia de la caja
// del chip al casco (x de Moki, 112 px de mundo sobre los pies): gx = hueco horizontal, gy = hueco vertical, d = centro a casco.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p39b.mjs <url> <WxH> <prefijo> [semilla] [bot]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, pre, seed = '2026-10-31', bot = 'adjust'] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.tutorial', '1'); localStorage.setItem('moki.modo', 'reto'); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${url}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async ([seed, bot]) => {
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, orig = sc.update.bind(sc), ci = sc.cinta;
    const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); return c; };
    const sol = (a, b) => a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom;
    const r = { chips: [], cuadros: 0, gris: 0, sobreMoki: 0, sobrePildora: 0, letraMin: 1e9, tintaMin: 1e9 };
    let act = null, tira = [], tiraUlt = -1e9, tiraHecha = false;
    sc.update = (a, b) => {
      const ret = orig(a, b);
      const av = ci.aviso;
      if (!av.visible) { if (act) { act = null; if (tira.length) tiraHecha = true; } return ret; }
      const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView;
      const txt = av.list.find((c) => c.type === 'Text');
      if (!act) { act = { t: Math.round(sc.t), texto: txt.text, grande: !!ci.grande, cuadros: 0, gris: 0, letra: null, tinta: null }; r.chips.push(act); }
      act.cuadros++; r.cuadros++;
      if (av.alpha > 0.05 && av.alpha < 0.95) act.gris++, r.gris++;
      const cb = av.getBounds(); // solo mide el texto; la píldora de papel suma ~12 px de relleno a cada lado
      const caja = { x: cb.x - 12 * av.scaleX, y: cb.y - 10 * av.scaleY, right: cb.right + 12 * av.scaleX, bottom: cb.bottom + 10 * av.scaleY };
      const pz = sc.poses && sc.poses.sprite && sc.poses.sprite.visible ? sc.poses.sprite : sc.rig.container;
      const mb = pz.getBounds(); let pxMoki = 0;
      if (sol(caja, mb) && pz.type === 'Image') { // pixeles opacos de Moki bajo la caja del chip (muestreo cada 2 px de mundo)
        const M = pz.getWorldTransformMatrix(), tmp = { x: 0, y: 0 };
        for (let yy = Math.max(caja.y, mb.y); yy < Math.min(caja.bottom, mb.bottom); yy += 2) for (let xx = Math.max(caja.x, mb.x); xx < Math.min(caja.right, mb.right); xx += 2) {
          M.applyInverse(xx, yy, tmp); const lx = tmp.x + pz.displayOriginX, ly = tmp.y + pz.displayOriginY;
          if (lx >= 0 && ly >= 0 && lx < pz.width && ly < pz.height && sc.textures.getPixelAlpha(lx | 0, ly | 0, pz.texture.key, pz.frame.name) > 40) pxMoki++;
        }
      }
      if (pxMoki > 0) r.pxMoki = (r.pxMoki || 0) + pxMoki, act.pxMoki = (act.pxMoki || 0) + pxMoki;
      if (pxMoki > 0) { r.sobreMoki++; const R = (o) => [Math.round(o.x), Math.round(o.y), Math.round(o.right), Math.round(o.bottom)]; if (!r.foto) r.foto = { chip: R(caja), moki: R(mb), quien: pz.type, t: Math.round(sc.t) }; }
      if (sc.pago && sc.pago.visible && sc.pago.alpha > 0.02 && sol(caja, sc.pago.getBounds())) r.sobrePildora++;
      const lleno = Math.abs(av.scaleY - av.scaleX) < 1e-6;
      if (lleno && act.d == null) { // P39b: distancia al casco al nacer, en px de pantalla
        const hx = sc.px, hy = sc.y - 112;
        const gx = Math.max(0, caja.x - hx, hx - caja.right) * z, gy = Math.max(0, caja.y - hy, hy - caja.bottom) * z;
        const cx = (caja.x + caja.right) / 2, cy = (caja.y + caja.bottom) / 2;
        act.gx = Math.round(gx); act.gy = Math.round(gy); act.d = Math.round(Math.hypot(cx - hx, cy - hy) * z);
        act.encima = ci.avisoEncima !== undefined ? !!ci.avisoEncima : !ci.grande; act.alto = Math.round((caja.bottom - caja.y) * z);
      }
      if (lleno) {
        const letra = Math.round(22 * av.scaleY * z * 10) / 10;
        act.letra = act.letra == null ? letra : Math.min(act.letra, letra);
        r.letraMin = Math.min(r.letraMin, letra);
        if (act.tinta == null) { // un recorte por chip: filas con pixeles de tinta (#22211F) dentro de la caja del texto
          const c = pinta(), g = c.getContext('2d');
          const x0 = Math.max(0, Math.floor((cb.x - v.x) * z)), y0 = Math.max(0, Math.floor((cb.y - v.y) * z));
          const w = Math.min(c.width - x0, Math.ceil(cb.width * z)), h = Math.min(c.height - y0, Math.ceil(cb.height * z));
          if (w > 2 && h > 2) {
            const d = g.getImageData(x0, y0, w, h).data; let top = -1, bot = -1;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 90) { if (top < 0) top = y; bot = y; break; } }
            act.tinta = top < 0 ? 0 : bot - top + 1; r.tintaMin = Math.min(r.tintaMin, act.tinta);
          }
        }
      }
      if (!tiraHecha && sc.t - tiraUlt >= 66 && tira.length < 12) { tiraUlt = sc.t; tira.push(pinta()); }
      return ret;
    };
    await window.__moki.moki.bot(bot, 200, seed);
    sc.update = orig;
    let png = null;
    if (tira.length) {
      const sk = Math.min(1, 420 / cv.width), cw = Math.round(cv.width * sk), ch = Math.round(cv.height * sk), cols = 4, rows = Math.ceil(tira.length / cols);
      const T = document.createElement('canvas'); T.width = cols * cw + (cols + 1) * 4; T.height = rows * ch + (rows + 1) * 4;
      const g = T.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, T.width, T.height);
      tira.forEach((c, i) => g.drawImage(c, 4 + (i % cols) * (cw + 4), 4 + ((i / cols) | 0) * (ch + 4), cw, ch));
      png = T.toDataURL('image/png');
    }
    for (const k of ['letraMin', 'tintaMin']) if (r[k] === 1e9) r[k] = null;
    return { ...r, png };
  }, [seed, bot]);
  const { png, ...res } = r;
  if (png) writeFileSync(`${pre}-tira.png`, Buffer.from(png.split(',')[1], 'base64'));
  writeFileSync(`${pre}.json`, JSON.stringify({ url, tam, seed, bot, ...res, errores }, null, 1));
  const ch = res.chips.filter((c) => !c.grande && c.d != null), med = (k) => { const a = ch.map((c) => c[k]).sort((p, q) => p - q); return a.length ? a[a.length >> 1] : null; };
  console.log(tam, JSON.stringify({ chicos: ch.length, dMed: med('d'), gyMed: med('gy'), gxMed: med('gx'), dMax: ch.length ? Math.max(...ch.map((c) => c.d)) : null, encima: ch.filter((c) => c.encima).length, chips: res.chips.length, cuadros: res.cuadros, gris: res.gris, sobreMoki: res.sobreMoki, sobrePildora: res.sobrePildora, letraMin: res.letraMin, tintaMin: res.tintaMin, errores: errores.length }));
} finally { await browser.close(); }
