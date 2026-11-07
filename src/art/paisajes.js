// PAISAJE POR TRAMO (DECISIONES 7-nov 00:20, evidencia/tramos-espec.md idea 2): en Libre, nivel 1, las páginas 2 a 4 tapan el fondo pintado con su propio
// paisaje de papel: Ciudad de cartón, Playa de papel y Noche. La página 1 es el atardecer de siempre. Solo dibuja, sin azar de juego ni física.
// Viaja en el chunk diferido del atardecer. Reto, Clásico y demás niveles no crean ni un objeto.
// Contraste (caja y torre, cuerpo #452B1C y canto #E9D2AE contra el fondo >= 2.0): hasta h 130 del mundo sobre el suelo, cada capa cae entre L 0.111 y L 0.305.
// Por eso la noche se lee por el tono y por arriba del cielo, no por oscurecer la banda (la nave A falló por ahí: 1.88).
import { mix, rng } from './palette.js';
import { mk } from './textures.js';
import { conFibra, hornear } from './cantoPapel.js';

export const PAISAJE = { on: true, fundidoMs: 2500 }; // on: false y Libre vuelve al fondo de un solo dibujo

const W = 1024;
const H = 256; // potencia de 2: el mosaico repite en vertical y el filtro mezcla la fila de abajo con la de arriba
const BASE = 104; // fila de la textura hasta donde la silueta ya es sólida: h 130 del mundo con el pie de la capa media
const CAPAS = { lejos: { depth: 0, ancho: 929, alto: 256, par: 0.3, pie: 15 }, medio: { depth: 0.001, ancho: 1100, alto: 256, par: 0.6, pie: 22 } };
const lerp = (a, b, k) => {
  const c = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
  return (c(16) << 16) | (c(8) << 8) | c(0);
};

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
const papel = (src, color, seed) => hornear(src, { color, labio: mix(color, '#F4E8D5', 0.45), px: 3, seed, sinPie: true, fibraK: 1, rasgado: 2 });

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

const TRAMOS = [
  null,
  // Ciudad de cartón: casitas de kraft al frente, edificios altos atrás, cielo de papel gris claro
  {
    tinte: 0xd9d2cc,
    cielo: () => cielo([[0, '#CFC6BA'], [1, '#EFE6D6']]),
    lejos() {
      const c = silueta((x) => {
        const q = rng(202);
        x.fillRect(0, 90, W, H);
        for (let u = 0; u < W; u += 62 + Math.floor(q() * 30)) x.fillRect(u, 14 + q() * 66, 50 + q() * 26, H);
      });
      return papel(c, '#B5A389', 203);
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
      return encima(papel(c, '#8F7558', 205), (x) => {
        x.fillStyle = '#A58A6A'; // ventanas de un paso más claras: detrás de una caja, L sigue bajo 0.305
        fila((u, a, t, pico) => {
          const y = t + (pico ? 34 : 14);
          const n = a > 120 ? 3 : 2;
          for (let i = 0; i < n; i++) x.fillRect(u + 14 + i * ((a - 18) / n), y, 18, 22);
        });
      });
    },
  },
  // Playa de papel: mar de cartulina azul con olas recortadas, veleros en el horizonte y palmeras
  {
    tinte: 0xffeabd,
    cielo: () => cielo([[0, '#A9DCE3'], [0.7, '#D8EEE4'], [1, '#FBEFCB']]),
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
    tinte: 0x9fabda,
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
  const cola = [];
  [1, 2, 3].forEach((i) => ['cielo', 'lejos', 'medio'].forEach((n) => cola.push(() => add(llave(i, n), TRAMOS[i][n]))));
  cola.push(() => add('paisajeLuna', luna));
  let horneando = false;
  const hornea = () => {
    if (horneando || !cola.length) return;
    horneando = true;
    enReposo(() => {
      cola.shift()();
      setTimeout(() => (horneando = false), 300);
    }, { timeout: 800 });
  };
  const pilas = [null, null, null, null];
  const lista = (i) => {
    if (pilas[i]) return true;
    if (!['cielo', 'lejos', 'medio'].every((n) => s.textures.exists(llave(i, n)))) return false;
    if (TRAMOS[i].astro && !s.textures.exists('paisajeLuna')) return false;
    const d = 3.07 + (i - 1) * 0.003; // arriba de la capa media pintada (3.06) y abajo de todo lo demás: lo que queda detrás no se ve
    const capa = (n, dd) => s.add.tileSprite(0, 0, 10, 10, llave(i, n)).setOrigin(0, 0).setDepth(d + dd).setVisible(false);
    pilas[i] = { cielo: capa('cielo', 0), lejos: capa('lejos', 0.0005), medio: capa('medio', 0.001) };
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
    if (P.astro) P.astro.setPosition(s.vw * 0.74, s.top + hC * 0.2).setScale(ms);
    Object.values(P).forEach((v) => v.setVisible(a > 0).setAlpha(a));
  };

  let cur = 0;
  let k = 1;
  let antes = null;
  const apagar = () => {
    pilas.forEach((P) => P && Object.values(P).forEach((v) => v.setVisible(false)));
    if (pintadas.suelo) pintadas.suelo.clearTint();
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
    if (tiene && k >= 1) [pintadas.cielo, pintadas.sol, pintadas.lejos, pintadas.medio].forEach((v) => v.setVisible(false)); // lo tapado no se dibuja
    const tin = (i) => (i > 0 ? TRAMOS[i].tinte : 0xffffff);
    pintadas.suelo.setTint(lerp(tin(cur > 0 ? cur - 1 : 0), tin(cur), k));
    if (cur > 0 && s.bokeh) s.bokeh.forEach((q) => q.im.setAlpha(q.im.alpha * (1 - (cur > 1 ? 1 : k)))); // círculos de luz de la tarde: en otro lugar no van
  };
  s.events.on('postupdate', paso);
  s.events.once('shutdown', () => s.events.off('postupdate', paso));
}
