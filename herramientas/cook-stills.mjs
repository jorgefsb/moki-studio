// COOK 1 (director, 16-nov): stills deterministas de las tomas del cook en la 1.ª partida (tramos 0-2).
// Mismo método que ciego-p40ea (reloj falso pauseAt + runFor, Math.random sembrado, bot 'adjust' síncrono, render manual
// y toDataURL): dos corridas de la misma URL dan los mismos cuadros, así rama y master se comparan cuadro a cuadro.
// Tomas: S01..S06 en tiempos de juego fijos (sc.t, ms) y M1..M6 = secuencia de movimiento (6 cuadros cada 100 ms).
// Uso: flock /tmp/moki-pesado.lock node herramientas/cook-stills.mjs <url> <dir-salida> [WxH]
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, dir, tam = '1280x720'] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
mkdirSync(dir, { recursive: true });
// Tiempos de juego (ms desde startGame). Página = 30 s aprox.: p1 0-30, p2 30-60, p3 60-90.
const TOMAS = { S01: 6000, S02: 19000, S03: 36000, S04: 49000, S05: 66000, S06: 80000 };
const MOV0 = 11000; // inicio de la secuencia de movimiento (p1)
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
await ctx.addInitScript(() => {
  let a = 1037;
  window.__sembrar = (n) => { a = n; };
  Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  if (sessionStorage.getItem('s')) return;
  sessionStorage.setItem('s', '1');
  localStorage.clear();
  localStorage.setItem('moki.tutorial', '1');
});
const page = await ctx.newPage();
await page.clock.install({ time: new Date('2026-11-14T22:00:00-06:00') });
await page.clock.pauseAt(new Date('2026-11-14T22:00:01-06:00'));
let vuelo = 0, ultFin = Date.now();
page.on('request', () => vuelo++);
const fin = () => { vuelo--; ultFin = Date.now(); };
page.on('requestfinished', fin);
page.on('requestfailed', fin);
page.on('pageerror', (e) => errores.push(String(e).slice(0, 300)));
page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(m.text()));
const quieto = async () => { while (vuelo > 0 || Date.now() - ultFin < 120) await new Promise((ok) => setTimeout(ok, 20)); await page.evaluate(() => 0); };
await page.goto(`${url}/?debug`, { waitUntil: 'domcontentloaded' });
let listo = false;
for (let i = 0; i < 600 && !listo; i++) { await quieto(); listo = await page.evaluate(() => !!(window.__moki && window.__moki.moki)); if (!listo) await new Promise((ok) => setTimeout(ok, 50)); }
if (!listo) throw new Error('el juego no arrancó con el reloj falso');
for (let i = 0; i < 94; i++) { await quieto(); await page.clock.runFor(16); }
await quieto();
await page.evaluate(() => window.__moki.moki.jumpTable());
await quieto();
const r = await page.evaluate(async ([TOMAS, MOV0]) => {
  const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, orig = sc.update.bind(sc), cap = {};
  const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); return cv.toDataURL('image/png'); };
  const pend = [...Object.entries(TOMAS), ...[0, 1, 2, 3, 4, 5].map((i) => [`M${i + 1}`, MOV0 + i * 100])].sort((a, b) => a[1] - b[1]);
  sc.update = (a, b) => {
    const x = orig(a, b);
    // r02 (constructor): el bot llama a update(0, DT) a mano y Phaser no emite 'postupdate'; ahí se colocan capas pintadas, luz,
    // bokeh, hojas, vida y paisajes. Sin esto el fondo salía congelado (M1-M6 sin paralaje y S01-S06 con el mismo fondo).
    if (a === 0) sc.events.emit('postupdate', 0, b);
    while (pend.length && sc.screen === 'play' && sc.t >= pend[0][1]) { const [k] = pend.shift(); cap[k] = { t: Math.round(sc.t), tramo: sc.tramo ?? sc.tramoI ?? null, png: pinta() }; }
    return x;
  };
  const oStart = sc.startGame.bind(sc);
  sc.startGame = (...a) => { const x = oStart(...a); window.__sembrar(1037); if (sc.particles) { sc.particles.clear(); sc.particles.cursor = 0; sc.particles.clock = 0; } if (sc.cinta) { sc.cinta.clock = 0; sc.cinta.trail.length = 0; } return x; };
  // r02: los paisajes de las páginas 2-4 se hornean en ratos libres (requestIdleCallback) y el bot no deja ninguno: se hornean antes
  if (sc.hornearPaisaje) for (let i = 0; i < 4; i++) sc.hornearPaisaje(i);
  const res = await window.__moki.moki.bot('adjust', 200, null);
  sc.update = orig; sc.startGame = oStart;
  return { cap, bot: { score: res.score, seconds: res.seconds, result: res.result }, faltan: pend.map((p) => p[0]) };
}, [TOMAS, MOV0]);
const meta = { url, tam, bot: r.bot, faltan: r.faltan, errores, tomas: {} };
for (const [k, v] of Object.entries(r.cap)) { writeFileSync(`${dir}/${k}.png`, Buffer.from(v.png.split(',')[1], 'base64')); meta.tomas[k] = { t: v.t, tramo: v.tramo }; }
writeFileSync(`${dir}/meta.json`, JSON.stringify(meta, null, 1));
console.log(tam, 'tomas', Object.keys(r.cap).length, 'faltan', r.faltan.join(',') || '-', 'bot', JSON.stringify(r.bot), 'errores', errores.length);
await browser.close();
