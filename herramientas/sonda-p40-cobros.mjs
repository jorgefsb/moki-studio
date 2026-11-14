// P40 (14-nov): UN NÚMERO POR COSA. Cada cobro (cada collect) mide el salto del contador del HUD y lo compara con lo que flota.
// Pasa si, en el 100 % de los cobros: HUD = pieceValue; salto del HUD = delta de pieceValue; la píldora que nace en ese cobro
// dice exactamente "+delta" (con sufijo "xN" opcional de la racha de horquillas); el aviso de la cinta de piezas no trae dígitos
// fuera de "x2"/"x3"; el chip del HUD no trae "+". Al final de cada partida, la fila "Piezas" de la tarjeta = HUD.
// Corridas: Libre 1037 adjust (sube todas: x1, x2, x3), Libre 1037 abajo (a ras), Libre 1037 mixto (sube 2, ras 1: se rompe),
// Reto 2026-11-14 adjust, 1.ª partida de jugador nuevo adjust (la horquilla P36k paga x1).
// P40a: corrida 1.ª partida abajo; en las dos de 1.ª partida, letrero de la ruta = píldora al cerrarla (+15 arriba, +7 a ras).
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p40-cobros.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, corridas: [], errores: [] };
const CORRIDAS = [
  { nombre: 'libre 1037 adjust', ls: { 'moki.modo': 'libre' }, bot: 'adjust', seed: '1037' },
  { nombre: 'libre 1037 abajo', ls: { 'moki.modo': 'libre' }, bot: 'abajo', seed: '1037' },
  { nombre: 'libre 1037 mixto', ls: { 'moki.modo': 'libre' }, bot: 'mixto', seed: '1037' },
  { nombre: 'reto 2026-11-14 adjust', ls: { 'moki.modo': 'reto' }, bot: 'adjust', seed: '2026-11-14' },
  { nombre: 'nuevo 1a partida adjust', ls: null, bot: 'adjust', seed: null, primera: 'arriba' },
  { nombre: 'nuevo 1a partida abajo', ls: null, bot: 'abajo', seed: null, primera: 'ras' },
];
const SOLO = process.argv[5]; // P40a: filtro opcional por nombre (p. ej. 'nuevo')
try {
  for (const c of CORRIDAS) {
    if (SOLO && !c.nombre.includes(SOLO)) continue;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript((ls) => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      localStorage.setItem('moki.tutorial', '1');
      if (ls) { localStorage.setItem('moki.primera', '1'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); }
    }, c.ls);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${c.nombre} ${String(e).slice(0, 300)}`));
    page.on('console', (m) => m.type() === 'error' && out.errores.push(`${c.nombre} ${m.text().slice(0, 300)}`));
    await page.goto(`${url}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async ([bot, seed, primera]) => {
      const sc = window.__moki.scene.scenes[0];
      const num = (s) => { const m = String(s || '').match(/^\s*(\d+)/); return m ? +m[1] : null; };
      let hudLast = null;
      const oSet = sc.pieceLabel.set;
      sc.pieceLabel.set = (t) => { hudLast = t; return oSet.call(sc.pieceLabel, t); };
      const hudTxt = () => hudLast;
      const r = { cobros: [], avisos: [], fallos: [], finHud: null, tarjeta: null, letreros: null, letreroCierre: null };
      // P40a: los letreros de la horquilla de la 1.ª partida (o.rot) dicen la misma cifra que la píldora al cerrar cada ruta
      const leeLetreros = () => {
        if (r.letreros) return;
        const o = sc.obstacles.find((x) => x.rot);
        if (o) r.letreros = o.rot.map((c) => (c.list.find((q) => q.type === 'Text') || {}).text);
      };
      let pild = null;
      const oPago = sc.showPago.bind(sc);
      sc.showPago = (...a) => { const x = oPago(...a); pild = (sc.pago.list.find((o) => o.type === 'Text') || {}).text; return x; };
      const oAviso = sc.cinta.showAviso.bind(sc.cinta);
      sc.cinta.showAviso = (text, g) => { r.avisos.push(text); if (!/^x[23]$/.test(text)) r.fallos.push({ que: 'aviso con cifra', text }); return oAviso(text, g); };
      const oc = sc.collect.bind(sc);
      sc.collect = (k) => {
        leeLetreros();
        const v0 = sc.pieceValue, h0 = num(hudTxt());
        pild = null;
        const antes = (k.arc && sc.arcGot[k.arc]) || 0;
        const x = oc(k);
        const d = sc.pieceValue - v0, h1txt = hudTxt(), h1 = num(h1txt);
        const cierre = k.arc && antes + 1 === k.arcN ? (k.alto ? 'arriba' : k.ras ? 'ras' : 'arco') : null;
        const ruta = cierre || (k.amber ? 'ambar' : `pieza x${d / (k.amber ? 5 : 1)}`);
        const row = { t: Math.round(sc.t), ruta, d, hud: h1txt, pild, hq: sc.hqRacha };
        r.cobros.push(row);
        if (h1 !== sc.pieceValue) r.fallos.push({ que: 'HUD != pieceValue', ...row, pv: sc.pieceValue });
        if (h0 != null && h1 - h0 !== d) r.fallos.push({ que: 'salto HUD != delta', ...row, h0 });
        if (/\+/.test(String(h1txt).replace(/^\s*\d+/, ''))) r.fallos.push({ que: 'chip con +', ...row });
        if (pild != null) {
          const m = String(pild).match(/\+(\d+)\s*$/);
          if (!m || +m[1] !== d) r.fallos.push({ que: 'pildora != delta', ...row });
        }
        if (primera && cierre === primera) {
          const re = primera === 'arriba' ? /^Arriba \+(\d+)$/ : /^A ras \+(\d+)$/;
          const txt = (r.letreros || []).find((x) => re.test(String(x)));
          const n = txt ? +String(txt).match(re)[1] : null;
          r.letreroCierre = { ruta: primera, letrero: txt || null, pild, d };
          if (n !== d) r.fallos.push({ que: 'letrero != pildora', ...row, letrero: txt || null });
        }
        if ((cierre === 'arriba' || cierre === 'ras') && pild == null) r.fallos.push({ que: 'cierre sin pildora', ...row });
        return x;
      };
      const res = await window.__moki.moki.bot(bot, 200, seed);
      if (primera && !r.letreroCierre) r.fallos.push({ que: 'primera sin cierre de su ruta', primera, letreros: r.letreros });
      r.res = { result: res.result, cause: res.cause, meters: res.meters, pieces: res.pieces, valor: sc.pieceValue };
      r.finHud = num(hudTxt());
      if (sc.screen === 'final') {
        for (let i = 0; i < 200 && !document.querySelector('.ui-card'); i++) {
          sc.update(0, 16.7);
          await new Promise((ok) => setTimeout(ok, 16));
        }
        const card = document.querySelector('.ui-card');
        const dts = card ? [...card.querySelectorAll('dt')] : [];
        const fila = dts.find((dt) => /Piezas|Papel/.test(dt.textContent));
        r.tarjeta = fila ? fila.nextElementSibling.textContent : null;
        if (num(r.tarjeta) !== r.finHud) r.fallos.push({ que: 'tarjeta != HUD', tarjeta: r.tarjeta, hud: r.finHud });
      }
      sc.collect = oc;
      sc.pieceLabel.set = oSet;
      sc.showPago = oPago;
      sc.cinta.showAviso = oAviso;
      return r;
    }, [c.bot, c.seed, c.primera || null]);
    const rutas = {};
    for (const x of r.cobros) rutas[x.ruta + (x.ruta === 'arriba' ? ` hq${x.hq}` : '')] = (rutas[x.ruta + (x.ruta === 'arriba' ? ` hq${x.hq}` : '')] || 0) + 1;
    const pildoras = r.cobros.filter((x) => x.pild != null).map((x) => `${x.ruta}:${x.pild}=${x.d}`);
    out.corridas.push({ nombre: c.nombre, res: r.res, cobros: r.cobros.length, rutas, pildoras, avisos: r.avisos, letreros: r.letreros, letreroCierre: r.letreroCierre, tarjeta: r.tarjeta, finHud: r.finHud, fallos: r.fallos.slice(0, 30), nFallos: r.fallos.length });
    console.log(c.nombre, JSON.stringify({ cobros: r.cobros.length, nFallos: r.fallos.length, tarjeta: r.tarjeta, hud: r.finHud, rutas, pildoras: pildoras.slice(0, 12), letreroCierre: r.letreroCierre, fallos: r.fallos.slice(0, 3) }));
    await ctx.close();
  }
  const total = out.corridas.reduce((a, x) => a + x.cobros, 0);
  const fallos = out.corridas.reduce((a, x) => a + x.nFallos, 0);
  out.veredicto = { cobros: total, fallos, consola: out.errores.length, ok: total >= 40 && fallos === 0 && out.errores.length === 0 };
  console.log('veredicto', JSON.stringify(out.veredicto));
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
