// P49-b: tira para el ARTE, repetida a pedido del director (21:48): MISMA escena en las dos columnas.
// Reloj falso de Playwright congelado (pauseAt; avanza solo con runFor) + Math.random sembrado, igual que ciego-p40ea.
// Captura N cuadros SEGUIDOS (cada cuadro del juego, ~16.7 ms) desde el primer cuadro de juego con piezas, recortando
// el suelo donde caen la caja, las piezas y sus sombras (mundo x 640..vw, y groundY-230..groundY+40).
// Columnas: master | rama. Además corre rama otra vez (A/A) y da, por cuadro, px distintos master-rama y rama-rama en el
// lienzo entero. En cada cuadro anota qué objetos de juego y qué sombras se ven (alfa > 0.02, dentro del recorte).
// Uso: flock /tmp/moki-pesado.lock node herramientas/tira-p49b.mjs <url-master> <url-rama> <WxH> <q> <salida-base> [N=12]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [uM, uR, tam, q, base, nArg] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const N = +(nArg || 12);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];

async function captura(url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(() => {
    let a = 1037;
    window.__sembrar = (n) => { a = n; };
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('moki.tutorial', '1');
    localStorage.setItem('moki.primera', '1');
  });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-11-14T12:00:00-06:00') });
  await page.clock.pauseAt(new Date('2026-11-14T12:00:01-06:00'));
  let vuelo = 0, ultFin = Date.now();
  page.on('request', () => vuelo++);
  const fin = () => { vuelo--; ultFin = Date.now(); };
  page.on('requestfinished', fin);
  page.on('requestfailed', fin);
  page.on('pageerror', (e) => errores.push(`${url} ${String(e).slice(0, 300)}`));
  const quieto = async () => { while (vuelo > 0 || Date.now() - ultFin < 120) await new Promise((ok) => setTimeout(ok, 20)); await page.evaluate(() => 0); };
  const paso = async (ms) => { await quieto(); await page.clock.runFor(ms); };
  await page.goto(`${url}/?debug${q}`, { waitUntil: 'domcontentloaded' });
  let listo = false;
  for (let i = 0; i < 600 && !listo; i++) { await quieto(); listo = await page.evaluate(() => !!(window.__moki && window.__moki.moki)); if (!listo) await new Promise((ok) => setTimeout(ok, 50)); }
  if (!listo) throw new Error(`${url}: el juego no arrancó con el reloj falso`);
  for (let i = 0; i < 94; i++) await paso(16);
  await quieto();
  await page.evaluate(() => window.__moki.moki.jumpTable());
  await quieto();
  const r = await page.evaluate(async (N) => {
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, orig = sc.update.bind(sc);
    const caps = [];
    const g0 = 0;
    const recorte = () => {
      const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView, gY = sc.constructor && window.__moki ? null : null;
      const G = sc.groundY ?? 0;
      return { z, v, G };
    };
    sc.update = (a, b) => {
      const x = orig(a, b);
      if (caps.length < N && sc.screen === 'play' && sc.pickups.length) {
        const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender();
        const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView;
        const gy = sc.obstacles[0] ? sc.obstacles[0].shadow.y : sc.pickups[0].shadow.y; // la sombra va en el suelo
        const x0 = Math.max(0, Math.round((640 - v.x) * z)), x1 = cv.width, y0 = Math.max(0, Math.round((gy - 230 - v.y) * z)), y1 = Math.min(cv.height, Math.round((gy + 40 - v.y) * z));
        const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0;
        c.getContext('2d').drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
        const full = cv.getContext ? null : null;
        const vis = [];
        const ve = (o) => o && o.visible && o.alpha > 0.02 && (o.x - v.x) * z > x0 - 40 && (o.x - v.x) * z < x1 + 40;
        sc.obstacles.forEach((o) => vis.push(`caja:${ve(o.sprite) ? 'si' : 'no'}/sombra:${ve(o.shadow) ? 'si' : 'no'}@${Math.round((o.x - v.x) * z)}`));
        sc.pickups.filter((k) => !k.taken).forEach((k) => vis.push(`ficha:${ve(k.sprite) ? 'si' : 'no'}/sombra:${ve(k.shadow) ? 'si' : 'no'}@${Math.round((k.x - v.x) * z)}`));
        caps.push({ t: Math.round(sc.t), png: c.toDataURL('image/png'), lienzo: cv.toDataURL('image/png'), vis: vis.filter((s) => +s.split('@')[1] > x0 - 40 && +s.split('@')[1] < x1 + 40), x0, y0 });
      }
      return x;
    };
    const oStart = sc.startGame.bind(sc);
    sc.startGame = (...a) => { const x = oStart(...a); window.__sembrar(4242); if (sc.particles) { sc.particles.clear(); sc.particles.cursor = 0; sc.particles.clock = 0; } if (sc.cinta) { sc.cinta.clock = 0; sc.cinta.trail.length = 0; } return x; };
    const p = window.__moki.moki.bot('adjust', 200, null);
    await p;
    sc.update = orig; sc.startGame = oStart;
    return { caps, w: cv.width, h: cv.height, mega: sc.megaOn || 0 };
  }, N);
  await ctx.close();
  return r;
}

const M = await captura(uM);
const R = await captura(uR);
const R2 = await captura(uR);
const page = await (await browser.newContext()).newPage();
const out = await page.evaluate(async ([M, R, R2]) => {
  const img = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  const px = async (src) => { const i = await img(src); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
  const dif = (a, b, w, rx, ry) => { let d = 0, f = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; const zonas = {}; for (let p = 0; p < a.length; p += 4) if (Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]) > 24) { d++; const q = p / 4, x = q % w, y = (q / w) | 0; if (x < rx || y < ry) { f++; const z = `${(x / 160) | 0},${(y / 120) | 0}`; zonas[z] = (zonas[z] || 0) + 1; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } } return { total: d, fueraDelRecorte: f, cajaFuera: f ? [x0, y0, x1, y1] : null, zonas }; };
  const n = Math.min(M.caps.length, R.caps.length, R2.caps.length);
  const filas = [];
  for (let i = 0; i < n; i++) {
    const [m, r, r2] = await Promise.all([px(M.caps[i].lienzo), px(R.caps[i].lienzo), px(R2.caps[i].lienzo)]);
    filas.push({ cuadro: i + 1, tM: M.caps[i].t, tR: R.caps[i].t, pxMasterRama: dif(m, r, M.w, M.caps[i].x0, M.caps[i].y0), pxRamaRama: dif(r, r2, M.w, M.caps[i].x0, M.caps[i].y0), recorte: [M.caps[i].x0, M.caps[i].y0], visMaster: M.caps[i].vis, visRama: R.caps[i].vis });
  }
  const ims = [];
  for (let i = 0; i < n; i++) ims.push([await img(M.caps[i].png), await img(R.caps[i].png)]);
  const cw = ims[0][0].width, ch = ims[0][0].height, E = 6, L = 22;
  const T = document.createElement('canvas'); T.width = 2 * cw + 3 * E; T.height = n * (ch + E + L) + E;
  const g = T.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, T.width, T.height);
  g.font = '16px sans-serif'; g.fillStyle = '#000';
  ims.forEach(([a, b], i) => {
    const y = E + i * (ch + E + L);
    g.fillText(`cuadro ${i + 1} · t ${M.caps[i].t} ms · izquierda master · derecha rama`, E, y + 16);
    g.drawImage(a, E, y + L); g.drawImage(b, 2 * E + cw, y + L);
  });
  return { png: T.toDataURL('image/png'), filas };
}, [M, R, R2]);
writeFileSync(`${base}.png`, Buffer.from(out.png.split(',')[1], 'base64'));
writeFileSync(`${base}.json`, JSON.stringify({ q, tam, megaM: M.mega, megaR: R.mega, filas: out.filas, errores }, null, 1));
console.log(`${base}.png mega ${M.mega}/${R.mega} errores ${errores.length}`);
for (const f of out.filas) console.log(f.cuadro, f.tM, f.tR, 'px M-R', JSON.stringify(f.pxMasterRama), 'R-R', JSON.stringify(f.pxRamaRama), '| M', f.visMaster.join(' '), '| R', f.visRama.join(' '));
await browser.close();
