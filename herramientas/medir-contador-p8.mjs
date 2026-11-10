// P8: metros por segundo de reloj real, Clásico contra MEGA (?ir=mega), con el bot adjust. Edge headless 1280x720.
// Mide dist y metros del HUD cada 1 s durante 12 s, y cuadros por segundo (rAF) para separar la lentitud del headless.
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
    sc.startGame(); // partida real con el reloj real (bot() corre en avance rápido y no sirve para esto)
    sc.god = true; // sin choques: solo medimos el avance
    const t0 = performance.now();
    let frames = 0;
    let on = true;
    const tick = () => { frames++; if (on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const muestras = [];
    for (let i = 1; i <= 12; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      muestras.push({ s: +((performance.now() - t0) / 1000).toFixed(2), dist: Math.round(sc.dist), hud: Math.floor(sc.dist / 100), screen: sc.screen });
    }
    on = false;
    const seg = (performance.now() - t0) / 1000;
    return { mega: !!sc.megaRun, fps: +(frames / seg).toFixed(1), muestras };
  });
  await ctx.close();
  return { nombre, ...r };
}
try {
  for (const [n, q] of [['clasico', '&nivel=clasico'], ['mega', '&ir=mega'], ['clasico-2', '&nivel=clasico'], ['mega-2', '&ir=mega']]) {
    const r = await mide(n, q);
    const vivos = r.muestras.filter((m) => m.screen !== 'dead' && m.screen !== 'final');
    const a = vivos[1];
    const b = vivos[vivos.length - 1];
    const vel = a && b ? ((b.hud - a.hud) / (b.s - a.s)).toFixed(2) : 'n/a';
    console.log(JSON.stringify({ caso: r.nombre, mega: r.mega, fps: r.fps, metrosPorSeg: vel, muestras: r.muestras.map((m) => `${m.s}s:${m.hud}m:${m.screen}`).join(' ') }));
  }
} finally {
  await browser.close();
}
