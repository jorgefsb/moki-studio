// Tarjeta para compartir (GDD §3): texto corto con emojis que el jugador copia y pega donde quiera. No publica nada,
// no lleva nombre, liga ni datos personales: título, modo, fecha, una fila de sellos por página, sellos y racha.
import { t } from './i18n.js';

export const TOPE = 280;

// paginas: [{ caidas }] por página del nivel; 🟧 = página sin caer, 🟫 = la pasaste con tropiezo.
export function textoTarjeta({ modo, fecha, paginas, sellos, de, racha }) {
  const fila = paginas.map((p) => (p.caidas ? '🟫' : '🟧')).join('');
  const lineas = [t('share.title'), `${modo} · ${fecha}`, fila, t('share.sellos', { n: sellos, de })];
  if (racha > 1) lineas.push(t('share.racha', { n: racha }));
  let s = lineas.join('\n');
  // Nunca debería pasar (son 4 o 5 líneas cortas), pero el tope de 280 es un contrato: se recorta la fila, no el texto
  while ([...s].length > TOPE && lineas[2].length) {
    lineas[2] = [...lineas[2]].slice(0, -1).join('');
    s = lineas.join('\n');
  }
  return s;
}

// Copia al portapapeles; si la API no está (http, permisos), cae al textarea + execCommand. Nunca lanza.
export async function copiar(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (e) {
    // sigue con el respaldo
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) {
    return false;
  }
}
