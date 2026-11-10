// P8 vuelta chica: además mide solapes del menú y el ancho de la fila contra JUGAR, y la píldora MEGA en partida a 3 tamaños.
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
    const els = [...document.querySelectorAll('.ui-menu > *, .mn-card')].filter((e) => !e.classList.contains('mn-carril') && !e.classList.contains('mn-grid'));
    const rs = els.map((e) => [e.className, e.getBoundingClientRect()]).filter(([, q]) => q.width > 0 && q.height > 0);
    const solapes = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const [na, A] = rs[i], [nb, B] = rs[j];
      if (A.left < B.right - 1 && B.left < A.right - 1 && A.top < B.bottom - 1 && B.top < A.bottom - 1) solapes.push(`${na}|${nb}`);
    }
    const hero = document.querySelector('.mn-hero').getBoundingClientRect();
    const cards = [...document.querySelectorAll('.mn-card')].map((c) => c.getBoundingClientRect());
    const fila = cards.length ? Math.round(Math.max(...cards.map((c) => c.right)) - Math.min(...cards.map((c) => c.left))) : 0;
    const borde = getComputedStyle(b).borderStyle;
    return { solapes, anchoJugar: Math.round(hero.width), anchoFila: fila, borde, texto: b.textContent.trim().replace(/\s+/g, ' '), cerrado: b.classList.contains('cerrado'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), dentro };
  });
  await page.screenshot({ path: `${dir}/${nombre}-${w}x${h}.png` });
  datos.push({ caso: nombre, w, h, tarjeta });
  console.log(nombre, w, h, JSON.stringify(tarjeta));
  await ctx.close();
}
async function liga(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`ir=mega ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`ir=mega ${m.text()}`));
  await page.goto(`${base}/?ir=mega&debug`);
  await page.waitForTimeout(6000);
  await page.evaluate(() => { const s = window.__moki.scene.scenes[0]; if (s.screen === 'demo') s.startGame(); s.god = true; });
  await page.waitForTimeout(4000);
  const st = await page.evaluate(() => {
    const s = window.__moki.scene.scenes[0];
    return { screen: s.screen, megaRun: !!s.megaRun, clasico: !(s.level && s.level.modo), best: s.bestMode(), etiqueta: s.vueltaTagC.visible, fill: s.vueltaTag.fill.toString(16) };
  });
  await page.screenshot({ path: `${dir}/ir-mega-${w}x${h}.png` });
  datos.push({ caso: 'ir=mega', w, h, st });
  console.log('ir=mega', w, h, JSON.stringify(st));
  await ctx.close();
}
try {
  if (process.argv[4] !== 'solo-vuelve') for (const [w, h] of [[390, 844], [660, 372], [1280, 720]]) await menu('nuevo', w, h, {});
  for (const [w, h] of [[390, 844], [660, 372], [1280, 720]]) await menu('vuelve', w, h, VUELVE);
  if (process.argv[4] !== 'solo-vuelve') for (const [w, h] of [[390, 844], [660, 372], [1280, 720]]) await liga(w, h);
} finally {
  await browser.close();
}
writeFileSync(`${dir}/capturas${process.argv[4] ? '-' + process.argv[4] : ''}.json`, JSON.stringify({ base, datos, errores }, null, 1));
console.log('errores', errores.length, errores.slice(0, 5));
