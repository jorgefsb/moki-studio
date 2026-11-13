// P4t: ¿suena el crujido al tropezar? Cuenta, en el build y sin oído, los filtros bandpass de 2.2 kHz ±15 % con Q 2 que
// se crean en el choque (firma de los granos de stumble). Bots: pasivo→caja, tap→torre, hold→viga. Zanja: choque forzado
// con s.crash({ type: 'zanja' }) a 2 s de partida (en Clásico no aparece zanja). Edge headless 1280x720, autoplay sin gesto.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p4t.mjs <url-base> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new', '--autoplay-policy=no-user-gesture-required'] });
const errores = [];
const casos = [];
const ESPIA = () => {
  window.__bq = [];
  const P = (window.BaseAudioContext || window.AudioContext).prototype;
  const orig = P.createBiquadFilter;
  P.createBiquadFilter = function () {
    const n = orig.call(this);
    window.__bq.push(n);
    return n;
  };
  if (!sessionStorage.getItem('sembrado')) {
    sessionStorage.setItem('sembrado', '1');
    localStorage.clear();
    localStorage.setItem('moki.primera', '1');
    localStorage.setItem('moki.tutorial', '1');
  }
};
const cuenta = () => window.__bq.filter((b) => b.type === 'bandpass' && b.Q.value === 2 && b.frequency.value >= 1870 && b.frequency.value <= 2530).length;
try {
  for (const [nombre, kind] of [['caja', 'pasivo'], ['torre', 'tap'], ['viga', 'hold'], ['zanja', null]]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(ESPIA);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
    page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
    await page.goto(`${base}/?debug`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.mouse.click(4, 716); // gesto en una esquina vacía: abre el AudioContext
    await page.waitForTimeout(800);
    const r = await page.evaluate(async ([k, cuentaSrc]) => {
      const cuenta = eval(cuentaSrc);
      const s = window.__moki.scene.scenes[0];
      const out = {};
      if (k) {
        const b = await window.__moki.moki.bot(k, 200);
        const antes = cuenta();
        out.bot = { result: b.result, cause: b.cause };
        out.granos = cuenta();
        out.antesDelFin = antes;
      } else {
        await window.__moki.moki.bot('pasivo', 2);
        const antes = cuenta();
        s.crash({ type: 'zanja', D: s.dist + 10, W: 40, x: s.px + 10, size: { width: 40, height: 10 } });
        out.bot = { result: s.screen, cause: s.cause };
        out.granos = cuenta() - antes;
      }
      out.ctx = window.__bq.length ? window.__bq[0].context.state : 'sin-ctx';
      return out;
    }, [kind, cuenta.toString()]);
    console.log(nombre, JSON.stringify(r));
    casos.push({ caso: nombre, ...r });
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log('errores', errores.length, errores.slice(0, 5).join(' | '));
writeFileSync(salida, JSON.stringify({ casos, errores }, null, 1));
