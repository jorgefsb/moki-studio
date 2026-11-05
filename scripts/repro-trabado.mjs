// Moki trabado (DECISIONES 5-nov 10:35), prueba permanente. Uso: node scripts/repro-trabado.mjs <carpeta del build> [salida.json]
// Los bots de paso fijo no ven esta clase de error: aquí el stepJump real corre a 60, 30 y 20 fps. Clásico, sin god y sin zanjas.
// Moki cae con la velocidad de un salto (toque o mantenido) desde 400 alturas repartidas: ¿aterriza? Trabado = 60 cuadros sin
// aterrizar. Y con Moki ya hundido bajo el suelo: ¿la red lo deja en el suelo y un toque lo hace saltar? Sale 1 si algo falla.
// Modelo: la velocidad de llegada es sqrt(2 g h), no una partida completa; responde "¿ocurre?", no "¿cada cuánto?".
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [dir, outPath] = process.argv.slice(2);
if (!dir) throw new Error('uso: <carpeta del build> [salida.json]');
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
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
let fallos = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${sv.address().port}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const s = window.__moki.scene.scenes[0];
    s.startGame();
    s.god = false;
    s.tut = { stage: 4, state: 'off' };
    const G = s.y;
    const gravedad = 2200;
    const out = { suelo: G, casos: [] };
    for (const [salto, h] of [['toque (72 px)', 72], ['mantenido (118 px)', 118]]) {
      const v = Math.sqrt(2 * gravedad * h);
      for (const [fps, dt] of [[60, 1 / 60], [30, 1 / 30], [20, 1 / 20]]) {
        let trabado = 0;
        const n = 400;
        for (let i = 0; i < n; i++) {
          s.grounded = false; s.jumping = false; s.vuelo = false; s.dead = false; s.screen = 'play';
          s.pressedAt = -1e9;
          s.vy = v - gravedad * dt * 2; // dos cuadros antes del suelo, a la velocidad de llegada
          s.y = G - s.vy * dt * 2 - (i / n) * v * dt; // fase repartida: dónde cae el cuadro respecto al suelo
          let ok = false;
          for (let k = 0; k < 60 && !ok; k++) { s.stepJump(dt); ok = s.grounded; }
          if (!ok) trabado += 1;
        }
        out.casos.push({ salto, fps, vLlegada: Math.round(v), pasoPx: +(v * dt).toFixed(1), trabadoPct: +((100 * trabado) / n).toFixed(1) });
      }
    }
    // Ya hundido, sin zanja que lo atrape: la red lo deja en el suelo. Y un toque lo hace saltar.
    s.grounded = false; s.jumping = false; s.vuelo = false; s.pressedAt = -1e9;
    s.vy = 720; s.y = G + 25;
    for (let k = 0; k < 60; k++) s.stepJump(1 / 60);
    const hundido = { y: s.y, vy: Math.round(s.vy), grounded: s.grounded };
    s.t += 1000;
    // Directo al búfer de salto: s.press lo envuelve boceto.js, y con la transición viva un toque no salta (a propósito)
    s.holding = true;
    s.pressedAt = s.t;
    let subio = false;
    for (let k = 0; k < 10; k++) { s.t += 1000 / 60; s.stepJump(1 / 60); subio = subio || s.y < G; }
    hundido.saltoTrasToque = subio;
    s.release();
    out.hundido = hundido;
    return out;
  });
  fallos = r.casos.filter((c) => c.trabadoPct > 0).length + (r.hundido.grounded && r.hundido.saltoTrasToque ? 0 : 1);
  if (outPath) writeFileSync(outPath, JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r));
  console.log(fallos ? `ROJO: ${fallos} casos` : 'VERDE: 0 % en los 6 casos, la red deja a Moki en el suelo y un toque salta');
  await ctx.close();
} finally {
  await browser.close();
  sv.close();
}
process.exit(fallos ? 1 : 0);
