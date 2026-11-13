// P36j: texto de Copiar con 'Arriba +N'. Base: sonda-p36i. // P36i: la nota "Sube por arriba 2 veces" (arriba2) en ?ir=elige (nivel 3 sembrado). Bot adjust por la ruta de arriba
// ('arriba') y el mismo bot sin tocar las piezas del arco alto ('abajo': solo arcos genéricos). Lee qué pide el
// Cuaderno al empezar, st.altos, qué se tachó y el texto de la tira al terminar. Captura para invitado (no se abre aquí).
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p36i.mjs <url-base> <carpeta-salida> [semilla]
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [base, dir, seed = ''] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
const casos = [];
const SEMBRAR = () => {
  if (sessionStorage.getItem('sembrado')) return;
  sessionStorage.setItem('sembrado', '1');
  localStorage.clear(); // jugador nuevo: sin localStorage
};
async function corre(W, H, kind) {
  const nombre = `${kind}-${W}x${H}`;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEMBRAR);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${nombre} ${e}`));
  page.on('console', (m) => m.type() === 'error' && errores.push(`${nombre} ${m.text()}`));
  await page.goto(`${base}/?ir=elige&debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(
    async ({ kind, sd }) => {
      const s = window.__moki.scene.scenes[0];
      const tachados = [];
      const sh0 = s.ui.showTachado.bind(s.ui);
      s.ui.showTachado = (txt, z) => (tachados.push(txt), sh0(txt, z));
      const col0 = s.collect.bind(s);
      let saltadas = 0;
      s.collect = (k) => (kind === 'abajo' && k.alto ? (saltadas++, k.taken = true, undefined) : col0(k));
      const out = await window.__moki.moki.bot('adjust', 200, sd || null);
      const P = s.partida || {};
      const txt = s.textoCompartir(); return { txt, arribaEscena: s.arriba, result: out.result, meters: out.meters, nivelPartida: P.nivel, altos: P.altos, arcs: P.arcs, saltadas, tachados, porTacharFin: (s.porTachar || []).map((n) => n.id), horq: (s.level && s.level.horq || []).length, modo: s.level && s.level.modo };
    },
    { kind, sd: seed }
  );
  const tira = await page.evaluate(() => [...document.querySelectorAll('.cu-txt')].map((e) => `${e.textContent} ${e.nextSibling ? e.nextSibling.textContent : ''}`));
  await page.screenshot({ path: `${dir}/${nombre}.png` });
  console.log(nombre, JSON.stringify({ ...r, tira }));
  casos.push({ caso: nombre, ...r, tira });
  await ctx.close();
}
try {
  for (const [W, H] of [[390, 844], [1280, 720]]) for (const k of ['arriba', 'abajo']) await corre(W, H, k);
} finally {
  await browser.close();
}
writeFileSync(`${dir}/sonda.json`, JSON.stringify({ base, seed, casos, errores }, null, 1));
console.log('errores', errores.length, errores.slice(0, 5));
