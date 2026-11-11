// P4i casco rígido y polvo ancho: Clásico/Mucho a 390x844 (god, reloj dormido, 60 fps simulados con sys.step).
// Casco: en +16 y +48 ms de un aterrizaje fuerte captura el lienzo (recortado a Moki) en tres estados: rama (lo que se
// pinta), ref (la misma pose sin aplastar y sin capa de casco = master fuera del squash) y sin (sin Moki). Con magick
// saca la máscara rama-sin y ref-sin y mide ancho y alto de la cabeza (de la fila de arriba a la fila más angosta del
// cuello). Polvo: en +30 ms mide el ancho (caja de las bocanadas vivas) de 4 aterrizajes fuertes y 4 normales, con
// C.art.polvoAnchoDuro de la rama y con 1 (= código de master). Edge headless.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p4i.mjs <url> <dir-salida>
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, dir] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const SEMBRAR = (o) => {
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
// máscara de diferencia -> extensión por fila -> cabeza
function cabeza(a, b) {
  const txt = execFileSync('magick', [a, b, '-compose', 'difference', '-composite', '-colorspace', 'gray', '-threshold', '4%', 'txt:-'], { maxBuffer: 1 << 26 }).toString();
  const filas = new Map();
  for (const l of txt.split('\n')) {
    const m = /^(\d+),(\d+):.*#FFFFFF|^(\d+),(\d+):.*gray\(255\)/i.exec(l);
    if (!m) continue;
    const x = +(m[1] ?? m[3]), y = +(m[2] ?? m[4]);
    const r = filas.get(y) || [1e9, -1];
    filas.set(y, [Math.min(r[0], x), Math.max(r[1], x)]);
  }
  const ys = [...filas.keys()].sort((p, q) => p - q);
  const top = ys[0];
  let cuello = null, minW = 1e9, ancho = 0;
  for (const y of ys) {
    if (y < top + 30 || y > top + 60) continue;
    const w = filas.get(y)[1] - filas.get(y)[0] + 1;
    if (w < minW) (minW = w), (cuello = y);
  }
  for (const y of ys) if (y >= top && y < cuello) ancho = Math.max(ancho, filas.get(y)[1] - filas.get(y)[0] + 1);
  return { top, cuello, alto: cuello - top, ancho, pies: ys[ys.length - 1] };
}
const out = { casco: [], polvo: {}, errores };
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': '2' });
  const page = await ctx.newPage();
  page.on('requestfailed', (r) => errores.push(`requestfailed ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
  page.on('pageerror', (e) => errores.push(`${e} ${e.stack || ''}`.slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${url}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene.scenes[0].poses, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const sc = window.__moki.scene.scenes[0];
    window.__C = (await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/config.js')) || '/src/config.js')).CONFIG;
    window.__Curl = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/config.js'));
    sc.startGame();
    sc.god = true;
    sc.tut = { stage: 4, state: 'off' };
    sc.game.loop.sleep();
    const dt = 1000 / 60;
    window.__p = { tt: performance.now(), step: () => ((window.__p.tt += dt), sc.sys.step(window.__p.tt, dt)) };
  });
  // corre en el piso, salta (holdMs) y para cuando pasan `hasta` ms desde que toca
  const salta = (holdMs, hasta) =>
    page.evaluate(
      ([holdMs, hasta]) => {
        const sc = window.__moki.scene.scenes[0];
        const P = window.__p;
        for (let i = 0; i < 40 || (sc.t < 1500 && i < 900); i++) P.step();
        const hard0 = sc.landHardAt;
        sc.press();
        const t0 = sc.t;
        let soltado = false;
        for (let i = 0; i < 300; i++) {
          if (!soltado && sc.t - t0 >= holdMs) (sc.release(), (soltado = true));
          P.step();
          if (soltado && sc.grounded && sc.landAt > t0 && sc.t - sc.landAt >= hasta) break;
        }
        return { duro: sc.landHardAt !== hard0, ms: Math.round(sc.t - sc.landAt) };
      },
      [holdMs, hasta],
    );
  const avanza = (hasta) =>
    page.evaluate((hasta) => {
      const sc = window.__moki.scene.scenes[0];
      while (sc.t - sc.landAt < hasta) window.__p.step();
      return Math.round(sc.t - sc.landAt);
    }, hasta);
  const ESC = 110 / 102;
  // pinta en el estado pedido y regresa el lienzo
  const pinta = (estado) =>
    page.evaluate(
      ([estado, ESC]) => {
        const sc = window.__moki.scene.scenes[0];
        const po = sc.poses, sp = po.sprite;
        const guarda = { sx: sp.scaleX, sy: sp.scaleY, crop: sp.isCropped ? { ...sp._crop } : null, cv: po.casco.visible, cy: sp._crop };
        po.rim.setVisible(false);
        if (estado === 'ref') sp.setCrop().setScale(ESC), po.casco.setVisible(false);
        if (estado === 'master') sp.setCrop(), po.casco.setVisible(false); // control: master aplastado, casco incluido
        if (estado === 'sin') sp.setVisible(false), po.casco.setVisible(false);
        const r = sc.game.renderer;
        r.preRender();
        sc.game.scene.render(r);
        r.postRender();
        const png = sc.game.canvas.toDataURL('image/png'); // mismo turno que el dibujo: el búfer de WebGL sigue vivo
        const b = { png, x: sp.x, y: sp.y, sy: +(guarda.sy / ESC).toFixed(4), sx: +(guarda.sx / ESC).toFixed(4), casco: guarda.cv, frame: sp.frame.name };
        return b;
      },
      [estado, ESC],
    );
  // al terminar de capturar los tres estados se re-ejecuta update en el siguiente step: no hace falta restaurar
  async function captura(et) {
    const est = {};
    for (const e of ['rama', 'ref', 'master', 'sin']) {
      if (e !== 'rama') await page.evaluate(() => window.__moki.scene.scenes[0].poses.update());
      const b = await pinta(e);
      if (e === 'rama') est.b = b;
      const f = `${dir}/${et}-${e}.png`;
      writeFileSync(f, Buffer.from(b.png.split(',')[1], 'base64')); // lienzo completo: la cámara mueve el mundo, no se recorta
      delete b.png;
    }
    return { ...est.b, rama: cabeza(`${dir}/${et}-rama.png`, `${dir}/${et}-sin.png`), ref: cabeza(`${dir}/${et}-ref.png`, `${dir}/${et}-sin.png`), master: cabeza(`${dir}/${et}-master.png`, `${dir}/${et}-sin.png`) };
  }
  for (let n = 0; n < (process.env.SOLO1 ? 1 : 2); n++) {
    const s = await salta(400, 16);
    const c16 = await captura(`n${n}-mas16`);
    await avanza(48);
    const c48 = await captura(`n${n}-mas48`);
    out.casco.push({ duro: s.duro, ms16: s.ms, c16, c48 });
  }
  // polvo
  const anchoPolvo = () =>
    page.evaluate(() => {
      const sc = window.__moki.scene.scenes[0];
      let a = 1e9, b = -1e9, top = 1e9, n = 0;
      for (const p of sc.particles.items) {
        if (!p.alive || !p.infla) continue;
        const r = p.sprite.getBounds();
        a = Math.min(a, r.left), b = Math.max(b, r.right), top = Math.min(top, r.top), n++;
      }
      return { ancho: Math.round(b - a), n, top: Math.round(top) };
    });
  for (const k of ['rama', 'master']) {
    await page.evaluate((k) => (window.__C.art.polvoAnchoDuro = k === 'rama' ? 2.2 : 1), k);
    out.polvo[k] = { duro: [], normal: [] };
    for (let n = 0; n < 4; n++) {
      const s = await salta(400, 30);
      out.polvo[k][s.duro ? 'duro' : 'normal'].push({ ms: s.ms, ...(await anchoPolvo()) });
    }
    for (let n = 0; n < 4; n++) {
      const s = await salta(16, 30);
      out.polvo[k][s.duro ? 'duro' : 'normal'].push({ ms: s.ms, ...(await anchoPolvo()) });
    }
  }
  await page.evaluate(() => (window.__C.art.polvoAnchoDuro = 2.2));
  await ctx.close();
} finally {
  await browser.close();
}
writeFileSync(`${dir}/sonda-p4i.json`, JSON.stringify(out, null, 1));
for (const c of out.casco)
  for (const [k, v] of [['+16', c.c16], ['+48', c.c48]])
    console.log('casco', k, 'duro', c.duro, 'frame', v.frame, 'cuerpo sy', v.sy, 'capa', v.casco, 'rama', `${v.rama.ancho}x${v.rama.alto} top ${v.rama.top} pies ${v.rama.pies}`, 'ref', `${v.ref.ancho}x${v.ref.alto} top ${v.ref.top} pies ${v.ref.pies}`, 'master-aplastado', `${v.master.ancho}x${v.master.alto} top ${v.master.top}`);
for (const k of Object.keys(out.polvo)) for (const t of ['duro', 'normal']) console.log('polvo', k, t, out.polvo[k][t].map((r) => `${r.ancho}(${r.n},${r.ms}ms)`).join(' '));
console.log('errores', errores.length, errores.slice(0, 8).join(' | '));
