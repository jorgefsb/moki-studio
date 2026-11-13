// P36l-b (13-nov): como sonda-p36l y además: cuadros con píldora a medio fundido (gris: 0.05 < alpha < 0.95), píldora
// visible encima de una moneda del mundo, y cuánto dura el fundido de entrada y de salida (ms de juego).
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
    const res = { cuadros: 0, visibles: 0, cortada: 0, sobreMoki: 0, sobrePago: 0, gris: 0, grisSalida: 0, sobreMoneda: 0, entradaMs: [], salidaMs: [], ciego: { cuadros: 0, conPildora: 0, cortada: 0, sobreMoki: 0, sobrePago: 0, gris: 0, grisSalida: 0, sobreMoneda: 0 }, textoPx: null, glifoPx: null, alphaMax: 0, malos: [] };
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
      const kb = sc.pickups.filter((k) => k.sprite && k.sprite.visible && !k.taken).map((k) => k.sprite.getBounds());
      for (const o of sc.obstacles) for (const h of o.rot || []) {
        const a = h.alpha, f = a * h.scaleY; // f: cuánto se ve (fundido x doblez); gris solo por alpha
        if (f > 0.02 && h.t0 == null) h.t0 = sc.t;
        if (f >= 0.98 && h.t0 != null && h.t1 == null) h.t1 = sc.t, res.entradaMs.push(Math.round(h.t1 - h.t0));
        if (f < 0.98 && h.t1 != null && h.t2 == null) h.t2 = sc.t;
        if (f <= 0.02 && h.t2 != null && h.t3 == null) h.t3 = sc.t, res.salidaMs.push(Math.round(h.t3 - h.t2));
        if (f <= 0.02) continue;
        hay = true;
        res.visibles++;
        res.alphaMax = Math.max(res.alphaMax, h.alpha);
        const b = h.getBounds();
        const txt = h.list.find((c) => c.type === 'Text');
        res.textoPx = Math.round(parseFloat(txt.style.fontSize) * h.scaleX * z * 10) / 10;
        res.glifoPx = Math.round(txt.height * h.scaleX * z * 10) / 10;
        const c = b.x < v.x || b.right > v.right, m = toca(b, mb), p = pb && toca(b, pb), gr = a > 0.05 && a < 0.95, mo = kb.some((k) => toca(b, k));
        const gs = gr && h.t1 != null; // gris ya de salida (después de haber estado entera)
        if (gr) res.gris++;
        if (gs) res.grisSalida++;
        if (mo) res.sobreMoneda++;
        if (enCiego) (gr && res.ciego.gris++, gs && res.ciego.grisSalida++, mo && res.ciego.sobreMoneda++);
        if (c) res.cortada++;
        if (m) res.sobreMoki++;
        if (p) res.sobrePago++;
        if (enCiego) (c && res.ciego.cortada++, m && res.ciego.sobreMoki++, p && res.ciego.sobrePago++);
        if ((c || m || p || gr || mo) && res.malos.length < 12) res.malos.push({ t: Math.round(sc.t), txt: txt.text, alpha: +a.toFixed(2), sy: +h.scaleY.toFixed(2), c, m, p, gr, mo, ciego: enCiego });
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
