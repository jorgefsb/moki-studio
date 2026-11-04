// SALTO ATARDECER día 2 (previz/salto-noche/ESPEC-SALTO.md §4): al entrar al nivel 1 el mundo arranca a lápiz y se pinta.
// Módulo diferido, viaja con atardecer.js: envuelve startGame, updateRun y press, así el JS inicial no crece.
// Cada capa del fondo lleva encima una gemela de papel con trazo, hecha al vuelo con la misma textura de la capa (no pesa
// nada de arte) y cortada en tiras que se recortan de izquierda a derecha: al irse la gemela queda la capa real, en color.
// Moki y su sombra van por encima de todas las gemelas: nunca se dibujan a lápiz. Mientras dura, la partida no corre: ni
// distancia, ni tiempo de juego, ni azar; Moki trota en su sitio (s.trote, solo lo lee mokiPoses). Todo va por cuadro (sin
// tweens); al terminar no queda nada.
import { PAL, rgba, rng } from './palette.js';
import { mk } from './textures.js';

const T = {
  dur: 1500,
  salto: 150, // un toque rellena todo en 150 ms
  fundido: 150, // movimiento reducido
  tiraPx: 2, // alto de tira en px de pantalla; el frente de pintura es la orilla de todas. Con 4 se leían escalones
  retraso: 0.2, // parte de la ventana de cada capa que se reparte a lo alto: da la forma del frente
  // La vara A2 manda en movimiento: un solo frente vertical cruza todo el cuadro. Todas las capas comparten esta ventana (la
  // tabla de ESPEC §4 solo deja su final): con ventanas separadas, 20 ms de desfase ya eran ~30 px, la capa de enfrente aún de
  // papel recortaba a la de atrás ya pintada y salían la cuña café, la franja de montaña en polígono y orillas que no empatan.
  frente: [0.06, 1.2], // un respiro de 60 ms: el primer cuadro es todo lápiz
  trazo: 0.55, // alfa de la tinta
  lapizSeQueda: 280, // el lápiz sigue encima del color recién pintado y se va en un segundo frente, detrás del primero: es lo que se lee como pintar sobre un dibujo
  lapizTiraPx: 8, // el segundo frente corta líneas sueltas, no un relleno: no necesita tiras finas
  trote: 0.75, // zancada respecto a la de la partida: a 1x se lee carrera sobre caminadora
  detalle: { lejana: 0, media: 0, cercana: 0.16, pinos: 0, capaLejos: 0.16, capaMedio: 0.16 }, // gris del dibujo real dentro de la capa: las oscuras se leían rellenas
};
const clamp01 = (k) => Math.min(1, Math.max(0, k));
// ESPEC §5. Las hojas mueren antes de que acabe la transición: nada de ella queda corriendo al jugar (va por encima de la
// vida de 1.2-2 s de la espec, que se recorta a lo que falte).
const HOJAS = { n375: 12, n1280: 20, de: 300, a: 900, vida: [1200, 2000], colores: ['#B99168', PAL.paper, '#974717', PAL.accent] };
const POP = { max: 6, de: 1000, paso: 60, ms: 220 };
// Polvo de los pies: lo único que se mueve en el suelo, para que el trote no parezca caminadora. No toca el mundo.
const POLVO = { n: 7, cadaMs: 130, vida: 340, vx: -120, vy: -16 };
const easeOut = (k) => 1 - (1 - k) ** 3;
const easeFrente = (k) => 1 - (1 - k) ** 1.5; // el frente se alcanza a ver cruzar, sin rebaba que tarde en irse al final
// Forma del frente, de 0 a 1: diagonal (arriba va primero) y ondulada, igual en todas las capas para que sea una sola orilla.
// Sin ruido por fila y con la pendiente acotada: si entre dos tiras el frente brinca varios px, se leen dientes de sierra.
const onda = (yn, y) => clamp01(0.08 + yn * 0.62 + 0.045 * Math.sin(y * 0.021 + 1.1) + 0.008 * Math.sin(y * 0.067) + 0.002 * Math.sin(y * 0.19 + 0.4));

// Grano de lápiz: se le quita a la línea para que no parezca vector
function grano(r) {
  const [c, x] = mk(96, 96);
  for (let i = 0; i < 1500; i++) {
    x.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.4})`;
    x.fillRect(r() * 96, r() * 96, 1 + r(), 1);
  }
  return c;
}

function rayitas(x, r, W, H, n) {
  x.strokeStyle = rgba(PAL.ink, 0.3);
  x.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const cx = r() * W;
    const cy = r() * H;
    const lineas = 7 + Math.floor(r() * 8);
    const largo = 12 + r() * 16;
    for (let k = 0; k < lineas; k++) {
      const dx = k * 4.5 + (r() - 0.5) * 2;
      x.beginPath();
      x.moveTo(cx + dx, cy + (r() - 0.5) * 3);
      x.lineTo(cx + dx - largo * 0.55, cy + largo + (r() - 0.5) * 3);
      x.stroke();
    }
  }
}

// La gemela de una capa con forma, en dos lienzos. Papel: papel donde hay capa y su detalle en gris muy tenue. Lápiz: rayitas
// y contorno doble, aparte para que sobreviva al frente de pintura.
function gemela(base, seed, detalle) {
  const W = base.width;
  const H = base.height;
  const r = rng(seed);
  const [c, x] = mk(W, H);
  x.drawImage(base, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = PAL.paper;
  x.fillRect(0, 0, W, H);
  // detalle de la capa (techos, ramas) en gris: se mantiene el dibujo real, sin nada de su color
  const [g, gx] = mk(W, H);
  gx.drawImage(base, 0, 0);
  gx.globalCompositeOperation = 'saturation';
  gx.fillStyle = '#808080';
  gx.fillRect(0, 0, W, H);
  gx.globalCompositeOperation = 'destination-in';
  gx.drawImage(base, 0, 0);
  x.globalCompositeOperation = 'multiply';
  x.globalAlpha = detalle;
  x.drawImage(g, 0, 0);
  x.globalAlpha = 1;
  // contorno: la silueta en tinta, corrida a los lados, menos la silueta
  const [t, tx] = mk(W, H);
  tx.drawImage(base, 0, 0);
  tx.globalCompositeOperation = 'source-in';
  tx.fillStyle = PAL.ink;
  tx.fillRect(0, 0, W, H);
  const [o, ox] = mk(W, H);
  for (const [dx, dy] of [[1.4, 0], [-1.4, 0], [0, 1.4], [0, -1.6]]) ox.drawImage(t, dx, dy);
  ox.globalAlpha = 0.5;
  ox.drawImage(t, 1 + r() * 0.6, -1.2 - r() * 0.6); // segunda pasada del lápiz, un poco fuera de registro
  ox.globalAlpha = 1;
  ox.globalCompositeOperation = 'destination-out';
  ox.drawImage(base, 0, 0);
  ox.fillStyle = ox.createPattern(grano(r), 'repeat');
  ox.fillRect(0, 0, W, H);
  const [l, lx] = mk(W, H);
  rayitas(lx, r, W, H, Math.round(W / 70));
  lx.globalCompositeOperation = 'destination-in';
  lx.drawImage(base, 0, 0);
  lx.globalCompositeOperation = 'source-over';
  lx.globalAlpha = T.trazo;
  lx.drawImage(o, 0, 0);
  return [c, l];
}

const linea = (x, r, x0, y0, x1, y1, tembla = 1.6) => {
  x.beginPath();
  x.moveTo(x0, y0);
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 40));
  for (let i = 1; i <= n; i++) x.lineTo(x0 + ((x1 - x0) * i) / n + (r() - 0.5) * tembla, y0 + ((y1 - y0) * i) / n + (r() - 0.5) * tembla);
  x.stroke();
};

// Hoja de partida: papel con fibra y unas nubes y rayas de cielo a lápiz
function hoja(W, H, horizonte) {
  const r = rng(301);
  const [c, x] = mk(W, H);
  x.fillStyle = PAL.paper;
  x.fillRect(0, 0, W, H);
  x.strokeStyle = rgba(PAL.kraft, 0.2);
  x.lineWidth = 1;
  for (let i = 0; i < (W * H) / 1800; i++) {
    const px = r() * W;
    const py = r() * H;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + 4 + r() * 12, py + (r() - 0.5) * 3);
    x.stroke();
  }
  const [l, lx] = mk(W, H);
  lx.strokeStyle = rgba(PAL.ink, T.trazo * 0.7);
  for (let i = 0; i < Math.round(W / 220) + 2; i++) {
    const cx = r() * W;
    const cy = horizonte * (0.1 + r() * 0.5);
    const a = (28 + r() * 40) * Math.min(1, W / 800); // a 375 eran arcos enormes
    lx.lineWidth = 1 + r();
    lx.beginPath();
    lx.ellipse(cx, cy, a, a * 0.32, (r() - 0.5) * 0.2, 0.3, Math.PI * 2 - 0.2);
    lx.stroke();
    lx.beginPath();
    lx.arc(cx - a * 0.3, cy - a * 0.16, a * 0.3, Math.PI, 0);
    lx.stroke();
  }
  rayitas(lx, r, W, horizonte * 0.6, Math.round(W / 240) + 2);
  return [c, l];
}

function discoSol(R, Rfuera, S) {
  const r = rng(302);
  const [c, x] = mk(S, S);
  x.fillStyle = PAL.paper;
  x.beginPath();
  x.arc(S / 2, S / 2, Rfuera, 0, Math.PI * 2);
  x.fill();
  const [l, lx] = mk(S, S);
  lx.strokeStyle = rgba(PAL.ink, T.trazo);
  for (let i = 0; i < 2; i++) {
    lx.lineWidth = 1 + r() * 0.8;
    lx.beginPath();
    lx.arc(S / 2 + (r() - 0.5) * 2, S / 2 + (r() - 0.5) * 2, R + (r() - 0.5) * 2, 0, Math.PI * 2);
    lx.stroke();
  }
  lx.save();
  lx.beginPath();
  lx.arc(S / 2, S / 2, R - 2, 0, Math.PI * 2);
  lx.clip();
  rayitas(lx, r, S * 0.7, S * 0.5, 3);
  lx.restore();
  return [c, l];
}

function pisoAlLapiz(W, H) {
  const r = rng(303);
  const [c, x] = mk(W, H);
  x.fillStyle = PAL.paper;
  x.fillRect(0, 0, W, H);
  const [l, lx] = mk(W, H);
  lx.strokeStyle = rgba(PAL.ink, T.trazo);
  lx.lineWidth = 2;
  linea(lx, r, 0, 3, W, 3);
  lx.lineWidth = 1;
  linea(lx, r, 0, 6, W, 5, 2.4);
  lx.strokeStyle = rgba(PAL.ink, T.trazo * 0.7);
  for (let i = 0; i < W / 20; i++) {
    const px = r() * W;
    const py = 14 + r() * (H - 16);
    linea(lx, r, px, py, px + 10 + r() * 42, py + (r() - 0.5) * 2);
  }
  // piedras y matas a línea: el suelo es lo más grande a 375 y estaba casi vacío
  for (let i = 0; i < (W * H) / 16000; i++) {
    const px = r() * W;
    const py = 18 + r() * (H - 26);
    lx.lineWidth = 1 + r() * 0.7;
    lx.beginPath();
    if (r() < 0.5) {
      const a = 7 + r() * 12;
      lx.ellipse(px, py, a, a * 0.55, (r() - 0.5) * 0.4, 0.2, Math.PI * 2 - 0.1);
    } else {
      for (let k = -2; k <= 2; k++) {
        lx.moveTo(px + k * 3, py);
        lx.lineTo(px + k * 5 + (r() - 0.5) * 2, py - 9 - r() * 8);
      }
    }
    lx.stroke();
  }
  rayitas(lx, r, W, H, Math.round(W / 70));
  return [c, l];
}

// §5: hoja de papel recortada, una textura por color (se quedan: pesan 1 KB cada una y sirven a la siguiente entrada)
function texturasHoja(s) {
  HOJAS.colores.forEach((color, i) => {
    const key = `hojaPapel${i}`;
    if (s.textures.exists(key)) return;
    const [c, x] = mk(20, 12);
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(1, 6);
    x.quadraticCurveTo(9, -2, 19, 6);
    x.quadraticCurveTo(9, 14, 1, 6);
    x.fill();
    x.strokeStyle = rgba(PAL.ink, 0.35);
    x.beginPath();
    x.moveTo(2, 6);
    x.lineTo(18, 6);
    x.stroke();
    s.textures.addCanvas(key, c);
  });
}

function nacerHojas(s, r) {
  const n = s.scale.width < 600 ? HOJAS.n375 : HOJAS.n1280;
  const lista = [];
  for (let i = 0; i < n; i++) {
    const naranja = r() < 0.15;
    const key = `hojaPapel${naranja ? 3 : Math.floor(r() * 3)}`;
    const nace = HOJAS.de + r() * (HOJAS.a - HOJAS.de);
    const vida = Math.min(HOJAS.vida[0] + r() * (HOJAS.vida[1] - HOJAS.vida[0]), T.dur - nace);
    const im = s.add.image(0, 0, key).setScale((0.55 + r() * 0.3)).setDepth(8.5).setVisible(false);
    lista.push({ im, nace, vida, x: r() * s.vw, y: s.top + r() * s.vh * 0.35, vx: -18 - r() * 34, vy: 70 + r() * 70, amp: 8 + r() * 12, fase: r() * 6.28, giro: (r() - 0.5) * 3 });
  }
  return lista;
}

function pasoHojas(lista, t) {
  for (const h of lista) {
    const k = (t - h.nace) / h.vida;
    if (k < 0 || k >= 1) {
      h.im.setVisible(false);
      continue;
    }
    const seg = (t - h.nace) / 1000;
    h.im.setVisible(true);
    h.im.setPosition(h.x + h.vx * seg + Math.sin(h.fase + seg * 5) * h.amp, h.y + h.vy * seg);
    h.im.setRotation(h.fase + h.giro * seg + Math.sin(h.fase + seg * 5) * 0.5);
    h.im.setAlpha(k > 0.7 ? (1 - k) / 0.3 : 1);
  }
}

function nacerPolvo(s) {
  const key = 'bocetoPolvo';
  const [c, x] = mk(16, 10);
  x.fillStyle = rgba(PAL.kraft, 0.55);
  x.beginPath();
  x.ellipse(8, 5, 7, 4, 0, 0, Math.PI * 2);
  x.fill();
  s.textures.addCanvas(key, c);
  const lista = [];
  for (let i = 0; i < POLVO.n; i++) lista.push({ im: s.add.image(0, 0, key).setDepth(11.9).setVisible(false), k: 1 });
  return { key, lista, sig: 0, i: 0 };
}

function pasoPolvo(s, P, dt) {
  P.sig -= dt;
  if (P.sig <= 0) {
    P.sig += POLVO.cadaMs;
    const q = P.lista[P.i++ % POLVO.n];
    q.k = 0;
    q.im.setPosition(s.px - 14, s.y - 3).setVisible(true);
  }
  for (const q of P.lista) {
    if (q.k >= 1) continue;
    q.k += dt / POLVO.vida;
    if (q.k >= 1) {
      q.im.setVisible(false);
      continue;
    }
    q.im.setPosition(q.im.x + (POLVO.vx * dt) / 1000, q.im.y + (POLVO.vy * dt) / 1000).setScale(0.6 + q.k * 0.8).setAlpha(0.8 * (1 - q.k));
  }
}

// §5: hasta 6 piezas de cartón sueltas (pinos y postes) entran con pop, escalonadas, cuando su capa ya está pintada. Casita y
// cajas de fondo no son piezas aparte: van dibujadas en el mosaico de los cerros.
function prepararPop(s, r) {
  const piezas = (s.midPool || []).filter((q) => q.body.visible).sort((a, b) => a.body.x - b.body.x).slice(0, POP.max);
  return piezas.map((q, i) => {
    const b = q.body;
    const e = b.scaleX;
    const w = b.width * e;
    const h = b.height * e;
    b.setOrigin(0.5, 1).setPosition(b.x + w / 2, b.y + h).setAlpha(0);
    q.veil.setVisible(false);
    return { b, e, alfa: q.a === undefined ? 1 : q.a, de: POP.de + i * POP.paso, gira: (1 + r()) * (r() < 0.5 ? -1 : 1) };
  });
}

// 0.85 a 1.04 en la primera mitad, a 1.00 en la segunda
const curvaPop = (k) => (k < 0.6 ? 0.85 + 0.19 * easeOut(k / 0.6) : 1.04 - 0.04 * easeOut((k - 0.6) / 0.4));

function pasoPop(lista, t) {
  for (const p of lista) {
    const k = clamp01((t - p.de) / POP.ms);
    if (t < p.de) continue;
    // balanceo que muere
    p.b.setAlpha(p.alfa).setScale(p.e * curvaPop(k)).setAngle(p.gira * (1 - k));
  }
}

// §5: al acabar la transición el mundo arranca y lo que ya cabe en pantalla (la ficha y la primera caja, a 1280) saldría de un cuadro
// a otro. Entra con pop. Solo la imagen: ni su lugar ni su choque leen la escala del sprite.
function popDelMundo(s) {
  const lista = [...s.obstacles, ...s.pickups].map((q) => q.sprite).filter((b) => b && b.visible && b.x < s.vw + b.displayWidth).sort((a, b) => a.x - b.x);
  lista.forEach((b, i) => {
    const e = b.scaleX;
    const alfa = b.alpha;
    b.setAlpha(0);
    s.tweens.addCounter({ from: 0, to: 1, delay: i * POP.paso, duration: POP.ms, onUpdate: (tw) => b.setAlpha(alfa).setScale(e * curvaPop(tw.getValue())) });
  });
}

// Una capa de mosaico tal como se ve ahora en pantalla, en px de pantalla
function fotoTile(s, L, key, z, extra) {
  const src = s.textures.get(key).getSourceImage();
  const W = Math.ceil(s.vw * z);
  const H = Math.ceil(L.height * z);
  const [c, x] = mk(W, H);
  const k = L.tileScaleX * z;
  const tw = src.width * k;
  // al entrar al nivel la distancia es 0 y el mosaico está en su origen, venga de donde venga
  for (let px = 0; px < W; px += tw) x.drawImage(src, px, 0, tw, src.height * L.tileScaleY * z);
  if (extra) extra(x, L, z);
  return c;
}

export function montarBoceto(s, o, colocar, radioSol) {
  const amb = s.ambient;
  let V = null; // transición en curso
  s.boceto = null;

  // Lienzos ya dibujados, por capa y tamaño: se preparan durante el título y sirven a toda entrada a ese tamaño.
  const memo = new Map();
  s.bocetoLienzos = memo; // solo lectura, para medir la memoria que pesan
  const capas = (z, preparar = false) => {
    const g = s.base.far - 12 + 300 * (s.farS || 1);
    const lista = [];
    // hacer corre después, una capa por cuadro: armarlas juntas congelaba la pantalla ~350 ms justo al tocar.
    // La colina media (su tamaño lo pone la tarde) y los pinos (dependen del nivel) no se guardan.
    const agrega = (nombre, hacer, x, y, depth, [a, b], seed) => {
      const fija = nombre !== 'media' && nombre !== 'pinos';
      const clave = `${nombre}:${Math.ceil(s.vw * z)}x${Math.ceil(s.vh * z)}`;
      const hazla = () => {
        if (!fija) return hacer();
        if (!memo.has(clave)) memo.set(clave, hacer());
        return memo.get(clave);
      };
      lista.push({ nombre, hacer: hazla, fija, x, y, depth, a: a * 1000, b: b * 1000, seed });
    };
    const deMosaico = (L, key, nombre, depth, win, seed, extra) => {
      if (L.displayTexture.key !== key) return; // capa aún sin textura: entra sola con su fundido
      agrega(nombre, () => gemela(fotoTile(s, L, key, z, extra), seed, T.detalle[nombre]), L.x, L.y, depth, win, seed);
    };
    agrega('cielo', () => hoja(Math.ceil(s.vw * z), Math.ceil(s.vh * z), (g - s.top) * z), 0, s.top, 1.7, T.frente, 311);
    // SALTO CAPAS: el dibujo a lápiz sale de las capas pintadas. El sol va aparte (capas.js), debajo de esta hoja, como el cielo pintado.
    if (s.capas && s.capas.activa) {
      s.capas.colocar(g, amb.st);
      deMosaico(s.capas.lejos, 'capa_lejos', 'capaLejos', 2.08, T.frente, 315);
      deMosaico(s.capas.medio, 'capa_medio', 'capaMedio', 3.08, T.frente, 316);
      const y1 = g - 12;
      agrega('suelo', () => pisoAlLapiz(Math.ceil(s.vw * z), Math.ceil((s.bottom - y1) * z)), 0, y1, 4.7, T.frente, 317);
      return lista;
    }
    const tarde = preparar || amb.st >= 0.5;
    const so = tarde ? o.sol : s.sun;
    if (so && (preparar || so.visible)) {
      const R = (tarde ? radioSol * (s.farS || 1) : so.displayWidth / 2.4) * z;
      const Rf = (so.displayWidth / 2) * z;
      const S = Math.ceil(Rf * 2 + 8);
      agrega('sol', () => discoSol(R, Rf, S), so.x - S / (2 * z), so.y - S / (2 * z), tarde ? 1.925 : 1.85, T.frente, 312);
    }
    deMosaico(s.ridge, 'ridge', 'lejana', 1.91, T.frente, 313);
    if (tarde) deMosaico(o.banda, 'tardeBanda_t', 'media', 1.955, T.frente, 314);
    if (preparar || o.tapa.visible) {
      // la tapa de 4 px del mosaico (2.07) va en color encima de las gemelas de atrás: su propia tira de papel, con el cielo
      agrega('tapa', () => {
        const [cv, x] = mk(Math.ceil(s.vw * z), Math.ceil(5 * z));
        x.fillStyle = PAL.paper;
        x.fillRect(0, 0, cv.width, cv.height);
        return [cv, null];
      }, 0, o.tapa.y - 0.5, 2.075, T.frente, 318);
    }
    deMosaico(s.far, 'far', 'cercana', 2.08, T.frente, 315);
    deMosaico(s.mid, 'mid', 'pinos', 3.08, T.frente, 316, (x, L, zz) => {
      // pinos y postes sueltos: viven aparte del mosaico, por debajo de la gemela, y su silueta va en ella
      (s.midPool || []).forEach((q) => {
        if (!q.body.visible) return;
        const src = s.textures.get(q.prop.key).getSourceImage(); // la original: la de papel trae mordidas y el lápiz las seguiría
        const k = q.body.scaleX * zz;
        x.drawImage(src, (q.body.x - L.x) * zz, (q.body.y - L.y) * zz, src.width * k, src.height * k);
      });
    });
    const y0 = g - 12;
    agrega('suelo', () => pisoAlLapiz(Math.ceil(s.vw * z), Math.ceil((s.bottom - y0) * z)), 0, y0, 4.7, T.frente, 317);
    return lista;
  };

  // Durante el título, si este jugador va a entrar al nivel 1: una capa cada vez que el navegador tenga un hueco
  let popMundo = false;
  function preparar() {
    if (s.reduced || !amb.n1 || s.esc || s.screen !== 'demo' || s.texQueue) return;
    const cola = capas(s.zoom, true).filter((c) => c.fija);
    const uno = () => {
      if (V || s.screen !== 'demo' || !cola.length) return;
      cola.shift().hacer();
      (window.requestIdleCallback || setTimeout)(uno, { timeout: 500 });
    };
    uno();
  }
  const espera = () => {
    if (s.texQueue || (s.capas && s.capas.cargando)) return s.time.delayedCall(250, espera);
    preparar();
    return undefined;
  };
  espera();

  function empezar() {
    s.stepWorld(0); // las capas todavía vienen con el mosaico del demo
    s.stepMidProps();
    colocar();
    s.landAt = s.calm ? s.t - 250 : -1e9; // calma: en pie, el último cuadro del aterrizaje. Si no, la zancada
    const velo = s.add.rectangle(0, s.top, s.vw, s.vh, parseInt(PAL.paper.slice(1), 16), 1).setOrigin(0, 0).setDepth(8.9);
    if (s.reduced) {
      V = { t: 0, fin: T.fundido, velo, listo: true, pend: [], tiras: [], claves: [] };
      s.boceto = V;
      return;
    }
    // La hoja en blanco responde al toque desde el primer cuadro; debajo se arma el dibujo, y el reloj corre al quitarla
    V = { t: 0, fin: T.dur, salto: -1, blanca: velo, listo: false, pend: capas(s.zoom), i: 0, tiras: [], claves: [], hojas: [], pop: [] };
    s.boceto = V;
    if (s.calm) return;
    V.polvo = nacerPolvo(s);
    V.claves.push(V.polvo.key);
  }

  function cortar(key, cv, c, depth, tiraPx, a, b) {
    const z = s.zoom;
    const W = cv.width;
    const H = cv.height;
    const n = Math.max(3, Math.round(H / tiraPx));
    for (let k = 0; k < n; k++) {
      const y = Math.round((H * k) / n);
      const h = Math.round((H * (k + 1)) / n) - y;
      const im = s.add.image(c.x, c.y, key).setOrigin(0, 0).setScale(1 / z).setDepth(depth);
      im.setCrop(0, y, W, h);
      // el frente corre en px de pantalla: el disco del sol se pinta cuando el frente le llega, no por su cuenta
      V.tiras.push({ im, y, h, W, x0: c.x * z, ancho: s.vw * z, a, b, d: onda((c.y + y / z - s.top) / s.vh, c.y + y / z) * T.retraso, p: 0 });
    }
  }

  function armarCapa(c) {
    const [cv, lapiz] = c.hacer();
    const key = `boceto${V.i++}`;
    s.textures.addCanvas(key, cv);
    V.claves.push(key);
    if (lapiz) {
      s.textures.addCanvas(`${key}l`, lapiz);
      V.claves.push(`${key}l`);
      // Los pinos sin espera: detrás del frente el poste real aún no entra (va con pop) y su lápiz se leía como un poste
      // transparente sobre la colina.
      const queda = c.nombre === 'pinos' ? 0 : T.lapizSeQueda;
      cortar(`${key}l`, lapiz, c, c.depth + 0.002, T.lapizTiraPx, c.a + queda, c.b + queda);
    }
    cortar(key, cv, c, c.depth, T.tiraPx, c.a, c.b);
  }

  function dibujoListo() {
    V.blanca.destroy();
    V.blanca = null;
    V.listo = true;
    if (s.calm) return; // juice Nada: el dibujo sí, las hojas y el pop no
    const r = rng(304);
    texturasHoja(s);
    V.hojas = nacerHojas(s, r);
    V.pop = prepararPop(s, r);
  }

  function acabar() {
    if (!V) return;
    V.tiras.forEach((q) => q.im.destroy());
    if (V.velo) V.velo.destroy();
    if (V.blanca) V.blanca.destroy();
    (V.hojas || []).forEach((h) => h.im.destroy());
    (V.pop || []).forEach((p) => p.b.setOrigin(0, 0).setAngle(0)); // stepMidProps las regresa a su lugar, escala y alfa
    if (V.polvo) V.polvo.lista.forEach((q) => q.im.destroy());
    V.claves.forEach((k) => s.textures.remove(k));
    const conPop = V.pop && V.pop.length;
    V = null;
    s.boceto = null;
    popMundo = !s.calm;
    s.landAt = -1e9;
    if (conPop) s.stepMidProps();
  }

  function paso(dt) {
    if (!s.calm) s.trote = (s.trote || 0) + (T.trote * s.speed * dt) / 1000; // solo la fase de la zancada; s.dist no se mueve
    if (V.polvo) pasoPolvo(s, V.polvo, dt);
    if (!V.listo) {
      const v0 = s.speed;
      s.speed = 0;
      s.stepMoki(dt);
      s.speed = v0;
      const c = V.pend[V.i];
      if (c) armarCapa(c);
      else dibujoListo();
      return;
    }
    // Reloj real con tope: subir las texturas tarda más que los 50 ms que deja pasar la escena, y la duración se alargaba.
    // El bot síncrono casi no gasta reloj: avanza con su dt.
    const ahora = performance.now();
    const real = V.reloj ? ahora - V.reloj : 0;
    V.t += real > 2 ? Math.min(real, 200) : dt;
    V.reloj = ahora;
    const v = s.speed;
    s.speed = 0; // el títere (calma) se queda parado; la velocidad real sigue guardada para cuando acabe
    s.stepMoki(dt);
    s.speed = v;
    if (V.velo) V.velo.setAlpha(1 - easeOut(clamp01(V.t / V.fin)));
    const saltando = V.salto >= 0;
    const ks = saltando ? easeOut(clamp01((V.t - V.salto) / T.salto)) : 0;
    for (const q of V.tiras) {
      if (q.p >= 1) continue;
      const ventana = q.b - q.a;
      const p = saltando ? q.p + (1 - q.p) * ks : easeFrente(clamp01((V.t - q.a - q.d * ventana) / (ventana * (1 - T.retraso))));
      if (!saltando) q.p = p;
      const x = Math.max(0, Math.floor(p * q.ancho - q.x0));
      if (x >= q.W || p >= 1) {
        q.im.setVisible(false);
        q.p = 1;
      } else q.im.setCrop(x, q.y, q.W - x, q.h);
    }
    if (V.hojas) pasoHojas(V.hojas, V.t);
    if (V.pop) pasoPop(V.pop, saltando ? V.t + 1e4 : V.t);
    if (V.t >= V.fin || (saltando && V.t - V.salto >= T.salto)) acabar();
  }

  const sg = s.startGame;
  s.startGame = function (...a) {
    acabar();
    const venia = !s.demo && amb.n1 && amb.st >= 0.5; // pasó de nivel: del atardecer a la hora del nivel 2, sin salto seco
    const r = sg.apply(this, a);
    if (s.esc) return r;
    if (amb.n1) empezar();
    else if (venia) amb.desdeTarde();
    return r;
  };
  const sd = s.startDemo;
  s.startDemo = function (...a) {
    acabar();
    return sd.apply(this, a);
  };
  const ur = s.updateRun;
  s.updateRun = function (dt) {
    if (!V) {
      const r = ur.call(this, dt);
      if (popMundo) {
        popMundo = false;
        popDelMundo(this);
      }
      return r;
    }
    paso(dt);
    return undefined;
  };
  // Un toque nunca salta a Moki: solo adelanta la transición (el fundido de movimiento reducido ni eso: ya dura 150 ms)
  const pr = s.press;
  s.press = function () {
    if (!V) return pr.call(this);
    if (!V.listo) acabar(); // aún sin dibujo que rellenar
    else if (!V.velo && V.salto < 0) V.salto = V.t;
    return undefined;
  };
  s.scale.on('resize', acabar); // las gemelas son una foto de este tamaño
  s.events.once('shutdown', () => (acabar(), s.scale.off('resize', acabar)));
}
