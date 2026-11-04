// Sonda del contador anónimo (director, 4-nov). Sirve un build bajo moki.jorgesuarez.com.mx con page.route y ataja
// /api/partida: nunca le pega al endpoint real. Chromium headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-contador.mjs <carpeta-del-build> <carpeta-salida> [casos separados por coma]
// Beacon contado dos veces: en la red atajada y envolviendo sendBeacon en localStorage (sobrevive al pagehide).
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');

const [buildDir, outDir, soloArg] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const HOST = 'https://moki.jorgesuarez.com.mx';
const OTRO = 'https://otro.example.com';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml' };
const LS = { 'moki.tutorial': '1', 'moki.primera': '1' }; // sin tutorial: el primer choque ya es intento

const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const resultados = [];

async function caso(nombre, { origen = HOST, query = '?speed=1500', ls = {}, viewport = { width: 640, height: 360 }, red = 'ok', sinBeacon = false, parche = false }, fn) {
  if (soloArg && !soloArg.split(',').includes(nombre)) return;
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const net = [];
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/partida') {
      net.push({ url: u.href, metodo: route.request().method(), tipo: route.request().headers()['content-type'], cuerpo: route.request().postData() });
      return red === 'ok' ? route.fulfill({ status: 204 }) : route.abort('internetdisconnected');
    }
    if (u.pathname === '/nada.html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>fuera</p>' });
    const f = join(buildDir, u.pathname === '/' ? 'index.html' : u.pathname);
    // parche (solo aquí, no en el build): el contador deja de callar con ?debug, para llamar a la escena en el host real
    if (parche && existsSync(f) && f.endsWith('.js')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8').replace('/debug|escaparate/', '/sonda-nunca/') });
    if (existsSync(f)) return route.fulfill({ status: 200, contentType: MIME[extname(f)] || 'application/octet-stream', body: readFileSync(f) });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.addInitScript(({ ls, sinBeacon }) => {
    for (const k in ls) if (localStorage.getItem(k) === null) localStorage.setItem(k, ls[k]);
    if (sinBeacon) { delete Navigator.prototype.sendBeacon; return; }
    // La red no siempre alcanza a atajar el beacon de una página que se va: el cuerpo se guarda aquí, síncrono
    const B = window.Blob;
    window.Blob = class extends B {
      constructor(p, o) { super(p, o); this.sondaTexto = p && p.join ? p.join('') : ''; this.sondaTipo = o && o.type; }
    };
    const real = Navigator.prototype.sendBeacon;
    Navigator.prototype.sendBeacon = function (u, d) {
      const v = JSON.parse(localStorage.getItem('sonda.beacons') || '[]');
      v.push({ url: String(u), tipo: d && d.sondaTipo, cuerpo: d && d.sondaTexto });
      localStorage.setItem('sonda.beacons', JSON.stringify(v));
      return real.call(this, u, d);
    };
  }, { ls: { ...LS, ...ls }, sinBeacon });
  await page.goto(`${origen}/${query}`);
  await page.waitForTimeout(2500);
  const salir = async () => {
    await page.goto(`${origen}/nada.html`);
    await page.waitForTimeout(500);
  };
  let extra = {};
  try {
    extra = (await fn(page, salir, ctx)) || {};
  } catch (e) {
    extra = { fallo: String(e) };
  }
  const beacons = await page.evaluate(() => JSON.parse(localStorage.getItem('sonda.beacons') || '[]')).catch(() => null);
  const fila = { nombre, n: beacons && beacons.length, beacons, enRed: net.length, errores, ...extra };
  resultados.push(fila);
  console.log(JSON.stringify(fila));
  await ctx.close();
}

const jugar = async (page) => { await page.keyboard.press('Space'); await page.waitForTimeout(300); };
// Sin saltar, Moki choca con el primer obstáculo; se reconoce porque sale la tarjeta de fallo
const hastaChoque = (page) => page.waitForSelector('.ui-fail', { timeout: 60000 });
const reintenta = async (page) => { await page.waitForTimeout(1200); await page.keyboard.press('Space'); await page.waitForTimeout(300); };

await caso('choque-y-salir', {}, async (page, salir) => { await jugar(page); await hastaChoque(page); await salir(); });
await caso('salir-a-medio', {}, async (page, salir) => { await jugar(page); await page.waitForTimeout(800); await salir(); });
await caso('reintentos', {}, async (page, salir) => {
  await jugar(page);
  for (let i = 0; i < 3; i++) {
    await hastaChoque(page);
    if (i < 2) await reintenta(page);
  }
  await salir();
});
await caso('cache-ida-y-vuelta', {}, async (page, salir) => {
  await jugar(page);
  await page.waitForTimeout(800);
  await salir();
  await page.goBack();
  await page.waitForTimeout(1500);
  await salir();
});
// page.route apaga la caché de ida y vuelta real: aquí se simula con el evento, la misma página sigue viva y luego choca
await caso('pagehide-persistente', {}, async (page, salir) => {
  await jugar(page);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await hastaChoque(page);
  await reintenta(page);
  await hastaChoque(page);
  await salir();
});
await caso('pausa-inicio', {}, async (page, salir) => {
  await jugar(page);
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.ui-pause');
  await page.click('.ui-pause .ui-btn:has-text("Inicio")');
  await page.waitForTimeout(500);
  await salir();
});
await caso('demo-silencio', {}, async (page, salir) => { await page.waitForTimeout(3000); await salir(); });
await caso('debug-silencio', { query: '?debug&speed=1500' }, async (page, salir) => { await jugar(page); await hastaChoque(page); await salir(); });
await caso('otro-host-silencio', { origen: OTRO }, async (page, salir) => { await jugar(page); await hastaChoque(page); await salir(); });
await caso('sin-red', { red: 'no' }, async (page, salir) => { await jugar(page); await hastaChoque(page); await salir(); });
await caso('sin-sendbeacon', { sinBeacon: true }, async (page, salir) => { await jugar(page); await hastaChoque(page); await salir(); });
// Paseo no choca: llega solo a la meta, y a la velocidad alta en pocos minutos
await caso('paseo-gana', { ls: { 'moki.paseo': '1' }, query: '?speed=2500' }, async (page, salir) => {
  await jugar(page);
  await page.waitForSelector('.ui-btn:has-text("Otra vez")', { timeout: 240000 });
  await salir();
});

const conEscena = (js) => async (page, salir) => {
  await jugar(page);
  await page.evaluate(js);
  await page.waitForTimeout(500);
  await salir();
};
const escena = 'const s = window.__moki.scene.scenes[0];';
await caso('zanja-libre', { parche: true, query: '?debug', ls: { 'moki.modo': 'libre' } }, conEscena(`${escena} s.crash({ type: 'zanja' });`));
await caso('gana-reto', { parche: true, query: '?debug' }, conEscena(`${escena} s.finish();`));
await caso('clasico', { query: '?speed=1500&nivel=clasico' }, async (page, salir) => { await jugar(page); await hastaChoque(page); await salir(); });
await caso('primera-partida', { ls: { 'moki.primera': '0' } }, async (page, salir) => { await jugar(page); await hastaChoque(page); await salir(); });

// Línea visible: sale con ?debug (el contador calla) para llegar directo a la tarjeta final
for (const [w, h] of [[375, 667], [844, 390], [1280, 720]]) {
  await caso(`linea-${w}`, { query: '?debug', viewport: { width: w, height: h } }, async (page) => {
    await page.evaluate(() => { const s = window.__moki.scene.scenes[0]; s.startGame(); s.finish(); });
    await page.waitForSelector('.ui-btn:has-text("Otra vez")', { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(outDir, `final-${w}.png`) });
    const medir = (sel) => page.evaluate((sel) => {
      const nota = [...document.querySelectorAll(`${sel} p.meta`)].pop();
      const card = document.querySelector(sel);
      const r = nota.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      return { texto: nota.textContent, top: r.top, bottom: r.bottom, cardBottom: c.bottom, alto: innerHeight, scroll: card.scrollHeight, cliente: card.clientHeight };
    }, sel);
    const final = await medir('.ui-card:has(.ui-btn.primary)');
    await page.evaluate(() => { const s = window.__moki.scene.scenes[0]; s.playAgain(); });
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.ui-pause');
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(outDir, `pausa-${w}.png`) });
    return { final, pausa: await medir('.ui-pause') };
  });
}

writeFileSync(join(outDir, 'sonda-contador.json'), JSON.stringify(resultados, null, 1));
await browser.close();
