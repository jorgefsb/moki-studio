// P38 (constructor, 13-nov): polvo del aterrizaje, color y origen. Sirve una carpeta de build, siembra Math.random,
// fuerza aterrizajes (presión 400 ms = fuerte, 16 ms = normal) en Clásico con god y reloj dormido (60 fps, sys.step).
// 1) ORIGEN, a 390x844, 660x900 y 1280x720 de día: suela de Moki (fila sólida más baja del cuadro, alfa>=128, x de sus
//    píxeles en las 3 filas de abajo) contra las nubes chipPolvo a +0/+16/+33 ms. Hueco izq = suela.izq - borde der de la
//    nube izquierda más cercana; hueco der = borde izq de la nube derecha más cercana - suela.der (0 si se enciman).
//    En px de pantalla (CSS).
// 2) COLOR, a 390 y 1280, día y noche, +16 y +33 ms: cuadro A con polvo y B sin polvo (delta 0); píxeles |A-B|>24 = polvo
//    compuesto. HSL promedio, % frío (S<15 % o tono>60°), contraste contra el suelo de debajo. Guarda el cuadro A.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p38.mjs <carpeta build> <tag> <carpeta salida>
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [dir, tag, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
const sv = createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = join(dir, p);
  if (!existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f));
});
await new Promise((res) => sv.listen(0, '127.0.0.1', res));
const url = `http://127.0.0.1:${sv.address().port}`;
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
const PRE = (o) => { let a = 12345; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  if (sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1'); localStorage.clear(); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); };
const errs = [];
const out = { tag, origen: {}, color: [], errores: errs };

async function abrir(w, h, hora) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(PRE, { 'moki.primera': '1', 'moki.tutorial': '1', 'moki.done': '1', 'moki.juice': '2' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`${hora} ${w} ${e}`.slice(0, 300)));
  page.on('console', (m) => m.type() === 'error' && !/403|404/.test(m.text()) && errs.push(`${hora} ${w} ${m.text()}`));
  await page.goto(`${url}/${hora === 'dia' ? '?debug&nivel=clasico' : '?debug&ir=libre-noche'}`);
  await page.waitForFunction(() => window.__moki && window.__moki.scene.scenes[0].poses, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const sc = window.__moki.scene.scenes[0]; sc.irHecho = false; sc.startGame(); sc.god = true; sc.tut = { stage: 4, state: 'off' }; sc.game.loop.sleep();
    const dt = 1000 / 60; window.__p = { tt: performance.now(), dt, step: () => { window.__p.tt += dt; sc.sys.step(window.__p.tt, dt); } };
    for (let i = 0; i < 60 || (sc.t < 3000 && i < 900) || (sc.ambient && sc.tramoIdx === 3 && !sc.ambient.night && i < 1500); i++) { window.__p.step(); if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); }
  });
  return { ctx, page };
}
const salta = (page, holdMs) => page.evaluate((holdMs) => {
  const sc = window.__moki.scene.scenes[0], P = window.__p;
  for (let i = 0; i < 40; i++) P.step();
  sc.press(); const t0 = sc.t; let soltado = false;
  for (let i = 0; i < 300; i++) { if (!soltado && sc.t - t0 >= holdMs) { sc.release(); soltado = true; } P.step(); if (soltado && sc.grounded && sc.landAt > t0) break; }
}, holdMs);
const origenEn = (page, ms) => page.evaluate((ms) => {
  const sc = window.__moki.scene.scenes[0], P = window.__p;
  while (sc.t - sc.landAt < ms - 1) P.step();
  const cam = sc.cameras.main, cv = sc.game.canvas, k = (cv.clientWidth / cv.width) * cam.zoom, x0 = cam.worldView.x;
  const sp = sc.poses.sprite, fr = sp.frame;
  const c = document.createElement('canvas'); c.width = fr.cutWidth; c.height = fr.cutHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(fr.source.image, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, 0, fr.cutWidth, fr.cutHeight);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let baja = -1;
  for (let y = c.height - 1; y >= 0 && baja < 0; y--) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 128) { baja = y; break; }
  let iz = 1e9, de = -1e9;
  for (let y = Math.max(0, baja - 2); y <= baja; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 128) { iz = Math.min(iz, x); de = Math.max(de, x + 1); }
  // texturas recortadas (trim): x del cuadro = x del recorte + fr.x; displayOrigin en coords del cuadro completo
  const wx = (fx) => sp.x + (fx + (fr.x || 0) - sp.displayOriginX) * sp.scaleX;
  const suela = [wx(iz), wx(de)];
  const izq = [], der = [];
  for (const p of sc.particles.items) {
    if (!p.alive || !p.infla || p.sprite.texture.key !== 'chipPolvo') continue;
    const r = p.sprite.getBounds();
    (p.borde ? izq : der).push([r.left, r.right]);
  }
  const hi = izq.length ? Math.max(0, suela[0] - Math.max(...izq.map((b) => b[1]))) : null;
  const hd = der.length ? Math.max(0, Math.min(...der.map((b) => b[0])) - suela[1]) : null;
  const s = (v) => (v === null ? null : Math.round(v * k * 10) / 10);
  return { ms: Math.round(sc.t - sc.landAt), duro: sc.landHardAt === sc.landAt, pose: sp.texture.key, suela: suela.map((v) => Math.round((v - x0) * k)), nIzq: izq.length, nDer: der.length, huecoIzq: s(hi), huecoDer: s(hd), izq: izq.map((b) => b.map((v) => Math.round((v - x0) * k))), der: der.map((b) => b.map((v) => Math.round((v - x0) * k))) };
}, ms);

const colorEn = (page, ms) => page.evaluate(async (ms) => {
  const sc = window.__moki.scene.scenes[0], P = window.__p, dt = P.dt;
  while (sc.t - sc.landAt < ms - dt - 1) P.step();
  P.tt += dt; sc.game.step(P.tt, dt);
  const A = sc.game.canvas.toDataURL('image/png');
  const polvo = sc.particles.items.filter((p) => p.alive && p.sprite.texture.key === 'chipPolvo');
  polvo.forEach((p) => p.sprite.setVisible(false));
  sc.game.step(P.tt, 0);
  const B = sc.game.canvas.toDataURL('image/png');
  polvo.forEach((p) => p.sprite.setVisible(true));
  const load = (u) => new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); res(x.getImageData(0, 0, c.width, c.height).data); }; im.src = u; });
  const [a, b] = [await load(A), await load(B)];
  const hsl = (r, g, bb) => { r /= 255; g /= 255; bb /= 255; const M = Math.max(r, g, bb), n = Math.min(r, g, bb), l = (M + n) / 2, d = M - n; const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0; let h = !d ? 0 : M === r ? ((g - bb) / d) % 6 : M === g ? (bb - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return [Math.round(h), Math.round(s * 100), Math.round(l * 100)]; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const sa = [0, 0, 0], sb = [0, 0, 0]; let n = 0, frios = 0, lumA = 0, lumB = 0; const px = [];
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (d <= 24) continue;
    n++; for (let k = 0; k < 3; k++) { sa[k] += a[i + k]; sb[k] += b[i + k]; }
    px.push([a[i], a[i + 1], a[i + 2]]);
    const [hh, ss] = hsl(a[i], a[i + 1], a[i + 2]); if (ss < 15 || hh > 60) frios++;
    lumA += lum([a[i], a[i + 1], a[i + 2]]); lumB += lum([b[i], b[i + 1], b[i + 2]]);
  }
  if (!n) return { ms, n: 0, vivos: polvo.length, A };
  const ma = sa.map((v) => v / n), mb = sb.map((v) => v / n);
  const [L1, L2] = [lumA / n, lumB / n].sort((x, y) => y - x);
  // cuerpo = la mitad más clara de los píxeles de polvo; canto = el 20 % más oscuro
  px.sort((p, q) => lum(q) - lum(p));
  const media = (l) => { const m = [0, 0, 0]; l.forEach((c) => c.forEach((v, k) => (m[k] += v / l.length))); return m; };
  const cuerpo = hsl(...media(px.slice(0, px.length >> 1))), canto = hsl(...media(px.slice(Math.floor(px.length * 0.8))));
  return { cuerpo, canto, ms: Math.round(sc.t - sc.landAt), vivos: polvo.length, n, polvoRgb: ma.map(Math.round), polvo: hsl(...ma), sueloRgb: mb.map(Math.round), suelo: hsl(...mb), contraste: +((L1 + 0.05) / (L2 + 0.05)).toFixed(2), pctFrio: Math.round((100 * frios) / n), noche: sc.ambient ? sc.ambient.night ?? null : null, A };
}, ms);

try {
  for (const [w, h] of process.env.SOLO_COLOR ? [] : [[390, 844], [660, 900], [1280, 720]]) {
    const { ctx, page } = await abrir(w, h, 'dia');
    const filas = [];
    for (const hold of [400, 400, 16, 16]) {
      await salta(page, hold);
      const f = { hold };
      for (const ms of [0, 16, 33]) f[ms] = await origenEn(page, ms);
      filas.push(f);
    }
    out.origen[w] = filas;
    await ctx.close();
  }
  for (const hora of ['dia', 'noche']) for (const [w, h] of [[390, 844], [1280, 720]]) {
    for (const ms of [16, 33]) {
      const { ctx, page } = await abrir(w, h, hora);
      await salta(page, 400);
      const r = await colorEn(page, ms);
      writeFileSync(`${outDir}/${tag}-${hora}-${w}-mas${ms}.png`, Buffer.from(r.A.split(',')[1], 'base64'));
      delete r.A;
      out.color.push({ hora, w, ...r });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  sv.close();
}
writeFileSync(`${outDir}/${tag}-p38.json`, JSON.stringify(out, null, 1));
for (const w of Object.keys(out.origen)) for (const f of out.origen[w]) console.log(tag, w, f.hold === 400 ? 'fuerte' : 'normal', [0, 16, 33].map((ms) => `+${ms}: izq ${f[ms].huecoIzq} der ${f[ms].huecoDer} (${f[ms].nIzq}/${f[ms].nDer}${f[ms].duro ? ' D' : ''})`).join(' | '), 'suela', f[0].suela.join('-'));
for (const c of out.color) console.log(tag, c.hora, c.w, `+${c.ms}`, 'polvo', c.polvoRgb?.join(','), 'hsl', c.polvo?.join('/'), 'cuerpo', c.cuerpo?.join('/'), 'canto', c.canto?.join('/'), 'suelo', c.suelo?.join('/'), 'frio%', c.pctFrio, 'contr', c.contraste, 'n', c.n);
console.log('errores', errs.length, errs.slice(0, 4).join(' | '));
