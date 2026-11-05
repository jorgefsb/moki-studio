// Condición 1 de DECISIONES 5-nov 10:35: hundido en la zanja, todo sigue igual que antes del arreglo.
//   node scripts/trabado-zanja.mjs <build de antes> <build de ahora> [salida.json]
// En un Libre con zanjas, sin god: Moki despega con toque o mantenido desde muchas distancias de la orilla (o no salta), a 60, 30
// y 20 fps, y se guarda cuadro por cuadro y, vy y si pisa. Se comparan los dos builds. Una diferencia solo vale si en el cuadro
// anterior Moki aún no estaba hundido (venía de arriba: es el arreglo). Si estaba hundido, es violación y sale 1.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [dirA, dirB, outPath] = process.argv.slice(2);
if (!dirA || !dirB) throw new Error('uso: <build de antes> <build de ahora> [salida.json]');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servir = (dir) => new Promise((res) => {
  const sv = createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = join(dir, p);
    if (!existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    r.end(readFileSync(f));
  });
  sv.listen(0, '127.0.0.1', () => res(sv));
});

function barrer() {
  const s = window.__moki.scene.scenes[0];
  const nivel = s.makeLevel('2654435761');
  const zs = nivel.zanjas || [];
  const out = { zanjas: zs.map((z) => [Math.round(z.H0), Math.round(z.H1)]), sims: [] };
  // una corta y la más larga
  const elegidas = [...zs].sort((a, b) => a.H1 - a.H0 - (b.H1 - b.H0));
  const usar = elegidas.length > 1 ? [elegidas[0], elegidas[elegidas.length - 1]] : elegidas;
  for (const z of usar) {
    const W = z.H1 - z.H0;
    for (const [fps, ms] of [[60, 1000 / 60], [30, 1000 / 30], [20, 50]]) {
      for (const kind of ['nada', 'tap', 'hold']) {
        const despegues = kind === 'nada' ? [z.H0] : Array.from({ length: Math.ceil((W + 320) / 12) }, (_, i) => z.H0 - 300 + i * 12);
        for (const D of despegues) {
          s.resetRun(nivel, z.H0 - 500);
          s.dead = false; s.screen = 'play'; s.demo = false; s.god = false; s.paseoRun = false;
          s.tut = { stage: 4, state: 'off' };
          s.speed = s.tramoSpeed(s.tramoIdx);
          s.y = 440; s.vy = 0; s.grounded = true; s.jumping = false; s.vuelo = false;
          const traza = [];
          let suelta = -1;
          let salto = false;
          for (let f = 0; f < 900 && !s.dead && s.dist < z.H1 + 500; f++) {
            s.obstacles.forEach((o) => { if (o.type !== 'zanja') o.caida = true; }); // solo la zanja: lo demás no estorba
            if (kind !== 'nada' && !salto && s.dist >= D) { salto = true; s.press(); suelta = s.t + (kind === 'tap' ? 16 : 400); }
            if (suelta > 0 && s.t >= suelta) { suelta = -1; s.release(); }
            s.update(0, ms);
            if (s.dist >= z.H0 - 400) traza.push(+s.y.toFixed(2), +s.vy.toFixed(1), s.grounded ? 1 : 0);
          }
          out.sims.push({ z: Math.round(z.H0), fps, kind, D: Math.round(D), muerto: !!s.dead, causa: s.dead ? s.cause : null, dist: Math.round(s.dist), traza });
          s.release();
        }
      }
    }
  }
  return out;
}

const svs = [await servir(dirA), await servir(dirB)];
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const res = [];
try {
  for (const sv of svs) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { localStorage.setItem('moki.modo', 'libre'); localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.tutorial', '1'); });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${sv.address().port}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const s = window.__moki.scene.scenes[0]; s.pedirZanja(); return s.zanjaLista; });
    await page.evaluate(() => window.__moki.scene.scenes[0].startGame());
    res.push(await page.evaluate(barrer));
    await ctx.close();
  }
} finally {
  await browser.close();
  svs.forEach((s) => s.close());
}

const [A, B] = res;
const G = 440;
const suma = { sims: A.sims.length, zanjas: A.zanjas, iguales: 0, distintas: 0, venianDeArriba: 0, violaciones: [], porFps: {}, resultados: { antes: {}, ahora: {} } };
if (A.sims.length !== B.sims.length || !A.sims.length) throw new Error(`barridos distintos o vacíos: ${A.sims.length} y ${B.sims.length}`);
A.sims.forEach((a, i) => {
  const b = B.sims[i];
  const f = suma.porFps[a.fps] = suma.porFps[a.fps] || { iguales: 0, distintas: 0, mueren: { antes: 0, ahora: 0 }, cruzan: { antes: 0, ahora: 0 } };
  (a.muerto ? (f.mueren.antes += 1) : (f.cruzan.antes += 1));
  (b.muerto ? (f.mueren.ahora += 1) : (f.cruzan.ahora += 1));
  let k = 0;
  const n = Math.min(a.traza.length, b.traza.length);
  while (k < n && a.traza[k] === b.traza[k]) k += 1;
  if (k === n && a.traza.length === b.traza.length && a.causa === b.causa) { suma.iguales += 1; f.iguales += 1; return; }
  suma.distintas += 1;
  f.distintas += 1;
  const cuadro = Math.floor(k / 3); // primer cuadro distinto; el anterior dice de dónde venía
  const yAnterior = cuadro > 0 ? a.traza[(cuadro - 1) * 3] : G;
  if (yAnterior <= G) suma.venianDeArriba += 1;
  else suma.violaciones.push({ z: a.z, fps: a.fps, kind: a.kind, D: a.D, cuadro, yAnterior, antes: a.causa, ahora: b.causa });
});
if (outPath) writeFileSync(outPath, JSON.stringify(suma, null, 1));
console.log(JSON.stringify(suma));
console.log(suma.violaciones.length ? `ROJO: ${suma.violaciones.length} violaciones` : 'VERDE: toda diferencia venía de arriba');
process.exit(suma.violaciones.length ? 1 : 0);
