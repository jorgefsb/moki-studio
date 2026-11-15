// P42c extra (director): ¿algún pino/poste de la capa media queda DETRÁS de la píldora del pago (vista 486 a 390)?
// En cada cuadro con la píldora visible cuenta pixeles opacos de pino (getPixelAlpha>40, alfa efectivo>0.1) bajo la caja de papel
// de la píldora (texto+12 de relleno+sombra 3/5), en px de pantalla. Corridas como sonda-p40i. Guarda una foto del primer cuadro con encimado.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p42c-pinos.mjs <url> <WxH> <salida.json> [carpetaFotos]
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, writeFileSync as wf } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida, fotos] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
if (fotos) mkdirSync(fotos, { recursive: true });
const CORRIDAS = [
  { nombre: 'primera adjust', q: 'ir=primera', bot: 'adjust', seed: null },
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
    // Para la foto: al primer cuadro con encimado, pausa el trabajo del bot no es posible; se marca la bandera y se captura aparte
    const r = await page.evaluate(async ([bot, seed]) => {
      const sc = window.__moki.scene.scenes[0];
      const r = { pildoras: 0, cuadros: 0, conPino: 0, pxMax: 0, ejemplo: null, z: null };
      let act = null;
      const oStep = sc.stepPago.bind(sc);
      sc.stepPago = (dt) => {
        const ret = oStep(dt);
        const p = sc.pago;
        if (!p || !p.visible || p.alpha < 0.02) { act = null; return ret; }
        const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView;
        const txt = p.list.find((o) => o.type === 'Text');
        if (!act || act.texto !== txt.text) { act = { texto: txt.text }; r.pildoras++; }
        r.cuadros++; r.z = Math.round(z * 1000) / 1000;
        const s = p.scaleX, w = txt.width + 24;
        const caja = { x: p.x - (w / 2) * s, right: p.x + (w / 2 + 3) * s, y: p.y, bottom: p.y + 45 * s };
        // caja a px de pantalla (la píldora vive en mundo, sf 1)
        const aPant = (x, y, sf) => [(x - cam.scrollX * sf - cam.width / 2) * z + cam.width / 2, (y - cam.scrollY * sf - cam.height / 2) * z + cam.height / 2];
        const [bx0, by0] = aPant(caja.x, caja.y, p.scrollFactorX), [bx1, by1] = aPant(caja.right, caja.bottom, p.scrollFactorX);
        let px = 0;
        const pool = (sc.midPool || []).slice(0, sc.midPoolN || 0);
        for (const q of pool) {
          const o = q.body;
          if (!o.visible || o.alpha < 0.1) continue;
          const M = o.getWorldTransformMatrix(), tmp = { x: 0, y: 0 };
          for (let sy = Math.floor(by0); sy < by1; sy += 2) for (let sx = Math.floor(bx0); sx < bx1; sx += 2) {
            const wx = (sx - cam.width / 2) / z + cam.width / 2 + cam.scrollX * o.scrollFactorX;
            const wy = (sy - cam.height / 2) / z + cam.height / 2 + cam.scrollY * o.scrollFactorY;
            M.applyInverse(wx, wy, tmp);
            const lx = tmp.x + o.displayOriginX, ly = tmp.y + o.displayOriginY;
            if (lx < 0 || ly < 0 || lx >= o.width || ly >= o.height) continue;
            if (sc.textures.getPixelAlpha(lx | 0, ly | 0, o.texture.key, o.frame.name) > 40) px++;
          }
        }
        if (px > 0) { r.conPino++; r.pxMax = Math.max(r.pxMax, px); if (!r.ejemplo) { r.ejemplo = { t: Math.round(sc.t), texto: txt.text, px, caja: [bx0, by0, bx1, by1].map(Math.round) }; window.__ejemploPino = true; } }
        return ret;
      };
      await window.__moki.moki.bot(bot, 200, seed);
      sc.stepPago = oStep;
      return r;
    }, [c.bot, c.seed]);
    out.corridas.push({ ...c, ...r });
    console.log(tam, c.nombre, JSON.stringify({ pildoras: r.pildoras, cuadros: r.cuadros, conPino: r.conPino, pxMax: r.pxMax, z: r.z, ejemplo: r.ejemplo }));
    await ctx.close();
  }
} finally { await browser.close(); }
writeFileSync(salida, JSON.stringify(out, null, 1));
console.log('errores', out.errores.length);
