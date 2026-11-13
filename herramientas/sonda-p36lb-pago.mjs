// P36l-b (13-nov): ¿'Arriba +12' y 'A ras +5' son el pago REAL de la horquilla de la 1.ª partida? Jugador nuevo (como ciego-p36k);
// corre la partida con el bot 'adjust' (sube por el arco) y con 'abajo' (toca la caja y pasa a ras), y anota cuánto sube
// pieceValue (puntos de pieza, con racha) y pieces (monedas) entre 12.0 s y 15.0 s de juego (caja a 12.5 s), y el texto del letrero.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36lb-pago.mjs <url> <WxH> <salida.json>
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
      const sc = window.__moki.scene.scenes[0], orig = sc.update.bind(sc), r = { letreros: null, pv0: null, pv1: null, p0: null, p1: null, altos: 0, horq: (sc.level.horq || []).length };
      const oc = sc.collect.bind(sc);
      r.cobros = [];
      sc.collect = (k) => { const v0 = sc.pieceValue; const x = oc(k); if (sc.t > 11000 && sc.t < 15500) r.cobros.push({ t: Math.round(sc.t), arc: k.arc, alto: k.alto, combo: sc.combo, dv: sc.pieceValue - v0 }); return x; };
      sc.update = (a, b) => {
        const ret = orig(a, b);
        const o = sc.obstacles.find((q) => q.rot);
        if (o && !r.letreros) r.letreros = o.rot.map((h) => h.list.find((c) => c.type === 'Text').text);
        if (r.pv0 == null && sc.t >= 12000) (r.pv0 = sc.pieceValue), (r.p0 = sc.pieces);
        if (r.pv1 == null && sc.t >= 15000) (r.pv1 = sc.pieceValue), (r.p1 = sc.pieces), (r.altos = sc.hqA || 0);
        return ret;
      };
      await window.__moki.moki.bot(bot, 200, null);
      sc.update = orig;
      sc.collect = oc;
      r.pago = r.pv1 - r.pv0;
      r.monedas = r.p1 - r.p0;
      // pago de la ruta pura: solo las piezas de su arco (alto o el de a ras), sin la moneda que el bot de arriba roza al subir
      const mio = r.cobros.filter((c) => (bot === 'abajo' ? !c.alto : c.alto));
      const cero = mio.length ? mio[0].combo - 1 : 0;
      r.pagoRuta = mio.reduce((s, c) => s + c.dv, 0);
      r.racha0 = cero;
      r.letrero = +((r.letreros || [])[bot === 'abajo' ? 1 : 0] || '').split('+')[1];
      return r;
    }, bot);
    await ctx.close();
  }
  const A = out.rutas.adjust, B = out.rutas.abajo;
  // letrero = lo mínimo que paga la ruta pura entrando sin racha; quien sube rozando la 1.ª pieza de a ras cobra más (la racha arranca antes)
  out.veredicto = { arriba: { letrero: A.letrero, cobradoVentana: A.pago, ok: A.pago >= A.letrero && A.altos === 1 }, aRas: { letrero: B.letrero, cobradoVentana: B.pago, ok: B.pago === B.letrero && B.altos === 0 } };
  console.log(JSON.stringify(out.veredicto));
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally { await browser.close(); }
