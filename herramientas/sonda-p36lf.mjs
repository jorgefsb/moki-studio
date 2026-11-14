// P36l-f (14-nov): puerta de la píldora 'A ras +N' amarrada a Moki. Bot 'abajo' en la 1.ª partida (jugador nuevo, tutorial
// saltado) y en el Reto de la semilla dada. Math.random sembrado igual en rama y master: mismo fondo y misma jugada.
// Cada cuadro con la píldora 'A ras' visible mide en px de pantalla: adelanto en x contra Moki (centro de la píldora - x de
// Moki), subida respecto a Moki, hueco al casco (borde opaco de arriba del sprite, por alfa), monedas tocadas y hueco mínimo
// a ellas, cortada por el borde, gris (fundido) y cuánto vive/está opaca. Además una tira neutra por modo: 8 cuadros cada
// 100 ms desde el cobro (hoja 4x2) en <prefijo>-<modo>.png.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36lf.mjs <url> <WxH> <salida.json> <prefijo-tira> [semilla-reto]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida, pre, seed = '2026-11-14'] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, seed, errores: [], modos: {} };
try {
  for (const modo of ['primera', 'reto']) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript((modo) => {
      const T0 = Date.UTC(2026, 10, 14, 19, 0, 0), p0 = performance.now(), D = Date; window.Date = class extends D { constructor(...q) { super(...(q.length ? q : [T0 + performance.now() - p0])); } static now() { return T0 + performance.now() - p0; } };
      let a = 1234567; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.tutorial', '1');
      if (modo === 'reto') localStorage.setItem('moki.primera', '1'), localStorage.setItem('moki.modo', 'reto');
    }, modo);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(String(e).slice(0, 300)));
    page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && out.errores.push(m.text()));
    await page.goto(`${url}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async (semilla) => {
      const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, orig = sc.update.bind(sc);
      const sk = Math.min(1, 480 / cv.width), cw = Math.round(cv.width * sk), ch = Math.round(cv.height * sk);
      const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); const c = document.createElement('canvas'); c.width = cw; c.height = ch; c.getContext('2d').drawImage(cv, 0, 0, cw, ch); return c; };
      const toca = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
      const dist = (a, b) => Math.hypot(Math.max(0, a.x - b.right, b.x - a.right), Math.max(0, a.y - b.bottom, b.y - a.bottom));
      // borde opaco de arriba de Moki (getBounds trae relleno): fila más alta con alfa en el cuadro de su textura
      const topeOpaco = (s) => {
        if (!s.frame || !s.texture) return s.getBounds().y;
        const f = s.frame, key = s.texture.key, fw = f.cutWidth, fh = f.cutHeight;
        for (let y = 0; y < fh; y += 2) for (let x = 0; x < fw; x += 3) if (sc.textures.getPixelAlpha(x, y, key, f.name) > 40) return s.y - s.displayOriginY * s.scaleY + y * s.scaleY;
        return s.getBounds().y;
      };
      const r = { eventos: 0, cuadros: 0, dxMax: 0, dxMin: 0, subeMax: 0, huecoCascoMin: null, sobreCasco: 0, sobreMoneda: 0, huecoMonedaMin: null, cortada: 0, gris: 0, vidaMs: [], opacaMs: [], textoPx: null, txt: null };
      let act = null, tira = null, cuadros = [];
      sc.update = (a, b) => {
        const ret = orig(a, b);
        const cam = sc.cameras.main, v = cam.worldView, z = cam.zoom;
        const txt = sc.pago && sc.pago.list.find((c) => c.type === 'Text');
        const ras = sc.pago && sc.pago.visible && sc.pago.alpha > 0.02 && txt && /^A ras/.test(txt.text);
        if (ras) {
          if (!act) { act = { t0: sc.t, op: sc.t, rel0: sc.y - sc.pago.y }; r.eventos++; if (!tira) tira = { ult: -1e9 }; }
          r.cuadros++;
          r.txt = txt.text; r.zoom = +z.toFixed(3);
          r.textoPx = Math.round(txt.height * sc.pago.scaleX * z * 10) / 10;
          const tb0 = sc.pago.getBounds(), pw = tb0.width / 2 + 12 * sc.pago.scaleX; // getBounds solo mide el texto: el papel lleva 12 de relleno por lado y mide 40 de alto (+5 de sombra) desde el y del contenedor
          const pb = { x: sc.pago.x - pw, y: sc.pago.y, right: sc.pago.x + pw, bottom: sc.pago.y + 45 * sc.pago.scaleY };
          const dx = Math.round((sc.pago.x - sc.px) * z * 10) / 10;
          r.dxMax = Math.max(r.dxMax, dx); r.dxMin = Math.min(r.dxMin, dx);
          r.subeMax = Math.max(r.subeMax, Math.round(((sc.y - sc.pago.y) - act.rel0) * z * 10) / 10);
          const pz = sc.poses && sc.poses.sprite && sc.poses.sprite.visible ? sc.poses.sprite : sc.rig.container;
          const hc = Math.round((topeOpaco(pz) - pb.bottom) * z * 10) / 10;
          r.huecoCascoMin = r.huecoCascoMin == null ? hc : Math.min(r.huecoCascoMin, hc);
          if (hc < 0) r.sobreCasco++;
          const kb = sc.pickups.filter((k) => k.sprite && k.sprite.visible && !k.taken).map((k) => k.sprite.getBounds());
          const km = sc.pago.depth >= 11 && kb.find((k) => toca(pb, k)); // bajo las monedas (depth < 11) no las tapa: se cuenta aparte
          if (sc.pago.depth < 11 && kb.some((k) => toca(pb, k))) r.monedaEncima = (r.monedaEncima || 0) + 1;
          { // número '+N' tapado: fracción de su caja dentro del círculo de alguna moneda (rejilla 12x6)
            const tb = txt.getBounds(), ctx2 = txt.context, full = ctx2.measureText(txt.text).width, num = ctx2.measureText(txt.text.split(' ').pop()).width;
            const nx0 = tb.right - (tb.width * num) / full, cnt = [0, 0];
            for (let i = 0; i < 12; i++) for (let j = 0; j < 6; j++) { const px = nx0 + ((i + 0.5) * (tb.right - nx0)) / 12, py = tb.y + ((j + 0.5) * tb.height) / 6; cnt[1]++; if (kb.some((k) => Math.hypot(px - k.centerX, py - k.centerY) < k.width / 2)) cnt[0]++; }
            const f = cnt[0] / cnt[1]; r.numTapadoMax = Math.max(r.numTapadoMax || 0, Math.round(f * 100)); if (f > 0.3) r.numTapado30 = (r.numTapado30 || 0) + 1;
          }
          if (km) { r.sobreMoneda++; (r.malos = r.malos || []).length < 8 && r.malos.push({ ms: Math.round(sc.t - act.t0), alpha: +sc.pago.alpha.toFixed(2), pil: [pb.x, pb.y, pb.right, pb.bottom].map((q, i) => Math.round((q - (i % 2 ? v.y : v.x)) * z)), moneda: [km.x, km.y, km.right, km.bottom].map((q, i) => Math.round((q - (i % 2 ? v.y : v.x)) * z)) }); }
          for (const k of kb) { const d = Math.round(dist(pb, k) * z * 10) / 10; r.huecoMonedaMin = r.huecoMonedaMin == null ? d : Math.min(r.huecoMonedaMin, d); }
          const ms = Math.round(sc.t - act.t0), sx = (q, i) => Math.round((q - (i % 2 ? v.y : v.x)) * z);
          if (r.eventos === 1 && (r.mapa = r.mapa || []).length < 6 && ms >= r.mapa.length * 120) r.mapa.push({ ms, pil: [pb.x, pb.y, pb.right, pb.bottom].map(sx), mokiX: Math.round((sc.px - v.x) * z), mokiPies: Math.round((sc.y - v.y) * z), monedas: kb.filter((k) => Math.abs(k.centerX - sc.px) * z < 160).map((k) => [k.x, k.y, k.right, k.bottom].map(sx)) });
          if (pb.x < v.x || pb.right > v.right || pb.y < v.y) r.cortada++;
          if (sc.pago.alpha > 0.05 && sc.pago.alpha < 0.95) r.gris++;
          if (sc.pago.alpha >= 0.95) act.op = sc.t;
          act.fin = sc.t;
        } else if (act) { r.vidaMs.push(Math.round(act.fin - act.t0)); r.opacaMs.push(Math.round(act.op - act.t0)); act = null; }
        if (tira && cuadros.length < 8 && sc.t - tira.ult >= 100) { tira.ult = sc.t; cuadros.push(pinta()); }
        return ret;
      };
      await window.__moki.moki.bot('abajo', 200, semilla);
      sc.update = orig;
      let hoja = null;
      if (cuadros.length) { const c = document.createElement('canvas'); c.width = cw * 4; c.height = ch * 2; const g = c.getContext('2d'); cuadros.forEach((q, i) => g.drawImage(q, (i % 4) * cw, Math.floor(i / 4) * ch)); hoja = c.toDataURL('image/png'); }
      return { r, hoja };
    }, modo === 'reto' ? seed : null);
    out.modos[modo] = r.r;
    if (r.hoja) writeFileSync(`${pre}-${modo}.png`, Buffer.from(r.hoja.split(',')[1], 'base64'));
    await ctx.close();
  }
  console.log(tam, JSON.stringify(out.modos), 'errores', out.errores.length);
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally { await browser.close(); }
