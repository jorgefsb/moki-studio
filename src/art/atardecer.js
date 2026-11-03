// SALTO ATARDECER día 1 (previz/salto-noche/ESPEC-SALTO.md §1-2): la hora de TARDE se vuelve atardecer de papel.
// Módulo diferido: envuelve Ambient.applyDay y, solo mientras es tarde (st sigue al fundido de 6 s), pinta encima
// cielo oro plano, colinas en capas planas, sol de papel bajo a la derecha, suelo kraft con canto claro y obstáculos
// #6B4630 con canto claro. Con st = 0 todo lo nuevo queda con alfa 0 e invisible: mañana, mediodía y noche no cambian.
// Las perillas viven aquí (y no en src/config.js) para que el JS inicial no crezca: quedan 160 B del salto.
import { PAL, mix, rgba, rng } from './palette.js';
import { mk, cut, block } from './textures.js';
import { DAY } from './ambient.js';
import { leerCuaderno, nivelDe } from '../cuaderno.js';

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
  cieloAlto: '#F79E52', // arriba, un paso más naranja
  cieloMedio: '#FBA956',
  cieloBajo: '#FCB646',
  cieloHorizonte: '#FFD27A', // franja clara y cálida pegada al horizonte (luz del sol bajo)
  bajoTop: 260, // el degradado llega a cieloBajo en y = groundY - bajoTop (por farS); abajo, plano
  lejana: '#F08A4E', // cordillera (0.15x): la más clara de las siluetas
  media: '#C98552', // colina media plana (0.3x), su borde de arriba nunca baja de y = 290 del mundo
  mediaTop: [236, 288], // y del mundo del canto de arriba de la colina media (lomas suaves; nunca baja de 290)
  cercana: '#93451A', // capa lejana de siempre (cerros y casitas) teñida a este valor
  pinos: '#4A2614', // capa media (pinos, postes, arbustos): la más oscura, para que el obstáculo #6B4630 quede entre cerros y pinos
  obs: '#6B4630', // caja, torre y viga
  canto: { px: 4, alpha: 1, pie: 10 }, // canto claro #F4E8D5 del obstáculo; los 10 px de abajo sin él
  suelo: { cantoPx: 4, tinte: 0xffe18d }, // canto de papel arriba del suelo; tinte lleva el papel del suelo (#CDAF8D) a kraft cálido #CD9A4E
  sol: { x: 0.84, y: 262, r: 54, depth: 1.92, fill: '#FFD56B', canto: '#F7B24A', halo: '#FFE08A', haloK: [1.5, 1.25], haloA: [0.28, 0.45] }, // bajo a la derecha, medio tapado por la colina media
  shadowK: 0.7, // sombras cortas
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
  cut(x, path, { fill: TARDE.media, edgeW: 0, shadow: { alpha: 0.18, blur: 10, dx: 0, dy: -3 }, r, fiberCount: 160 });
  // canto rasgado: filo de papel claro de 2-3 px que sigue el borde, con mordidas
  x.save();
  x.strokeStyle = rgba(PAL.paper, 0.2); // con 0.35 cruzaba el sol como cresta transparente
  x.lineJoin = 'round';
  for (let i = 1; i < pts.length; i++) {
    x.lineWidth = 2 + r();
    x.beginPath();
    x.moveTo(pts[i - 1][0], pts[i - 1][1] + 1);
    x.lineTo(pts[i][0], pts[i][1] + 1);
    x.stroke();
  }
  x.restore();
  // el mosaico repite en vertical y el filtro mezcla la fila de abajo (opaca) con la de arriba: recta de 1 px en el cielo.
  // Las 2 filas de abajo quedan vacías (van detrás del suelo).
  x.clearRect(0, H - 2, W, 2);
  return c;
}

// Cielo bajo: degradado vertical sin bordes de cieloAlto (arriba, igual que el plano de atrás) a cieloBajo en el horizonte.
// Las tiras con canto (papel multiplicado, tira ondulada, nubes) se leían como rectas finas.
function cieloBajo() {
  const [c, x] = mk(4, 256);
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, TARDE.cieloAlto);
  g.addColorStop(0.5, TARDE.cieloMedio);
  g.addColorStop(0.75, TARDE.cieloBajo);
  g.addColorStop(1, TARDE.cieloHorizonte);
  x.fillStyle = g;
  x.fillRect(0, 0, 4, 256);
  return c;
}

// Sol de papel cálido: disco #FFD56B con canto rasgado más naranja y dos aros de halo plano (papel encimado, sin brillo)
function sol(R) {
  const T = TARDE.sol;
  const RH = R * T.haloK[0];
  const S = Math.ceil(RH * 2 + 8);
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
  T.haloK.forEach((k, i) => {
    x.globalAlpha = T.haloA[i];
    x.fillStyle = T.halo;
    x.beginPath();
    disco(R * k, 2)(x);
    x.fill();
  });
  x.globalAlpha = 1;
  cut(x, disco(R, 1.2), { fill: T.canto, edgeW: 0, shadow: null, r, fiberCount: 0 });
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
function canto(x, ox, oy, w, h, pieSin = TARDE.canto.pie, color = PAL.paper) {
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
  add('tardeBanda', bandaMedia());
  add('tardeSol', sol(TARDE.sol.r));
  add('tardeCielo', cieloBajo());
  Object.entries(OBS).forEach(([k, fn]) => add(`${k}_t`, fn()));
  // El atardecer es SOLO del nivel 1 del Cuaderno (DECISIONES 3-nov 10:34, duda 1). En los demás niveles st queda en 0: la tarde
  // de siempre, sin tocar DAY.
  const nivel1 = () => nivelDe(leerCuaderno()).nivel === 1;
  amb.n1 = nivel1();
  const rr = s.resetRun;
  s.resetRun = function (...a) {
    amb.n1 = nivel1();
    return rr.apply(this, a);
  };
  const dia2 = { shadowK: DAY[2].shadowK, bands: DAY[2].bands };
  const tarde2 = { shadowK: TARDE.shadowK, bands: 0 }; // sin bandas de fibra: el cielo es papel plano
  // silueta plana de una textura del juego: mismo alfa (canvas source-in), un solo color
  const plano = (key, color) => {
    const k = `${key}_t`;
    if (!s.textures.exists(k) && s.textures.exists(key)) {
      const src = s.textures.get(key).getSourceImage();
      const [c, x] = mk(src.width, src.height);
      x.drawImage(src, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
      s.textures.addCanvas(k, c);
    }
    return s.textures.exists(k) ? k : null;
  };
  const gy = () => s.base.far - 12 + 300 * (s.farS || 1); // groundY sin importar config (si no, el build parte config del chunk inicial)
  const o = {
    // cielo encima de nubes, velo de arriba y bandas (1-1.5): nada con canto asoma; aviones y pájaros (1.6) sí pasan
    cielo: s.add.rectangle(0, 0, 10, 10, hex(TARDE.cieloAlto), 1).setOrigin(0, 0).setDepth(1.55),
    bajo: s.add.image(0, 0, 'tardeCielo').setOrigin(0, 0).setDepth(1.56),
    sol: s.add.image(0, 0, 'tardeSol').setDepth(TARDE.sol.depth),
    banda: s.add.tileSprite(0, 0, 10, 10, 'tardeBanda').setOrigin(0, 0).setDepth(1.95),
    // tapa del borde de arriba de la capa lejana: el mosaico mezcla su fila de abajo con la de arriba (recta de 1 px)
    tapa: s.add.rectangle(0, 0, 10, 10, hex(TARDE.cieloAlto), 1).setOrigin(0, 0).setDepth(2.07),
    canto: s.add.rectangle(0, 0, 10, 10, hex(PAL.paper), 1).setOrigin(0, 0).setDepth(4.05),
    // capa lejana y media en recorte plano: siluetas propias (encima de sus velos) en vez de setTintFill, que en el borde
    // antialiaseado de Phaser deja un filo MÁS CLARO que el relleno (los invitados lo leían como contorno hueco)
    far: s.add.tileSprite(0, 0, 10, 10, '__DEFAULT').setOrigin(0, 0).setDepth(2.06),
    mid: s.add.tileSprite(0, 0, 10, 10, '__DEFAULT').setOrigin(0, 0).setDepth(3.06),
  };
  const all = Object.values(o);
  all.forEach((v) => v.setAlpha(0).setVisible(false));

  // posición: cada cuadro, después del update de la escena (capas, salto y tamaño ya resueltos)
  const colocar = () => {
    if (!amb.st) return;
    const fs = s.farS || 1;
    const g = gy();
    o.cielo.setPosition(0, s.top).setSize(s.vw, g - s.top);
    o.tapa.setPosition(0, s.far.y - 2).setSize(s.vw, 4);
    o.bajo.setPosition(0, g - TARDE.bajoTop * fs).setDisplaySize(s.vw, TARDE.bajoTop * fs + 12);
    o.sol.setPosition(s.vw * TARDE.sol.x, g - (g - TARDE.sol.y) * fs).setScale(fs);
    const bandH = 452 - BANDA_TOP;
    const lift = s.far.y - s.base.far; // la colina media baja con el salto como la capa lejana
    o.banda.setPosition(0, g + 12 - bandH * fs + lift).setSize(s.vw, bandH * fs).setTileScale(fs);
    o.banda.tilePositionX = s.far.tilePositionX * 0.8; // entre la cordillera (0.15x) y la capa lejana (0.3x)
    [[o.far, s.far, 'far', TARDE.cercana], [o.mid, s.mid, 'mid', TARDE.pinos]].forEach(([T, L, key, color]) => {
      if (T.texture.key !== `${key}_t`) {
        const k = plano(key, color);
        if (!k) return T.setVisible(false);
        T.setTexture(k);
      }
      T.setVisible(true).setPosition(L.x, L.y).setSize(L.width, L.height).setTileScale(L.tileScaleX, L.tileScaleY);
      T.tilePositionX = L.tilePositionX;
    });
    // pinos y postes sueltos: RunScene.stepMidProps les pone su textura y tinte cada cuadro; aquí, su silueta plana
    if (s.midPool) {
      s.midPool.forEach((q) => {
        if (!q.body.visible) return;
        const k = plano(q.prop.key, TARDE.pinos);
        if (k) q.body.setTexture(k).clearTint();
        q.veil.setAlpha(0);
      });
    }
    s.folds.forEach((v) => v.setTint(lerp(0xffffff, TARDE.suelo.tinte, amb.st))); // los pliegues se rehacen al cambiar de tamaño
    o.canto.setPosition(0, g - 10).setSize(s.vw, TARDE.suelo.cantoPx); // labio sobre el suelo: el pie del obstáculo (y 436) asienta en kraft, no en el canto
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

  function pintar() {
    const d = amb.day;
    const st = !amb.n1 ? 0 : d.to === 2 ? d.t : d.from === 2 ? 1 - d.t : 0;
    amb.st = st;
    const on = st > 0;
    all.forEach((v) => v.setVisible(on).setAlpha(st));
    const tarde = st >= 0.5;
    if (tarde !== !!amb.tarde) {
      amb.tarde = tarde;
      s.obstacles.forEach((q) => q.sprite && q.sprite.setTexture(amb.obsKey(q.type)));
    }
    s.skyGrad.setAlpha(1 - st); // applyDay no toca su alfa: se devuelve aquí también al salir de la tarde
    const suelo = lerp(0xffffff, TARDE.suelo.tinte, st); // suelo kraft cálido (los invitados lo leían como concreto)
    [s.surface, s.canto, s.front, ...s.folds].forEach((v) => v.setTint(suelo));
    if (!on) return;
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
}
