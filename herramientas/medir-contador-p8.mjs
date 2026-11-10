// P8: metros por segundo de reloj real, Clásico contra MEGA (?ir=mega), con el bot adjust. Edge headless 1280x720.
// Mide metros del HUD a 5, 10 y 20 s de reloj simulado a 60 fps (el headless de Omarchy da ~1 cuadro/s real).
// Uso: flock /tmp/moki-pesado.lock node herramientas/medir-contador-p8.mjs <url-base>
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const base = process.argv[2];
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const SEMBRAR = () => {
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  localStorage.setItem('moki.primera', '1');
  localStorage.setItem('moki.tutorial', '1');
};
async function mide(nombre, q) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR);
  const page = await ctx.newPage();
  await page.goto(`${base}/?debug${q}`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const sc = window.__moki.scene.scenes[0];
    sc.startGame();
    sc.god = true; // sin choques: solo medimos el avance
    // Headless en esta máquina corre a ~1 cuadro/s y Phaser recorta el cuadro: el reloj real no sirve.
    // Paramos el ciclo y damos 60 cuadros de 16.67 ms por segundo (un teléfono a 60 fps), sin pintar.
    sc.game.loop.sleep();
    const muestras = [];
    let tt = performance.now();
    for (let s = 1; s <= 20; s++) {
      for (let f = 0; f < 60; f++) { tt += 1000 / 60; sc.update(tt, 1000 / 60); }
      muestras.push({ s, hud: Math.floor(sc.dist / 100), dist: Math.round(sc.dist), screen: sc.screen });
    }
    return { mega: !!sc.megaRun, muestras };
  });
  await ctx.close();
  return { nombre, ...r };
}
try {
  for (const [n, q] of [['clasico', '&nivel=clasico'], ['mega', '&ir=mega'], ['clasico-2', '&nivel=clasico'], ['mega-2', '&ir=mega']]) {
    const r = await mide(n, q);
    const m = (k) => r.muestras[k - 1];
    console.log(JSON.stringify({ caso: n, mega: r.mega, m5: m(5).hud, m10: m(10).hud, m20: m(20).hud, mPorSeg_10a20: ((m(20).dist - m(10).dist) / 1000).toFixed(2), fin: m(20).screen }));
  }
} finally {
  await browser.close();
}
