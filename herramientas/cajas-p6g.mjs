// Cajas P6g: ¿algo tapa al Moki lejano DURANTE su tropiezo? Headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/cajas-p6g.mjs <url-base> <salida.json> <ancho>x<alto> <semilla> [<semilla> ...]
// Nivel 1, modo dios, ?seed=S. Sigue al Moki que tropieza (m.tr) y, cada 0.05 s de SU reloj desde que se traba hasta 0.2 s después de
// levantarse, congela el juego y mide en el lienzo pintado:
//   A = pixeles que cambian al esconder a Moki y su sombra con todo pintado (lo que el jugador ve de él)
//   B = lo mismo escondiendo además todo lo que va encima de él (depth > la suya: capa medio con pinos y postes, jugador, suelo, HUD)
//   tapado = B - A en px (0 = nada lo tapa). caja = caja de B en px de pantalla. Lista qué objetos tapan (los que, escondidos solos, suben A).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida, tam, ...semillas] = process.argv.slice(2);
const [width, height] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = { tam, corridas: [], errores: [] };
try {
  for (const seed of semillas) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      for (const a of ['moki.primera', 'moki.tutorial', 'moki.done']) localStorage.setItem(a, '1');
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${seed} ${e}`));
    page.on('console', (m) => m.type() === 'error' && !/403|NetworkError/.test(m.text()) && out.errores.push(`${seed} ${m.text()}`));
    await page.goto(`${base}/?debug&god&seed=${seed}`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => { const s = window.__moki?.scene?.scenes[0]; return s && s.screen === 'play'; }, null, { timeout: 40000 });
    await page.evaluate(() => {
      const s = window.__moki.scene.scenes[0];
      window.__tp = 0;
      s.events.on('postupdate', (_t, d) => { if (s.screen === 'play') window.__tp += Math.min(d, 50) / 1000; });
    });
    // espera al que tropieza (el segundo nace a los 12 s de partida)
    await page.waitForFunction(() => { const m = window.__moki.scene.scenes[0].vida?.m(); return m && m.tr; }, null, { timeout: 60000, polling: 'raf' });
    const vb = await page.evaluate(() => /^vb/.test(window.__moki.scene.scenes[0].vida.m().im.texture.key));
    const sorteo = await page.evaluate(() => window.__sorteo || null);
    const z0 = vb ? 0.3 : 1.9;
    const fin = z0 + 0.1 + (vb ? 0.86 : 1.06) + 0.2;
    const muestras = [];
    for (let mt = z0; mt <= fin + 1e-6; mt += 0.05) {
      const ok = await page.waitForFunction((mt) => { const m = window.__moki.scene.scenes[0].vida.m(); return !m || m.t >= mt; }, mt, { timeout: 30000, polling: 'raf' }).then(() => true, () => false);
      if (!ok) break;
      const r = await page.evaluate(async (U) => {
        const g = window.__moki;
        const s = g.scene.scenes[0];
        const R = g.renderer;
        const m = s.vida.m();
        if (!m) return null;
        g.loop.sleep();
        const foto = () => new Promise((res) => {
          R.snapshot((img) => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const x = c.getContext('2d');
            x.drawImage(img, 0, 0);
            res(x.getImageData(0, 0, c.width, c.height));
          });
          R.preRender();
          g.scene.render(R);
          R.postRender();
        });
        const dif = (a, b) => {
          let n = 0, y0 = 1e9, y1 = -1, x0 = 1e9, x1 = -1;
          const W = a.width;
          for (let i = 0; i < a.data.length; i += 4) {
            if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 24) {
              const p = i / 4, y = (p / W) | 0, x = p % W;
              n++;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
            }
          }
          return { n, caja: y1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1] };
        };
        const quita = async (lista) => {
          const v = lista.map((o) => o.visible);
          lista.forEach((o) => o.setVisible(false));
          const con = await foto();
          m.im.setVisible(false), m.sb.setVisible(false);
          const sin = await foto();
          m.im.setVisible(true), m.sb.setVisible(true);
          lista.forEach((o, i) => o.setVisible(v[i]));
          return dif(con, sin);
        };
        // la luz de la tarde (s.light, depth 30) y el grano de papel (4.95) van en MULTIPLY: tiñen todo pero no tapan, no cuentan
        const enc = s.children.list.filter((o) => o.visible && o.depth > m.im.depth && o !== m.im && o !== m.sb && o.blendMode !== 2);
        const A = await quita([]);
        const B = await quita(enc);
        const tapan = [];
        if (B.n - A.n > U) for (const o of enc) {
          const a1 = await quita([o]);
          if (a1.n - A.n > U) tapan.push(`${o.type}:${o.texture ? o.texture.key : ''}@${o.depth} +${a1.n - A.n}`);
        }
        g.loop.wake();
        return { t: +m.t.toFixed(2), tp: +window.__tp.toFixed(2), pose: `${m.im.texture.key}#${m.im.frame.name}`, alfa: +m.im.alpha.toFixed(2), x: Math.round(m.x), A: A.n, B: B.n, tapado: B.n - A.n, caja: B.caja, tapan };
      }, +(process.env.UMBRAL ?? 4));
      if (!r) break;
      muestras.push(r);
    }
    const enV = muestras.filter((q) => q.t <= fin + 0.05); // solo la ventana del tropiezo; si la máquina se traba, el muestreo se pasa
    const hueco = +Math.max(0, ...enV.map((q, i) => (i ? q.t - enV[i - 1].t : q.t - z0))).toFixed(2);
    const peor = enV.reduce((a, q) => Math.max(a, q.tapado), 0);
    const resumen = { seed, vb, sorteo, muestras: enV.length, hueco, tpVentana: muestras.length ? [muestras[0].tp, muestras.at(-1).tp] : null, tapadoMax: peor, conTapado: enV.filter((q) => q.tapado > 4).length, tapan: [...new Set(enV.flatMap((q) => q.tapan))], cajaB: muestras.length ? muestras[Math.floor(muestras.length / 2)].caja : null };
    console.log(JSON.stringify(resumen));
    out.corridas.push({ resumen, muestras });
    await ctx.close();
  }
} finally {
  await browser.close();
  writeFileSync(salida, JSON.stringify(out, null, 1));
  console.log('errores', out.errores.length, out.errores.slice(0, 5));
}
