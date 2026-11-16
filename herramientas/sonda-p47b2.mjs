// P47b2 (15-nov): los 7 menores de ARTE P47-a, medidos (además de todo lo de sonda-p47a-tarjeta, de la que sale):
//  1 pares: etiqueta y su valor en renglones distintos (centro vertical a más de medio renglón) = 0
//  2 gris: el color de 'incluye Arriba' es un token de ARTE.md y su contraste sobre el papel de la tarjeta >= 4.5
//  3 aireOtraVez: px entre el botón 'Otra vez' y 'Sabemos que...' >= 12 (a 1280)
//  4 puntajePx: letra de 'Puntaje' y su cifra >= 18 px
//  5 cruza: las cifras que se suman (metros, piezas, Arriba) y el total no comparten la misma orilla derecha (px de diferencia) = 0
//  6 metrosPuntos: el renglón de metros dice sus puntos ('N m = N')
//  7 avisoContador: px de encime del aviso de logros con el contador de piezas del HUD, en toda la vida del aviso = 0
// P47-a (15-nov): la tarjeta de meta no quita nada de master. Bot hasta la meta y, con la tarjeta puesta, se leen por texto y
// geometría (px de pantalla): la tarjeta, la tira del Cuaderno (título, renglones y la línea 'Sigue'), el aviso de logros y el
// botón de sonido; y se cruzan todas las cajas entre sí (encimado = intersección > 0 px en x y en y).
// Para comparar con master: misma partida, misma semilla; la puerta pide Cuaderno y 'Sigue' iguales a master y 0 encimados.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p47b2.mjs <url> <WxH> <salida.json>
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
    // 7: el aviso de logros nace a ~500 ms y dura 2.4 s: se muestrea su caja contra la del contador de piezas cada 100 ms por 3.5 s
    await page.evaluate(() => { window.__av = (async () => {
      const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas.getBoundingClientRect();
      let max = 0, visto = 0, aT = null, aS = null; // P47b2-c: aire mínimo del aviso a la tarjeta y al botón de sonido (px)
      for (let i = 0; i < 35; i++) {
        const a = document.querySelector('.ui-logro');
        if (a) {
          visto++;
          const b = a.getBoundingClientRect(), cam = sc.cameras.main, k = cv.width / cam.width, h = sc.hudR.getBounds();
          const hx0 = cv.left + (h.x - cam.worldView.x) * cam.zoom * k - 12 * sc.hudR.scaleX * cam.zoom * k, hx1 = cv.left + (h.right - cam.worldView.x) * cam.zoom * k + 12 * sc.hudR.scaleX * cam.zoom * k;
          const hy0 = cv.top + (h.y - cam.worldView.y) * cam.zoom * k - 8, hy1 = cv.top + (h.bottom - cam.worldView.y) * cam.zoom * k + 8;
          const px = Math.min(Math.max(0, Math.min(b.right, hx1) - Math.max(b.left, hx0)), Math.max(0, Math.min(b.bottom, hy1) - Math.max(b.top, hy0)));
          max = Math.max(max, Math.round(px));
          const cd = document.querySelector('.ui-card'), so = sc.ui.state.soundBtn;
          const sep = (p, q) => { const dx = Math.max(q.left - p.right, p.left - q.right), dy = Math.max(q.top - p.bottom, p.top - q.bottom); return Math.round(dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy)); };
          if (cd) { const g = sep(b, cd.getBoundingClientRect()); aT = aT === null ? g : Math.min(aT, g); }
          if (so && so.offsetWidth) { const g = sep(b, so.getBoundingClientRect()); aS = aS === null ? g : Math.min(aS, g); }
        }
        await new Promise((ok) => setTimeout(ok, 100));
      }
      return { visto, max, aireTarjeta: aT, aireSonido: aS };
    })(); });
    await page.waitForTimeout(1300); // como sonda-p47a: las transiciones de entrada ya acabaron
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
      // P47-a QA 390: recorte por celda (scrollWidth > clientWidth) y celdas partidas en 2 renglones (alto > 1.5 renglones)
      // texto real (Range): corta = el texto se sale de su celda; fuera = se sale del área visible de la tarjeta (se recorta)
      const cr = card && card.getBoundingClientRect(), padR = card ? parseFloat(getComputedStyle(card).paddingRight) : 0;
      const celdas = card ? [...card.querySelectorAll('.ui-suma dt, .ui-suma dd')].filter((e) => e.textContent.trim()).map((e) => { const b = e.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(e); const tb = rg.getBoundingClientRect(), lh = parseFloat(getComputedStyle(e).lineHeight) || 20; return { t: e.textContent.trim(), tb: [tb.left, tb.top, tb.right, tb.bottom], dd: e.tagName === 'DD', x: Math.round(b.left), w: Math.round(b.width), corta: e.tagName === 'DD' && (tb.right > b.right + 1 || tb.left < b.left - 1), parte: b.height > lh * 1.5, fuera: tb.right > cr.right - padR + 1 }; }) : [];
      // (pisa = cajas de texto que se cruzan en x y más de 30 % del alto: la caja de la letra grande del total rebasa su renglón
      // unos px sin tocar tinta, eso no cuenta) una etiqueta puede correr sobre el hueco libre de la columna de al lado (Mejor marca, incluye Arriba): vale si no pisa otro texto
      const pisa = [];
      for (let i = 0; i < celdas.length; i++) for (let j = i + 1; j < celdas.length; j++) { const a = celdas[i].tb, b = celdas[j].tb; if (Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 0 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 0.3 * Math.min(a[3] - a[1], b[3] - b[1])) pisa.push(`${celdas[i].t} / ${celdas[j].t}`); }
      const recortes = [...celdas.filter((c) => c.corta || c.fuera).map((c) => `${c.t} x${c.x} w${c.w}`), ...pisa.map((p) => `pisa ${p}`)];
      const partidas = celdas.filter((c) => c.parte).map((c) => c.t);
      // P47b2 1-6
      const dts = card ? [...card.querySelectorAll('.ui-suma dt')].filter((e) => e.textContent.trim()) : [];
      const cy = (e) => { const b = e.getBoundingClientRect(); return (b.top + b.bottom) / 2; };
      const pares = dts.filter((dt) => { const dd = dt.nextElementSibling; if (!dd || !dd.textContent.trim()) return false; const lh = parseFloat(getComputedStyle(dt).lineHeight) || 18; return Math.abs(cy(dt) - cy(dd)) > lh / 2 || dd.getBoundingClientRect().left < dt.getBoundingClientRect().left; }).map((dt) => dt.textContent.trim());
      const hex = (c) => { const m = c.match(/\d+/g); return m ? '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('').toUpperCase() : c; };
      const Lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      const TOK = ['#0A0A0A', '#161616', '#FF6B35', '#FFA500', '#F4E8D5', '#B99168', '#22211F', '#B7B3AD', '#8A7E70', '#FFFFFF'];
      const sub = card && card.querySelector('.ui-suma .sub');
      let fondo = card && hex(getComputedStyle(card).backgroundColor);
      const gris = sub ? (() => { const c = hex(getComputedStyle(sub).color), a = Lum(c), b = Lum(fondo); return { color: c, fondo, token: TOK.includes(c), contraste: +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2) }; })() : null;
      const otra = card && card.querySelector('.ui-btn.primary'), vs = card && card.querySelector('.ui-voto-sub');
      const aireOtraVez = otra && vs ? Math.round(vs.getBoundingClientRect().top - otra.getBoundingClientRect().bottom) : null;
      const tot = card ? [...card.querySelectorAll('.ui-suma .total')] : [];
      const puntajePx = tot.length ? Math.min(...tot.map((e) => parseFloat(getComputedStyle(e).fontSize))) : null;
      const suman = card ? [...card.querySelectorAll('.ui-suma dd')].filter((dd) => { const dt = dd.previousElementSibling; return dd.textContent.trim() && dt && /Distancia|Piezas|incluye|Puntaje|Vuelta/.test(dt.textContent); }) : [];
      const ders = suman.map((e) => e.getBoundingClientRect().right);
      const cruzaCol = ders.length ? Math.round(Math.max(...ders) - Math.min(...ders)) : null;
      const md = card && [...card.querySelectorAll('.ui-suma dt')].find((e) => /Distancia/.test(e.textContent));
      const metrosTexto = md && md.nextElementSibling ? md.nextElementSibling.textContent : null;
      const metrosPuntos = !!(metrosTexto && /=\s*\d+/.test(metrosTexto));
      return {
        p47b2: { pares, gris, aireOtraVez, puntajePx, cruza: cruzaCol, metrosTexto, metrosPuntos },
        // P47b2-c: el renglón 'incluye' fuera de la columna de sumandos: su texto (dt + dd) termina a la izquierda de donde
        // empieza la cifra más ancha de los sumandos (gap px > 0); y aire del Cuaderno con el borde de abajo
        p47b2c: (() => {
          const sumandos = card ? [...card.querySelectorAll('.ui-suma dd')].filter((dd) => dd.textContent.trim() && /Distancia|Piezas|Puntaje|Vuelta/.test(dd.previousElementSibling.textContent)) : [];
          const izq = (e) => { const rg = document.createRange(); rg.selectNodeContents(e); return rg.getBoundingClientRect(); };
          // la columna de sumandos = la de la cifra de Piezas (en bajito hay dos columnas de cifras: 'incluye' va bajo Piezas)
          const pz = sumandos.find((dd) => /Piezas/.test(dd.previousElementSibling.textContent));
          const col = pz ? sumandos.filter((dd) => Math.abs(dd.getBoundingClientRect().right - pz.getBoundingClientRect().right) < 3) : [];
          const colIzq = col.length ? Math.round(Math.min(...col.map((e) => izq(e).left))) : null;
          const inc = card && [...card.querySelectorAll('.ui-suma .sub')].filter((e) => e.textContent.trim());
          const incDer = inc && inc.length ? Math.round(Math.max(...inc.map((e) => izq(e).right))) : null;
          const cb = cu && cu.getBoundingClientRect();
          return { incluyeTexto: inc && inc.length ? inc.map((e) => e.textContent.trim()).join(' ') : null, incluyeDer: incDer, colSumandosIzq: colIzq, incluyeFuera: incDer !== null && colIzq !== null ? colIzq - incDer : null, cuadernoBorde: cb ? Math.round(innerHeight - cb.bottom) : null };
        })(),
        recortes, partidas, celdas,
        cajas, encimados: enc,
        cuadernoTexto: cu ? cu.innerText.replace(/\s+/g, ' ').trim() : null,
        sigue: cu && cu.querySelector('.cu-sigue') ? cu.querySelector('.cu-sigue').textContent : null,
        avisoTexto: document.querySelector('.ui-logro') ? document.querySelector('.ui-logro').innerText.replace(/\s+/g, ' ') : null,
        scroll: card ? card.scrollHeight - card.clientHeight : null,
        letraMinSuma: Number.isFinite(fs) ? fs : null,
        tarjetaTexto: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 200) : null,
      };
    });
    r.p47b2.avisoContador = await page.evaluate(() => window.__av);
    out.corridas.push({ nombre: c.nombre, ...r });
    console.log(c.nombre, JSON.stringify({ recortes: r.recortes, encimados: r.encimados, scroll: r.scroll, ...r.p47b2, ...r.p47b2c }));
    await ctx.close();
  }
  console.log('consola', out.errores.length, out.errores.slice(0, 3));
  writeFileSync(salida, JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
