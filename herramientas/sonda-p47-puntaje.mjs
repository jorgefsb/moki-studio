// P47 (15-nov): LA TARJETA FINAL EXPLICA SU PUNTAJE. Cada partida corre con bot hasta la meta y se lee la tarjeta.
// Pasa si, en el 100 % de las partidas que llegan a la meta:
//  - Puntaje de la escena = metros x scorePerMeter + piezas x scorePerPiece (x1.25 con piso en Vuelta rápida), cifras congeladas;
//  - la tarjeta trae la cuenta (.ui-suma): los renglones que no son 'sub' ni 'total' suman EXACTO el total, y el total = Puntaje;
//  - el renglón de piezas dice 'N x10 = N*10' con N = el contador del HUD; el de Arriba (sub) = arriba x10 y arriba <= piezas;
//  - el total de la tarjeta = la mejor marca guardada si fue nueva marca.
// En master no hay .ui-suma: se reporta 'sin cuenta' (lo que la pieza arregla) y se mide igual la identidad de la escena.
// Corridas: 1.ª partida de jugador nuevo, Reto, Libre (sube), Libre (a ras), Libre con Vuelta rápida, liga ?ir=meta.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p47-puntaje.mjs <url> <WxH> <salida.json> [filtro]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, salida, SOLO] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const out = { url, tam, corridas: [], errores: [] };
const SELLO = JSON.stringify({ v: 2, notas: [], sellos: ['coleccionista'] });
const CORRIDAS = [
  { nombre: 'nuevo 1a partida', ls: null, bot: 'adjust', seed: null },
  { nombre: 'reto 2026-11-15', ls: { 'moki.modo': 'reto' }, bot: 'adjust', seed: '2026-11-15' },
  { nombre: 'libre 1037 sube', ls: { 'moki.modo': 'libre' }, bot: 'adjust', seed: '1037' },
  { nombre: 'libre 1037 a ras', ls: { 'moki.modo': 'libre' }, bot: 'abajo', seed: '1037' },
  { nombre: 'libre 2042 vuelta', ls: { 'moki.modo': 'libre', 'moki.vuelta': '1', 'moki.cuaderno': SELLO }, bot: 'adjust', seed: '2042', vuelta: true },
  { nombre: 'liga ir=meta', ls: null, bot: 'adjust', seed: null, q: '&ir=meta' },
];
try {
  for (const c of CORRIDAS) {
    if (SOLO && !c.nombre.includes(SOLO)) continue;
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
    await page.goto(`${url}/?debug${c.q || ''}`);
    await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async ([bot, seed, vuelta, ir]) => {
      const sc = window.__moki.scene.scenes[0];
      const fallos = [];
      if (ir) sc.irHecho = false; // la liga ya arrancó sola; el bot llama startGame otra vez: que vuelva a nacer en la página del destino
      let dist0 = null;
      const oSG = sc.startGame.bind(sc);
      sc.startGame = (...a) => { const x = oSG(...a); dist0 = Math.round(sc.dist / 100); return x; };
      const res = await window.__moki.moki.bot(bot, 260, seed);
      sc.startGame = oSG;
      const r = { result: res.result, cause: res.cause, screen: sc.screen, vueltaRun: sc.vueltaRun, m0: dist0, fallos };
      if (ir && !(dist0 > 300)) fallos.push({ que: 'la liga no arrancó en la última página', m0: dist0 });
      if (sc.screen !== 'final') return r;
      for (let i = 0; i < 300 && !document.querySelector('.ui-card'); i++) {
        sc.update(0, 16.7);
        await new Promise((ok) => setTimeout(ok, 16));
      }
      const d = sc.finalData;
      const porM = 1, porP = 10, mult = sc.vueltaRun ? 1.25 : 1; // C.scorePerMeter / scorePerPiece / vuelta.scoreMult (config.js)
      const esperado = Math.floor((d.meters * porM + d.valor * porP) * mult);
      Object.assign(r, { meters: d.meters, valor: d.valor, arriba: d.arriba, score: d.score, esperado, best: d.best, isNew: d.isNew });
      if (vuelta && !sc.vueltaRun) fallos.push({ que: 'la corrida de vuelta no corrió en Vuelta rápida' });
      if (d.score !== esperado) fallos.push({ que: 'Puntaje != metros + piezas x10 (x vuelta)', score: d.score, esperado });
      const card = document.querySelector('.ui-card');
      const suma = card && card.querySelector('.ui-suma');
      if (!suma) { r.cuenta = null; r.texto = card ? card.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; return r; }
      const dts = [...suma.querySelectorAll('dt')];
      const filas = dts.map((dt) => ({ k: dt.textContent, v: dt.nextElementSibling.textContent, cls: dt.className }));
      r.cuenta = filas;
      const cifra = (v) => { const m = String(v).match(/(?:=|\+)\s*(\d+)\s*$/); return m ? +m[1] : null; };
      const sumandos = filas.filter((f) => !/sub|total/.test(f.cls));
      const tot = filas.find((f) => /total/.test(f.cls));
      const s = sumandos.reduce((a, f) => a + (cifra(f.v) ?? NaN), 0);
      r.sumaRenglones = s;
      r.total = tot ? +tot.v : null;
      if (s !== r.total) fallos.push({ que: 'renglones != total', s, total: r.total });
      if (r.total !== d.score) fallos.push({ que: 'total != Puntaje', total: r.total, score: d.score });
      const pz = sumandos.find((f) => /Piezas|Pieces/.test(f.k));
      const mp = pz && String(pz.v).match(/^(\d+) x(\d+) = (\d+)$/);
      if (!mp || +mp[1] !== d.valor || +mp[1] * +mp[2] !== +mp[3]) fallos.push({ que: 'renglón de piezas mal', v: pz && pz.v, valor: d.valor });
      const ds = sumandos.find((f) => /Distancia|Distance/.test(f.k));
      const md = ds && String(ds.v).match(/^(\d+) m = (\d+)$/);
      if (!md || +md[1] !== d.meters || +md[2] !== d.meters * porM) fallos.push({ que: 'renglón de metros mal', v: ds && ds.v });
      const sub = filas.find((f) => /sub/.test(f.cls));
      if (d.arriba) {
        const ma = sub && String(sub.v).match(/^(\d+) x(\d+) = (\d+)$/);
        if (!ma || +ma[1] !== d.arriba || +ma[3] !== d.arriba * porP || d.arriba > d.valor) fallos.push({ que: 'renglón Arriba mal', v: sub && sub.v, arriba: d.arriba });
      } else if (sub) fallos.push({ que: 'renglón Arriba sin arriba', v: sub.v });
      if (d.isNew && d.best !== r.total) fallos.push({ que: 'mejor marca != total', best: d.best });
      // nada se corta: cada renglón cabe en la tarjeta (sin scroll horizontal ni texto desbordado)
      const cb = card.getBoundingClientRect();
      for (const e of suma.children) { const b = e.getBoundingClientRect(); if (b.right > cb.right + 0.5 || b.left < cb.left - 0.5) fallos.push({ que: 'renglón fuera de la tarjeta', t: e.textContent }); }
      if (card.scrollHeight > card.clientHeight + 1) r.scroll = card.scrollHeight - card.clientHeight;
      return r;
    }, [c.bot, c.seed, !!c.vuelta, !!c.q]);
    if (r.screen !== 'final') r.fallos.push({ que: 'no llegó a la meta', result: r.result, cause: r.cause });
    out.corridas.push({ nombre: c.nombre, ...r });
    console.log(c.nombre, JSON.stringify({ final: r.screen === 'final', m0: r.m0, m: r.meters, piezas: r.valor, arriba: r.arriba, score: r.score, esperado: r.esperado, total: r.total, suma: r.sumaRenglones, vuelta: r.vueltaRun, scroll: r.scroll, cuenta: r.cuenta && r.cuenta.map((f) => `${f.k}: ${f.v}`), texto: r.texto, fallos: r.fallos.slice(0, 4) }));
    await ctx.close();
  }
  const llegaron = out.corridas.filter((x) => x.screen === 'final');
  const conCuenta = llegaron.filter((x) => x.cuenta);
  const fallos = out.corridas.reduce((a, x) => a + x.fallos.length, 0);
  out.veredicto = { corridas: out.corridas.length, llegaron: llegaron.length, conCuenta: conCuenta.length, fallos, consola: out.errores.length, ok: llegaron.length === out.corridas.length && conCuenta.length === llegaron.length && fallos === 0 && out.errores.length === 0 };
  console.log('veredicto', JSON.stringify(out.veredicto), out.errores.slice(0, 3));
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
