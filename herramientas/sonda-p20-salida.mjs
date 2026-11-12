// Sonda P20 (salida): adelanta el demo a mano y revisa que el obstáculo vuelva a pintarse al salir por la orilla izquierda
// del menú, y que en juego (?screen=play) nada quede escondido. Headless. Uso: node herramientas/sonda-p20-salida.mjs <url-base>
import { createRequire } from 'node:module';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
try {
  for (const [W, H] of [[1280, 720], [660, 372]]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${W}x${H}: ${e}`));
    page.on('console', (m) => m.type() === 'error' && errores.push(`${W}x${H}: ${m.text()}`));
    await page.route('https://moki.jorgesuarez.com.mx/**', (rt) => rt.fulfill({ status: 200, body: 'ok' }));
    await page.goto(`${base}/?debug`);
    await page.waitForSelector('.mn-hero', { timeout: 60000 });
    await page.waitForTimeout(800);
    const filas = [];
    for (let d = Number(process.argv[3] || 100); d <= Number(process.argv[4] || 900); d += 50) {
      const f = await page.evaluate((d) => {
        const s = window.__moki.scene.scenes[0];
        s.dist = d;
        s.placeEntities();
        const m = s.ui.state.menu && s.ui.state.menu.getBoundingClientRect();
        return { d, menuX0: m && Math.round(m.left), obs: s.obstacles.map((o) => [o.type, o.D, Math.round(o.sprite.getBounds().left * s.zoom), o.sprite.visible, o.shadow.visible]) };
      }, d);
      filas.push(f);
    }
    console.log(JSON.stringify({ tam: `${W}x${H}`, filas }));
    await ctx.close();
  }
} finally {
  console.log(JSON.stringify({ errores }));
  await browser.close();
}
