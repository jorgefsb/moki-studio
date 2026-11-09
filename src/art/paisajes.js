// PAISAJE POR TRAMO (DECISIONES 7-nov 00:20, evidencia/tramos-espec.md idea 2) y LA SUMA B (DECISIONES 8-nov 23:33): cada página de cada nivel
// del Cuaderno tapa el fondo con su paisaje de papel (Ciudad de cartón, Playa de papel, Noche y sus cielos de otra hora) según RUTA, en Reto,
// Clásico y Libre. El nivel 1 empieza en el atardecer y el nivel 2 en la Noche con estrellas de ambient.js. Solo dibuja, sin azar de juego ni física.
// Viaja en el chunk diferido del atardecer. Demo y Paseo no lo usan.
// Contraste (caja y torre, cuerpo #452B1C y canto #E9D2AE contra el fondo >= 2.0): hasta h 130 del mundo sobre el suelo, cada capa cae entre L 0.111 y L 0.305.
// Por eso la noche se lee por el tono y por arriba del cielo, no por oscurecer la banda (la nave A falló por ahí: 1.88).
import { mix, rgba, rng } from './palette.js';
import { mk } from './textures.js';
import { conFibra, hornear } from './cantoPapel.js';
import { sueloEn } from './capas.js';
import { leerCuaderno, nivelDe } from '../cuaderno.js';

export const PAISAJE = { on: true, fundidoMs: 2500 }; // on: false y Libre vuelve al fondo de un solo dibujo

const W = 1024;
const H = 256; // potencia de 2: el mosaico repite en vertical y el filtro mezcla la fila de abajo con la de arriba
const BASE = 104; // fila de la textura hasta donde la silueta ya es sólida: h 130 del mundo con el pie de la capa media
const CAPAS = { lejos: { depth: 0, ancho: 929, alto: 256, par: 0.3, pie: 15 }, medio: { depth: 0.001, ancho: 1100, alto: 256, par: 0.6, pie: 22 } };
// SUELO PROPIO (caso-004): la capa_suelo es 2048 x 512; aquí la mitad, con la misma geometría de filas: canto en la 12 y franja donde pisa Moki de 18 filas
const SUELO = { depth: 4.621, k: 2, y: 12, franja: 18 };

// Dibuja n veces con repetición del mosaico: lo que cruza la costura sale del otro lado
const costura = (x, fn) => [-W, 0, W].forEach((o) => {
  x.save();
  x.translate(o, 0);
  fn(x);
  x.restore();
});
const silueta = (fn) => {
  const [c, x] = mk(W, H);
  x.fillStyle = '#000';
  costura(x, fn);
  return c;
};
const encima = (c, fn) => {
  const x = c.getContext('2d');
  costura(x, fn);
  return c;
};
const papel = (src, color, seed, px = 3) => hornear(src, { color, labio: mix(color, '#F4E8D5', 0.45), px, seed, sinPie: true, fibraK: 1, rasgado: 2 });
// Sombra de contacto de una capa sobre la de atrás, cruzando la costura del mosaico. Solo cae en lo transparente, arriba de BASE: abajo de h 130 no cambia nada
const conSombraMosaico = (c, alpha, blur, dx, dy) => {
  const [t, x] = mk(W, H);
  x.shadowColor = rgba('#22211F', alpha);
  x.shadowBlur = blur;
  x.shadowOffsetX = dx;
  x.shadowOffsetY = dy;
  costura(x, (y) => y.drawImage(c, 0, 0));
  x.shadowColor = 'transparent';
  x.drawImage(c, 0, 0);
  x.clearRect(0, H - 2, W, 2); // como sinPie: el mosaico repite en vertical
  return t;
};

const CW = 480; // ancho del cielo: múltiplo de la fibra (240), así el mosaico no marca costura
function cielo(stops, extra) {
  const [c, x] = mk(CW, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  stops.forEach(([k, col]) => g.addColorStop(k, col));
  x.fillStyle = g;
  x.fillRect(0, 0, CW, H);
  conFibra(x, CW, H, 0.4);
  if (extra) extra(x);
  x.fillStyle = stops[0][1];
  x.fillRect(0, H - 2, CW, 2);
  return c;
}

// El suelo de un lugar: franja que pisa Moki, corte oscuro abajo de ella y cuerpo en degradado. Franja y cuerpo cercano caen entre L 0.111 y L 0.305: la caja que sale del suelo se lee contra ellos
// (con franjas más claras su borde bajó a 1.36).
function suelo({ franja, corte, paradas, seed, detalle }) {
  const c = papel(silueta((x) => x.fillRect(0, SUELO.y, W, H)), franja, seed);
  const x = c.getContext('2d');
  const y0 = SUELO.y + SUELO.franja;
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = corte;
  x.fillRect(0, y0, W, 4);
  const g = x.createLinearGradient(0, y0 + 4, 0, H);
  paradas.forEach(([k, col]) => g.addColorStop(k, col));
  x.fillStyle = g;
  x.fillRect(0, y0 + 4, W, H);
  costura(x, detalle);
  conFibra(x, W, H, 0.5);
  x.globalCompositeOperation = 'source-over';
  return c;
}
const motas = (x, seed, n, cols, tam = 2) => {
  const q = rng(seed);
  for (let i = 0; i < n; i++) {
    x.fillStyle = cols[i % cols.length];
    x.fillRect(q() * W, SUELO.y + SUELO.franja + 8 + q() * (H - 42), 1 + q() * tam, 1 + q() * tam);
  }
};

const TRAMOS = [
  null,
  // Ciudad de cartón: casitas de kraft al frente, edificios altos atrás, cielo de papel gris claro
  {
    // día claro: el beige no decía ninguna hora (caso-004, 3 de 3). Con más cuerpo y nubes de papel: el azul pálido Jorge lo leyó viejo (caso-005)
    // El sol ya no va en el mosaico (su halo se cortaba en el borde: costura junto al sol, LA SUMA B): es imagen aparte, como la luna
    astro: 'paisajeSol',
    cielo: (stops = [[0, '#7A8C9C'], [0.55, '#A9B8C0'], [1, '#DCDDD6']]) => cielo(stops, (x) => {
      [[70, 46, 1], [250, 84, 0.8], [392, 34, 0.65]].forEach(([u, y, k]) => {
        const nube = () => {
          x.save();
          x.beginPath();
          x.rect(0, 0, CW, y + 12 * k); // panza plana, como recorte pegado
          x.clip();
          x.beginPath();
          [[0, 0, 26], [24, -10, 22], [48, -2, 20], [-22, 4, 16], [68, 6, 14]].forEach(([dx, dy, r]) => {
            x.moveTo(u + dx * k + r * k * 1.3, y + dy * k);
            x.ellipse(u + dx * k, y + dy * k, r * k * 1.3, r * k, 0, 0, Math.PI * 2);
          });
          x.fill();
          x.restore();
        };
        x.save();
        x.translate(3, 3);
        x.fillStyle = rgba('#22211F', 0.14);
        nube();
        x.restore();
        x.fillStyle = '#F4E8D5';
        nube();
      });
    }),
    // Banqueta de losas con juntas, cordón y, más abajo, la calle con rayas. Franja y banqueta siguen entre L 0.111 y L 0.305
    suelo: () => suelo({
      franja: '#A09280',
      corte: '#5F584D',
      // La calle baja a casi tinta en el borde inferior: el primer plano es lo más oscuro (pasada B). Banqueta cercana sin cambio
      paradas: [[0, '#7D7163'], [0.38, '#76695B'], [0.4, '#5F584D'], [0.43, '#5B554C'], [0.7, '#3B3731'], [1, '#26241F']],
      seed: 212,
      detalle(x) {
        const q = rng(215);
        for (let u = 0; u < W; u += 32) {
          x.fillStyle = q() < 0.5 ? '#978976' : '#A69984'; // losas de dos tonos, un paso apenas
          x.fillRect(u + 2, SUELO.y + 4, 30, SUELO.franja - 6);
          x.fillStyle = '#857967';
          x.fillRect(u, SUELO.y + 4, 2, SUELO.franja - 4);
        }
        x.fillStyle = '#6A6155';
        for (let u = 40; u < W; u += 128) x.fillRect(u, SUELO.y + SUELO.franja + 4, 2, 84);
        x.fillStyle = '#A99C84'; // rayas de la calle, lejos de donde pisa la caja; un paso abajo para que no brillen sobre la calle oscura
        for (let u = 20; u < W; u += 128) x.fillRect(u, 196, 56, 5);
      },
    }),
    // Capa 2 (ARTE §7): canto de 2 px más oscuro bajo el borde, sombra de contacto tenue contra el cielo y ventanas de luz
    lejos() {
      const bloques = [];
      const q = rng(202);
      for (let u = 0; u < W; u += 62 + Math.floor(q() * 30)) bloques.push([u, 14 + q() * 66, 50 + q() * 26]);
      const c = silueta((x) => {
        x.fillRect(0, 90, W, H);
        bloques.forEach(([u, t, a]) => x.fillRect(u, t, a, H));
      });
      const p = encima(papel(c, '#B5A389', 203, 2), (x) => {
        x.globalCompositeOperation = 'source-atop'; // solo sobre el papel: el borde rasgado no deja asomar el canto
        // luz de arriba a la derecha: cara derecha más clara, izquierda en sombra
        bloques.forEach(([u, t, a]) => {
          x.fillStyle = '#CDBC9E';
          x.fillRect(u + a - 7, t, 7, H);
          x.fillStyle = '#9E8D74';
          x.fillRect(u, t, 6, H);
        });
        x.fillStyle = '#93826A';
        bloques.forEach(([u, t, a]) => x.fillRect(u + 1, t + 3, a - 2, 2));
        const r = rng(216);
        bloques.forEach(([u, t, a]) => {
          for (let y = t + 12; y < 84; y += 14) {
            for (let v = u + 7; v + 6 < u + a - 4; v += 12) {
              x.fillStyle = r() < 0.4 ? '#F4E8D5' : '#9C8A70';
              x.fillRect(v, y, 6, 8);
            }
          }
        });
      });
      return conSombraMosaico(p, 0.2, 6, -3, -2);
    },
    medio() {
      const fila = (fn) => {
        const q = rng(204);
        for (let u = 0; u < W; ) {
          const a = 96 + Math.floor(q() * 48);
          const t = 34 + Math.floor(q() * 46);
          const pico = q() < 0.55;
          fn(u, a, t, pico);
          u += a + 6;
        }
      };
      const c = silueta((x) => {
        x.fillRect(0, BASE, W, H);
        fila((u, a, t, pico) => {
          x.fillRect(u, t + (pico ? 22 : 0), a, H);
          if (!pico) return;
          x.beginPath();
          x.moveTo(u - 6, t + 24);
          x.lineTo(u + a / 2, t);
          x.lineTo(u + a + 6, t + 24);
          x.fill();
        });
      });
      const ventanas = (fn) => fila((u, a, t, pico) => {
        const y = t + (pico ? 34 : 14);
        const n = a > 120 ? 3 : 2;
        for (let i = 0; i < n; i++) fn(u + 14 + i * ((a - 18) / n), y, i);
      });
      const recorte = (x, y0, y1, fn) => {
        x.save();
        x.beginPath();
        x.rect(-W, y0, 3 * W, y1 - y0);
        x.clip();
        fn();
        x.restore();
      };
      const p = encima(papel(c, '#8F7558', 205), (x) => {
        // Luz de arriba a la derecha (pasada B): cara derecha un paso más clara, izquierda un paso más oscura. Las dos entre L 0.13 y L 0.25, también detrás de la caja
        x.globalCompositeOperation = 'source-atop';
        fila((u, a, t, pico) => {
          const y = t + (pico ? 22 : 0);
          x.fillStyle = '#A08263';
          x.fillRect(u + a - 12, y, 12, H);
          x.fillStyle = '#77614B';
          x.fillRect(u, y, 10, H);
        });
        x.globalCompositeOperation = 'source-over';
        // Abajo de BASE (h 130, donde va la caja) el tono de siempre: L sigue bajo 0.305
        recorte(x, BASE, H, () => {
          x.fillStyle = '#A58A6A';
          ventanas((v, y) => x.fillRect(v, y, 18, 22));
        });
        // Arriba de BASE no hay caja pero sí viga: ventanas con luz de papel, marco y repisa, unas prendidas y otras no. Nada baja de L 0.14 (con marco de tinta la viga bajó a 1.96)
        recorte(x, 0, BASE, () => {
          const r = rng(217);
          ventanas((v, y) => {
            x.fillStyle = '#7A6550';
            x.fillRect(v - 2, y - 2, 22, 26);
            x.fillStyle = r() < 0.6 ? '#F1DDB2' : '#8A735A';
            x.fillRect(v, y, 18, 22);
            x.fillStyle = '#7A6550';
            x.fillRect(v + 8, y, 2, 22);
            x.fillStyle = '#C9B08C';
            x.fillRect(v - 3, y + 22, 24, 3);
          });
        });
      });
      return conSombraMosaico(p, 0.24, 10, -4, -3); // capa 3: sombra de 8 a 12 de desenfoque sobre la lejos
    },
  },
  // Playa de papel: mar de cartulina azul con olas recortadas, veleros en el horizonte y palmeras
  {
    cielo: (stops = [[0, '#A9DCE3'], [0.7, '#D8EEE4'], [1, '#FBEFCB']]) => cielo(stops),
    // Arena: oscura junto a la franja por el contraste, y se aclara hacia el frente, donde ya no hay obstáculo
    suelo: () => suelo({
      franja: '#B29162',
      corte: '#7D5F3A',
      paradas: [[0, '#A07C4E'], [0.18, '#A8854F'], [1, '#DCC08C']],
      seed: 213,
      detalle(x) {
        motas(x, 214, 520, ['#94744A', '#E6D0A0'], 2);
        x.strokeStyle = '#A5854F';
        x.lineWidth = 2;
        [120, 168, 214].forEach((y, f) => {
          for (let u = f * 70; u < W; u += 210) {
            x.beginPath();
            x.moveTo(u, y);
            x.quadraticCurveTo(u + 45, y - 7, u + 90, y);
            x.stroke();
          }
        });
      },
    }),
    lejos() {
      const c = silueta((x) => x.fillRect(0, 72, W, H));
      return encima(papel(c, '#86BBCF', 206), (x) => {
        [90, 410, 760].forEach((u, i) => {
          x.fillStyle = '#6B4630';
          x.fillRect(u - 16, 64, 34, 8);
          x.fillStyle = '#F4E8D5';
          x.beginPath();
          x.moveTo(u, 62);
          x.lineTo(u, 26 + i * 4);
          x.lineTo(u + 22, 62);
          x.fill();
        });
      });
    },
    medio() {
      const c = silueta((x) => {
        x.beginPath();
        x.moveTo(0, H);
        for (let u = 0; u <= W; u += 8) x.lineTo(u, BASE - 6 + 7 * Math.abs(Math.sin((u / W) * Math.PI * 16)));
        x.lineTo(W, H);
        x.fill();
      });
      return encima(papel(c, '#5496B8', 207), (x) => {
        x.strokeStyle = '#5B98B6'; // un paso sobre el mar: arriba de una caja, una ola más clara bajaba el borde a 1.82
        x.lineWidth = 3;
        [132, 170].forEach((y, f) => {
          for (let u = (f * 40) % 80; u < W; u += 80) {
            x.beginPath();
            x.arc(u, y, 22, Math.PI * 1.15, Math.PI * 1.85);
            x.stroke();
          }
        });
        // palmeras: tronco hasta detrás del suelo (a media agua flotaba y se leía como peligro), verde azul un paso bajo el mar, L sobre 0.111
        x.fillStyle = '#3F8191';
        [230, 690].forEach((u) => {
          x.beginPath();
          x.moveTo(u - 8, H);
          x.quadraticCurveTo(u - 8, 80, u + 8, 30);
          x.lineTo(u + 14, 32);
          x.quadraticCurveTo(u + 2, 90, u + 8, H);
          x.fill();
          [-2.7, -2.1, -1.2, -0.5, 0.1].forEach((a) => {
            x.save();
            x.translate(u + 11, 30);
            x.rotate(a);
            x.beginPath();
            x.moveTo(0, 0);
            x.quadraticCurveTo(26, -14, 52, 6);
            x.quadraticCurveTo(26, 2, 0, 5);
            x.fill();
            x.restore();
          });
        });
      });
    },
  },
  // Noche: arriba tinta azul, abajo azul claro para que el obstáculo se separe. Luna y estrellas de papel, cerros y pinos azules.
  {
    // Suelo de noche: la franja la alumbra la luna, abajo se va a tinta
    suelo: () => suelo({
      franja: '#A4AFD8',
      corte: '#39416F',
      paradas: [[0, '#525E94'], [0.2, '#525E94'], [1, '#2C3464']],
      seed: 215,
      detalle: (x) => motas(x, 216, 260, ['#4A5588', '#6A76AE'], 2),
    }),
    astro: 'paisajeLuna',
    cielo: (stops = [[0, '#202838'], [0.35, '#34404F'], [0.52, '#6A7A8F'], [1, '#8494A8']]) => cielo(stops, (x) => {
      const q = rng(208);
      x.fillStyle = '#F4E8D5';
      for (let i = 0; i < 26; i++) {
        const u = q() * 480;
        const v = q() * H * 0.42;
        const e = 1.1 + q() * 1.5;
        x.beginPath();
        for (let k = 0; k < 8; k++) {
          const rr = k % 2 ? e * 0.4 : e;
          x.lineTo(u + Math.cos((k * Math.PI) / 4) * rr, v + Math.sin((k * Math.PI) / 4) * rr);
        }
        x.fill();
      }
    }),
    lejos() {
      const c = silueta((x) => {
        x.beginPath();
        x.moveTo(0, H);
        for (let u = 0; u <= W; u += 8) x.lineTo(u, 70 + 26 * Math.sin((u / W) * Math.PI * 6) + 10 * Math.sin((u / W) * Math.PI * 14));
        x.lineTo(W, H);
        x.fill();
      });
      return papel(c, '#7282BA', 209);
    },
    medio() {
      const c = silueta((x) => {
        const q = rng(210);
        x.fillRect(0, BASE, W, H);
        for (let u = 0; u < W; u += 48 + Math.floor(q() * 40)) {
          const t = 34 + q() * 44;
          x.beginPath();
          x.moveTo(u - 26, BASE + 2);
          x.lineTo(u, t);
          x.lineTo(u + 26, BASE + 2);
          x.fill();
        }
      });
      return papel(c, '#5F6FA8', 211);
    },
  },
];

function luna() {
  const [c, x] = mk(92, 92);
  x.fillStyle = '#F4E8D5';
  x.beginPath();
  x.arc(46, 46, 42, 0, Math.PI * 2);
  x.fill();
  conFibra(x, 92, 92, 0.6);
  x.fillStyle = '#DCCFB8';
  [[32, 34, 8], [58, 52, 11], [38, 64, 5]].forEach(([u, v, e]) => {
    x.beginPath();
    x.arc(u, v, e, 0, Math.PI * 2);
    x.fill();
  });
  return c;
}

// Sol de papel de la Ciudad, arriba a la derecha, de donde viene la luz de los edificios (pasada B): halo tenue de papel, nada de brillo.
// Mismo dibujo que vivía en el cielo (radio 17, halo 90), en px de la textura del cielo: se escala igual que él.
function sol() {
  const [c, x] = mk(184, 184);
  const halo = x.createRadialGradient(92, 92, 14, 92, 92, 90);
  halo.addColorStop(0, rgba('#FBF1DC', 0.5));
  halo.addColorStop(1, rgba('#FBF1DC', 0));
  x.fillStyle = halo;
  x.fillRect(0, 0, 184, 184);
  x.fillStyle = '#FBF1DC';
  x.beginPath();
  x.arc(92, 92, 17, 0, Math.PI * 2);
  x.fill();
  return c;
}
const ASTROS = { paisajeLuna: luna, paisajeSol: sol };

// LA SUMA B: lugares = silueta de TRAMOS más su cielo. Las variantes solo cambian el cielo (copiar-combinar-transformar: misma silueta,
// otra hora); cero dibujo nuevo. [tramo, paradas del cielo (null = el de siempre), astro (si falta, el del tramo)]. Ningún cielo es beige
// ni lleva el naranja de acción.
const LUGARES = {
  c: [1, null],
  p: [2, null],
  n: [3, null],
  cA: [1, [[0, '#8A99AC'], [0.55, '#E7B29A'], [1, '#F4C9A2']]], // Ciudad al alba: azul que baja a durazno (sin lila: ARTE §13.4)
  pA: [2, [[0, '#7FB3D6'], [0.6, '#F2C987'], [1, '#F5A97A']]], // Playa en tarde dorada
  nA: [3, [[0, '#161B27'], [0.35, '#262F40'], [0.55, '#56647A'], [1, '#707F94']]], // Noche de cielo más profundo, azul tinta (pasada de color: la pervinca se iba a morado)
  cB: [1, [[0, '#8C95A3'], [0.6, '#B3B6B4'], [1, '#CFCBC1']], null], // Ciudad nublada, gris frío: sin sol
  pB: [2, [[0, '#5E7A8E'], [0.6, '#9DB5BA'], [1, '#D5DCCB']]], // Playa con tormenta lejana
  nB: [3, [[0, '#1A1D2B'], [0.35, '#2B3247'], [0.55, '#5A6582'], [1, '#7884A0']]], // Noche pizarra (la violeta del mapa cae en morado: ARTE §13.4)
};
// Mapa de arte por nivel del Cuaderno (evidencia/lo-nuevo/MAPA-ARTE-B.md, ajustes del director 8-nov 23:33): una fila por nivel, página 1 a 4.
// 0 = el atardecer del nivel 1 (atardecer.js). 'N' = la Noche con estrellas de papel de ambient.js (606d297), intacta: el ciclo no la pisa.
// Reto, Clásico y Libre usan la fila del nivel del jugador; Libre después de la página 4 se queda en la 4.
export const RUTA = [
  [0, 'c', 'p', 'n'],
  ['N', 'c', 'p', 'N'],
  ['c', 'p', 'n', 'c'],
  ['p', 'n', 'c', 'p'],
  ['nA', 'cA', 'pA', 'nA'],
  ['cA', 'pA', 'nA', 'cA'],
  ['pA', 'nA', 'cA', 'pA'],
  ['nB', 'cB', 'pB', 'nB'],
  ['cB', 'pB', 'nB', 'cB'],
  ['pB', 'nB', 'cB', 'pB'],
];
const esLugar = (L) => typeof L === 'string' && L !== 'N';

// pintadas: el fondo pintado del nivel 1 (capas.js), null en los demás; gy: y del suelo en el mundo. Corre después de colocar y de bokeh,
// en el mismo postupdate.
export function montarPaisajes(s, pintadas, gy) {
  if (!PAISAJE.on) return;
  const amb = s.ambient;
  const enReposo = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
  const add = (k, fn) => s.textures.exists(k) || s.textures.addCanvas(k, fn());
  // Lo que pide un lugar, en orden de pila: [llave, horno]. Las siluetas se comparten entre variantes
  const piezas = (key) => {
    const [b, paradas, ...resto] = LUGARES[key];
    const T = TRAMOS[b];
    const astro = resto.length ? resto[0] : T.astro;
    const r = [[paradas ? `paisaje_${key}_cielo` : `paisaje${b}_cielo`, () => T.cielo(paradas || undefined)]];
    ['lejos', 'medio', 'suelo'].forEach((n) => r.push([`paisaje${b}_${n}`, T[n]]));
    if (astro) r.push([astro, ASTROS[astro]]);
    return r;
  };
  let nivel = nivelDe(leerCuaderno()).nivel;
  let todoListo = false; // ya está horneado todo lo que pide el nivel: la cola no busca más
  s.paisajeListo = () => todoListo; // solo lectura, para medir FPS ya sin horneadas
  const lugarDe = (i) => RUTA[Math.max(1, Math.min(RUTA.length, nivel)) - 1][Math.min(3, Math.max(0, i))];
  const enJuego = () => !s.demo && s.screen !== 'demo' && !s.paseoRun && !!s.level;
  s.paisajeCostos = []; // ms de cada horneada, solo lectura, para medir
  const medir = (fn) => {
    const t0 = performance.now();
    fn();
    s.paisajeCostos.push(Math.round(performance.now() - t0));
  };
  // ?ir= y el arranque de cada partida: la página donde nace se hornea de golpe (la partida nace dentro de su paisaje, nunca en beige)
  s.hornearPaisaje = (i) => {
    const L = lugarDe(i);
    if (!esLugar(L) || piezas(L).every(([k]) => s.textures.exists(k))) return;
    medir(() => piezas(L).forEach(([k, fn]) => add(k, fn)));
  };
  // Lo demás del nivel: de una pieza en una, en los ratos libres (también en el título) y con aire entre una y otra
  let horneando = false;
  // Una horneada cuesta 60 a 180 ms (sonda LA SUMA B): en partida solo en un respiro, con el siguiente obstáculo a 2 s o más (como el fondo vivo)
  const respiro = () => {
    if (!enJuego()) return true;
    const next = s.obstacles.find((o) => o.x > s.px - 50);
    return !next || (next.x - s.px) / Math.max(s.speed, 1) >= 2;
  };
  const hornea = () => {
    if (horneando || todoListo || !respiro()) return;
    let falta = null;
    for (let i = 0; i < 4 && !falta; i++) {
      const L = lugarDe(i);
      if (esLugar(L)) falta = piezas(L).find(([k]) => !s.textures.exists(k));
    }
    if (!falta) return void (todoListo = true);
    horneando = true;
    enReposo(() => {
      if (respiro()) medir(() => add(falta[0], falta[1])); // el respiro pudo acabarse mientras esperaba
      setTimeout(() => (horneando = false), 300);
    }, { timeout: 800 });
  };

  // Una pila por lugar. La que entra con fundido va encima de la que se va (nivel 1 de profundidad), arriba de la capa media pintada (3.06)
  // y abajo de todo lo demás: lo que queda detrás no se ve
  const pilas = {};
  const profundidad = (P, n) => {
    const d = 3.07 + n * 0.003;
    P.cielo.setDepth(d);
    if (P.astro) P.astro.setDepth(d + 0.0002);
    P.lejos.setDepth(d + 0.0005);
    P.medio.setDepth(d + 0.001);
    P.suelo.setDepth(SUELO.depth + n * 0.001); // arriba de capa_suelo (4.62) y debajo de lo que corre sobre él
  };
  const lista = (key) => {
    if (pilas[key]) return true;
    const pz = piezas(key);
    if (!pz.every(([k]) => s.textures.exists(k))) return false;
    const capa = (k) => s.add.tileSprite(0, 0, 10, 10, k).setOrigin(0, 0).setVisible(false);
    const [cielo, lejos, medio, suelo, astro] = pz.map(([k]) => k);
    const P = { cielo: capa(cielo), lejos: capa(lejos), medio: capa(medio), suelo: capa(suelo) };
    if (astro) P.astro = s.add.image(0, 0, astro).setVisible(false);
    profundidad(P, 0);
    pilas[key] = P;
    return true;
  };
  // x0: borde izquierdo de lo visible; el mosaico se corre lo mismo para quedarse quieto en pantalla
  const pon = (L, x0, y, w, h, kx, ky, tile) => {
    L.setPosition(x0, y).setSize(w, h).setTileScale(kx, ky);
    L.tilePositionX = (tile + x0) / kx;
  };
  // Se ve de x0 a x1 (px de pantalla), opaco. El cruce de lugar es un cambio de escena de papel que entra por la derecha, no un fundido:
  // con alfa, el cielo claro que entraba lavaba los edificios y veleros del que se iba (doble exposición, ARTE pasada de color de LA SUMA B)
  const colocar = (P, g, x0, x1) => {
    if (x1 - x0 <= 0) return void Object.values(P).forEach((v) => v.visible && v.setVisible(false));
    const w = x1 - x0;
    const ms = s.midS || 1;
    const quieto = s.reduced;
    const hC = g + 12 - s.top;
    pon(P.cielo, x0, s.top, w, hC, hC / H, hC / H, 0);
    [['lejos', s.far.y - s.base.far], ['medio', s.mid.y - s.base.mid]].forEach(([n, baja]) => {
      const K = CAPAS[n];
      const alto = K.alto * ms;
      pon(P[n], x0, g + K.pie - alto + baja, w, alto, (K.ancho * ms) / W, alto / H, quieto ? 0 : s.dist * K.par);
    });
    // Mismo lugar y corrimiento que el suelo pintado del nivel 1 (capas.js), esté o no cargado
    const S = sueloEn(s, g);
    pon(P.suelo, x0, S.y, w, S.h, S.kx * SUELO.k, S.ky * SUELO.k, s.dist);
    Object.values(P).forEach((v) => v.setVisible(true).setAlpha(1));
    if (P.astro) {
      if (P.astro.texture.key === 'paisajeSol') P.astro.setPosition(s.vw * 0.76, s.top + (hC * 40) / H).setScale(hC / H);
      else P.astro.setPosition(s.vw * 0.74, s.top + hC * 0.2).setScale(ms);
      P.astro.setVisible(P.astro.x >= x0 && P.astro.x <= x1); // el astro pasa entero con su hoja
    }
  };

  // Fuera del nivel 1 no hay fondo pintado que esconder: lo tapado es el fondo de siempre. Se guarda cómo estaba para regresarlo.
  let tapado = null;
  const tapar = () => {
    if (!tapado) {
      tapado = [s.sky, s.skyGrad, s.skyBand, s.clouds, s.topFade, s.sun, s.ridge, s.ridgeSkirt, s.far, s.farVeil, s.mid, s.midVeil, s.surface, s.canto, s.front, s.shade, amb.lamp, amb.bands, ...s.folds]
        .filter(Boolean)
        .map((v) => [v, v.visible]);
    }
    tapado.forEach(([v]) => v.setVisible(false));
    if (s.midPool) s.midPool.forEach((q) => (q.body.setVisible(false), q.veil.setVisible(false))); // stepMidProps los prende cada cuadro
  };
  const destapar = () => {
    if (!tapado) return;
    tapado.forEach(([v, a]) => v.setVisible(a));
    tapado = null;
  };

  let cur = null; // lugar que se ve (o entra)
  let prev = null; // lugar que se va mientras dura el fundido
  let k = 1;
  let antes = null;
  let encendido = false;
  let horaPendiente = null; // hora de ambient que espera a que el paisaje tape todo
  const apagar = () => {
    horaPendiente = null;
    Object.values(pilas).forEach((P) => Object.values(P).forEach((v) => v.setVisible(false)));
    if (amb.conPaisaje) {
      amb.conPaisaje = false;
      amb.applyDay(0);
    }
    cur = prev = null;
    k = 1;
    s.paisaje = null;
    destapar();
  };
  const paso = (_t, delta) => {
    if (!s.paseoRun) hornea();
    if (!enJuego()) {
      if (encendido) apagar();
      encendido = false;
      antes = null;
      return;
    }
    encendido = true;
    const L = lugarDe(s.tramoIdx);
    const quiere = esLugar(L) ? L : null;
    // reaparecer, volver a una página o arrancar ya en ella (?ir=ciudad, primer cuadro de la partida): sin fundido
    const brinco = antes === null || Math.abs(s.dist - antes) > 400;
    antes = s.dist;
    if (quiere !== cur && (quiere === null || lista(quiere))) {
      prev = brinco || s.reduced ? null : cur;
      cur = quiere;
      k = brinco || s.reduced ? 1 : 0;
      if (cur) profundidad(pilas[cur], 1);
      if (prev) profundidad(pilas[prev], 0);
    } else if (brinco) {
      k = 1;
      prev = null;
    }
    k = Math.min(1, k + delta / PAISAJE.fundidoMs);
    if (k >= 1) prev = null;
    s.paisaje = { cur: cur ? LUGARES[cur][0] : 0, lugar: cur, k }; // solo lectura, para medir
    // Obstáculos y fichas de la tarde (cuerpo #452B1C, canto claro): con ellos se midió el contraste de cada capa. Se cambian a media entrada
    const conP = !!cur && (k >= 0.5 || !!prev);
    if (conP !== !!amb.conPaisaje) {
      amb.conPaisaje = conP;
      amb.applyDay(0);
    }
    const g = gy();
    const borde = s.vw * (1 - k); // la hoja nueva entra por la derecha; la que se va queda entera debajo (o, sin nueva, se recoge)
    Object.entries(pilas).forEach(([key, P]) => colocar(P, g, key === cur ? borde : 0, key === cur ? s.vw : key === prev ? (cur ? s.vw : borde) : 0));
    const cubre = (cur && k >= 1) || (cur && prev);
    if (horaPendiente !== null && cur && k >= 1) {
      sdP.call(amb, horaPendiente, true);
      horaPendiente = null;
    }
    if (cubre && pintadas && amb.n1) {
      [pintadas.cielo, pintadas.sol, pintadas.lejos, pintadas.medio, pintadas.suelo].forEach((v) => v.setVisible(false)); // lo tapado no se dibuja
    } else if (cubre) tapar();
    else destapar();
    if (cur && s.bokeh) s.bokeh.forEach((q) => q.im.setAlpha(q.im.alpha * (1 - (prev || k >= 1 ? 1 : k)))); // círculos de luz de la tarde: en otro lugar no van
  };
  s.events.on('postupdate', paso);
  s.events.once('shutdown', () => s.events.off('postupdate', paso));

  // La hora del día sigue al lugar: con paisaje propio, mañana (obstáculos de día, sin faroles ni estrellas de ambient debajo); en la Noche
  // con estrellas, la noche. Entrar a esa noche desde un paisaje es de golpe abajo: el paisaje se va con su fundido y no asoma el beige.
  // Solo las llamadas del juego (la página actual); los medidores siguen poniendo cualquier hora. El nivel 1 conserva su hora fija.
  const sdP = amb.setDay;
  amb.setDay = function (i, instant) {
    if (s.demo || s.paseoRun || amb.n1 || i !== s.tramoIdx) return sdP.call(this, i, instant);
    const L = lugarDe(i);
    horaPendiente = null;
    if (L === 'N') return sdP.call(this, 3, instant || esLugar(lugarDe(i - 1)));
    // De la Noche con estrellas a un paisaje: la noche se queda debajo mientras el paisaje entra (si no, la mañana beige asomaba en el fundido)
    // y cambia de golpe cuando ya lo tapa todo
    if (esLugar(L) && !instant && lugarDe(i - 1) === 'N') return void (horaPendiente = 0);
    return sdP.call(this, esLugar(L) ? 0 : i, instant);
  };
  // El nivel se lee al empezar, como amb.n1: caer y reintentar sigue en la misma fila del mapa
  const rr = s.resetRun;
  s.resetRun = function (...a) {
    if (this.demo || !this.partidaEmpezada) {
      const n = nivelDe(leerCuaderno()).nivel;
      if (n !== nivel) todoListo = false;
      nivel = n;
    }
    const r = rr.apply(this, a);
    if (!this.demo && !this.paseoRun) s.hornearPaisaje(this.tramoIdx);
    return r;
  };
}
