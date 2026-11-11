// Bots P8b MEGA x2.0: los 6 casos de bots-p8 (modos viejos) + MEGA x1.5 (?ir=mega) y MEGA x2.0 (?ir=mega2) con adjust/tap/hold/pasivo.
// Por caso MEGA lee los logros guardados (mega15 / mega20) y si la tarjeta MEGA deja abierto x2.0 (umbral: meta en x1.5).
// Edge headless 1280x720; correr con flock /tmp/moki-pesado.lock.
// Uso: node herramientas/bots-p8b.mjs <url-base> <salida.json> [mega|solo-mega|tarjeta]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, salida] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const casos = [];
const SEMBRAR = (o) => {
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear();
  for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v);
};
async function corre(nombre, q, ls, kind, seed, sel = 0) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR, { 'moki.primera': '1', 'moki.tutorial': '1', ...ls });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?debug${q}`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async ([k, sd, sl]) => {
    const sc = window.__moki.scene.scenes[0];
    if (sl) sc.megaSel = sl; // camino de la tarjeta: el botón x1.5 / x2.0 deja megaSel y llama startGame (localStorage real)
    const r = await window.__moki.moki.bot(k, 200, sd);
    const out = { ...r, mega: sc.megaRun || 0, best: sc.bestMode() };
    // el bot corta al llegar a 'final'; la tarjeta de fin (marca, Cuaderno y logros) sale a los 1200 ms de juego: 2 s más de cuadros
    for (let f = 0; f < 120 && sc.screen === 'final'; f++) sc.update(0, 16.667);
    // logrosUi es diferido: por la tarjeta se baja hasta la meta (con ?ir=mega ya venía cargado por el Reto); hasta 20 s
    for (let i = 0; i < 40; i++) {
      await new Promise((ok) => setTimeout(ok, 500));
      if (!(out.mega && r.result === 'termino') || (localStorage.getItem('moki.logros') || '').includes(sc.megaOn >= 2 ? 'mega20' : 'mega15')) break;
    }
    const l = JSON.parse(localStorage.getItem('moki.logros') || 'null');
    out.logros = l ? l.ganados.filter((x) => x.startsWith('mega')) : [];
    out.x2abierto = !sc.tarjetaMega().sel[1].cerrado;
    out.marcas = { mega: localStorage.getItem('moki.best.mega'), mega2: localStorage.getItem('moki.best.mega2') };
    return out;
  }, [kind, seed, sel]);
  console.log(nombre, JSON.stringify({ result: r.result, cause: r.cause, score: r.score, pieces: r.pieces, seconds: r.seconds, mega: r.mega, best: r.best, logros: r.logros, x2abierto: r.x2abierto, marcas: r.marcas }));
  casos.push({ caso: nombre, ...r });
  await ctx.close();
}
try {
  if (!['solo-mega', 'tarjeta'].includes(process.argv[4])) {
  await corre('clasico adjust', '&nivel=clasico', {}, 'adjust', null);
  await corre('reto 2026-10-31', '', { 'moki.modo': 'reto' }, 'adjust', '2026-10-31');
  await corre('libre 1037', '', { 'moki.modo': 'libre' }, 'adjust', '1037');
  for (const k of ['tap', 'hold', 'pasivo']) await corre(`clasico ${k}`, '&nivel=clasico', {}, k, null);
  }
  // umbral por la tarjeta (sin ?ir=, se guarda de verdad): nivel 1 terminado -> x1.5 a la meta abre x2.0; con mega15 -> x2.0 a la meta gana mega20
  if (process.argv[4] === 'tarjeta' || process.argv[4] === 'mega') {
    const N1 = { 'moki.cuaderno': JSON.stringify({ v: 2, notas: ['cajas3', 'cajas5', 'piezas15'], sellos: [] }) };
    await corre('tarjeta x1.5 adjust', '', N1, 'adjust', null, 1.5);
    await corre('tarjeta x2.0 adjust', '', { ...N1, 'moki.logros': JSON.stringify({ v: 1, ganados: ['mega15'], avisados: ['mega15'], vistos: ['mega15'], retoDia: 0, retoN: 0 }) }, 'adjust', null, 2);
  }
  if (process.argv[4] === 'mega' || process.argv[4] === 'solo-mega') for (const ir of ['mega', 'mega2']) for (const k of ['adjust', 'tap', 'hold', 'pasivo']) await corre(`${ir} ${k}`, `&ir=${ir}`, {}, k, null);
} finally {
  await browser.close();
}
writeFileSync(salida, JSON.stringify({ base, casos, errores }, null, 1));
console.log('errores', errores.length);
