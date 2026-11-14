// P40d: tira de 8 cuadros a resolución real, cada uno 180 ms después de un cobro (collect) (se ven píldora,
// contador y cinta en el mismo cuadro). Escenas: 'reto' (Reto 2026-11-14, bot adjust: racha x2/x3 de horquillas y de
// piezas) y 'primera' (jugador nuevo, 1.ª partida). Cobros a >= 600 ms; en el Reto solo los cierres de horquilla (Arriba x1/x2/x3, A ras).
// Uso: flock /tmp/moki-pesado.lock node herramientas/ciego-p40d.mjs <url> <WxH> <escena> <salida.png>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, escena, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript((reto) => {
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('moki.tutorial', '1');
    if (reto) { localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.modo', 'reto'); }
  }, escena === 'reto');
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${url}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const png = await page.evaluate(async (reto) => {
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, orig = sc.update.bind(sc), cap = [], N = 8;
    const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); return c; };
    let quiero = null, ult = -1e9;
    const oCol = sc.collect.bind(sc);
    sc.collect = (k) => {
      const antes = (k.arc && sc.arcGot[k.arc]) || 0;
      const x = oCol(k);
      const cierra = k.arc && antes + 1 === k.arcN && (k.alto || k.ras); // cierre de horquilla: nace la píldora larga
      const vale = sc.t - ult >= 600 && (!reto || cierra);
      if (quiero == null && vale && cap.length < N) quiero = sc.t + 180;
      return x;
    };
    sc.update = (a, b) => { const r = orig(a, b); if (quiero != null && sc.t >= quiero) { quiero = null; ult = sc.t; cap.push(pinta()); } return r; };
    await window.__moki.moki.bot('adjust', 200, reto ? '2026-11-14' : null);
    sc.update = orig;
    sc.collect = oCol;
    if (!cap.length) return null;
    const cols = 4, rows = Math.ceil(cap.length / cols), cw = cv.width, ch = cv.height;
    const T = document.createElement('canvas'); T.width = cols * cw + (cols + 1) * 6; T.height = rows * ch + (rows + 1) * 6;
    const g = T.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, T.width, T.height);
    cap.forEach((c, i) => g.drawImage(c, 6 + (i % cols) * (cw + 6), 6 + ((i / cols) | 0) * (ch + 6)));
    return { n: cap.length, data: T.toDataURL('image/png') };
  }, escena === 'reto');
  if (!png) throw new Error('sin cuadros');
  writeFileSync(salida, Buffer.from(png.data.split(',')[1], 'base64'));
  console.log(salida, 'cuadros', png.n, 'errores', errores.length, errores.slice(0, 2));
} finally {
  await browser.close();
}
