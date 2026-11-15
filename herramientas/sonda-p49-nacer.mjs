// P49 (15-nov): NADA APARECE DE GOLPE DENTRO DE LA PANTALLA. Paso 0 sobre master, sin cambiar el juego.
// Engancha spawnObstacle / spawnPickup / spawnFlag (y timbre y zanja, que pasan por spawnObstacle) y guarda todos los
// objetos de juego que nace cada llamada. Cada cuadro mide su caja en px de pantalla; en el PRIMER cuadro en que se ve
// (visible, alfa > 0.02, alto > 0 y tocando el lienzo) anota cuántos px dentro del borde derecho aparece su orilla izquierda.
// Un objeto que entra deslizándose aparece a lo más un paso de cuadro dentro (paso = lo que avanzó el mundo ese cuadro).
// 'de golpe' = aparece más de paso + 2 px dentro del borde derecho (o en cualquier borde que no sea el derecho).
// 'animado' = aparece dentro pero su escala o alfa cambia en los 8 cuadros siguientes (entrada con pop de boceto §5): se reporta, no falla.
// Pop-ups (la caja que sube del suelo a propósito, C.popup) se cuentan aparte: su aviso nace dentro por diseño.
// Además: 'sombra antes' = la sombra de un dueño se ve uno o más cuadros antes que su objeto.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p49-nacer.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, corridas: [], errores: [] };
const CORRIDAS = [
  { nombre: 'clasico base', ls: {}, bot: 'adjust', seed: null, q: '&nivel=clasico' },
  { nombre: 'reto 2026-11-14', ls: { 'moki.modo': 'reto' }, bot: 'adjust', seed: '2026-11-14' },
  { nombre: 'libre 1037', ls: { 'moki.modo': 'libre' }, bot: 'adjust', seed: '1037' },
  { nombre: 'mega x1.5', ls: {}, bot: 'adjust', seed: null, q: '&ir=mega' },
  { nombre: 'mega x2.0', ls: {}, bot: 'adjust', seed: null, q: '&ir=mega2' },
];
const SOLO = process.argv[5];
try {
  for (const c of CORRIDAS) {
    if (SOLO && !c.nombre.includes(SOLO)) continue;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript((ls) => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      localStorage.setItem('moki.tutorial', '1');
      localStorage.setItem('moki.primera', '1');
      for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
    }, c.ls);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${c.nombre} ${String(e).slice(0, 300)}`));
    page.on('console', (m) => m.type() === 'error' && out.errores.push(`${c.nombre} ${m.text().slice(0, 300)}`));
    await page.goto(`${url}/?debug${c.q || ''}`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async ([bot, seed]) => {
      const sc = window.__moki.scene.scenes[0];
      const cv = sc.game.canvas.getBoundingClientRect();
      const r = { lienzo: [Math.round(cv.width), Math.round(cv.height)], mega: null, objetos: 0, vistos: 0, golpe: 0, golpePop: 0, animado: 0, cuadro: 0, sombraAntes: 0, peor: [], porTipo: {}, ej: [], ejSombra: [] };
      const vivos = []; // { o, tipo, dueño, pop, prevL, visto }
      let dueno = 0;
      const engancha = (nombre, tipoDe) => {
        const f = sc[nombre].bind(sc);
        sc[nombre] = (e, ...a) => {
          const antes = new Set(sc.children.list);
          const x = f(e, ...a);
          const d = ++dueno;
          const tipo = tipoDe(e, ...a);
          for (const o of sc.children.list) if (!antes.has(o)) vivos.push({ o, tipo, d, pop: !!(e && e.pop), key: o.texture ? o.texture.key : o.type, prevL: null, visto: false, nace: Math.round(sc.t) });
          return x;
        };
      };
      engancha('spawnObstacle', (e) => `obs:${e.type}`);
      engancha('spawnPickup', (e) => (e.amber ? 'pieza:ambar' : 'pieza'));
      engancha('spawnFlag', (D, meta) => (meta ? 'meta' : 'bandera'));
      const primeraVez = {}; // dueño -> { sombra: t, obj: t }
      const oUp = sc.update.bind(sc);
      sc.update = (t, dt) => {
        const x = oUp(t, dt);
        if (r.mega == null) r.mega = sc.megaOn || 0;
        if (sc.screen !== 'play') return x;
        r.cuadro++;
        const cam = sc.cameras.main, z = cam.zoom, wv = cam.worldView, k = cam.width / cv.width;
        for (const v of vivos) {
          const o = v.o;
          if (!o.active || !o.getBounds) { if (o.active && !v.sinCaja) (v.sinCaja = true), (r.sinCaja = (r.sinCaja || 0) + 1); continue; }
          const b = o.getBounds();
          const L = ((b.x - wv.x) * z) / k, R = ((b.right - wv.x) * z) / k, T = ((b.y - wv.y) * z) / k, B = ((b.bottom - wv.y) * z) / k;
          const alto = o.isCropped && o._crop ? o._crop.height : b.height;
          const ve = o.visible && o.alpha > 0.02 && alto > 0.5 && R > 0 && L < cv.width && B > 0 && T < cv.height;
          if (ve && !v.visto) {
            v.visto = true;
            r.vistos++;
            const paso = v.prevL == null ? 0 : Math.max(0, v.prevL - L);
            const dentro = cv.width - L;
            // entrada animada: en los 8 cuadros siguientes cambia su escala o su alfa (pop de boceto §5): no es 'de golpe'
            v.s0 = [o.scaleX, o.alpha, o.scaleY]; v.f0 = r.cuadro;
            const golpe = dentro > paso + 2;
            const esSombra = v.key === 'shadow';
            const pf = (primeraVez[v.d] = primeraVez[v.d] || {});
            if (esSombra) pf.sombra = pf.sombra ?? sc.t; else pf.obj = pf.obj ?? sc.t;
            const pt = (r.porTipo[`${v.tipo}${v.pop ? '(pop)' : ''} ${esSombra ? 'sombra' : v.key}`] = r.porTipo[`${v.tipo}${v.pop ? '(pop)' : ''} ${esSombra ? 'sombra' : v.key}`] || { n: 0, golpe: 0, maxDentro: 0 });
            pt.n++;
            if (golpe) v.pend = { pt, dentro, paso, L };
            if (false) {
              pt.golpe++;
              pt.maxDentro = Math.max(pt.maxDentro, Math.round(dentro));
              if (v.pop) r.golpePop++; else r.golpe++;
              if (r.ej.length < 8 && !v.pop) r.ej.push({ t: Math.round(sc.t), tipo: v.tipo, key: v.key, dentro: Math.round(dentro), paso: Math.round(paso), L: Math.round(L), nace: v.nace });
            }
          }
          if (v.pend && (Math.abs(o.scaleX - v.s0[0]) > 0.02 * Math.abs(v.s0[0] || 1) || Math.abs(o.scaleY - v.s0[2]) > 0.02 || Math.abs(o.alpha - v.s0[1]) > 0.05)) { v.pend.pt.animado = (v.pend.pt.animado || 0) + 1; r.animado++; v.pend = null; }
          else if (v.pend && r.cuadro - v.f0 >= 8) {
            const { pt, dentro, paso, L: L0 } = v.pend;
            v.pend = null;
            pt.golpe++;
            pt.maxDentro = Math.max(pt.maxDentro, Math.round(dentro));
            if (v.pop) r.golpePop++; else r.golpe++;
            if (r.ej.length < 8 && !v.pop) r.ej.push({ t: Math.round(sc.t), tipo: v.tipo, key: v.key, dentro: Math.round(dentro), paso: Math.round(paso), L: Math.round(L0), nace: v.nace });
          }
          v.prevL = L;
        }
        for (const [d, pf] of Object.entries(primeraVez)) {
          if (pf.sombra != null && pf.obj != null && !pf.cont) {
            pf.cont = true;
            if (pf.sombra < pf.obj - 1) { r.sombraAntes++; if (r.ejSombra.length < 6) r.ejSombra.push({ d, adelantoMs: Math.round(pf.obj - pf.sombra), tipo: (vivos.find((v) => v.d == d) || {}).tipo, pop: (vivos.find((v) => v.d == d) || {}).pop }); }
          }
        }
        return x;
      };
      const res = await window.__moki.moki.bot(bot, 200, seed);
      sc.update = oUp;
      r.objetos = vivos.length;
      r.res = { result: res.result, meters: res.meters, pieces: res.pieces };
      return r;
    }, [c.bot, c.seed]);
    out.corridas.push({ nombre: c.nombre, ...r });
    await ctx.close();
  }
} catch (e) {
  out.errores.push(String(e).slice(0, 500));
} finally {
  await browser.close();
}
const s = (q) => out.corridas.reduce((a, c) => a + c[q], 0);
out.resumen = { objetos: s('objetos'), vistos: s('vistos'), golpe: s('golpe'), golpePop: s('golpePop'), animado: s('animado'), sombraAntes: s('sombraAntes'), errores: out.errores.length };
writeFileSync(salida, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.resumen));
for (const c of out.corridas) {
  console.log(`${c.nombre} mega=${c.mega} objetos ${c.objetos} vistos ${c.vistos} golpe ${c.golpe} animado ${c.animado} pop ${c.golpePop} sombraAntes ${c.sombraAntes} res ${JSON.stringify(c.res)}`);
  for (const [k, v] of Object.entries(c.porTipo)) if (v.golpe || v.animado) console.log('   ', k, JSON.stringify(v));
  if (c.ej.length) console.log('    ej', JSON.stringify(c.ej.slice(0, 3)));
  if (c.ejSombra.length) console.log('    sombra', JSON.stringify(c.ejSombra.slice(0, 3)));
}
