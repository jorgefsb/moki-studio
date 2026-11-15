// P40e-a (constructor, 15-nov): ¿la píldora del pago tapa el globo del fondo? En cada cuadro con píldora y globo visibles
// mide, en px de pantalla, cuánto del globo queda bajo la caja de papel de la píldora (texto + 24 px de relleno x escala).
// "tapado" = más de 10 % del área del globo bajo la píldora. Pasa con 0 cuadros tapados por corrida.
// Corridas: 1.ª partida adjust, 1.ª partida mixto, Clásico adjust, Reto 2026-11-14 adjust.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p40ea-globo.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, corridas: [], errores: [] };
const CORRIDAS = [
  { nombre: 'nuevo 1a partida adjust', ls: null, bot: 'adjust', seed: null },
  { nombre: 'nuevo 1a partida mixto', ls: null, bot: 'mixto', seed: null },
  { nombre: 'clasico adjust', ls: {}, bot: 'adjust', seed: null },
  { nombre: 'reto 2026-11-14 adjust', ls: { 'moki.modo': 'reto' }, bot: 'adjust', seed: '2026-11-14' },
];
try {
  for (const c of CORRIDAS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript((ls) => {
      let a = 1037;
      Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      localStorage.setItem('moki.tutorial', '1');
      if (ls) { localStorage.setItem('moki.primera', '1'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); }
    }, c.ls);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${c.nombre} ${String(e).slice(0, 300)}`));
    page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && out.errores.push(`${c.nombre} ${m.text()}`));
    await page.goto(`${url}/?debug`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const r = await page.evaluate(async ({ bot, seed }) => {
      const sc = window.__moki.scene.scenes[0];
      const r = { cuadrosAmbos: 0, tapados: 0, maxFrac: 0, peor: null, globos: 0, pildoras: 0 };
      const orig = sc.update.bind(sc);
      let g0 = null;
      const caja = (o, sf) => {
        const cam = sc.cameras.main, z = cam.zoom, v = cam.worldView, b = o.getBounds();
        const ox = sf ? v.x : 0, oy = sf ? v.y : 0;
        return [(b.x - ox) * z, (b.y - oy) * z, (b.right - ox) * z, (b.bottom - oy) * z];
      };
      sc.update = (a, b) => {
        const x = orig(a, b);
        const am = sc.ambient, g = am && am.slow && am.slow.sprites[0];
        if (g && g !== g0) (g0 = g), r.globos++;
        if (sc.pago && sc.pago.visible && sc.pago.alpha > 0.3) { // franja de pantalla que ocupa cada clase de píldora (suelta '+N' o de cierre)
          const t = sc.pago.list.find((q) => q.type === 'Text'), tb = caja(t, true), k = /^\+/.test(t.text) ? 'suelta' : 'cierre';
          const f = (r.franja = r.franja || {})[k] || (r.franja[k] = [1e9, -1e9, 1e9, -1e9]);
          f[0] = Math.round(Math.min(f[0], tb[1])), f[1] = Math.round(Math.max(f[1], tb[3])), f[2] = Math.round(Math.min(f[2], tb[0])), f[3] = Math.round(Math.max(f[3], tb[2]));
        }
        if (g && g.visible && g.alpha > 0.3) { const gb = caja(g, g.scrollFactorX !== 0); r.globoY = [Math.round(Math.min((r.globoY || [1e9])[0], gb[1])), Math.round(Math.max((r.globoY || [0, -1e9])[1], gb[3]))]; }
        if (!(g && g.active && g.visible && g.alpha > 0.3 && sc.pago && sc.pago.visible && sc.pago.alpha > 0.3)) return x;
        r.cuadrosAmbos++;
        const gb = caja(g, g.scrollFactorX !== 0);
        const t = sc.pago.list.find((q) => q.type === 'Text');
        const tb = caja(t, sc.pago.scrollFactorX !== 0), pad = 12 * sc.pago.scaleX * sc.cameras.main.zoom;
        const pb = [tb[0] - pad, tb[1] - pad, tb[2] + pad, tb[3] + pad];
        const iw = Math.max(0, Math.min(gb[2], pb[2]) - Math.max(gb[0], pb[0])), ih = Math.max(0, Math.min(gb[3], pb[3]) - Math.max(gb[1], pb[1]));
        const frac = (iw * ih) / Math.max(1, (gb[2] - gb[0]) * (gb[3] - gb[1]));
        if (frac > 0.1) r.tapados++;
        if (frac > r.maxFrac) (r.maxFrac = +frac.toFixed(3)), (r.peor = { t: Math.round(sc.t), globo: gb.map(Math.round), pildora: pb.map(Math.round), texto: t.text });
        return x;
      };
      const oP = sc.showPago.bind(sc);
      sc.showPago = (...a) => { r.pildoras++; return oP(...a); };
      const res = await window.__moki.moki.bot(bot, 200, seed);
      sc.update = orig;
      sc.showPago = oP;
      r.res = { result: res.result, meters: res.meters, pieces: res.pieces };
      return r;
    }, { bot: c.bot, seed: c.seed });
    out.corridas.push({ nombre: c.nombre, ...r });
    await ctx.close();
  }
} catch (e) {
  out.errores.push(String(e).slice(0, 500));
}
await browser.close();
writeFileSync(salida, JSON.stringify(out, null, 1));
for (const c of out.corridas) console.log(tam, c.nombre, 'globos', c.globos, 'pildoras', c.pildoras, 'ambos', c.cuadrosAmbos, 'tapados', c.tapados, 'max', c.maxFrac, JSON.stringify(c.peor), 'franja', JSON.stringify(c.franja), 'globoY', JSON.stringify(c.globoY));
console.log('errores', out.errores.length, out.errores.slice(0, 3));
