// P49: tira para el ARTE (sin ciego de cuadros sueltos): N cuadros SEGUIDOS del borde derecho del lienzo al arrancar la
// partida (cuando lo que ya cabe en pantalla entra con su pop), uno debajo de otro. Una columna por versión.
// Uso: flock /tmp/moki-pesado.lock node herramientas/tira-p49.mjs <url-izq> <url-der> <WxH> <q> <salida.png> [N=6] [desde=0]
//   q: '&ir=mega2' (x2.0), '&nivel=clasico' (base). desde: cuadros a saltar desde el primero con piezas en pantalla.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [uA, uB, tam, q, salida, nArg, desdeArg] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const N = +(nArg || 6), DESDE = +(desdeArg || 0);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const cols = [];
try {
  for (const url of [uA, uB]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.tutorial', '1'); localStorage.setItem('moki.primera', '1'); });
    const page = await ctx.newPage();
    await page.goto(`${url}/?debug${q}`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const data = await page.evaluate(async ([N, DESDE]) => {
      const sc = window.__moki.scene.scenes[0];
      const cv = sc.game.canvas;
      const fx = Math.round(cv.width * 0.55); // franja derecha: 45 % del ancho
      const caps = [];
      let salta = DESDE;
      const oU = sc.update.bind(sc);
      sc.update = (t, dt) => {
        const x = oU(t, dt);
        if (caps.length < N && sc.screen === 'play' && sc.pickups.length) {
          if (salta-- > 0) return x;
          const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender();
          const c = document.createElement('canvas'); c.width = cv.width - fx; c.height = cv.height;
          c.getContext('2d').drawImage(cv, fx, 0, cv.width - fx, cv.height, 0, 0, cv.width - fx, cv.height);
          caps.push({ c, t: Math.round(sc.t) });
        }
        return x;
      };
      const p = window.__moki.moki.bot('adjust', 200, null);
      for (let i = 0; i < 600 && caps.length < N; i++) await new Promise((ok) => setTimeout(ok, 5));
      sc.update = oU;
      const w = caps[0].c.width, h = caps[0].c.height;
      const T = document.createElement('canvas'); T.width = w + 8; T.height = (h + 8) * caps.length;
      const g = T.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, T.width, T.height);
      caps.forEach((k, i) => g.drawImage(k.c, 4, 4 + i * (h + 8)));
      p.catch(() => {});
      return { data: T.toDataURL('image/png'), ts: caps.map((k) => k.t), w: T.width, h: T.height };
    }, [N, DESDE]);
    cols.push(data);
    await ctx.close();
  }
  // une las dos columnas en una sola imagen (izquierda | derecha)
  const ctx = await browser.newContext({ viewport: { width: 400, height: 300 } });
  const page = await ctx.newPage();
  const png = await page.evaluate(async (cols) => {
    const ims = await Promise.all(cols.map((c) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = c.data; })));
    const T = document.createElement('canvas'); T.width = ims[0].width + ims[1].width + 16; T.height = Math.max(ims[0].height, ims[1].height);
    const g = T.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, T.width, T.height);
    g.drawImage(ims[0], 0, 0); g.drawImage(ims[1], ims[0].width + 16, 0);
    return T.toDataURL('image/png');
  }, cols);
  writeFileSync(salida, Buffer.from(png.split(',')[1], 'base64'));
  console.log(salida, 'cuadros izq', JSON.stringify(cols[0].ts), 'der', JSON.stringify(cols[1].ts));
  await ctx.close();
} finally {
  await browser.close();
}
