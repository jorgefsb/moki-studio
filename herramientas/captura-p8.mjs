// Capturas P8 MODO MEGA (Edge headless): jugador nuevo sin localStorage con la tarjeta MEGA a 390x844, 660x372 y 1280x720;
// jugador con nivel 1 terminado y marca MEGA (tarjeta abierta); y ?ir=mega arranca en MEGA. Correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/captura-p8.mjs <url-base> <carpeta>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, dir] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const datos = [];
const SEMBRAR = (o) => {
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
const VUELVE = { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.cuaderno': JSON.stringify({ v: 2, notas: ['cajas3', 'cajas5', 'piezas15'], sellos: [] }), 'moki.best.mega': '1874' };
async function menu(nombre, w, h, ls) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, ls);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/`);
  await page.waitForTimeout(5000);
  // el que vuelve ve primero "Lo nuevo desde tu última visita": se toca "Ver todo" para el menú completo
  const todo = page.locator('.mn-card', { hasText: 'Ver todo' });
  if (await todo.count()) {
    await todo.first().click();
    await page.waitForTimeout(800);
  }
  const tarjeta = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.mn-card')].find((x) => /MEGA/.test(x.textContent));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const dentro = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    return { texto: b.textContent.trim().replace(/\s+/g, ' '), cerrado: b.classList.contains('cerrado'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), dentro };
  });
  await page.screenshot({ path: `${dir}/${nombre}-${w}x${h}.png` });
  datos.push({ caso: nombre, w, h, tarjeta });
  console.log(nombre, w, h, JSON.stringify(tarjeta));
  await ctx.close();
}
async function liga() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`ir=mega ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`ir=mega ${m.text()}`));
  await page.goto(`${base}/?ir=mega&debug`);
  await page.waitForTimeout(6000);
  const st = await page.evaluate(() => {
    const s = window.__moki.scene.scenes[0];
    return { screen: s.screen, megaRun: !!s.megaRun, clasico: !(s.level && s.level.modo), best: s.bestMode(), etiqueta: s.vueltaTagC.visible };
  });
  await page.screenshot({ path: `${dir}/ir-mega-1280x720.png` });
  datos.push({ caso: 'ir=mega', st });
  console.log('ir=mega', JSON.stringify(st));
  await ctx.close();
}
try {
  if (process.argv[4] !== 'solo-vuelve') for (const [w, h] of [[390, 844], [660, 372], [1280, 720]]) await menu('nuevo', w, h, {});
  for (const [w, h] of [[390, 844], [660, 372], [1280, 720]]) await menu('vuelve', w, h, VUELVE);
  if (process.argv[4] !== 'solo-vuelve') await liga();
} finally {
  await browser.close();
}
writeFileSync(`${dir}/capturas${process.argv[4] ? '-' + process.argv[4] : ''}.json`, JSON.stringify({ base, datos, errores }, null, 1));
console.log('errores', errores.length, errores.slice(0, 5));
