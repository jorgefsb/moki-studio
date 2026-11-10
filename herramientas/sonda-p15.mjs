// Sonda P15 (monedas pegadas a la espalda en el checkpoint). Headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p15.mjs <url-base> <ancho>x<alto> <salida.json> [captura-prefijo]
// Juega con ?debug&god&nivel=clasico y, a 300 y 600 ms de juego tras cruzar el checkpoint, lista cada ficha
// (token / tokenAmber) visible: dónde está respecto a Moki, si sigue en scene.pickups, si ya se cobró y sus tweens.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');

const [base, tam, salida, foto] = process.argv.slice(2);
const [w, h] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
try {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  await page.addInitScript(() => { localStorage.setItem('moki.tutorial', '1'); localStorage.setItem('moki.primera', '1'); });
  await page.goto(`${base}/?debug&god&nivel=clasico`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene.scenes[0] && window.__moki.scene.scenes[0].ui, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  if (process.env.MODO === 'bot') {
    // Igual que evidencia/p4d/medir3.mjs del probador: el bot avanza con s.update(0, DT) en un bucle síncrono y se
    // detiene a 600 ms de la bandera. Cuenta las fichas visibles con escala > 0.05 a menos de 50 px de Moki.
    const r = await page.evaluate(async () => {
      const s = window.__moki.scene.scenes[0];
      if (s.scene.isPaused()) s.scene.resume();
      const upd = s.update.bind(s);
      const ok = () => s.tramoIdx === 1 && s.grounded && s.t - s.cpAt >= 600 && s.t - s.cpAt <= 660;
      s.update = (a, b) => { upd(a, b); if (ok()) throw new Error('CAPTURA'); };
      try { await window.__moki.moki.bot('adjust', 200, null); } catch (e) { if (String(e).indexOf('CAPTURA') < 0) throw e; }
      s.update = upd;
      s.scene.pause();
      const f = s.children.list.filter((o) => o.texture && /^token/.test(o.texture.key) && o.visible && o.scaleX > 0.05 && Math.abs(o.x - s.px) < 50);
      return { pieces: s.pieces, pegadas: f.length, congeladas: f.filter((o) => s.tweens.getTweensOf(o).length > 0).length, alturas: f.map((o) => Math.round(s.y - o.y)) };
    });
    if (foto) await page.screenshot({ path: `${foto}-bot600.png` });
    writeFileSync(salida, JSON.stringify({ tam, modo: 'bot', r, errores }, null, 1));
    console.log(JSON.stringify({ tam, modo: 'bot', ...r, errores: errores.length }));
    await browser.close();
    process.exit(0);
  }
  await page.evaluate(() => window.__moki.scene.scenes[0].startGame());
  const medir = (ms) => page.evaluate((ms) => new Promise((ok) => {
    const s = window.__moki.scene.scenes[0];
    const tick = () => {
      if (s.tramoIdx >= 1 && s.cpAt != null && s.t - s.cpAt >= ms) {
        const fichas = s.children.list
          .filter((o) => o.texture && /^token/.test(o.texture.key) && o.visible && o.alpha > 0.05 && o.scaleX > 0.05)
          .map((o) => {
            const k = s.pickups.find((p) => p.sprite === o);
            return { tex: o.texture.key, x: Math.round(o.x), y: Math.round(o.y), dxMoki: Math.round(o.x - s.px), scale: +o.scaleX.toFixed(2), enPickups: !!k, taken: k ? k.taken : 'fuera', off: k ? !!k.off : null, tweens: s.tweens.getTweensOf(o).length };
          });
        // todo lo visible junto a Moki (de la cabeza a la cintura, detrás y encima), para saber qué son las "monedas"
        const cerca = [];
        const ver = (o, ox, oy) => {
          if (!o.visible || o.alpha < 0.05) return;
          const x = ox + (o.x || 0);
          const y = oy + (o.y || 0);
          if (o.list) return o.list.forEach((c) => ver(c, x, y));
          if (Math.abs(x - s.px) < 70 && y > s.y - 220 && y < s.y + 10) cerca.push({ tipo: o.type, tex: o.texture ? o.texture.key : null, frame: o.frame ? o.frame.name : null, x: Math.round(x), y: Math.round(y), depth: o.depth, sx: +(o.scaleX || 1).toFixed(2), w: Math.round(o.displayWidth || 0), h: Math.round(o.displayHeight || 0) });
        };
        s.children.list.forEach((o) => ver(o, 0, 0));
        ok({ ms, cerca, t: Math.round(s.t), cpAt: Math.round(s.cpAt), px: s.px, mokiY: Math.round(s.y), tramo: s.tramoIdx, speed: Math.round(s.speed), pieces: s.pieces, fichas, pegadas: fichas.filter((f) => Math.abs(f.dxMoki) < 50).length });
      } else requestAnimationFrame(tick);
    };
    tick();
  }), ms);
  const r300 = await medir(300);
  if (foto) await page.screenshot({ path: `${foto}-300.png` });
  const r600 = await medir(600);
  if (foto) await page.screenshot({ path: `${foto}-600.png` });
  writeFileSync(salida, JSON.stringify({ tam, r300, r600, errores }, null, 1));
  console.log(JSON.stringify({ tam, p300: r300.pegadas, p600: r600.pegadas, errores: errores.length }));
} finally {
  await browser.close();
}
