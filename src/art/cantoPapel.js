// CANTO DE PAPEL (previz/salto-noche/ESPEC-SALTO.md §2): las capas del nivel 1 se hornean como papel recortado. Todo sale al crear
// la textura, nada se mezcla en vivo: canto rasgado y fibra van dentro del lienzo de la capa; la sombra de contacto es un mosaico
// aparte a 1/4 de resolución, porque es borrosa y porque la transición de boceto la tiene que poder esconder.
import { PAL, rgba, rng } from './palette.js';
import { mk } from './textures.js';

export const SOMBRA_K = 4; // la sombra se hornea a 1/4 del tamaño de la capa

// Hebras y manchas de papel, claras y oscuras: multiplicar no se notaría en las capas casi negras. Mosaico de 240 (cabe justo en 1920).
let tiraFibra = null;
function fibra() {
  if (tiraFibra) return tiraFibra;
  const [c, x] = mk(240, 240);
  const r = rng(79);
  for (let i = 0; i < 26; i++) {
    x.fillStyle = rgba(i % 2 ? PAL.paper : PAL.ink, 0.025);
    x.beginPath();
    x.ellipse(r() * 240, r() * 240, 14 + r() * 34, 8 + r() * 18, r() * 3, 0, Math.PI * 2);
    x.fill();
  }
  x.lineWidth = 1;
  for (let i = 0; i < 620; i++) {
    const px = r() * 240;
    const py = r() * 240;
    const largo = 4 + r() * 14;
    const a = (r() - 0.5) * 0.9;
    x.strokeStyle = rgba(r() < 0.55 ? PAL.paper : PAL.ink, 0.1 + r() * 0.08);
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(a) * largo, py + Math.sin(a) * largo);
    x.stroke();
  }
  tiraFibra = c;
  return c;
}

export function conFibra(x, W, H, k = 1) {
  x.save();
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = x.createPattern(fibra(), 'repeat');
  for (let i = k; i > 0; i--) { // arriba de 1, una segunda pasada corrida
    x.globalAlpha = Math.min(1, i);
    x.fillRect(0, 0, W, H);
    x.translate(97, 53);
  }
  x.restore();
}

// La silueta sin la sombra suave que traen las texturas de siempre: sobre esa sombra, el canto se volvía un halo claro
function dura(src) {
  const [c, x] = mk(src.width, src.height);
  x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 3; i < d.length; i += 4) d[i] = Math.max(0, Math.min(255, ((d[i] - 150) / 50) * 255));
  x.putImageData(im, 0, 0);
  return c;
}

// Caminata: cada paso se mueve poco, como una rasgadura, y no como ruido por píxel. En los extremos vuelve a 0, para que el mosaico empate.
const caminata = (r, amp, u, W) => (v) => {
  const paso = Math.max(-amp, Math.min(amp, v + (r() - 0.5) * amp));
  return paso * Math.min(1, Math.min(u(), W - u()) / 40);
};

// La silueta entera, rasgada: columnas corridas en vertical y filas en horizontal. El corte deja de ser poligonal.
function rasga(sil, amp, r) {
  const W = sil.width;
  const H = sil.height;
  const [a, ax] = mk(W, H);
  let u = 0;
  let v = 0;
  let paso = caminata(r, amp, () => u, W);
  while (u < W) {
    const w = 2 + Math.floor(r() * 4);
    v = paso(v);
    ax.drawImage(sil, u, 0, w, H, u, v, w, H);
    u += w;
  }
  const [b, bx] = mk(W, H);
  let f = 0;
  v = 0;
  paso = caminata(r, amp, () => f, H);
  while (f < H) {
    const h = 2 + Math.floor(r() * 4);
    v = paso(v);
    bx.drawImage(a, 0, f, W, h, v, f, W, h);
    bx.drawImage(a, 0, f, W, h, v + W, f, W, h);
    bx.drawImage(a, 0, f, W, h, v - W, f, W, h);
    f += h;
  }
  return b;
}

// El filo de arriba de la silueta, px de grueso en promedio y nunca parejo: va de casi nada a casi el doble, por tramos
function filo(sil, px, r) {
  const W = sil.width;
  const [c, x] = mk(W, sil.height);
  x.drawImage(sil, 0, 0);
  x.globalCompositeOperation = 'destination-out';
  let u = 0;
  let g = px;
  while (u < W) {
    const w = 3 + Math.floor(r() * 9);
    g = Math.max(px * 0.25, Math.min(px * 1.9, g + (r() - 0.5) * px * 0.7));
    x.drawImage(sil, u, 0, w, sil.height, u, g, w, sil.height);
    u += w;
  }
  return c;
}

const pinta = (c, color) => {
  const x = c.getContext('2d');
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
};

// Una capa de papel: silueta rasgada, fibra, labio claro y, debajo del labio, el corte en sombra que le da grueso al papel
export function hornear(src, { color, labio, px = 3, seed = 1, sinPie = false, fibraK = 1, rasgado = 2 }) {
  const W = src.width;
  const H = src.height;
  const r = rng(seed);
  const sil = rasga(dura(src), rasgado, r);
  const [c, x] = mk(W, H);
  x.drawImage(sil, 0, 0);
  pinta(c, color);
  conFibra(x, W, H, fibraK);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = 0.22;
  x.drawImage(pinta(filo(sil, px + 2, r), PAL.ink), 0, 0);
  x.globalAlpha = 1;
  const lab = pinta(filo(sil, px, r), labio);
  // el labio tampoco es de un solo blanco: a tramos la fibra de abajo se transparenta
  const lx = lab.getContext('2d');
  lx.globalCompositeOperation = 'destination-out';
  lx.fillStyle = 'rgba(0,0,0,0.55)';
  for (let i = 0; i < W / 14; i++) {
    lx.beginPath();
    lx.ellipse(r() * W, r() * H, 4 + r() * 16, 2 + r() * 3, 0, 0, Math.PI * 2);
    lx.fill();
  }
  x.drawImage(lab, 0, 0);
  // mordidas: unas motas del filo más delgado se van, y el borde deja de ser una línea limpia
  const [m, mx] = mk(W, H);
  mx.fillStyle = '#000';
  for (let i = 0; i < W / 3; i++) {
    mx.beginPath();
    mx.ellipse(r() * W, r() * H, 1 + r() * 3, 0.8 + r() * 1.6, 0, 0, Math.PI * 2);
    mx.fill();
  }
  mx.globalCompositeOperation = 'destination-in';
  mx.drawImage(filo(sil, 2, r), 0, 0);
  x.globalCompositeOperation = 'destination-out';
  x.drawImage(m, 0, 0);
  x.globalCompositeOperation = 'source-over';
  if (sinPie) x.clearRect(0, H - 2, W, 2); // el mosaico repite en vertical y el filtro mezcla la fila de abajo con la de arriba
  return c;
}

// Sombra de contacto de una silueta sobre la capa de atrás. La luz viene de la derecha: cae corta a la izquierda y un poco arriba.
export function sombra(src, { color, alpha, blur = 8, dx = -5, dy = -4 }) {
  const K = SOMBRA_K;
  const W = Math.ceil(src.width / K);
  const H = Math.ceil(src.height / K);
  const [c, x] = mk(W, H);
  const lejos = W + 40;
  x.shadowColor = rgba(color, alpha);
  x.shadowBlur = blur / K;
  x.shadowOffsetX = lejos + dx / K;
  x.shadowOffsetY = dy / K;
  x.drawImage(src, -lejos, 0, W, H); // solo se ve la sombra: la imagen queda fuera del lienzo, y shadowOffset no se escala
  x.shadowColor = 'transparent';
  x.clearRect(0, 0, W, 1);
  x.clearRect(0, H - 1, W, 1);
  return c;
}

// Sombra de un recorte suelto (pino, poste) dentro de su propio lienzo: se desvanece junto con él cerca de los obstáculos
export function conSombra(c, { color, alpha, blur = 10, dx = -4, dy = -2 }) {
  const [t, tx] = mk(c.width, c.height);
  const lejos = c.width + 40;
  tx.shadowColor = rgba(color, alpha);
  tx.shadowBlur = blur;
  tx.shadowOffsetX = lejos + dx;
  tx.shadowOffsetY = dy;
  tx.drawImage(c, -lejos, 0);
  tx.shadowColor = 'transparent';
  tx.drawImage(c, 0, 0);
  return t;
}

// Labio de papel sobre el suelo: rasgado por los dos lados, en caminata para que no se lea punteado. Mosaico de 480.
export function labioSuelo(px) {
  const W = 480;
  const H = px + 6;
  const r = rng(80);
  const [c, x] = mk(W, H);
  const orilla = (base, amp) => {
    const pts = [];
    let v = 0;
    for (let u = 0; u <= W; u += 6) {
      v = Math.max(-amp, Math.min(amp, v + (r() - 0.5) * amp));
      pts.push([u, base + v * Math.min(1, Math.min(u, W - u) / 30)]);
    }
    return pts;
  };
  x.fillStyle = PAL.paper;
  x.beginPath();
  orilla(2, 2).forEach(([u, y]) => x.lineTo(u, y));
  orilla(2 + px, 2.6).reverse().forEach(([u, y]) => x.lineTo(u, y));
  x.closePath();
  x.fill();
  conFibra(x, W, H, 0.8);
  return c;
}

// Sombra de la orilla del suelo sobre los cerros: 4 x 16, de nada a alpha
export function sombraSuelo(color, alpha) {
  const [c, x] = mk(4, 16);
  const g = x.createLinearGradient(0, 0, 0, 16);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(1, rgba(color, alpha));
  x.fillStyle = g;
  x.fillRect(0, 0, 4, 16);
  return c;
}
