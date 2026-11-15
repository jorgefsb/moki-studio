// P40e-a (constructor, 14-nov): tiras para el ciego, rama contra master. P40h (14-nov): el instrumento se arregla.
// Antes falló en 4 ciegos: fondos distintos dentro de un par, cuadros de eventos distintos y X/Y sin barajar.
//  1) MISMO FONDO. Reloj falso de Playwright (page.clock): requestAnimationFrame, performance.now, Date y los timers
//     avanzan solo cuando esta herramienta lo pide, en pasos de 16 ms, con Math.random sembrado. Cada carga de red termina
//     antes del siguiente paso. Así las dos URL ven el mismo cuadro N con el mismo estado. El bot corre síncrono con el
//     reloj quieto: el render de la captura ya no mueve el boceto ni nada que mida reloj real.
//  2) MISMO EVENTO. Cada cuadro se ancla a un evento con nombre (n-ésimo cierre de horquilla, n-ésimo cobro o n-ésimo
//     checkpoint) más un retraso fijo. Los pares se arman por ese nombre, no por orden de llegada. Se reportan tR y tM.
//  3) X/Y POR PAR. Cada par se baraja con su propia moneda (mulberry32 con semilla registrada; se puede fijar con el 6.º
//     argumento). La clave aparte dice qué es X en cada par y cuántas X son rama.
//  Diff por par: pixeles distintos (suma RGB > 24) en todo el lienzo y FUERA de la máscara. La máscara es la caja de la
//  píldora del pago, del aviso de la cinta y del aviso del centro, en los dos cuadros, con 8 px de margen. "fondo" debe ser 0.
// Escenas: 'reto-pild' (Reto 2026-11-14, cierres de horquilla), 'primera-pild' (1.ª partida, todo cobro), +75 ms del evento;
// 'cp-primera' y 'cp-reto', +250 ms del checkpoint.
// Uso: flock /tmp/moki-pesado.lock node herramientas/ciego-p40ea.mjs <url-rama> <url-master> <WxH> <escena> <dir-salida> [semilla]
// Prueba A/A: la misma URL en las dos posiciones. Debe dar fondo 0 y total 0 en 8 de 8, y X mezclada.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomInt } from 'node:crypto';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [urlR, urlM, tam, escena, dir, semArg] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const N = 8;
const semilla = semArg != null ? Number(semArg) : randomInt(2 ** 31);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const reto = escena.endsWith('reto') || escena.startsWith('reto');
const cp = escena.startsWith('cp');

async function captura(url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript((reto) => {
    let a = 1037;
    window.__sembrar = (n) => { a = n; window.__nr = 0; }; // P40h: se vuelve a sembrar al arrancar el bot (el azar de la carga no cuenta)
    window.__nr = 0;
    Math.random = () => { window.__nr++; a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('moki.tutorial', '1');
    if (reto) { localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.modo', 'reto'); }
  }, reto);
  const page = await ctx.newPage();
  // install() deja correr el reloj falso al ritmo real; pauseAt lo congela: solo avanza con runFor
  await page.clock.install({ time: new Date('2026-11-14T22:00:00-06:00') });
  await page.clock.pauseAt(new Date('2026-11-14T22:00:01-06:00'));
  let vuelo = 0, ultFin = Date.now();
  page.on('request', () => vuelo++);
  const fin = () => { vuelo--; ultFin = Date.now(); };
  page.on('requestfinished', fin);
  page.on('requestfailed', fin);
  page.on('pageerror', (e) => errores.push(`${url} ${String(e).slice(0, 300)}`));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(`${url} ${m.text()}`));
  // Un paso de reloj falso. Antes de cada paso espera, en reloj real, a que no quede red en vuelo y a que pasen 120 ms desde
  // la última carga, para que decodifiquen imágenes y fuentes. Así cada carga cae en el mismo cuadro falso en las dos URL.
  const quieto = async () => { while (vuelo > 0 || Date.now() - ultFin < 120) await new Promise((ok) => setTimeout(ok, 20)); await page.evaluate(() => 0); };
  const paso = async (ms) => { await quieto(); await page.clock.runFor(ms); };
  await page.goto(`${url}/?debug`, { waitUntil: 'domcontentloaded' });
  let listo = false;
  // El juego se construye sin reloj (el módulo corre al cargar): se espera en reloj real, con el falso quieto, para que el
  // primer cuadro falso del juego sea siempre el mismo
  for (let i = 0; i < 600 && !listo; i++) { await quieto(); listo = await page.evaluate(() => !!(window.__moki && window.__moki.moki)); if (!listo) await new Promise((ok) => setTimeout(ok, 50)); }
  if (!listo) throw new Error(`${url}: el juego no arrancó con el reloj falso`);
  for (let i = 0; i < 94; i++) await paso(16); // ~1.5 s de demo, siempre los mismos cuadros
  await quieto();
  await page.evaluate(() => window.__moki.moki.jumpTable()); // carga bots.js antes, para que el bot arranque sin esperar red
  await quieto();
  const r = await page.evaluate(async ([reto, cp, N, DIAG]) => {
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, orig = sc.update.bind(sc), cap = {};
    const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); return cv.toDataURL('image/png'); };
    // Máscara: cajas en px de lienzo de lo que el cambio puede tocar (píldora del pago, aviso de la cinta, aviso del centro)
    const cajas = () => {
      const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView, out = [];
      const caja = (o, txt, pad) => {
        if (!o || !o.visible || o.alpha < 0.02) return;
        const t = txt || (o.list || []).find((q) => q.type === 'Text');
        const b = (t || o).getBounds(), sx = Math.abs(o.scaleX || 1), sy = Math.abs(o.scaleY || 1);
        out.push([(b.x - v.x) * z - (pad * sx * z + 8), (b.y - v.y) * z - (pad * sy * z + 8), (b.right - v.x) * z + (pad * sx * z + 8), (b.bottom - v.y) * z + (pad * sy * z + 8)].map(Math.round));
      };
      caja(sc.pago, null, 16);
      caja(sc.cinta && sc.cinta.aviso, null, 16);
      caja(sc.hudC, null, 16);
      return out;
    };
    // Diagnóstico (P40H_DIAG=x0,y0,x1,y1 en px de lienzo): estado de los objetos visibles que tocan esa caja
    const diag = () => {
      if (!DIAG) return null;
      const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView, out = [];
      const ve = (o, ruta) => {
        if (!o || o.visible === false) return;
        if (o.list) { o.list.forEach((c, i) => ve(c, `${ruta}/${i}`)); return; }
        if (o.type === 'Graphics' || !o.getBounds) { const cb = o.commandBuffer ? o.commandBuffer.map((n) => (typeof n === 'number' ? Math.round(n * 10) / 10 : n)).join(',') : ''; let h = 0; for (let i = 0; i < cb.length; i++) h = (h * 31 + cb.charCodeAt(i)) | 0; out.push(`${ruta} ${o.type} n${o.commandBuffer ? o.commandBuffer.length : '-'} h${h} a${o.alpha} x${Math.round(o.x)} y${Math.round(o.y)} d${o.depth} | ${cb.slice(0, 400)}`); return; }
        let b; try { b = o.getBounds(); } catch (e) { out.push(`${ruta} ${o.type} sinBounds`); return; }
        const sf = o.scrollFactorX === 0 ? 0 : 1;
        const x0 = (b.x - v.x * sf) * z, y0 = (b.y - v.y * sf) * z, x1 = (b.right - v.x * sf) * z, y1 = (b.bottom - v.y * sf) * z;
        if (x1 < DIAG[0] || x0 > DIAG[2] || y1 < DIAG[1] || y0 > DIAG[3]) return;
        const r2 = (n) => Math.round((n || 0) * 100) / 100;
        out.push([ruta, o.type, o.texture && o.texture.key, o.frame && o.frame.name, r2(o.x), r2(o.y), r2(o.angle), r2(o.alpha), r2(o.scaleX), r2(o.scaleY), o.alive != null ? o.alive.length : null].join(' '));
      };
      sc.children.list.forEach((c, i) => ve(c, `${i}:${c.type}`));
      return out;
    };
    let cuenta = 0;
    const pend = [];
    const oCol = sc.collect.bind(sc);
    sc.collect = (k) => {
      const antes = (k.arc && sc.arcGot[k.arc]) || 0;
      const x = oCol(k);
      const cierra = k.arc && antes + 1 === k.arcN && (k.alto || k.ras);
      if (!cp && (!reto || cierra)) { cuenta++; pend.push({ key: `${reto ? 'horquilla' : 'cobro'}#${cuenta}`, at: sc.t + 75 }); }
      return x;
    };
    let cp0 = sc.cpAt, cps = 0;
    sc.update = (a, b) => {
      const r = orig(a, b);
      if (cp && sc.cpAt !== cp0) { cp0 = sc.cpAt; cps++; pend.push({ key: `checkpoint#${cps}`, at: sc.t + 250 }); }
      while (pend.length && sc.t >= pend[0].at) { const p = pend.shift(); if (Object.keys(cap).length < N + 4) cap[p.key] = { t: Math.round(sc.t), nr: window.__nr, png: pinta(), mask: cajas(), diag: diag() }; }
      return r;
    };
    const pre = { frame: sc.game.loop.frame, t: Math.round(sc.t || 0), screen: sc.screen, vivas: sc.particles ? sc.particles.items.filter((p) => p.alive).length : null, clock: sc.particles ? Math.round(sc.particles.clock) : null, r: Math.random() };
    // P40h: al arrancar el bot (dentro de runBot, síncrono) se siembra el azar y se vacía la reserva de partículas del demo
    const oStart = sc.startGame.bind(sc);
    sc.startGame = (...a) => { const x = oStart(...a); window.__sembrar(1037); if (sc.particles) { sc.particles.clear(); sc.particles.cursor = 0; sc.particles.clock = 0; } if (sc.cinta) { sc.cinta.clock = 0; sc.cinta.trail.length = 0; } return x; };
    const res = await window.__moki.moki.bot('adjust', 200, reto ? '2026-11-14' : null);
    sc.update = orig;
    sc.collect = oCol;
    sc.startGame = oStart;
    return { cap, w: cv.width, h: cv.height, bot: { score: res.score, seconds: res.seconds, result: res.result }, pre };
  }, [reto, cp, N, process.env.P40H_DIAG ? process.env.P40H_DIAG.split(',').map(Number) : null]);
  await ctx.close();
  return r;
}

const R = await captura(urlR);
const M = await captura(urlM);
// Pares por nombre de evento: los primeros N que salen en las dos corridas
const keys = Object.keys(R.cap).filter((k) => M.cap[k]).sort((a, b) => R.cap[a].t - R.cap[b].t).slice(0, N);
// Moneda por par (mulberry32, semilla registrada)
let s = semilla >>> 0;
const moneda = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 < 0.5; };
const xRama = keys.map(() => moneda());
const page = await (await browser.newContext()).newPage();
const out = await page.evaluate(async ([R, M, keys, xRama]) => {
  const img = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  const px = async (src, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(await img(src), 0, 0); return g.getImageData(0, 0, w, h).data; };
  const diffs = [];
  for (const [i, k] of keys.entries()) {
    const a = await px(R.cap[k].png, R.w, R.h), b = await px(M.cap[k].png, M.w, M.h);
    const mask = [...R.cap[k].mask, ...M.cap[k].mask];
    const dentro = (x, y) => mask.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
    let d = 0, f = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, fx0 = 1e9, fy0 = 1e9, fx1 = -1, fy1 = -1;
    for (let p = 0; p < a.length; p += 4) {
      if (Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]) > 24) {
        d++; const q = p / 4, x = q % R.w, y = (q / R.w) | 0;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        if (!dentro(x, y)) { f++; fx0 = Math.min(fx0, x); fy0 = Math.min(fy0, y); fx1 = Math.max(fx1, x); fy1 = Math.max(fy1, y); }
      }
    }
    diffs.push({ par: i + 1, evento: k, tR: R.cap[k].t, tM: M.cap[k].t, azarR: R.cap[k].nr, azarM: M.cap[k].nr, total: +(d / (R.w * R.h)).toFixed(5), fondoPx: f, fondoCaja: f ? [fx0, fy0, fx1, fy1] : null, caja: d ? [x0, y0, x1, y1] : null, mascara: mask });
  }
  // Tira X y tira Y: el par i va en la misma celda de las dos; la moneda del par decide de qué corrida sale cada una
  const tira = async (esX) => {
    const n = keys.length, cols = 4, rows = Math.ceil(n / cols), cw = R.w, ch = R.h;
    const T = document.createElement('canvas'); T.width = cols * cw + (cols + 1) * 6; T.height = rows * ch + (rows + 1) * 6;
    const g = T.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, T.width, T.height);
    for (const [i, k] of keys.entries()) {
      const deRama = esX ? xRama[i] : !xRama[i];
      g.drawImage(await img((deRama ? R : M).cap[k].png), 6 + (i % cols) * (cw + 6), 6 + ((i / cols) | 0) * (ch + 6));
    }
    return T.toDataURL('image/png');
  };
  return { diffs, x: await tira(true), y: await tira(false) };
}, [R, M, keys, xRama]);
const nom = `${escena}-${W}`;
writeFileSync(`${dir}/${nom}-X.png`, Buffer.from(out.x.split(',')[1], 'base64'));
writeFileSync(`${dir}/${nom}-Y.png`, Buffer.from(out.y.split(',')[1], 'base64'));
const nRama = xRama.filter(Boolean).length;
writeFileSync(`${dir}/clave-${nom}.json`, JSON.stringify({ semilla, xEsRama: `${nRama} de ${keys.length}`, pares: keys.map((k, i) => ({ par: i + 1, evento: k, X: xRama[i] ? 'rama' : 'master', Y: xRama[i] ? 'master' : 'rama' })) }, null, 1));
const aa = urlR === urlM;
const fondo0 = out.diffs.filter((d) => d.fondoPx === 0).length, mismoT = out.diffs.filter((d) => d.tR === d.tM).length;
if (process.env.P40H_DIAG) writeFileSync(`${dir}/diag-${nom}.json`, JSON.stringify(keys.map((k) => ({ k, R: R.cap[k].diag, M: M.cap[k].diag })), null, 1));
writeFileSync(`${dir}/diff-${nom}.json`, JSON.stringify({ escena, tam, aa, urlR, urlM, pares: keys.length, eventosR: Object.keys(R.cap).length, eventosM: Object.keys(M.cap).length, fondo0, mismoT, botR: R.bot, botM: M.bot, preR: R.pre, preM: M.pre, diffs: out.diffs, errores }, null, 1));
console.log(nom, aa ? 'A/A' : 'A/B', 'pares', keys.length, `fondo 0 en ${fondo0}/${keys.length}`, `mismo t ${mismoT}/${keys.length}`, `X=rama ${nRama}/${keys.length}`, 'errores', errores.length, JSON.stringify(out.diffs.map((d) => [d.evento, d.total, d.fondoPx])));
await browser.close();
