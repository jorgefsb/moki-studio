// Sonda P6d (Moki lejano que tropieza), hecha de sonda-p22. Headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p6d.mjs <url-base> <salida.json> <ancho>x<alto> <partidas> [segundos] [carpeta-png]
// Mide en tiempos fijos de partida (0-9 cada 0.5 s para comparar el primero con master; 11.8-17 cada 0.2) y guarda PNG en 12.5, 14, 14.8, 15.5.
// Nivel 1, modo dios. Cada ~200 ms de partida congela el juego y mide al Moki lejano EN EL LIENZO PINTADO:
//   A = pixeles que cambian al esconder a Moki (y su sombra) con todo lo demás pintado = lo que el jugador ve de él
//   B = lo mismo con la capa medio escondida = Moki entero
// alto = alto de la caja de A en px de pantalla; vis = A / B (tapado = 1 - vis). El reloj es el de la partida (suma de delta
// con tope de 50 ms en 'play', igual que vida.js), no el de pared: congelar para medir no lo mueve.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida, tam, nStr, segStr, pngDir] = process.argv.slice(2);
const [width, height] = tam.split('x').map(Number);
const N = +nStr || 1;
const SEG = +segStr || 17;
const TIEMPOS = [];
for (let q = 0.5; q <= 9; q += 0.5) TIEMPOS.push(+q.toFixed(2));
for (let q = 11.8; q <= SEG; q += q < 14 ? 0.1 : 0.2) TIEMPOS.push(+q.toFixed(2));
for (const q of [12.4, 12.5, 12.6, 13, 13.5, 14, 14.8, 15.5]) if (!TIEMPOS.some((w) => Math.abs(w - q) < 0.01)) TIEMPOS.push(q);
TIEMPOS.sort((a, b) => a - b);
const PNG = /x844/.test(tam) ? [12.4, 12.6, 13, 13.5] : [12.5, 14, 14.8, 15.5];
if (pngDir) (await import('node:fs')).mkdirSync(pngDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = { tam, partidas: [], errores: [] };
try {
  for (let k = 0; k < N; k++) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      for (const a of ['moki.primera', 'moki.tutorial', 'moki.done']) localStorage.setItem(a, '1');
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${k} ${e}`));
    page.on('console', (m) => m.type() === 'error' && !/403|NetworkError/.test(m.text()) && out.errores.push(`${k} ${m.text()}`));
    await page.goto(`${base}/?debug&god`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => { const s = window.__moki?.scene?.scenes[0]; return s && s.screen === 'play'; }, null, { timeout: 40000 });
    await page.evaluate(() => {
      const s = window.__moki.scene.scenes[0];
      window.__tp = 0;
      s.events.on('postupdate', (_t, d) => { if (s.screen === 'play') window.__tp += Math.min(d, 50) / 1000; });
    });
    const muestras = [];
    for (const meta of TIEMPOS) {
      // espera a la muestra y congela en cuanto el reloj de partida la pasa
      await page.waitForFunction((mt) => window.__tp >= mt, meta, { timeout: 60000, polling: 'raf' });
      const r = await page.evaluate(async ([meta, quierePng]) => {
        const g = window.__moki;
        const s = g.scene.scenes[0];
        const R = g.renderer;
        const o = { meta, t: +window.__tp.toFixed(2), st: s.ambient && +(+s.ambient.st || 0).toFixed(2), activa: !!(s.capas && s.capas.activa) };
        const m = s.vida && s.vida.m();
        const pp = s.vida && s.vida.p();
        if (pp) o.papa = { x: Math.round(pp.x), y: Math.round(pp.y) };
        if (!m) return o;
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
          return { n, alto: y1 < 0 ? 0 : y1 - y0 + 1, caja: y1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1] };
        };
        const med = s.capas && s.capas.medio;
        const v1 = m.im.visible;
        const con = await foto();
        let png = null;
        if (quierePng) {
          const c = document.createElement('canvas');
          c.width = con.width, c.height = con.height;
          c.getContext('2d').putImageData(con, 0, 0);
          png = c.toDataURL('image/png');
        }
        m.im.setVisible(false), m.sb.setVisible(false);
        const sin = await foto();
        let B = null;
        if (med) {
          const mv = med.visible;
          med.setVisible(false);
          const sinMed = await foto();
          m.im.setVisible(v1), m.sb.setVisible(true);
          const conMed = await foto();
          med.setVisible(mv);
          B = dif(conMed, sinMed);
        }
        m.im.setVisible(v1), m.sb.setVisible(true);
        g.loop.wake();
        const A = dif(con, sin);
        o.png = png;
        o.moki = { pose: m.im.texture.key, cuadro: m.im.frame.name, tr: !!m.tr, sbx: +m.sb.scaleX.toFixed(3), x: Math.round(m.x), y: Math.round(m.im.y), alfa: +m.im.alpha.toFixed(2), sx: m.im.scaleX, flip: m.im.flipX || m.im.scaleX < 0, A, B, vis: B && B.n ? +(A.n / B.n).toFixed(2) : null };
        return o;
      }, [meta, PNG.includes(meta)]);
      if (r.png && pngDir) writeFileSync(`${pngDir}/${tam}-p${k}-t${meta}.png`, Buffer.from(r.png.split(',')[1], 'base64'));
      delete r.png;
      muestras.push(r);
    }
    const conM = muestras.filter((q) => q.moki);
    const visibles = conM.filter((q) => q.moki.vis >= 0.5 && q.moki.alfa >= 0.9);
    // racha más larga de muestras seguidas visibles dentro de los primeros 6 s
    let racha = 0, ini = null, mejor = 0;
    for (const q of muestras.filter((q) => q.t <= 6)) {
      if (q.moki && q.moki.vis >= 0.5 && q.moki.alfa >= 0.9) { if (ini === null) ini = q.t; racha = q.t - ini; mejor = Math.max(mejor, racha); } else ini = null;
    }
    const resumen = {
      partida: k,
      st1: (muestras.find((q) => q.st >= 1) || {}).t ?? null,
      activa: (muestras.find((q) => q.activa) || {}).t ?? null,
      mokiNace: conM[0] ? conM[0].t : null,
      primeroVisible: visibles[0] ? visibles[0].t : null,
      altoPintadoMax: conM.length ? Math.max(...conM.map((q) => q.moki.A.alto)) : 0,
      altoEnteroMax: conM.length ? Math.max(...conM.map((q) => (q.moki.B ? q.moki.B.alto : 0))) : 0,
      rachaVisible6s: +mejor.toFixed(1),
      espejo: conM.some((q) => q.moki.flip),
      segundoNace: (conM.find((q) => q.meta >= 11.8) || {}).meta ?? null,
      fases: Object.fromEntries(conM.filter((q) => PNG.includes(q.meta)).map((q) => [q.meta, `${q.moki.pose}#${q.moki.cuadro} alto=${q.moki.A.alto} vis=${q.moki.vis} a=${q.moki.alfa}`])),
      primeros9: conM.filter((q) => q.meta <= 9).map((q) => [q.meta, q.moki.x, q.moki.y, q.moki.pose, q.moki.cuadro, q.moki.A.n]),
      papa9: muestras.filter((q) => q.meta <= 9 && q.papa).map((q) => [q.meta, q.papa.x, q.papa.y]),
    };
    console.log(JSON.stringify(resumen));
    out.partidas.push({ resumen, muestras });
    await ctx.close();
  }
} finally {
  await browser.close();
  writeFileSync(salida, JSON.stringify(out, null, 1));
  console.log('errores', out.errores.length, out.errores.slice(0, 5));
}
