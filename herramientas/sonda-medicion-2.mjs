// Sonda de MEDICIÓN 2 (constructor, 7-nov). Sirve un build bajo moki.jorgesuarez.com.mx con page.route y guarda cada beacon
// en localStorage SIN llamar al sendBeacon real; además el host apunta a 127.0.0.1:9 (nada escucha), así ninguna prueba
// le pega al worker real. Chromium headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-medicion-2.mjs <carpeta-del-build> <carpeta-salida>
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');

const [buildDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const HOST = 'https://moki.jorgesuarez.com.mx';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml' };
const LS = { 'moki.tutorial': '1', 'moki.primera': '1' };

const browser = await chromium.launch({
  executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable',
  args: ['--headless=new', '--host-resolver-rules=MAP moki.jorgesuarez.com.mx 127.0.0.1:9'],
});
const resultados = [];

async function caso(nombre, { query = '?speed=1500', ls = {}, humano = false }, fn) {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const page = await ctx.newPage();
  const errores = [];
  let enRed = 0;
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/partida') { enRed++; return route.fulfill({ status: 204 }); }
    if (u.pathname === '/nada.html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>fuera</p>' });
    const f = join(buildDir, u.pathname === '/' ? 'index.html' : u.pathname);
    if (existsSync(f)) return route.fulfill({ status: 200, contentType: MIME[extname(f)] || 'application/octet-stream', body: readFileSync(f) });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.addInitScript(({ ls, humano }) => {
    if (location.pathname === '/nada.html') return;
    for (const k in ls) if (localStorage.getItem(k) === null) localStorage.setItem(k, ls[k]);
    if (humano) Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
    const B = window.Blob;
    window.Blob = class extends B {
      constructor(p, o) { super(p, o); this.sondaTexto = p && p.join ? p.join('') : ''; }
    };
    Navigator.prototype.sendBeacon = function (u, d) {
      const v = JSON.parse(localStorage.getItem('sonda.beacons') || '[]');
      v.push({ url: String(u), cuerpo: d && d.sondaTexto });
      localStorage.setItem('sonda.beacons', JSON.stringify(v));
      return true; // nunca sale a la red
    };
  }, { ls: { ...LS, ...ls }, humano });
  await page.goto(`${HOST}/${query}`);
  await page.waitForTimeout(2500);
  const salir = async () => { await page.goto(`${HOST}/nada.html`); await page.waitForTimeout(500); };
  let extra = {};
  try { extra = (await fn(page, salir)) || {}; } catch (e) { extra = { fallo: String(e) }; }
  const crudos = await page.evaluate(() => JSON.parse(localStorage.getItem('sonda.beacons') || '[]'));
  const equipoLS = await page.evaluate(() => localStorage.getItem('moki-equipo'));
  const beacons = crudos.map((b) => ({ bytes: new TextEncoder().encode(b.cuerpo).length, ...JSON.parse(b.cuerpo) }));
  const fila = { nombre, n: beacons.length, beacons, enRed, equipoLS, errores, ...extra };
  resultados.push(fila);
  console.log(JSON.stringify(fila));
  await ctx.close();
}

const jugar = async (page) => { await page.keyboard.press('Space'); await page.waitForTimeout(300); };
const hastaChoque = (page) => page.waitForSelector('.ui-fail', { timeout: 60000 });
const reintenta = async (page) => { await page.waitForTimeout(1200); await page.keyboard.press('Space'); await page.waitForTimeout(300); };
const choqueReintentoSalir = async (page, salir) => {
  await jugar(page);
  await hastaChoque(page);
  await reintenta(page);
  await hastaChoque(page);
  await reintenta(page);
  await page.waitForTimeout(800);
  await salir();
};

await caso('bot', {}, choqueReintentoSalir);
await caso('debug', { query: '?debug&speed=1500' }, choqueReintentoSalir);
await caso('equipo', { query: '?equipo&speed=1500', humano: true }, choqueReintentoSalir);
await caso('publico-apaga-equipo', { query: '?publico&speed=1500', humano: true, ls: { 'moki-equipo': '1' } }, choqueReintentoSalir);
await caso('publico', { humano: true }, choqueReintentoSalir);
await caso('bot-con-equipo', { ls: { 'moki-equipo': '1' } }, choqueReintentoSalir);

writeFileSync(join(outDir, 'sonda-medicion-2.json'), JSON.stringify(resultados, null, 1));
await browser.close();
