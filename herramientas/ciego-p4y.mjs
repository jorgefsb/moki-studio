// P4y ciego EN MOVIMIENTO: misma jugada sembrada en master y rama (60 fps con sys.step, god, Clásico, juice Mucho).
// 2.5 s a 30 fps: toque, mantenido, toque. Guarda los 75 cuadros recortados alrededor de Moki (con piso) en <dir>/f000.png...
// y una tira de 8 cuadros cada 33 ms alrededor del contacto del mantenido (<dir>/tira.png). El mp4 se arma con ffmpeg aparte.
// Uso: flock /tmp/moki-pesado.lock node herramientas/ciego-p4y.mjs <url> <WxH> <dir>
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, dir] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const PRE = (o) => {
  let a = 12345;
  Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1'); localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
let meta = null;
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(PRE, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': '2' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${url}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene.scenes[0].poses, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const sc = window.__moki.scene.scenes[0];
    sc.startGame(); sc.god = true; sc.tut = { stage: 4, state: 'off' }; sc.game.loop.sleep();
    const dt = 1000 / 60; let tt = performance.now();
    const step = () => ((tt += dt), sc.sys.step(tt, dt));
    const cv = sc.game.canvas;
    const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); };
    const gw = Math.min(cv.width, 380), gh = Math.min(cv.height, 300);
    while (sc.t < 1500) step();
    // guion en pasos de 60 fps: [paso de press, duración ms]
    const guion = [[6, 16], [48, 400], [105, 16]];
    const frames = []; let land = null, tPress = null;
    for (let i = 0; i < 150; i++) {
      for (const [p, ms] of guion) if (i === p) { sc.press(); sc.__suelta = sc.t + ms; if (ms > 100) tPress = sc.t; }
      if (sc.__suelta && sc.t >= sc.__suelta) { sc.release(); sc.__suelta = 0; }
      step();
      if (tPress !== null && land === null && !sc.__suelta && sc.grounded && sc.landAt > tPress) land = sc.landAt;
      if (i % 2 === 1) {
        pinta();
        const cam = sc.cameras.main, wv = cam.worldView, z = cam.zoom || 1;
        const mx = (sc.px - wv.x) * z, gy0 = (sc.mokiShadow.y - wv.y) * z;
        const gx = Math.max(0, Math.min(cv.width - gw, Math.round(mx - gw * 0.4))), gy = Math.max(0, Math.min(cv.height - gh, Math.round(gy0 - gh * 0.8)));
        const cc = document.createElement('canvas'); cc.width = gw; cc.height = gh; cc.getContext('2d').drawImage(cv, gx, gy, gw, gh, 0, 0, gw, gh);
        frames.push({ t: sc.t, url: cc.toDataURL('image/png'), cc });
      }
    }
    const i0 = frames.findIndex((f) => f.t >= land);
    const sel = frames.slice(Math.max(0, i0 - 5), Math.max(0, i0 - 5) + 8);
    const pad = 4, cols = 4, T = document.createElement('canvas'); T.width = cols * gw + 5 * pad; T.height = 2 * gh + 3 * pad;
    const gt = T.getContext('2d'); gt.fillStyle = '#888'; gt.fillRect(0, 0, T.width, T.height);
    sel.forEach((f, i) => gt.drawImage(f.cc, pad + (i % cols) * (gw + pad), pad + ((i / cols) | 0) * (gh + pad)));
    return { frames: frames.map((f) => f.url), tira: T.toDataURL('image/png'), tiraDt: sel.map((f) => Math.round(f.t - land)), land };
  });
  r.frames.forEach((u, i) => writeFileSync(`${dir}/f${String(i).padStart(3, '0')}.png`, Buffer.from(u.split(',')[1], 'base64')));
  writeFileSync(`${dir}/tira.png`, Buffer.from(r.tira.split(',')[1], 'base64'));
  meta = { n: r.frames.length, tiraDt: r.tiraDt, land: r.land };
  await ctx.close();
} catch (e) { errores.push('script: ' + e); }
await browser.close();
console.log(JSON.stringify(meta), 'errores', JSON.stringify(errores));
