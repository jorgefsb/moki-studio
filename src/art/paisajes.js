// PAISAJE POR TRAMO (DECISIONES 7-nov 00:20, evidencia/tramos-espec.md idea 2): en Libre, nivel 1, las páginas 2 a 4 tapan el fondo pintado con su propio
// paisaje de papel: Ciudad de cartón, Playa de papel y Noche. La página 1 es el atardecer de siempre. Solo dibuja, sin azar de juego ni física.
// Viaja en el chunk diferido del atardecer. Reto, Clásico y demás niveles no crean ni un objeto.
// Contraste (caja y torre, cuerpo #452B1C y canto #E9D2AE contra el fondo >= 2.0): hasta h 130 del mundo sobre el suelo, cada capa cae entre L 0.111 y L 0.305.
// Por eso la noche se lee por el tono y por arriba del cielo, no por oscurecer la banda (la nave A falló por ahí: 1.88).
import { mix, rgba, rng } from './palette.js';
import { mk } from './textures.js';
import { conFibra, hornear } from './cantoPapel.js';

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

function cielo(stops, extra) {
  const [c, x] = mk(480, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  stops.forEach(([k, col]) => g.addColorStop(k, col));
  x.fillStyle = g;
  x.fillRect(0, 0, 480, H);
  conFibra(x, 480, H, 0.4);
  if (extra) extra(x);
  x.fillStyle = stops[0][1];
  x.fillRect(0, H - 2, 480, 2);
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
    cielo: () => cielo([[0, '#4F8CC4'], [0.55, '#86B7DC'], [1, '#D6E2DD']], (x) => {
      // Sol de papel arriba a la derecha, de donde viene la luz de los edificios (pasada B): halo tenue de papel, nada de brillo
      const halo = x.createRadialGradient(420, 40, 14, 420, 40, 90);
      halo.addColorStop(0, rgba('#FBF1DC', 0.5));
      halo.addColorStop(1, rgba('#FBF1DC', 0));
      x.fillStyle = halo;
      x.fillRect(320, 0, 160, 140);
      x.fillStyle = '#FBF1DC';
      x.beginPath();
      x.arc(420, 40, 17, 0, Math.PI * 2);
      x.fill();
      [[70, 46, 1], [250, 84, 0.8], [392, 34, 0.65]].forEach(([u, y, k]) => {
        const nube = () => {
          x.save();
          x.beginPath();
          x.rect(0, 0, 480, y + 12 * k); // panza plana, como recorte pegado
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
    cielo: () => cielo([[0, '#A9DCE3'], [0.7, '#D8EEE4'], [1, '#FBEFCB']]),
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
    astro: true,
    cielo: () => cielo([[0, '#1E2650'], [0.35, '#2F3B72'], [0.52, '#6676B2'], [1, '#7E8EC6']], (x) => {
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

// pintadas: el fondo pintado del nivel 1 (capas.js); gy: y del suelo en el mundo. Corre después de colocar y de bokeh, en el mismo postupdate.
export function montarPaisajes(s, pintadas, gy) {
  if (!PAISAJE.on || !pintadas) return;
  const amb = s.ambient;
  const enReposo = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
  const llave = (i, n) => `paisaje${i}_${n}`;
  const add = (k, fn) => s.textures.exists(k) || s.textures.addCanvas(k, fn());
  // De uno en uno, en los ratos libres y con aire entre uno y otro: el primero de cada tramo no debe caer en una decisión
  const NOMBRES = ['cielo', 'lejos', 'medio', 'suelo'];
  const cola = [];
  [1, 2, 3].forEach((i) => NOMBRES.forEach((n) => cola.push(() => add(llave(i, n), TRAMOS[i][n]))));
  cola.push(() => add('paisajeLuna', luna));
  s.paisajeCostos = []; // ms de cada horneada, solo lectura, para medir
  let horneando = false;
  const hornea = () => {
    if (horneando || !cola.length) return;
    horneando = true;
    enReposo(() => {
      const t0 = performance.now();
      cola.shift()();
      s.paisajeCostos.push(Math.round(performance.now() - t0));
      setTimeout(() => (horneando = false), 300);
    }, { timeout: 800 });
  };
  const pilas = [null, null, null, null];
  const lista = (i) => {
    if (pilas[i]) return true;
    if (!NOMBRES.every((n) => s.textures.exists(llave(i, n)))) return false;
    if (TRAMOS[i].astro && !s.textures.exists('paisajeLuna')) return false;
    const d = 3.07 + (i - 1) * 0.003; // arriba de la capa media pintada (3.06) y abajo de todo lo demás: lo que queda detrás no se ve
    const capa = (n, dd) => s.add.tileSprite(0, 0, 10, 10, llave(i, n)).setOrigin(0, 0).setDepth(d + dd).setVisible(false);
    // suelo: arriba de capa_suelo (4.62) y debajo de lo que corre sobre él. Lo demás de la pila queda en 3.07: detrás de todo el suelo
    pilas[i] = { cielo: capa('cielo', 0), lejos: capa('lejos', 0.0005), medio: capa('medio', 0.001), suelo: capa('suelo', SUELO.depth + (i - 1) * 0.001 - d) };
    if (TRAMOS[i].astro) pilas[i].astro = s.add.image(0, 0, 'paisajeLuna').setDepth(d + 0.0002).setVisible(false);
    return true;
  };
  const pon = (L, y, w, h, kx, ky, tile) => {
    L.setPosition(0, y).setSize(w, h).setTileScale(kx, ky);
    L.tilePositionX = tile / kx;
  };
  const colocar = (P, g, a) => {
    const ms = s.midS || 1;
    const quieto = s.reduced;
    const hC = g + 12 - s.top;
    pon(P.cielo, s.top, s.vw, hC, hC / H, hC / H, 0);
    [['lejos', s.far.y - s.base.far], ['medio', s.mid.y - s.base.mid]].forEach(([n, baja]) => {
      const K = CAPAS[n];
      const alto = K.alto * ms;
      pon(P[n], g + K.pie - alto + baja, s.vw, alto, (K.ancho * ms) / W, alto / H, quieto ? 0 : s.dist * K.par);
    });
    const L = pintadas.suelo; // ya colocada este cuadro: mismo lugar, mismo corrimiento
    P.suelo.setPosition(L.x, L.y).setSize(L.width, L.height).setTileScale(L.tileScaleX * SUELO.k, L.tileScaleY * SUELO.k);
    P.suelo.tilePositionX = L.tilePositionX / SUELO.k;
    if (P.astro) P.astro.setPosition(s.vw * 0.74, s.top + hC * 0.2).setScale(ms);
    Object.values(P).forEach((v) => v.setVisible(a > 0).setAlpha(a));
  };

  let cur = 0;
  let k = 1;
  let antes = null;
  const apagar = () => {
    pilas.forEach((P) => P && Object.values(P).forEach((v) => v.setVisible(false)));
    cur = 0;
    k = 1;
    s.paisaje = null;
  };
  let encendido = false;
  const paso = (_t, delta) => {
    const libre = !s.demo && s.screen !== 'demo' && s.level && s.level.modo === 'libre' && !s.paseoRun;
    if (s.modo === 'libre' && amb.n1) hornea();
    if (!libre || !amb.n1 || !pintadas.activa || amb.st < 1) {
      if (encendido) apagar();
      encendido = false;
      antes = null;
      return;
    }
    encendido = true;
    const quiere = Math.min(3, s.tramoIdx);
    const brinco = antes !== null && Math.abs(s.dist - antes) > 400; // reaparecer o ir a otra página: sin fundido
    antes = s.dist;
    if (quiere !== cur && (quiere === 0 || lista(quiere))) {
      k = quiere < cur || brinco || s.reduced ? 1 : 0;
      cur = quiere;
    } else if (brinco) k = 1;
    k = Math.min(1, k + delta / PAISAJE.fundidoMs);
    s.paisaje = { cur, k }; // solo lectura, para medir
    const g = gy();
    pilas.forEach((P, i) => {
      if (!P) return;
      colocar(P, g, i === cur ? k : i === cur - 1 && k < 1 ? 1 : 0);
    });
    const tiene = cur > 0 && pilas[cur];
    if (tiene && k >= 1) [pintadas.cielo, pintadas.sol, pintadas.lejos, pintadas.medio, pintadas.suelo].forEach((v) => v.setVisible(false)); // lo tapado no se dibuja
    if (cur > 0 && s.bokeh) s.bokeh.forEach((q) => q.im.setAlpha(q.im.alpha * (1 - (cur > 1 ? 1 : k)))); // círculos de luz de la tarde: en otro lugar no van
  };
  s.events.on('postupdate', paso);
  s.events.once('shutdown', () => s.events.off('postupdate', paso));
}
