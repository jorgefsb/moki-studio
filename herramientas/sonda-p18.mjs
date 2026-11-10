// Sonda P18 (capa lejana malva sin gris). Headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p18.mjs <url-base> <salida.json> [modo]
// A 390x844, 660x372 y 1280x720, nivel 1 con la tarde ya entrada (st >= 0.99): congela la escena y, por cada objeto visible del fondo
// entre el cielo y el suelo (profundidad 1.9 a 4.0), lo esconde y mide los píxeles de pantalla que cambian: color medio de ese objeto
// tal como se ve, croma cálido (R-B), luz (luma 0..255) y gris (max-min de RGB; bajo = gris). Solo números, no abre imágenes.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida, modo = 'clasico'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = { modo, casos: [], errores: [] };
try {
  for (const [width, height] of [[390, 844], [660, 372], [1280, 720]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await ctx.addInitScript((m) => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      const kv = { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.modo': m, 'moki.juice': '1' };
      for (const [a, b] of Object.entries(kv)) localStorage.setItem(a, b);
    }, modo);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${width} ${e}`));
    page.on('console', (m) => m.type() === 'error' && out.errores.push(`${width} ${m.text()}`));
    await page.goto(`${base}/?debug&god`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.waitForFunction(() => { const s = window.__moki?.scene?.scenes[0]; return s && s.screen === 'play' && s.ambient && s.ambient.st >= 0.99 && s.capas && !s.capas.cargando; }, null, { timeout: 40000 });
    await page.waitForTimeout(3000);
    const lista = await page.evaluate(() => new Promise((res) => {
      const s = window.__moki.scene.scenes[0];
      s.scene.pause();
      const nombre = (o) => {
        for (const [k, v] of Object.entries(s.capas || {})) if (v === o) return `capas.${k}`;
        return `${o.type}:${(o.texture && o.texture.key) || ''}`;
      };
      const objs = s.children.list.filter((o) => o.visible && o.alpha > 0.01 && o.depth >= 1.9 && o.depth < 4.0);
      window.__p18 = objs;
      requestAnimationFrame(() => requestAnimationFrame(() => res(objs.map((o, i) => ({ i, nombre: nombre(o), depth: o.depth, alfa: +o.alpha.toFixed(3), tinte: o.tintTopLeft !== undefined ? o.tintTopLeft.toString(16) : null })))));
    }));
    const con = (await page.screenshot()).toString('base64');
    const caso = { tam: `${width}x${height}`, objetos: [] };
    for (const it of lista) {
      await page.evaluate((i) => new Promise((res) => { window.__p18[i].setVisible(false); requestAnimationFrame(() => requestAnimationFrame(res)); }), it.i);
      const sin = (await page.screenshot()).toString('base64');
      await page.evaluate((i) => new Promise((res) => { window.__p18[i].setVisible(true); requestAnimationFrame(() => requestAnimationFrame(res)); }), it.i);
      const m = await page.evaluate(async ([a, b]) => {
        const lee = async (b64) => {
          const im = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
          const c = new OffscreenCanvas(im.width, im.height);
          const x = c.getContext('2d');
          x.drawImage(im, 0, 0);
          return x.getImageData(0, 0, im.width, im.height);
        };
        const A = await lee(a);
        const B = await lee(b);
        let n = 0; let ymin = 1e9; let ymax = -1;
        const s = [0, 0, 0];
        for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
          const i = (y * A.width + x) * 4;
          if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) < 6) continue;
          n++; ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
          for (let c = 0; c < 3; c++) s[c] += A.data[i + c];
        }
        if (!n) return { px: 0 };
        const c = s.map((v) => v / n);
        const r1 = (v) => +v.toFixed(1);
        return { px: n, pct: r1((100 * n) / (A.width * A.height)), y: [ymin, ymax], rgb: c.map(Math.round), RB: r1(c[0] - c[2]), luz: r1(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]), croma: r1(Math.max(...c) - Math.min(...c)) };
      }, [con, sin]);
      if (m.px) caso.objetos.push({ ...it, ...m });
    }
    caso.objetos.sort((a, b) => b.px - a.px);
    for (const o of caso.objetos) console.log(caso.tam, JSON.stringify(o));
    out.casos.push(caso);
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify(out, null, 1));
console.log('errores', out.errores.length, out.errores.slice(0, 5));
