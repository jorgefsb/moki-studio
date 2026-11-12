// P4q arco de papel, paso 1 del caso (propuestas/p4q-caso.md §4). Azar sembrado, 60 fps con sys.step, god, Mucho, sin
// localStorage salvo saltar el tutorial. Bot: salta cuando un obstáculo entra a ~0.42 s; alterna toque y mantenido.
// En cada cuadro en el aire pinta a mano y copia el lienzo con y sin la cinta (arcoG oculta): cuenta solo los px naranja
// (por tono, la luz del día la deja ~240,98,47) que aparecen con la cinta. Largo = diagonal de esos px; grueso = columna
// más alta. En el pico: contraste WCAG del naranja contra el fondo real bajo esos px (cFondo) y contra el cielo (fila y=40).
// Vuelta 2 (12-nov): además MIDE el canto crema contra lo que tiene detrás en cada cuadro en el aire (ver r.canto).
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p4q.mjs <url> <salida.json> [segundos]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, outFile, segs = '10'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const PRE = (o) => {
  let a = 12345;
  Math.random = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
async function caso(nombre, w, h, juice) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(PRE, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': String(juice) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`.slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403/.test(m.text()) && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${url}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene.scenes[0].poses, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate((frames) => {
    const sc = window.__moki.scene.scenes[0];
    sc.startGame();
    sc.god = true;
    sc.tut = { stage: 4, state: 'off' };
    sc.game.loop.sleep();
    const dt = 1000 / 60;
    let tt = performance.now();
    const cv = sc.game.canvas, c2 = document.createElement('canvas');
    c2.width = cv.width; c2.height = cv.height;
    const g2 = c2.getContext('2d', { willReadFrequently: true });
    const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const C0 = { world: { groundY: sc.mokiShadow.y - 1 } };
    const repinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); };
    // naranja de la cinta ya con la luz del día (se pinta ~240,98,47): por tono, no exacto
    const esNar = (d, i) => d[i] >= 205 && d[i + 1] >= 75 && d[i + 1] <= 125 && d[i + 2] >= 25 && d[i + 2] <= 75 && d[i] - d[i + 1] >= 110;
    const mide = (fondo) => {
      const cam = sc.cameras.main, z = cam.zoom, sy = (v) => (v - cam.worldView.y) * z;
      const right = Math.min(cv.width, Math.round((sc.px + 40 - cam.worldView.x) * z)), left = Math.max(0, right - 240);
      const top = Math.max(0, Math.round(sy(C0.world.groundY - 260))), bot = Math.min(cv.height, Math.round(sy(C0.world.groundY + 4)));
      const W = right - left, H = bot - top;
      if (W <= 0 || H <= 0) return null;
      let f0 = null;
      if (sc.arcoG) { sc.arcoG.visible = false; repinta(); g2.drawImage(cv, 0, 0); f0 = g2.getImageData(left, top, W, H).data; sc.arcoG.visible = true; }
      repinta(); g2.drawImage(cv, 0, 0);
      const d = g2.getImageData(left, top, W, H).data;
      const cambia = (i) => !f0 || f0[i] !== d[i] || f0[i + 1] !== d[i + 1] || f0[i + 2] !== d[i + 2];
      let n = 0, xmin = 1e9, xmax = -1, ymin = 1e9, ymax = -1, ln = 0;
      const col = new Array(W).fill(0), idx = [];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (esNar(d, i) && cambia(i)) { n++; col[x]++; idx.push(i); ln += L(d[i], d[i + 1], d[i + 2]); xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
        }
      const r = { n, ancho: xmax >= 0 ? xmax - xmin + 1 : 0, largo: xmax >= 0 ? Math.round(Math.hypot(xmax - xmin + 1, ymax - ymin + 1)) : 0, grueso: Math.max(0, ...col) };
      // vuelta 2: CANTO MEDIDO. Px del canto = los que cambian con la cinta y no son del relleno naranja. Por px: contraste WCAG
      // entre lo que se pinta (d, canto con la luz del día) y lo que había detrás en el mismo cuadro repintado sin cinta (f0).
      if (f0) {
        const cs = [];
        let lc = 0, lb = 0;
        for (let i = 0; i < d.length; i += 4)
          if (cambia(i) && !esNar(d, i)) {
            const a = L(d[i], d[i + 1], d[i + 2]), b = L(f0[i], f0[i + 1], f0[i + 2]);
            lc += a; lb += b; cs.push((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
          }
        if (cs.length) {
          cs.sort((x, y) => x - y);
          r.canto = { n: cs.length, med: +cs[cs.length >> 1].toFixed(2), p25: +cs[cs.length >> 2].toFixed(2), Lc: +(lc / cs.length).toFixed(3), Lb: +(lb / cs.length).toFixed(3), pasa2: +(cs.filter((v) => v >= 2).length / cs.length).toFixed(2) };
        }
      }
      if (fondo && n && sc.arcoG) {
        const f = f0;
        let lf = 0; for (const i of idx) lf += L(f[i], f[i + 1], f[i + 2]);
        const Lo = ln / n, Lf = lf / n;
        const s2 = g2.getImageData(0, 40, cv.width, 1).data; let ls = 0; for (let i = 0; i < s2.length; i += 4) ls += L(s2[i], s2[i + 1], s2[i + 2]);
        const Ls = ls / (s2.length / 4), cr = (a, b) => +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2);
        Object.assign(r, { Lnar: +Lo.toFixed(3), Lfondo: +Lf.toFixed(3), Lcielo: +Ls.toFixed(3), cFondo: cr(Lo, Lf), cCielo: cr(Lo, Ls) });
        const ob = sc.obstacles.map((o) => o.depth).filter((v) => v != null);
        r.prof = { arco: sc.arcoG.depth, moki: sc.poses.sprite.depth, obsMin: ob.length ? Math.min(...ob) : null };
      }
      return r;
    };
    const out = { saltos: 0, aire: [], picos: [], zoom: sc.cameras.main.zoom };
    let tk = sc.takeoffAt, mantener = false, suelta = -1, picoHecho = false, vyAnt = 0;
    for (let f = 0; f < frames; f++) {
      if (sc.grounded && suelta < 0) {
        const vista = sc.speed * 0.42;
        const o = sc.obstacles.find((q) => q.x > sc.px && q.x - sc.px < vista);
        if (o) { sc.press(); mantener = !mantener; suelta = f + (mantener ? 19 : 4); }
      }
      if (suelta >= 0 && f >= suelta) { sc.release(); suelta = -1; }
      tt += dt; sc.sys.step(tt, dt);
      if (sc.takeoffAt !== tk) { tk = sc.takeoffAt; out.saltos++; picoHecho = false; }
      if (!sc.grounded && sc.takeoffAt > sc.landAt) {
        const m = mide();
        if (m) out.aire.push(m);
        if (!picoHecho && vyAnt < 0 && sc.vy >= 0) {
          picoHecho = true;
          const cam = sc.cameras.main, z = cam.zoom, qp = sc.arcoP || [];
          const scr = (q) => q && [Math.round((sc.px - 6 - sc.dist + q[0] - cam.worldView.x) * z), Math.round((q[1] - cam.worldView.y) * z)];
          let px = null;
          if (qp.length > 2) { const m = scr(qp[qp.length >> 1]); repinta(); g2.drawImage(cv, 0, 0); px = [...g2.getImageData(m[0], m[1], 1, 1).data]; }
          out.picos.push({ alto: sc.highGood, ...mide(true), dbg: { n: qp.length, px: sc.px, spx: sc.poses && sc.poses.sprite.x, wv: Math.round(cam.worldView.x), cola: scr(qp[0]), bota: scr(qp[qp.length - 1]), medio: px } });
        }
      }
      vyAnt = sc.vy;
    }
    return out;
  }, Math.round(+segs * 60));
  await ctx.close();
  const a = r.aire;
  return {
    saltos: r.saltos, zoom: r.zoom, cuadrosAire: a.length,
    narMax: Math.max(0, ...a.map((m) => m.n)), narMedia: a.length ? Math.round(a.reduce((s, m) => s + m.n, 0) / a.length) : 0,
    picos: r.picos,
    canto: (() => {
      const cc = a.filter((m) => m.canto).map((m) => m.canto), ok = cc.filter((c) => c.med >= 2).length;
      const meds = cc.map((c) => c.med).sort((x, y) => x - y);
      return { cuadros: cc.length, pasan: ok, frac: cc.length ? +(ok / cc.length).toFixed(3) : 0, medMin: meds[0], medMediana: meds[meds.length >> 1], medMax: meds[meds.length - 1],
        LcMedia: cc.length ? +(cc.reduce((s, c) => s + c.Lc, 0) / cc.length).toFixed(3) : 0, LbMedia: cc.length ? +(cc.reduce((s, c) => s + c.Lb, 0) / cc.length).toFixed(3) : 0 };
    })(),
  };
}
const out = { url, errores };
try {
  out['390'] = await caso('390', 390, 844, 2);
  out['1280'] = await caso('1280', 1280, 720, 2);
} finally {
  await browser.close();
}
writeFileSync(outFile, JSON.stringify(out, null, 1));
for (const k of ['390', '1280']) {
  const o = out[k];
  console.log(k, `zoom ${o.zoom.toFixed(2)} saltos ${o.saltos} aire ${o.cuadrosAire} naranja max ${o.narMax} media ${o.narMedia}`);
  for (const p of o.picos) console.log('  pico', p.alto ? 'alto' : 'toque', `largo ${p.largo} grueso ${p.grueso} px ${p.n}`, `cFondo ${p.cFondo} cCielo ${p.cCielo} Lnar ${p.Lnar} Lfondo ${p.Lfondo} Lcielo ${p.Lcielo} xext ${p.ancho}`, JSON.stringify(p.prof), JSON.stringify(p.dbg));
}
for (const k of ['390', '1280']) console.log('CANTO', k, JSON.stringify(out[k].canto));
const tc = out['390'].canto.cuadros + out['1280'].canto.cuadros, tp = out['390'].canto.pasan + out['1280'].canto.pasan;
console.log('PUERTA canto >= 2.0 en', tp, 'de', tc, '=', tc ? (100 * tp / tc).toFixed(1) : 0, '% (pide >= 80 %)');
console.log('errores', errores.length, errores.slice(0, 6).join(' | '));
