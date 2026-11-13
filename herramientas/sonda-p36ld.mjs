// P36l-d (13-nov): puerta de la píldora y la entrada del letrero. Jugador nuevo en la horquilla de la 1.ª partida (como sonda-p36lb),
// con el bot 'adjust' (Arriba +12) y 'abajo' (A ras +5). En cada cuadro de 9.5 a 15 s, si la píldora se ve, mide en px de lienzo:
// casco = hueco entre la cabeza de Moki y la píldora (negativo = encima), moneda = hueco a la moneda más cercana debajo de ella
// (negativo = la tapa), izq = borde izquierdo de la píldora al lienzo. Y cuenta letreros grises (0.05 < alpha < 0.95 con doblez > 0.02).
// 'ciego' = los 12 cuadros cada 200 ms desde que nace cada píldora, como la tira del ARTE.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36ld.mjs <url> <WxH> <salida.json>
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
    page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && out.errores.push(m.text()));
    await page.goto(`${url}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    out.rutas[bot] = await page.evaluate(async (bot) => {
      const sc = window.__moki.scene.scenes[0], orig = sc.update.bind(sc);
      const r = { pildoras: [], letreroGris: 0, letreroGrisCiego: 0, letreroCuadros: 0 };
      let act = null, nacio = -1e9, ult = -1e9, ciegoN = 0, ciegoL = -1e9;
      sc.update = (a, b) => {
        const ret = orig(a, b);
        if (sc.t < 9500 || sc.t > 15000) return ret;
        const cam = sc.cameras.main, v = cam.worldView, z = cam.zoom;
        // letreros: los 12 cuadros del ciego van cada 200 ms desde 10.5 s (como sonda-p36lb)
        const enCiegoL = sc.t >= 10500 && sc.t - ciegoL >= 200 && ciegoN < 12;
        if (enCiegoL) ciegoL = sc.t, ciegoN++;
        for (const o of sc.obstacles) for (const h of o.rot || []) {
          if (h.alpha * h.scaleY <= 0.02) continue;
          r.letreroCuadros++;
          if (h.alpha > 0.05 && h.alpha < 0.95) (r.letreroGris++, enCiegoL && r.letreroGrisCiego++);
        }
        const pb = sc.pago && sc.pago.visible && sc.pago.alpha > 0.02 ? sc.pago.getBounds() : null;
        if (!pb) { act = null; return ret; }
        const txt = (sc.pago.list.find((c) => c.type === 'Text') || {}).text;
        if (!act || sc.t - nacio > 1200) { act = { t: Math.round(sc.t), txt, cuadros: 0, ciego: 0, casco: 1e9, moneda: 1e9, tapaMoneda: 0, sobreCasco: 0, izq: 1e9 }; r.pildoras.push(act); nacio = ult = sc.t; act.ciego++; }
        else if (sc.t - ult >= 200 && act.ciego < 12) ult = sc.t, act.ciego++;
        act.cuadros++;
        const pz = sc.poses && sc.poses.sprite && sc.poses.sprite.visible ? sc.poses.sprite : sc.rig.container;
        const mb = pz.getBounds();
        const hx = mb.x < pb.right && mb.right > pb.x;
        if (hx) {
          const g = (mb.y - pb.bottom) * z;
          act.casco = Math.min(act.casco, Math.round(g * 10) / 10);
          if (g < 0) act.sobreCasco++;
        }
        for (const k of sc.pickups) {
          if (!k.sprite || !k.sprite.visible || k.taken) continue;
          const kb = k.sprite.getBounds();
          if (!(kb.x < pb.right && kb.right > pb.x) || kb.bottom < pb.y) continue; // solo monedas debajo de ella o a su altura
          const g = (kb.y - pb.bottom) * z;
          act.moneda = Math.min(act.moneda, Math.round(g * 10) / 10);
          if (g < 0) act.tapaMoneda++;
        }
        act.izq = Math.min(act.izq, Math.round((pb.x - v.x) * z));
        return ret;
      };
      await window.__moki.moki.bot(bot, 200, null);
      sc.update = orig;
      r.pildoras.forEach((p) => { for (const k of ['casco', 'moneda', 'izq']) if (p[k] === 1e9) p[k] = null; });
      return r;
    }, bot);
    await ctx.close();
  }
  console.log(tam, JSON.stringify(out.rutas), 'errores', out.errores.length);
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally { await browser.close(); }
