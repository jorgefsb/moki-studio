// Sonda P27 candado honesto: en la tarjeta de fallo lee la píldora de reintento a +T ms tras la tarjeta.
// El juego avanza en tiempo de juego (s.update) hasta deadFor = tarjeta + T y la animación CSS de la píldora se
// congela en currentTime = T. Lee: bloqueada (disabled), % de llenado (background-size), fondo, borde, y el color
// promedio visible (llenado * naranja + resto * fondo) en matiz/saturación/luz HSL. También el deadFor en que se
// libera (ms de choque a partida). Normal: +0/+150/+300/+350; movimiento reducido: +0/+250/+400.
// Edge headless, 390x844 y 1280x720. Uso: node herramientas/sonda-p27.mjs <url-base> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const out = {};
const casos = [
  { k: '390', w: 390, h: 844, reduced: false, T: [0, 150, 300, 350] },
  { k: '1280', w: 1280, h: 720, reduced: false, T: [0, 150, 300, 350] },
  { k: '390-reducido', w: 390, h: 844, reduced: true, T: [0, 250, 400] },
  { k: '1280-reducido', w: 1280, h: 720, reduced: true, T: [0, 250, 400] },
];
try {
  for (const c of casos) {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: 1, reducedMotion: c.reduced ? 'reduce' : 'no-preference' });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.clear();
      localStorage.setItem('moki.primera', '1');
      localStorage.setItem('moki.tutorial', '1');
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${c.k}: ${e}`));
    page.on('console', (m) => m.type() === 'error' && errores.push(`${c.k}: ${m.text()}`));
    await page.goto(`${base}/?debug&nivel=clasico`);
    await page.waitForFunction(() => window.__moki && window.__moki.scene, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__moki.scene.scenes[0].game.loop.sleep());
    out[c.k] = await page.evaluate(async (T) => {
      const s = window.__moki.scene.scenes[0];
      s.startGame();
      s.god = false;
      s.tut = { stage: 4, state: 'off' };
      for (let f = 0; f < 900 && !s.deadFor; f++) s.update(f * 16.667, 16.667);
      while (!s.cardShown) s.update(0, 1);
      const tarjeta = Math.round(s.deadFor);
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      const pill = document.querySelector('.ui-fail .ui-pill');
      const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      const rgb = (str) => str.match(/[\d.]+/g).slice(0, 3).map(Number);
      const hsl = ([r, g, b]) => {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
        let h = 0;
        if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return { h: Math.round((h * 60 + 360) % 360), s: d ? +(d / (1 - Math.abs(2 * l - 1))).toFixed(2) : 0, l: +l.toFixed(2) };
      };
      const lee = () => {
        const cs = getComputedStyle(pill);
        const fondo = rgb(cs.backgroundColor);
        const img = cs.backgroundImage !== 'none';
        const size = cs.backgroundSize.split(' ')[0];
        // capa crema (imagen) que cubre la fracción 'cubre' del fondo; lleno = lo que ya se ve del fondo
        const cubre = !img ? 0 : size.endsWith('%') ? parseFloat(size) / 100 : size === 'auto' ? 1 : parseFloat(size) / pill.clientWidth;
        const lleno = 1 - cubre;
        const crema = hex('#f4e8d5');
        const visto = fondo.map((v, i) => Math.round(lleno * v + cubre * crema[i]));
        return { bloqueada: pill.disabled, ready: pill.classList.contains('ready'), lleno: +lleno.toFixed(2), fondo: cs.backgroundColor, borde: cs.borderTopColor, opacidad: +cs.opacity, visto: `rgb(${visto})`, hsl: hsl(visto) };
      };
      const anim = () => document.getAnimations().filter((a) => a.effect && a.effect.target === pill && a.animationName === 'ui-llena');
      const r = { tarjetaMs: tarjeta, duracionLlenado: anim()[0] ? anim()[0].effect.getComputedTiming().duration : null, cortes: [] };
      let liberaMs = null;
      for (const t of T) {
        while (s.deadFor < tarjeta + t) {
          s.update(0, 1);
          if (liberaMs == null && !pill.disabled) liberaMs = Math.round(s.deadFor);
        }
        anim().forEach((a) => { a.pause(); a.currentTime = t; });
        r.cortes.push({ T: t, deadFor: Math.round(s.deadFor), ...lee() });
      }
      r.liberaMs = liberaMs;
      // tras 200 ms reales (transiciones de color corriendo) el fondo liberado debe seguir naranja
      await new Promise((ok) => setTimeout(ok, 200));
      r.trasLiberar200ms = lee();
      return r;
    }, c.T);
    console.log(c.k, JSON.stringify(out[c.k]));
    await ctx.close();
  }
} finally {
  out.errores = errores;
  writeFileSync(salida, JSON.stringify(out, null, 1));
  console.log('errores', errores.length, errores.slice(0, 5));
  await browser.close();
}
