// FPS P6d a 375x812: modo dios, nivel 1, jugador nuevo. Anota el tiempo de cada cuadro (rAF) y resume 11.5-16 s de partida
// (el tropiezo) y 2-16 s. Headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/fps-p6d.mjs <url-base> <etiqueta>
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, tag] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errores = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    localStorage.clear();
    for (const a of ['moki.primera', 'moki.tutorial', 'moki.done']) localStorage.setItem(a, '1');
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${e}`));
  page.on('console', (m) => m.type() === 'error' && !/403|NetworkError/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${base}/?debug&god`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__moki?.scene?.scenes[0]?.screen === 'play', null, { timeout: 40000 });
  await page.evaluate(() => {
    const s = window.__moki.scene.scenes[0];
    window.__tp = 0;
    window.__f = [];
    s.events.on('postupdate', (_t, d) => { if (s.screen === 'play') window.__tp += Math.min(d, 50) / 1000; });
    let prev = performance.now();
    const r = (n) => { window.__f.push([window.__tp, n - prev]); prev = n; if (window.__tp < 16.2) requestAnimationFrame(r); };
    requestAnimationFrame(r);
  });
  await page.waitForFunction(() => window.__tp >= 16.2, null, { timeout: 90000 });
  const f = await page.evaluate(() => window.__f);
  const res = (a, b) => {
    const d = f.filter(([t]) => t >= a && t < b).map(([, x]) => x).sort((x, y) => x - y);
    const avg = d.reduce((x, y) => x + y, 0) / d.length;
    return { fps: +(1000 / avg).toFixed(1), p95ms: +d[Math.floor(d.length * 0.95)].toFixed(1), largos33: d.filter((x) => x > 33).length, n: d.length };
  };
  console.log(JSON.stringify({ tag, tropiezo: res(11.5, 16), partida: res(2, 16), errores }));
  await ctx.close();
} finally {
  await browser.close();
}
