// P4k agachado al aterrizar: misma base que sonda-p4j (azar sembrado, 60 fps con sys.step, god, Clásico). 3 aterrizajes
// fuertes y 3 normales; en +0/+33/+67/+100/+120/+260 ms desde landAt anota cuadro, escalaY y la fila superior de la cabeza
// en px de pantalla (fila opaca más alta de cada cuadro de la tira, medida con código; casco si se ve).
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p4k.mjs <url> <salida.json>
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
    const TOP = { 'pose-land': [29, 29, 21, 21, 21, 21], 'pose-run': [21, 22, 23, 22, 22, 23, 22] };
    window.__cab = () => {
      const po = sc.poses, cam = sc.cameras.main, o = po.casco.visible ? po.casco : po.sprite;
      const key = po.sprite.texture.key, fr = +po.sprite.frame.name;
      const top = TOP[key] ? TOP[key][fr] : null;
      const y = top === null ? null : o.y + (top - 123) * o.scaleY;
      return { key, fr, sy: +(po.sprite.scaleY / po.sprite.scaleX).toFixed(3), casco: po.casco.visible, cab: y === null ? null : +((y - cam.worldView.y) * cam.zoom).toFixed(2), vis: po.sprite.visible };
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
      while (sc.t - sc.landAt + 1000 / 60 <= ms + 0.5) window.__p.step(); // el cuadro que se ve en +ms (último <= ms)
      return { ms: Math.round(sc.t - sc.landAt), ...window.__cab() };
    }, ms);
  const MS = [0, 33, 67, 100, 120, 260, 267];
  const r = { fuertes: [], normales: [] };
  for (const [lista, hold] of [[r.fuertes, 400], [r.normales, 16]])
    for (let n = 0; n < 3; n++) {
      const t = { duro: await salta(hold) };
      for (const ms of MS) t[ms] = await en(ms);
      lista.push(t);
    }
  await ctx.close();
  return r;
}
const out = { url, errores };
try {
  out['390'] = await caso('390', 390, 844, 2, false);
  out['390-j0'] = await caso('390-j0', 390, 844, 0, false);
} finally {
  await browser.close();
}
writeFileSync(outFile, JSON.stringify(out, null, 1));
for (const k of ['390', '390-j0']) for (const tipo of ['fuertes', 'normales']) for (const f of out[k][tipo])
  console.log(k, tipo, f.duro ? 'D' : 'n', [0, 33, 67, 100, 120, 260, 267].map((ms) => `${f[ms].ms}:${f[ms].vis ? f[ms].key.slice(5) + f[ms].fr : 'titere'}/y${f[ms].cab}/sy${f[ms].sy}${f[ms].casco ? 'C' : ''}`).join(' '));
console.log('errores', errores.length, errores.slice(0, 6).join(' | '));
