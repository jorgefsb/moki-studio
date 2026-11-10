// SALTO ATARDECER día 3 (previz/salto-noche/ESPEC-SALTO.md §3): bokeh en primer plano. Círculos de papel desenfocado que flotan
// arriba y abajo de la banda de juego. Una sola textura suave hecha al vuelo (0 KB de imagen), teñida; sin filtros en vivo ni
// mezcla aditiva. Ligados al mundo a 1.2x del piso, más su vaivén; con el mundo quieto, solo el vaivén. Viaja en el chunk diferido del
// atardecer y solo existe mientras hay atardecer (st > 0): los demás niveles y horas no crean ni un objeto. Movimiento reducido y
// juice Nada: ningún objeto. Azar propio, sin tocar el del juego.
import { rng } from './palette.js';
import { mk } from './textures.js';

const KEY = 'bokeh';
const TEX = 128;
const MAX_DT = 50;
const BANDA = [120, 490]; // zona prohibida en y del mundo, sale de suelo, pico del salto y Moki (ESPEC §3); se mide con el borde del círculo
const VAIVEN = 4; // px de pantalla, ya dentro del margen contra la banda
const PARALLAX = 1.2; // contra el piso: primer plano, va más rápido que él (ESPEC §3, corregido 3-nov 22:30)
const BRINCO = 120; // px del mundo en un cuadro: arranque o reaparición, no avance
const FUERA = 200; // px de pantalla por lado donde esperan al reciclarse; más que el círculo más grande
const ENTRA = [1200, 1500]; // sube a su alfa en esta parte de la transición (ESPEC §4)
const ENTRA_MS = 300; // si no hubo transición o se saltó con un toque
const PAPEL = 0xf4e8d5;
const CALIDO = 0xf8cf8d;
const ABAJO_K = 0.5; // CAPAS: UNIR Y PISOS: los de abajo, sobre el suelo oscuro, se leían como óvalos en el subsuelo; arriba no cambian
// d: diámetro en px de pantalla; x: lugar inicial, parte del ancho; y: 0 = lejos de la banda, 1 = pegado a ella; a: alfa; T: periodo del vaivén en s
const V = (z, d, x, y, c, a, T, f) => ({ z, d, x, y, c, a, T, f });
const ANCHO = [
  V(0, 147, 0.06, 0.2, PAPEL, 0.2, 8.6, 0.3),
  V(0, 74, 0.32, 0.75, CALIDO, 0.32, 6.4, 2.1),
  V(0, 104, 0.58, 0.1, CALIDO, 0.24, 7.6, 4.2),
  V(0, 53, 0.86, 0.9, PAPEL, 0.3, 6.9, 1.2),
  V(1, 88, 0.2, 0.2, PAPEL, 0.22, 7.2, 3.3),
  V(1, 62, 0.72, 0.5, CALIDO, 0.28, 8.2, 5.1),
];
// P17: a 390 tres invitados leyeron los círculos como manchas grises. PAPEL (R-B 31) es más frío que el suelo (R-B ~80) y que el
// cielo de la tarde (~190): al mezclarse apagaba el color y solo subía la luz. En vertical todo va en ámbar (R-B 186: no lava el cielo) y
// sobre el suelo oscuro queda un solo círculo, más tenue. 660 y 1280 usan ANCHO y no cambian.
const AMBAR = 0xffa445;
const VERTICAL = [
  V(0, 76, 0.14, 0.45, AMBAR, 0.22, 8.3, 0.7),
  V(0, 42, 0.74, 0.8, AMBAR, 0.3, 6.6, 3.8),
  V(1, 58, 0.3, 0.35, AMBAR, 0.2, 7.4, 2.4),
];
const easeOut = (k) => 1 - (1 - k) ** 3;

// Blanca para que el tinte dé el color. Llega a alfa 0 un píxel antes del borde: el tamaño de la imagen es el del círculo.
function textura() {
  const [c, x] = mk(TEX, TEX);
  const m = TEX / 2;
  const g = x.createRadialGradient(m, m, 0, m, m, m - 1);
  g.addColorStop(0, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.68, 'rgba(255,255,255,1)');
  g.addColorStop(0.84, 'rgba(255,255,255,0.72)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, TEX, TEX);
  return c;
}

export function montarBokeh(s) {
  const amb = s.ambient;
  const azar = rng(413);
  let items = null;
  let clave = '';
  let entra = 0;
  let tiempo = 0;
  let distAntes = null;

  const quitar = () => {
    if (items) items.forEach((q) => q.im.destroy());
    items = null;
    s.bokeh = null;
    distAntes = null;
  };

  const armar = (z) => {
    quitar();
    if (!s.textures.exists(KEY)) s.textures.addCanvas(KEY, textura());
    const tabla = s.midS !== 1 ? VERTICAL : ANCHO;
    items = tabla.map((b) => {
      const r = b.d / 2 / z;
      const im = s.add.image(b.x * s.vw, 0, KEY).setDepth(20).setScale(b.d / z / TEX).setTint(b.c);
      return { ...b, r, im, wx: b.x * s.vw };
    });
    s.bokeh = items; // solo lectura, para medir
  };

  const paso = (_t, delta) => {
    const dt = Math.min(delta, MAX_DT);
    const st = amb.st || 0;
    if (s.screen === 'demo') entra = 0;
    if (s.reduced || s.calm || !st || s.screen === 'demo') return quitar();
    const z = s.zoom;
    const k = `${s.vw}|${s.vh}|${z}`;
    if (!items || k !== clave) {
      armar(z);
      clave = k;
    }
    const B = s.boceto;
    if (B) entra = B.listo ? easeOut(Math.min(1, Math.max(0, (B.t - ENTRA[0]) / (ENTRA[1] - ENTRA[0])))) : 0;
    else entra = Math.min(1, entra + dt / ENTRA_MS);
    tiempo += dt / 1000;
    const avanzo = distAntes === null ? 0 : s.dist - distAntes;
    distAntes = s.dist;
    const avance = Math.abs(avanzo) < BRINCO ? avanzo * PARALLAX : 0;
    const margen = VAIVEN / z;
    const ancho = s.vw + 2 * (FUERA / z);
    for (const q of items) {
      const arriba = q.z === 0;
      // arriba: la zona va de s.top a la banda; abajo, de la banda a s.bottom. Un círculo puede salirse de la pantalla, nunca entrar a la banda.
      const pegado = arriba ? BANDA[0] - q.r - margen : BANDA[1] + q.r + margen;
      const lejos = arriba ? Math.min(pegado, s.top + q.r * 0.3) : Math.max(pegado, s.bottom - q.r * 0.3);
      const y = lejos + (pegado - lejos) * q.y;
      q.wx -= avance;
      if (q.wx < -q.r) q.wx += ancho + azar() * (FUERA / z); // reaparece fuera de pantalla, sin salto; el azar evita que el mismo dibujo se repita
      const vaiven = (VAIVEN / z) * Math.sin((tiempo * Math.PI * 2) / q.T + q.f);
      q.im.setPosition(q.wx, y + vaiven).setAlpha(q.a * (arriba ? 1 : ABAJO_K) * st * entra);
    }
    return undefined;
  };
  s.events.on('postupdate', paso);
  s.events.once('shutdown', () => (s.events.off('postupdate', paso), quitar()));
}
