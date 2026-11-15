// P4x-b (constructor, 15-nov): ciego del aterrizaje cada 33 ms, rama contra master, BARAJADO cuadro a cuadro y con reloj quieto.
// Une dos herramientas: el arranque determinista de ciego-p40ea (reloj falso con pauseAt, solo avanza con runFor; azar
// sembrado al arrancar el bot; reserva de partículas vaciada) y el muestreo fino de ciego-p4u (12 recortes alrededor de
// Moki: 3 antes del contacto del despegue n y 9 después, cada PASO ms de juego).
// Cada cuadro i de la tira X sale de la rama o de master según su propia moneda (mulberry32, semilla registrada); la tira Y
// lleva el otro. La clave va aparte y no se le da a los críticos.
// A/A: la misma URL en las dos posiciones. Debe dar 0 px distintos en los 12 cuadros.
// Uso: flock /tmp/moki-pesado.lock node herramientas/ciego-p4xb.mjs <url-rama> <url-master> <WxH> <dir-salida> [n despegue=3] [paso ms=33] [semilla]
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomInt } from 'node:crypto';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [urlR, urlM, tam, dir, nd = '3', pasoArg = '33', semArg] = process.argv.slice(2);
const PASO = +pasoArg;
const [W, H] = tam.split('x').map(Number);
const semilla = semArg != null ? Number(semArg) : randomInt(2 ** 31);
mkdirSync(dir, { recursive: true });
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
    for (const [k, v] of Object.entries({ 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': '2' })) localStorage.setItem(k, v);
  });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-11-15T10:00:00-06:00') });
  await page.clock.pauseAt(new Date('2026-11-15T10:00:01-06:00'));
  let vuelo = 0, ultFin = Date.now();
  page.on('request', () => vuelo++);
  const fin = () => { vuelo--; ultFin = Date.now(); };
  page.on('requestfinished', fin);
  page.on('requestfailed', fin);
  page.on('pageerror', (e) => errores.push(`${url} ${String(e).slice(0, 300)}`));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(`${url} ${m.text()}`));
  const quieto = async () => { while (vuelo > 0 || Date.now() - ultFin < 120) await new Promise((ok) => setTimeout(ok, 20)); await page.evaluate(() => 0); };
  const paso = async (ms) => { await quieto(); await page.clock.runFor(ms); };
  await page.goto(`${url}/?debug`, { waitUntil: 'domcontentloaded' });
  let listo = false;
  for (let i = 0; i < 600 && !listo; i++) { await quieto(); listo = await page.evaluate(() => !!(window.__moki && window.__moki.moki)); if (!listo) await new Promise((ok) => setTimeout(ok, 50)); }
  if (!listo) throw new Error(`${url}: el juego no arrancó con el reloj falso`);
  for (let i = 0; i < 94; i++) await paso(16);
  await quieto();
  await page.evaluate(() => window.__moki.moki.jumpTable());
  await quieto();
  const r = await page.evaluate(async ([nd, PASO]) => {
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas;
    const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
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
        const P = sc.poses; buf.push({ png: cc.toDataURL('image/png'), t: sc.t, pose: P && P.sprite.visible ? P.pose + ':' + P.sprite.frame.name : 'titere' });
        if (buf.length > 40 && land === null) buf.shift();
        if (land !== null && buf.filter((q) => q.t >= land).length >= 9) fin = sc.t;
      }
      return rr;
    };
    const oStart = sc.startGame.bind(sc);
    sc.startGame = (...a) => { const x = oStart(...a); window.__sembrar(1037); if (sc.particles) { sc.particles.clear(); sc.particles.cursor = 0; sc.particles.clock = 0; } if (sc.cinta) { sc.cinta.clock = 0; sc.cinta.trail.length = 0; } return x; };
    const res = await window.__moki.moki.bot('adjust', 40, null);
    sc.update = orig;
    sc.startGame = oStart;
    const i0 = buf.findIndex((q) => land !== null && q.t >= land);
    const sel = i0 < 0 ? [] : buf.slice(Math.max(0, i0 - 3), Math.max(0, i0 - 3) + 12);
    return { gw, gh, desp, land, cuadros: sel.map((q) => ({ dt: Math.round(q.t - land), pose: q.pose, png: q.png })), bot: { result: res.result, score: res.score } };
  }, [nd, PASO]);
  await ctx.close();
  return r;
}

const R = await captura(urlR);
const M = await captura(urlM);
let s = semilla >>> 0;
const moneda = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 < 0.5; };
const n = Math.min(R.cuadros.length, M.cuadros.length);
const xRama = Array.from({ length: n }, () => moneda());
const page = await (await browser.newContext()).newPage();
const out = await page.evaluate(async ([R, M, n, xRama]) => {
  const img = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  const px = async (src) => { const i = await img(src); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
  const diffs = [];
  for (let i = 0; i < n; i++) {
    const a = await px(R.cuadros[i].png), b = await px(M.cuadros[i].png);
    let d = 0;
    for (let p = 0; p < a.length; p += 4) if (Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]) > 24) d++;
    diffs.push(d);
  }
  const tira = async (esX) => {
    const cols = 3, rows = 4, pad = 4, gw = R.gw, gh = R.gh;
    const T = document.createElement('canvas'); T.width = cols * gw + 4 * pad; T.height = rows * gh + 5 * pad;
    const g = T.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, T.width, T.height);
    for (let i = 0; i < n; i++) {
      const deRama = esX ? xRama[i] : !xRama[i];
      g.drawImage(await img((deRama ? R : M).cuadros[i].png), pad + (i % cols) * (gw + pad), pad + ((i / cols) | 0) * (gh + pad));
      g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif'; g.fillText(String(i + 1), pad + (i % cols) * (gw + pad) + 6, pad + ((i / cols) | 0) * (gh + pad) + 22);
    }
    return T.toDataURL('image/png');
  };
  return { diffs, x: await tira(true), y: await tira(false) };
}, [R, M, n, xRama]);
const aa = urlR === urlM;
const nom = `aterriza-${W}${aa ? '-aa' : ''}`;
writeFileSync(`${dir}/${nom}-X.png`, Buffer.from(out.x.split(',')[1], 'base64'));
writeFileSync(`${dir}/${nom}-Y.png`, Buffer.from(out.y.split(',')[1], 'base64'));
const info = (C) => C.cuadros.map((q) => `${q.dt}:${q.pose}`);
writeFileSync(`${dir}/clave-${nom}.json`, JSON.stringify({ semilla, aa, xEsRama: `${xRama.filter(Boolean).length} de ${n}`, cuadros: xRama.map((x, i) => ({ cuadro: i + 1, X: x ? 'rama' : 'master', Y: x ? 'master' : 'rama' })) }, null, 1));
writeFileSync(`${dir}/diff-${nom}.json`, JSON.stringify({ tam, aa, urlR, urlM, paso: PASO, n, diffs: out.diffs, rama: info(R), master: info(M), botR: R.bot, botM: M.bot, errores }, null, 1));
console.log(nom, aa ? 'A/A' : 'A/B', 'cuadros', n, 'px distintos', JSON.stringify(out.diffs), 'rama', JSON.stringify(info(R)), 'master', JSON.stringify(info(M)), 'errores', errores.length, JSON.stringify(errores.slice(0, 3)));
await browser.close();
