// P36k ciego EN MOVIMIENTO (probador, 13-nov): jugador nuevo (sin localStorage; tutorial saltado como en bots-p36k), bot adjust corre solo;
// 4 cuadros de pantalla completa (hoja 2x2, tiempo de izquierda a derecha y de arriba abajo) cuando s.dist pasa por 3000/3400/3800/4200 (caja de la horquilla en 4000). Misma jugada en rama y master.
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
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, marcas = [3000, 3400, 3800, 4200], cap = [], orig = sc.update.bind(sc);
    const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); return c; };
    sc.update = (a, b) => { const r = orig(a, b); if (cap.length < 4 && sc.dist >= marcas[cap.length]) cap.push(pinta()); return r; };
    await window.__moki.moki.bot('adjust', 200, null);
    sc.update = orig;
    if (cap.length < 4) return null;
    const w = cv.width, h = cv.height, T = document.createElement('canvas'); T.width = w * 2 + 12; T.height = h * 2 + 12;
    const g = T.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, T.width, T.height);
    cap.forEach((c, i) => g.drawImage(c, 4 + (i % 2) * (w + 4), 4 + ((i / 2) | 0) * (h + 4)));
    return T.toDataURL('image/png');
  });
  if (!png) throw new Error('faltan cuadros');
  (await import('node:fs')).writeFileSync(`${pre}.png`, Buffer.from(png.split(',')[1], 'base64'));
  console.log('ok', W, H, pre, 'errores', errores.length);
} finally { await browser.close(); }
