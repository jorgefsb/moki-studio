// P4u (constructor, 13-nov): copia de ciego-p37 con muestreo fino (paso ms, def 40) centrado en el aterrizaje del despegue n:
// 3 cuadros antes del contacto y 9 después; anota pose y cuadro de cada recorte (agachados = pose-land 0-1).
// Uso: flock /tmp/moki-pesado.lock node herramientas/ciego-p4u.mjs <url> <WxH> <salida.png> [n despegue, def 3] [paso ms, def 40; los pasos de juego son de 16.7 ms: 33 da 33 ms y 40 da 50 ms]
// Base: P37 ciego EN MOVIMIENTO (probador, 13-nov): tira de 12 cuadros desde justo antes del 3er despegue (bot adjust, semilla fija), cada 90 ms de juego,
// recorte alrededor de Moki (con piso). Cubre correr->saltar->caer->aterrizar agachado->correr. Misma jugada en rama y master.
// Uso: flock /tmp/moki-pesado.lock node herramientas/ciego-p37.mjs <url> <WxH> <salida.png> [n despegue, def 3]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, out, nd = '3', pasoArg = '40'] = process.argv.slice(2);
const PASO = +pasoArg;
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = []; let meta = null;
const PRE = (o) => {
  let a = 12345;
  Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1'); localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(PRE, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': '2' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${url}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForFunction(() => window.__moki.scene.scenes[0].poses, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const r = await page.evaluate(async ([nd, PASO]) => {
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
    const g2 = c2.getContext('2d', { willReadFrequently: true });
    const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); g2.clearRect(0, 0, c2.width, c2.height); g2.drawImage(cv, 0, 0); };
    const gw = Math.min(cv.width, 380), gh = Math.min(cv.height, 300);
    let desp = 0, lastTake = -1, t0 = null, ult = -1e9, land = null, fin = null; const buf = []; const orig = sc.update.bind(sc);
    sc.update = (a, b) => {
      const rr = orig(a, b);
      if (sc.takeoffAt !== lastTake && sc.takeoffAt > 0 && sc.screen === 'play') { lastTake = sc.takeoffAt; desp++; if (desp === +nd) t0 = sc.t; }
      if (t0 !== null && land === null && sc.grounded && sc.landAt > t0) { land = sc.landAt; fin = 1e12; }
      if (t0 !== null && (fin === null || sc.t <= fin) && sc.t - ult >= PASO) {
        ult = sc.t; pinta();
        const cam = sc.cameras.main, wv = cam.worldView, z = cam.zoom || 1, mc = sc.rig.container;
        const mx = ((mc.x - wv.x) * z) * (cv.width / cam.width), my = ((mc.y - wv.y) * z) * (cv.height / cam.height);
        const gx = Math.max(0, Math.min(cv.width - gw, Math.round(mx - gw * 0.4))), gy = Math.max(0, Math.min(cv.height - gh, Math.round(my - gh * 0.8)));
        const cc = document.createElement('canvas'); cc.width = gw; cc.height = gh; cc.getContext('2d').drawImage(c2, gx, gy, gw, gh, 0, 0, gw, gh);
        const P = sc.poses; buf.push({ cc, t: sc.t, pose: P && P.sprite.visible ? P.pose + ':' + P.sprite.frame.name : 'titere' });
        if (buf.length > 40 && land === null) buf.shift();
        if (land !== null && buf.filter((b) => b.t >= land).length >= 9) fin = sc.t;
      }
      return rr;
    };
    const res = await window.__moki.moki.bot('adjust', 40, null);
    sc.update = orig;
    const i0 = buf.findIndex((b) => land !== null && b.t >= land);
    const sel = i0 < 0 ? [] : buf.slice(Math.max(0, i0 - 3), Math.max(0, i0 - 3) + 12);
    const crops = sel.map((b) => b.cc);
    const info = sel.map((b) => ({ dt: Math.round(b.t - land), pose: b.pose }));
    const agachados = info.filter((x) => /^pose-land:[01]$/.test(x.pose)).length;
    if (crops.length < 12) return { n: crops.length, desp, land, info, res: { result: res.result } };
    const cols = 3, rows = 4, pad = 4, T = document.createElement('canvas'); T.width = cols * gw + 4 * pad; T.height = rows * gh + 5 * pad;
    const gt = T.getContext('2d'); gt.fillStyle = '#888'; gt.fillRect(0, 0, T.width, T.height);
    crops.forEach((c, i) => gt.drawImage(c, pad + (i % cols) * (gw + pad), pad + ((i / cols) | 0) * (gh + pad)));
    return { n: 12, desp, paso: PASO, agachados, info, res: { result: res.result }, png: T.toDataURL('image/png') };
  }, [nd, PASO]);
  if (r.png) writeFileSync(out, Buffer.from(r.png.split(',')[1], 'base64'));
  meta = { ...r, png: undefined };
  await ctx.close();
} catch (e) { errores.push('script: ' + e); }
await browser.close();
console.log(JSON.stringify(meta), 'errores', JSON.stringify(errores));
