// Capturas P8b MEGA x2.0 (Edge headless): tarjeta MEGA con selector x1.5 / x2.0 para el jugador nuevo (sin localStorage)
// y para el que ya ganó MEGA x1.5 (x2.0 abierto, dos marcas), a 390x844, 660x372 y 1280x720; y ?ir=mega2 arranca en x2.0.
// Mide solapes del menú, tamaño de los botones de velocidad y si caben en pantalla. Correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/captura-p8b-mega2.mjs <url-base> <carpeta>
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
const GANO15 = {
  'moki.primera': '1', 'moki.tutorial': '1',
  'moki.cuaderno': JSON.stringify({ v: 2, notas: ['cajas3', 'cajas5', 'piezas15'], sellos: [] }),
  'moki.best.mega': '2142', 'moki.best.mega2': '1650',
  'moki.logros': JSON.stringify({ v: 1, ganados: ['mega15'], avisados: ['mega15'], vistos: ['mega15'], retoDia: 0, retoN: 0 }),
};
async function menu(nombre, w, h, ls) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, ls);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/`);
  await page.waitForTimeout(5000);
  const todo = page.locator('.mn-card', { hasText: 'Ver todo' });
  if (await todo.count()) {
    await todo.first().click();
    await page.waitForTimeout(800);
  }
  const tarjeta = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.mn-card')].find((x) => x.querySelector('.mn-vel'));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const dentro = (q) => q.left >= 0 && q.top >= 0 && q.right <= innerWidth && q.bottom <= innerHeight;
    const els = [...document.querySelectorAll('.ui-menu > *, .mn-card')].filter((e) => !e.classList.contains('mn-carril') && !e.classList.contains('mn-grid'));
    const rs = els.map((e) => [e.className, e.getBoundingClientRect()]).filter(([, q]) => q.width > 0 && q.height > 0);
    const solapes = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const [na, A] = rs[i], [nb, B] = rs[j];
      if (A.left < B.right - 1 && B.left < A.right - 1 && A.top < B.bottom - 1 && B.top < A.bottom - 1) solapes.push(`${na}|${nb}`);
    }
    const vel = [...b.querySelectorAll('.mn-vel')].map((v) => { const q = v.getBoundingClientRect(); return { txt: v.textContent, cerrado: v.classList.contains('cerrado'), title: v.title, w: Math.round(q.width), h: Math.round(q.height), dentroTarjeta: q.right <= r.right && q.bottom <= r.bottom }; });
    return { solapes, texto: b.textContent.trim().replace(/\s+/g, ' '), vel, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), dentro: dentro(r) };
  });
  await page.screenshot({ path: `${dir}/${nombre}-${w}x${h}.png` });
  datos.push({ caso: nombre, w, h, tarjeta });
  console.log(nombre, w, h, JSON.stringify(tarjeta));
  await ctx.close();
}
async function liga(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`ir=mega2 ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`ir=mega2 ${m.text()}`));
  await page.goto(`${base}/?ir=mega2&debug`);
  await page.waitForTimeout(6000);
  await page.evaluate(() => { const s = window.__moki.scene.scenes[0]; if (s.screen === 'demo') s.startGame(); s.god = true; });
  await page.waitForTimeout(4000);
  const st = await page.evaluate(() => {
    const s = window.__moki.scene.scenes[0];
    return { screen: s.screen, megaRun: s.megaRun, clasico: !(s.level && s.level.modo), best: s.bestMode(), etiqueta: s.vueltaTagC.visible, pildora: s.vueltaTagC.list.map((o) => o.text).filter(Boolean), fill: s.vueltaTag.fill.toString(16) };
  });
  await page.screenshot({ path: `${dir}/ir-mega2-${w}x${h}.png` });
  datos.push({ caso: 'ir=mega2', w, h, st });
  console.log('ir=mega2', w, h, JSON.stringify(st));
  await ctx.close();
}
try {
  for (const [w, h] of [[390, 844], [660, 372], [1280, 720]]) await menu('nuevo', w, h, {});
  for (const [w, h] of [[390, 844], [660, 372], [1280, 720]]) await menu('gano15', w, h, GANO15);
  await liga(390, 844);
  await liga(1280, 720);
} finally {
  await browser.close();
}
writeFileSync(`${dir}/capturas.json`, JSON.stringify({ base, datos, errores }, null, 1));
console.log('errores', errores.length, errores.slice(0, 5));
