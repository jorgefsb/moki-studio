// P4f patada de empuje: traza cuadro a cuadro (60 fps simulados, loop dormido) con el guion de P4e (toques, mantenidos,
// búfer) en master y rama. Guarda y, vy, px, grounded, takeoffAt, debug.angles.nearLeg y el centro de la bota cercana
// en pantalla (px de pantalla = mundo x zoom de cámara). Edge headless.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p4f.mjs <url-master> <url-rama> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [urlM, urlR, salida] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const SEMBRAR = (o) => {
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
async function traza(base, nombre, juice, reduced, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': String(juice) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && !/403/.test(m.text()) && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?debug&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate((red) => {
    const sc = window.__moki.scene.scenes[0];
    sc.startGame();
    sc.god = true;
    sc.reduced = red;
    sc.game.loop.sleep();
    const dt = 1000 / 60;
    let tt = performance.now();
    const fr = [];
    const c = sc.rig.container;
    const bota = c.list.find((o) => o.texture && o.texture.key === 'moki-boot' && !o.isTinted);
    const cam = sc.cameras.main;
    const plan = [];
    for (let i = 0; i < 12; i++) plan.push(['toque', 3], ['alto', 20], ['bufer', 10]);
    let p = 0, rel = -1, armado = false, espera = 0, gY = null;
    for (let g = 0; g < 60 * 75 && p < plan.length; g++) {
      const f = Math.round(sc.t / dt); // guion atado al reloj del juego: master y rama reciben los mismos toques aunque arranquen un cuadro distinto
      if (gY === null && f === 30) gY = sc.y;
      if (f > 40 && rel < 0) {
        const [tipo, n] = plan[p];
        if (tipo === 'bufer') {
          if (!armado && sc.grounded) { sc.press(); rel = f + 3; armado = true; }
          else if (armado && !sc.grounded && sc.vy > 0 && gY - sc.y < 14) { sc.press(); rel = f + n; armado = false; p++; }
        } else if (sc.grounded && f > espera) { sc.press(); rel = f + n; p++; }
      }
      if (rel === f) { sc.release(); rel = -1; espera = f + 40; }
      tt += dt;
      sc.update(tt, dt);
      const m = bota.getWorldTransformMatrix();
      const a = sc.rig.debug.angles || {};
      fr.push([sc.t, sc.y, sc.vy, sc.px, sc.grounded ? 1 : 0, sc.takeoffAt, a.nearLeg ?? null, a.farLeg ?? null, (m.tx - cam.scrollX) * cam.zoom, (m.ty - cam.scrollY) * cam.zoom, c.scaleX, c.scaleY, sc.dead ? 1 : 0]);
    }
    return { fr, zoom: cam.zoom, bota: !!bota };
  }, reduced);
  await ctx.close();
  return { nombre, juice, reduced, w, h, ...r };
}
const casos = [];
try {
  const set = [[2, false, 1280, 720], [2, false, 390, 844], [2, false, 660, 372], [1, false, 1280, 720], [3, false, 1280, 720], [0, false, 1280, 720], [2, true, 1280, 720]];
  for (const [j, red, w, h] of set) {
    for (const [lado, url] of [['master', urlM], ['rama', urlR]]) {
      const r = await traza(url, `${lado} j${j}${red ? ' reducido' : ''} ${w}x${h}`, j, red, w, h);
      console.log(r.nombre, 'cuadros', r.fr.length, 'zoom', r.zoom, 'bota', r.bota);
      casos.push({ lado, ...r });
    }
  }
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify({ casos, errores }));
console.log('errores', errores.length, errores.slice(0, 5));
