// Chequeo de la banda prohibida del bokeh (ESPEC-SALTO §3). Uso: node herramientas/chequeo-bokeh.mjs <puerto> <salida.json> [--mete] [--clave=hojaAmb]
// --clave cambia qué objetos se revisan, por el inicio del nombre de su textura; por defecto, el bokeh. Por captura, sobre el build, a 375x667 y 1280x720: congela la escena y toma la imagen con círculos, sin ellos y con ellos otra
// vez. Bokeh es lo que cambia al quitarlos y regresa igual al ponerlos; lo que no regresa igual no lo movieron los círculos y se
// reporta aparte como ruido, con su caja. Falla si un píxel de bokeh cae dentro de la banda, si el borde exterior de un círculo la
// toca, si tras 4 intentos sigue habiendo ruido en la banda (no se puede descartar) o si no encontró bokeh (un chequeo ciego no pasa).
// --mete pone un círculo dentro de la banda: tiene que fallar. Sale con 1 si falla.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [port, outPath, ...opciones] = process.argv.slice(2);
const mete = opciones.includes('--mete');
const clave = (opciones.find((o) => o.startsWith('--clave=')) || '--clave=bokeh').slice(8);
const BANDA = [120, 490];
const MUESTRAS = 6;
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = [];
let falla = false;
for (const [width, height] of [[375, 667], [1280, 720]]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    localStorage.clear();
    const kv = { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.modo': 'libre', 'moki.juice': '1', 'moki.cuaderno': JSON.stringify({ v: 2, notas: [], sellos: [] }) };
    for (const [a, b] of Object.entries(kv)) localStorage.setItem(a, b);
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/?debug&god`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.mouse.click(width / 2, height / 2);
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !window.__moki.scene.scenes[0].boceto, null, { timeout: 15000 });
  await page.waitForTimeout(1000); // el alfa ya terminó de subir
  const fila = { tam: `${width}x${height}`, muestras: [] };
  for (let i = 0; i < MUESTRAS; i++) {
    await page.waitForTimeout(2500);
    const geo = await page.evaluate(([meter, banda, cl]) => new Promise((res) => {
      const s = window.__moki.scene.scenes[0];
      s.scene.pause();
      const bk = s.children.list.filter((o) => o.texture && o.texture.key.startsWith(cl));
      if (meter && bk[0]) bk[0].setPosition(s.vw / 2, 300);
      const z = s.zoom;
      const dentro = bk.filter((o) => { const b = o.getBounds(); return b.bottom > banda[0] && b.top < banda[1]; }).length;
      requestAnimationFrame(() => requestAnimationFrame(() => res({ objetos: bk.length, dentro, top: s.top, z, diametrosPx: bk.map((o) => Math.round(o.displayWidth * z)) })));
    }), [mete, BANDA, clave]);
    // Mismo cuadro congelado: si algo fuera de la escena se estaba animando en la banda, se le da tiempo de asentarse y se repite.
    let con;
    let px;
    let queEs = null;
    let intentos = 0;
    do {
      if (intentos) await page.waitForTimeout(1500);
      intentos++;
      con = await page.screenshot();
      await page.evaluate((cl) => new Promise((res) => {
        window.__moki.scene.scenes[0].children.list.filter((o) => o.texture && o.texture.key.startsWith(cl)).forEach((o) => o.setVisible(false));
        requestAnimationFrame(() => requestAnimationFrame(res));
      }), clave);
      const sin = await page.screenshot();
      await page.evaluate((cl) => new Promise((res) => {
        window.__moki.scene.scenes[0].children.list.filter((o) => o.texture && o.texture.key.startsWith(cl)).forEach((o) => o.setVisible(true));
        requestAnimationFrame(() => requestAnimationFrame(res));
      }), clave);
      const otra = await page.screenshot();
      px = await page.evaluate(async ([a, b, c, top, z, banda]) => {
        const lee = async (b64) => {
          const im = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
          const c = new OffscreenCanvas(im.width, im.height);
          const x = c.getContext('2d');
          x.drawImage(im, 0, 0);
          return x.getImageData(0, 0, im.width, im.height);
        };
        const A = await lee(a);
        const B = await lee(b);
        const C = await lee(c);
        let ruido = 0;
        let ruidoEnBanda = 0;
        const caja = [1e9, 1e9, -1, -1];
        let total = 0;
        let enBanda = 0;
        let yMinB = 1e9;
        let yMaxA = -1;
        let yMinD = 1e9;
        const y0 = (banda[0] - top) * z;
        const y1 = (banda[1] - top) * z;
        for (let y = 0; y < A.height; y++)
          for (let x = 0; x < A.width; x++) {
            const i = (y * A.width + x) * 4;
            const dentro = y >= y0 && y < y1;
            if (A.data[i] !== C.data[i] || A.data[i + 1] !== C.data[i + 1] || A.data[i + 2] !== C.data[i + 2]) {
              ruido++;
              if (dentro) ruidoEnBanda++;
              caja[0] = Math.min(caja[0], x);
              caja[1] = Math.min(caja[1], y);
              caja[2] = Math.max(caja[2], x);
              caja[3] = Math.max(caja[3], y);
              continue;
            }
            if (A.data[i] === B.data[i] && A.data[i + 1] === B.data[i + 1] && A.data[i + 2] === B.data[i + 2]) continue;
            total++;
            if (dentro) enBanda++;
            else if (y < y0) yMaxA = Math.max(yMaxA, y);
            else yMinD = Math.min(yMinD, y);
          }
        return { total, enBanda, ruido, ruidoEnBanda, cajaRuido: ruido ? caja : null, bandaPx: [+y0.toFixed(1), +y1.toFixed(1)], ultimoArriba: yMaxA, primeroAbajo: yMinD === 1e9 ? null : yMinD };
      }, [con.toString('base64'), sin.toString('base64'), otra.toString('base64'), geo.top, geo.z, BANDA]);
      if (px.ruido) {
        const [x0, y0, x1, y1] = px.cajaRuido;
        queEs = await page.evaluate(([x, y]) => document.elementsFromPoint(x, y).slice(0, 4).map((e) => `${e.tagName}#${e.id}.${e.className}: ${(e.textContent || '').trim().slice(0, 50)}`), [(x0 + x1) / 2, (y0 + y1) / 2]);
      }
    } while (px.ruidoEnBanda > 0 && intentos < 4);
    if (!mete && i === 0) writeFileSync(outPath.replace('.json', `-${width}.png`), con);
    await page.evaluate(() => {
      const s = window.__moki.scene.scenes[0];
      s.scene.resume();
    });
    const pasa = px.total > 0 && px.enBanda === 0 && px.ruidoEnBanda === 0 && geo.dentro === 0;
    if (!pasa) falla = true;
    fila.muestras.push({ i, pasa, intentos, queEs, ...geo, ...px });
  }
  console.log(JSON.stringify(fila));
  out.push(fila);
  await context.close();
}
await browser.close();
if (outPath) writeFileSync(outPath, JSON.stringify({ falla, mete, out }, null, 1));
console.log(falla ? 'FALLA' : 'PASA');
process.exit(falla ? 1 : 0);
