// P4s: render offline de 'stumble' (cadena real de buses de audio.js) por tipo de obstáculo, desde el src/ servido
// estático de un árbol (python -m http.server --directory <árbol>). Mide pico, cola, energía 1.5-4 kHz en los primeros
// 60 ms, centroide y cuánto varía el pico en 10 renders. También corre measureLoud (bus con música).
// Uso: flock /tmp/moki-pesado.lock node herramientas/audio-p4s.mjs <url-del-árbol> <salida.json>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/jorgefsb/.local/share/mise/installs/npm-playwright/latest/node_modules/');
const { chromium } = require('playwright');
const [url, outPath] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/home/jorgefsb/.local/bin/microsoft-edge-stable', args: ['--headless=new'] });
try {
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.addInitScript(() => (window.__JORGE_INTERVENTIONS__ = 0)); // define de vite.config.js (solo la cuenta de la bitácora)
  await page.goto(`${url}/index.html`);
  const r = await page.evaluate(async () => {
    const { CONFIG: C } = await import('/src/config.js');
    const { createBuses } = await import('/src/audio/audio.js');
    const { SFX } = await import('/src/audio/sfx.js');
    const M = await import('/src/debug/audioMeasure.js');
    const SR = 22050, T0 = 0.05;
    const render = async (o) => {
      const ctx = new OfflineAudioContext(1, Math.ceil(0.9 * SR), SR);
      const bus = createBuses(ctx, C.audio);
      bus.duckGain.gain.value = 1;
      SFX.stumble(ctx, bus.sfxMix, T0, o);
      return (await ctx.startRendering()).getChannelData(0);
    };
    // energía 1.5-4 kHz (DFT directa) en los primeros 60 ms desde el golpe
    const banda = (d) => {
      const a = Math.round(T0 * SR), N = Math.round(0.06 * SR);
      let e = 0;
      for (let f = 1500; f <= 4000; f += SR / N) {
        let re = 0, im = 0;
        const w = (2 * Math.PI * f) / SR;
        for (let n = 0; n < N; n++) { const x = d[a + n] * (0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1))); re += x * Math.cos(w * n); im -= x * Math.sin(w * n); }
        e += re * re + im * im;
      }
      return 10 * Math.log10(Math.max(e, 1e-12));
    };
    const out = {};
    for (const tipo of ['caja', 'torre', 'viga', 'zanja']) {
      const picos = [], colas = [], bandas = [], cent = [];
      for (let i = 0; i < 10; i++) {
        const d = await render({ tipo, k: 0 });
        picos.push(+M.peakDb(d).toFixed(2)); colas.push(M.tailMs(d)); bandas.push(+banda(d).toFixed(2)); cent.push(Math.round(M.centroidHz(d)));
      }
      const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
      out[tipo] = { picoMax: Math.max(...picos), picoVaria: +(Math.max(...picos) - Math.min(...picos)).toFixed(2), colaMax: Math.max(...colas), banda: med(bandas), centroide: med(cent) };
    }
    const dk = await render({ tipo: 'caja', k: 1 });
    out.cajaK1 = { pico: +M.peakDb(dk).toFixed(2) };
    out.loud = await M.measureLoud(C.audio);
    return out;
  });
  r.errores = errores;
  console.log(JSON.stringify(r));
  writeFileSync(outPath, JSON.stringify(r, null, 1));
} finally {
  await browser.close();
}
