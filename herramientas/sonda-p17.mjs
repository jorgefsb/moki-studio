// Sonda P17 (bokeh a 390 sin manchas grises). Headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p17.mjs <url-base> <salida.json> [captura-prefijo]
// A 390x844 y 660x372, con el atardecer ya entrado: congela la escena, toma la imagen con círculos y sin ellos. Por cada círculo
// mide, en los píxeles que cambian al quitarlo, el color compuesto y el fondo: croma cálido (R-B), luz (luma 0..255) y gris
// (max-min de RGB; bajo = gris). Arriba = sobre el cielo, abajo = sobre el suelo. No abre imágenes: solo números.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida, foto] = process.argv.slice(2);
const MUESTRAS = 3;
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = { casos: [], errores: [] };
try {
  for (const [width, height] of [[390, 844], [660, 372]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      const kv = { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.modo': 'libre', 'moki.juice': '1' };
      for (const [a, b] of Object.entries(kv)) localStorage.setItem(a, b);
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${width} ${e}`));
    page.on('console', (m) => m.type() === 'error' && out.errores.push(`${width} ${m.text()}`));
    await page.goto(`${base}/?debug&god`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.waitForFunction(() => window.__moki && window.__moki.scene && window.__moki.scene.scenes[0] && window.__moki.scene.scenes[0].screen === 'play' && window.__moki.scene.scenes[0].bokeh && window.__moki.scene.scenes[0].ambient.st >= 0.99, null, { timeout: 30000 });
    console.log(`${width} estado ${JSON.stringify(await page.evaluate(() => ({ url: location.href, ...window.__moki.debug?.state?.() , st: window.__moki.scene.scenes[0].ambient.st })).catch((e) => String(e)))}`);
    await page.waitForTimeout(1000);
    const caso = { tam: `${width}x${height}`, muestras: [] };
    for (let i = 0; i < MUESTRAS; i++) {
      await page.waitForTimeout(2500);
      const geo = await page.evaluate(() => new Promise((res) => {
        const s = window.__moki.scene.scenes[0];
        s.scene.pause();
        const cam = s.cameras.main;
        const bk = s.children.list.filter((o) => o.texture && o.texture.key === 'bokeh');
        const cajas = bk.map((o) => {
          const b = o.getBounds();
          const q = (s.bokeh || []).find((it) => it.im === o);
          return { x0: (b.left - cam.worldView.x) * s.zoom, y0: (b.top - cam.worldView.y) * s.zoom, x1: (b.right - cam.worldView.x) * s.zoom, y1: (b.bottom - cam.worldView.y) * s.zoom, alfa: +o.alpha.toFixed(3), tinte: o.tintTopLeft.toString(16), arriba: q ? q.z === 0 : null, visible: o.visible };
        });
        requestAnimationFrame(() => requestAnimationFrame(() => res({ objetos: bk.length, cajas })));
      }));
      const con = await page.screenshot();
      if (foto && i === 0) writeFileSync(`${foto}-${width}.png`, con);
      await page.evaluate(() => new Promise((res) => {
        window.__moki.scene.scenes[0].children.list.filter((o) => o.texture && o.texture.key === 'bokeh').forEach((o) => o.setVisible(false));
        requestAnimationFrame(() => requestAnimationFrame(res));
      }));
      const sin = await page.screenshot();
      await page.evaluate(() => new Promise((res) => {
        const s = window.__moki.scene.scenes[0];
        s.children.list.filter((o) => o.texture && o.texture.key === 'bokeh').forEach((o) => o.setVisible(true));
        s.scene.resume();
        requestAnimationFrame(() => requestAnimationFrame(res));
      }));
      const medidas = await page.evaluate(async ([a, b, cajas]) => {
        const lee = async (b64) => {
          const im = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
          const c = new OffscreenCanvas(im.width, im.height);
          const x = c.getContext('2d');
          x.drawImage(im, 0, 0);
          return x.getImageData(0, 0, im.width, im.height);
        };
        const A = await lee(a);
        const B = await lee(b);
        const L = (r, g, bb) => 0.2126 * r + 0.7152 * g + 0.0722 * bb;
        return cajas.map((k) => {
          let n = 0;
          const s = [0, 0, 0, 0, 0, 0];
          for (let y = Math.max(0, Math.floor(k.y0)); y < Math.min(A.height, Math.ceil(k.y1)); y++)
            for (let x = Math.max(0, Math.floor(k.x0)); x < Math.min(A.width, Math.ceil(k.x1)); x++) {
              const i = (y * A.width + x) * 4;
              if (A.data[i] === B.data[i] && A.data[i + 1] === B.data[i + 1] && A.data[i + 2] === B.data[i + 2]) continue;
              n++;
              for (let c = 0; c < 3; c++) {
                s[c] += A.data[i + c];
                s[c + 3] += B.data[i + c];
              }
            }
          if (!n) return { ...k, px: 0 };
          const m = s.map((v) => v / n);
          const con = m.slice(0, 3);
          const fon = m.slice(3);
          const r1 = (v) => +v.toFixed(1);
          return {
            arriba: k.arriba, alfa: k.alfa, tinte: k.tinte, px: n,
            con: con.map(Math.round), fondo: fon.map(Math.round),
            calidoRB: r1(con[0] - con[2]), calidoRBfondo: r1(fon[0] - fon[2]),
            luz: r1(L(...con)), luzFondo: r1(L(...fon)),
            croma: r1(Math.max(...con) - Math.min(...con)), cromaFondo: r1(Math.max(...fon) - Math.min(...fon)),
          };
        });
      }, [con.toString('base64'), sin.toString('base64'), geo.cajas]);
      caso.muestras.push({ i, objetos: geo.objetos, circulos: medidas });
    }
    // resumen por zona, pesado por píxeles
    const zona = (arr) => {
      const t = arr.reduce((a, c) => a + c.px, 0);
      if (!t) return null;
      const p = (f) => +(arr.reduce((a, c) => a + c[f] * c.px, 0) / t).toFixed(1);
      return { px: t, calidoRB: p('calidoRB'), calidoRBfondo: p('calidoRBfondo'), luz: p('luz'), luzFondo: p('luzFondo'), croma: p('croma'), cromaFondo: p('cromaFondo') };
    };
    const todos = caso.muestras.flatMap((m) => m.circulos.filter((c) => c.px));
    caso.resumen = { arriba: zona(todos.filter((c) => c.arriba)), abajo: zona(todos.filter((c) => c.arriba === false)), objetos: caso.muestras.map((m) => m.objetos) };
    console.log(JSON.stringify({ tam: caso.tam, resumen: caso.resumen }));
    out.casos.push(caso);
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify(out, null, 1));
console.log('errores', out.errores.length);
