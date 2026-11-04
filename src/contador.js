// Contador anónimo (decisión de Jorge, 3-nov): un beacon por intento terminado, sin id, sin hora y sin nada de la persona.
// Solo en el sitio real: en local, pruebas, ?debug (bots) y ?escaparate no se manda nada. Sin red o sin sendBeacon, no pasa nada.
const HOST = 'moki.jorgesuarez.com.mx';
const VIVO = location.hostname === HOST && !/debug|escaparate/.test(location.search);

let intento = null; // { modo, nivel } del intento en curso; null = ya contó (o no hay)

export function abrirIntento(modo, nivel) {
  if (VIVO) intento = { modo, nivel };
}

// Cierra el intento una sola vez: lo que llegue después (salir tras la tarjeta, volver de la caché) ya no cuenta.
export function cerrarIntento(motivo) {
  if (!intento) return;
  const cuerpo = JSON.stringify({ juego: 'un-salto-mas', ...intento, motivo });
  intento = null;
  navigator.sendBeacon?.(`https://${HOST}/api/partida`, new Blob([cuerpo], { type: 'application/json' }));
}

addEventListener('pagehide', () => cerrarIntento('salir'));
