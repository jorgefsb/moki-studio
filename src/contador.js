// Contador anónimo (decisión de Jorge, 3-nov): un beacon por intento terminado, sin id, sin hora y sin nada de la persona.
// Solo en el sitio real: en local, pruebas, ?debug (bots) y ?escaparate no se manda nada. Sin red o sin sendBeacon, no pasa nada.
// MEDICIÓN 2 (7-nov): origen separa público, equipo y bots; intento, seg, tramo y causa dicen dónde y contra qué termina.
const HOST = 'moki.jorgesuarez.com.mx';
const VIVO = location.hostname === HOST && !/debug|escaparate/.test(location.search);

// El equipo se marca abriendo ?equipo una vez en cada aparato; ?publico lo quita
try {
  if (/[?&]equipo\b/.test(location.search)) localStorage.setItem('moki-equipo', '1');
  else if (/[?&]publico\b/.test(location.search)) localStorage.removeItem('moki-equipo');
} catch {}

function origen() {
  if (navigator.webdriver) return 'bot';
  try {
    if (localStorage.getItem('moki-equipo') === '1') return 'equipo';
  } catch {}
  return 'publico';
}

let intento = null; // { modo, nivel } del intento en curso; null = ya contó (o no hay)
let n = 0; // partidas en esta visita (solo en memoria): el reintento es partida nueva
let t0 = 0;
let tramoDe = null;
let extraDe = null; // P36m (13-nov): { horq, altos } del intento: horquillas vistas y cuántas se subieron; dos enteros, nada de la persona

// tramo: función que regresa el tramo actual, para saberlo también al salir o volver al inicio
export function abrirIntento(modo, nivel, tramo, extra) {
  tramoDe = tramo;
  extraDe = extra; // también en local, para que la sonda lea armarDatos()
  if (!VIVO) return;
  intento = { modo, nivel };
  n += 1;
  t0 = performance.now();
}

// Cierra el intento una sola vez: lo que llegue después (salir tras la tarjeta, volver de la caché) ya no cuenta.
export function cerrarIntento(motivo, causa) {
  if (!intento) return;
  const datos = armarDatos(motivo, causa);
  intento = null;
  navigator.sendBeacon?.(`https://${HOST}/api/partida`, new Blob([JSON.stringify(datos)], { type: 'application/json' }));
}

// el objeto del beacon (exportado para probarlo en local, donde VIVO es falso y no se manda nada)
export function armarDatos(motivo, causa) {
  const tramo = Math.min(99, Math.max(0, tramoDe?.() | 0));
  const { horq = 0, altos = 0 } = extraDe?.() || {};
  const datos = { juego: 'un-salto-mas', ...intento, motivo, origen: origen(), intento: n, seg: Math.round((performance.now() - t0) / 1000), tramo, horq: horq | 0, altos: altos | 0 };
  if (causa) datos.causa = String(causa).replace(/[^a-z-]/g, '').slice(0, 16);
  return datos;
}

addEventListener('pagehide', () => cerrarIntento('salir'));
