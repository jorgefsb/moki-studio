// KIT DE PAPEL del ambiente (DECISIONES 6-nov 08:10, pieza 4; caso-001): mariposa y globo como recortes doblados.
// Viaja en el chunk diferido del atardecer; mientras no llega, Ambient.can no los deja salir. Cada cara plana lleva su propio valor:
// la luz viene de arriba a la derecha (el sol del nivel 1) y el grueso del papel asoma abajo a la izquierda. Sin degradados ni naranja.
import { PAL, TONE, mix, rgba, rng } from './palette.js';
import { mk } from './textures.js';
import { conFibra, conSombra } from './cantoPapel.js';

const LUZ = mix(PAL.paper, '#FFFFFF', 0.55);

// Orilla de papel: parte cada lado en pasos cortos y mueve un poco cada punto, sin llegar a verse dentada
function orilla(puntos, r, amp) {
  const out = [];
  puntos.forEach(([ax, ay], i) => {
    const [bx, by] = puntos[(i + 1) % puntos.length];
    const largo = Math.hypot(bx - ax, by - ay);
    const pasos = Math.max(1, Math.round(largo / 3));
    const [nx, ny] = [(by - ay) / (largo || 1), (ax - bx) / (largo || 1)];
    for (let k = 0; k < pasos; k++) {
      const u = k / pasos;
      const d = (r() - 0.5) * amp;
      out.push([ax + (bx - ax) * u + nx * d, ay + (by - ay) * u + ny * d]);
    }
  });
  return out;
}

const trazar = (x, pts, ox = 0, oy = 0) => {
  x.beginPath();
  pts.forEach(([a, b], i) => (i ? x.lineTo(a + ox, b + oy) : x.moveTo(a + ox, b + oy)));
  x.closePath();
};

// Cara plana: grueso abajo a la izquierda, relleno y filo claro arriba a la derecha
function cara(x, pts, color, { grueso = 1.2, filo = 0.8, canto = TONE.kraftDark } = {}) {
  if (grueso) {
    x.fillStyle = canto;
    trazar(x, pts, -grueso, grueso);
    x.fill();
  }
  x.fillStyle = filo ? mix(color, LUZ, 0.7) : color;
  trazar(x, pts);
  x.fill();
  if (!filo) return;
  x.save();
  trazar(x, pts);
  x.clip();
  x.fillStyle = color;
  trazar(x, pts, -filo, filo);
  x.fill();
  x.restore();
}

function pliegue(x, a, b, alpha = 0.28) {
  x.strokeStyle = rgba(PAL.ink, alpha);
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(...a);
  x.lineTo(...b);
  x.stroke();
}

// Fibra y sombra propia al final: el recorte se separa de lo que tiene atrás
const acabar = (c, x, sombra) => {
  conFibra(x, c.width, c.height, 0.7);
  return conSombra(c, { color: PAL.ink, ...sombra });
};

// Mariposa doblada por el cuerpo: alas de arriba crema, de abajo kraft, y el lado izquierdo un paso más oscuro y cálido. Sin círculos: no se lee como ficha.
function mariposa() {
  const [c, x] = mk(36, 28);
  const r = rng(171);
  const arriba = [[19, 12], [29, 3], [33, 7], [32, 13], [28, 16], [19, 15]];
  const doblez = [[19, 13.5], [32.5, 9], [32, 13], [28, 16], [19, 15]]; // la mitad baja del ala de arriba, doblada: un paso abajo de valor
  const abajo = [[19, 15], [28, 16], [29, 21], [25, 25], [21, 23], [19, 18]];
  const espejo = (pts) => pts.map(([a, b]) => [36 - a, b]).reverse();
  // P31: lo oscuro sale de kraft con ámbar antes de la tinta (canto S 41 %, ala S 45 %, tono 35°); kraft con tinta sola daba gris
  const tibio = mix(PAL.kraft, PAL.warm, 0.3);
  const canto = mix(tibio, PAL.ink, 0.45);
  cara(x, orilla(espejo(abajo), r, 0.7), mix(tibio, PAL.ink, 0.22), { grueso: 1.6, canto });
  cara(x, orilla(espejo(arriba), r, 0.7), mix(PAL.paper, PAL.kraft, 0.5), { grueso: 1.6, canto });
  cara(x, espejo(doblez), mix(PAL.kraft, PAL.ink, 0.08), { grueso: 0, filo: 0 });
  cara(x, orilla(abajo, r, 0.7), mix(PAL.kraft, PAL.ink, 0.06), { grueso: 1.6, canto });
  cara(x, orilla(arriba, r, 0.7), PAL.paper, { grueso: 1.6, canto });
  cara(x, doblez, mix(PAL.paper, PAL.kraft, 0.7), { grueso: 0, filo: 0 });
  x.fillStyle = PAL.ink;
  x.fillRect(17, 8, 2, 14);
  pliegue(x, [18, 8], [15, 4], 0.7);
  pliegue(x, [18, 8], [21, 4], 0.7);
  return acabar(c, x, { alpha: 0.22, blur: 2, dx: -1.5, dy: 1.5 });
}

// Medio ancho de la lona a la altura t (0 arriba, 1 en la boca): gota que cierra hacia la canasta
const lona = (t) => Math.max(5, 31 * Math.sin(Math.PI * Math.pow(t, 0.72)) ** 0.8);

// Globo de gajos de papel: cada gajo es una cara plana, y la luz va de la sombra a la izquierda al crema a la derecha
function globo() {
  const [c, x] = mk(80, 110);
  const r = rng(161);
  const cx = 41;
  const [top, boca] = [4, 72];
  const borde = (u) => Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    return [cx + u * lona(t), top + (boca - top) * t];
  });
  const gajos = [mix(PAL.kraft, PAL.ink, 0.18), mix(PAL.paper, PAL.kraft, 0.72), PAL.kraft, mix(PAL.paper, PAL.kraft, 0.3), mix(PAL.kraft, PAL.paper, 0.5), PAL.paper];
  // hilos primero: quedan detrás de la boca
  x.strokeStyle = rgba(PAL.ink, 0.5);
  x.lineWidth = 1.2;
  x.beginPath();
  x.moveTo(cx - 6, boca + 2);
  x.lineTo(cx - 5, 92);
  x.moveTo(cx + 6, boca + 2);
  x.lineTo(cx + 5, 92);
  x.stroke();
  const silueta = orilla([...borde(-1).reverse(), ...borde(1)], r, 0.6);
  x.fillStyle = TONE.kraftDark;
  trazar(x, silueta, -1.8, 1.8);
  x.fill();
  x.save();
  trazar(x, silueta);
  x.clip();
  gajos.forEach((color, i) => {
    const [u0, u1] = [-1 + (i * 2) / gajos.length, -1 + ((i + 1) * 2) / gajos.length];
    const pts = [...borde(u0), ...borde(u1).reverse()];
    // cada gajo monta sobre el de su izquierda: su grueso le cae encima como canto duro, sin trazo de línea
    if (i) {
      x.fillStyle = rgba(PAL.ink, 0.3);
      trazar(x, pts, -1.6, 0);
      x.fill();
    }
    x.fillStyle = mix(color, LUZ, 0.6);
    trazar(x, pts);
    x.fill();
    x.fillStyle = color;
    trazar(x, pts, 1, 0);
    x.fill();
  });
  x.restore();
  cara(x, orilla([[cx - 6, boca - 2], [cx + 6, boca - 2], [cx + 5, boca + 3], [cx - 5, boca + 3]], r, 0.4), TONE.kraftDark, { grueso: 0, filo: 0 });
  const canasta = [[cx - 8, 92], [cx + 8, 92], [cx + 6, 104], [cx - 6, 104]];
  cara(x, orilla(canasta, r, 0.6), PAL.kraft, { grueso: 1.5 });
  pliegue(x, [cx - 7, 96], [cx + 7, 96]);
  pliegue(x, [cx - 7, 100], [cx + 6, 100]);
  return acabar(c, x, { alpha: 0.28, blur: 1.5, dx: -3, dy: 3 });
}

export function montarKit(add) {
  add('ambButterfly', mariposa());
  add('ambBalloon', globo());
}
