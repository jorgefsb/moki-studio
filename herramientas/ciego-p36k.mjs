// P36k ciego EN MOVIMIENTO (probador, 13-nov): jugador nuevo (sin localStorage; tutorial saltado como en bots-p36k), bot adjust corre solo;
// 12 cuadros de pantalla completa cada 200 ms de juego desde t=10.5 s (2 s antes de la caja de 12.5 s) hasta ~12.7 s (hoja 4x3, izquierda a derecha y arriba a abajo). Misma jugada en rama y master.
// Uso: flock /tmp/moki-pesado.lock node herramientas/ciego-p36k.mjs <url> <WxH> <prefijo-salida>
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, pre] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.tutorial', '1'); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${url}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const png = await page.evaluate(async () => {
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, orig = sc.update.bind(sc), cap = [], N = 12, t0 = 10500;
    const sc_ = Math.min(1, 480 / cv.width), cw = Math.round(cv.width * sc_), ch = Math.round(cv.height * sc_);
    const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); const c = document.createElement('canvas'); c.width = cw; c.height = ch; c.getContext('2d').drawImage(cv, 0, 0, cw, ch); return c; };
    let ult = -1e9;
    sc.update = (a, b) => { const r = orig(a, b); if (cap.length < N && sc.t >= t0 && sc.t - ult >= 200) { ult = sc.t; cap.push(pinta()); } return r; };
    await window.__moki.moki.bot('adjust', 200, null);
    sc.update = orig;
    if (cap.length < N) return null;
    const cols = 4, rows = 3, T = document.createElement('canvas'); T.width = cols * cw + (cols + 1) * 4; T.height = rows * ch + (rows + 1) * 4;
    const g = T.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, T.width, T.height);
    cap.forEach((c, i) => g.drawImage(c, 4 + (i % cols) * (cw + 4), 4 + ((i / cols) | 0) * (ch + 4)));
    return T.toDataURL('image/png');
  });
  if (!png) throw new Error('faltan cuadros');
  (await import('node:fs')).writeFileSync(`${pre}.png`, Buffer.from(png.split(',')[1], 'base64'));
  console.log('ok', W, H, pre, 'errores', errores.length);
} finally { await browser.close(); }
