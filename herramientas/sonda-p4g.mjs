// P4g acelerar se ve: 3 partidas Clásico/Mucho a 390x844 (god, reloj dormido, 60 fps simulados con game.step, que también pinta).
// Mide el ángulo del sprite de poses (lo que se pinta) en cada rampa de velocidad y fuera de rampa sin viento, y guarda capturas
// del lienzo 0.3 s antes y 0.3 s después de empezar la primera rampa, cada una también con el sprite escondido (para sacar la caja
// de Moki con magick compare). Edge headless.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p4g.mjs <url> <nombre> <dir-salida>
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
const partidas = [];
try {
  for (let n = 0; n < 3; n++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(SEMBRAR, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': '2' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${n} ${e}`));
    page.on('console', (m) => m.type() === 'error' && !/403/.test(m.text()) && errores.push(`${n} ${m.text()}`));
    await page.goto(`${url}/?debug&nivel=clasico`);
    await page.waitForFunction(() => window.__moki && window.__moki.scene.scenes[0].poses, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const sc = window.__moki.scene.scenes[0];
      sc.startGame();
      sc.god = true;
      sc.game.loop.sleep();
      window.__p4g = { tt: performance.now(), rampas: [], fuera: 0, fueraN: 0, enRampa: false, r0: null, f: 0 };
    });
    // avanza k cuadros; para en el cuadro pedido (para capturar) o al terminar
    const avanza = (k, pararEn) =>
      page.evaluate(([k, pararEn]) => {
        const sc = window.__moki.scene.scenes[0];
        const P = window.__p4g;
        const dt = 1000 / 60;
        for (let i = 0; i < k; i++) {
          P.tt += dt;
          sc.sys.step(P.tt, dt); // sin pintar: se pinta solo al capturar
          P.f++;
          if (sc.screen !== 'play') return { fin: true, f: P.f };
          const sub = sc.accel > 0 && sc.speed < sc.tramoSpeed(sc.tramoIdx);
          const ang = sc.poses.sprite.visible ? sc.poses.sprite.angle : null;
          if (sub && !P.enRampa) {
            P.enRampa = true;
            P.r0 = { f: P.f, t: sc.t, max: 0, v0: sc.speed, tramo: sc.tramoIdx, viento: sc.vientoV };
            P.rampas.push(P.r0);
          }
          if (P.enRampa) {
            if (ang !== null) P.r0.max = Math.max(P.r0.max, ang);
            if (!sub) (P.enRampa = false), (P.r0.dur = sc.t - P.r0.t);
          } else if (ang !== null && sc.vientoV === 1 && !(sc.inclina > 0.02)) {
            P.fuera = Math.max(P.fuera, Math.abs(ang));
            P.fueraN++;
          }
          if (pararEn && pararEn(P, sc)) return { parado: true, f: P.f };
        }
        return { f: P.f };
      }, [k, pararEn]);
    const pinta = (esconde) =>
      page.evaluate((esconde) => {
        const sc = window.__moki.scene.scenes[0];
        const r = sc.game.renderer;
        if (esconde) sc.poses.sprite.setVisible(false), sc.poses.rim.setVisible(false);
        r.preRender();
        sc.game.scene.render(r);
        r.postRender();
      }, esconde);
    const captura = async (tag) => {
      await pinta(false);
      await page.screenshot({ path: `${dir}/${nombre}-p${n}-${tag}.png` });
      await pinta(true);
      await page.screenshot({ path: `${dir}/${nombre}-p${n}-${tag}-sin.png` });
    };
    if (n === 0) {
      // primera rampa: necesito su cuadro de inicio; corro hasta encontrarla, luego reinicio la partida y paro 18 cuadros antes y 18 después
      let r;
      for (let i = 0; i < 400; i++) {
        await avanza(15);
        r = await page.evaluate(() => window.__p4g.rampas[0] && window.__p4g.rampas[0].f);
        if (r) break;
      }
      partidas.push({ primeraRampaF: r });
      await page.evaluate(() => {
        const sc = window.__moki.scene.scenes[0];
        sc.startGame();
        sc.god = true;
        window.__p4g = { tt: window.__p4g.tt, rampas: [], fuera: 0, fueraN: 0, enRampa: false, r0: null, f: 0 };
      });
      await avanza(r - 18);
      await captura('antes');
      await avanza(36);
      await captura('rampa');
    }
    for (let i = 0; i < 400; i++) {
      const res = await avanza(60);
      if (res.fin) break;
    }
    const P = await page.evaluate(() => {
      const P = window.__p4g;
      const sc = window.__moki.scene.scenes[0];
      return { rampas: P.rampas, fuera: P.fuera, fueraN: P.fueraN, cuadros: P.f, screen: sc.screen, dist: Math.round(sc.dist) };
    });
    partidas.push(P);
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${dir}/${nombre}-sonda.json`, JSON.stringify({ partidas, errores }, null, 1));
for (const p of partidas) if (p.rampas) console.log(nombre, 'rampas', p.rampas.length, 'max', p.rampas.map((r) => r.max.toFixed(1)).join(' '), 'fuera', p.fuera.toFixed(2), 'n', p.fueraN, p.screen, p.dist);
console.log(nombre, 'errores', errores.length, errores.slice(0, 5).join(' | '));
