// P26: mide MEGA en vista, recortes DOM del héroe, Vota, flecha vs tarjetas, textos del selector. Headless.
// Uso: node medir-p26.mjs <url-base> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, out] = process.argv.slice(2);
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
const MEDIR = () => {
  const W = innerWidth, H = innerHeight, T = 0.5;
  const R = (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; };
  const clipAnc = (e) => { const a = []; let p = e.parentElement; while (p && p !== document.body) { const s = getComputedStyle(p); if (s.overflowX !== 'visible' || s.overflowY !== 'visible') a.push(p); p = p.parentElement; } return a; };
  const fuera = (r, c) => r.left < c.left - T || r.right > c.right + T || r.top < c.top - T || r.bottom > c.bottom + T;
  const recorte = (e) => {
    const r = e.getBoundingClientRect();
    const res = [];
    if (fuera(r, { left: 0, top: 0, right: W, bottom: H })) res.push('ventana');
    for (const a of clipAnc(e)) if (fuera(r, a.getBoundingClientRect())) res.push(a.className || a.tagName);
    // texto que se sale de su propia caja
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible') res.push('texto-x');
    return res;
  };
  // texto que se sale del padre visible (desborde visual)
  const desborda = (e) => { const p = e.parentElement; if (!p) return false; return fuera(e.getBoundingClientRect(), p.getBoundingClientRect()); };
  const menu = document.querySelector('.ui-menu');
  if (!menu) return { menu: 'no' };
  const mega = [...menu.querySelectorAll('.mn-card')].find((x) => /^\s*MEGA/i.test(x.textContent));
  const logros = [...menu.querySelectorAll('.mn-card')].find((x) => /logros/i.test(x.textContent));
  const hero = menu.querySelector('.mn-hero');
  const voto = menu.querySelector('.mn-voto');
  const mas = menu.querySelector('.mn-mas');
  const masVis = mas && getComputedStyle(mas).display !== 'none';
  const inter = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  const items = {};
  const add = (k, e, top) => { if (!e) return; items[k] = { rect: R(e), recorte: recorte(e), desborda: desborda(e) || (top ? fuera(e.getBoundingClientRect(), top.getBoundingClientRect()) : false), font: getComputedStyle(e).fontSize, txt: e.textContent.trim().slice(0, 40) }; };
  add('mega', mega);
  if (mega) {
    mega.querySelectorAll('b, span, .mn-vel').forEach((e, i) => add(`mega.${e.className || e.tagName}.${i}`, e, mega));
  }
  add('logros', logros);
  add('hero', hero);
  if (hero) hero.querySelectorAll('b, span').forEach((e, i) => add(`hero.${e.tagName}.${i}`, e, hero));
  add('voto', voto);
  if (voto) voto.querySelectorAll('b, span, em').forEach((e, i) => add(`voto.${e.className || e.tagName}.${i}`, e, voto));
  const tapa = masVis ? [...menu.querySelectorAll('.mn-card')].filter((c) => {
    const cr = c.getBoundingClientRect();
    // solo tarjetas en vista dentro del carril
    const g = c.parentElement.getBoundingClientRect();
    const vis = cr.right > g.left + 1 && cr.left < g.right - 1;
    return vis && inter(cr, mas.getBoundingClientRect());
  }).map((c) => c.textContent.trim().slice(0, 14)) : [];
  const x2 = mega && [...mega.querySelectorAll('.mn-vel')].find((b) => /2\.0/.test(b.textContent));
  const x2s = x2 && getComputedStyle(x2);
  return {
    W, H, cls: menu.className, menuRect: R(menu), menuScroll: { sh: menu.scrollHeight, ch: menu.clientHeight, sw: menu.scrollWidth, cw: menu.clientWidth },
    megaEnVista: mega ? !recorte(mega).length : false,
    masVisible: !!masVis, masRect: masVis ? R(mas) : null, flechaTapa: tapa,
    x2: x2s ? { cerrado: x2.classList.contains('cerrado'), color: x2s.color, bg: x2s.backgroundColor, borde: x2s.borderTopColor, estilo: x2s.borderTopStyle, font: x2s.fontSize } : null,
    tarjetas: [...menu.querySelectorAll('.mn-card')].map((c) => c.textContent.trim().slice(0, 12)),
    items,
  };
};
async function caso(nombre, w, h, ls) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, ls);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${w} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${w} ${m.text()}`));
  await page.goto(`${base}/`);
  await page.waitForTimeout(5000);
  const todo = page.locator('.mn-card', { hasText: 'Ver todo' });
  if (await todo.count()) { await todo.first().click(); await page.waitForTimeout(800); }
  const m = await page.evaluate(MEDIR);
  datos.push({ caso: nombre, w, h, m });
  const malos = Object.entries(m.items || {}).filter(([, v]) => v.recorte.length || v.desborda).map(([k, v]) => `${k}:${v.recorte.join('+')}${v.desborda ? '+desborda' : ''}`);
  console.log(`${nombre} ${w}x${h} megaEnVista=${m.megaEnVista} flechaTapa=[${m.flechaTapa}] recortes=${malos.length} ${malos.join(' | ')}`);
  await ctx.close();
}
try {
  for (const [w, h] of [[660, 372], [390, 844]]) { await caso('nuevo', w, h, {}); await caso('gano15', w, h, GANO15); }
} finally {
  await browser.close();
}
writeFileSync(out, JSON.stringify({ base, datos, errores }, null, 1));
console.log('errores', errores.length, errores.slice(0, 5));
