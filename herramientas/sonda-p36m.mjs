// P36m: el beacon del intento trae horq (horquillas vistas) y altos (subidas completas). Sirve el build bajo
// moki.jorgesuarez.com.mx con page.route, ataja /api/partida (nunca toca el servidor real) y parcha SOLO aquí el
// silencio de ?debug para poder usar el bot. Casos: 1.ª partida subiendo (adjust), 1.ª partida a ras (abajo), Clásico (?nivel=clasico) y Reto como extra.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36m.mjs <carpeta-del-build> <salida.json>
import { createRequire } from 'node:module';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [buildDir, salida] = process.argv.slice(2);
const HOST = 'https://moki.jorgesuarez.com.mx';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const casos = [];
const errores = [];

async function caso(nombre, ls, kind, q = '') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const red = [];
  await ctx.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/partida') {
      red.push(route.request().postData());
      return route.fulfill({ status: 204 });
    }
    if (u.origin !== HOST) return route.fulfill({ status: 404, body: '' });
    const f = join(buildDir, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname));
    if (existsSync(f) && f.endsWith('.js')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8').replace('/debug|escaparate/', '/sonda-nunca/') });
    if (existsSync(f)) return route.fulfill({ status: 200, contentType: MIME[extname(f)] || 'application/octet-stream', body: readFileSync(f) });
    return route.fulfill({ status: 404, body: '' });
  });
  await ctx.addInitScript((o) => {
    if (sessionStorage.getItem('sembrado')) return;
    sessionStorage.setItem('sembrado', '1');
    localStorage.clear();
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, ls);
  // el beacon se guarda síncrono al mandarlo (la red atajada es el segundo testigo)
  await ctx.addInitScript(() => {
    const B = window.Blob;
    window.Blob = class extends B {
      constructor(p, o) { super(p, o); this.sondaTexto = p && p.join ? p.join('') : ''; }
    };
    const real = Navigator.prototype.sendBeacon;
    window.sondaBeacons = [];
    Navigator.prototype.sendBeacon = function (u, d) {
      window.sondaBeacons.push(d && d.sondaTexto);
      return real.call(this, u, d);
    };
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${HOST}/?debug${q}`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async (k) => {
    const out = await window.__moki.moki.bot(k, 200);
    const s = window.__moki.scene.scenes[0];
    return { result: out.result, cause: out.cause, seconds: out.seconds, horqNivel: (s.level.horq || []).length, beacons: window.sondaBeacons.map((t) => JSON.parse(t)) };
  }, kind);
  await page.waitForTimeout(500);
  r.enRed = red.length;
  console.log(nombre, JSON.stringify(r));
  casos.push({ caso: nombre, ...r });
  await ctx.close();
}

try {
  await caso('primera subiendo', { 'moki.tutorial': '1' }, 'adjust');
  await caso('primera a ras', { 'moki.tutorial': '1' }, 'abajo');
  await caso('clasico', { 'moki.tutorial': '1', 'moki.primera': '1' }, 'adjust', '&nivel=clasico'); // el Clásico del menú (GAME_LEVEL)
  await caso('reto (extra)', { 'moki.tutorial': '1', 'moki.primera': '1' }, 'adjust'); // Reto del día con horquillas: horq = altos si sube todas
} finally {
  await browser.close();
}
const b = (n) => casos.find((c) => c.caso === n)?.beacons?.[0] || {};
const [up, ras, cl] = [b('primera subiendo'), b('primera a ras'), b('clasico')];
const puerta = { subeAltos: up.altos >= 1, rasAltos0: ras.altos === 0, horqIgual: up.horq === ras.horq && up.horq >= 1, clasicoHorq0: cl.horq === 0, consola0: errores.length === 0 };
puerta.PASS = Object.values(puerta).every(Boolean);
writeFileSync(salida, JSON.stringify({ buildDir, puerta, casos, errores }, null, 1));
console.log('puerta', JSON.stringify(puerta));
