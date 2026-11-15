// P40e-a (constructor, 14-nov): tiras para el ciego, rama contra master con el MISMO fondo (Math.random sembrado, misma semilla).
// Escenas: 'reto-pild' (Reto 2026-11-14, cierres de horquilla), 'primera-pild' (1.ª partida, todo cobro), cada cuadro +75 ms del cobro
// (la píldora recién nacida y el contador ya subido, en el mismo cuadro); 'cp-primera' y 'cp-reto': cuadro 250 ms después de cada
// checkpoint (el aviso del centro). Cobros/checkpoints a >= 600 ms. Mide el diff de píxeles cuadro a cuadro entre las dos URL
// (fracción y caja de lo distinto: debe quedar solo en la píldora o el aviso) y escribe X/Y barajadas + clave aparte.
// Uso: flock /tmp/moki-pesado.lock node herramientas/ciego-p40ea.mjs <url-rama> <url-master> <WxH> <escena> <dir-salida>
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [urlR, urlM, tam, escena, dir] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const reto = escena.endsWith('reto') || escena.startsWith('reto');
const cp = escena.startsWith('cp');
async function captura(url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript((reto) => {
    let a = 1037;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('moki.tutorial', '1');
    if (reto) { localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.modo', 'reto'); }
  }, reto);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${url} ${String(e).slice(0, 300)}`));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(`${url} ${m.text()}`));
  await page.goto(`${url}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async ([reto, cp]) => {
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, orig = sc.update.bind(sc), cap = [], N = 8;
    const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); return cv.toDataURL('image/png'); };
    let quiero = null, ult = -1e9, cp0 = sc.cpAt;
    const oCol = sc.collect.bind(sc);
    sc.collect = (k) => {
      const antes = (k.arc && sc.arcGot[k.arc]) || 0;
      const x = oCol(k);
      const cierra = k.arc && antes + 1 === k.arcN && (k.alto || k.ras);
      if (!cp && quiero == null && sc.t - ult >= 600 && (!reto || cierra) && cap.length < N) quiero = sc.t + 75;
      return x;
    };
    sc.update = (a, b) => {
      const r = orig(a, b);
      if (cp && sc.cpAt !== cp0) { cp0 = sc.cpAt; if (quiero == null && cap.length < N) quiero = sc.t + 250; }
      if (quiero != null && sc.t >= quiero) { quiero = null; ult = sc.t; cap.push({ t: Math.round(sc.t), png: pinta() }); }
      return r;
    };
    await window.__moki.moki.bot('adjust', 200, reto ? '2026-11-14' : null);
    sc.update = orig;
    sc.collect = oCol;
    return { cap, w: cv.width, h: cv.height };
  }, [reto, cp]);
  await ctx.close();
  return r;
}
const R = await captura(urlR);
const M = await captura(urlM);
const n = Math.min(R.cap.length, M.cap.length);
const page = await (await browser.newContext()).newPage();
const out = await page.evaluate(async ([R, M, n]) => {
  const img = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  const px = async (src, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(await img(src), 0, 0); return g.getImageData(0, 0, w, h).data; };
  const diffs = [];
  for (let i = 0; i < n; i++) {
    const a = await px(R.cap[i].png, R.w, R.h), b = await px(M.cap[i].png, M.w, M.h);
    let d = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let p = 0; p < a.length; p += 4) {
      if (Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]) > 24) {
        d++; const q = p / 4, x = q % R.w, y = (q / R.w) | 0;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    diffs.push({ i, tR: R.cap[i].t, tM: M.cap[i].t, frac: +(d / (R.w * R.h)).toFixed(4), caja: d ? [x0, y0, x1, y1] : null });
  }
  const tira = async (C) => {
    const cols = 4, rows = Math.ceil(n / cols), cw = C.w, ch = C.h;
    const T = document.createElement('canvas'); T.width = cols * cw + (cols + 1) * 6; T.height = rows * ch + (rows + 1) * 6;
    const g = T.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, T.width, T.height);
    for (let i = 0; i < n; i++) g.drawImage(await img(C.cap[i].png), 6 + (i % cols) * (cw + 6), 6 + ((i / cols) | 0) * (ch + 6));
    return T.toDataURL('image/png');
  };
  return { diffs, r: await tira(R), m: await tira(M) };
}, [R, M, n]);
const xEsRama = Math.random() < 0.5;
const nom = `${escena}-${W}`;
writeFileSync(`${dir}/${nom}-X.png`, Buffer.from((xEsRama ? out.r : out.m).split(',')[1], 'base64'));
writeFileSync(`${dir}/${nom}-Y.png`, Buffer.from((xEsRama ? out.m : out.r).split(',')[1], 'base64'));
writeFileSync(`${dir}/clave-${nom}.json`, JSON.stringify({ X: xEsRama ? 'rama' : 'master', Y: xEsRama ? 'master' : 'rama' }));
writeFileSync(`${dir}/diff-${nom}.json`, JSON.stringify({ escena, tam, cuadros: n, cuadrosR: R.cap.length, cuadrosM: M.cap.length, diffs: out.diffs, errores }, null, 1));
console.log(nom, 'cuadros', n, 'R', R.cap.length, 'M', M.cap.length, 'errores', errores.length, JSON.stringify(out.diffs.map((d) => [d.frac, d.caja, d.tR - d.tM])));
await browser.close();
