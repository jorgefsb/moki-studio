// Captura para ciegos (regla del director, 5-nov): ninguna toma sale hasta comprobar, LEYENDO EL ESTADO DEL JUEGO, que la cola
// de texturas está vacía, la paleta del atardecer aplicada, la entrada de boceto terminada y que ningún sprite trae __MISSING
// (las cajas verdes de las capturas del 5-nov). Si no se cumple, no captura y sale con código 1. Se repite antes de cada toma.
//   node herramientas/captura-lista.mjs <carpeta del build> <semilla> <carpeta de salida> [--vp 375x667] [--en 3000,5200j] [--sin-tarde]
// --en: distancias del nivel (px); con j, Moki va en el aire al tomar. Sin --en lista dónde hay trampolines y viento y no captura.
// --sin-tarde: para cuando el jugador sembrado no está en el nivel 1 del Cuaderno (ahí no aplica el atardecer).
// --q "escaparate": abre ?debug&escaparate en lugar de la partida por semilla (la semilla se ignora; usa -). --en auto: tomas
// calculadas del nivel que salió: antes de la primera zona de viento, del primer timbre y de la primera zanja, y antes y sobre
// el primer trampolín (sirve con Libre, que sortea su semilla).
// Headless, un navegador, se cierra al terminar. Escribe estado.json con la prueba de cada toma.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opcion = (n) => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const [dir, seed, out] = args;
if (!dir || !seed || !out) throw new Error('uso: <build> <semilla> <salida> [--vp 375x667] [--en d,dj] [--sin-tarde]');
const [w, h] = (opcion('--vp') || '375x667').split('x').map(Number);
let TOMAS = opcion('--en') ? opcion('--en').split(',') : null;
const QUERY = opcion('--q');
const conTarde = !args.includes('--sin-tarde');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const sv = createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(dir, p);
  if (!existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
  r.end(readFileSync(f));
});
await new Promise((res) => sv.listen(0, '127.0.0.1', res));

// Lo que se comprueba, leído de la escena. listo = todo en verde; el resto es para ver qué falta.
const leerEstado = (conTarde) => {
  const s = window.__moki.scene.scenes[0];
  const amb = s.ambient;
  const faltantes = [];
  s.children.list.forEach(function ver(o) {
    if (o.list) o.list.forEach(ver);
    if (o.texture && o.texture.key === '__MISSING' && o.visible) faltantes.push(o.type);
  });
  const e = {
    colaVacia: !s.texQueue,
    tardeMontada: !!(amb && amb.tardeMontada),
    nivel1: !!(amb && amb.n1),
    paleta: !!(amb && amb.tarde && amb.st >= 1),
    boceto: !!s.boceto,
    faltantes: faltantes.length,
    pantalla: s.screen,
  };
  e.listo = e.colaVacia && !e.boceto && !e.faltantes && (!conTarde || (e.tardeMontada && e.nivel1 && e.paleta));
  return e;
};

let codigo = 0;
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const reporte = { build: dir, seed, vp: `${w}x${h}`, tomas: [] };
try {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 600, isMobile: w < 600 });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.tutorial', '1'); localStorage.setItem('moki.modo', 'reto'); });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await page.goto(`http://127.0.0.1:${sv.address().port}/?debug&${QUERY || `god&screen=play&seed=${seed}`}`);
  await page.waitForFunction(() => window.__moki?.scene.scenes[0]?.level && window.__moki.scene.scenes[0].screen === 'play', null, { timeout: 60000 });
  const nivel = await page.evaluate(() => {
    const l = window.__moki.scene.scenes[0].level;
    const de = (t) => l.entities.filter((e) => e.type === t).map((e) => Math.round(e.D));
    return { modo: l.modo, seed: l.seed, mecanicas: l.mecanicas, starts: l.starts, trampolines: de('tramp'), timbres: de('timbre'), zanjas: (l.zanjas || []).map((z) => Math.round(z.H0)), vientos: (l.vientos || []).map((v) => [Math.round(v.D0), Math.round(v.D1), v.k]) };
  });
  reporte.nivel = nivel;
  if (TOMAS && TOMAS[0] === 'auto') {
    const hay = (lista, d) => (lista.length ? [String(lista[0] + d)] : []);
    TOMAS = [...hay(nivel.trampolines, -300), ...hay(nivel.trampolines, -60), ...hay(nivel.vientos.map((v) => v[0]), -250), ...hay(nivel.timbres, -300), ...hay(nivel.zanjas, -300)];
  }
  await page.evaluate(`window.__leer = ${leerEstado.toString()}`);
  reporte.primeraLectura = await page.evaluate((c) => window.__leer(c), conTarde); // recién arrancado: debe salir sin listo, si no el instrumento no mide
  if (!TOMAS) console.log(JSON.stringify(nivel));
  else {
    mkdirSync(out, { recursive: true });
    // Primero listo y luego a su lugar: Moki corre mientras se espera y, al revés, la toma salía ya pasado lo que se quería ver
    await page.waitForFunction((c) => window.__leer(c).listo, conTarde, { timeout: 45000, polling: 100 }).catch(() => {});
    for (const toma of TOMAS) {
      const d = parseFloat(toma);
      const aire = toma.endsWith('j');
      await page.evaluate((d) => { const s = window.__moki.scene.scenes[0]; s.resetRun(s.level, d); s.speed = s.tramoSpeed(s.tramoIdx); }, d);
      // La espera es por estado, no por tiempo: si en 45 s no se cumple, esa toma no sale
      const ok = await page.waitForFunction((c) => window.__leer(c).listo, conTarde, { timeout: 45000, polling: 100 }).then(() => true).catch(() => false);
      const antes = await page.evaluate((c) => window.__leer(c), conTarde);
      if (!ok) {
        console.error(`toma ${toma}: el juego no quedó listo`, JSON.stringify(antes));
        reporte.tomas.push({ toma, estado: antes, archivo: null });
        codigo = 1;
        continue;
      }
      if (aire) { await page.evaluate(() => window.__moki.scene.scenes[0].press()); await page.waitForTimeout(160); await page.evaluate(() => window.__moki.scene.scenes[0].release()); }
      const archivo = `${String(reporte.tomas.length + 1).padStart(2, '0')}-${toma}.png`;
      await page.screenshot({ path: join(out, archivo) });
      const despues = await page.evaluate((c) => window.__leer(c), conTarde); // lo que se ve es lo que se comprobó: si algo se coló entre medio, no vale
      if (!despues.listo) codigo = 1;
      reporte.tomas.push({ toma, estado: antes, despues, dist: await page.evaluate(() => Math.round(window.__moki.scene.scenes[0].dist)), archivo: despues.listo ? archivo : null });
    }
    reporte.errores = errores;
    if (errores.length) codigo = 1;
    writeFileSync(join(out, 'estado.json'), JSON.stringify(reporte, null, 1));
    console.log(JSON.stringify({ primeraLectura: reporte.primeraLectura, tomas: reporte.tomas.map((t) => [t.toma, !!t.archivo, t.dist]), errores: errores.length }));
  }
  await ctx.close();
} finally {
  await browser.close();
  sv.close();
}
process.exit(codigo);
