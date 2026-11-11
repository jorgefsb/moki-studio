// Sonda P29 sellos de gamedev. 1280x720 headless, jugador nuevo (localStorage vacío) salvo el caso de migración.
// Casos: final y fallo -> clic en Vota (DISEÑADOR, aviso 1 vez; 2o clic sin aviso; luego Espacio reinicia);
// final -> Copiar (EMBAJADOR, portapapeles con ?ref=amigo); ?ir=logros (pistas y ganados); migración v1.
// Uso: node herramientas/sonda-p29.mjs <url-base>
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const logros = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('moki.logros') || 'null'));
// Cuenta TODOS los avisos que aparecieron desde la última lectura (MutationObserver), no solo los que siguen en pantalla
const avisos = (page) => page.evaluate(() => (window.__av || []).splice(0));

async function abrir(pre, query = '?debug&nivel=clasico') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript((pre) => {
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('moki.primera', '1');
    localStorage.setItem('moki.tutorial', '1');
    for (const [k, v] of Object.entries(pre || {})) localStorage.setItem(k, v);
  }, pre);
  await ctx.addInitScript(() => {
    window.__av = [];
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.classList && n.classList.contains('ui-logro') && window.__av.push(n.textContent + ' [' + document.querySelectorAll('.ui-logro').length + ']')))).observe(document, { childList: true, subtree: true });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await page.route('https://moki.jorgesuarez.com.mx/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
  await page.goto(`${base}/${query}`);
  if (query.includes('debug')) await page.waitForFunction(() => window.__moki && window.__moki.scene, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

async function tarjeta(page, tipo) {
  await page.evaluate(async (tipo) => {
    const s = window.__moki.scene.scenes[0];
    s.startGame(); s.tut = { stage: 4, state: 'off' }; s.idleCheck = () => {}; // la sonda no mide el regreso a demo
    if (tipo === 'final') { s.dist = 43200; s.finish(); for (let f = 0; f < 140 && !s.finalShown; f++) s.update(0, 16.667); }
    else { s.god = false; for (let f = 0; f < 900 && !s.cardShown; f++) s.update(f * 16.667, 16.667); }
  }, tipo);
  await page.waitForTimeout(1800); // pasa el bloqueo de reintento y los avisos de la partida (revisarLogros)
}

async function clicVota(ctx, page) {
  if (!(await page.$('.ui-voto'))) return false;
  const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), page.locator('.ui-voto').click()]);
  if (pop) await pop.close();
  await page.bringToFront();
  return true;
}

try {
  for (const tipo of ['final', 'fallo']) {
    const { ctx, page } = await abrir();
    await tarjeta(page, tipo);
    const antes = (await logros(page))?.ganados || [];
    await avisos(page);
    await clicVota(ctx, page);
    await page.waitForTimeout(600);
    const l1 = await logros(page);
    const vota2 = await clicVota(ctx, page); // segundo clic enseguida: entre los dos, un solo aviso
    await page.waitForTimeout(4200);
    const av = await avisos(page);
    const foco = await page.evaluate(() => `${document.activeElement.tagName}.${document.activeElement.className}`);
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
    const pantalla = await page.evaluate(() => window.__moki.scene.scenes[0].screen);
    await page.evaluate(() => window.__moki.scene.scenes[0].goHome());
    await page.waitForTimeout(1200);
    const menuLogros = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /Logros/.test(b.textContent)).map((b) => `${b.textContent} punto=${!!b.querySelector('.mn-punto')}`));
    console.log(JSON.stringify({ caso: `vota-${tipo}`, antes, ganados: l1?.ganados, avisados: l1?.avisados, vota2, avisosTotal: av, foco, espacio: pantalla, menuLogros }));
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir();
    await tarjeta(page, 'final');
    const share = await page.evaluate(() => typeof navigator.share);
    await avisos(page);
    await page.click('.ui-copy');
    await page.waitForTimeout(5500);
    const av = await avisos(page);
    const l = await logros(page);
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch((e) => `ERR ${e}`));
    const boton = await page.textContent('.ui-copy');
    console.log(JSON.stringify({ caso: 'copiar-final', share, ganados: l?.ganados, aviso: av, boton, clip }));
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(null, '?ir=logros');
    await page.waitForSelector('.ui-logros', { timeout: 10000 });
    const items = await page.$$eval('.lg-item', (xs) => xs.map((x) => x.textContent));
    console.log(JSON.stringify({ caso: 'ir-logros-faltan', items }));
    await ctx.close();
  }
  {
    const pre = { 'moki.logros': JSON.stringify({ v: 1, ganados: ['disenador', 'embajador', 'mega15'], avisados: ['disenador', 'embajador', 'mega15'], vistos: [] }) };
    const { ctx, page } = await abrir(pre, '?ir=logros');
    await page.waitForSelector('.ui-logros', { timeout: 10000 });
    const items = await page.$$eval('.lg-item.ganado', (xs) => xs.map((x) => x.textContent));
    console.log(JSON.stringify({ caso: 'ir-logros-ganados', items }));
    await ctx.close();
  }
  {
    // Migración: jugador de antes con mega15 ganado, avisado y visto. No pierde nada; los dos nuevos no se avisan solos.
    const pre = { 'moki.logros': JSON.stringify({ v: 1, ganados: ['mega15', 'todas'], avisados: ['mega15', 'todas'], vistos: ['mega15', 'todas'], retoDia: 5, retoN: 2 }) };
    const { ctx, page } = await abrir(pre, '?debug&nivel=clasico');
    await page.waitForTimeout(1500);
    const menuNuevo = await page.evaluate(() => !!document.querySelector('.ui-menu .mn-nuevo, .ui-menu [class*="nuevo"]'));
    const av = await avisos(page);
    const l = await logros(page);
    await tarjeta(page, 'final');
    await avisos(page);
    await clicVota(ctx, page);
    await page.waitForTimeout(5500);
    const l2 = await logros(page);
    const av2 = await avisos(page);
    console.log(JSON.stringify({ caso: 'migracion', alCargar: l, avisosAlCargar: av, menuNuevoAlCargar: menuNuevo, trasVota: l2, avisoTrasVota: av2 }));
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log('errores', errores.length, errores.slice(0, 5));
