// P36l-e (14-nov): aire y amarre de las píldoras de la 1.ª partida. Misma jugada que ciego-p36k (jugador nuevo, tutorial saltado),
// bots adjust (sube) y abajo (a ras). Cada cuadro de 9.5 a 15 s: cajas en px de pantalla de los dos letreros de la horquilla y de la
// píldora del cobro. Mide: hueco vertical mínimo entre letreros visibles a la vez; hueco entre píldora y letreros; quién entra primero
// (ms entre la entrada de 'Arriba' y la de 'A ras'); texto de cada píldora; cuánto aguanta opaca y cuánto se mueve en pantalla.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36le.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, errores: [], rutas: {} };
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
      const r = { huecoLetreros: null, huecoPildoraLetrero: null, entrada: {}, salida: {}, pildoras: [], gris: 0 };
      let act = null;
      sc.update = (a, b) => {
        const ret = orig(a, b);
        if (sc.t < 9500 || sc.t > 15000) return ret;
        const z = sc.cameras.main.zoom, v = sc.cameras.main.worldView;
        const vis = [];
        for (const o of sc.obstacles) (o.rot || []).forEach((h, i) => {
          const f = h.alpha * h.scaleY, nom = i ? 'ras' : 'arriba';
          if (f > 0.02 && r.entrada[nom] == null) r.entrada[nom] = Math.round(sc.t);
          if (f <= 0.02 && r.entrada[nom] != null && r.salida[nom] == null) r.salida[nom] = Math.round(sc.t);
          if (f > 0.02) vis.push(h.getBounds());
        });
        const hueco = (a, c) => Math.round((Math.max(a.y, c.y) - Math.min(a.bottom, c.bottom)) * z * 10) / 10;
        const xs = (a, c) => a.x < c.right && a.right > c.x;
        if (vis.length === 2 && xs(vis[0], vis[1])) { const g = hueco(vis[0], vis[1]); r.huecoLetreros = r.huecoLetreros == null ? g : Math.min(r.huecoLetreros, g); }
        const pv = sc.pago && sc.pago.visible && sc.pago.alpha > 0.02;
        if (pv) {
          const pb = sc.pago.getBounds();
          for (const lb of vis) if (xs(pb, lb)) { const g = hueco(pb, lb); r.huecoPildoraLetrero = r.huecoPildoraLetrero == null ? g : Math.min(r.huecoPildoraLetrero, g); }
          const txt = sc.pagoL && sc.pago.list.find((c) => c.type === 'Text').text;
          if (!act || act.txt !== txt || sc.t - act.fin > 100) { act = { t: Math.round(sc.t), txt, opacaMs: 0, x0: Math.round((pb.centerX - v.x) * z), dx: 0, fin: sc.t, cuadros: 0 }; r.pildoras.push(act); }
          act.cuadros++;
          if (sc.pago.alpha >= 0.95) act.opacaMs = Math.round(sc.t - act.t);
          if (sc.pago.alpha > 0.05 && sc.pago.alpha < 0.95) r.gris++;
          act.dx = Math.round((pb.centerX - v.x) * z) - act.x0;
          act.fin = sc.t;
        }
        return ret;
      };
      await window.__moki.moki.bot(bot, 200, null);
      sc.update = orig;
      r.pildoras.forEach((p) => delete p.fin);
      r.pildoras = r.pildoras.filter((p) => !/^\+/.test(p.txt) || p.t < 15000);
      return r;
    }, bot);
    await ctx.close();
  }
  console.log(tam, JSON.stringify(out.rutas), 'errores', out.errores.length);
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally { await browser.close(); }
