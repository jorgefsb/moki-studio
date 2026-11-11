// Cuadros del tropiezo del Moki lejano (P6g) para el invitado ciego. Uso: node herramientas/video-p6g.mjs <url> <ancho>x<alto> <semilla> <dir>
// Recorta una ventana alrededor de Moki y guarda ~12 cuadros (cada 0.25 s de su reloj) desde su caída hasta que se levanta. Correr con flock.
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, tam, seed, dir] = process.argv.slice(2);
const [width, height] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); for (const a of ['moki.primera', 'moki.tutorial', 'moki.done']) localStorage.setItem(a, '1'); });
  const page = await ctx.newPage();
  await page.goto(`${base}/?debug&god&seed=${seed}`, { timeout: 60000 });
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__moki.scene.scenes[0].screen === 'play', null, { timeout: 40000 });
  await page.waitForFunction(() => { const m = window.__moki.scene.scenes[0].vida?.m(); return m && m.tr; }, null, { timeout: 60000, polling: 'raf' });
  const vb = await page.evaluate(() => /^vb/.test(window.__moki.scene.scenes[0].vida.m().im.texture.key));
  const z0 = vb ? 0.3 : 1.9;
  let k = 0;
  for (let mt = z0; mt <= z0 + 2.6; mt += 0.22) {
    await page.waitForFunction((mt) => { const m = window.__moki.scene.scenes[0].vida.m(); return !m || m.t >= mt; }, mt, { timeout: 30000, polling: 'raf' });
    const r = await page.evaluate(() => {
      const g = window.__moki, m = g.scene.scenes[0].vida.m();
      if (!m) return null;
      const b = m.im.getBounds(), c = g.canvas.getBoundingClientRect(), k = c.width / g.scale.width;
      return { x: c.left + (b.x + b.width / 2) * k, y: c.top + (b.y + b.height / 2) * k };
    });
    if (!r) break;
    const w = Math.min(width, vb ? 390 : 360), h = Math.min(height, vb ? 300 : 220);
    const x = Math.max(0, Math.min(width - w, r.x - w / 2)), y = Math.max(0, Math.min(height - h, r.y - h / 2));
    await page.screenshot({ path: `${dir}/f${String(k++).padStart(2, '0')}.png`, clip: { x, y, width: w, height: h } });
  }
  console.log(tam, 'seed', seed, 'vb', vb, 'cuadros', k);
} finally { await browser.close(); }
