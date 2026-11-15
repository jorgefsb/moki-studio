// P40e probador: jugador NUEVO (sin localStorage, sin ?debug) juega la 1.ª partida y guarda fotos cada 900 ms.
// Uso: flock /tmp/moki-pesado.lock node herramientas/captura-p40e-nuevo.mjs <url> <carpeta> [WxH]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, dir, vp = '1280x720'] = process.argv.slice(2);
const [w, h] = vp.split('x').map(Number);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const page = await ctx.newPage(); const err = [];
page.on('pageerror', (e) => err.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !/403|NetworkError|Failed to load/.test(m.text()) && err.push(m.text()));
await page.route('https://moki.jorgesuarez.com.mx/**', (rt) => rt.fulfill({ status: 200, body: 'ok' }));
await page.goto(`${base}/?ir=primera`);
await page.waitForTimeout(6000);
const log = [];
for (let i = 0; i < 40; i++) {
  if (i % 3 === 0) await page.mouse.move(w / 2, h / 2);
  await page.keyboard.down('Space'); await page.waitForTimeout(350); await page.keyboard.up('Space');
  await page.waitForTimeout(550);
  await page.screenshot({ path: `${dir}/f${String(i).padStart(2, '0')}.png` });
}
log.push({ vp, err });
writeFileSync(`${dir}/log.json`, JSON.stringify(log, null, 1));
console.log(vp, 'errores', err.length);
await browser.close();
