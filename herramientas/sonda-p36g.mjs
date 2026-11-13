// P36g: cuándo sale el cartel de la cinta tras cerrar un arco alto (paso 0) y, en la rama, dónde queda la píldora "+12"
// contra la cara de Moki y el cartel. Bot adjust (ruta de arriba) en Retos con horquilla y Libre; Edge headless.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36g.mjs <url-base> <salida.json> [ancho=1280] [alto=720]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida, W = '1280', H = '720'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const casos = [];
const SEMBRAR = (o) => {
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
async function corre(nombre, ls, seed) {
  const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, { 'moki.primera': '1', 'moki.tutorial': '1', ...ls });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async (sd) => {
    const s = window.__moki.scene.scenes[0];
    const arcos = []; // uno por arco alto cerrado
    const avisos = [];
    let vivo = null; // arco alto en curso de medir (pildora visible)
    const caja = (o) => {
      if (!o || !o.visible) return null;
      const b = o.getBounds();
      // getBounds del contenedor solo mide el texto (no la píldora dibujada): +12 de relleno a los lados, 40 de alto + 5 de sombra
      const sc = o.scaleY || 1;
      return { x0: b.x - 12 * sc, x1: b.x + b.width + 15 * sc, y0: o.y, y1: o.y + 45 * sc };
    };
    const cruza = (a, b) => a && b && a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    const col0 = s.collect.bind(s);
    s.collect = (k) => {
      const antes = k.arc ? s.arcGot[k.arc] || 0 : 0;
      col0(k);
      if (k.alto && antes + 1 === k.arcN) {
        vivo = { t: s.t, kx: Math.round(k.x), ky: Math.round(k.y), px: Math.round(s.px), pies: Math.round(s.y), avisoActivo: s.cinta.avisoT >= 0, avisoTras: null, avisoTxt: null, pisaCara: 0, pisaCartel: 0, cuadros: 0, pillVista: 0 };
        arcos.push(vivo);
      }
    };
    const av0 = s.cinta.showAviso.bind(s.cinta);
    s.cinta.showAviso = (txt, g) => {
      av0(txt, g);
      avisos.push({ t: s.t, txt });
      const a = arcos.findLast((x) => x.avisoTras === null);
      if (a && s.t - a.t < 5000) { a.avisoTras = Math.round(s.t - a.t); a.avisoTxt = txt; }
    };
    const up0 = s.update.bind(s);
    s.update = (t, dt) => {
      up0(t, dt);
      if (!vivo) return;
      if (s.t - vivo.t > 1200) { vivo = null; return; }
      vivo.cuadros += 1;
      const pill = caja(s.pago);
      if (!pill) return;
      vivo.pillVista += 1;
      const pies = s.y; // cara de Moki: franja de la cabeza (ojos y hocico), 44 px de ancho
      const cara = { x0: s.px - 22, x1: s.px + 22, y0: pies - 110, y1: pies - 50 };
      if (cruza(pill, cara)) vivo.pisaCara += 1;
      if (cruza(pill, caja(s.cinta.aviso))) vivo.pisaCartel += 1;
      if (!vivo.caja) vivo.caja = Object.fromEntries(Object.entries(pill).map(([k, v]) => [k, Math.round(v)]));
    };
    const out = await window.__moki.moki.bot('adjust', 200, sd);
    return { result: out.result, score: out.score, pieces: out.pieces, arcos, avisos: avisos.length };
  }, seed);
  console.log(nombre, JSON.stringify({ ...r, arcos: r.arcos.length }));
  casos.push({ caso: nombre, ...r });
  await ctx.close();
}
try {
  for (const d of ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']) await corre(`reto ${d}`, { 'moki.modo': 'reto' }, d);
  for (const sd of ['1037', '1001', '1002']) await corre(`libre ${sd}`, { 'moki.modo': 'libre' }, sd);
} finally {
  await browser.close();
}
const todos = casos.flatMap((c) => c.arcos);
const tras = todos.filter((a) => a.avisoTras !== null).map((a) => a.avisoTras);
const resumen = {
  arcosAltos: todos.length,
  conCartelAntesDe5s: tras.length,
  cartelTrasMs: { min: Math.min(...tras), max: Math.max(...tras), mediana: tras.sort((a, b) => a - b)[tras.length >> 1] },
  cartelEnMenosDe1100ms: tras.filter((x) => x < 1100).length,
  cartelYaActivoAlCerrar: todos.filter((a) => a.avisoActivo).length,
  pillVista: todos.filter((a) => a.pillVista > 0).length,
  cuadrosPisaCara: todos.reduce((n, a) => n + a.pisaCara, 0),
  cuadrosPisaCartel: todos.reduce((n, a) => n + a.pisaCartel, 0),
};
writeFileSync(salida, JSON.stringify({ base, viewport: `${W}x${H}`, resumen, casos, errores }, null, 1));
console.log(JSON.stringify(resumen), 'errores', errores.length);
