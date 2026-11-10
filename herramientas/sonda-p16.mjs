// Sonda P16 (punto Nuevo en la tarjeta Logros). Headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p16.mjs <url-base> <salida.json> [captura-prefijo]
// Sirve un novedades.json de hoy con donde:['logros'] y revisa, para un jugador nuevo (sin localStorage) y para uno que
// vuelve (moki.primera=1), que la tarjeta Logros traiga el punto, que se apague al abrirla y que no vuelva al recargar.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida, foto] = process.argv.slice(2);
const d = new Date();
const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const NOV = { fecha: hoy, titulo: 'Lo nuevo de hoy: sonda P16', lineas: ['Logros: prueba del punto'], donde: ['logros'] };
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { hoy, casos: [], errores: [] };
const tarjeta = (page) => page.evaluate(() => {
  const b = [...document.querySelectorAll('button, [role=button], .mn-card, div')].find((x) => x.querySelector && x.querySelector(':scope > .tx > b') && /logros/i.test(x.querySelector(':scope > .tx > b').textContent));
  return b ? { texto: b.querySelector('.tx > b').textContent, punto: !!b.querySelector(':scope > .mn-punto') } : null;
});
async function caso(nombre, ls, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route('**/novedades.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NOV) }));
  await ctx.addInitScript((o) => {
    if (sessionStorage.getItem('sembrado')) return;
    sessionStorage.setItem('sembrado', '1');
    localStorage.clear();
    for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
  }, ls);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && out.errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/`);
  await page.waitForTimeout(4000);
  // el que vuelve ve primero el aviso "Lo nuevo desde tu última visita": pasa a "Ver todo"
  const verTodo = page.getByText('Ver todo', { exact: false });
  if (await verTodo.count()) await verTodo.first().click();
  await page.waitForTimeout(800);
  const antes = await tarjeta(page);
  if (foto) await page.screenshot({ path: `${foto}-${nombre}-antes.png` });
  let abierta = false;
  if (antes) {
    await page.getByText(antes.texto, { exact: true }).first().click();
    await page.waitForTimeout(800);
    abierta = await page.evaluate(() => !!window.__moki && !!window.__moki.scene.scenes[0].ui.logrosOpen).catch(() => null);
  }
  const visto = await page.evaluate(() => localStorage.getItem('moki.nuevo.visto.logros'));
  await page.reload();
  await page.waitForTimeout(4000);
  const despues = await tarjeta(page);
  if (foto) await page.screenshot({ path: `${foto}-${nombre}-despues.png` });
  const r = { caso: nombre, tam: `${w}x${h}`, antes, abierta, visto, despues };
  console.log(JSON.stringify(r));
  out.casos.push(r);
  await ctx.close();
}
try {
  await caso('nuevo', {}, 660, 372);
  await caso('vuelve', { 'moki.primera': '1', 'moki.tutorial': '1' }, 1280, 720);
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify(out, null, 1));
console.log('errores', out.errores.length);
