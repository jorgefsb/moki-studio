// Zanja (NIVELES.md §10): hueco en el suelo, solo en Libre. Módulo diferido (director, DECISIONES 3-nov 09:15, B): una
// mecánica de un solo modo no paga JS inicial. RunScene lo pide con import() en cuanto el modo es Libre; al cargar
// registra en EXT.z sus bloques, sus patrones Z y ZZ, las reglas del generador y el dibujo. Sin él no hay zanjas.
import { CONFIG as C } from './config.js';
import { PAL, TONE, mix } from './art/palette.js';
import { EXT, OBS } from './tramos.js';
import { BLOQUES } from './niveles/bloques.js';

const principal = (code) => code.split('+')[0];
const base = (code) => principal(code).replace(/[<>]$/, '');
const esZanja = (c) => /^ZZ?$/.test(principal(c));
const medio = (c) => C.zanja[principal(c) === 'ZZ' ? 'largo' : 'corto'] / 2;

// Zanja (NIVELES.md §10.3): solo tras su intro (la primera de la partida), nunca en calma ni respiro, máx. 2 bloques y
// 1 ZZ por página, y la zanja termina antes del segundo 26 de la página
const cabe = (ctx, b) =>
  !b.soloEstreno && ctx.fase !== 'suave' && (ctx.zanjaYa || ctx.global.has('Z')) && (ctx.nZanja || 0) < 2 &&
  b.ev.every(([t, c]) => !esZanja(c) || (ctx.pos + t + medio(c) <= 26 + 1e-9 && !(ctx.nZZ && principal(c) === 'ZZ')));
const put = (ctx, b) => {
  ctx.nZanja = (ctx.nZanja || 0) + 1;
  ctx.nZZ = ctx.nZZ || b.ev.some(([, c]) => principal(c) === 'ZZ');
};

// zanja: peso 4 (no 5): con peso 1 salían 2.3 por partida y con 2, 2.7; y la meta de NIVELES.md §10.3 es de 3 a 6.
// Z desde la página 2 al abrir la subida, ZZ desde la 3 y solo en el pico. La primera de la partida es la intro.
// zanja-caja salió por el tope de JS inicial (espec §10.7, primer recorte)
const z = { mec: 'zanja', peso: 4, cabe, put };
const INTRO = { id: 'zanja-intro', dur: 2.5, ev: [[0, 'Z+A3']], dif: 1, min: 2, max: 4, tags: ['zanja', 'premio'], ...z, soloEstreno: true };
BLOQUES.push(
  INTRO,
  { id: 'zanja',       dur: 2,   ev: [[0, 'Z']],              dif: 2, min: 2, max: 4, tags: ['zanja'], ...z },
  { id: 'zanja-larga', dur: 3,   ev: [[0, 'ZZ+Aup']],         dif: 3, min: 3, max: 4, tags: ['zanja', 'salto-largo'], ...z, soloPico: true },
  { id: 'zanja-torre', dur: 3.5, ev: [[0, 'T'], [1.5, 'ZZ']], dif: 4, min: 3, max: 4, tags: ['zanja', 'torre'], ...z, soloPico: true },
);
// Z corta: cualquier salto la cruza; ZZ larga: pide el salto mantenido (ir lejos). W en s (W = ancho * velocidad)
OBS.Z = [{ type: 'zanja', at: 0, plan: 'tap', W: C.zanja.corto }];
OBS.ZZ = [{ type: 'zanja', at: 0, plan: 'hold', W: C.zanja.largo }];

EXT.z = {
  // la zanja se estrena al abrir la subida de la primera página libre de los estrenos de viento y timbre (2, 3 o 4)
  estreno(ctx, tramo, global, poner) {
    const m = ctx.mecanicas;
    if (!m.includes('zanja') || global.has('Z') || tramo !== 2 + m.includes('viento') + m.includes('timbre')) return;
    poner(ctx, INTRO);
    ctx.zanjaYa = true;
  },
  // Reglas de unión de la zanja (NIVELES.md §10.3) en s de la página: ninguna viga de 0.7 s antes a 0.5 s después, ni
  // viento, ni filas de piezas encima. Llegada y aterrizaje limpios, trampolín, timbre y pop-up los prueba el
  // validador con la física (la zanja cuenta como lo siguiente que mata), a ±40 ms.
  mezcla: (script) =>
    script.some(([tz, zc]) => esZanja(zc) && script.some(([t, c]) => {
      const p = base(c);
      const v = /V/.test(p) ? t + (p === 'T.V' ? 1 : p === 'C.V' ? C.pairGapSec : 0) : -9;
      return /[<>]$/.test(principal(c)) ? Math.abs(t - tz) < 2 : (p === 'P5' || c.includes('+P5') ? Math.abs(t - tz) < 0.6 : Math.abs(v - tz) < medio(zc) + 0.7);
    })),
  // Corte en el carril con el cartón que ya existe, un Graphics que corre con el mundo, encima de la superficie
  // (4-4.2) y debajo de Moki (10). Origen = H0 (orilla de cerca) en groundY - 8. Por el tope de JS inicial quedan el
  // fondo que oscurece, la cara del corte de enfrente y el contorno claro de peligro (sin naranja); salieron la orilla
  // rasgada con fibras y la solapa doblada (espec §10.7).
  spawn(s, e) {
    const W = e.W;
    const g = s.add.graphics({ y: C.world.groundY - 8 }).setDepth(4.7);
    // es un Graphics: sin tinte ni textura de noche ni de Paseo (Ambient y RunScene se los piden a todo obstáculo)
    g.setTint = g.setTexture = () => g;
    const hex = (c) => parseInt(c.slice(1), 16);
    // Paseo: la superficie sigue debajo (la zanja está tapada); solo queda el contorno al 50 %
    if (!s.paseoRun) {
      for (let i = 0; i < 8; i++) g.fillStyle(hex(mix(TONE.kraftDark, PAL.ink, (i + 1) / 8)), 1).fillRect(0, i * 5, W, 5);
      g.fillStyle(hex(PAL.ink), 0.9).fillRect(0, 40, W, 700).fillStyle(hex(TONE.kraftDark), 1).fillRect(W - 6, 0, 6, 700);
    }
    // contorno de papel opaco: al 70 % daba 1.64-1.69 contra el suelo de día (sonda-zanja, 3-nov); en Paseo, al 50 %
    g.fillStyle(hex(PAL.paper), s.paseoRun ? C.paseo.obstacleAlpha : 1);
    // P5d (director 9-nov): el invitado dio NO PASA a los postes de 6 px que no salían del suelo (y a 9 px que asomaban
    // 22). Ahora son estacas de 12 px que asoman 40 px, con perfil de tinta de 3 px alrededor y travesaño de 22x6.
    const PA = 40;
    const a = s.paseoRun ? C.paseo.obstacleAlpha : 1;
    g.fillStyle(hex(PAL.ink), s.paseoRun ? C.paseo.obstacleAlpha : 0.9);
    [-12, W].forEach((x) => g.fillRect(x - 3, -PA - 3, 18, 31 + PA).fillRect(x - 8, -PA - 9, 28, 12));
    g.fillStyle(hex(PAL.paper), a);
    [-12, W].forEach((x) => g.fillRect(x, -PA, 12, 28 + PA).fillRect(x - 5, -PA - 6, 22, 6));
    const o = { D: e.D, type: 'zanja', plan: e.plan, W, sprite: g, entered: true };
    o.destroy = () => g.destroy();
    s.obstacles.push(o);
  },
};
