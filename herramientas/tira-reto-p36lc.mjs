// P36l-c (probador): tira de Reto con horquilla. Al cerrar un arco (alto o a ras) captura 10 cuadros a 200 ms y mide si la píldora
// (+12/+5) se enciman con otro Text visible (combo 'x2 +8', etc.). Uso: flock /tmp/moki-pesado.lock node herramientas/tira-reto-p36lc.mjs <url> <WxH> <prefijo> [semilla]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, tam, pre, seed = '2026-10-31', bot = 'adjust'] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const errores = [];
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(W < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('moki.primera', '1'); localStorage.setItem('moki.tutorial', '1'); localStorage.setItem('moki.modo', 'reto'); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(String(e).slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errores.push(m.text()));
  await page.goto(`${url}/?debug`);
  await page.waitForFunction(() => window.__moki && window.__moki.moki, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async ([seed, bot]) => {
    const sc = window.__moki.scene.scenes[0], cv = sc.game.canvas, orig = sc.update.bind(sc), oc = sc.collect.bind(sc);
    const sk = Math.min(1, 480 / cv.width), cw = Math.round(cv.width * sk), ch = Math.round(cv.height * sk);
    const pinta = () => { const R = sc.game.renderer; R.preRender(); sc.sys.render(R); R.postRender(); const c = document.createElement('canvas'); c.width = cw; c.height = ch; c.getContext('2d').drawImage(cv, 0, 0, cw, ch); return c; };
    const textos = () => { const out = []; const rec = (l) => { for (const o of l) { if (o.type === 'Container' && o.list) rec(o.list); else if (o.type === 'Text' && o.visible && o.alpha > 0.3 && o.text) { const b = o.getBounds(); out.push({ t: o.text, x: b.x, y: b.y, w: b.width, h: b.height }); } } }; rec(sc.sys.displayList.list); return out; };
    const sol = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const eventos = []; let act = null;
    sc.collect = (k) => {
      const antes = (sc.arcGot && k.arc && sc.arcGot[k.arc]) || 0, x = oc(k);
      const cerro = k.arc && antes + 1 === k.arcN && sc.arcGot[k.arc] === k.arcN;
      if (cerro && (k.alto || k.ras) && !act && eventos.length < 3) { act = { t: Math.round(sc.t), alto: !!k.alto, ras: !!k.ras, combo: sc.combo, cuadros: [], enc: [], ult: -1e9 }; eventos.push(act); }
      return x;
    };
    sc.update = (a, b) => {
      const ret = orig(a, b);
      if (act && sc.t - act.ult >= 200) {
        act.ult = sc.t; act.cuadros.push(pinta());
        const T = textos(), pil = T.filter((q) => /^\+\d+$/.test(q.t)), otros = T.filter((q) => !/^\+\d+$/.test(q.t) || false);
        for (const p of pil) { for (const o of T) if (o !== p && sol(p, o)) act.enc.push({ cuadro: act.cuadros.length, pildora: p.t, con: o.t }); }
        if (act.cuadros.length >= 10) act = null;
      }
      return ret;
    };
    await window.__moki.moki.bot(bot, 200, seed);
    sc.update = orig; sc.collect = oc;
    return eventos.map((e) => { const cols = 5, rows = 2, T = document.createElement('canvas'); T.width = cols * cw + (cols + 1) * 4; T.height = rows * ch + (rows + 1) * 4; const g = T.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, T.width, T.height); e.cuadros.forEach((c, i) => g.drawImage(c, 4 + (i % cols) * (cw + 4), 4 + ((i / cols) | 0) * (ch + 4))); return { t: e.t, alto: e.alto, ras: e.ras, combo: e.combo, n: e.cuadros.length, enc: e.enc, png: T.toDataURL('image/png') }; });
  }, [seed, bot]);
  const res = r.map((e, i) => { writeFileSync(`${pre}-${i}.png`, Buffer.from(e.png.split(',')[1], 'base64')); const { png, ...resto } = e; return resto; });
  writeFileSync(`${pre}.json`, JSON.stringify({ url, tam, seed, eventos: res, errores }, null, 1));
  console.log(JSON.stringify({ eventos: res, errores: errores.length }));
} finally { await browser.close(); }
