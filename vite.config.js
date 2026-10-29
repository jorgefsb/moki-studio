import { readFileSync } from 'node:fs';
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

export default defineConfig({
  base: './',
  define: { __JORGE_INTERVENTIONS__: JSON.stringify(jorgeInterventions()) },
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
});
