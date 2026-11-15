// P47 (15-nov): ¿el botón de sonido (o la pausa) tapa el letrero del checkpoint "Si chocas, sigues aquí" (antes
// "Aprendizaje guardado")? Bot hasta pasar el 1.er checkpoint, y en cada cuadro del letrero visible se cruza la caja en
// pantalla del letrero (caja de papel de hudC, en px de pantalla) con las cajas DOM del sonido y la pausa. Pasa con 0 px encimados.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p47-letrero.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, corridas: [], errores: [] };
try {
  for (const [nombre, modo, seed] of [['libre 1037', 'libre', '1037'], ['reto 2026-11-15', 'reto', '2026-11-15']]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript((modo) => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      localStorage.setItem('moki.tutorial', '1');
      localStorage.setItem('moki.primera', '1');
      localStorage.setItem('moki.modo', modo);
    }, modo);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(String(e).slice(0, 300)));
    await page.goto(`${url}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async (seed) => {
      const sc = window.__moki.scene.scenes[0];
      const cv = sc.game.canvas.getBoundingClientRect();
      const r = { cuadros: 0, encimados: 0, maxPx: 0, texto: null, letrero: null, botones: {} };
      const oB = sc.showBanner.bind(sc);
      let visto = false;
      sc.showBanner = (t, ms) => { r.texto = t; visto = true; return oB(t, ms); };
      const cam = sc.cameras.main;
      const mide = () => {
        if (!visto || sc.hudC.alpha < 0.5 || !sc.hudC.visible) return;
        // la caja de papel es un Graphics (sin getBounds): 40 de alto desde el origen del contenedor y 12 de margen a cada lado del texto
        const tx = sc.hudC.list.find((o) => o.type === 'Text').getBounds();
        const k = sc.hudC.scaleY * cam.zoom;
        const L = { x: cv.left + (tx.x - cam.worldView.x) * cam.zoom - 12 * k, y: cv.top + (sc.hudC.y - cam.worldView.y) * cam.zoom, w: tx.width * cam.zoom + 24 * k, h: 40 * k };
        r.letrero = [L.x, L.y, L.w, L.h].map(Math.round);
        r.cuadros++;
        let peor = 0;
        for (const [k, e] of Object.entries({ sonido: sc.ui.state.soundBtn, pausa: sc.ui.state.pauseBtn })) {
          if (!e || !e.isConnected) continue;
          const q = e.getBoundingClientRect();
          r.botones[k] = [q.left, q.top, q.width, q.height].map(Math.round);
          const ix = Math.max(0, Math.min(L.x + L.w, q.right) - Math.max(L.x, q.left));
          const iy = Math.max(0, Math.min(L.y + L.h, q.bottom) - Math.max(L.y, q.top));
          peor = Math.max(peor, Math.min(ix, iy));
        }
        if (peor > 0) r.encimados++;
        r.maxPx = Math.max(r.maxPx, Math.round(peor));
      };
      const oU = sc.update.bind(sc);
      sc.update = (...a) => { const x = oU(...a); mide(); return x; };
      await window.__moki.moki.bot('adjust', 75, seed);
      sc.update = oU;
      return r;
    }, seed);
    out.corridas.push({ nombre, ...r });
    console.log(nombre, JSON.stringify(r));
    await ctx.close();
  }
  out.veredicto = { cuadros: out.corridas.reduce((a, x) => a + x.cuadros, 0), encimados: out.corridas.reduce((a, x) => a + x.encimados, 0), consola: out.errores.length };
  out.veredicto.ok = out.veredicto.cuadros > 0 && out.veredicto.encimados === 0 && out.veredicto.consola === 0;
  console.log('veredicto', JSON.stringify(out.veredicto));
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
