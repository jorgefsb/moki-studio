// P36l: puerta de las píldoras 'Arriba' / 'A ras' de la 1.ª partida. Misma jugada que ciego-p36k (jugador nuevo, tutorial saltado,
// bot adjust). Revisa CADA cuadro de 9.5 a 14 s y aparte los 12 cuadros del ciego (cada 200 ms desde 10.5 s):
// píldora visible (alpha > 0.02) cortada por el borde, encima de Moki o del '+12'; y el texto en px reales de pantalla.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36l.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.tutorial', '1'); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${url}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const sc = window.__moki.scene.scenes[0], orig = sc.update.bind(sc);
    const toca = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
    const res = { cuadros: 0, visibles: 0, cortada: 0, sobreMoki: 0, sobrePago: 0, ciego: { cuadros: 0, conPildora: 0, cortada: 0, sobreMoki: 0, sobrePago: 0 }, textoPx: null, glifoPx: null, alphaMax: 0, malos: [] };
    let ult = -1e9;
    sc.update = (a, b) => {
      const ret = orig(a, b);
      if (sc.t < 9500 || sc.t > 14000) return ret;
      const cam = sc.cameras.main, v = cam.worldView, z = cam.zoom;
      const enCiego = sc.t >= 10500 && sc.t - ult >= 200 && res.ciego.cuadros < 12;
      if (enCiego) ult = sc.t, res.ciego.cuadros++;
      res.cuadros++;
      const pz = sc.poses && sc.poses.sprite && sc.poses.sprite.visible ? sc.poses.sprite : sc.rig.container;
      const mb = pz.getBounds();
      const pb = sc.pago && sc.pago.visible ? sc.pago.getBounds() : null;
      let hay = false;
      for (const o of sc.obstacles) for (const h of o.rot || []) {
        if (h.alpha <= 0.02) continue;
        hay = true;
        res.visibles++;
        res.alphaMax = Math.max(res.alphaMax, h.alpha);
        const b = h.getBounds();
        const txt = h.list.find((c) => c.type === 'Text');
        res.textoPx = Math.round(parseFloat(txt.style.fontSize) * h.scaleX * z * 10) / 10;
        res.glifoPx = Math.round(txt.height * h.scaleX * z * 10) / 10;
        const c = b.x < v.x || b.right > v.right, m = toca(b, mb), p = pb && toca(b, pb);
        if (c) res.cortada++;
        if (m) res.sobreMoki++;
        if (p) res.sobrePago++;
        if (enCiego) (c && res.ciego.cortada++, m && res.ciego.sobreMoki++, p && res.ciego.sobrePago++);
        if ((c || m || p) && res.malos.length < 8) res.malos.push({ t: Math.round(sc.t), txt: txt.text, alpha: +h.alpha.toFixed(2), c, m, p });
      }
      if (enCiego && hay) res.ciego.conPildora++;
      return ret;
    };
    await window.__moki.moki.bot('adjust', 200, null);
    sc.update = orig;
    return res;
  });
  r.errores = errores;
  console.log(W, H, JSON.stringify(r));
  writeFileSync(salida, JSON.stringify({ url, tam, ...r }, null, 1));
} finally { await browser.close(); }
