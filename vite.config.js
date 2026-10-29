import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// "Así lo hicimos" cuenta las intervenciones de Jorge desde BITACORA.md al compilar.
// Solo se guarda el número: el texto de la bitácora no entra al juego.
function jorgeInterventions() {
  try {
    const text = readFileSync(new URL('./BITACORA.md', import.meta.url), 'utf8');
    let max = 0;
    for (const m of text.matchAll(/Intervenci[oó]n (\d+) de/g)) max = Math.max(max, Number(m[1]));
    return max;
  } catch (e) {
    return 0;
  }
}

// Solo en `vite` (desarrollo): POST /__save?name=archivo escribe en evidencia/ (para guardar el render offline del tema).
// No existe en el build.
const saveEvidence = () => ({
  name: 'moki-save-evidence',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__save', (req, res) => {
      const name = new URL(req.url, 'http://x').searchParams.get('name') || '';
      if (req.method !== 'POST' || !/^[a-z0-9._-]+$/i.test(name)) {
        res.statusCode = 400;
        res.end('no');
        return;
      }
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        writeFileSync(new URL(`./evidencia/${name}`, import.meta.url), Buffer.concat(chunks));
        res.end('ok');
      });
    });
  },
});

export default defineConfig({
  base: './',
  define: { __JORGE_INTERVENTIONS__: JSON.stringify(jorgeInterventions()) },
  plugins: [saveEvidence()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
});
