// Sonda P6c (vida en el fondo). Headless; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/sonda-p6c.mjs <url-base> <salida.json> [carpeta-capturas]
// A 390x844, 660x372 y 1280x720, nivel 1, partida en modo dios: cada 100 ms durante 40 s anota Moki chico y papalote (caja en px de
// pantalla, parte visible de Moki sobre la capa medio, piso del papalote en y del mundo) y si se enciman con obstáculos o fichas.
// Capturas a t = 4, 7, 9 y 12 s si se da carpeta (no se abren aquí: las lee un invitado).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida, dir] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = { casos: [], errores: [] };
try {
  for (const [width, height] of [[390, 844], [660, 372], [1280, 720]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      const kv = { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1' };
      for (const [a, b] of Object.entries(kv)) localStorage.setItem(a, b);
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${width} ${e}`));
    page.on('console', (m) => m.type() === 'error' && out.errores.push(`${width} ${m.text()}`));
    await page.goto(`${base}/?debug&god`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => { const s = window.__moki?.scene?.scenes[0]; return s && s.screen === 'play'; }, null, { timeout: 40000 });
    const t0 = Date.now();
    const muestras = [];
    const fotos = [4, 7, 9, 12];
    while (Date.now() - t0 < 40000) {
      const seg = (Date.now() - t0) / 1000;
      const m = await page.evaluate(() => {
        const s = window.__moki.scene.scenes[0];
        const cam = s.cameras.main;
        const z = s.zoom;
        const caja = (o) => { const b = o.getBounds(); return [Math.round((b.x - cam.worldView.x) * z), Math.round((b.y - cam.worldView.y) * z), Math.round(b.width * z), Math.round(b.height * z)]; };
        const enc = (b, L) => (L || []).some((q) => { const sp = q.sprite || q; if (!sp || !sp.getBounds || !sp.visible) return false; const c = sp.getBounds(); return b.x < c.right && b.right > c.x && b.y < c.bottom && b.bottom > c.y; });
        const toca = (o) => { const b = o.getBounds(); return enc(b, s.obstacles) ? 'obs' : enc(b, s.pickups) ? 'ficha' : false; };
        const V = s.vida;
        const r = { st: s.ambient && s.ambient.st, activa: !!(s.capas && s.capas.activa), screen: s.screen, vida: !!V };
        if (!V) return r;
        const m = V.m();
        const p = V.p();
        if (m) r.moki = { caja: caja(m.im), alfa: +m.im.alpha.toFixed(2), vis: +Math.max(0, Math.min(1, V.vis(m.x))).toFixed(2), tex: m.im.texture.key, flip: m.im.flipX || m.im.scaleX < 0, toca: toca(m.im) };
        if (p) { const b = p.im.getBounds(); r.papa = { caja: caja(p.im), piso: Math.round(b.bottom), toca: toca(p.im) }; }
        return r;
      });
      m.t = +seg.toFixed(1);
      muestras.push(m);
      if (dir && fotos.length && seg >= fotos[0]) await page.screenshot({ path: `${dir}/rama-${width}x${height}-t${fotos.shift()}.png` });
      await page.waitForTimeout(100);
    }
    const conM = muestras.filter((q) => q.moki);
    const conP = muestras.filter((q) => q.papa);
    const resumen = {
      tam: `${width}x${height}`,
      mokiPrimero: conM[0] && conM[0].t,
      mokiMuestras: conM.length,
      mokiAltoPx: conM.length ? Math.max(...conM.map((q) => q.moki.caja[3])) : 0,
      mokiTapadoMitad: conM.length ? +(conM.filter((q) => q.moki.vis < 0.5).length / conM.length).toFixed(2) : null,
      mokiEspejo: conM.some((q) => q.moki.flip),
      mokiToca: conM.filter((q) => q.moki.toca === 'obs').length,
      mokiFicha: conM.filter((q) => q.moki.toca === 'ficha').length,
      papaPrimero: conP[0] && conP[0].t,
      papaMuestras: conP.length,
      papaAltoPx: conP.length ? Math.max(...conP.map((q) => q.papa.caja[3])) : 0,
      papaPisoMax: conP.length ? Math.max(...conP.map((q) => q.papa.piso)) : null,
      papaToca: conP.filter((q) => q.papa.toca === 'obs').length,
      papaFicha: conP.filter((q) => q.papa.toca === 'ficha').length,
      papaArribaPx: conP.length ? Math.min(...conP.map((q) => q.papa.caja[1])) : null,
    };
    console.log(JSON.stringify(resumen));
    out.casos.push({ resumen, muestras });
    await ctx.close();
  }
} finally {
  await browser.close();
  writeFileSync(salida, JSON.stringify(out, null, 1));
  console.log('errores', out.errores.length, out.errores.slice(0, 5));
}
