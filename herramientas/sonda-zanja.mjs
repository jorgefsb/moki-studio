// Sonda de zanja (ZANJA vuelta 2, director 3-nov 09:15). Copia de medidor-contraste.mjs (mismo instrumento, modo fijo)
// con una línea más, 'zanja': una zanja larga (W = C.zanja.largo x velocidad del tramo) en las mismas 5 distancias.
//   fuera  = orilla contra el suelo 9 px afuera (la puerta, >= 2.0): como el borde de caja y torre, lo que más contrasta
//            de la franja de la orilla, el papel claro o la línea de tinta de 2 px por fuera; papel = solo el papel
//   dentro = contorno contra el hueco 9 px adentro;  hueco = fondo del hueco contra el suelo de afuera
// En 3 alturas del contorno (2, 9 y 16 px bajo su borde de arriba). bordeMin = mínimo de fuera y dentro. Master no tiene
// zanja: su línea 'zanja' sale vacía y solo cuentan caja/torre/viga (la rama debe dar igual o mayor).
// La rama baja el módulo src/zanja.js solo en Libre: la sonda lo pide con s.pedirZanja() en modo Libre y regresa a Reto.
// Medidor de contraste repetible (GDD §9 punto 1, DECISIONES 3-nov 06:25). Documentación: herramientas/MEDIDOR-CONTRASTE.md
// Uso: node sonda-zanja.mjs <url-del-build> <ancho> <alto> <salida.json> [dias=0,3] [modo=fijo|libre]
//   ej.: node medidor-contraste.mjs http://127.0.0.1:5193/master/ 375 667 m-375.json
// No usa el medidor de src/debug/contrast.js: trae su propia copia de las sondas (lados, esquinas y suelo de 2-nov) y la
// inyecta en la página. Así master y cualquier rama se miden con el MISMO instrumento aunque su src/ no tenga la sonda.
// modo 'fijo' (el bueno): azar sembrado antes de cada medida, bucle de Phaser dormido y cuadros dados a mano con paso
// fijo de 16.667 ms (tweens, animaciones y reloj de escena avanzan igual en cada corrida), y calentamiento de las 4 horas
// con espera de red antes de medir (el arte de noche de la rama vive en un archivo diferido que llega por red).
// modo 'libre': el instrumento viejo (bucle vivo, azar libre, sin calentar), solo para enseñar cuánto se movía.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');

const [url, w, h, outPath, diasArg = '0,3', modo = 'fijo'] = process.argv.slice(2);
const ZW = 0.56; // C.zanja.largo (s): la ZZ, la más ancha
const dias = diasArg.split(',').map(Number);
const fijo = modo === 'fijo';
// Tamaños canónicos. 375x812 da OTRO zoom y otras posiciones: caja/torre de noche 4.69/5.63 contra 4.27/5.34 a 375x667
if (!['375x667', '1280x720'].includes(w + 'x' + h)) console.warn('OJO: ' + w + 'x' + h + ' no es canónico (375x667, 1280x720); no compares contra la tabla');
// clave: [tipo, sonda]. torre@suelo y caja@suelo dan 'bordeMin' (la puerta de noche); viga da 'porD' (borde de lados).
const MEDIDAS = [
  ['torre@suelo', 'torre', 'suelo'],
  ['caja@suelo', 'caja', 'suelo'],
  ['viga', 'viga', 'lados'],
  ['torre', 'torre', 'lados'],
  ['caja', 'caja', 'lados'],
  ['zanja', 'zanja', 'zanja'],
];

// Azar sembrado (mulberry32). Se instala antes de que cargue el juego; __mokiSeed(n) lo reinicia.
const initRng = () => {
  let a = 1;
  window.__mokiSeed = (n) => (a = n >>> 0);
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Todo lo que corre dentro de la página. Copia de run() de src/debug/contrast.js (rama v2/salto-noche, con la sonda
// 'suelo'), con las mismas fórmulas; solo cambia CÓMO se avanza el juego y se toma la foto.
const enPagina = async ({ type, days, probe, fijo, seed }) => {
  const g = window.__moki;
  const s = g.scene.scenes[0];
  const R = g.renderer;
  let T = window.__mokiT || 1000;
  const DT = 16.667;
  // fijo: avanza la escena a mano (tweens, animaciones, update) con reloj y paso fijos, sin dibujar; la foto es un
  // g.step(T, 0), que dibuja sin mover nada. libre: el siguiente cuadro del bucle vivo.
  const step = (dt) => {
    T += dt;
    window.__mokiT = T;
    if (dt) s.sys.step(T, dt);
    else g.step(T, 0);
  };
  const grab = () =>
    new Promise((res) => {
      R.once('postrender', () => {
        const gl = R.gl;
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        const d = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, d);
        res({ w, h, d });
      });
      if (fijo) step(0);
    });
  const BASE = [260, 330, 400, 470, 540];
  const REACH = 72;
  const NEAR = 160;
  const positions = () => {
    const maxD = Math.floor(s.vw - s.px - REACH);
    const fit = BASE.filter((D) => D <= maxD);
    if (fit.length === BASE.length) return fit;
    const hi = Math.max(NEAR, Math.min(maxD, BASE[BASE.length - 1]));
    return BASE.map((_, i) => Math.round(NEAR + ((hi - NEAR) * i) / (BASE.length - 1)));
  };
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  let frame = null;
  const px = (x, y) => {
    const i = ((frame.h - Math.round(y)) * frame.w + Math.round(x)) * 4;
    return [frame.d[i], frame.d[i + 1], frame.d[i + 2]];
  };
  const out = {};
  if (type === 'zanja') {
    if (!s.pedirZanja) return { sinZanja: true };
    const m0 = s.modo;
    s.modo = 'libre';
    s.pedirZanja();
    await s.zanjaLista;
    s.modo = m0;
  }
  let used;
  const skipped = [];
  for (const day of days) {
    if (fijo) window.__mokiSeed(seed + day);
    s.screen = 'play';
    s.startGame();
    s.tut = { stage: 4, state: 'off' };
    s.god = true;
    s.resetRun(s.level, s.level.starts[day]);
    s.ambient.setDay(day, true);
    s.ambient.nextRoll = 1e9;
    s.ambient.cloudNext = 1e9;
    s.ambient.butterNext = 1e9;
    for (let i = 0; i < 30; i++) {
      if (fijo) step(DT);
      else s.update(0, DT);
    }
    s.obstacles.forEach((o) => o.destroy());
    s.obstacles = [];
    s.nextEnt = 1e9;
    const rs = [];
    const papel = []; // zanja: solo el contorno de papel contra el suelo (sin la línea de tinta)
    const es = [];
    const pie = [];
    const porD = [];
    used = positions();
    for (const D of used) {
      s.obstacles.forEach((o) => o.destroy());
      s.obstacles = [];
      s.spawnObstacle({ kind: 'obs', type, D: s.dist + D, plan: 'hold', W: window.__mokiZW * s.tramoSpeed(day) });
      s.placeEntities();
      if (type !== 'viga' && type !== 'zanja') {
        s.obstacles[0].entered = true;
        s.tweens.killTweensOf(s.obstacles[0].sprite);
        s.obstacles[0].sprite.setAngle(0);
      }
      const pb = document.querySelector('.ui-pausebtn');
      if (pb) pb.style.display = 'none';
      s.screen = 'pause';
      frame = await grab();
      const cam = s.cameras.main;
      const z = s.zoom;
      const sx = (wx) => (wx - cam.worldView.x) * z;
      const sy = (wy) => (wy - cam.worldView.y) * z;
      const o = s.obstacles[0];
      if (type === 'zanja') {
        const L = o.x - o.W / 2;
        const Rr = o.x + o.W / 2;
        if (L - 12 < cam.worldView.x || Rr + 12 > cam.worldView.right) {
          skipped.push(D);
          continue;
        }
        const e0 = es.length;
        const g0 = 440 - 8; // borde de arriba del contorno (spawn: Graphics en groundY - 8)
        for (const dy of [2, 9, 16]) {
          // orilla de cerca: contorno en [L-3, L]; orilla de lejos: [Rr, Rr+3]. sg apunta hacia afuera
          for (const [a, sg] of [[L - 1.5, -1], [Rr + 1.5, 1]]) {
            let light = 0;
            for (let k = -1; k <= 1; k += 0.5) light = Math.max(light, lum(px(sx(a + k), sy(g0 + dy))));
            // línea de tinta por fuera del papel (rama 3-nov): el más oscuro de [a+sg*2.5, a+sg*4]
            let dark = 9;
            for (let k = 2.5; k <= 4; k += 0.5) dark = Math.min(dark, lum(px(sx(a + sg * k), sy(g0 + dy))));
            const fuera = lum(px(sx(a + sg * 10.5), sy(g0 + dy)));
            const dentro = lum(px(sx(a - sg * 10.5), sy(g0 + dy)));
            papel.push(ratio(light, fuera));
            es.push(Math.max(ratio(light, fuera), ratio(dark, fuera)));
            pie.push(ratio(light, dentro));
            rs.push(ratio(dentro, fuera));
          }
        }
        porD.push(+Math.min(...es.slice(e0)).toFixed(2));
        continue;
      }
      const hh = o.size.height;
      const hang = type === 'viga' ? o.size.hangBottom : 0;
      const body = [];
      for (const dy of [hang + hh * 0.3, hang + hh * 0.55, hang + hh * 0.8]) for (const dx of [-20, 20]) body.push(px(sx(o.x + dx), sy(440 - dy)));
      const Lb = body.map(lum).sort((a, b) => a - b)[3];
      const bb = o.sprite.getBounds();
      const L = bb.left + 2;
      const Rr = bb.right - 2;
      const vx = cam.worldView;
      if (Math.min(o.x - 62, L - 9) < vx.x || Math.max(o.x + 62, Rr + 9) > vx.right) {
        skipped.push(D);
        continue;
      }
      const e0 = es.length;
      if (probe === 'suelo') {
        const gy = 440 - 4;
        for (const [edge, sg] of [[L, -1], [Rr, 1]]) {
          let dark = 9;
          for (let k = -3.5; k <= 0.5; k += 0.5) dark = Math.min(dark, lum(px(sx(edge + sg * k), sy(gy))));
          es.push(ratio(lum(px(sx(edge + sg * 9), sy(gy))), dark));
        }
        for (const dx of [-20, 20]) pie.push(ratio(lum(px(sx(o.x + dx), sy(gy))), lum(px(sx(o.x + dx), sy(440 + 6)))));
        porD.push(+Math.min(...es.slice(e0)).toFixed(2));
        for (const dx of [-62, 62]) rs.push(ratio(lum(px(sx(o.x + dx), sy(gy))), Lb));
        continue;
      }
      const oneEdge = type === 'viga' && probe === 'lados';
      const edgeDy = oneEdge ? [hang + hh * 0.5] : [hang + hh * 0.3, hang + hh * 0.55, hang + hh * 0.8];
      for (const dy of edgeDy) {
        for (const [edge, sg] of [[L, -1], [Rr, 1]]) {
          let dark = 9;
          let light = 0;
          for (let k = -3.5; k <= 0.5; k += 0.5) {
            const l = lum(px(sx(edge + sg * k), sy(440 - dy)));
            dark = Math.min(dark, l);
            light = Math.max(light, l);
          }
          const bg = lum(px(sx(edge + sg * 9), sy(440 - dy)));
          es.push(oneEdge ? ratio(bg, light) : ratio(bg, dark));
        }
      }
      porD.push(+(es.slice(e0).reduce((a, b) => a + b, 0) / (es.length - e0)).toFixed(2));
      for (const dy of type === 'viga' ? [hang + hh * 0.5 - 24, hang + hh * 0.5, hang + hh * 0.5 + 24, hang + hh * 0.5 + 48] : [20, 45, 70, 95]) for (const dx of [-62, 62]) rs.push(ratio(lum(px(sx(o.x + dx), sy(440 - dy))), Lb));
    }
    out[['manana', 'mediodia', 'tarde', 'noche'][day]] = {
      min: +Math.min(...rs).toFixed(2),
      borde: +(es.reduce((a, b) => a + b, 0) / es.length).toFixed(2),
      porD,
      ...(probe === 'zanja' && { fueraMin: +Math.min(...es).toFixed(2), papelMin: +Math.min(...papel).toFixed(2), dentroMin: +Math.min(...pie).toFixed(2), huecoMin: +Math.min(...rs).toFixed(2), bordeMin: +Math.min(...es, ...pie).toFixed(2) }),
      ...(probe === 'suelo' && { bordeMin: +Math.min(...es).toFixed(2), pieMin: +Math.min(...pie).toFixed(2) }),
    };
  }
  // lienzo y zoom reales: el alto de la ventana cambia el zoom y con él las posiciones (375x812 no es 375x667)
  out.posiciones = { D: used, fuera: [...new Set(skipped)], ancho: Math.round(s.vw), moki: s.px, lienzo: [s.scale.width, s.scale.height], zoom: +s.zoom.toFixed(4) };
  return out;
};

// Varios builds separados por coma se miden en la misma corrida y el mismo navegador, uno después del otro (una pestaña a
// la vez): así master contra rama sale de la misma corrida.
const medir = async (browser, url) => {
const out = { url, w: +w, h: +h, modo, dias, medidas: {}, errs: [] };
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
try {
  page.on('pageerror', (e) => out.errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && out.errs.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && out.errs.push('HTTP ' + r.status() + ' ' + r.url()));
  if (fijo) await page.addInitScript(initRng);
  await page.goto(url + '?debug&seed=1');
  await page.waitForFunction(() => window.__moki && window.__moki.moki && window.__moki.scene.scenes[0].level, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  if (fijo) {
    // Calentar: pasar por las 4 horas con el bucle vivo para que se pidan los archivos diferidos (noche), esperar a la red
    // y luego dormir el bucle. Desde aquí solo avanza con g.step(T, 16.667) dado a mano.
    for (const day of [0, 1, 2, 3]) {
      await page.evaluate((day) => {
        const s = window.__moki.scene.scenes[0];
        s.screen = 'play';
        s.startGame();
        s.resetRun(s.level, s.level.starts[day]);
        s.ambient.setDay(day, true);
      }, day);
      await page.waitForTimeout(800);
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.__moki.loop.sleep());
  }
  for (const [k, type, probe] of MEDIDAS) {
    const t0 = Date.now();
    await page.evaluate((zw) => (window.__mokiZW = zw), ZW);
    const m = await page.evaluate(enPagina, { type, days: dias, probe, fijo, seed: 1 });
    out.medidas[k] = m;
    const f = (x) => (x ? (probe === 'suelo' || probe === 'zanja' ? 'bordeMin ' + x.bordeMin : 'min ' + x.min) + ' porD ' + x.porD.join(',') : '-');
    console.log(url, k, Date.now() - t0, 'ms', dias.map((d) => ['man', 'med', 'tar', 'noc'][d] + ' ' + f(m[['manana', 'mediodia', 'tarde', 'noche'][d]])).join(' | '));
  }
  if (out.medidas.zanja.sinZanja) console.log(url, 'zanja: este build no tiene zanja');
  const p = out.medidas.viga.posiciones;
  console.log(url, 'lienzo', p.lienzo.join('x'), 'zoom', p.zoom, 'D', p.D.join(','), 'errores', out.errs.length, out.errs.slice(0, 3));
  return out;
} finally {
  await page.close();
}
};

const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable' });
try {
  const res = [];
  for (const u of url.split(',')) res.push(await medir(browser, u));
  writeFileSync(outPath, JSON.stringify(res.length === 1 ? res[0] : res, null, 1));
} finally {
  await browser.close();
}
