// P4v (15-nov): EL CRUJIDO CAMBIA. Sonda de parámetros del tropiezo (puerta pre-registrada en propuestas/p4v-crujido-cambia-caso.md).
// Carga el src/ crudo de un árbol servido estático (python -m http.server --directory <árbol>) y llama SFX.stumble en
// OfflineAudioContext con la cadena real de buses. Intercepta los nodos que crea cada tropiezo: granos = filtros bandpass
// (frecuencia) y el arranque de su ruido (ms desde el golpe).
//  - 20 tropiezos seguidos (misma instancia del módulo) con una secuencia fija de tipos (abajo, igual para las dos versiones),
//    a velocidad base: pares consecutivos con el MISMO patrón (número de granos y separaciones en ms) -> rama 0.
//  - grupos: mediana de la frecuencia de grano, caja contra alto (torre, viga) -> >= 15 % aparte.
//  - pico (dB) de 10 renders por tipo a velocidad base y a x2.0 (v = 2): base dentro de ±10 % (±0.83 dB) de master,
//    x2.0 > base, y el pico máximo <= master + 1.5 dB.
//  - crujido (dB de energía 1.5-4 kHz, 100 ms): base dentro de ±0.83 dB de master (±10 % de amplitud) y x2.0 > base.
//  - zanja: 0 granos.
// Uso: flock /tmp/moki-pesado.lock node herramientas/sonda-p4v-crujido.mjs <url-del-árbol> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, outPath] = process.argv.slice(2);
const SEQ = ['caja', 'torre', 'caja', 'viga', 'caja', 'caja', 'torre', 'viga', 'caja', 'torre', 'caja', 'viga', 'viga', 'caja', 'torre', 'caja', 'caja', 'viga', 'torre', 'caja'];
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
try {
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.addInitScript(([lo, hi]) => { window.__JORGE_INTERVENTIONS__ = 0; window.__lo = lo; window.__hi = hi; }, (process.env.BANDA || '1500,4000').split(','));
  await page.goto(`${url}/index.html`);
  const r = await page.evaluate(async (SEQ) => {
    const { CONFIG: C } = await import('/src/config.js');
    const { createBuses } = await import('/src/audio/audio.js');
    const { SFX } = await import('/src/audio/sfx.js');
    const M = await import('/src/debug/audioMeasure.js');
    const SR = 22050, T0 = 0.05;
    const render = async (o) => {
      const ctx = new OfflineAudioContext(1, Math.ceil(0.9 * SR), SR);
      const bus = createBuses(ctx, C.audio);
      bus.duckGain.gain.value = 1;
      const bp = [], starts = [];
      const cB = ctx.createBiquadFilter.bind(ctx), cS = ctx.createBufferSource.bind(ctx);
      ctx.createBiquadFilter = () => { const f = cB(); bp.push(f); return f; };
      ctx.createBufferSource = () => { const s = cS(), st = s.start.bind(s); s.start = (w, ...a) => { starts.push(w); return st(w, ...a); }; return s; };
      SFX.stumble(ctx, bus.sfxMix, T0, o);
      const granos = bp.filter((f) => f.type === 'bandpass').map((f) => f.frequency.value);
      const ms = starts.map((w) => Math.round(((w || 0) - T0) * 1000)).slice(-granos.length); // los ruidos de los granos son los últimos
      const d = (await ctx.startRendering()).getChannelData(0);
      // energía del crujido: banda 1.5-4 kHz en los primeros 100 ms desde el golpe (DFT directa con ventana Hann, como audio-p4t)
      const a = Math.round(T0 * SR), N = Math.round(0.1 * SR);
      let e = 0;
      for (let f = +(window.__lo || 1500); f <= +(window.__hi || 4000); f += SR / N) {
        let re = 0, im = 0;
        const w = (2 * Math.PI * f) / SR;
        for (let q = 0; q < N; q++) { const x = d[a + q] * (0.5 - 0.5 * Math.cos((2 * Math.PI * q) / (N - 1))); re += x * Math.cos(w * q); im -= x * Math.sin(w * q); }
        e += re * re + im * im;
      }
      return { n: granos.length, ms, hz: granos.map(Math.round), pico: +M.peakDb(d).toFixed(2), crujido: +(10 * Math.log10(Math.max(e, 1e-12))).toFixed(2) };
    };
    const serie = [];
    for (const tipo of SEQ) serie.push({ tipo, ...(await render({ tipo, v: 1 })) });
    const patron = (x) => `${x.n}:${x.ms.join(',')}`;
    let iguales = 0;
    for (let i = 1; i < serie.length; i++) if (patron(serie[i]) === patron(serie[i - 1])) iguales++;
    const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
    const hzDe = (ts) => med(serie.filter((x) => ts.includes(x.tipo)).flatMap((x) => x.hz));
    const hzCaja = hzDe(['caja']), hzAlto = hzDe(['torre', 'viga']);
    const picos = {};
    for (const tipo of ['caja', 'torre', 'viga', 'zanja']) {
      const b = [], x2 = [], cb = [], c2 = [];
      for (let i = 0; i < 10; i++) { const u = await render({ tipo, v: 1 }), w = await render({ tipo, v: 2 }); b.push(u.pico); x2.push(w.pico); cb.push(u.crujido); c2.push(w.crujido); }
      picos[tipo] = { baseMed: med(b), baseMax: Math.max(...b), x2Med: med(x2), x2Max: Math.max(...x2), crujidoBase: med(cb), crujidoX2: med(c2) };
    }
    const zanja = await render({ tipo: 'zanja', v: 1 });
    return { serie, iguales, pares: serie.length - 1, hzCaja, hzAlto, gruposAparte: +(Math.abs(hzAlto - hzCaja) / Math.min(hzAlto, hzCaja)).toFixed(3), picos, zanjaGranos: zanja.n };
  }, SEQ);
  r.errores = errores;
  console.log(JSON.stringify({ iguales: r.iguales, pares: r.pares, hzCaja: r.hzCaja, hzAlto: r.hzAlto, gruposAparte: r.gruposAparte, picos: r.picos, zanjaGranos: r.zanjaGranos, errores: errores.length }));
  console.log('tabla', r.serie.map((x) => `${x.tipo} n${x.n} [${x.ms.join(',')}] ${x.hz.join('/')}`).join(' | '));
  writeFileSync(outPath, JSON.stringify(r, null, 1));
} finally {
  await browser.close();
}
