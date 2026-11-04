// SALTO ATARDECER día 3b (previz/salto-noche/ESPEC-SALTO.md §5, corregido 3-nov 21:50): hojas ambientales de papel que caen con
// balanceo en las franjas de arriba y abajo, nunca en la banda de juego (§3). Las de arriba entran por arriba o por la derecha y
// salen por la izquierda antes de llegar a la banda; las de abajo salen por el borde de abajo: se reciclan fuera de pantalla, sin
// salto. Azar propio (rng con semilla), sin tocar el del juego. Solo existen mientras hay atardecer (st > 0); los demás niveles y
// horas no crean ni un objeto. Movimiento reducido y juice Nada: ninguna.
import { PAL, rgba, rng } from './palette.js';
import { mk } from './textures.js';

const BANDA = [120, 490]; // zona prohibida en y del mundo (ESPEC §3); se mide con la punta de la hoja, gire como gire
const MAX_DT = 50;
const TEX_W = 32;
const COLORES = ['#FF6B35', '#974717']; // 60 % y 40 % (DECISIONES 3-nov 21:50)
const CUALES = [0, 1, 0, 0, 1]; // a 375 salen 2 y 1; a 1280, 3 y 2
const ANCHO = [14, 20]; // px del mundo (ESPEC §5 corregida 3-nov 23:10; a 10-16 eran "casi invisibles")
const VX = [70, 120]; // px del mundo por s, hacia la izquierda
const VY_MAX = 60;
const BAL_X = 6; // balanceo, px del mundo
const BAL_Y = 3; // ya dentro del margen contra la banda
const ENTRA = [1200, 1500]; // sube a su alfa junto con el bokeh (ESPEC §4)
const ENTRA_MS = 300;
const easeOut = (k) => 1 - (1 - k) ** 3;

function texturas(s) {
  COLORES.forEach((color, i) => {
    const key = `hojaAmb${i}`;
    if (s.textures.exists(key)) return;
    const [c, x] = mk(TEX_W, 20);
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(1, 10);
    x.quadraticCurveTo(14, -3, 31, 10);
    x.quadraticCurveTo(14, 23, 1, 10);
    x.fill();
    x.strokeStyle = rgba(PAL.ink, 0.7); // contorno: el naranja casi no se separa del cielo oro por sí solo
    x.lineWidth = 2;
    x.stroke();
    x.strokeStyle = rgba(PAL.ink, 0.35);
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(3, 10);
    x.lineTo(29, 10);
    x.stroke();
    s.textures.addCanvas(key, c);
  });
}

export function montarHojas(s) {
  const amb = s.ambient;
  const r = rng(305);
  let items = null;
  let clave = '';
  let entra = 0;
  let tiempo = 0;

  const quitar = () => {
    if (items) items.forEach((q) => q.im.destroy());
    items = null;
    s.hojas = null;
  };

  // Trayecto de una hoja: de un punto fuera de pantalla a una recta que sale por la izquierda (arriba) o por abajo (abajo)
  const nacer = (q) => {
    const vx = VX[0] + r() * (VX[1] - VX[0]);
    if (q.arriba) {
      const lim = BANDA[0] - q.r - BAL_Y;
      q.y = s.top - q.r - BAL_Y;
      q.x = s.vw * (0.35 + r() * 0.75) + q.r + BAL_X;
      q.vy = Math.min(VY_MAX, (Math.max(0, lim - q.y) / (q.x + q.r + BAL_X)) * vx);
    } else {
      q.y = BANDA[1] + q.r + BAL_Y;
      q.x = s.vw + q.r + BAL_X;
      const recorre = s.vw * (0.4 + r() * 0.6);
      q.vy = Math.min(VY_MAX, (Math.max(0, s.bottom + q.r + BAL_Y - q.y) / recorre) * vx);
    }
    q.vx = vx;
    q.fase = r() * 6.28;
    q.w = 1.6 + r() * 1.2; // radianes por s del balanceo
    q.giro = (r() < 0.5 ? -1 : 1) * (0.3 + r() * 0.5);
  };
  const fuera = (q) => q.x < -q.r - BAL_X || q.y > s.bottom + q.r + BAL_Y;

  const armar = () => {
    quitar();
    texturas(s);
    const arriba = s.midS !== 1 ? 2 : 3;
    const n = s.midS !== 1 ? 3 : 5;
    items = [];
    for (let i = 0; i < n; i++) {
      const w = ANCHO[0] + r() * (ANCHO[1] - ANCHO[0]);
      const im = s.add.image(0, 0, `hojaAmb${CUALES[i]}`).setDepth(19).setScale(w / TEX_W);
      const q = { im, r: w / 2, arriba: i < arriba };
      nacer(q);
      // Ya a medio camino al empezar la partida. Las que quedarían fuera arrancan otra vez desde su entrada.
      const avanza = r() * 7;
      q.x -= q.vx * avanza;
      q.y += q.vy * avanza;
      if (fuera(q)) nacer(q);
      items.push(q);
    }
    s.hojas = items; // solo lectura, para medir
  };

  const paso = (_t, delta) => {
    const dt = Math.min(delta, MAX_DT);
    const st = amb.st || 0;
    if (s.screen === 'demo') entra = 0;
    if (s.calm || !st || s.screen === 'demo') return quitar();
    const k = `${s.vw}|${s.vh}|${s.zoom}`;
    if (!items || k !== clave) {
      armar();
      clave = k;
    }
    const B = s.boceto;
    if (B) entra = B.listo ? easeOut(Math.min(1, Math.max(0, (B.t - ENTRA[0]) / (ENTRA[1] - ENTRA[0])))) : 0;
    else entra = Math.min(1, entra + dt / ENTRA_MS);
    const mueve = s.screen === 'play' && !B;
    if (mueve) tiempo += dt / 1000;
    for (const q of items) {
      if (mueve) {
        q.x -= (q.vx * dt) / 1000;
        q.y += (q.vy * dt) / 1000;
        if (fuera(q)) nacer(q);
      }
      const b = tiempo * q.w + q.fase;
      q.im.setPosition(q.x + Math.sin(b) * BAL_X, q.y + Math.sin(b * 1.7) * BAL_Y).setRotation(q.fase + q.giro * tiempo + Math.sin(b) * 0.6).setAlpha(st * entra);
    }
    return undefined;
  };
  s.events.on('postupdate', paso);
  s.events.once('shutdown', () => (s.events.off('postupdate', paso), quitar()));
}
