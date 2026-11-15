// P47-a (15-nov): la tarjeta de meta no quita nada de master. Bot hasta la meta y, con la tarjeta puesta, se leen por texto y
// geometría (px de pantalla): la tarjeta, la tira del Cuaderno (título, renglones y la línea 'Sigue'), el aviso de logros y el
// botón de sonido; y se cruzan todas las cajas entre sí (encimado = intersección > 0 px en x y en y).
// Para comparar con master: misma partida, misma semilla; la puerta pide Cuaderno y 'Sigue' iguales a master y 0 encimados.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p47a-tarjeta.mjs <url> <WxH> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, corridas: [], errores: [] };
const CORRIDAS = [
  { nombre: 'nuevo 1a partida', ls: null, seed: null },
  { nombre: 'reto 2026-11-15', ls: { 'moki.modo': 'reto' }, seed: '2026-11-15' },
  { nombre: 'libre 1037', ls: { 'moki.modo': 'libre' }, seed: '1037' },
];
try {
  for (const c of CORRIDAS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript((ls) => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      if (ls) { localStorage.setItem('moki.tutorial', '1'); localStorage.setItem('moki.primera', '1'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); }
    }, c.ls);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errores.push(`${c.nombre} ${String(e).slice(0, 300)}`));
    page.on('console', (m) => m.type() === 'error' && out.errores.push(`${c.nombre} ${m.text().slice(0, 300)}`));
    await page.goto(`${url}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(async (seed) => {
      const sc = window.__moki.scene.scenes[0];
      await window.__moki.moki.bot('adjust', 260, seed);
      for (let i = 0; i < 300 && !document.querySelector('.ui-card'); i++) { sc.update(0, 16.7); await new Promise((ok) => setTimeout(ok, 16)); }
    }, c.seed);
    await page.waitForTimeout(1300); // el aviso de logros nace a 500 ms y dura 2.4 s; las transiciones de entrada ya acabaron
    const r = await page.evaluate(() => {
      const caja = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) } : null; };
      const sc = window.__moki.scene.scenes[0];
      const cu = document.querySelector('.ui-cuaderno');
      const cajas = {
        tarjeta: caja(document.querySelector('.ui-card')),
        cuaderno: caja(cu),
        cuTitulo: caja(cu && cu.querySelector('.cu-head')),
        aviso: caja(document.querySelector('.ui-logro')),
        sonido: caja(sc.ui.state.soundBtn),
      };
      const enc = [];
      const ks = Object.keys(cajas).filter((k) => cajas[k] && k !== 'cuTitulo');
      const cruza = (a, b) => Math.min(Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)));
      for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const px = cruza(cajas[ks[i]], cajas[ks[j]]); if (px > 0) enc.push(`${ks[i]}/${ks[j]} ${px}px`); }
      if (cajas.aviso && cajas.cuTitulo && cruza(cajas.aviso, cajas.cuTitulo) > 0) enc.push('aviso/tituloCuaderno');
      const card = document.querySelector('.ui-card');
      const fs = card ? Math.min(...[...card.querySelectorAll('.ui-suma dt, .ui-suma dd')].map((e) => parseFloat(getComputedStyle(e).fontSize))) : null;
      return {
        cajas, encimados: enc,
        cuadernoTexto: cu ? cu.innerText.replace(/\s+/g, ' ').trim() : null,
        sigue: cu && cu.querySelector('.cu-sigue') ? cu.querySelector('.cu-sigue').textContent : null,
        avisoTexto: document.querySelector('.ui-logro') ? document.querySelector('.ui-logro').innerText.replace(/\s+/g, ' ') : null,
        scroll: card ? card.scrollHeight - card.clientHeight : null,
        letraMinSuma: Number.isFinite(fs) ? fs : null,
        tarjetaTexto: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 200) : null,
      };
    });
    out.corridas.push({ nombre: c.nombre, ...r });
    console.log(c.nombre, JSON.stringify(r));
    await ctx.close();
  }
  console.log('consola', out.errores.length, out.errores.slice(0, 3));
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
