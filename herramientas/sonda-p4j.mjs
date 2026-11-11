// P4j polvo fuerte sin cortes: corre un build (master o rama) con Math.random sembrado (mismo azar en los dos) y, en
// Clásico/Mucho con god y reloj dormido (60 fps simulados con sys.step), hace 3 aterrizajes fuertes y 3 normales.
// En cada fuerte, a +16/+30/+48/+80 ms lista las nubes del polvo (textura chipPolvo) con su caja y cuenta las cortadas
// (caja.left < borde izquierdo visible de la cámara). En +30 ms mide el ancho total del polvo (fuerte y normal).
// Casos: 390x844, 1280x720, 660x900 en Mucho; 390 con juice 0 y con movimiento reducido (cuenta de nubes vivas).
// Edge headless. Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p4j.mjs <url> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, outFile] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const PRE = (o) => {
  let a = 12345; // mulberry32: mismo azar en master y rama
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
async function caso(nombre, w, h, juice, reducido) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(PRE, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': String(juice) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`.slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403/.test(m.text()) && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${url}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene.scenes[0].poses, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate((reducido) => {
    const sc = window.__moki.scene.scenes[0];
    sc.startGame();
    sc.god = true;
    sc.tut = { stage: 4, state: 'off' };
    if (reducido) sc.reduced = true;
    sc.game.loop.sleep();
    const dt = 1000 / 60;
    window.__p = { tt: performance.now(), step: () => ((window.__p.tt += dt), sc.sys.step(window.__p.tt, dt)) };
    window.__nubes = () => {
      const cam = sc.cameras.main, borde = cam.worldView.x;
      const key = sc.particles.items.find((p) => p.infla)?.sprite.texture.key;
      const l = [];
      for (const p of sc.particles.items) {
        if (!p.alive || !p.infla || p.sprite.texture.key !== 'chipPolvo') continue;
        const r = p.sprite.getBounds();
        l.push([Math.round(r.left - borde), Math.round(r.right - borde)]);
      }
      return { borde: Math.round(borde), px: Math.round(sc.px - borde), n: l.length, cortadas: l.filter((c) => c[0] < 0).length, cajas: l.sort((p, q) => p[0] - q[0]), ancho: l.length ? Math.max(...l.map((c) => c[1])) - Math.min(...l.map((c) => c[0])) : 0, key };
    };
  }, reducido);
  const salta = (holdMs) =>
    page.evaluate((holdMs) => {
      const sc = window.__moki.scene.scenes[0];
      const P = window.__p;
      for (let i = 0; i < 60 || (sc.t < 1500 && i < 900); i++) P.step();
      const hard0 = sc.landHardAt;
      sc.press();
      const t0 = sc.t;
      let soltado = false;
      for (let i = 0; i < 300; i++) {
        if (!soltado && sc.t - t0 >= holdMs) (sc.release(), (soltado = true));
        P.step();
        if (soltado && sc.grounded && sc.landAt > t0) break;
      }
      return sc.landHardAt !== hard0;
    }, holdMs);
  const en = (ms) =>
    page.evaluate((ms) => {
      const sc = window.__moki.scene.scenes[0];
      while (sc.t - sc.landAt < ms) window.__p.step();
      return { ms: Math.round(sc.t - sc.landAt), ...window.__nubes() };
    }, ms);
  const r = { fuertes: [], normales: [] };
  for (let n = 0; n < 3; n++) {
    const duro = await salta(400);
    const t = { duro, nacer: await en(0) };
    for (const ms of [16, 30, 48, 80]) t[ms] = await en(ms);
    r.fuertes.push(t);
  }
  for (let n = 0; n < 3; n++) {
    const duro = await salta(16);
    r.normales.push({ duro, 30: await en(30) });
  }
  await ctx.close();
  return r;
}
const out = { url, errores };
try {
  out['390'] = await caso('390', 390, 844, 2, false);
  out['1280'] = await caso('1280', 1280, 720, 2, false);
  out['660'] = await caso('660', 660, 900, 2, false);
  out['390-j0'] = await caso('390-j0', 390, 844, 0, false);
  out['390-red'] = await caso('390-red', 390, 844, 2, true);
} finally {
  await browser.close();
}
writeFileSync(outFile, JSON.stringify(out, null, 1));
for (const k of ['390', '1280', '660', '390-j0', '390-red']) {
  const c = out[k];
  for (const f of c.fuertes) console.log(k, 'fuerte', f.duro, ['nacer', 16, 30, 48, 80].map((ms) => `${ms}:${f[ms].n}n/${f[ms].cortadas}c/a${f[ms].ancho}`).join(' '), 'px', f[16].px);
  console.log(k, 'normal +30 ancho', c.normales.map((x) => `${x[30].ancho}(${x[30].n},${x.duro ? 'D' : 'n'})`).join(' '));
}
console.log('errores', errores.length, errores.slice(0, 6).join(' | '));
