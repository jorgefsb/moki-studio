// P37 paso 0 (probador, 13-nov): mide en pantalla dónde queda la suela de Moki al cambiar de pose (correr->saltar, caer->aterrizar...).
// Por cuadro de juego: pose, cuadro, y la fila de suela (fila sólida más baja de ESE cuadro de la tira, alfa>=128) llevada a pantalla:
//   suelaY = sprite.y + (filaBaja + 1 - 123) * escalaY   (origen en y=123; en mundo) -> px de pantalla con zoom y escala del canvas.
// Reporta suela respecto a la línea de piso (s.y + 2) y el salto de suela entre cuadros consecutivos al cambiar de pose.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p37-pies.mjs <carpeta build> <WxH> <salida.json> [segundos]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [dir, tam, out, seg = '45'] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const sv = createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = join(dir, p);
  if (!existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f));
});
await new Promise((res) => sv.listen(0, '127.0.0.1', res));
const url = `http://127.0.0.1:${sv.address().port}`;
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = []; let meta = null;
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1'); localStorage.clear(); for (const [k, v] of Object.entries({ 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': '2' })) localStorage.setItem(k, v); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${url}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  meta = await page.evaluate(async (seg) => {
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas;
    // fila sólida más baja por cuadro de cada tira
    // fila sólida más baja por cuadro (alfa>=128), de `ludo toolbox sprite metrics <tira> --grid Nx1` (LUDO_TELEMETRY=0), 13-nov
    const baja = { 'pose-run': [123, 121, 121, 121, 122, 121, 121], 'pose-rise': [122, 122, 122, 122, 122], 'pose-fall': [123], 'pose-land': [124, 125, 122, 122, 122, 122] };
    const cam = sc.cameras.main, k = (cam.zoom || 1) * (cv.width / cam.width);
    const filas = []; const orig = sc.update.bind(sc);
    sc.update = (a, b) => {
      const rr = orig(a, b); const P = sc.poses;
      if (P && P.sprite && P.sprite.visible && !sc.dead) {
        const sp = P.sprite, key = sp.texture.key, fr = +sp.frame.name;
        const suelaMundo = sp.y + (baja[key][fr] + 1 - 123) * sp.scaleY;
        filas.push({ t: Math.round(sc.t), key, fr, esc: +sp.scaleY.toFixed(3), baja: baja[key][fr], suelaPx: +(suelaMundo * k).toFixed(2), pisoPx: +((sc.y + 2) * k).toFixed(2), grounded: sc.grounded });
      }
      return rr;
    };
    const res = await window.__moki.moki.bot('adjust', +seg, null);
    sc.update = orig;
    const im = sc.textures.get('pose-run') && sc.textures.get('pose-run').getSourceImage();
    return { k, baja, filas, res: { result: res.result, cause: res.cause }, img: im ? [im.width, im.height, im.constructor.name] : null, poses: !!sc.poses };
  }, seg);
  await ctx.close();
} catch (e) { errores.push('script: ' + e); }
await browser.close(); sv.close();
if (meta) {
  const f = meta.filas, tr = [];
  for (let i = 1; i < f.length; i++) if (f[i].key !== f[i - 1].key) tr.push({ de: `${f[i - 1].key}#${f[i - 1].fr}`, a: `${f[i].key}#${f[i].fr}`, t: f[i].t, saltoSuelaPx: +(f[i].suelaPx - f[i - 1].suelaPx).toFixed(2), saltoPisoPx: +(f[i].pisoPx - f[i - 1].pisoPx).toFixed(2), grounded: [f[i - 1].grounded, f[i].grounded] });
  meta.transiciones = tr; writeFileSync(out, JSON.stringify(meta));
  console.log('res', JSON.stringify(meta.res), 'img', JSON.stringify(meta.img), 'poses', meta.poses, 'cuadros', f.length, 'k', meta.k.toFixed(3), 'baja', JSON.stringify(meta.baja), 'transiciones', tr.length);
}
console.log('errores', JSON.stringify(errores));
