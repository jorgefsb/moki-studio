// P43c (15-nov): copia de sonda-p40i que además mide izq/der de la píldora con la cámara al pintar (postrender) y cuenta
// 'cortes' = cuadros con el papel a menos de 8 px del borde izquierdo o derecho del lienzo (izqR/derR).
// OJO: el bot corre síncrono y no pinta, así que izqR/derR salen null; la cámara del juego es fija (worldView no cambia),
// así que izqMin (modelo) basta. La prueba en pixeles se hizo aparte sobre la tira (ver evidencia/p43c-paso0.md).
// P40i (14-nov): ¿la píldora del pago ("Arriba xN +M", "A ras +M", "+N") aprieta o tapa a Moki? SONDA EN JUEGO, no en tira.
// En cada cuadro con la píldora visible (sc.pago) mide en el lienzo real (no getBounds de Moki: su Image trae relleno):
//  - encima = pixeles opacos de Moki (getPixelAlpha > 40) bajo la caja de papel de la píldora (texto + 12 de relleno + sombra 3/5)
//  - hueco = distancia mínima en px de pantalla entre la caja y el pixel opaco de Moki más cercano (0 si se enciman)
//  - izq = px de pantalla entre la orilla izquierda del papel y el borde del lienzo
// Por píldora: texto, cuadros, cuadros encimados, hueco mínimo, izq mínima. Moki = poses.sprite (Image) o, si no, rig (se avisa).
// Corridas: ?ir=primera (jugador nuevo, adjust y abajo) y ?ir=reto (adjust), más Libre 1037 adjust (x2, x3).
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p40i.mjs <url> <WxH> <salida.json>
const BORDE = Number(process.env.BORDE || 8); // P43d: tope a medir (16 en vertical)
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const CORRIDAS = [
  { nombre: 'primera adjust', q: 'ir=primera', bot: 'adjust', seed: null },
  { nombre: 'primera abajo', q: 'ir=primera', bot: 'abajo', seed: null },
  { nombre: 'reto adjust', q: 'ir=reto', bot: 'adjust', seed: '2026-11-14' },
  { nombre: 'libre 1037 adjust', q: 'ir=libre', bot: 'adjust', seed: '1037' },
];
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, corridas: [], errores: [] };
try {
  for (const c of CORRIDAS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${c.nombre} ${String(e).slice(0, 300)}`));
    page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && out.errores.push(`${c.nombre} ${m.text().slice(0, 300)}`));
    await page.goto(`${url}/?${c.q}&debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async ([bot, seed]) => {
      const sc = window.__moki.scene.scenes[0];
      const r = { pildoras: [], cuadros: 0, encima: 0, huecoMin: null, izqMin: null, sinImage: 0 };
      let act = null, ult = null;
      r.cortes = 0; r.izqRMin = null; r.derRMin = null;
      // P43c: izq/der con la cámara como queda AL PINTAR (postrender), no la del momento de stepPago
      const alPintar = () => {
        if (!ult) return;
        const { caja, a } = ult; ult = null;
        const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView;
        const izq = Math.round((caja.x - v.x) * z * 10) / 10, der = Math.round((v.right - caja.right) * z * 10) / 10;
        a.izqRMin = a.izqRMin == null ? izq : Math.min(a.izqRMin, izq);
        a.derRMin = a.derRMin == null ? der : Math.min(a.derRMin, der);
        r.izqRMin = r.izqRMin == null ? izq : Math.min(r.izqRMin, izq);
        r.derRMin = r.derRMin == null ? der : Math.min(r.derRMin, der);
        if (izq < BORDE || der < BORDE) { a.cortes = (a.cortes || 0) + 1; r.cortes++; if (!r.fotoCorte) r.fotoCorte = { t: Math.round(sc.t), texto: a.texto, izq, der, z: Math.round(z * 1000) / 1000 }; }
      };
      sc.game.events.on('postrender', alPintar);
      const oStep = sc.stepPago.bind(sc);
      sc.stepPago = (dt) => {
        const ret = oStep(dt);
        const p = sc.pago;
        if (!p || !p.visible || p.alpha < 0.02) { act = null; return ret; }
        const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView;
        const txt = p.list.find((o) => o.type === 'Text');
        const s = p.scaleX, w = txt.width + 24;
        const caja = { x: p.x - (w / 2) * s, right: p.x + (w / 2 + 3) * s, y: p.y, bottom: p.y + 45 * s };
        if (!act || act.texto !== txt.text) { act = { t: Math.round(sc.t), texto: txt.text, cuadros: 0, encima: 0, huecoMin: null, izqMin: null }; r.pildoras.push(act); }
        act.cuadros++; r.cuadros++;
        ult = { caja: { ...caja }, a: act };
        const izq = Math.round((caja.x - v.x) * z * 10) / 10;
        act.izqMin = act.izqMin == null ? izq : Math.min(act.izqMin, izq);
        r.izqMin = r.izqMin == null ? izq : Math.min(r.izqMin, izq);
        const arr = Math.round((caja.y - v.y) * z * 10) / 10; // px de pantalla del papel al borde de arriba
        r.arribaMin = r.arribaMin == null ? arr : Math.min(r.arribaMin, arr);
        r.z = Math.round(z * 1000) / 1000; r.s = Math.round(s * 1000) / 1000;
        const sol = (a, b) => a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom;
        if (sc.hudL.alpha > 0.02 && sol(caja, sc.hudL.getBounds())) r.sobreHud = (r.sobreHud || 0) + 1;
        // Moki = sprite de poses (Image) o, en calma/zanja/meta, el títere (contenedor de Images): se miden todas sus piezas
        const poses = sc.poses && sc.poses.sprite && sc.poses.sprite.visible && sc.poses.sprite.type === 'Image';
        const piezas = [];
        const junta = (o) => { if (!o.visible) return; if (o.type === 'Image') piezas.push(o); else if (o.list) o.list.forEach(junta); };
        if (poses) piezas.push(sc.poses.sprite); else { r.sinImage++; junta(sc.rig.container); }
        const M0 = 80 / z; // solo pixeles de Moki a menos de 80 px de pantalla de la caja
        let px = 0, d2 = Infinity, mb0 = null;
        const tmp = { x: 0, y: 0 }, vistos = new Set();
        for (const pz of piezas) {
          const mb = pz.getBounds(), M = pz.getWorldTransformMatrix();
          mb0 = mb0 ? { x: Math.min(mb0.x, mb.x), y: Math.min(mb0.y, mb.y), right: Math.max(mb0.right, mb.right), bottom: Math.max(mb0.bottom, mb.bottom) } : { x: mb.x, y: mb.y, right: mb.right, bottom: mb.bottom };
          const x0 = Math.max(mb.x, caja.x - M0), x1 = Math.min(mb.right, caja.right + M0), y0 = Math.max(mb.y, caja.y - M0), y1 = Math.min(mb.bottom, caja.bottom + M0);
          for (let yy = Math.floor(y0 / 1.5) * 1.5; yy < y1; yy += 1.5) for (let xx = Math.floor(x0 / 1.5) * 1.5; xx < x1; xx += 1.5) {
            M.applyInverse(xx, yy, tmp); const lx = tmp.x + pz.displayOriginX, ly = tmp.y + pz.displayOriginY;
            if (lx < 0 || ly < 0 || lx >= pz.width || ly >= pz.height) continue;
            if (sc.textures.getPixelAlpha(lx | 0, ly | 0, pz.texture.key, pz.frame.name) <= 40) continue;
            const dx = Math.max(caja.x - xx, 0, xx - caja.right), dy = Math.max(caja.y - yy, 0, yy - caja.bottom);
            const key = xx * 100000 + yy;
            if (dx === 0 && dy === 0 && !vistos.has(key)) { vistos.add(key); px++; }
            d2 = Math.min(d2, dx * dx + dy * dy);
          }
        }
        const mb = mb0 || { x: 0, y: 0, right: 0, bottom: 0 };
        const hueco = d2 === Infinity ? null : Math.round(Math.sqrt(d2) * z * 10) / 10;
        if (px > 0) { act.encima++; r.encima++; if (!r.foto) r.foto = { t: Math.round(sc.t), texto: txt.text, px, caja: [caja.x, caja.y, caja.right, caja.bottom].map(Math.round), moki: [mb.x, mb.y, mb.right, mb.bottom].map(Math.round) }; }
        if (hueco != null) { act.huecoMin = act.huecoMin == null ? hueco : Math.min(act.huecoMin, hueco); r.huecoMin = r.huecoMin == null ? hueco : Math.min(r.huecoMin, hueco); }
        return ret;
      };
      await window.__moki.moki.bot(bot, 200, seed);
      sc.stepPago = oStep;
      sc.game.events.off('postrender', alPintar);
      return r;
    }, [c.bot, c.seed]);
    out.corridas.push({ ...c, ...r });
    console.log(tam, c.nombre, JSON.stringify({ pildoras: r.pildoras.length, cuadros: r.cuadros, encima: r.encima, huecoMin: r.huecoMin, izqMin: r.izqMin, izqRMin: r.izqRMin, derRMin: r.derRMin, cortes: r.cortes, arribaMin: r.arribaMin, sobreHud: r.sobreHud || 0, z: r.z, s: r.s, sinImage: r.sinImage }));
    await ctx.close();
  }
} finally { await browser.close(); }
writeFileSync(salida, JSON.stringify(out, null, 1));
console.log('errores', out.errores.length);
