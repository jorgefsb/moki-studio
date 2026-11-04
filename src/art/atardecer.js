// SALTO ATARDECER día 1 (previz/salto-noche/ESPEC-SALTO.md §1-2): la hora de TARDE se vuelve atardecer de papel.
// Módulo diferido: envuelve Ambient.applyDay y, solo mientras es tarde (st sigue al fundido de 6 s), pinta encima
// cielo oro plano, colinas en capas planas, sol de papel bajo a la derecha, suelo kraft con canto claro y obstáculos
// #6B4630 con canto claro. Con st = 0 todo lo nuevo queda con alfa 0 e invisible: mañana, mediodía y noche no cambian.
// Las perillas viven aquí (y no en src/config.js) para que el JS inicial no crezca: quedan 160 B del salto.
import { PAL, mix, rgba, rng } from './palette.js';
import { mk, cut, block } from './textures.js';
import { DAY } from './ambient.js';
import { leerCuaderno, nivelDe } from '../cuaderno.js';
import { montarBoceto } from './boceto.js';
import { montarBokeh } from './bokeh.js';
import { montarHojas } from './hojas.js';
import { montarCapas } from './capas.js';
import { SOMBRA_K, conFibra, conSombra, hornear, sombra, labioSuelo, sombraSuelo } from './cantoPapel.js';

const hex = (s) => parseInt(s.slice(1), 16);
const lerp = (a, b, k) => {
  const c = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
  return (c(16) << 16) | (c(8) << 8) | c(0);
};
// tinte que lleva un color de textura (src) a un color meta (dst) por multiplicación; meta más oscura en cada canal
const tintTo = (src, dst) => {
  const c = (s) => Math.min(255, Math.round((((dst >> s) & 255) / ((src >> s) & 255)) * 255));
  return (c(16) << 16) | (c(8) << 8) | c(0);
};

// Perillas (ESPEC §1). Hex del video C (study.json); día 1b abre los escalones: lejos claro, cerca oscuro.
export const TARDE = {
  horaFija: true, // nivel 1 = atardecer toda la partida (DECISIONES 3-nov 19:13); en false vuelve el ciclo de horas
  capas: true, // SALTO CAPAS: fondo en capas pintadas; en false vuelve el de código
  bokeh: true, // dirección C de Jorge (ESPEC §3), fuera de la banda de juego; en false no se crea ni un círculo
  cieloAlto: '#F79E52', // arriba, un paso más naranja
  cieloMedio: '#FBA956',
  cieloBajo: '#FCB646',
  cieloHorizonte: '#FFD27A', // franja clara y cálida pegada al horizonte (luz del sol bajo)
  bajoTop: 260, // el degradado llega a cieloBajo en y = groundY - bajoTop (por farS); abajo, plano
  lejana: '#F08A4E', // cordillera (0.15x): la más clara de las siluetas
  // Moki contra el naranja (4-nov): el traje #FF6B35 cae en valor sobre estas capas. Oscurecerlas resta al cuerpo del obstáculo y aclararlas a su canto
  // (también en la colina media, a 1280): conservan su luminancia y se separan del traje por color, en kraft.
  media: '#C59A6E', // colina media plana (0.3x), su borde de arriba nunca baja de y = 290 del mundo; 1c: más clara y cálida que los cerros
  mediaTop: [236, 288], // y del mundo del canto de arriba de la colina media (lomas suaves; nunca baja de 290)
  // Separar valores (ciego 4-nov): el obstáculo es lo más oscuro del paisaje. Toda capa detrás de él cae entre L 0.20 (cuerpo #6B4630 contra fondo 2.0)
  // y L 0.38 (su canto de papel contra fondo 2.0). Escalones hacia adelante: colina media 0.36, cerros 0.29, pinos 0.24.
  cercana: '#B28C64', // capa lejana de siempre (cerros y casitas); en #7A3612 tenía el mismo valor que la caja
  pinos: '#A27F5B', // capa media (pinos, postes, arbustos): la silueta más oscura, pero ya no más que el obstáculo
  obs: '#452B1C', // caja, torre y viga. SALTO CAPAS: del fondo pintado, los pinos cercanos son oscuros; el obstáculo sigue siendo lo más oscuro (era #6B4630)
  canto: { px: 4, alpha: 1, pie: 10, color: '#E9D2AE' }, // canto claro del obstáculo, cálido para que no se lea calcomanía; los 10 px de abajo sin él
  suelo: { cantoPx: 4, tinte: 0xffd8bc }, // canto de papel arriba del suelo; tinte lleva el papel del suelo (#CDAF8D) a kraft rojizo #CD9468 (1c: #CD9A4E se leía caqui-oliva)
  sombra: '#5A2410', // la sombra del suelo (groundShade, tinta neutra a 0.34) agrisaba el kraft: de tarde va en café rojizo
  piezasOscuras: 0xa06a48,
  piezas: 0xffcca0, // pasto, piedras y cartón del suelo (gris-café) multiplicados hacia café cálido
  sol: { x: 0.84, y: 262, r: 54, depth: 1.92, fill: '#FFD56B', canto: '#F7B24A' }, // bajo a la derecha, medio tapado por la colina media
  shadowK: 0.7, // sombras cortas
  piezasTorn: 0.2, // las losas de cartón del suelo se leían como obstáculo o bache: quedan como mancha del propio kraft
  piedra: { tinte: 0xd8a878, alfa: 0.2 }, // CAPAS: UNIR Y PISOS: las piedras de primer plano, 3 de 3 críticos las nombran como peligro; quedan como mancha del suelo
  cartel: false, // el cartel de lección en su poste (fondo vivo, no mecánica): 2 de 3 leen el poste como obstáculo y tapa el aire donde se decide el salto
  // Ficha: la de siempre es kraft y se pierde contra el suelo #CD9468; oscura se leía como anillo de peligro. Cara dorada de la luz del sol (ningún color
  // claro llega a 3.0 contra el suelo) y filo oscuro, que es el que da el contraste contra el suelo y contra el cielo.
  ficha: { cara: '#FFD56B', filo: mix(PAL.accent, PAL.ink, 0.82), canto: mix(PAL.accent, PAL.ink, 0.92), marca: mix('#FFD56B', PAL.accent, 0.55) },
  // Canto de papel (ESPEC §2). labio: el filo rasgado de cada capa; el de la colina media no pasa de la claridad del sol, para no cruzarlo
  // como línea blanca. px: su grueso en px de textura. Sombra: alfa máximo sobre la capa de atrás, ramp: cuándo entra en la transición.
  papel: {
    ridge: { labio: '#F6AE7C', px: 3, seed: 81 },
    media: { labio: '#E8C49C', px: 3, seed: 82 },
    // en las capas oscuras la fibra normal no se ve: va más fuerte, y el labio más grueso y más claro
    far: { labio: mix('#B28C64', PAL.paper, 0.4), px: 4, seed: 83, fibraK: 1.1, rasgado: 2.5 },
    mid: { labio: mix('#A27F5B', PAL.paper, 0.35), px: 3.5, seed: 84, fibraK: 1.1, rasgado: 2.5 },
    // café y no tinta: la tinta neutra agrisaba el naranja (1c). Por eso el alfa llega más alto que el 12-28 % de la tabla: oscurece lo mismo.
    sombra: { ridge: 0.22, media: 0.3, far: 0.42, mid: 0.42, suelo: 0.34, sueloPx: 14, ramp: [900, 1400] },
    cieloFibra: 0.4,
  },
};

const BANDA_TOP = 220; // y del mundo donde empieza la textura de la colina media (arriba de la loma más alta)

// Colina media: una sola tira plana con canto rasgado claro arriba, mosaico de 1920 como las demás capas
function bandaMedia() {
  const W = 1920;
  const top = BANDA_TOP;
  const H = 452 - top;
  const [c, x] = mk(W, H);
  const r = rng(77);
  const [y0, y1] = TARDE.mediaTop.map((v) => v - top);
  const pts = [];
  for (let px = 0; px <= W; px += 10) {
    const u = px / W;
    const k = 0.5 + 0.34 * Math.sin(u * Math.PI * 2 * 5) + 0.16 * Math.sin(u * Math.PI * 2 * 11 + 1.3);
    pts.push([px, y0 + (y1 - y0) * Math.min(1, Math.max(0, k)) + (r() - 0.5) * 1.6]);
  }
  pts[pts.length - 1][1] = pts[0][1]; // costura del mosaico
  const path = (g) => {
    g.moveTo(-4, H + 4);
    pts.forEach(([px, py]) => g.lineTo(px, py));
    g.lineTo(W + 4, pts[0][1]);
    g.lineTo(W + 4, H + 4);
    g.closePath();
  };
  x.fillStyle = TARDE.media;
  x.beginPath();
  path(x);
  x.fill();
  // el mosaico repite en vertical y el filtro mezcla la fila de abajo (opaca) con la de arriba: recta de 1 px en el cielo.
  // Las 2 filas de abajo quedan vacías (van detrás del suelo).
  return hornear(c, { color: TARDE.media, sinPie: true, ...TARDE.papel.media });
}

// Cielo bajo: degradado vertical sin bordes de cieloAlto (arriba, igual que el plano de atrás) a cieloBajo en el horizonte.
// Las tiras con canto (papel multiplicado, tira ondulada, nubes) se leían como rectas finas.
function cieloBajo() {
  const [c, x] = mk(480, 256);
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, TARDE.cieloAlto);
  g.addColorStop(0.5, TARDE.cieloMedio);
  g.addColorStop(0.75, TARDE.cieloBajo);
  g.addColorStop(1, TARDE.cieloHorizonte);
  x.fillStyle = g;
  x.fillRect(0, 0, 480, 256);
  conFibra(x, 480, 256, TARDE.papel.cieloFibra);
  // Alto de potencia de 2: el filtro repite la textura y mezclaba la fila de abajo (clara) con la de arriba: la recta de y = 240.
  // Las 2 filas de abajo van detrás del suelo.
  x.fillStyle = TARDE.cieloAlto;
  x.fillRect(0, 254, 480, 2);
  return c;
}

// Lo de arriba del cielo: un valor plano, con la misma fibra
function cieloAlto() {
  const [c, x] = mk(480, 240);
  x.fillStyle = TARDE.cieloAlto;
  x.fillRect(0, 0, 480, 240);
  conFibra(x, 480, 240, TARDE.papel.cieloFibra);
  return c;
}

// Sol de papel cálido: disco #FFD56B con canto rasgado más naranja. Sin aros: los críticos los leían como halo (ESPEC §6)
function sol(R) {
  const T = TARDE.sol;
  const S = Math.ceil(R * 2 + 8);
  const [c, x] = mk(S, S);
  const r = rng(78);
  const disco = (rad, jit) => (g) => {
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const rr = rad - jit * r();
      g.lineTo(S / 2 + Math.cos(a) * rr, S / 2 + Math.sin(a) * rr);
    }
    g.closePath();
  };
  cut(x, disco(R, 2.5), { fill: T.canto, edgeW: 0, shadow: null, r, fiberCount: 0 });
  cut(x, disco(R - 3, 1), { fill: T.fill, edgeW: 0, shadow: null, r, fiberCount: 30 });
  return c;
}

// Obstáculos de la tarde: cartón #6B4630, cinta o franja #FF6B35 y canto claro de papel de 4 px por dentro
function pieza(x, ox, oy, w, h, seed, tape, body = TARDE.obs) {
  block(x, ox, oy, w, h, { body, tape, seed });
}
// El canto claro llega hasta el filo de afuera (tapa el perfil de tinta del bloque): contra la colina oscura, lo primero
// que se ve del obstáculo es papel. p px por dentro de la caja de juego + los 2 px del margen. El pie (pieSin px de abajo)
// se queda con su canto de tinta: sobre el suelo kraft claro el borde que se lee es el oscuro (sonda @suelo, y = 436).
function canto(x, ox, oy, w, h, pieSin = TARDE.canto.pie, color = TARDE.canto.color) {
  const p = TARDE.canto.px;
  x.save();
  x.beginPath();
  x.rect(ox - 3, oy - 3, w + 6, h + 3 - pieSin);
  x.clip();
  x.strokeStyle = rgba(color, TARDE.canto.alpha);
  x.lineWidth = p + 2;
  x.beginPath();
  x.roundRect(ox + p / 2 - 1, oy + p / 2 - 1, w - p + 2, h - p + 2, Math.max(1, 6 - p / 2));
  x.stroke();
  x.restore();
}
// Misma medida y mismos círculos que token() de textures.js: la ficha no cambia de lugar ni de tamaño
function ficha() {
  const F = TARDE.ficha;
  const [c, x] = mk(36, 40);
  x.fillStyle = F.canto;
  x.beginPath();
  x.arc(18, 21, 15, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = F.filo;
  x.beginPath();
  x.arc(18, 18, 15, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = F.cara;
  x.beginPath();
  x.arc(18, 18, 12.5, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = F.marca;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(18, 18, 8.5, 0, Math.PI * 2);
  x.stroke();
  return c; // sin el arco de token(): sobre la cara oscura los invitados lo leían como carita triste o señal de prohibido
}

const OBS = {
  caja() {
    const [c, x] = mk(64, 60);
    pieza(x, 2, 2, 60, 56, 41, true);
    canto(x, 2, 2, 60, 56);
    return c;
  },
  torre() {
    const [c, x] = mk(64, 96);
    pieza(x, 2, 48, 60, 44, 42, true);
    canto(x, 2, 48, 60, 44);
    x.save();
    x.translate(32, 48);
    x.rotate(-0.026);
    x.translate(-32, -48);
    pieza(x, 3, 2, 58, 44, 43, true, mix(TARDE.obs, PAL.ink, 0.06));
    canto(x, 3, 2, 58, 44, 0);
    x.restore();
    return c;
  },
  viga() {
    const [c, x] = mk(95, 36);
    pieza(x, 2, 2, 91, 32, 91, false);
    x.save();
    x.beginPath();
    x.roundRect(2, 2, 91, 32, 6);
    x.clip();
    x.fillStyle = PAL.accent;
    for (const ox of [0, 22, 44]) {
      x.beginPath();
      x.moveTo(20 + ox, 9);
      x.lineTo(34 + ox, 9);
      x.lineTo(28 + ox, 34);
      x.lineTo(14 + ox, 34);
      x.closePath();
      x.fill();
    }
    x.restore();
    canto(x, 2, 2, 91, 32, 0, PAL.ink); // la viga cuelga contra el cielo oro (a 1280): contorno de tinta, no papel
    x.fillStyle = PAL.ink;
    for (const ox of [12, 81]) {
      x.beginPath();
      x.arc(ox, 8, 2.2, 0, Math.PI * 2);
      x.fill();
    }
    return c;
  },
};

export function montar(s) {
  const amb = s.ambient;
  if (!amb || amb.tardeMontada) return;
  amb.tardeMontada = true;
  const add = (k, cv) => s.textures.exists(k) || s.textures.addCanvas(k, cv);
  const Pa = TARDE.papel;
  add('tardeSol', sol(TARDE.sol.r));
  add('tardeCielo', cieloBajo());
  add('tardeCieloAlto', cieloAlto());
  add('tardeLabio', labioSuelo(TARDE.suelo.cantoPx));
  add('tardeSombraSuelo', sombraSuelo(TARDE.sombra, Pa.sombra.suelo));
  Object.entries(OBS).forEach(([k, fn]) => add(`${k}_t`, fn()));
  add('token_t', ficha());
  // El atardecer es SOLO del nivel 1 del Cuaderno (DECISIONES 3-nov 10:34, duda 1). En los demás niveles st queda en 0: la tarde
  // de siempre, sin tocar DAY.
  const nivel1 = () => nivelDe(leerCuaderno()).nivel === 1;
  amb.n1 = nivel1();
  // La hora fija solo la pide el juego. Los medidores siguen pudiendo poner cualquier hora con setDay(i, true).
  const fija = () => TARDE.horaFija && amb.n1 && !s.demo;
  const sd = amb.setDay;
  amb.setDay = function (i, instant) {
    if (!instant && fija()) return; // checkpoint: la hora no cambia
    sd.call(this, i, instant);
  };
  // Del atardecer a la hora del nivel 2: el fundido de siempre, al empezar la primera partida ya sin nivel 1
  amb.desdeTarde = () => {
    const d = amb.day;
    const a = d.to;
    d.from = 2;
    d.to = a;
    d.t = 0;
    d.dur = s.reduced ? 150 : 6000;
    amb.saliendo = true;
    amb.applyDay(0);
  };
  const rr = s.resetRun;
  s.resetRun = function (...a) {
    // El nivel se lee al empezar: caer y reintentar es la misma partida, aunque esa caída haya sellado el nivel 2
    if (this.demo || !this.partidaEmpezada) amb.n1 = nivel1();
    this.partidaEmpezada = !this.demo;
    const r = rr.apply(this, a);
    if (fija()) sd.call(amb, 2, true);
    return r;
  };
  const sgN = s.startGame;
  s.startGame = function (...a) {
    this.partidaEmpezada = false;
    return sgN.apply(this, a);
  };
  const dia2 = { shadowK: DAY[2].shadowK, bands: DAY[2].bands };
  const tarde2 = { shadowK: TARDE.shadowK, bands: 0 }; // sin bandas de fibra: el cielo es papel plano
  // Recorte suelto de papel (pino, poste): mismo alfa, un solo color, canto, fibra y su sombra dentro del lienzo
  const plano = (key, color) => {
    const k = `${key}_t`;
    if (!s.textures.exists(k) && s.textures.exists(key)) {
      s.textures.addCanvas(k, conSombra(hornear(s.textures.get(key).getSourceImage(), { color, ...Pa.mid }), { color: TARDE.sombra, alpha: Pa.sombra.mid }));
    }
    return s.textures.exists(k) ? k : null;
  };
  // Mosaicos grandes: de a uno, en los ratos libres del título. Si la partida llega antes, de a uno por cuadro (hornoLibre). Solo se hornean
  // para quien va a ver atardecer: en los demás niveles nunca corre. El tercero: el mosaico repite en vertical y el filtro mezcla su fila
  // de abajo con la de arriba, así que va sin pie; la capa lejana ya lo resuelve con la tapa.
  const CAPAS = {
    ridge: [TARDE.lejana, Pa.ridge, true, Pa.sombra.ridge],
    far: [TARDE.cercana, Pa.far, false, Pa.sombra.far],
    mid: [TARDE.pinos, Pa.mid, true, Pa.sombra.mid],
  };
  let hornoLibre = true;
  const conSu = (key, cv, alfa) => {
    s.textures.addCanvas(`${key}_t`, cv);
    s.textures.addCanvas(`${key}_s`, sombra(cv, { color: TARDE.sombra, alpha: alfa }));
  };
  const hornoCapa = (key) => {
    if (s.textures.exists(`${key}_t`)) return true;
    if (!s.textures.exists(key)) return false;
    const [color, P, sinPie, alfa] = CAPAS[key];
    conSu(key, hornear(s.textures.get(key).getSourceImage(), { color, sinPie, ...P }), alfa);
    return true;
  };
  const hornoBanda = () => {
    if (!s.textures.exists('tardeBanda_t')) conSu('tardeBanda', bandaMedia(), Pa.sombra.media);
    return true;
  };
  const enReposo = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
  const pintadas = TARDE.capas && amb.n1 ? montarCapas(s) : null; // solo el nivel 1 pide los webp
  const calienta = (cola) => {
    if (!cola.length || !amb.n1 || s.esc || s.screen !== 'demo' || (pintadas && (pintadas.cargando || pintadas.cargadas))) return;
    if (s.texQueue) return void s.time.delayedCall(250, () => calienta(cola));
    cola[0]();
    enReposo(() => calienta(cola.slice(1)), { timeout: 500 });
  };
  const gy = () => s.base.far - 12 + 300 * (s.farS || 1); // groundY sin importar config (si no, el build parte config del chunk inicial)
  const o = {
    // cielo encima de nubes, velo de arriba y bandas (1-1.5): nada con canto asoma; aviones y pájaros (1.6) sí pasan
    cielo: s.add.tileSprite(0, 0, 10, 10, 'tardeCieloAlto').setOrigin(0, 0).setDepth(1.55),
    bajo: s.add.tileSprite(0, 0, 10, 10, 'tardeCielo').setOrigin(0, 0).setDepth(1.56),
    sol: s.add.image(0, 0, 'tardeSol').setDepth(TARDE.sol.depth),
    banda: s.add.tileSprite(0, 0, 10, 10, '__DEFAULT').setOrigin(0, 0).setDepth(1.95),
    // tapa del borde de arriba de la capa lejana: el mosaico mezcla su fila de abajo con la de arriba (recta de 1 px)
    tapa: s.add.rectangle(0, 0, 10, 10, hex(TARDE.cieloAlto), 1).setOrigin(0, 0).setDepth(2.07),
    canto: s.add.tileSprite(0, 0, 10, 10, 'tardeLabio').setOrigin(0, 0).setDepth(4.05),
    // cordillera, capa lejana y media en recorte plano: siluetas propias en vez de setTintFill, que en el borde antialiaseado de
    // Phaser deja un filo MÁS CLARO que el relleno (los invitados lo leían como contorno hueco). Las de abajo se esconden al estar listas.
    ridge: s.add.tileSprite(0, 0, 10, 10, '__DEFAULT').setOrigin(0, 0).setDepth(1.905),
    far: s.add.tileSprite(0, 0, 10, 10, '__DEFAULT').setOrigin(0, 0).setDepth(2.06),
    mid: s.add.tileSprite(0, 0, 10, 10, '__DEFAULT').setOrigin(0, 0).setDepth(3.06),
  };
  // Sombras de contacto, justo debajo de la capa que las proyecta
  const sb = {
    ridge: s.add.tileSprite(0, 0, 10, 10, '__DEFAULT').setOrigin(0, 0).setDepth(1.902),
    banda: s.add.tileSprite(0, 0, 10, 10, '__DEFAULT').setOrigin(0, 0).setDepth(1.945),
    far: s.add.tileSprite(0, 0, 10, 10, '__DEFAULT').setOrigin(0, 0).setDepth(2.055),
    mid: s.add.tileSprite(0, 0, 10, 10, '__DEFAULT').setOrigin(0, 0).setDepth(3.055),
    suelo: s.add.image(0, 0, 'tardeSombraSuelo').setOrigin(0, 0).setDepth(3.95),
  };
  const all = [...Object.values(o), ...Object.values(sb)];
  all.forEach((v) => v.setAlpha(0).setVisible(false));
  const capasV = { ridge: s.ridge.visible, farVeil: s.farVeil.visible };
  // Copia posición, tamaño y corrimiento de la capa. La textura es 1/4: la escala sube y el corrimiento baja lo mismo.
  const sigue = (sh, L) => {
    sh.setPosition(L.x, L.y).setSize(L.width, L.height).setTileScale(L.tileScaleX * SOMBRA_K, L.tileScaleY * SOMBRA_K);
    sh.tilePositionX = L.tilePositionX / SOMBRA_K;
  };
  // Las sombras no existen en el dibujo a lápiz: entran cuando la pintura ya casi acaba
  const alfaSombra = () => {
    const B = s.boceto;
    if (!B) return amb.st;
    if (!B.listo) return 0;
    const [a, b] = Pa.sombra.ramp;
    return amb.st * Math.min(1, Math.max(0, (B.t - a) / (b - a)));
  };

  // Lo que el fondo pintado tapa: con la tarde completa no se dibuja (menos sobredibujo). Se guarda cómo estaba para regresarlo al salir del nivel 1.
  let tapado = null;
  const tapar = (si) => {
    if (si && !tapado) {
      tapado = [s.sky, s.clouds, s.topFade, s.surface, s.canto, s.front, s.shade, s.ridge, s.far, s.farVeil, s.mid, s.midVeil, s.ridgeSkirt, s.sun].map((v) => [v, v.visible]);
    }
    if (si) {
      tapado.forEach(([v]) => v.setVisible(false));
      s.folds.forEach((v) => v.setVisible(false));
      if (s.midPool) s.midPool.forEach((q) => (q.body.setVisible(false), q.veil.setVisible(false)));
    } else if (tapado) {
      tapado.forEach(([v, a]) => v.setVisible(a));
      s.folds.forEach((v) => v.setVisible(true));
      tapado = null;
    }
  };

  // posición: cada cuadro, después del update de la escena (capas, salto y tamaño ya resueltos)
  const colocar = () => {
    if (!amb.st) return;
    hornoLibre = true;
    const fs = s.farS || 1;
    const g = gy();
    const aS = alfaSombra();
    if (pintadas && pintadas.cargadas && !s.boceto) pintadas.activa = true;
    if (pintadas && pintadas.activa) {
      pintadas.colocar(g, amb.st);
      Object.values(o).forEach((v) => v.setVisible(false));
      Object.values(sb).forEach((v) => v.setVisible(false));
      tapar(amb.st >= 1);
      piezas();
      return;
    }
    o.cielo.setPosition(0, s.top).setSize(s.vw, g - s.top);
    o.tapa.setPosition(0, s.far.y - 2).setSize(s.vw, 4);
    const bajoH = TARDE.bajoTop * fs + 12;
    o.bajo.setPosition(0, g - TARDE.bajoTop * fs).setSize(s.vw, bajoH).setTileScale(1, bajoH / 256);
    o.sol.setPosition(s.vw * TARDE.sol.x, g - (g - TARDE.sol.y) * fs).setScale(fs);
    const bandH = 452 - BANDA_TOP;
    const lift = s.far.y - s.base.far; // la colina media baja con el salto como la capa lejana
    // Una capa aún sin hornear no se ve, ni ella ni su sombra; la de siempre sigue debajo
    const lista = (T, sh, tex, hazla) => {
      if (T.displayTexture.key === `${tex}_t`) return true; // en un TileSprite, .texture es su canvas interno
      const hay = s.textures.exists(`${tex}_t`);
      if (!hay && !hornoLibre) return false;
      if (!hay) hornoLibre = false;
      if (!hazla()) return false;
      T.setTexture(`${tex}_t`);
      sh.setTexture(`${tex}_s`);
      return true;
    };
    const banda = lista(o.banda, sb.banda, 'tardeBanda', hornoBanda);
    o.banda.setVisible(banda).setPosition(0, g + 12 - bandH * fs + lift).setSize(s.vw, bandH * fs).setTileScale(fs);
    o.banda.tilePositionX = s.far.tilePositionX * 0.8; // entre la cordillera (0.15x) y la capa lejana (0.3x)
    sigue(sb.banda, o.banda);
    sb.banda.setVisible(banda).setAlpha(aS);
    [[o.ridge, s.ridge, 'ridge', sb.ridge, [s.ridge]],
      [o.far, s.far, 'far', sb.far, [s.far, s.farVeil]],
      [o.mid, s.mid, 'mid', sb.mid, []]].forEach(([T, L, key, sh, abajo]) => {
      if (!lista(T, sh, key, () => hornoCapa(key))) {
        sh.setVisible(false);
        return T.setVisible(false);
      }
      T.setVisible(true).setPosition(L.x, L.y).setSize(L.width, L.height).setTileScale(L.tileScaleX, L.tileScaleY);
      T.tilePositionX = L.tilePositionX;
      sigue(sh, T);
      sh.setVisible(true).setAlpha(aS);
      // el canto muerde la silueta: lo de debajo no debe asomar por las mordidas
      abajo.forEach((v) => v.setVisible(amb.st < 1));
    });
    sb.suelo.setPosition(0, g - 10 - Pa.sombra.sueloPx).setDisplaySize(s.vw, Pa.sombra.sueloPx).setAlpha(aS);
    // pinos y postes sueltos: RunScene.stepMidProps les pone su textura y tinte cada cuadro; aquí, su silueta plana
    if (s.midPool) {
      s.midPool.forEach((q) => {
        if (!q.body.visible) return;
        const k = plano(q.prop.key, TARDE.pinos);
        if (k) q.body.setTexture(k).clearTint();
        q.veil.setAlpha(0);
      });
    }
    // los pliegues se rehacen al cambiar de tamaño. En el atardecer se van: sobre papel recortado eran rectas de regla
    s.folds.forEach((v) => v.setTint(lerp(0xffffff, TARDE.suelo.tinte, amb.st)).setAlpha(1 - amb.st));
    piezas();
    o.canto.setPosition(0, g - 11).setSize(s.vw, TARDE.suelo.cantoPx + 6); // labio sobre el suelo: el pie del obstáculo (y 436) asienta en kraft, no en el canto
    o.canto.tilePositionX = s.dist;
  };
  const piezas = () => {
    // con el fondo pintado, las de abajo a 1.3x son el primer plano oscuro
    const pz = lerp(0xffffff, pintadas && pintadas.activa ? TARDE.piezasOscuras : TARDE.piezas, amb.st); // las piezas nacen sin tinte: se les pone cada cuadro
    const aTorn = pintadas && pintadas.activa ? 0 : 1 - amb.st * (1 - TARDE.piezasTorn); // con fondo pintado, la losa rasgada se leía como rectángulo
    const pzPiedra = lerp(0xffffff, TARDE.piedra.tinte, amb.st);
    const aPiedra = 1 - amb.st * (1 - TARDE.piedra.alfa);
    s.fg.forEach((f) => {
      const k = f.sprite.texture.key;
      if (k.startsWith('gp-')) f.sprite.setTint(pz);
      if (k.startsWith('gp-torn')) f.sprite.setAlpha(aTorn);
      if (k.startsWith('gp-stone')) f.sprite.setTint(pzPiedra).setAlpha(aPiedra);
    });
  };
  s.events.on('postupdate', colocar);
  s.events.once('shutdown', () => s.events.off('postupdate', colocar));

  const orig = amb.applyDay;
  amb.applyDay = function (f) {
    Object.assign(DAY[2], amb.n1 ? tarde2 : dia2);
    orig.call(this, f);
    pintar();
  };
  const okey = amb.obsKey;
  amb.obsKey = function (type) {
    if (this.tarde && !s.paseoRun && s.textures.exists(`${type}_t`)) return `${type}_t`;
    return okey.call(this, type);
  };
  const puede = amb.can;
  amb.can = function (kind, tramo) {
    if (kind === 'sign' && !TARDE.cartel && amb.n1) return false;
    return puede.call(this, kind, tramo);
  };
  const veloVisible = s.midVeil.visible;
  const fichaKey = () => (amb.tarde && !s.paseoRun ? 'token_t' : 'token');
  const sp = s.spawnPickup;
  s.spawnPickup = function (e) {
    sp.call(this, e);
    if (!e.amber) this.pickups[this.pickups.length - 1].sprite.setTexture(fichaKey()); // solo la imagen: mismo lugar, mismo choque
  };

  function pintar() {
    const d = amb.day;
    if (d.t >= 1) amb.saliendo = false;
    const st = !amb.n1 && !amb.saliendo ? 0 : d.to === 2 ? d.t : d.from === 2 ? 1 - d.t : 0;
    amb.st = st;
    const on = st > 0;
    all.forEach((v) => v.setVisible(on).setAlpha(st));
    // Con la tarde completa la silueta plana tapa la capa media de siempre y su velo, pero la misma línea del mosaico asomaría de ellos
    s.mid.setVisible(st < 1);
    s.midVeil.setVisible(st < 1 && veloVisible);
    const tarde = st >= 0.5;
    if (tarde !== !!amb.tarde) {
      amb.tarde = tarde;
      s.obstacles.forEach((q) => q.sprite && q.sprite.setTexture(amb.obsKey(q.type)));
      (s.pickups || []).forEach((k) => k.amber || k.sprite.setTexture(fichaKey()));
    }
    s.skyGrad.setAlpha(1 - st); // applyDay no toca su alfa: se devuelve aquí también al salir de la tarde
    const suelo = lerp(0xffffff, TARDE.suelo.tinte, st); // suelo kraft cálido (los invitados lo leían como concreto)
    [s.surface, s.canto, s.front, ...s.folds].forEach((v) => v.setTint(suelo));
    if (on) s.shade.setTintFill(lerp(hex(PAL.ink), hex(TARDE.sombra), st));
    else s.shade.clearTint();
    if (!on) {
      tapar(false);
      if (pintadas && pintadas.cargadas) pintadas.colocar(gy(), 0);
      s.fg.forEach((f) => {
        if (!f.sprite.texture.key.startsWith('gp-')) return;
        f.sprite.clearTint(); // colocar ya no corre con st = 0
        if (f.sprite.texture.key.startsWith('gp-torn') || f.sprite.texture.key.startsWith('gp-stone')) f.sprite.setAlpha(1);
      });
      s.ridge.setVisible(capasV.ridge);
      s.far.setVisible(true);
      s.farVeil.setVisible(capasV.farVeil);
      s.folds.forEach((v) => v.setAlpha(1));
      return;
    }
    const P = hex(PAL.paper);
    // cielo y velo de arriba: un solo valor plano (cielo alto); el bajo es la tira de atrás
    const alto = hex(TARDE.cieloAlto);
    // multiplicado (no setTintFill): el velo de arriba es un degradado de alfa y en relleno salía más claro que el cielo
    s.sky.setTint(lerp(s.sky.tintTopLeft, tintTo(P, alto), st));
    s.topFade.setTint(lerp(s.topFade.tintTopLeft, tintTo(P, alto), st));
    s.ridge.setTintFill(lerp(s.ridge.tintTopLeft, hex(TARDE.lejana), st));
    s.nearVeil.setAlpha(s.nearVeil.alpha * (1 - st)); // suelo kraft puro, más claro que la colina cercana
    // velos de perspectiva del color del cielo de atrás y no del papel beige de la tarde vieja (donde su alfa es tenue, aclaraban
    // el naranja). Solo el tinte: su alfa la maneja la noche (diaA) y no se toca aquí.
    s.farVeil.setTintFill(lerp(s.farVeil.tintTopLeft, alto, st)); // su borde cae en el cielo plano
    s.midVeil.setTintFill(lerp(s.midVeil.tintTopLeft, lerp(alto, hex(TARDE.cieloMedio), 0.35), st)); // su borde cae al inicio del degradado
    if (s.sun) s.sun.setAlpha(s.sun.alpha * (1 - st));
    amb.obsTint = lerp(amb.obsTint, 0xffffff, st);
    s.obstacles.forEach((q) => q.sprite && q.sprite.setTint(amb.obsTint));
    colocar();
  }
  amb.applyDay(0);
  if (fija() && s.screen === 'play') sd.call(amb, 2); // el chunk llegó con la partida ya corriendo: fundido, sin transición
  calienta([hornoBanda, () => hornoCapa('ridge'), () => hornoCapa('far'), () => hornoCapa('mid')]);
  montarBoceto(s, o, colocar, TARDE.sol.r);
  if (TARDE.bokeh) montarBokeh(s);
  montarHojas(s);
}
