// P36h: cómo queda la tarjeta donde termina la partida (final y fallo) tras cobrar arcos altos en ?ir=elige.
// Bot adjust (toma la ruta de arriba). 'fallo': tras el 2.º arco alto el bot deja de saltar y choca.
// Lee el texto de la tarjeta, si dice "Arriba", si se corta (scroll) y si tapa a Moki; guarda captura (la revisa un invitado).
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36h.mjs <url-base> <carpeta-salida> [semilla]
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, dir, seed = ''] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const casos = [];
const SEMBRAR = (o) => {
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
async function corre(W, H, kind) {
  const nombre = `${kind}-${W}x${H}`;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, { 'moki.primera': '1', 'moki.tutorial': '1' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?ir=elige&debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(
    async ({ kind, sd }) => {
      const s = window.__moki.scene.scenes[0];
      let altos = 0;
      const col0 = s.collect.bind(s);
      s.collect = (k) => {
        const antes = k.arc ? s.arcGot[k.arc] || 0 : 0;
        col0(k);
        if (k.alto && antes + 1 === k.arcN) altos += 1;
      };
      const pr0 = s.press.bind(s);
      s.press = (...a) => (kind === 'fallo' && altos >= 2 ? undefined : pr0(...a));
      const out = await window.__moki.moki.bot('adjust', 200, sd || null);
      return { result: out.result, score: out.score, meters: out.meters, altos };
    },
    { kind, sd: seed }
  );
  // El bucle real va lento en headless: se avanza a mano con game.step (update + render) hasta 900 ms después de la tarjeta y se congela el bucle (la tarjeta queda quieta para medir y capturar)
  console.log('  estado', JSON.stringify(await page.evaluate(() => { const s = window.__moki.scene.scenes[0]; const g = s.sys.game; let t = performance.now(); let extra = 0; for (let i = 0; i < 400 && extra < 54; i++) { t += 16.667; g.step(t, 16.667); if (s.finalShown || s.cardShown) extra++; } g.loop.sleep(); return { screen: s.screen, finalShown: s.finalShown, cardShown: s.cardShown, cards: document.querySelectorAll(".ui-card").length }; })));
  await page.waitForTimeout(600); // la entrada CSS de la tarjeta (sube 18 px en 250 ms) corre con el reloj real: medir ya asentada
  const card = await page.evaluate(() => {
    const s = window.__moki.scene.scenes[0];
    const c = [...document.querySelectorAll('.ui-card')].find((e) => e.getBoundingClientRect().width > 0 && e.querySelector('h2'));
    if (!c) return null;
    c.style.transition = 'none'; // captura y medida en reposo (la entrada CSS no avanza con el bucle congelado)
    c.style.transform = 'none';
    const b0 = c.getBoundingClientRect();
    const b = { left: b0.left, right: b0.right, width: b0.width, top: c.offsetTop, height: c.offsetHeight, bottom: c.offsetTop + c.offsetHeight };
    const cv = document.querySelector('canvas').getBoundingClientRect();
    const z = s.zoom;
    const C = window.__moki.config || null;
    const moki = { x0: cv.left + s.px * z, x1: cv.left + (s.px + 60) * z, y0: cv.top + s.cabezaY(), y1: cv.top + s.cabezaY() + 80 * z }; // cabeza y torso de Moki
    const tapa = b.left < moki.x1 && moki.x0 < b.right && b.top < moki.y1 && moki.y0 < b.bottom;
    const arriba = [...c.querySelectorAll('*')].find((e) => /Arriba|Up top/.test(e.textContent) && !e.children.length);
    const ab = arriba && arriba.getBoundingClientRect();
    return {
      clase: c.className, dbg: { off: c.offsetTop, oh: c.offsetHeight, mh: c.style.maxHeight, cab: Math.round(s.cabezaY()), cvTop: Math.round(cv.top), uiTop: Math.round(document.getElementById('ui').getBoundingClientRect().top), fr: s.failRect() },
      texto: c.innerText.replace(/\n+/g, ' | '),
      caja: [b.left, b.top, b.width, b.height].map(Math.round),
      cortada: c.scrollHeight > c.clientHeight + 1,
      ddCortado: [...c.querySelectorAll('dd')].filter((e) => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map((e) => e.textContent),
      cuaderno: (() => { const q = document.querySelector('.ui-cuaderno'); return q ? q.style.visibility !== 'hidden' && q.style.display !== 'none' && !q.hidden : null; })(),
      tapaMoki: tapa,
      moki: Object.values(moki).map(Math.round),
      arriba: ab ? { txt: arriba.textContent, caja: [ab.left, ab.top, ab.width, ab.height].map(Math.round), visible: ab.bottom <= b0.bottom && ab.height > 0, fontPx: parseFloat(getComputedStyle(arriba).fontSize) } : null,
      sinC: !C,
    };
  });
  await page.screenshot({ path: `${dir}/${nombre}.png` });
  console.log(nombre, JSON.stringify({ ...r, card }));
  casos.push({ caso: nombre, ...r, card });
  await ctx.close();
}
try {
  for (const [W, H] of (process.env.SOLO ? [[390, 844]] : [[390, 844], [375, 667], [1280, 720]])) for (const k of ['fallo', 'final']) await corre(W, H, k);
} finally {
  await browser.close();
}
writeFileSync(`${dir}/sonda.json`, JSON.stringify({ base, seed, casos, errores }, null, 1));
console.log('errores', errores.length, errores.slice(0, 5));
