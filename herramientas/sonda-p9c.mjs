// Sonda P9c (de sonda-p9b): geometría del menú (pie, JUGAR, Vota, MEGA) por tamaño y nivel del Cuaderno, solo DOM,
// más recorte del texto de la tira (span contra el pie y el pie contra el menú) y orden visual de marcas y frase.
// Siembra moki.primera=1 y el Cuaderno con todos los encargos de los niveles anteriores (2.ª visita). Headless.
// Uso: node herramientas/sonda-p9c.mjs <url-base> [niveles=1,2,3,4,5,8] [carpeta-capturas] [prefijo]
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, nivArg, capDir, pref] = process.argv.slice(2);
const NIVS = (nivArg || '1,2,3,4,5,8').split(',').map(Number);
const TAMS = [[375, 667], [390, 844], [390, 700], [660, 372], [1280, 720]];
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];

// ids de encargos por nivel, leídos del propio código (stubs mínimos para importarlo en node)
globalThis.__JORGE_INTERVENTIONS__ = 0;
globalThis.window = { location: { search: '' } };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const ids = (await import(new URL('../src/cuaderno.js', import.meta.url))).NIVELES.map((l) => l.map((e) => e.id));
delete globalThis.window;
// el aviso "Lo nuevo desde tu última visita" ya visto: la sonda mide el menú de siempre
const { readFileSync } = await import('node:fs');
const nov = JSON.parse(readFileSync(new URL('../public/novedades.json', import.meta.url), 'utf8'));
const VISITA = `${nov.fecha}|${nov.titulo}`;

const r = (e) => {
  if (!e) return null;
  const b = e.getBoundingClientRect();
  return { x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 };
};

try {
  for (const [W, H] of TAMS) {
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
      page.on('pageerror', (e) => errores.push(`${W}x${H} n${nv}: ${e}`));
      page.on('console', (m) => m.type() === 'error' && errores.push(`${W}x${H} n${nv}: ${m.text()}`));
      await page.route('https://moki.jorgesuarez.com.mx/**', (rt) => rt.fulfill({ status: 200, body: 'ok' }));
      await page.goto(`${base}/`);
      await page.waitForSelector('.mn-hero', { timeout: 60000 });
      await page.waitForTimeout(1500); // fin de la animación de entrada y novedades
      const m = await page.evaluate((src) => {
        const r = new Function(`return ${src}`)();
        const menu = [...document.querySelectorAll('.ui-menu:not(.out)')].pop();
        const q = (s) => menu && menu.querySelector(s);
        const pie = q('.mn-camino') || q('.mn-pie');
        const mega = [...document.querySelectorAll('.mn-card')].find((b) => /MEGA/.test(b.textContent));
        const vis = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return b.right <= innerWidth + 0.5 && b.bottom <= innerHeight + 0.5 && b.left >= -0.5 && b.top >= -0.5; };
        const carril = q('.mn-carril');
        const tarjetasVis = carril ? [...carril.querySelectorAll('.mn-card')].filter((c) => { const b = c.getBoundingClientRect(), k = carril.getBoundingClientRect(); return b.left >= k.left - 1 && b.right <= k.right + 1 && b.top >= k.top - 1 && b.bottom <= k.bottom + 1; }).map((c) => c.querySelector('b')?.textContent || c.textContent.slice(0, 14)) : [];
        return {
          corto: menu?.classList.contains('corto'),
          menu: r(menu), menuSW: menu && [menu.scrollWidth, menu.clientWidth],
          pie: r(pie), pieTxt: pie?.textContent, pieSW: pie && [pie.scrollWidth, pie.clientWidth], pieAria: pie?.getAttribute('aria-label'),
          marcas: pie ? [...pie.querySelectorAll('.mn-paso')].map((p) => p.classList[1]) : [], aria: pie?.getAttribute('aria-label'),
          hero: r(q('.mn-hero')), voto: r(q('.mn-voto')), mega: r(mega),
          vis: { pie: vis(pie), hero: vis(q('.mn-hero')), voto: vis(q('.mn-voto')), mega: vis(mega) },
          menus: document.querySelectorAll('.ui-menu').length, texto: menu?.innerText.replace(/\s+/g, ' ').slice(0, 300), hijos: menu && [...menu.children].map((c) => c.className),
          tarjetasVis, flecha: !!q('.mn-mas') && getComputedStyle(q('.mn-mas')).display !== 'none',
          // P9c: recorte del texto (px que se sale; >0 = recorte) y orden visual de izquierda a derecha
          recorte: (() => {
            const s = pie && pie.querySelector('span');
            if (!s) return null;
            const bs = s.getBoundingClientRect(), bp = pie.getBoundingClientRect(), bm = menu.getBoundingClientRect();
            return { span: Math.round((Math.max(bs.right - bp.right, bp.left - bs.left, 0) + Math.max(s.scrollWidth - s.clientWidth, 0)) * 10) / 10, pie: Math.round(Math.max(bp.right - bm.right, bm.left - bp.left, 0) * 10) / 10, aire: Math.round((bm.right - 3 - bp.right) * 10) / 10 };
          })(),
          orden: pie ? [...pie.children].map((c) => [c.getBoundingClientRect().x, c.tagName === 'SPAN' ? 'TXT' : c.classList[1]]).sort((a, b) => a[0] - b[0]).map((x) => x[1]).join(' ') : null,
        };
      }, r.toString());
      const caja = (a) => a && [a.x, a.y, a.x + a.w, a.y + a.h];
      const choca = (a, b) => { const A = caja(a), B = caja(b); return !!(A && B && A[0] < B[2] - 0.5 && B[0] < A[2] - 0.5 && A[1] < B[3] - 0.5 && B[1] < A[3] - 0.5); };
      m.choques = ['hero', 'voto', 'mega'].filter((k) => choca(m.pie, m[k]));
      console.log(JSON.stringify({ tam: `${W}x${H}`, nivel: nv, ...m }));
      if (capDir) await page.screenshot({ path: `${capDir}/${pref || 'x'}-${W}x${H}-n${nv}.png` });
      await ctx.close();
    }
  }
} finally {
  console.log(JSON.stringify({ errores }));
  await browser.close();
}
