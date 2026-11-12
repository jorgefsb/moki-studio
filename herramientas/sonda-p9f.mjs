// Sonda P9f: qué dice el pie del camino y qué dice la lista de paradas, por nivel del Cuaderno (2.ª visita).
// Siembra como sonda-p9c (moki.primera, tutorial, cuaderno con las notas de los niveles anteriores, aviso visto). Headless.
// Uso: node herramientas/sonda-p9f.mjs <url-base> [niveles=1,2,3,4,5,6,7,8] [WxH=390x844] [captura-prefijo]
// Con captura-prefijo corre el carril hasta la tarjeta Nivel 4 y guarda <prefijo>-n<nivel>.png (pie y lista a la vista).
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, nivArg, tam, cap] = process.argv.slice(2);
const NIVS = (nivArg || '1,2,3,4,5,6,7,8').split(',').map(Number);
const [W, H] = (tam || '390x844').split('x').map(Number);
globalThis.__JORGE_INTERVENTIONS__ = 0;
globalThis.window = { location: { search: '' } };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const ids = (await import(new URL('../src/cuaderno.js', import.meta.url))).NIVELES.map((l) => l.map((e) => e.id));
delete globalThis.window;
const { readFileSync } = await import('node:fs');
const nov = JSON.parse(readFileSync(new URL('../public/novedades.json', import.meta.url), 'utf8'));
const VISITA = `${nov.fecha}|${nov.titulo}`;
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
try {
  for (const nv of NIVS) {
    const notas = ids.slice(0, nv - 1).flat();
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await ctx.addInitScript(([notas, VISITA]) => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      localStorage.setItem('moki.primera', '1');
      localStorage.setItem('moki.tutorial', '1');
      localStorage.setItem('moki.cuaderno', JSON.stringify({ v: 2, notas, sellos: [] }));
      localStorage.setItem('moki.nov.visita', VISITA);
    }, [notas, VISITA]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`n${nv}: ${e}`));
    page.on('console', (m) => m.type() === 'error' && errores.push(`n${nv}: ${m.text()}`));
    await page.route('https://moki.jorgesuarez.com.mx/**', (rt) => rt.fulfill({ status: 200, body: 'ok' }));
    await page.goto(`${base}/`);
    await page.waitForSelector('.mn-hero', { timeout: 60000 });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const menu = [...document.querySelectorAll('.ui-menu:not(.out)')].pop();
      const pie = menu.querySelector('.mn-camino');
      const paradas = [...menu.querySelectorAll('.mn-card')]
        .filter((c) => /^Nivel \d/.test(c.querySelector('b')?.textContent || ''))
        .map((c) => ({ nombre: c.querySelector('b').textContent, hecho: !!c.querySelector('.mn-hecho'), nuevo: !!c.querySelector('.mn-punto'), cerrado: c.classList.contains('cerrado'), linea: c.querySelector('span')?.textContent }));
      return { pie: pie?.textContent, aria: pie?.getAttribute('aria-label'), marcas: pie ? [...pie.querySelectorAll('.mn-paso')].map((p) => p.classList[1]) : [], paradas };
    });
    console.log(JSON.stringify({ nivel: nv, ...m }));
    if (cap) {
      await page.evaluate(() => [...document.querySelectorAll('.mn-card')].find((c) => /^Nivel 4/.test(c.querySelector('b')?.textContent || ''))?.scrollIntoView({ inline: 'center', block: 'nearest' }));
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${cap}-n${nv}.png` });
    }
    await ctx.close();
  }
} finally {
  console.log(JSON.stringify({ errores }));
  await browser.close();
}
