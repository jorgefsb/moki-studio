// P4z-d: la sombra de Moki a 1280 es la de master. Misma jugada sembrada (60 fps con sys.step, god, Clásico, juice Mucho) en master y
// rama: por cuadro guarda textura, x, y, ancho, alto y alfa de mokiShadow, y el hash de los píxeles de la textura que usa.
// Si a 1280 todo es igual cuadro por cuadro, los píxeles de la sombra son los de master (mismo dibujo, mismo lugar, mismo alfa).
// A 390 debe cambiar (textura sombraM, alto x0.75, alfa del aire). Uso: node herramientas/sonda-p4zd-igual.mjs <urlMaster> <urlRama> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [uM, uR, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const PRE = (o) => {
  let a = 12345;
  Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1'); localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
async function corre(url, w, h, nombre) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(PRE, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': '2' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${String(e).slice(0, 300)}`));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${url}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene.scenes[0].poses, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const sc = window.__moki.scene.scenes[0];
    sc.startGame(); sc.god = true; sc.tut = { stage: 4, state: 'off' };
    sc.game.loop.sleep();
    const dt = 1000 / 60; let tt = performance.now();
    const step = () => ((tt += dt), sc.sys.step(tt, dt));
    const tex = {};
    const px = (k) => tex[k] ||= sc.textures.get(k).getSourceImage().toDataURL();
    const cuadros = [];
    const mide = () => { const s = sc.mokiShadow; px(s.texture.key); cuadros.push([s.texture.key, +s.x.toFixed(3), +s.y.toFixed(3), +s.displayWidth.toFixed(3), +s.displayHeight.toFixed(3), +s.alpha.toFixed(4), s.visible, s.depth]); };
    for (let n = 0; n < 6; n++) {
      for (let i = 0; i < 40; i++) (step(), mide());
      sc.press();
      const hold = n % 2 ? 16 : 400, t0 = sc.t;
      for (let i = 0; i < 90; i++) { if (sc.t - t0 >= hold) sc.release(); step(); mide(); }
    }
    return { cuadros, tex, zoom: sc.zoom };
  });
  await ctx.close();
  for (const k in r.tex) r.tex[k] = createHash('sha1').update(r.tex[k]).digest('hex').slice(0, 12);
  return r;
}
const res = {};
try {
  for (const [w, h] of [[1280, 720], [390, 844]]) {
    const m = await corre(uM, w, h, `master ${w}`), b = await corre(uR, w, h, `rama ${w}`);
    let igual = 0, aire = 0, aireIg = 0;
    const n = Math.min(m.cuadros.length, b.cuadros.length);
    for (let i = 0; i < n; i++) {
      const s = JSON.stringify(m.cuadros[i]) === JSON.stringify(b.cuadros[i]) && m.tex[m.cuadros[i][0]] === b.tex[b.cuadros[i][0]];
      igual += s;
    }
    res[`${w}x${h}`] = { zoomM: m.zoom, zoomR: b.zoom, cuadros: n, iguales: igual, texM: m.tex, texR: b.tex, ejemploM: m.cuadros[80], ejemploR: b.cuadros[80] };
    console.log(`${w}x${h} zoom ${m.zoom.toFixed(3)}: sombra igual a master en ${igual}/${n} cuadros; texturas master ${JSON.stringify(m.tex)} rama ${JSON.stringify(b.tex)}`);
  }
} finally {
  await browser.close();
}
console.log('errores', errores.length, errores.slice(0, 3).join(' | '));
writeFileSync(out, JSON.stringify({ res, errores }, null, 1));
