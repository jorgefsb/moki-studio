// P4h aterrizar con peso se ve: Clásico/Mucho a 390x844 (god, reloj dormido, 60 fps simulados con sys.step).
// Hace 3 saltos mantenidos (400 ms) y 3 tocados (16 ms) y mide la escala del sprite de poses (lo que se pinta) / ESCALA
// en cada cuadro desde que toca el piso hasta +130 ms. En el primer salto mantenido captura el lienzo en el cuadro +16 ms
// desde landHardAt (con y sin sprite) para el magick compare contra master. Edge headless.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p4h.mjs <url> <nombre> <dir-salida>
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, nombre, dir] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const SEMBRAR = (o) => {
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
const saltos = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': '2' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${e}`));
  page.on('console', (m) => m.type() === 'error' && !/403/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${url}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene.scenes[0].poses, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const sc = window.__moki.scene.scenes[0];
    sc.startGame();
    sc.god = true;
    sc.tut = { stage: 4, state: 'off' };
    sc.game.loop.sleep();
    window.__p4h = { tt: performance.now(), n: 0 };
  });
  // corre k cuadros; opcional: aprieta al inicio y suelta tras holdMs; regresa la escala por cuadro tras tocar piso
  const salto = (holdMs, capturaEn) =>
    page.evaluate(
      ([holdMs, capturaEn]) => {
        const sc = window.__moki.scene.scenes[0];
        const P = window.__p4h;
        const dt = 1000 / 60;
        const step = () => ((P.tt += dt), sc.sys.step(P.tt, dt));
        for (let i = 0; i < 40 || (sc.t < 1500 && i < 900); i++) step(); // corre en el piso (la primera vez espera la entrada)
        const ES = sc.poses.sprite.scaleY / (sc.poses.sprite.scaleY / sc.poses.sprite.scaleX === 1 ? 1 : 1);
        const base = sc.poses.sprite.scaleY;
        const hard0 = sc.landHardAt;
        sc.press();
        const t0 = sc.t;
        let soltado = false;
        let tocaT = null;
        const filas = [];
        for (let i = 0; i < 200; i++) {
          if (!soltado && sc.t - t0 >= holdMs) (sc.release(), (soltado = true));
          step();
          if (tocaT === null && soltado && sc.grounded && sc.landAt > t0) tocaT = sc.landAt;
          if (tocaT !== null) {
            const sp = sc.poses.sprite;
            filas.push({ ms: Math.round(sc.t - tocaT), sy: +(sp.scaleY / base).toFixed(4), sx: +(sp.scaleX / base).toFixed(4), pose: sp.texture.key, vis: sp.visible, top: Math.round(sp.getBounds().top * 10) / 10 });
            if (capturaEn !== null && sc.t - tocaT >= capturaEn) return { parado: true, duro: sc.landHardAt !== hard0, filas, base };
            if (sc.t - tocaT > 130) break;
          }
        }
        return { duro: sc.landHardAt !== hard0, filas, base, ES, diag: { screen: sc.screen, grounded: sc.grounded, t0, t: sc.t, landAt: sc.landAt, soltado, y: sc.y, vy: sc.vy } };
      },
      [holdMs, capturaEn],
    );
  const pinta = (esconde) =>
    page.evaluate((esconde) => {
      const sc = window.__moki.scene.scenes[0];
      const r = sc.game.renderer;
      if (esconde) sc.poses.sprite.setVisible(false), sc.poses.rim.setVisible(false);
      r.preRender();
      sc.game.scene.render(r);
      r.postRender();
    }, esconde);
  // primer salto mantenido: para en +16 ms y captura
  const c = await salto(400, 16);
  await pinta(false);
  await page.screenshot({ path: `${dir}/${nombre}-mas16.png` });
  await pinta(true);
  await page.screenshot({ path: `${dir}/${nombre}-mas16-sin.png` });
  saltos.push({ tipo: 'mantenido-captura', ...c });
  for (let n = 0; n < 3; n++) saltos.push({ tipo: 'mantenido', ...(await salto(400, null)) });
  for (let n = 0; n < 3; n++) saltos.push({ tipo: 'tocado', ...(await salto(16, null)) });
  await ctx.close();
} finally {
  await browser.close();
}
writeFileSync(`${dir}/${nombre}-sonda.json`, JSON.stringify({ saltos, errores }, null, 1));
for (const s of saltos) {
  const f = (a, b) => s.filas.filter((r) => r.ms >= a && r.ms <= b);
  const min030 = Math.min(...f(0, 30).map((r) => r.sy));
  const en110 = f(105, 125).map((r) => r.sy);
  console.log(nombre, s.tipo, 'duro', s.duro, 'syMin0-30', min030, 'sy@110+', en110.join(','), 'top', s.filas.slice(0, 3).map((r) => `${r.ms}:${r.top}:${r.pose}`).join(' '));
}
console.log(nombre, 'errores', errores.length, errores.slice(0, 5).join(' | '));
