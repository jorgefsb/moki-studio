// Modo embed (?embed=1): el juego vive en un iframe dentro de otra página (moki.jorgesuarez.com.mx).
// - Nada del juego mueve la página padre: teclas de scroll y rueda se consumen aquí.
// - La liga a jorgesuarez.com.mx no se pinta (la página padre ya la tiene; en el iframe navegaría el iframe).
// - El sonido ya nace solo tras un gesto dentro del iframe (ver RunScene.bindInput); aquí no se toca.
// - Un toque en el juego le da el foco al iframe para que el teclado llegue sin un segundo clic.
export const EMBED = new URLSearchParams(window.location.search).get('embed') === '1';

const SCROLL_KEYS = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'];

export function setupEmbed() {
  if (!EMBED) return;
  document.documentElement.classList.add('embed');
  // Burbuja: el juego (y los botones con Espacio/Enter) ya actuaron; solo se evita el scroll encadenado al padre.
  window.addEventListener('keydown', (e) => {
    if (SCROLL_KEYS.includes(e.key) && !(e.target && e.target.tagName === 'BUTTON' && e.key === ' ')) e.preventDefault();
  });
  // Rueda: solo los paneles con scroll propio ("Así lo hicimos", tarjeta larga) la usan; al llegar a su borde
  // no la pasan al padre (overscroll-behavior en ui.css). En el resto del juego no hace nada.
  window.addEventListener(
    'wheel',
    (e) => {
      if (!(e.target && e.target.closest && e.target.closest('.ui-asi .wrap, .ui-card'))) e.preventDefault();
    },
    { passive: false }
  );
  window.addEventListener('pointerdown', () => window.focus(), true);
}
