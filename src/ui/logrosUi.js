// P7 LOGROS VISIBLES: pantalla de Logros y aviso de logro nuevo. Módulo diferido (baja al abrir la pantalla o al ganar
// uno): sus textos viven aquí y no en i18n.js para no cargar el JS inicial (puerta: +1.0 kB gz máximo).
// Arte de papel (ARTE.md): ganado = sello ámbar #FFA500 entintado (recompensa); faltante = lápiz punteado con su pista.
import './logros.css';
import { leerLogros, guardar } from '../logros.js';
import { diaLocal } from '../racha.js';

const TX = {
  titulo: 'Logros',
  sub: 'Lo que Moki ya ganó y cómo ganar lo que falta',
  sigue: 'Sigue',
  ganado: 'Ganado',
  aviso: '¡Logro nuevo!',
  varios: '¡{n} logros nuevos!',
  mira: 'Míralos en Logros',
  volver: 'Volver',
  aria: 'Logros: {n} de {de} ganados',
  llegue: ['Primera meta', 'Llega a la meta de un nivel'],
  disenador: ['Diseñador', 'Toca Vota lo que sigue al terminar una partida', 'Abriste la votación de lo que sigue'],
  embajador: ['Embajador', 'Comparte el juego desde el botón Copiar', 'Compartiste el juego'],
  arcos3: ['Tres arcos', 'Junta 3 arcos completos en una partida'],
  sinCaerme: ['Sin un rasguño', 'Termina un nivel sin chocar'],
  coleccionista: ['Coleccionista', 'Llega a la meta con 8 de cada 10 piezas'],
  todas: ['Todas las piezas', 'Llega a la meta con todas las piezas'],
  reto3: ['Tres días de Reto', 'Juega el Reto del día 3 días seguidos'],
  mega15: ['MEGA x1.5', 'Llega a la meta en MODO MEGA x1.5'],
  mega20: ['MEGA x2.0', 'Llega a la meta en MODO MEGA x2.0'],
  nivel5: ['Nivel 5', 'Sube a Moki al nivel 5 del Cuaderno'],
  cuaderno: ['Cuaderno lleno', 'Termina los 10 niveles del Cuaderno'],
};

// d = leerLogros(): { lista: [{ id, ganado, sigue }], n, de }. El primero sin ganar dice "Sigue". Volver fijo abajo.
export function pantalla(el, d, onBack) {
  const lg = el('div', 'ui-asi ui-logros');
  lg.setAttribute('role', 'dialog');
  lg.setAttribute('aria-label', TX.aria.replace('{n}', d.n).replace('{de}', d.de));
  const wrap = el('div', 'wrap');
  const cab = el('div', 'lg-cab');
  cab.append(el('h2', '', TX.titulo), el('b', 'lg-cuenta', `${d.n}/${d.de}`));
  wrap.append(cab, el('p', 'sub', TX.sub));
  const grid = el('ul', 'lg-grid');
  for (const x of d.lista) {
    const li = el('li', `lg-item${x.ganado ? ' ganado' : ''}${x.sigue ? ' sigue' : ''}`);
    li.append(el('i', 'lg-sello'));
    const tx = el('div', 'tx');
    const nom = el('b', '', TX[x.id][0]);
    if (x.sigue) nom.append(el('em', 'lg-sigue', TX.sigue));
    tx.append(nom, el('span', '', x.ganado ? TX[x.id][2] || TX.ganado : TX[x.id][1]));
    li.append(tx);
    grid.append(li);
  }
  wrap.append(grid);
  const foot = el('div', 'foot');
  const back = el('button', 'ui-btn primary', TX.volver);
  back.type = 'button';
  back.addEventListener('click', (e) => (e.stopPropagation(), onBack()));
  foot.append(back);
  lg.addEventListener('pointerdown', (e) => e.stopPropagation()); // tocar la pantalla no arranca la partida de atrás
  lg.append(wrap, foot);
  return lg;
}

// Aviso: etiqueta de papel que baja en el hueco de arriba entre metros y piezas (zona de la escena: lejos de Moki, del
// carril, de la tarjeta final y de la tira), el sello se estampa con rebote; 2.4 s y sube. 2 = uno tras otro.
export function aviso(el, root, ids, sfx, zona) {
  // Más de 2 juntos (primera meta limpia): un solo aviso con la cuenta, no 15 s de etiquetas en fila
  if (ids.length > 2) return uno(el, root, TX.varios.replace('{n}', ids.length), TX.mira, sfx, 500, zona);
  ids.forEach((id, i) => uno(el, root, TX.aviso, TX[id][0], sfx, 500 + i * 2900, zona));
}

let libre = 0; // P29: los avisos van en fila (votar justo tras la meta no encima su etiqueta sobre la de la partida)
function uno(el, root, titulo, linea, sfx, ms, zona) {
  const espera = zona && zona.espera > 0 ? Math.min(zona.espera, 4000) : 0; // letrero del centro a la vista
  const t = Math.max(Date.now() + ms + espera, libre);
  libre = t + 2900;
  setTimeout(() => {
    const a = el('div', 'ui-logro');
    if (zona) Object.assign(a.style, { top: `${zona.top}px`, right: `${root.clientWidth - zona.right}px`, maxWidth: `${Math.max(140, zona.right - zona.left)}px` });
    a.setAttribute('role', 'status');
    const tx = el('div', 'tx');
    tx.append(el('b', '', titulo), el('span', '', linea));
    a.append(el('i', 'lg-sello'), tx);
    root.appendChild(a);
    if (sfx) sfx('sello');
    setTimeout(() => a.classList.add('out'), 2400);
    setTimeout(() => a.remove(), 2700);
  }, t - Date.now());
}

// Al abrir la pantalla: todo lo ganado queda visto y la etiqueta "Nuevo" se apaga.
export function marcarVistos() {
  const { lista, l } = leerLogros();
  l.vistos = lista.filter((x) => x.ganado).map((x) => x.id);
  guardar(l);
}

// Tras revisar la partida (al caer o llegar): guarda 'todas' si tocó y devuelve los logros recién ganados que no se
// habían avisado (para el aviso de papel). No toca física, semilla ni puntaje.
export function revisarLogros(st) {
  let { l } = leerLogros();
  if (st && st.finished && st.pieceTotal > 0 && st.maxPieces >= st.pieceTotal && !l.ganados.includes('todas')) {
    l.ganados.push('todas');
    guardar(l);
  }
  const mg = st && st.finished && st.mega ? (st.mega >= 2 ? 'mega20' : 'mega15') : ''; // P8b: cada velocidad gana su logro
  if (mg && !l.ganados.includes(mg)) {
    l.ganados.push(mg);
    guardar(l);
  }
  return avisar();
}

// Reto en días seguidos (día local): se llama al empezar una partida real del Reto. 3 días = logro.
export function contarReto(hoy = diaLocal()) {
  const { l } = leerLogros();
  if (l.retoDia === hoy) return [];
  l.retoN = l.retoDia === hoy - 1 ? l.retoN + 1 : 1;
  l.retoDia = hoy;
  const gana = l.retoN >= 3 && !l.ganados.includes('reto3');
  if (gana) l.ganados.push('reto3'), l.avisados.push('reto3'); // solo avisa el suyo; lo demás lo avisa revisarLogros
  guardar(l);
  return gana ? ['reto3'] : [];
}

// P29 sellos de gamedev: logro propio por una acción del jugador (votar, compartir). Devuelve el aviso si es nuevo.
export function ganar(id) {
  const { l } = leerLogros();
  if (!l.ganados.includes(id)) l.ganados.push(id), guardar(l);
  return avisar();
}

function avisar() {
  const { lista, l } = leerLogros();
  const nuevos = lista.filter((x) => x.ganado && !l.avisados.includes(x.id)).map((x) => x.id);
  if (nuevos.length) {
    l.avisados.push(...nuevos);
    guardar(l);
  }
  return nuevos;
}
