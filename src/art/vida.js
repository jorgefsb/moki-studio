// P6c MUNDO VIVO, VIDA EN EL FONDO (propuestas/p6c-vida-fondo-caso.md): un Moki chiquito corre por la cresta de los cerros del atardecer,
// brinca con los brazos arriba (el saludo) y sigue; un papalote de papel con 3 moñitos cruza el cielo alto. Solo nivel 1 con las capas
// pintadas, solo en partida. Movimiento reducido o juice Nada: ningún objeto. Azar propio. 0 KB de imagen: Moki sale de las tiras de
// mokiPoses (sin espejar, escala positiva: el parche queda en la oreja derecha anatómica) y el papalote se dibuja al vuelo.
// Capa (paso 1 del director, evidencia/p6c/cresta.py): en la cresta de 'lejos' la capa 'medio' tapa más de la mitad de Moki el 25 % del
// tiempo; de 6 salidas se escoge la que menos se tapa (se puede predecir: todo depende de la distancia). Va entre las dos (2.065).
import { rng } from './palette.js';
import { mk } from './textures.js';
import { CONFIG as C } from '../config.js';

const N = 256; // columnas del perfil de cada capa
// Moki: corre 3.5 s, brinca 0.7, se queda con los brazos arriba 0.35 y sigue 2 (desvanece el último 0.5); 40 px/s del mundo sobre su capa
const CORRE = 3.5;
const BRINCA = 4.2;
const SIGUE = 4.55;
const FIN = 6.55;
const VEL = 40;
const KRAFT = '#B99168';
// P6d: el segundo (a los 12 s) tropieza a los 1.9 s de correr: 1 cuadro de caída 0.3 s con arco de 5 px hacia adelante, aterriza
// agachado (cuadros 0-1 de pose-land, 0.5 s) y se levanta (2-5); luego sigue su vida normal. Después, uno de cada tres
const TROPIEZA = 1.9; // a los 12 s nace: corre 12-13.9, cae 13.9-14.2, agachado 14.2-14.8, se levanta y sigue (capturas del caso §4)
const TRIP = 1.06;
// vertical (390): P22b lo desvanece antes del jugador y parado se le acerca rápido; tropieza al terminar de aparecer y se agacha 0.3 s
const TRIPV = [0.3, 0.7, 0.86];

// Textura de canvas hecha una vez; dibuja recibe el contexto
function tex(s, k, w, h, dibuja) {
  if (!s.textures.exists(k)) {
    const [c, x] = mk(w, h);
    dibuja(x);
    s.textures.addCanvas(k, c);
  }
  return s.textures.get(k);
}

// Borde de arriba (parte del alto) por columna, leído del alfa de la textura de la capa
function perfil(s, key) {
  const [, x] = mk(N, 128);
  x.drawImage(s.textures.get(key).getSourceImage(), 0, 0, N, 128);
  const d = x.getImageData(0, 0, N, 128).data;
  const t = [];
  for (let i = 0, r; i < N; t[i++] = r / 128) for (r = 0; r < 127 && d[(r * N + i) * 4 + 3] < 128; ) r++;
  return t;
}

// y del mundo del borde de arriba de la capa L en la x de pantalla x; dx adelanta el mosaico (para predecir)
const tope = (L, t, x, dx = 0) => {
  const u = ((x + dx) / L.tileScaleX + L.tilePositionX) / 2048;
  return L.y + t[((u - Math.floor(u)) * N) | 0] * L.height;
};

// Las tiras se hornean a la mitad (64 px por cuadro) con suavizado bueno: sin parpadeo de pixel al achicarlas
// P22b: en vertical se hornea con bruma (pintar encima el durazno claro de los cerros al 40 % baja saturación y contraste: plano lejano)
const hornear = (s, key, n, b) =>
  tex(s, `v${b ? 'b' : ''}${key}`, 64 * n, 64, (x) => {
    x.imageSmoothingQuality = 'high';
    x.drawImage(s.textures.get(key).getSourceImage(), 0, 0, 64 * n, 64);
    if (b) (x.globalCompositeOperation = 'source-atop'), (x.fillStyle = 'rgba(222,170,140,.4)'), x.fillRect(0, 0, 64 * n, 64);
  });

// Rombo de papel de 22x28 con cruz kraft y cola de 12 con 3 moñitos, al doble para que no se pixelee
const papalote = (x) => {
  const L = (...p) => {
    x.beginPath();
    for (let i = 0; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]);
  };
  x.scale(2, 2);
  x.lineJoin = 'round';
  x.strokeStyle = x.fillStyle = KRAFT;
  [31.5, 35.5, 39.5].forEach((y, i) => {
    const m = i === 1 ? 14.5 : 12.5;
    L(m, y, m - 3, y - 1.6, m - 3, y + 1.6, m + 3, y - 1.6, m + 3, y + 1.6);
    x.fill();
  });
  x.fillStyle = '#F4E8D5';
  L(12, 1, 23, 11, 12, 29, 1, 11, 12, 1);
  x.fill();
  x.stroke();
  L(12, 1, 12, 29);
  x.moveTo(1, 11);
  x.lineTo(23, 11);
  x.moveTo(12, 29);
  x.quadraticCurveTo(16, 34, 12, 41);
  x.stroke();
};

export function montarVida(s, capas) {
  const amb = s.ambient;
  const azar = rng(624);
  let T = null; // perfiles de lejos y medio
  let t = 0; // s de partida (sin pausas)
  let antes = '';
  let distAntes = null;
  let m = null; // Moki chico
  let p = null; // papalote
  let otroM = 2; // P22: el primero a los 2 s, fijo en la x menos tapada; luego cada 20-30 al azar
  let primero = true;
  let segundo = false;
  let otroP = 6; // papalote a los 6 s y luego cada 24-36

  const quita = () => {
    if (m) m.im.destroy(), m.sb.destroy();
    if (p) p.im.destroy();
    m = p = distAntes = null;
  };
  // parte del cuerpo de Moki (25.5 del mundo) que asoma sobre la capa medio
  const visible = (ms, x, dx = 0) => (tope(capas.medio, T.m, x, dx * 2) - tope(capas.lejos, T.l, x, dx)) / (25.5 * ms * gm()) + 1;
  // en vertical el Moki lejano crece (22 -> ~30 px a 390); 660 y 1280 igual
  const gm = () => (s.scale.width / s.scale.height <= C.portrait.maxAspect ? C.portrait.vidaMoki : 1);

  let vb = ''; // 'b' en vertical (P22b): bruma, sombra asentada, nace a la derecha y se va antes de la columna del jugador
  const nuevoMoki = () => {
    if (!s.textures.exists('pose-rise')) return void (otroM = t + 0.5); // las poses aún no llegan
    const ms = s.midS || 1;
    vb = s.scale.width / s.scale.height <= C.portrait.maxAspect ? 'b' : '';
    // vertical: x desde ~240 px de pantalla (a 390) y el borde menos medio Moki, para que no nazca cortado ni sobre el jugador
    const x1 = vb ? Math.max(0.62 * s.vw, s.px + 150 / s.zoom) : 0;
    const x2 = vb ? s.vw - 14 * ms * gm() : 0;
    const v = (s.speed || 320) * 0.3;
    const c = VEL * ms;
    let x0 = 0;
    let peor = 99;
    // el primero barre 14 x fijas y mide sus primeros 4 s (a la vista antes de los 5 s de partida); los demás, 6 al azar en toda su vida
    const n = primero ? 14 : 6;
    for (let k = 0; k < n; k++) {
      const f = primero ? k / (n - 1) : azar();
      const x = vb ? x1 + (x2 - x1) * f : (primero ? 0.3 + 0.65 * f : 0.5 + 0.45 * f) * s.vw;
      let malos = 0;
      for (let q = 0, tt; q <= 16; q++) {
        tt = (q / 16) * (primero ? 4 : FIN);
        if (visible(ms, x + (c - v) * tt - c * Math.min(SIGUE - CORRE, Math.max(0, tt - CORRE)), v * tt) < 0.5) malos++;
      }
      if (malos < peor) (peor = malos), (x0 = x);
    }
    [['pose-run', 7], ['pose-rise', 5], ['pose-fall', 1], ['pose-land', 6]].forEach(([k, n]) => {
      const T2 = hornear(s, k, n, vb);
      if (!T2.has(0)) for (let j = 0; j < n; j++) T2.add(j, 0, j * 64, 0, 64, 64);
    });
    // sombra de contacto: elipse #22211F al 20 %, 14x3 del mundo (al doble). P22b, vertical: al 32 % y x1.3 (18x4) para que pise la cresta
    tex(s, `v${vb}sombra`, 28, 6, (x) => {
      x.fillStyle = `rgba(34,33,31,${vb ? 0.32 : 0.2})`;
      x.ellipse(14, 3, 14, 3, 0, 0, 7);
      x.fill();
    });
    m = {
      x: x0,
      t: 0,
      tr: segundo || (!primero && azar() < 1 / 3),
      im: s.add.image(x0, 0, `v${vb}pose-run`, 0).setOrigin(66 / 128, 123 / 128).setScale((ms * gm()) / 2).setDepth(2.065).setTint(0xffe8d6), // bruma cálida de lejos
      sb: s.add.image(x0, 0, `v${vb}sombra`).setScale((ms * gm() * (vb ? 1.3 : 1)) / 2).setDepth(2.0645),
    };
    otroM = t + 20 + 10 * azar(); // el azar se gasta igual que antes: el papalote sale donde mismo
    if (primero) otroM = 12;
    segundo = primero;
    primero = false;
  };

  const nuevoP = () => {
    otroP = t + 24 + 12 * azar();
    const ms = s.midS || 1;
    // del centro del rombo: 14 arriba, 28 hasta la punta de la cola; 5 de vaivén y giro por lado. Cabe entre el HUD (90 px) y y 106 del mundo
    const hud = s.top + 90 / s.zoom;
    const f = Math.min(1, (106 - hud - 10 * ms) / (42 * ms));
    if (f < 0.65) return; // a 1280 sale al 0.68; a 660 no hay cielo libre entre el HUD y la banda (caso §2): no se dibuja
    const lo = hud + (14 * f + 5) * ms;
    tex(s, 'vpapa', 48, 84, papalote);
    p = { x: s.vw + 30, y: lo + (106 - (28 * f + 5) * ms - lo) * azar() * 0.6, t: 0 };
    p.im = s.add.image(p.x, 0, 'vpapa').setOrigin(0.5, 1 / 3).setScale((ms * f) / 2).setDepth(1.6);
  };

  const paso = (_t, delta) => {
    const sc = s.screen;
    if (sc === 'pause' || sc === 'dead') return void (antes = sc);
    if (s.reduced || s.calm || sc !== 'play' || (antes !== 'play' && antes !== 'pause')) quita(), (t = 0), (otroM = 2), (primero = true), (segundo = false), (otroP = 6);
    antes = sc;
    if (s.reduced || s.calm || sc !== 'play') return;
    const dt = Math.min(delta, 50) / 1000;
    t += dt; // desde que arranca la partida, aunque la tarde todavía esté entrando
    if (amb.st < 1 || !capas.activa) return void quita();
    T = T || { l: perfil(s, 'capa_lejos'), m: perfil(s, 'capa_medio') };
    const ms = s.midS || 1;
    const a0 = distAntes === null ? 0 : s.dist - distAntes;
    const d = Math.abs(a0) < 120 ? a0 : 0;
    distAntes = s.dist;
    if (!m && t >= otroM) nuevoMoki();
    if (!p && t >= otroP) nuevoP();
    if (m) {
      // u: reloj de su vida normal; en el tropiezo se congela y j dice cuánto lleva (0-0.3 cae, 0.3-1.06 agachado y se levanta)
      let u = (m.t += dt);
      const [z0, z1, z2] = vb ? TRIPV : [TROPIEZA, 0.9, TRIP];
      const j = m.tr && u > z0 ? u - z0 : -1;
      if (j >= z2) u -= z2;
      const tr = j >= 0 && j < z2;
      const k = tr || u < CORRE || u > SIGUE ? -1 : Math.min(1, (u - CORRE) / 0.7);
      m.x += (tr ? (j < 0.3 ? (5 / 0.3) * ms * dt : 0) : k < 0 ? VEL * ms * dt : 0) - d * 0.3;
      const hop = tr ? (j < 0.3 ? Math.sin((Math.PI * j) / 0.3) * 3 * ms * gm() : 0) : k < 0 ? 0 : Math.sin(Math.PI * k) * 8 * ms * gm();
      const ag = tr && j >= 0.3 && j < z1; // agachado: sombra más ancha
      m.im.setTexture(
        tr ? `v${vb}pose-${j < 0.3 ? 'fall' : 'land'}` : k < 0 ? `v${vb}pose-run` : `v${vb}pose-rise`,
        tr ? (j < 0.3 ? 0 : j < z1 ? Math.min(1, Math.floor((j - 0.3) * 23)) : Math.min(5, 2 + Math.floor((j - z1) * 23))) : k < 0 ? Math.floor(u * 12) % 7 : Math.min(4, Math.floor(k * 5)),
      );
      m.sb.scaleX = m.im.scaleY * (vb ? 1.3 : 1) * (ag ? 1.35 : 1);
      // vertical: los pies se hunden 1 px en la cresta (asentado) y se desvanece antes de llegar a 60 px de pantalla del jugador
      const pies = tope(capas.lejos, T.l, m.x) + (vb ? ms * gm() : 0);
      const ir = vb ? Math.max(0, (m.x - s.px - 60 / s.zoom) / (16 * ms)) : 9;
      const a = Math.min(1, m.t / 0.3, Math.max(0, (FIN - u) * 2), ir);
      m.im.setPosition(m.x, pies - hop).setAlpha(a);
      m.sb.setPosition(m.x, pies).setAlpha(a * (1 - (hop / (8 * ms * gm() + 1)) * 0.6));
      if (u > FIN || m.x < -30 || (ir <= 0 && m.t > 0.3)) m.im.destroy(), m.sb.destroy(), (m = null);
    }
    if (p) {
      p.x -= ((s.vw + 60) / 14) * (p.t += dt, dt) + d * 0.05;
      p.im.setPosition(p.x, p.y + Math.sin(p.t * 1.1) * 4 * ms).setAngle(Math.sin(p.t * 1.7) * 8);
      if (p.x < -30) p.im.destroy(), (p = null);
    }
  };
  s.vida = { m: () => m, p: () => p, vis: (x) => T && visible(s.midS || 1, x) }; // solo lectura, para medir
  s.events.on('postupdate', paso);
  s.events.once('shutdown', () => (s.events.off('postupdate', paso), quita()));
}
