// P36l-c (13-nov): ¿letrero y píldora dicen la MISMA cifra y es lo que de verdad se cobra? Jugador nuevo (como ciego-p36k) en la
// horquilla de la 1.ª partida, con el bot 'adjust' (sube por el arco alto) y con 'abajo' (pasa a ras). Para cada ruta anota:
// el texto del letrero, el texto de la píldora que sale al cerrar el arco, y el bono cobrado al cerrarlo
// (lo que sube pieceValue en la pieza que cierra el arco, menos el valor de esa pieza con su racha).
// También deja el pago total de la ventana 12-15 s (piezas con racha + bono), solo como dato.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36lc-pago.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, rutas: {}, errores: [] };
try {
  for (const bot of ['adjust', 'abajo']) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.tutorial', '1'); });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(String(e).slice(0, 300)));
    await page.goto(`${url}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    out.rutas[bot] = await page.evaluate(async (bot) => {
      const sc = window.__moki.scene.scenes[0], orig = sc.update.bind(sc);
      const r = { letreros: null, pv0: null, pv1: null, cierres: [] };
      const oc = sc.collect.bind(sc);
      const pild = () => (sc.pagoL && sc.pago ? (sc.pago.list.find((c) => c.type === 'Text') || {}).text : null);
      sc.collect = (k) => {
        const v0 = sc.pieceValue, antes = (sc.arcGot && k.arc && sc.arcGot[k.arc]) || 0;
        const x = oc(k);
        const cerro = k.arc && antes + 1 === k.arcN && sc.arcGot[k.arc] === k.arcN;
        if (cerro && sc.t > 11000 && sc.t < 15500) {
          let mult = 1;
          for (const [from, v] of [[1, 1], [3, 2], [6, 3]]) if (sc.combo >= from) mult = v; // C.combo.steps
          r.cierres.push({ t: Math.round(sc.t), alto: !!k.alto, ras: !!k.ras, combo: sc.combo, dv: sc.pieceValue - v0, amber: !!k.amber, bono: sc.pieceValue - v0 - mult, pildora: pild() });
        }
        return x;
      };
      sc.update = (a, b) => {
        const ret = orig(a, b);
        const o = sc.obstacles.find((q) => q.rot);
        if (o && !r.letreros) r.letreros = o.rot.map((h) => h.list.find((c) => c.type === 'Text').text);
        if (r.pv0 == null && sc.t >= 12000) (r.pv0 = sc.pieceValue), (r.a0 = sc.arriba || 0);
        if (r.pv1 == null && sc.t >= 15000) (r.pv1 = sc.pieceValue), (r.a1 = sc.arriba || 0);
        return ret;
      };
      await window.__moki.moki.bot(bot, 200, null);
      sc.update = orig;
      sc.collect = oc;
      r.pagoVentana = r.pv1 - r.pv0;
      r.arribaSuma = r.a1 - r.a0; // lo que suma 'Arriba +N' de la tarjeta final y de compartir en esta horquilla
      const mio = r.cierres.find((c) => (bot === 'abajo' ? c.ras : c.alto));
      r.letrero = +((r.letreros || [])[bot === 'abajo' ? 1 : 0] || '').split('+')[1];
      r.pildora = mio ? +String(mio.pildora || '').replace('+', '') : null;
      r.bono = mio ? mio.bono : null;
      return r;
    }, bot);
    await ctx.close();
  }
  const v = (R, arriba) => ({ letrero: R.letrero, pildora: R.pildora, bonoCobrado: R.bono, tarjetaArriba: R.arribaSuma, ok: R.letrero > 0 && R.letrero === R.pildora && R.pildora === R.bono && R.arribaSuma === (arriba ? R.bono : 0) });
  out.veredicto = { arriba: v(out.rutas.adjust, true), aRas: v(out.rutas.abajo, false) }; // a ras: la tarjeta 'Arriba +N' no suma su +5
  console.log(JSON.stringify(out.veredicto));
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally { await browser.close(); }
