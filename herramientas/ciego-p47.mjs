// P47 (constructor, 15-nov): ciego de la tarjeta de meta ("¿de dónde sale el Puntaje?"), rama contra master, barajado.
// Arranque determinista de ciego-p4xb/ciego-p40ea: reloj falso con pauseAt (solo avanza con runFor), azar sembrado al
// arrancar el bot. Partida: 1.ª partida de jugador nuevo (sin localStorage) con bot adjust hasta la meta; luego el juego corre
// solo 2.4 s de reloj falso (la tarjeta sale a 1.2 s) y se toma la pantalla completa, con la tarjeta y la tira del Cuaderno.
// Tira X = rama o master según una moneda (mulberry32, semilla registrada); tira Y = la otra. La clave va aparte.
// A/A: la misma URL en las dos posiciones. Debe dar 0 px distintos.
// Uso: flock /tmp/moki-pesado.lock node herramientas/ciego-p47.mjs <url-rama> <url-master> <WxH> <dir-salida> [semilla]
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomInt } from 'node:crypto';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [urlR, urlM, tam, dir, semArg] = process.argv.slice(2);
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
  const bot = await page.evaluate(async () => {
    const sc = window.__moki.scene.scenes[0];
    const oStart = sc.startGame.bind(sc);
    sc.startGame = (...a) => { const x = oStart(...a); window.__sembrar(1037); if (sc.particles) { sc.particles.clear(); sc.particles.cursor = 0; sc.particles.clock = 0; } if (sc.cinta) { sc.cinta.clock = 0; sc.cinta.trail.length = 0; } return x; };
    const res = await window.__moki.moki.bot('adjust', 260, null);
    sc.startGame = oStart;
    return { result: res.result, screen: sc.screen, score: sc.finalData && sc.finalData.score };
  });
  for (let i = 0; i < 150; i++) await paso(16); // la tarjeta sale a 1.2 s; 2.4 s de juego
  await new Promise((ok) => setTimeout(ok, 900)); // transiciones CSS (tiempo real) de la tarjeta y la tira
  const png = await page.screenshot();
  const texto = await page.evaluate(() => { const c = document.querySelector('.ui-card'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 240) : null; });
  await ctx.close();
  return { png, bot, texto };
}

const R = await captura(urlR);
const M = await captura(urlM);
let s = semilla >>> 0;
s = (s + 0x6d2b79f5) | 0;
let t = Math.imul(s ^ (s >>> 15), 1 | s);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
const xRama = ((t ^ (t >>> 14)) >>> 0) / 4294967296 < 0.5;
const page = await (await browser.newContext()).newPage();
const diff = await page.evaluate(async ([a64, b64]) => {
  const img = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  const px = async (src) => { const i = await img(src); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
  const a = await px(a64), b = await px(b64);
  let d = 0;
  for (let p = 0; p < a.length; p += 4) if (Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]) > 24) d++;
  return d;
}, [`data:image/png;base64,${R.png.toString('base64')}`, `data:image/png;base64,${M.png.toString('base64')}`]);
const aa = urlR === urlM;
const nom = `tarjeta-${W}${aa ? '-aa' : ''}`;
writeFileSync(`${dir}/${nom}-X.png`, xRama ? R.png : M.png);
writeFileSync(`${dir}/${nom}-Y.png`, xRama ? M.png : R.png);
writeFileSync(`${dir}/clave-${nom}.json`, JSON.stringify({ semilla, aa, X: xRama ? 'rama' : 'master', Y: xRama ? 'master' : 'rama' }, null, 1));
writeFileSync(`${dir}/diff-${nom}.json`, JSON.stringify({ tam, aa, urlR, urlM, pxDistintos: diff, botR: R.bot, botM: M.bot, textoR: R.texto, textoM: M.texto, errores }, null, 1));
console.log(nom, aa ? 'A/A' : 'A/B', 'px distintos', diff, 'botR', JSON.stringify(R.bot), 'botM', JSON.stringify(M.bot), 'errores', errores.length, JSON.stringify(errores.slice(0, 3)));
await browser.close();
